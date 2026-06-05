import assert from 'node:assert/strict';
import {
  DeliveryStatus,
  OrderStatus,
  RiderAssignmentAttemptStatus,
  RiderAvailabilityStatus,
  RiderStatus,
} from '@prisma/client';
import { AssignmentService } from '../src/modules/assignment/assignment.service';

const createdAt = (value: string) => new Date(value);

async function testAssignsNearestEligibleRider() {
  const writes: Array<{ type: string; payload: unknown }> = [];
  const prisma = {
    order: {
      findUnique: async () => ({
        id: 'order_1',
        status: OrderStatus.READY_FOR_PICKUP,
        assignmentAttempts: 0,
        shop: {
          cityId: 'city_1',
          zoneId: 'zone_1',
          latitude: 12.9716,
          longitude: 77.5946,
        },
        assignmentHistory: [],
      }),
      groupBy: async () => [
        { riderId: 'rider_far', _count: { _all: 0 } },
        { riderId: 'rider_near', _count: { _all: 1 } },
      ],
      update: async ({ data }: { data: unknown }) => {
        writes.push({ type: 'order.update', payload: data });
        return { id: 'order_1', riderId: 'rider_near', status: OrderStatus.ASSIGNED };
      },
    },
    riderProfile: {
      findMany: async () => [
        {
          id: 'rider_far',
          createdAt: createdAt('2026-01-01'),
          currentLatitude: 13.2,
          currentLongitude: 77.7,
        },
        {
          id: 'rider_near',
          createdAt: createdAt('2026-02-01'),
          currentLatitude: 12.972,
          currentLongitude: 77.595,
        },
      ],
      update: async ({ data }: { data: unknown }) => {
        writes.push({ type: 'rider.update', payload: data });
      },
    },
    riderAssignmentAttempt: {
      create: async ({ data }: { data: unknown }) => {
        writes.push({ type: 'attempt.create', payload: data });
      },
      findFirst: async () => null,
      update: async () => undefined,
    },
    $transaction: async (callback: (tx: unknown) => unknown) => callback(prisma),
  };

  const service = new AssignmentService(prisma as never);
  const result = await service.assignBestRider('order_1');

  assert.equal(result?.riderId, 'rider_near');
  assert.deepEqual(writes[0], {
    type: 'attempt.create',
    payload: {
      orderId: 'order_1',
      riderId: 'rider_near',
      status: RiderAssignmentAttemptStatus.OFFERED,
      distanceKm: writes[0].payload['distanceKm'],
    },
  });
  assert.equal(writes[1].type, 'rider.update');
  assert.deepEqual(writes[1].payload, {
    availabilityStatus: RiderAvailabilityStatus.BUSY,
  });
  assert.equal(writes[2].type, 'order.update');
}

async function testSkipsWhenMaxAttemptsReached() {
  const prisma = {
    order: {
      findUnique: async () => ({
        id: 'order_2',
        status: OrderStatus.READY_FOR_PICKUP,
        assignmentAttempts: 5,
        shop: { cityId: 'city_1', zoneId: 'zone_1' },
        assignmentHistory: [],
      }),
    },
  };
  const service = new AssignmentService(prisma as never);
  assert.equal(await service.assignBestRider('order_2'), null);
}

async function testRejectMarksAttempt() {
  const updated: unknown[] = [];
  const prisma = {
    riderAssignmentAttempt: {
      findFirst: async () => ({ id: 'attempt_1' }),
      update: async ({ data }: { data: unknown }) => updated.push(data),
    },
  };
  const service = new AssignmentService(prisma as never);
  await service.markLatestAttemptRejected('order_1', 'rider_1', 'Too far');
  assert.deepEqual(updated[0], {
    status: RiderAssignmentAttemptStatus.REJECTED,
    reason: 'Too far',
  });
}

void (async () => {
  await testAssignsNearestEligibleRider();
  await testSkipsWhenMaxAttemptsReached();
  await testRejectMarksAttempt();
  console.log('assignment service tests passed');
})();
