import assert from 'node:assert/strict';
import {
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { OrderStatus, RiderStatus, UserRole } from '@prisma/client';
import { TrackingEventsService } from '../src/modules/tracking/tracking-events.service';
import { TrackingGateway } from '../src/modules/tracking/tracking.gateway';
import { TrackingService } from '../src/modules/tracking/tracking.service';

function redisMock(counts = [1, 1]) {
  let index = 0;
  return {
    incrementWithTtl: async () => counts[index++] ?? 1,
  };
}

function approvedRiderPrisma(options: {
  activeOrders?: Array<{ id: string; status?: OrderStatus }>;
  location?: Record<string, unknown>;
} = {}) {
  const calls: string[] = [];
  const location = {
    id: 'loc_1',
    riderId: 'rider_1',
    latitude: 12.9716,
    longitude: 77.5946,
    accuracy: 10,
    speed: 4,
    heading: 90,
    recordedAt: new Date('2026-06-05T10:00:00.000Z'),
    ...options.location,
  };
  const prisma = {
    riderProfile: {
      findUnique: async () => ({ id: 'rider_1', status: RiderStatus.APPROVED }),
      update: async () => calls.push('rider.update'),
    },
    riderLocation: {
      upsert: async () => {
        calls.push('location.upsert');
        return location;
      },
      deleteMany: async ({ where }: { where: unknown }) => {
        calls.push(`location.cleanup:${JSON.stringify(where)}`);
        return { count: 1 };
      },
    },
    order: {
      findMany: async ({ where }: { where: { status: { in: OrderStatus[] } } }) =>
        (options.activeOrders ?? [{ id: 'order_1' }]).filter((order) =>
          order.status ? where.status.in.includes(order.status) : true,
        ),
    },
    $transaction: async (callback: (tx: unknown) => unknown) => callback(prisma),
  };
  return { prisma, calls, location };
}

async function testUpdateRiderLocationStoresLatestAndBroadcasts() {
  const { prisma, calls, location } = approvedRiderPrisma();
  const emitted: unknown[] = [];
  const events = {
    emitRiderLocationUpdated: (orderId: string, payload: unknown) =>
      emitted.push(['rider', orderId, payload]),
    emitOrderTrackingUpdated: (orderId: string, payload: unknown) =>
      emitted.push(['order', orderId, payload]),
  };
  const service = new TrackingService(
    prisma as never,
    events as never,
    redisMock() as never,
  );

  const response = await service.updateRiderLocation('user_1', {
    latitude: 12.9716,
    longitude: 77.5946,
    accuracy: 10,
    speed: 4,
    heading: 90,
  });

  assert.equal(response.data.riderId, 'rider_1');
  assert.deepEqual(calls, ['location.upsert', 'rider.update']);
  assert.equal(emitted.length, 2);
  assert.deepEqual(emitted[0], [
    'rider',
    'order_1',
    {
      orderId: 'order_1',
      riderId: 'rider_1',
      latitude: 12.9716,
      longitude: 77.5946,
      accuracy: 10,
      speed: 4,
      heading: 90,
      updatedAt: location.recordedAt,
    },
  ]);
}

async function testUnapprovedRiderCannotUpdateLocation() {
  const prisma = {
    riderProfile: {
      findUnique: async () => ({ id: 'rider_1', status: RiderStatus.SUBMITTED }),
    },
  };
  const service = new TrackingService(
    prisma as never,
    {} as never,
    redisMock() as never,
  );

  await assert.rejects(
    () =>
      service.updateRiderLocation('user_1', {
        latitude: 12,
        longitude: 77,
      }),
    ForbiddenException,
  );
}

async function testLocationUpdateWithoutActiveOrderRejected() {
  const { prisma } = approvedRiderPrisma({ activeOrders: [] });
  const service = new TrackingService(
    prisma as never,
    {} as never,
    redisMock() as never,
  );

  await assert.rejects(
    () =>
      service.updateRiderLocation('user_1', {
        latitude: 12,
        longitude: 77,
      }),
    ForbiddenException,
  );
}

async function testRateLimitExceeded() {
  const { prisma } = approvedRiderPrisma();
  const service = new TrackingService(
    prisma as never,
    {} as never,
    redisMock([7, 1]) as never,
  );

  await assert.rejects(
    () =>
      service.updateRiderLocation('user_1', {
        latitude: 12,
        longitude: 77,
      }),
    (error: unknown) =>
      error instanceof HttpException &&
      error.getStatus() === HttpStatus.TOO_MANY_REQUESTS,
  );
}

async function testCustomerCannotSeeUnrelatedOrderLocation() {
  const prisma = {
    order: {
      findUnique: async () => ({
        id: 'order_1',
        customerId: 'customer_1',
        riderId: 'rider_1',
        shop: { ownerId: 'owner_1' },
        rider: {
          user: { id: 'rider_user_1' },
          locations: [],
        },
      }),
    },
  };
  const service = new TrackingService(
    prisma as never,
    {} as never,
    redisMock() as never,
  );

  await assert.rejects(
    () =>
      service.getCurrentLocation('order_1', {
        sub: 'customer_2',
        phone: '9999999999',
        roles: [UserRole.CUSTOMER],
      }),
    ForbiddenException,
  );
}

async function testAuthorizedCustomerGetsCurrentLocation() {
  const recordedAt = new Date('2026-06-05T10:00:00.000Z');
  const prisma = {
    order: {
      findUnique: async () => ({
        id: 'order_1',
        customerId: 'customer_1',
        riderId: 'rider_1',
        shop: { ownerId: 'owner_1' },
        rider: {
          user: { id: 'rider_user_1' },
          locations: [
            {
              latitude: 12.9716,
              longitude: 77.5946,
              recordedAt,
            },
          ],
        },
      }),
    },
  };
  const service = new TrackingService(
    prisma as never,
    {} as never,
    redisMock() as never,
  );

  const response = await service.getCurrentLocation('order_1', {
    sub: 'customer_1',
    phone: '9999999999',
    roles: [UserRole.CUSTOMER],
  });

  assert.deepEqual(response.data, {
    orderId: 'order_1',
    riderId: 'rider_1',
    latitude: 12.9716,
    longitude: 77.5946,
    updatedAt: recordedAt,
  });
}

async function testGatewayRejectsUnauthorizedSocketConnection() {
  let disconnected = false;
  const gateway = new TrackingGateway(
    { verifyAsync: async () => { throw new Error('bad token'); } } as never,
    {} as never,
    new TrackingEventsService(),
  );
  await gateway.handleConnection({
    handshake: { auth: {}, headers: {} },
    data: {},
    disconnect: () => {
      disconnected = true;
    },
  } as never);

  assert.equal(disconnected, true);
}

async function testGatewayRejectsUnauthorizedRoomJoin() {
  const emitted: unknown[] = [];
  const gateway = new TrackingGateway(
    {} as never,
    {
      canAccessOrderTrackingById: async () => false,
    } as never,
    new TrackingEventsService(),
  );
  const result = await gateway.joinOrderRoom(
    {
      data: {
        user: {
          sub: 'customer_2',
          phone: '9999999999',
          roles: [UserRole.CUSTOMER],
        },
      },
      emit: (event: string, payload: unknown) => emitted.push([event, payload]),
      join: async () => undefined,
    } as never,
    { orderId: 'order_1' },
  );

  assert.deepEqual(result, { ok: false });
  assert.deepEqual(emitted[0], [
    'order.tracking.error',
    { message: 'Order access denied' },
  ]);
}

async function testGatewayEmitsToOrderRoom() {
  const emissions: unknown[] = [];
  const events = new TrackingEventsService();
  events.bindServer({
    to: (room: string) => ({
      emit: (event: string, payload: unknown) =>
        emissions.push({ room, event, payload }),
    }),
  } as never);

  events.emitRiderLocationUpdated('order_1', { latitude: 12 });
  events.emitOrderTrackingUpdated('order_1', { latitude: 12 });

  assert.deepEqual(emissions, [
    {
      room: 'order:order_1',
      event: 'rider.location.updated',
      payload: { latitude: 12 },
    },
    {
      room: 'order:order_1',
      event: 'order.tracking.updated',
      payload: { latitude: 12 },
    },
  ]);
}

async function testNoBroadcastAfterDelivery() {
  const { prisma } = approvedRiderPrisma({
    activeOrders: [{ id: 'order_done', status: OrderStatus.DELIVERED }],
  });
  const emitted: unknown[] = [];
  const service = new TrackingService(
    prisma as never,
    {
      emitRiderLocationUpdated: () => emitted.push('rider'),
      emitOrderTrackingUpdated: () => emitted.push('order'),
    } as never,
    redisMock() as never,
  );

  await service.broadcastOrderLocation('rider_1', {
    riderId: 'rider_1',
    latitude: 12,
    longitude: 77,
    updatedAt: new Date(),
  });

  assert.deepEqual(emitted, []);
}

async function testNoBroadcastAfterCancellation() {
  const { prisma } = approvedRiderPrisma({
    activeOrders: [{ id: 'order_cancelled', status: OrderStatus.CANCELLED }],
  });
  const emitted: unknown[] = [];
  const service = new TrackingService(
    prisma as never,
    {
      emitRiderLocationUpdated: () => emitted.push('rider'),
      emitOrderTrackingUpdated: () => emitted.push('order'),
    } as never,
    redisMock() as never,
  );

  await service.broadcastOrderLocation('rider_1', {
    riderId: 'rider_1',
    latitude: 12,
    longitude: 77,
    updatedAt: new Date(),
  });

  assert.deepEqual(emitted, []);
}

async function testRetentionCleanup() {
  const { prisma, calls } = approvedRiderPrisma();
  const service = new TrackingService(
    prisma as never,
    {} as never,
    redisMock() as never,
  );

  const result = await service.cleanupRetainedLocations(7);

  assert.equal(result.count, 1);
  assert.ok(calls[0].startsWith('location.cleanup:'));
}

void (async () => {
  await testUpdateRiderLocationStoresLatestAndBroadcasts();
  await testUnapprovedRiderCannotUpdateLocation();
  await testLocationUpdateWithoutActiveOrderRejected();
  await testRateLimitExceeded();
  await testCustomerCannotSeeUnrelatedOrderLocation();
  await testAuthorizedCustomerGetsCurrentLocation();
  await testGatewayRejectsUnauthorizedSocketConnection();
  await testGatewayRejectsUnauthorizedRoomJoin();
  await testGatewayEmitsToOrderRoom();
  await testNoBroadcastAfterDelivery();
  await testNoBroadcastAfterCancellation();
  await testRetentionCleanup();
  console.log('tracking service tests passed');
})();
