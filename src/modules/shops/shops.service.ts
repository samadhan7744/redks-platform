import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ShopStatus, UserRole } from '@prisma/client';
import { ok, paginated, paginationParams } from '../../common/utils/api-response.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { ShopQueryDto } from './dto/shop-query.dto';
import { UpdateMyShopStatusDto } from './dto/update-my-shop-status.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { UpdateShopStatusDto } from './dto/update-shop-status.dto';

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublic(query: ShopQueryDto) {
    const { page, limit, skip, take } = paginationParams(query.page, query.limit);
    const where = {
      cityId: query.cityId,
      zoneId: query.zoneId,
      status: query.status ?? ShopStatus.APPROVED,
      categories: query.categoryId ? { some: { categoryId: query.categoryId } } : undefined,
      OR: query.search
        ? [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            { description: { contains: query.search, mode: 'insensitive' as const } },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.shop.findMany({
        where,
        skip,
        take,
        include: { city: true, zone: true, categories: { include: { category: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.shop.count({ where }),
    ]);
    return paginated(data, total, page, limit);
  }

  findApproved() {
    return this.findPublic({ page: 1, limit: 20 });
  }

  async findAdmin(query: ShopQueryDto) {
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

  async findById(id: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      include: { city: true, zone: true, categories: { include: { category: true } } },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    return ok(shop);
  }

  async create(ownerId: string, dto: CreateShopDto) {
    const slug = this.slugify(dto.name);

    const owner = await this.prisma.user.findUniqueOrThrow({ where: { id: ownerId } });
    const roles = Array.from(new Set([...owner.roles, UserRole.SHOP_OWNER]));

    await this.prisma.user.update({
      where: { id: ownerId },
      data: { roles },
    });

    const shop = await this.prisma.shop.create({
      data: {
        ...dto,
        ownerId,
        slug,
        status: ShopStatus.PENDING_APPROVAL,
      },
    });
    return ok(shop, 'Shop registered for approval');
  }

  async findMyShop(ownerId: string) {
    const shop = await this.findOwnedShop(ownerId);
    return ok(shop);
  }

  async updateMyShop(ownerId: string, dto: UpdateShopDto) {
    const shop = await this.findOwnedShop(ownerId);
    const updated = await this.prisma.shop.update({
      where: { id: shop.id },
      data: {
        ...dto,
        slug: dto.name ? this.slugify(dto.name) : undefined,
        status: shop.status === ShopStatus.REJECTED ? ShopStatus.PENDING_APPROVAL : undefined,
      },
    });
    return ok(updated, 'Shop updated');
  }

  async updateMyStatus(ownerId: string, dto: UpdateMyShopStatusDto) {
    const ownerEditableStatuses: ShopStatus[] = [ShopStatus.DRAFT, ShopStatus.PENDING_APPROVAL];
    if (!ownerEditableStatuses.includes(dto.status)) {
      throw new BadRequestException('Shop owner can only set DRAFT or PENDING_APPROVAL');
    }
    const shop = await this.findOwnedShop(ownerId);
    const updated = await this.prisma.shop.update({ where: { id: shop.id }, data: { status: dto.status } });
    return ok(updated, 'Shop status updated');
  }

  async updateStatus(adminId: string, shopId: string, dto: UpdateShopStatusDto) {
    if (dto.status === ShopStatus.REJECTED && !dto.rejectionReason) {
      throw new BadRequestException('Rejection reason is required');
    }

    const shop = await this.prisma.shop.update({
      where: { id: shopId },
      data: {
        status: dto.status,
        approvedById: dto.status === ShopStatus.APPROVED ? adminId : undefined,
        approvedAt: dto.status === ShopStatus.APPROVED ? new Date() : undefined,
        rejectionReason: dto.rejectionReason,
      },
    });
    return ok(shop, 'Shop status updated');
  }

  approve(adminId: string, shopId: string) {
    return this.updateStatus(adminId, shopId, { status: ShopStatus.APPROVED });
  }

  reject(adminId: string, shopId: string, rejectionReason: string) {
    return this.updateStatus(adminId, shopId, { status: ShopStatus.REJECTED, rejectionReason });
  }

  suspend(adminId: string, shopId: string) {
    return this.updateStatus(adminId, shopId, { status: ShopStatus.SUSPENDED });
  }

  async assertOwner(shopId: string, ownerId: string) {
    const shop = await this.prisma.shop.findFirst({ where: { id: shopId, ownerId } });
    if (!shop) {
      throw new ForbiddenException('You do not own this shop');
    }
    return shop;
  }

  async findOwnedShop(ownerId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { ownerId },
      include: { city: true, zone: true, categories: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
    });
    if (!shop) throw new NotFoundException('Shop not found for this owner');
    return shop;
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
