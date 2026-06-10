import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Coupon,
  CouponDiscountType,
  Prisma,
  ProductStatus,
} from '@prisma/client';
import {
  ok,
  paginated,
  paginationParams,
} from '../../common/utils/api-response.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CouponQueryDto } from './dto/coupon-query.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

export type CouponValidationContext = {
  code: string;
  userId: string;
  shopId: string;
  cityId?: string | null;
  categoryIds?: string[];
  subtotal: number;
  deliveryFee: number;
};

export type CouponValidationResult = {
  coupon: Coupon;
  discountAmount: number;
  discountedDeliveryFee: number;
  payableSubtotalDiscount: number;
  message: string;
};

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCouponDto) {
    this.assertDateRange(dto.startsAt, dto.expiresAt);
    return ok(
      await this.prisma.coupon.create({
        data: this.toCouponCreateData(dto),
      }),
      'Coupon created',
    );
  }

  async update(id: string, dto: UpdateCouponDto) {
    this.assertDateRange(dto.startsAt, dto.expiresAt);
    return ok(
      await this.prisma.coupon.update({
        where: { id },
        data: this.toCouponUpdateData(dto),
      }),
      'Coupon updated',
    );
  }

  async remove(id: string) {
    return ok(
      await this.prisma.coupon.update({
        where: { id },
        data: { isActive: false },
      }),
      'Coupon disabled',
    );
  }

  async findAll(query: CouponQueryDto = {}) {
    const { page, limit, skip, take } = paginationParams(
      query.page,
      query.limit,
    );
    const where: Prisma.CouponWhereInput = {
      isActive: query.isActive,
      cityId: query.cityId,
      shopId: query.shopId,
      categoryId: query.categoryId,
      OR: query.search
        ? [
            { code: { contains: query.search, mode: 'insensitive' } },
            { name: { contains: query.search, mode: 'insensitive' } },
          ]
        : undefined,
    };
    const [items, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.coupon.count({ where }),
    ]);
    return paginated(items, total, page, limit, 'Coupons fetched');
  }

  async available(userId: string, query: CouponQueryDto = {}) {
    const now = new Date();
    const targetFilters: Prisma.CouponWhereInput[] = [];
    if (query.cityId) targetFilters.push({ OR: [{ cityId: null }, { cityId: query.cityId }] });
    if (query.shopId) targetFilters.push({ OR: [{ shopId: null }, { shopId: query.shopId }] });
    if (query.categoryId) {
      targetFilters.push({ OR: [{ categoryId: null }, { categoryId: query.categoryId }] });
    }
    const coupons = await this.prisma.coupon.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          ...targetFilters,
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    const usageCounts = await this.prisma.couponUsage.groupBy({
      by: ['couponId'],
      where: { userId, couponId: { in: coupons.map((coupon) => coupon.id) } },
      _count: { _all: true },
    });
    const usageMap = new Map(
      usageCounts.map((usage) => [usage.couponId, usage._count._all]),
    );
    return ok(
      coupons.filter((coupon) => (usageMap.get(coupon.id) ?? 0) < coupon.perUserLimit),
      'Available coupons fetched',
    );
  }

  async validateForCustomer(userId: string, dto: ValidateCouponDto) {
    const context = await this.contextFromDto(userId, dto);
    const result = await this.validate(context);
    return ok(this.toValidationPayload(result), 'Coupon applied');
  }

  async validate(context: CouponValidationContext): Promise<CouponValidationResult> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: context.code.trim().toUpperCase() },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');

    await this.assertCouponUsable(coupon, context);
    const discount = this.calculateDiscount(coupon, context.subtotal, context.deliveryFee);
    if (discount.discountAmount <= 0) {
      throw new BadRequestException('Coupon does not provide a discount');
    }

    return {
      coupon,
      ...discount,
      message: 'Coupon applied',
    };
  }

  async recordUsage(
    tx: Prisma.TransactionClient,
    params: {
      couponId: string;
      userId: string;
      orderId: string;
      discountAmount: number;
    },
  ) {
    const existing = await tx.couponUsage.findUnique({
      where: { orderId: params.orderId },
    });
    if (existing) {
      throw new ConflictException('Coupon already used for this order');
    }
    await tx.coupon.update({
      where: { id: params.couponId },
      data: { usageCount: { increment: 1 } },
    });
    return tx.couponUsage.create({
      data: {
        couponId: params.couponId,
        userId: params.userId,
        orderId: params.orderId,
        discountAmount: params.discountAmount,
      },
    });
  }

  async analytics() {
    const [totalCouponUsage, totalDiscount, topCoupons, totalCoupons] =
      await Promise.all([
        this.prisma.couponUsage.count(),
        this.prisma.couponUsage.aggregate({ _sum: { discountAmount: true } }),
        this.prisma.couponUsage.groupBy({
          by: ['couponId'],
          _count: { _all: true },
          _sum: { discountAmount: true },
          orderBy: { _count: { couponId: 'desc' } },
          take: 10,
        }),
        this.prisma.coupon.count(),
      ]);
    return ok({
      totalCouponUsage,
      totalDiscountGiven: Number(totalDiscount._sum.discountAmount ?? 0),
      topCoupons: topCoupons.map((coupon) => ({
        couponId: coupon.couponId,
        usageCount: coupon._count._all,
        discountGiven: Number(coupon._sum.discountAmount ?? 0),
      })),
      conversionMetrics: {
        totalCoupons,
        averageUsagePerCoupon: totalCoupons ? totalCouponUsage / totalCoupons : 0,
      },
    });
  }

  calculateDiscount(coupon: Coupon, subtotal: number, deliveryFee: number) {
    let payableSubtotalDiscount = 0;
    let discountedDeliveryFee = deliveryFee;

    if (coupon.discountType === CouponDiscountType.FLAT) {
      payableSubtotalDiscount = Number(coupon.discountValue);
    }
    if (coupon.discountType === CouponDiscountType.PERCENTAGE) {
      payableSubtotalDiscount = (subtotal * Number(coupon.discountValue)) / 100;
    }
    if (coupon.discountType === CouponDiscountType.FREE_DELIVERY) {
      discountedDeliveryFee = 0;
      payableSubtotalDiscount = deliveryFee;
    }

    if (coupon.maxDiscountAmount && coupon.discountType !== CouponDiscountType.FREE_DELIVERY) {
      payableSubtotalDiscount = Math.min(
        payableSubtotalDiscount,
        Number(coupon.maxDiscountAmount),
      );
    }
    if (coupon.discountType !== CouponDiscountType.FREE_DELIVERY) {
      payableSubtotalDiscount = Math.min(payableSubtotalDiscount, subtotal);
    }

    const discountAmount = Number(payableSubtotalDiscount.toFixed(2));
    return {
      discountAmount,
      discountedDeliveryFee: Number(discountedDeliveryFee.toFixed(2)),
      payableSubtotalDiscount: discountAmount,
    };
  }

  private async contextFromDto(userId: string, dto: ValidateCouponDto) {
    let subtotal = dto.subtotal;
    let categoryIds: string[] = dto.categoryId ? [dto.categoryId] : [];
    if (dto.items?.length) {
      const productIds = dto.items.map((item) => item.productId);
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds }, shopId: dto.shopId, status: ProductStatus.ACTIVE },
        select: { id: true, price: true, categoryId: true },
      });
      if (products.length !== productIds.length) {
        throw new BadRequestException('One or more products are invalid');
      }
      subtotal = dto.items.reduce((total, item) => {
        const product = products.find((candidate) => candidate.id === item.productId);
        return total + item.quantity * (item.unitPrice ?? Number(product?.price ?? 0));
      }, 0);
      categoryIds = [...new Set(products.map((product) => product.categoryId))];
    }
    if (subtotal === undefined) {
      throw new BadRequestException('subtotal or items are required');
    }
    return {
      code: dto.code,
      userId,
      shopId: dto.shopId,
      cityId: dto.cityId,
      categoryIds,
      subtotal,
      deliveryFee: dto.deliveryFee ?? 0,
    };
  }

  private async assertCouponUsable(coupon: Coupon, context: CouponValidationContext) {
    const now = new Date();
    if (!coupon.isActive) throw new BadRequestException('Coupon is disabled');
    if (coupon.startsAt && coupon.startsAt > now) {
      throw new BadRequestException('Coupon is not active yet');
    }
    if (coupon.expiresAt && coupon.expiresAt <= now) {
      throw new BadRequestException('Coupon has expired');
    }
    if (coupon.maximumUsage && coupon.usageCount >= coupon.maximumUsage) {
      throw new BadRequestException('Coupon usage limit reached');
    }
    if (context.subtotal < Number(coupon.minimumOrderAmount)) {
      throw new BadRequestException('Minimum order amount not met');
    }
    if (coupon.cityId && coupon.cityId !== context.cityId) {
      throw new BadRequestException('Coupon is not valid for this city');
    }
    if (coupon.shopId && coupon.shopId !== context.shopId) {
      throw new BadRequestException('Coupon is not valid for this shop');
    }
    if (coupon.categoryId && !context.categoryIds?.includes(coupon.categoryId)) {
      throw new BadRequestException('Coupon is not valid for these products');
    }

    const userUsageCount = await this.prisma.couponUsage.count({
      where: { couponId: coupon.id, userId: context.userId },
    });
    if (userUsageCount >= coupon.perUserLimit) {
      throw new BadRequestException('Per-user coupon usage limit reached');
    }
    if (coupon.firstOrderOnly) {
      const orderCount = await this.prisma.order.count({
        where: { customerId: context.userId },
      });
      if (orderCount > 0) {
        throw new BadRequestException('Coupon is valid only on first order');
      }
    }
  }

  private toValidationPayload(result: CouponValidationResult) {
    return {
      couponId: result.coupon.id,
      code: result.coupon.code,
      discountType: result.coupon.discountType,
      discountAmount: result.discountAmount,
      discountedDeliveryFee: result.discountedDeliveryFee,
      message: result.message,
    };
  }

  private toCouponCreateData(dto: CreateCouponDto): Prisma.CouponUncheckedCreateInput {
    return {
      code: dto.code,
      name: dto.name,
      description: dto.description,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      maxDiscountAmount: dto.maxDiscountAmount,
      minimumOrderAmount: dto.minimumOrderAmount,
      maximumUsage: dto.maximumUsage,
      perUserLimit: dto.perUserLimit,
      firstOrderOnly: dto.firstOrderOnly,
      startsAt: dto.startsAt,
      expiresAt: dto.expiresAt,
      isActive: dto.isActive,
      cityId: dto.cityId,
      shopId: dto.shopId,
      categoryId: dto.categoryId,
    };
  }

  private toCouponUpdateData(dto: Partial<CreateCouponDto>): Prisma.CouponUncheckedUpdateInput {
    return {
      code: dto.code,
      name: dto.name,
      description: dto.description,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      maxDiscountAmount: dto.maxDiscountAmount,
      minimumOrderAmount: dto.minimumOrderAmount,
      maximumUsage: dto.maximumUsage,
      perUserLimit: dto.perUserLimit,
      firstOrderOnly: dto.firstOrderOnly,
      startsAt: dto.startsAt,
      expiresAt: dto.expiresAt,
      isActive: dto.isActive,
      cityId: dto.cityId,
      shopId: dto.shopId,
      categoryId: dto.categoryId,
    };
  }

  private assertDateRange(startsAt?: Date, expiresAt?: Date) {
    if (startsAt && expiresAt && startsAt >= expiresAt) {
      throw new BadRequestException('startsAt must be before expiresAt');
    }
  }
}
