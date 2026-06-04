import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DeliveryMode,
  ShopStatus,
  UserRole,
  VerificationStatus,
} from '@prisma/client';
import {
  ok,
  paginated,
  paginationParams,
} from '../../common/utils/api-response.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { CreateShopDocumentDto } from './dto/create-shop-document.dto';
import { ShopQueryDto } from './dto/shop-query.dto';
import { UpdateMyShopStatusDto } from './dto/update-my-shop-status.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { UpdateShopStatusDto } from './dto/update-shop-status.dto';

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublic(query: ShopQueryDto) {
    const { page, limit, skip, take } = paginationParams(
      query.page,
      query.limit,
    );
    const where = {
      cityId: query.cityId,
      zoneId: query.zoneId,
      status: query.status ?? ShopStatus.APPROVED,
      categories: query.categoryId
        ? { some: { categoryId: query.categoryId } }
        : undefined,
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

  findApproved() {
    return this.findPublic({ page: 1, limit: 20 });
  }

  async findAdmin(query: ShopQueryDto) {
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
        include: { ...this.shopInclude(), owner: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.shop.count({ where }),
    ]);
    return paginated(data, total, page, limit);
  }

  async findById(id: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      include: this.shopInclude(),
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    return ok(shop);
  }

  async create(ownerId: string, dto: CreateShopDto) {
    const shopName = dto.shopName ?? dto.name;
    const ownerPhone = dto.ownerPhone ?? dto.phone;
    if (!shopName || !ownerPhone) {
      throw new BadRequestException('shopName and ownerPhone are required');
    }
    const slug = this.slugify(shopName);

    const owner = await this.prisma.user.findUniqueOrThrow({
      where: { id: ownerId },
    });
    const roles = Array.from(new Set([...owner.roles, UserRole.SHOP_OWNER]));

    await this.prisma.user.update({
      where: { id: ownerId },
      data: { roles },
    });

    const shop = await this.prisma.shop.create({
      data: {
        ...this.toShopData(dto),
        ownerId,
        cityId: dto.cityId,
        zoneId: dto.zoneId,
        name: shopName,
        phone: ownerPhone,
        addressLine1: dto.addressLine1,
        pincode: dto.pincode,
        slug,
        status: ShopStatus.PENDING_APPROVAL,
        verificationStatus: VerificationStatus.PENDING,
      },
      include: this.shopInclude(),
    });
    await this.syncShopCategory(shop.id, dto.categoryId);
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
        ...this.toShopData(dto),
        slug:
          dto.shopName || dto.name
            ? this.slugify(dto.shopName ?? dto.name!)
            : undefined,
        status:
          shop.status === ShopStatus.REJECTED
            ? ShopStatus.PENDING_APPROVAL
            : undefined,
        verificationStatus:
          shop.status === ShopStatus.REJECTED
            ? VerificationStatus.PENDING
            : undefined,
      },
      include: this.shopInclude(),
    });
    await this.syncShopCategory(shop.id, dto.categoryId);
    return ok(updated, 'Shop updated');
  }

  async updateMyStatus(ownerId: string, dto: UpdateMyShopStatusDto) {
    const ownerEditableStatuses: ShopStatus[] = [
      ShopStatus.DRAFT,
      ShopStatus.PENDING_APPROVAL,
    ];
    if (!ownerEditableStatuses.includes(dto.status)) {
      throw new BadRequestException(
        'Shop owner can only set DRAFT or PENDING_APPROVAL',
      );
    }
    const shop = await this.findOwnedShop(ownerId);
    const updated = await this.prisma.shop.update({
      where: { id: shop.id },
      data: { status: dto.status },
    });
    return ok(updated, 'Shop status updated');
  }

  async updateStatus(
    adminId: string,
    shopId: string,
    dto: UpdateShopStatusDto,
  ) {
    if (dto.status === ShopStatus.REJECTED && !dto.rejectionReason) {
      throw new BadRequestException('Rejection reason is required');
    }

    const shop = await this.prisma.shop.update({
      where: { id: shopId },
      data: {
        status: dto.status,
        approvedById: dto.status === ShopStatus.APPROVED ? adminId : undefined,
        approvedAt: dto.status === ShopStatus.APPROVED ? new Date() : undefined,
        verificationStatus: this.verificationStatusFor(dto.status),
        rejectionReason: dto.rejectionReason,
      },
      include: this.shopInclude(),
    });
    return ok(shop, 'Shop status updated');
  }

  approve(adminId: string, shopId: string) {
    return this.updateStatus(adminId, shopId, { status: ShopStatus.APPROVED });
  }

  reject(adminId: string, shopId: string, rejectionReason: string) {
    return this.updateStatus(adminId, shopId, {
      status: ShopStatus.REJECTED,
      rejectionReason,
    });
  }

  suspend(adminId: string, shopId: string) {
    return this.updateStatus(adminId, shopId, { status: ShopStatus.SUSPENDED });
  }

  async assertOwner(shopId: string, ownerId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, ownerId },
    });
    if (!shop) {
      throw new ForbiddenException('You do not own this shop');
    }
    return shop;
  }

  async findOwnedShop(ownerId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { ownerId },
      include: this.shopInclude(),
      orderBy: { createdAt: 'desc' },
    });
    if (!shop) throw new NotFoundException('Shop not found for this owner');
    return shop;
  }

  async createMyShopDocument(ownerId: string, dto: CreateShopDocumentDto) {
    const shop = await this.findOwnedShop(ownerId);
    return ok(
      await this.prisma.shopDocument.create({
        data: {
          shopId: shop.id,
          type: dto.type,
          fileUrl: dto.fileUrl,
        },
      }),
      'Shop document added. Cloudflare R2/S3 upload integration is planned.',
    );
  }

  async findMyShopDocuments(ownerId: string) {
    const shop = await this.findOwnedShop(ownerId);
    return ok(
      await this.prisma.shopDocument.findMany({
        where: { shopId: shop.id },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  private toShopData(dto: Partial<CreateShopDto>) {
    const shopName = dto.shopName ?? dto.name;
    const ownerPhone = dto.ownerPhone ?? dto.phone;
    const deliveryMode = dto.deliveryMode
      ? this.normalizeDeliveryMode(dto.deliveryMode)
      : undefined;
    return {
      categoryId: dto.categoryId,
      ownerName: dto.ownerName,
      ownerPhone,
      shopName,
      name: shopName,
      phone: ownerPhone,
      addressLine1: dto.addressLine1,
      addressLine2: dto.addressLine2,
      cityId: dto.cityId,
      zoneId: dto.zoneId,
      pincode: dto.pincode,
      latitude: dto.latitude,
      longitude: dto.longitude,
      shopPhotoUrl: dto.shopPhotoUrl,
      upiId: dto.upiId,
      gstNumber: dto.gstNumber,
      fssaiNumber: dto.fssaiNumber,
      udyamNumber: dto.udyamNumber,
      panNumber: dto.panNumber,
      deliveryMode,
      deliveryRadiusKm: dto.deliveryRadiusKm,
      minOrderValue: dto.minOrderValue,
      minOrderAmount: dto.minOrderValue,
      openingTime: dto.openingTime,
      closingTime: dto.closingTime,
      opensAt: dto.openingTime,
      closesAt: dto.closingTime,
      weeklyOffDay: dto.weeklyOffDay,
      commissionPercent: dto.commissionPercent,
      defaultCommissionPercent: dto.commissionPercent,
      description: dto.description,
    };
  }

  private normalizeDeliveryMode(mode: DeliveryMode) {
    if (mode === DeliveryMode.REDKS) return DeliveryMode.REDKS_DELIVERY;
    if (mode === DeliveryMode.SELF) return DeliveryMode.SELF_DELIVERY;
    if (mode === DeliveryMode.HYBRID) return DeliveryMode.BOTH;
    return mode;
  }

  private verificationStatusFor(status: ShopStatus) {
    if (status === ShopStatus.APPROVED) return VerificationStatus.APPROVED;
    if (status === ShopStatus.REJECTED) return VerificationStatus.REJECTED;
    if (status === ShopStatus.SUSPENDED) return VerificationStatus.SUSPENDED;
    return VerificationStatus.PENDING;
  }

  private shopInclude() {
    return {
      city: true,
      zone: true,
      category: true,
      documents: true,
      categories: { include: { category: true } },
    };
  }

  private async syncShopCategory(shopId: string, categoryId?: string) {
    if (!categoryId) return;
    await this.prisma.shopCategory.deleteMany({ where: { shopId } });
    await this.prisma.shopCategory.create({ data: { shopId, categoryId } });
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
