import assert from 'node:assert/strict';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  RiderAvailabilityStatus,
  RiderStatus,
  ShopStatus,
  UserRole,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { AnalyticsService } from '../src/modules/analytics/analytics.service';
import { assertValidDateRange } from '../src/modules/analytics/dto/analytics-query.dto';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator';
import { RolesGuard } from '../src/common/guards/roles.guard';

function decimal(value: number) {
  return new Prisma.Decimal(value);
}

function prismaForOverview() {
  return {
    order: {
      aggregate: async ({ _sum, _avg }: { _sum?: unknown; _avg?: unknown }) => {
        if (_avg) return { _avg: { totalAmount: decimal(250) } };
        if (_sum && Object.keys(_sum as object)[0] === 'platformFee') {
          return { _sum: { platformFee: decimal(25) } };
        }
        return { _sum: { totalAmount: decimal(1000) } };
      },
      count: async ({ where }: { where?: { status?: OrderStatus; placedAt?: unknown } } = {}) => {
        if (where?.status === OrderStatus.DELIVERED) return 7;
        if (where?.status === OrderStatus.CANCELLED) return 2;
        if (where?.placedAt) return 3;
        return 12;
      },
    },
    payment: {
      aggregate: async () => ({ _sum: { amount: decimal(500) } }),
      count: async ({ where }: { where?: { status?: PaymentStatus } } = {}) =>
        where?.status === PaymentStatus.FAILED ? 4 : 9,
    },
    user: {
      count: async ({ where }: { where?: { createdAt?: unknown } } = {}) =>
        where?.createdAt ? 2 : 20,
    },
    shop: { count: async () => 5 },
    riderProfile: { count: async () => 6 },
  };
}

async function testOverviewCards() {
  const service = new AnalyticsService(prismaForOverview() as never);
  const response = await service.overview();

  assert.equal(response.data.totalRevenue, 1000);
  assert.equal(response.data.todayOrders, 3);
  assert.equal(response.data.totalCustomers, 20);
  assert.equal(response.data.failedPaymentsCount, 4);
}

async function testRevenueFilters() {
  const whereSeen: unknown[] = [];
  const prisma = {
    order: {
      aggregate: async ({ where }: { where: unknown }) => {
        whereSeen.push(where);
        return { _sum: { totalAmount: decimal(100), platformFee: decimal(5) } };
      },
      findMany: async () => [
        {
          placedAt: new Date('2026-06-01T10:00:00Z'),
          totalAmount: decimal(100),
          paymentMethod: PaymentMethod.ONLINE,
          platformFee: decimal(5),
        },
      ],
    },
  };
  const service = new AnalyticsService(prisma as never);
  const response = await service.revenue({
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-06-30'),
    cityId: 'city_1',
    shopId: 'shop_1',
    groupBy: 'day',
  });

  assert.ok(whereSeen.some((where) => JSON.stringify(where).includes('"status":"DELIVERED"')));
  assert.ok(whereSeen.some((where) => JSON.stringify(where).includes('"status":"REFUNDED"')));
  assert.deepEqual(whereSeen[0], {
    placedAt: {
      gte: new Date('2026-06-01'),
      lte: new Date('2026-06-30'),
    },
    shopId: 'shop_1',
    shop: { cityId: 'city_1' },
    status: OrderStatus.DELIVERED,
  });
  assert.deepEqual(response.data.chartData, [
    {
      period: '2026-06-01',
      revenue: 100,
      onlineRevenue: 100,
      codRevenue: 0,
      platformFee: 5,
    },
  ]);
}

async function testOrderStatusBreakdown() {
  const prisma = {
    order: {
      count: async ({ where }: { where?: { status?: OrderStatus } } = {}) => {
        if (where?.status === OrderStatus.DELIVERED) return 4;
        if (where?.status === OrderStatus.CANCELLED) return 1;
        return 10;
      },
      aggregate: async () => ({ _avg: { totalAmount: decimal(150) } }),
      groupBy: async ({ by }: { by: string[] }) =>
        by[0] === 'status'
          ? [
              { status: OrderStatus.DELIVERED, _count: { _all: 4 } },
              { status: OrderStatus.CANCELLED, _count: { _all: 1 } },
            ]
          : [{ paymentMethod: PaymentMethod.COD, _count: { _all: 6 } }],
      findMany: async () => [{ placedAt: new Date('2026-06-01') }],
    },
  };
  const service = new AnalyticsService(prisma as never);
  const response = await service.orders({});

  assert.equal(response.data.pendingOrders, 5);
  assert.deepEqual(response.data.ordersByStatus, {
    DELIVERED: 4,
    CANCELLED: 1,
  });
  assert.deepEqual(response.data.ordersByPaymentMethod, { COD: 6 });
}

async function testPaymentAnalytics() {
  const prisma = {
    payment: {
      count: async ({ where }: { where?: { status?: PaymentStatus } } = {}) => {
        if (where?.status === PaymentStatus.PAID) return 7;
        if (where?.status === PaymentStatus.FAILED) return 2;
        if (where?.status === PaymentStatus.COD_PENDING) return 3;
        if (where?.status === PaymentStatus.COD_COLLECTED) return 5;
        return 20;
      },
      aggregate: async ({ where }: { where?: { status?: PaymentStatus } }) => ({
        _sum: { amount: decimal(where?.status === PaymentStatus.FAILED ? 40 : 700) },
      }),
      findMany: async () => [
        {
          createdAt: new Date('2026-06-01'),
          amount: decimal(100),
          status: PaymentStatus.PAID,
          method: PaymentMethod.ONLINE,
        },
        {
          createdAt: new Date('2026-06-01'),
          amount: decimal(40),
          status: PaymentStatus.FAILED,
          method: PaymentMethod.ONLINE,
        },
      ],
    },
  };
  const service = new AnalyticsService(prisma as never);
  const response = await service.payments({});

  assert.equal(response.data.paidPayments, 7);
  assert.equal(response.data.failedAmount, 40);
  assert.deepEqual(response.data.paymentTrend, [
    {
      period: '2026-06-01',
      totalAmount: 140,
      paidAmount: 100,
      failedAmount: 40,
      count: 2,
    },
  ]);
}

async function testShopAndRiderRanking() {
  const prisma = {
    shop: {
      count: async ({ where }: { where?: { status?: ShopStatus | { in: ShopStatus[] } } } = {}) => {
        if (where?.status === ShopStatus.APPROVED) return 6;
        if (where?.status === ShopStatus.SUSPENDED) return 1;
        if (typeof where?.status === 'object') return 2;
        return 9;
      },
      findMany: async () => [{ id: 'shop_1', createdAt: new Date('2026-06-01') }],
    },
    riderProfile: {
      count: async ({ where }: { where?: { status?: RiderStatus; availabilityStatus?: RiderAvailabilityStatus } } = {}) => {
        if (where?.status === RiderStatus.APPROVED) return 5;
        if (where?.availabilityStatus === RiderAvailabilityStatus.ONLINE) return 2;
        if (where?.availabilityStatus === RiderAvailabilityStatus.BUSY) return 1;
        return 8;
      },
    },
    order: {
      groupBy: async ({ by, _sum }: { by: string[]; _sum?: unknown }) => {
        if (by[0] === 'riderId') return [{ riderId: 'rider_1', _count: { _all: 11 } }];
        if (_sum) return [{ shopId: 'shop_1', _sum: { totalAmount: decimal(900) } }];
        return [{ shopId: 'shop_1', _count: { _all: 12 } }];
      },
    },
  };
  const service = new AnalyticsService(prisma as never);
  const shops = await service.shops({ limit: 5 });
  const riders = await service.riders({ limit: 5 });

  assert.equal(shops.data.topShopsByOrders[0].orders, 12);
  assert.equal(shops.data.topShopsByRevenue[0].revenue, 900);
  assert.equal(riders.data.topRidersByDeliveries[0].deliveries, 11);
  assert.equal(riders.data.riderPerformanceSummary.approvalRate, 5 / 8);
}

async function testInvalidDateRangeValidation() {
  assert.throws(
    () =>
      assertValidDateRange({
        startDate: new Date('2026-06-30'),
        endDate: new Date('2026-06-01'),
      }),
    /startDate must be before endDate/,
  );
}

function executionContext(roles: UserRole[]) {
  return {
    getHandler: () => 'handler',
    getClass: () => 'class',
    switchToHttp: () => ({
      getRequest: () => ({ user: { roles } }),
    }),
  } as unknown as ExecutionContext;
}

async function testAdminAuthorization() {
  const reflector = {
    getAllAndOverride: (key: string) =>
      key === ROLES_KEY ? [UserRole.ADMIN, UserRole.SUPER_ADMIN] : undefined,
  } as Reflector;
  const guard = new RolesGuard(reflector);

  assert.equal(guard.canActivate(executionContext([UserRole.ADMIN])), true);
  assert.throws(
    () => guard.canActivate(executionContext([UserRole.CUSTOMER])),
    ForbiddenException,
  );
}

void (async () => {
  await testOverviewCards();
  await testRevenueFilters();
  await testOrderStatusBreakdown();
  await testPaymentAnalytics();
  await testShopAndRiderRanking();
  await testInvalidDateRangeValidation();
  await testAdminAuthorization();
  console.log('analytics tests passed');
})();
