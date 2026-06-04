import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ItemRequestStatus,
  ProductStatus,
  RiderAvailabilityStatus,
  RiderStatus,
  ShopDocumentStatus,
  ShopStatus,
  VerificationStatus,
} from '@prisma/client';
import {
  ok,
  paginated,
  paginationParams,
} from '../../common/utils/api-response.util';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminItemRequestQueryDto } from './dto/admin-item-request-query.dto';
import { AdminProductQueryDto } from './dto/admin-product-query.dto';
import { AdminRiderQueryDto } from './dto/admin-rider-query.dto';
import { AdminShopQueryDto } from './dto/admin-shop-query.dto';
import { UpdateRiderStatusDto } from './dto/update-rider-status.dto';
import { UpdateShopCommissionDto } from './dto/update-shop-commission.dto';
import { UpdateShopDocumentStatusDto } from './dto/update-shop-document-status.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async pendingShops() {
    return ok(
      await this.prisma.shop.findMany({
        where: { status: ShopStatus.PENDING_APPROVAL },
        include: this.shopInclude(),
        orderBy: { createdAt: 'asc' },
      }),
    );
  }

  async findShops(query: AdminShopQueryDto) {
    const { page, limit, skip, take } = paginationParams(
      query.page,
      query.limit,
    );
    const where = {
      cityId: query.cityId,
      zoneId: query.zoneId,
      status: query.status,
      categories: query.categoryId
        ? { some: { categoryId: query.categoryId } }
        : undefined,
      OR: query.search
        ? [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            { phone: { contains: query.search } },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.shop.findMany({
        where,
        skip,
        take,
        include: this.shopInclude(),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.shop.count({ where }),
    ]);
    return paginated(data, total, page, limit);
  }

  async findShopById(shopId: string) {
    return ok(
      await this.prisma.shop.findUniqueOrThrow({
        where: { id: shopId },
        include: this.shopInclude(),
      }),
    );
  }

  async approveShop(adminId: string, shopId: string) {
    return ok(
      await this.prisma.shop.update({
        where: { id: shopId },
        data: {
          status: ShopStatus.APPROVED,
          verificationStatus: VerificationStatus.APPROVED,
          approvedById: adminId,
          approvedAt: new Date(),
          rejectionReason: null,
        },
        include: this.shopInclude(),
      }),
      'Shop approved',
    );
  }

  async rejectShop(adminId: string, shopId: string, rejectionReason: string) {
    return ok(
      await this.prisma.shop.update({
        where: { id: shopId },
        data: {
          status: ShopStatus.REJECTED,
          verificationStatus: VerificationStatus.REJECTED,
          approvedById: adminId,
          rejectionReason,
        },
        include: this.shopInclude(),
      }),
      'Shop rejected',
    );
  }

  async suspendShop(adminId: string, shopId: string) {
    return ok(
      await this.prisma.shop.update({
        where: { id: shopId },
        data: {
          status: ShopStatus.SUSPENDED,
          verificationStatus: VerificationStatus.SUSPENDED,
          approvedById: adminId,
        },
        include: this.shopInclude(),
      }),
      'Shop suspended',
    );
  }

  async updateShopCommission(shopId: string, dto: UpdateShopCommissionDto) {
    return ok(
      await this.prisma.shop.update({
        where: { id: shopId },
        data: {
          commissionPercent: dto.commissionPercent,
          defaultCommissionPercent: dto.commissionPercent,
        },
        include: this.shopInclude(),
      }),
      'Shop commission updated',
    );
  }

  async updateShopDocumentStatus(
    shopId: string,
    documentId: string,
    dto: UpdateShopDocumentStatusDto,
  ) {
    if (dto.status === ShopDocumentStatus.REJECTED && !dto.rejectionReason) {
      throw new BadRequestException('Rejection reason is required');
    }
    await this.prisma.shopDocument.findFirstOrThrow({
      where: { id: documentId, shopId },
    });
    return ok(
      await this.prisma.shopDocument.update({
        where: { id: documentId },
        data: {
          status: dto.status,
          rejectionReason:
            dto.status === ShopDocumentStatus.REJECTED
              ? dto.rejectionReason
              : null,
        },
      }),
      'Shop document status updated',
    );
  }

  async pendingRiders() {
    return ok(
      await this.prisma.riderProfile.findMany({
        where: { status: RiderStatus.PENDING_APPROVAL },
        include: { user: true, city: true, zone: true },
        orderBy: { createdAt: 'asc' },
      }),
    );
  }

  async findRiders(query: AdminRiderQueryDto) {
    const { page, limit, skip, take } = paginationParams(
      query.page,
      query.limit,
    );
    const where = {
      status: query.status,
      availabilityStatus: query.availabilityStatus,
      cityId: query.cityId,
      zoneId: query.zoneId,
      user: query.search
        ? {
            OR: [
              {
                name: { contains: query.search, mode: 'insensitive' as const },
              },
              { phone: { contains: query.search } },
              {
                email: { contains: query.search, mode: 'insensitive' as const },
              },
            ],
          }
        : undefined,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.riderProfile.findMany({
        where,
        skip,
        take,
        include: { user: true, city: true, zone: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.riderProfile.count({ where }),
    ]);

    return paginated(data, total, page, limit);
  }

  async updateRiderStatus(
    adminId: string,
    riderId: string,
    dto: UpdateRiderStatusDto,
  ) {
    if (dto.status === RiderStatus.REJECTED && !dto.rejectionReason) {
      throw new BadRequestException('Rejection reason is required');
    }

    return ok(
      await this.prisma.riderProfile.update({
        where: { id: riderId },
        data: {
          status: dto.status,
          approvedById:
            dto.status === RiderStatus.APPROVED ? adminId : undefined,
          approvedAt:
            dto.status === RiderStatus.APPROVED ? new Date() : undefined,
          rejectionReason: dto.rejectionReason,
        },
      }),
      'Rider status updated',
    );
  }

  async dashboardSummary() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      shopsPending,
      activeShops,
      ordersToday,
      gmvToday,
      ridersOnline,
      pendingItemRequests,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.shop.count({
        where: { status: ShopStatus.PENDING_APPROVAL },
      }),
      this.prisma.shop.count({ where: { status: ShopStatus.APPROVED } }),
      this.prisma.order.count({ where: { placedAt: { gte: startOfToday } } }),
      this.prisma.order.aggregate({
        where: { placedAt: { gte: startOfToday } },
        _sum: { totalAmount: true },
      }),
      this.prisma.riderProfile.count({
        where: { availabilityStatus: RiderAvailabilityStatus.AVAILABLE },
      }),
      this.prisma.itemRequest.count({
        where: {
          status: { in: [ItemRequestStatus.OPEN, ItemRequestStatus.IN_REVIEW] },
        },
      }),
    ]);

    return ok({
      totalUsers,
      shopsPending,
      activeShops,
      ordersToday,
      gmvToday: Number(gmvToday._sum.totalAmount ?? 0),
      ridersOnline,
      pendingItemRequests,
    });
  }

  async findItemRequests(query: AdminItemRequestQueryDto) {
    const { page, limit, skip, take } = paginationParams(
      query.page,
      query.limit,
    );
    const where = {
      status: query.status,
      cityId: query.cityId,
      zoneId: query.zoneId,
      OR: query.search
        ? [
            {
              description: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
          ]
        : undefined,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.itemRequest.findMany({
        where,
        skip,
        take,
        include: {
          customer: true,
          city: true,
          zone: true,
          shop: true,
          quotes: { include: { shop: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.itemRequest.count({ where }),
    ]);

    return paginated(data, total, page, limit);
  }

  async findProducts(query: AdminProductQueryDto) {
    const { page, limit, skip, take } = paginationParams(
      query.page,
      query.limit,
    );
    const where = {
      shopId: query.shopId,
      categoryId: query.categoryId,
      status: query.status,
      OR: query.search
        ? [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            {
              description: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
          ]
        : undefined,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        include: { shop: true, category: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return paginated(data, total, page, limit);
  }

  private shopInclude() {
    return {
      owner: true,
      city: true,
      zone: true,
      category: true,
      documents: true,
      categories: { include: { category: true } },
    };
  }
}
