import assert from 'node:assert/strict';
import { ForbiddenException } from '@nestjs/common';
import { OrderStatus, RiderStatus, UserRole } from '@prisma/client';
import { TrackingGateway } from '../src/modules/tracking/tracking.gateway';
import { TrackingService } from '../src/modules/tracking/tracking.service';

async function testUpdateRiderLocationStoresLatestAndBroadcasts() {
  const calls: string[] = [];
  const emitted: unknown[] = [];
  const location = {
    id: 'loc_1',
    riderId: 'rider_1',
    latitude: 12.9716,
    longitude: 77.5946,
    accuracy: 10,
    speed: 4,
    heading: 90,
    recordedAt: new Date('2026-06-05T10:00:00.000Z'),
  };
  const prisma = {
    riderProfile: {
      findUnique: async () => ({ id: 'rider_1', status: RiderStatus.APPROVED }),
      update: async () => calls.push('rider.update'),
    },
    riderLocation: {
      deleteMany: async () => calls.push('location.deleteMany'),
      create: async () => {
        calls.push('location.create');
        return location;
      },
    },
    order: {
      findMany: async () => [
        { id: 'order_1' },
        { id: 'order_2' },
      ],
    },
    $transaction: async (callback: (tx: unknown) => unknown) => callback(prisma),
  };
  const gateway = {
    emitRiderLocationUpdated: (orderId: string, payload: unknown) =>
      emitted.push(['rider', orderId, payload]),
    emitOrderTrackingUpdated: (orderId: string, payload: unknown) =>
      emitted.push(['order', orderId, payload]),
  };
  const service = new TrackingService(prisma as never, gateway as never);

  const response = await service.updateRiderLocation('user_1', {
    latitude: 12.9716,
    longitude: 77.5946,
    accuracy: 10,
    speed: 4,
    heading: 90,
  });

  assert.equal(response.data.riderId, 'rider_1');
  assert.deepEqual(calls, [
    'location.deleteMany',
    'location.create',
    'rider.update',
  ]);
  assert.equal(emitted.length, 4);
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
  const service = new TrackingService(prisma as never, {} as never);

  await assert.rejects(
    () =>
      service.updateRiderLocation('user_1', {
        latitude: 12,
        longitude: 77,
      }),
    ForbiddenException,
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
  const service = new TrackingService(prisma as never, {} as never);

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
  const service = new TrackingService(prisma as never, {} as never);

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

async function testGatewayEmitsToOrderRoom() {
  const emissions: unknown[] = [];
  const gateway = new TrackingGateway({} as never, {} as never);
  gateway.server = {
    to: (room: string) => ({
      emit: (event: string, payload: unknown) =>
        emissions.push({ room, event, payload }),
    }),
  } as never;

  gateway.emitRiderLocationUpdated('order_1', { latitude: 12 });
  gateway.emitOrderTrackingUpdated('order_1', { latitude: 12 });

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

async function testBroadcastOnlyActiveAssignedOrders() {
  const whereClauses: unknown[] = [];
  const prisma = {
    order: {
      findMany: async ({ where }: { where: unknown }) => {
        whereClauses.push(where);
        return [{ id: 'order_active' }];
      },
    },
  };
  const gateway = {
    emitRiderLocationUpdated: () => undefined,
    emitOrderTrackingUpdated: () => undefined,
  };
  const service = new TrackingService(prisma as never, gateway as never);

  await service.broadcastOrderLocation('rider_1', {
    riderId: 'rider_1',
    latitude: 12,
    longitude: 77,
    updatedAt: new Date(),
  });

  assert.deepEqual(whereClauses[0], {
    riderId: 'rider_1',
    status: {
      in: [
        OrderStatus.ASSIGNED,
        OrderStatus.PICKED_UP,
        OrderStatus.OUT_FOR_DELIVERY,
      ],
    },
  });
}

void (async () => {
  await testUpdateRiderLocationStoresLatestAndBroadcasts();
  await testUnapprovedRiderCannotUpdateLocation();
  await testCustomerCannotSeeUnrelatedOrderLocation();
  await testAuthorizedCustomerGetsCurrentLocation();
  await testGatewayEmitsToOrderRoom();
  await testBroadcastOnlyActiveAssignedOrders();
  console.log('tracking service tests passed');
})();
