import assert from 'node:assert/strict';
import {
  DeliveryStatus,
  OrderStatus,
  RiderAssignmentAttemptStatus,
  RiderAvailabilityStatus,
} from '@prisma/client';
import { AssignmentService } from '../src/modules/assignment/assignment.service';

const createdAt = (value: string) => new Date(value);

function readyOrder(overrides: Record<string, unknown> = {}) {
  return {
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
    ...overrides,
  };
}

function assignmentPrismaMock(options: {
  activeCounts?: Array<{ riderId: string; count: number }>;
  assignmentUpdateCount?: number;
  riders?: Array<Record<string, unknown>>;
}) {
  const writes: Array<{ type: string; payload: unknown }> = [];
  let findUniqueCalls = 0;
  let assignedRiderId: string | null = null;
  const riders =
    options.riders ??
    [
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
    ];
  const prisma = {
    order: {
      findUnique: async () =>
        findUniqueCalls++ === 0
          ? readyOrder()
          : { id: 'order_1', riderId: assignedRiderId, status: OrderStatus.ASSIGNED },
      groupBy: async () =>
        (options.activeCounts ?? [
          { riderId: 'rider_far', count: 0 },
          { riderId: 'rider_near', count: 1 },
        ]).map((row) => ({
          riderId: row.riderId,
          _count: { _all: row.count },
        })),
      updateMany: async ({ data }: { data: unknown }) => {
        assignedRiderId = (data as { riderId?: string }).riderId ?? null;
        writes.push({ type: 'order.updateMany', payload: data });
        return { count: options.assignmentUpdateCount ?? 1 };
      },
    },
    delivery: {
      upsert: async ({ update }: { update: unknown }) => {
        writes.push({ type: 'delivery.upsert', payload: update });
      },
    },
    riderProfile: {
      findMany: async () => riders,
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
  return { prisma, writes };
}

async function testAssignsNearestEligibleRiderWithoutPrematureBusy() {
  const { prisma, writes } = assignmentPrismaMock({});
  const service = new AssignmentService(prisma as never);
  const result = await service.assignBestRider('order_1');

  assert.equal(result?.riderId, 'rider_near');
  assert.equal(writes[0].type, 'order.updateMany');
  assert.deepEqual(writes[1], {
    type: 'attempt.create',
    payload: {
      orderId: 'order_1',
      riderId: 'rider_near',
      status: RiderAssignmentAttemptStatus.OFFERED,
      distanceKm: writes[1].payload['distanceKm'],
    },
  });
  assert.deepEqual(writes[2], {
    type: 'rider.update',
    payload: { availabilityStatus: RiderAvailabilityStatus.ONLINE },
  });
  assert.deepEqual(writes[3], {
    type: 'delivery.upsert',
    payload: {
      riderId: 'rider_near',
      status: DeliveryStatus.ASSIGNED,
      assignedAt: writes[3].payload['assignedAt'],
    },
  });
}

async function testDuplicateAssignmentPrevention() {
  const { prisma, writes } = assignmentPrismaMock({ assignmentUpdateCount: 0 });
  const service = new AssignmentService(prisma as never);
  const result = await service.assignBestRider('order_1');

  assert.equal(result, null);
  assert.deepEqual(
    writes.map((write) => write.type),
    ['order.updateMany'],
  );
}

async function testRiderWithOneActiveOrderStillEligible() {
  const { prisma } = assignmentPrismaMock({
    activeCounts: [
      { riderId: 'rider_far', count: 0 },
      { riderId: 'rider_near', count: 1 },
    ],
  });
  const service = new AssignmentService(prisma as never);
  const result = await service.assignBestRider('order_1');

  assert.equal(result?.riderId, 'rider_near');
}

async function testRiderWithThreeActiveOrdersExcluded() {
  const { prisma } = assignmentPrismaMock({
    activeCounts: [
      { riderId: 'rider_far', count: 0 },
      { riderId: 'rider_near', count: 3 },
    ],
  });
  const service = new AssignmentService(prisma as never);
  const result = await service.assignBestRider('order_1');

  assert.equal(result?.riderId, 'rider_far');
}

async function testMissingLatLongDoesNotBreakSorting() {
  const { prisma } = assignmentPrismaMock({
    riders: [
      {
        id: 'rider_missing_location',
        createdAt: createdAt('2026-01-01'),
        currentLatitude: null,
        currentLongitude: null,
      },
      {
        id: 'rider_with_location',
        createdAt: createdAt('2026-02-01'),
        currentLatitude: 12.972,
        currentLongitude: 77.595,
      },
    ],
    activeCounts: [
      { riderId: 'rider_missing_location', count: 0 },
      { riderId: 'rider_with_location', count: 0 },
    ],
  });
  const service = new AssignmentService(prisma as never);
  const result = await service.assignBestRider('order_1');

  assert.equal(result?.riderId, 'rider_with_location');
}

async function testSkipsWhenMaxAttemptsReached() {
  const prisma = {
    order: {
      findUnique: async () =>
        readyOrder({
          id: 'order_2',
          assignmentAttempts: 5,
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
  await testAssignsNearestEligibleRiderWithoutPrematureBusy();
  await testDuplicateAssignmentPrevention();
  await testRiderWithOneActiveOrderStillEligible();
  await testRiderWithThreeActiveOrdersExcluded();
  await testMissingLatLongDoesNotBreakSorting();
  await testSkipsWhenMaxAttemptsReached();
  await testRejectMarksAttempt();
  console.log('assignment service tests passed');
})();
