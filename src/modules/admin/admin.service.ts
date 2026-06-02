import { BadRequestException, Injectable } from '@nestjs/common';
import { ItemRequestStatus, RiderAvailabilityStatus, RiderStatus, ShopStatus } from '@prisma/client';
import { ok, paginated, paginationParams } from '../../common/utils/api-response.util';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminShopQueryDto } from './dto/admin-shop-query.dto';
import { UpdateRiderStatusDto } from './dto/update-rider-status.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async pendingShops() {
    return ok(await this.prisma.shop.findMany({
      where: { status: ShopStatus.PENDING_APPROVAL },
      include: { owner: true, city: true, zone: true },
      orderBy: { createdAt: 'asc' },
    }));
  }

  async findShops(query: AdminShopQueryDto) {
    const { page, limit, skip, take } = paginationParams(query.page, query.limit);
    const where = {
      cityId: query.cityId,
      zoneId: query.zoneId,
      status: query.status,
      categories: query.categoryId ? { some: { categoryId: query.categoryId } } : undefined,
      OR: query.search
        ? [{ name: { contains: query.search, mode: 'insensitive' as const } }, { phone: { contains: query.search } }]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.shop.findMany({
        where,
        skip,
        take,
        include: { owner: true, city: true, zone: true, categories: { include: { category: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.shop.count({ where }),
    ]);
    return paginated(data, total, page, limit);
  }

  async approveShop(adminId: string, shopId: string) {
    return ok(await this.prisma.shop.update({
      where: { id: shopId },
      data: { status: ShopStatus.APPROVED, approvedById: adminId, approvedAt: new Date(), rejectionReason: null },
    }), 'Shop approved');
  }

  async rejectShop(adminId: string, shopId: string, rejectionReason: string) {
    return ok(await this.prisma.shop.update({
      where: { id: shopId },
      data: { status: ShopStatus.REJECTED, approvedById: adminId, rejectionReason },
    }), 'Shop rejected');
  }

  async suspendShop(adminId: string, shopId: string) {
    return ok(await this.prisma.shop.update({
      where: { id: shopId },
      data: { status: ShopStatus.SUSPENDED, approvedById: adminId },
    }), 'Shop suspended');
  }

  async pendingRiders() {
    return ok(await this.prisma.riderProfile.findMany({
      where: { status: RiderStatus.PENDING_APPROVAL },
      include: { user: true, city: true, zone: true },
      orderBy: { createdAt: 'asc' },
    }));
  }

  async updateRiderStatus(adminId: string, riderId: string, dto: UpdateRiderStatusDto) {
    if (dto.status === RiderStatus.REJECTED && !dto.rejectionReason) {
      throw new BadRequestException('Rejection reason is required');
    }

    return ok(await this.prisma.riderProfile.update({
      where: { id: riderId },
      data: {
        status: dto.status,
        approvedById: dto.status === RiderStatus.APPROVED ? adminId : undefined,
        approvedAt: dto.status === RiderStatus.APPROVED ? new Date() : undefined,
        rejectionReason: dto.rejectionReason,
      },
    }), 'Rider status updated');
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
      this.prisma.shop.count({ where: { status: ShopStatus.PENDING_APPROVAL } }),
      this.prisma.shop.count({ where: { status: ShopStatus.APPROVED } }),
      this.prisma.order.count({ where: { placedAt: { gte: startOfToday } } }),
      this.prisma.order.aggregate({
        where: { placedAt: { gte: startOfToday } },
        _sum: { totalAmount: true },
      }),
      this.prisma.riderProfile.count({ where: { availabilityStatus: RiderAvailabilityStatus.AVAILABLE } }),
      this.prisma.itemRequest.count({ where: { status: { in: [ItemRequestStatus.OPEN, ItemRequestStatus.IN_REVIEW] } } }),
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
}
