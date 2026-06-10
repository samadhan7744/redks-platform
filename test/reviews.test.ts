import assert from 'node:assert/strict';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { OrderStatus, ReviewStatus, ReviewType, UserRole } from '@prisma/client';
import { ReviewsService } from '../src/modules/reviews/reviews.service';

function deliveredOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order_1',
    customerId: 'customer_1',
    shopId: 'shop_1',
    riderId: 'rider_1',
    status: OrderStatus.DELIVERED,
    shop: { id: 'shop_1', ownerId: 'owner_1' },
    rider: { id: 'rider_1', userId: 'rider_user_1' },
    items: [{ productId: 'product_1' }],
    ...overrides,
  };
}

function review(overrides: Record<string, unknown> = {}) {
  return {
    id: 'review_1',
    orderId: 'order_1',
    customerId: 'customer_1',
    shopId: 'shop_1',
    riderId: null,
    productId: null,
    reviewType: ReviewType.SHOP,
    status: ReviewStatus.PUBLISHED,
    rating: 5,
    comment: 'Great',
    ...overrides,
  };
}

async function testReviewCreationAndAggregateUpdate() {
  const writes: Array<{ type: string; data: unknown }> = [];
  const prisma = {
    order: { findFirst: async () => deliveredOrder() },
    review: {
      findUnique: async () => null,
      create: async ({ data }: { data: unknown }) => {
        writes.push({ type: 'review.create', data });
        return review(data as Record<string, unknown>);
      },
      aggregate: async () => ({ _avg: { rating: 4.5 }, _count: { _all: 2 } }),
    },
    shop: {
      update: async ({ data }: { data: unknown }) => {
        writes.push({ type: 'shop.update', data });
      },
    },
  };
  const service = new ReviewsService(prisma as never);
  const response = await service.create('customer_1', {
    orderId: 'order_1',
    reviewType: ReviewType.SHOP,
    rating: 5,
    comment: 'Great',
  });

  assert.equal(response.data.reviewKey, 'order_1:customer_1:SHOP:none');
  assert.deepEqual(writes[1], {
    type: 'shop.update',
    data: { averageRating: 4.5, ratingCount: 2 },
  });
}

async function testDuplicateReviewPrevention() {
  const prisma = {
    order: { findFirst: async () => deliveredOrder() },
    review: { findUnique: async () => review() },
  };
  const service = new ReviewsService(prisma as never);

  await assert.rejects(
    () =>
      service.create('customer_1', {
        orderId: 'order_1',
        reviewType: ReviewType.SHOP,
        rating: 5,
      }),
    ConflictException,
  );
}

async function testCompletedOrderValidation() {
  const prisma = {
    order: {
      findFirst: async () => deliveredOrder({ status: OrderStatus.ACCEPTED }),
    },
  };
  const service = new ReviewsService(prisma as never);

  await assert.rejects(
    () =>
      service.create('customer_1', {
        orderId: 'order_1',
        reviewType: ReviewType.SHOP,
        rating: 5,
      }),
    BadRequestException,
  );
}

async function testProductReviewValidation() {
  const prisma = {
    order: { findFirst: async () => deliveredOrder() },
  };
  const service = new ReviewsService(prisma as never);

  await assert.rejects(
    () =>
      service.create('customer_1', {
        orderId: 'order_1',
        reviewType: ReviewType.PRODUCT,
        productId: 'product_2',
        rating: 4,
      }),
    BadRequestException,
  );
}

async function testShopReplyAuthorization() {
  const prisma = {
    review: {
      findUnique: async () => review({ shop: { ownerId: 'owner_2' } }),
    },
  };
  const service = new ReviewsService(prisma as never);

  await assert.rejects(
    () =>
      service.reply(
        { sub: 'owner_1', phone: '9000000002', roles: [UserRole.SHOP_OWNER] },
        'review_1',
        { message: 'Thanks' },
      ),
    ForbiddenException,
  );
}

async function testShopReplySuccess() {
  const replies: unknown[] = [];
  const prisma = {
    review: {
      findUnique: async () =>
        review({ customerId: 'customer_1', shop: { ownerId: 'owner_1' } }),
    },
    reviewReply: {
      create: async ({ data }: { data: unknown }) => {
        replies.push(data);
        return { id: 'reply_1', ...(data as object) };
      },
    },
  };
  const service = new ReviewsService(prisma as never);
  await service.reply(
    { sub: 'owner_1', phone: '9000000002', roles: [UserRole.SHOP_OWNER] },
    'review_1',
    { message: 'Thanks for ordering.' },
  );

  assert.deepEqual(replies[0], {
    reviewId: 'review_1',
    userId: 'owner_1',
    message: 'Thanks for ordering.',
  });
}

async function testAdminModerationRecalculatesAggregate() {
  const writes: unknown[] = [];
  const prisma = {
    review: {
      update: async () => review({ status: ReviewStatus.HIDDEN }),
      aggregate: async () => ({ _avg: { rating: 3 }, _count: { _all: 1 } }),
    },
    shop: {
      update: async ({ data }: { data: unknown }) => writes.push(data),
    },
  };
  const service = new ReviewsService(prisma as never);
  const response = await service.updateStatus('review_1', {
    status: ReviewStatus.HIDDEN,
  });

  assert.equal(response.data.status, ReviewStatus.HIDDEN);
  assert.deepEqual(writes[0], { averageRating: 3, ratingCount: 1 });
}

async function testPublicVisibility() {
  let whereClause: unknown = null;
  const prisma = {
    review: {
      findMany: async ({ where }: { where: unknown }) => {
        whereClause = where;
        return [];
      },
      count: async () => 0,
    },
  };
  const service = new ReviewsService(prisma as never);
  await service.findPublicForShop('shop_1');

  assert.deepEqual(whereClause, {
    shopId: 'shop_1',
    status: ReviewStatus.PUBLISHED,
    reviewType: undefined,
  });
}

async function testProductAggregateUpdate() {
  const writes: unknown[] = [];
  const prisma = {
    review: {
      update: async () =>
        review({
          reviewType: ReviewType.PRODUCT,
          productId: 'product_1',
        }),
      aggregate: async () => ({ _avg: { rating: 4 }, _count: { _all: 8 } }),
    },
    product: {
      update: async ({ data }: { data: unknown }) => writes.push(data),
    },
  };
  const service = new ReviewsService(prisma as never);
  await service.updateStatus('review_1', { status: ReviewStatus.PUBLISHED });

  assert.deepEqual(writes[0], { averageRating: 4, ratingCount: 8 });
}

void (async () => {
  await testReviewCreationAndAggregateUpdate();
  await testDuplicateReviewPrevention();
  await testCompletedOrderValidation();
  await testProductReviewValidation();
  await testShopReplyAuthorization();
  await testShopReplySuccess();
  await testAdminModerationRecalculatesAggregate();
  await testPublicVisibility();
  await testProductAggregateUpdate();
  console.log('review tests passed');
})();
