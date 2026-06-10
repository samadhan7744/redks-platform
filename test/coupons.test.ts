import assert from 'node:assert/strict';
import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  CouponDiscountType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { CouponsService } from '../src/modules/coupons/coupons.service';
import { OrdersService } from '../src/modules/orders/orders.service';
import { OrderCalculationService } from '../src/modules/orders/order-calculation.service';

function coupon(overrides: Record<string, unknown> = {}) {
  return {
    id: 'coupon_1',
    code: 'SAVE10',
    name: 'Save 10',
    description: null,
    discountType: CouponDiscountType.FLAT,
    discountValue: new Prisma.Decimal(10),
    maxDiscountAmount: null,
    minimumOrderAmount: new Prisma.Decimal(0),
    maximumUsage: null,
    usageCount: 0,
    perUserLimit: 1,
    firstOrderOnly: false,
    startsAt: null,
    expiresAt: null,
    isActive: true,
    cityId: null,
    shopId: null,
    categoryId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function prismaForCoupon(couponOverrides: Record<string, unknown> = {}, extras: Record<string, unknown> = {}) {
  return {
    coupon: {
      findUnique: async () => coupon(couponOverrides),
      create: async ({ data }: { data: unknown }) => ({ id: 'coupon_1', ...(data as object) }),
      update: async () => undefined,
    },
    couponUsage: {
      count: async () => 0,
      findUnique: async () => null,
      create: async ({ data }: { data: unknown }) => ({ id: 'usage_1', ...(data as object) }),
    },
    order: { count: async () => 0 },
    ...extras,
  };
}

async function testCouponCreation() {
  const writes: unknown[] = [];
  const prisma = {
    coupon: {
      create: async ({ data }: { data: unknown }) => {
        writes.push(data);
        return { id: 'coupon_1', ...(data as object) };
      },
    },
  };
  const service = new CouponsService(prisma as never);
  const response = await service.create({
    code: 'welcome100',
    name: 'Welcome',
    discountType: CouponDiscountType.FLAT,
    discountValue: 100,
  });

  assert.equal(response.data.code, 'welcome100');
  assert.equal(writes.length, 1);
}

async function testExpiryValidation() {
  const service = new CouponsService(
    prismaForCoupon({ expiresAt: new Date(Date.now() - 1000) }) as never,
  );

  await assert.rejects(
    () =>
      service.validate({
        code: 'SAVE10',
        userId: 'user_1',
        shopId: 'shop_1',
        subtotal: 100,
        deliveryFee: 30,
      }),
    BadRequestException,
  );
}

async function testUsageLimits() {
  const service = new CouponsService(
    prismaForCoupon({ maximumUsage: 1, usageCount: 1 }) as never,
  );

  await assert.rejects(
    () =>
      service.validate({
        code: 'SAVE10',
        userId: 'user_1',
        shopId: 'shop_1',
        subtotal: 100,
        deliveryFee: 30,
      }),
    BadRequestException,
  );
}

async function testFirstOrderCoupon() {
  const service = new CouponsService(
    prismaForCoupon(
      { firstOrderOnly: true },
      {
        order: { count: async () => 1 },
      },
    ) as never,
  );

  await assert.rejects(
    () =>
      service.validate({
        code: 'SAVE10',
        userId: 'user_1',
        shopId: 'shop_1',
        subtotal: 100,
        deliveryFee: 30,
      }),
    BadRequestException,
  );
}

async function testPercentageCalculation() {
  const service = new CouponsService(prismaForCoupon() as never);
  const result = service.calculateDiscount(
    coupon({
      discountType: CouponDiscountType.PERCENTAGE,
      discountValue: new Prisma.Decimal(10),
      maxDiscountAmount: new Prisma.Decimal(80),
    }),
    1000,
    30,
  );

  assert.equal(result.discountAmount, 80);
}

async function testFlatCalculation() {
  const service = new CouponsService(prismaForCoupon() as never);
  const result = service.calculateDiscount(
    coupon({
      discountType: CouponDiscountType.FLAT,
      discountValue: new Prisma.Decimal(120),
    }),
    100,
    30,
  );

  assert.equal(result.discountAmount, 100);
}

async function testFreeDelivery() {
  const service = new CouponsService(prismaForCoupon() as never);
  const result = service.calculateDiscount(
    coupon({
      discountType: CouponDiscountType.FREE_DELIVERY,
      discountValue: new Prisma.Decimal(0),
    }),
    100,
    35,
  );

  assert.equal(result.discountAmount, 35);
  assert.equal(result.discountedDeliveryFee, 0);
}

async function testDuplicateUsagePrevention() {
  const tx = {
    couponUsage: {
      findUnique: async () => ({ id: 'usage_1' }),
    },
  };
  const service = new CouponsService(prismaForCoupon() as never);

  await assert.rejects(
    () =>
      service.recordUsage(tx as never, {
        couponId: 'coupon_1',
        userId: 'user_1',
        orderId: 'order_1',
        discountAmount: 10,
      }),
    ConflictException,
  );
}

async function testOrderIntegrationAppliesCouponServerSide() {
  const writes: unknown[] = [];
  const products = [
    {
      id: 'product_1',
      shopId: 'shop_1',
      categoryId: 'cat_1',
      status: ProductStatus.ACTIVE,
      stock: 5,
      name: 'Atta',
      price: new Prisma.Decimal(100),
    },
  ];
  const prisma = {
    product: {
      findMany: async () => products,
      update: async () => undefined,
    },
    shop: {
      findUnique: async () => ({
        id: 'shop_1',
        cityId: 'city_1',
        zone: { baseDeliveryFee: new Prisma.Decimal(30) },
        defaultCommissionPercent: new Prisma.Decimal(10),
      }),
    },
    address: {
      findFirst: async () => ({ id: 'address_1', userId: 'user_1' }),
    },
    order: {
      create: async ({ data }: { data: unknown }) => {
        writes.push(data);
        return {
          id: 'order_1',
          orderNumber: 'RKS1',
          customerId: 'user_1',
          status: OrderStatus.PLACED,
          paymentMethod: PaymentMethod.COD,
          paymentStatus: PaymentStatus.COD_PENDING,
          ...(data as object),
        };
      },
    },
    $transaction: async (callback: (tx: unknown) => unknown) => callback(prisma),
  };
  const coupons = {
    validate: async () => ({
      coupon: coupon({ id: 'coupon_1' }),
      discountAmount: 50,
      discountedDeliveryFee: 30,
      payableSubtotalDiscount: 50,
      message: 'Coupon applied',
    }),
    recordUsage: async (_tx: unknown, data: unknown) => {
      writes.push({ usage: data });
    },
  };
  const service = new OrdersService(
    prisma as never,
    new OrderCalculationService(),
    {} as never,
    coupons as never,
  );

  await service.create('user_1', {
    shopId: 'shop_1',
    addressId: 'address_1',
    paymentMethod: PaymentMethod.COD,
    couponCode: 'SAVE50',
    items: [{ productId: 'product_1', quantity: 1 }],
  });

  assert.equal(writes[0]['discountAmount'], 50);
  assert.equal(writes[0]['couponId'], 'coupon_1');
  assert.deepEqual(writes[1], {
    usage: {
      couponId: 'coupon_1',
      userId: 'user_1',
      orderId: 'order_1',
      discountAmount: 50,
    },
  });
}

void (async () => {
  await testCouponCreation();
  await testExpiryValidation();
  await testUsageLimits();
  await testFirstOrderCoupon();
  await testPercentageCalculation();
  await testFlatCalculation();
  await testFreeDelivery();
  await testDuplicateUsagePrevention();
  await testOrderIntegrationAppliesCouponServerSide();
  console.log('coupon tests passed');
})();
