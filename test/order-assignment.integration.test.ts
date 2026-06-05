import assert from 'node:assert/strict';
import {
  DeliveryStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  RiderAvailabilityStatus,
  UserRole,
} from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import { OrdersService } from '../src/modules/orders/orders.service';

async function testShopReadyInvokesAssignmentEngine() {
  const updates: unknown[] = [];
  const prisma = {
    order: {
      findUnique: async () => ({
        id: 'order_1',
        status: OrderStatus.ACCEPTED,
        shop: { id: 'shop_1', ownerId: 'owner_1' },
        items: [],
      }),
      update: async ({ data }: { data: unknown }) => {
        updates.push(data);
        return { id: 'order_1', status: OrderStatus.READY_FOR_PICKUP };
      },
    },
  };
  const assignment = {
    assignBestRider: async (orderId: string) => ({
      id: orderId,
      status: OrderStatus.ASSIGNED,
      riderId: 'rider_1',
    }),
  };
  const service = new OrdersService(
    prisma as never,
    {} as never,
    assignment as never,
  );

  const response = await service.shopReady(
    { sub: 'owner_1', roles: [UserRole.SHOP_OWNER] },
    'order_1',
  );

  assert.equal(response.data.status, OrderStatus.ASSIGNED);
  assert.deepEqual(updates[0], {
    status: OrderStatus.READY_FOR_PICKUP,
    delivery: { update: { status: DeliveryStatus.SEARCHING_RIDER } },
  });
}

async function testRiderRejectReassigns() {
  const calls: string[] = [];
  const prisma = {
    riderProfile: {
      findUnique: async () => ({ id: 'rider_1', status: 'APPROVED' }),
      update: async () => calls.push('rider.update'),
    },
    order: {
      findUnique: async () => ({
        id: 'order_1',
        riderId: 'rider_1',
        status: OrderStatus.ASSIGNED,
      }),
      update: async () => calls.push('order.update'),
      count: async () => 0,
    },
    $transaction: async (callback: (tx: unknown) => unknown) => callback(prisma),
  };
  const assignment = {
    markLatestAttemptRejected: async () => calls.push('attempt.rejected'),
    hasOtherActiveOrders: async () => false,
    reassignAfterRejection: async () => {
      calls.push('reassign');
      return { id: 'order_1', riderId: 'rider_2', status: OrderStatus.ASSIGNED };
    },
  };
  const service = new OrdersService(
    prisma as never,
    {} as never,
    assignment as never,
  );

  const response = await service.riderReject('user_1', 'order_1', 'Busy');
  assert.equal(response.data.riderId, 'rider_2');
  assert.deepEqual(calls, [
    'attempt.rejected',
    'rider.update',
    'order.update',
    'reassign',
  ]);
}

async function testUnauthorizedRiderRejectBlocked() {
  const prisma = {
    riderProfile: {
      findUnique: async () => ({ id: 'rider_2', status: 'APPROVED' }),
    },
    order: {
      findUnique: async () => ({
        id: 'order_1',
        riderId: 'rider_1',
        status: OrderStatus.ASSIGNED,
      }),
    },
  };
  const service = new OrdersService(prisma as never, {} as never, {} as never);

  await assert.rejects(
    () => service.riderReject('user_2', 'order_1', 'Not mine'),
    ForbiddenException,
  );
}

async function testDeliveryKeepsRiderBusyWhenOtherActiveOrdersRemain() {
  const riderUpdates: unknown[] = [];
  const prisma = {
    riderProfile: {
      findUnique: async () => ({ id: 'rider_1', status: 'APPROVED' }),
      update: async ({ data }: { data: unknown }) => riderUpdates.push(data),
    },
    order: {
      findUnique: async () => ({
        id: 'order_1',
        riderId: 'rider_1',
        status: OrderStatus.OUT_FOR_DELIVERY,
        paymentMethod: PaymentMethod.COD,
        paymentStatus: PaymentStatus.COD_PENDING,
      }),
      update: async ({ data }: { data: unknown }) => ({
        id: 'order_1',
        status: data['status'],
      }),
    },
    $transaction: async (callback: (tx: unknown) => unknown) => callback(prisma),
  };
  const assignment = {
    activeOrderCount: async () => 1,
  };
  const service = new OrdersService(
    prisma as never,
    {} as never,
    assignment as never,
  );

  const response = await service.riderDeliver('user_1', 'order_1');

  assert.equal(response.data.status, OrderStatus.DELIVERED);
  assert.deepEqual(riderUpdates[0], {
    availabilityStatus: RiderAvailabilityStatus.BUSY,
    lastAvailableAt: undefined,
  });
}

async function testDeliverySetsRiderOnlineWhenNoActiveOrdersRemain() {
  const riderUpdates: unknown[] = [];
  const prisma = {
    riderProfile: {
      findUnique: async () => ({ id: 'rider_1', status: 'APPROVED' }),
      update: async ({ data }: { data: unknown }) => riderUpdates.push(data),
    },
    order: {
      findUnique: async () => ({
        id: 'order_1',
        riderId: 'rider_1',
        status: OrderStatus.OUT_FOR_DELIVERY,
        paymentMethod: PaymentMethod.COD,
        paymentStatus: PaymentStatus.COD_PENDING,
      }),
      update: async ({ data }: { data: unknown }) => ({
        id: 'order_1',
        status: data['status'],
      }),
    },
    $transaction: async (callback: (tx: unknown) => unknown) => callback(prisma),
  };
  const assignment = {
    activeOrderCount: async () => 0,
  };
  const service = new OrdersService(
    prisma as never,
    {} as never,
    assignment as never,
  );

  const response = await service.riderDeliver('user_1', 'order_1');

  assert.equal(response.data.status, OrderStatus.DELIVERED);
  assert.equal(
    riderUpdates[0]['availabilityStatus'],
    RiderAvailabilityStatus.ONLINE,
  );
  assert.ok(riderUpdates[0]['lastAvailableAt'] instanceof Date);
}

void (async () => {
  await testShopReadyInvokesAssignmentEngine();
  await testRiderRejectReassigns();
  await testUnauthorizedRiderRejectBlocked();
  await testDeliveryKeepsRiderBusyWhenOtherActiveOrdersRemain();
  await testDeliverySetsRiderOnlineWhenNoActiveOrdersRemain();
  console.log('order assignment integration tests passed');
})();
