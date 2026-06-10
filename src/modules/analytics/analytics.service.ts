import { BadRequestException, Injectable } from '@nestjs/common';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  RiderAvailabilityStatus,
  RiderStatus,
  ShopStatus,
  UserRole,
} from '@prisma/client';
import { ok, paginationParams } from '../../common/utils/api-response.util';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AnalyticsGroupBy,
  AnalyticsQueryDto,
  assertValidDateRange,
} from './dto/analytics-query.dto';

type SumAggregate = { _sum: Record<string, Prisma.Decimal | null> };
type AvgAggregate = { _avg: Record<string, Prisma.Decimal | null> };

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const today = this.startOfToday();
    const [
      totalRevenue,
      todayRevenue,
      totalOrders,
      todayOrders,
      deliveredOrders,
      cancelledOrders,
      totalCustomers,
      newCustomersToday,
      activeShops,
      activeRiders,
      averageOrderValue,
      codPendingAmount,
      onlinePaidAmount,
      failedPaymentsCount,
    ] = await Promise.all([
      this.sumOrders({ status: OrderStatus.DELIVERED }, 'totalAmount'),
      this.sumOrders({ status: OrderStatus.DELIVERED, placedAt: { gte: today } }, 'totalAmount'),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { placedAt: { gte: today } } }),
      this.prisma.order.count({ where: { status: OrderStatus.DELIVERED } }),
      this.prisma.order.count({ where: { status: OrderStatus.CANCELLED } }),
      this.prisma.user.count({ where: { roles: { has: UserRole.CUSTOMER } } }),
      this.prisma.user.count({
        where: { roles: { has: UserRole.CUSTOMER }, createdAt: { gte: today } },
      }),
      this.prisma.shop.count({ where: { status: ShopStatus.APPROVED } }),
      this.prisma.riderProfile.count({
        where: {
          status: RiderStatus.APPROVED,
          availabilityStatus: {
            in: [RiderAvailabilityStatus.ONLINE, RiderAvailabilityStatus.BUSY],
          },
        },
      }),
      this.averageOrders({ status: OrderStatus.DELIVERED }, 'totalAmount'),
      this.sumPayments(
        { method: PaymentMethod.COD, status: PaymentStatus.COD_PENDING },
        'amount',
      ),
      this.sumPayments(
        { method: PaymentMethod.ONLINE, status: PaymentStatus.PAID },
        'amount',
      ),
      this.prisma.payment.count({ where: { status: PaymentStatus.FAILED } }),
    ]);

    return ok({
      totalRevenue,
      todayRevenue,
      totalOrders,
      todayOrders,
      deliveredOrders,
      cancelledOrders,
      totalCustomers,
      newCustomersToday,
      activeShops,
      activeRiders,
      averageOrderValue,
      codPendingAmount,
      onlinePaidAmount,
      failedPaymentsCount,
    });
  }

  async revenue(query: AnalyticsQueryDto) {
    assertValidDateRange(query);
    const orderWhere = this.orderWhere(query, { status: OrderStatus.DELIVERED });
    const [totalRevenue, onlineRevenue, codRevenue, refundAmount, platformFee, orders] =
      await Promise.all([
        this.sumOrders(orderWhere, 'totalAmount'),
        this.sumOrders({ ...orderWhere, paymentMethod: PaymentMethod.ONLINE }, 'totalAmount'),
        this.sumOrders({ ...orderWhere, paymentMethod: PaymentMethod.COD }, 'totalAmount'),
        this.sumOrders({ ...this.orderWhere(query), status: OrderStatus.REFUNDED }, 'totalAmount'),
        this.sumOrders(orderWhere, 'platformFee'),
        this.prisma.order.findMany({
          where: orderWhere,
          select: {
            placedAt: true,
            totalAmount: true,
            paymentMethod: true,
            platformFee: true,
          },
          orderBy: { placedAt: 'asc' },
        }),
      ]);

    return ok({
      totalRevenue,
      onlineRevenue,
      codRevenue,
      refundAmount,
      platformFee,
      chartData: this.groupRevenue(orders, query.groupBy ?? 'day'),
    });
  }

  async orders(query: AnalyticsQueryDto) {
    assertValidDateRange(query);
    const where = this.orderWhere(query);
    const [
      totalOrders,
      deliveredOrders,
      cancelledOrders,
      averageOrderValue,
      statusGroups,
      paymentMethodGroups,
      orders,
    ] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.count({ where: { ...where, status: OrderStatus.DELIVERED } }),
      this.prisma.order.count({ where: { ...where, status: OrderStatus.CANCELLED } }),
      this.averageOrders(where, 'totalAmount'),
      this.prisma.order.groupBy({ by: ['status'], where, _count: { _all: true } }),
      this.prisma.order.groupBy({ by: ['paymentMethod'], where, _count: { _all: true } }),
      this.prisma.order.findMany({
        where,
        select: { placedAt: true, id: true },
        orderBy: { placedAt: 'asc' },
      }),
    ]);

    return ok({
      totalOrders,
      deliveredOrders,
      cancelledOrders,
      pendingOrders: totalOrders - deliveredOrders - cancelledOrders,
      averageOrderValue,
      ordersByStatus: this.countMap(statusGroups, 'status'),
      ordersByPaymentMethod: this.countMap(paymentMethodGroups, 'paymentMethod'),
      dailyOrderTrend: this.groupCounts(orders, 'day'),
    });
  }

  async customers(query: AnalyticsQueryDto) {
    assertValidDateRange(query);
    const createdAt = this.dateWhere(query);
    const [totalCustomers, newCustomers, repeatCustomerGroups, activeCustomerGroups, customers] =
      await Promise.all([
        this.prisma.user.count({ where: { roles: { has: UserRole.CUSTOMER } } }),
        this.prisma.user.count({
          where: { roles: { has: UserRole.CUSTOMER }, createdAt },
        }),
        this.prisma.order.groupBy({
          by: ['customerId'],
          where: this.orderWhere(query),
          _count: { _all: true },
          having: { customerId: { _count: { gt: 1 } } },
        }),
        this.prisma.order.groupBy({
          by: ['customerId'],
          where: this.orderWhere(query),
          _count: { _all: true },
        }),
        this.prisma.user.findMany({
          where: { roles: { has: UserRole.CUSTOMER }, createdAt },
          select: { createdAt: true, id: true },
          orderBy: { createdAt: 'asc' },
        }),
      ]);

    return ok({
      totalCustomers,
      newCustomers,
      repeatCustomers: repeatCustomerGroups.length,
      activeCustomers: activeCustomerGroups.length,
      customerGrowthTrend: this.groupCounts(
        customers.map((customer) => ({ placedAt: customer.createdAt })),
        query.groupBy ?? 'day',
      ),
    });
  }

  async shops(query: AnalyticsQueryDto) {
    assertValidDateRange(query);
    const createdAt = this.dateWhere(query);
    const shopWhere: Prisma.ShopWhereInput = {
      cityId: query.cityId,
      id: query.shopId,
      createdAt,
    };
    const [
      totalShops,
      approvedShops,
      pendingShops,
      suspendedShops,
      topShopsByOrders,
      topShopsByRevenue,
      shops,
    ] = await Promise.all([
      this.prisma.shop.count({ where: shopWhere }),
      this.prisma.shop.count({ where: { ...shopWhere, status: ShopStatus.APPROVED } }),
      this.prisma.shop.count({
        where: {
          ...shopWhere,
          status: { in: [ShopStatus.PENDING_APPROVAL, ShopStatus.SUBMITTED, ShopStatus.UNDER_REVIEW] },
        },
      }),
      this.prisma.shop.count({ where: { ...shopWhere, status: ShopStatus.SUSPENDED } }),
      this.topShopsByOrders(query),
      this.topShopsByRevenue(query),
      this.prisma.shop.findMany({
        where: shopWhere,
        select: { id: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return ok({
      totalShops,
      approvedShops,
      pendingShops,
      suspendedShops,
      topShopsByOrders,
      topShopsByRevenue,
      shopGrowthTrend: this.groupCounts(
        shops.map((shop) => ({ placedAt: shop.createdAt })),
        query.groupBy ?? 'day',
      ),
    });
  }

  async riders(query: AnalyticsQueryDto) {
    assertValidDateRange(query);
    const createdAt = this.dateWhere(query);
    const riderWhere: Prisma.RiderProfileWhereInput = {
      cityId: query.cityId,
      createdAt,
    };
    const [
      totalRiders,
      approvedRiders,
      onlineRiders,
      busyRiders,
      topRidersByDeliveries,
    ] = await Promise.all([
      this.prisma.riderProfile.count({ where: riderWhere }),
      this.prisma.riderProfile.count({ where: { ...riderWhere, status: RiderStatus.APPROVED } }),
      this.prisma.riderProfile.count({
        where: { ...riderWhere, availabilityStatus: RiderAvailabilityStatus.ONLINE },
      }),
      this.prisma.riderProfile.count({
        where: { ...riderWhere, availabilityStatus: RiderAvailabilityStatus.BUSY },
      }),
      this.topRidersByDeliveries(query),
    ]);

    return ok({
      totalRiders,
      approvedRiders,
      onlineRiders,
      busyRiders,
      topRidersByDeliveries,
      riderPerformanceSummary: {
        approvalRate: totalRiders ? approvedRiders / totalRiders : 0,
        onlineRate: approvedRiders ? onlineRiders / approvedRiders : 0,
        busyRate: approvedRiders ? busyRiders / approvedRiders : 0,
      },
    });
  }

  async payments(query: AnalyticsQueryDto) {
    assertValidDateRange(query);
    const where = this.paymentWhere(query);
    const [
      totalPayments,
      paidPayments,
      failedPayments,
      codPending,
      codCollected,
      onlinePaidAmount,
      failedAmount,
      payments,
    ] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.count({ where: { ...where, status: PaymentStatus.PAID } }),
      this.prisma.payment.count({ where: { ...where, status: PaymentStatus.FAILED } }),
      this.prisma.payment.count({ where: { ...where, status: PaymentStatus.COD_PENDING } }),
      this.prisma.payment.count({ where: { ...where, status: PaymentStatus.COD_COLLECTED } }),
      this.sumPayments({ ...where, method: PaymentMethod.ONLINE, status: PaymentStatus.PAID }, 'amount'),
      this.sumPayments({ ...where, status: PaymentStatus.FAILED }, 'amount'),
      this.prisma.payment.findMany({
        where,
        select: { createdAt: true, amount: true, status: true, method: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return ok({
      totalPayments,
      paidPayments,
      failedPayments,
      codPending,
      codCollected,
      onlinePaidAmount,
      failedAmount,
      paymentTrend: this.groupPayments(payments, query.groupBy ?? 'day'),
    });
  }

  private orderWhere(
    query: AnalyticsQueryDto,
    extra: Prisma.OrderWhereInput = {},
  ): Prisma.OrderWhereInput {
    return {
      placedAt: this.dateWhere(query),
      shopId: query.shopId,
      shop: query.cityId ? { cityId: query.cityId } : undefined,
      ...extra,
    };
  }

  private paymentWhere(query: AnalyticsQueryDto): Prisma.PaymentWhereInput {
    return {
      createdAt: this.dateWhere(query),
      order: {
        shopId: query.shopId,
        shop: query.cityId ? { cityId: query.cityId } : undefined,
      },
    };
  }

  private dateWhere(query: AnalyticsQueryDto) {
    return query.startDate || query.endDate
      ? { gte: query.startDate, lte: query.endDate }
      : undefined;
  }

  private async sumOrders(where: Prisma.OrderWhereInput, field: 'totalAmount' | 'platformFee') {
    const aggregate = await this.prisma.order.aggregate({
      where,
      _sum: { [field]: true },
    });
    return this.toNumber((aggregate as unknown as SumAggregate)._sum[field]);
  }

  private async averageOrders(where: Prisma.OrderWhereInput, field: 'totalAmount') {
    const aggregate = await this.prisma.order.aggregate({
      where,
      _avg: { [field]: true },
    });
    return this.toNumber((aggregate as unknown as AvgAggregate)._avg[field]);
  }

  private async sumPayments(where: Prisma.PaymentWhereInput, field: 'amount') {
    const aggregate = await this.prisma.payment.aggregate({
      where,
      _sum: { [field]: true },
    });
    return this.toNumber((aggregate as unknown as SumAggregate)._sum[field]);
  }

  private async topShopsByOrders(query: AnalyticsQueryDto) {
    const { take } = paginationParams(query.page, query.limit);
    const groups = await this.prisma.order.groupBy({
      by: ['shopId'],
      where: this.orderWhere(query),
      _count: { _all: true },
      orderBy: { _count: { shopId: 'desc' } },
      take,
    });
    return groups.map((group) => ({
      shopId: group.shopId,
      orders: group._count._all,
    }));
  }

  private async topShopsByRevenue(query: AnalyticsQueryDto) {
    const { take } = paginationParams(query.page, query.limit);
    const groups = await this.prisma.order.groupBy({
      by: ['shopId'],
      where: this.orderWhere(query, { status: OrderStatus.DELIVERED }),
      _sum: { totalAmount: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
      take,
    });
    return groups.map((group) => ({
      shopId: group.shopId,
      revenue: this.toNumber(group._sum.totalAmount),
    }));
  }

  private async topRidersByDeliveries(query: AnalyticsQueryDto) {
    const { take } = paginationParams(query.page, query.limit);
    const groups = await this.prisma.order.groupBy({
      by: ['riderId'],
      where: {
        ...this.orderWhere(query, { status: OrderStatus.DELIVERED }),
        riderId: { not: null },
      },
      _count: { _all: true },
      orderBy: { _count: { riderId: 'desc' } },
      take,
    });
    return groups.map((group) => ({
      riderId: group.riderId,
      deliveries: group._count._all,
    }));
  }

  private groupRevenue(
    orders: Array<{
      placedAt: Date;
      totalAmount: Prisma.Decimal;
      paymentMethod: PaymentMethod;
      platformFee: Prisma.Decimal;
    }>,
    groupBy: AnalyticsGroupBy,
  ) {
    const grouped = new Map<string, { revenue: number; onlineRevenue: number; codRevenue: number; platformFee: number }>();
    for (const order of orders) {
      const key = this.bucket(order.placedAt, groupBy);
      const current = grouped.get(key) ?? {
        revenue: 0,
        onlineRevenue: 0,
        codRevenue: 0,
        platformFee: 0,
      };
      const amount = this.toNumber(order.totalAmount);
      current.revenue += amount;
      current.platformFee += this.toNumber(order.platformFee);
      if (order.paymentMethod === PaymentMethod.ONLINE) current.onlineRevenue += amount;
      if (order.paymentMethod === PaymentMethod.COD) current.codRevenue += amount;
      grouped.set(key, current);
    }
    return this.sortedEntries(grouped);
  }

  private groupPayments(
    payments: Array<{
      createdAt: Date;
      amount: Prisma.Decimal;
      status: PaymentStatus;
      method: PaymentMethod;
    }>,
    groupBy: AnalyticsGroupBy,
  ) {
    const grouped = new Map<string, { totalAmount: number; paidAmount: number; failedAmount: number; count: number }>();
    for (const payment of payments) {
      const key = this.bucket(payment.createdAt, groupBy);
      const current = grouped.get(key) ?? {
        totalAmount: 0,
        paidAmount: 0,
        failedAmount: 0,
        count: 0,
      };
      const amount = this.toNumber(payment.amount);
      current.totalAmount += amount;
      current.count += 1;
      if (payment.status === PaymentStatus.PAID || payment.status === PaymentStatus.COD_COLLECTED) {
        current.paidAmount += amount;
      }
      if (payment.status === PaymentStatus.FAILED) current.failedAmount += amount;
      grouped.set(key, current);
    }
    return this.sortedEntries(grouped);
  }

  private groupCounts(items: Array<{ placedAt: Date }>, groupBy: AnalyticsGroupBy) {
    const grouped = new Map<string, { count: number }>();
    for (const item of items) {
      const key = this.bucket(item.placedAt, groupBy);
      const current = grouped.get(key) ?? { count: 0 };
      current.count += 1;
      grouped.set(key, current);
    }
    return this.sortedEntries(grouped);
  }

  private countMap<T extends Record<string, unknown>>(groups: T[], key: keyof T) {
    return groups.reduce<Record<string, number>>((acc, group) => {
      acc[String(group[key])] = (group._count as { _all: number })._all;
      return acc;
    }, {});
  }

  private bucket(date: Date, groupBy: AnalyticsGroupBy) {
    const value = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    if (groupBy === 'month') {
      return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}`;
    }
    if (groupBy === 'week') {
      const day = value.getUTCDay() || 7;
      value.setUTCDate(value.getUTCDate() - day + 1);
      return value.toISOString().slice(0, 10);
    }
    return value.toISOString().slice(0, 10);
  }

  private sortedEntries<T extends Record<string, number>>(map: Map<string, T>) {
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, values]) => ({ period, ...values }));
  }

  private toNumber(value: Prisma.Decimal | number | null | undefined) {
    return value == null ? 0 : Number(value);
  }

  private startOfToday() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }

  validateQuery(query: AnalyticsQueryDto) {
    try {
      assertValidDateRange(query);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Invalid analytics query');
    }
  }
}
