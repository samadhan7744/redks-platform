import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  Prisma,
  ReviewStatus,
  ReviewType,
  UserRole,
} from '@prisma/client';
import { AuthUser } from '../../common/types/auth-user.type';
import {
  ok,
  paginated,
  paginationParams,
} from '../../common/utils/api-response.util';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewReplyDto } from './dto/create-review-reply.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import { UpdateReviewStatusDto } from './dto/update-review-status.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService?: NotificationsService,
  ) {}

  async create(customerId: string, dto: CreateReviewDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, customerId },
      include: {
        shop: { select: { id: true, ownerId: true } },
        rider: { select: { id: true, userId: true } },
        items: { select: { productId: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found for this customer');
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Only delivered orders can be reviewed');
    }

    const productId = this.resolveProductId(dto, order.items);
    const riderId = this.resolveRiderId(dto.reviewType, order.riderId);
    const reviewKey = this.reviewKey(
      order.id,
      customerId,
      dto.reviewType,
      productId,
    );

    const existing = await this.prisma.review.findUnique({
      where: { reviewKey },
    });
    if (existing) {
      throw new ConflictException('Review already exists for this order target');
    }

    const review = await this.prisma.review.create({
      data: {
        orderId: order.id,
        customerId,
        shopId: order.shopId,
        riderId,
        productId,
        reviewKey,
        reviewType: dto.reviewType,
        rating: dto.rating,
        comment: dto.comment,
        status: ReviewStatus.PUBLISHED,
      },
      include: this.include(),
    });

    await this.recalculateAggregates(review);
    await this.notifyNewReview(review, order.shop.ownerId, order.rider?.userId);

    return ok(review, 'Review submitted');
  }

  async findMine(customerId: string, query: ReviewQueryDto = {}) {
    return this.findMany(
      {
        customerId,
        reviewType: query.reviewType,
        status: query.status,
      },
      query,
      'My reviews fetched',
    );
  }

  async findPublicForShop(shopId: string, query: ReviewQueryDto = {}) {
    return this.findMany(
      {
        shopId,
        status: ReviewStatus.PUBLISHED,
        reviewType: query.reviewType,
      },
      query,
      'Shop reviews fetched',
    );
  }

  async findPublicForProduct(productId: string, query: ReviewQueryDto = {}) {
    return this.findMany(
      {
        productId,
        status: ReviewStatus.PUBLISHED,
        reviewType: ReviewType.PRODUCT,
      },
      query,
      'Product reviews fetched',
    );
  }

  async findForOwnedShop(ownerId: string, query: ReviewQueryDto = {}) {
    const shop = await this.prisma.shop.findFirst({ where: { ownerId } });
    if (!shop) throw new NotFoundException('Shop not found for this owner');
    return this.findMany(
      {
        shopId: shop.id,
        reviewType: query.reviewType,
        status: query.status,
      },
      query,
      'Shop reviews fetched',
    );
  }

  async reply(user: AuthUser, reviewId: string, dto: CreateReviewReplyDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { shop: true },
    });
    if (!review) throw new NotFoundException('Review not found');

    const isAdmin =
      user.roles.includes(UserRole.ADMIN) ||
      user.roles.includes(UserRole.SUPER_ADMIN);
    if (!isAdmin && review.shop.ownerId !== user.sub) {
      throw new ForbiddenException('You can reply only to reviews of your shop');
    }

    const reply = await this.prisma.reviewReply.create({
      data: {
        reviewId,
        userId: user.sub,
        message: dto.message,
      },
      include: { user: true },
    });
    await this.notificationsService?.notifyReviewReply(
      review.customerId,
      review.id,
    );
    return ok(reply, 'Review reply added');
  }

  async findAllForAdmin(query: ReviewQueryDto = {}) {
    return this.findMany(
      {
        shopId: query.shopId,
        productId: query.productId,
        riderId: query.riderId,
        reviewType: query.reviewType,
        status: query.status,
      },
      query,
      'Reviews fetched',
    );
  }

  async updateStatus(id: string, dto: UpdateReviewStatusDto) {
    const review = await this.prisma.review.update({
      where: { id },
      data: { status: dto.status },
      include: this.include(),
    });
    await this.recalculateAggregates(review);
    return ok(review, 'Review status updated');
  }

  private async findMany(
    where: Prisma.ReviewWhereInput,
    query: ReviewQueryDto,
    message: string,
  ) {
    const { page, limit, skip, take } = paginationParams(
      query.page,
      query.limit,
    );
    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: this.include(),
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.review.count({ where }),
    ]);
    return paginated(items, total, page, limit, message);
  }

  private resolveProductId(
    dto: CreateReviewDto,
    items: Array<{ productId: string }>,
  ) {
    if (dto.reviewType !== ReviewType.PRODUCT) {
      if (dto.productId) {
        throw new BadRequestException('productId is allowed only for product reviews');
      }
      return null;
    }
    if (!dto.productId) {
      throw new BadRequestException('productId is required for product reviews');
    }
    if (!items.some((item) => item.productId === dto.productId)) {
      throw new BadRequestException('Product was not part of this order');
    }
    return dto.productId;
  }

  private resolveRiderId(reviewType: ReviewType, riderId: string | null) {
    if (reviewType !== ReviewType.RIDER) return null;
    if (!riderId) {
      throw new BadRequestException('This order does not have an assigned rider');
    }
    return riderId;
  }

  private reviewKey(
    orderId: string,
    customerId: string,
    reviewType: ReviewType,
    productId: string | null,
  ) {
    return `${orderId}:${customerId}:${reviewType}:${productId ?? 'none'}`;
  }

  private async recalculateAggregates(review: {
    shopId: string;
    productId: string | null;
    riderId: string | null;
    reviewType: ReviewType;
  }) {
    if (review.reviewType === ReviewType.SHOP || review.reviewType === ReviewType.ORDER) {
      await this.recalculateShopRating(review.shopId);
    }
    if (review.reviewType === ReviewType.PRODUCT && review.productId) {
      await this.recalculateProductRating(review.productId);
    }
    if (review.reviewType === ReviewType.RIDER && review.riderId) {
      await this.recalculateRiderRating(review.riderId);
    }
  }

  private async recalculateShopRating(shopId: string) {
    const aggregate = await this.prisma.review.aggregate({
      where: {
        shopId,
        status: ReviewStatus.PUBLISHED,
        reviewType: { in: [ReviewType.SHOP, ReviewType.ORDER] },
      },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await this.prisma.shop.update({
      where: { id: shopId },
      data: {
        averageRating: aggregate._avg.rating ?? 0,
        ratingCount: aggregate._count._all,
      },
    });
  }

  private async recalculateProductRating(productId: string) {
    const aggregate = await this.prisma.review.aggregate({
      where: {
        productId,
        status: ReviewStatus.PUBLISHED,
        reviewType: ReviewType.PRODUCT,
      },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        averageRating: aggregate._avg.rating ?? 0,
        ratingCount: aggregate._count._all,
      },
    });
  }

  private async recalculateRiderRating(riderId: string) {
    const aggregate = await this.prisma.review.aggregate({
      where: {
        riderId,
        status: ReviewStatus.PUBLISHED,
        reviewType: ReviewType.RIDER,
      },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await this.prisma.riderProfile.update({
      where: { id: riderId },
      data: {
        averageRating: aggregate._avg.rating ?? 0,
        ratingCount: aggregate._count._all,
      },
    });
  }

  private async notifyNewReview(
    review: { id: string; reviewType: ReviewType; shopId: string; riderId: string | null },
    shopOwnerId: string,
    riderUserId?: string | null,
  ) {
    if (review.reviewType === ReviewType.SHOP || review.reviewType === ReviewType.ORDER) {
      await this.notificationsService?.notifyNewShopReview(
        shopOwnerId,
        review.shopId,
        review.id,
      );
    }
    if (review.reviewType === ReviewType.RIDER && riderUserId) {
      await this.notificationsService?.notifyNewRiderReview(
        riderUserId,
        review.riderId ?? '',
        review.id,
      );
    }
  }

  private include() {
    return {
      customer: true,
      shop: true,
      rider: { include: { user: true } },
      product: true,
      replies: { include: { user: true }, orderBy: { createdAt: 'asc' as const } },
    };
  }
}
