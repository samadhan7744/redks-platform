import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DeliveryMode,
  ShopRiderStatus,
  ShopStatus,
  UserRole,
  VerificationStatus,
} from '@prisma/client';
import { AuthUser } from '../../common/types/auth-user.type';
import {
  ok,
  paginated,
  paginationParams,
} from '../../common/utils/api-response.util';
import { MapsService } from '../maps/maps.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { CreateShopDocumentDto } from './dto/create-shop-document.dto';
import { CreateShopRiderDto } from './dto/create-shop-rider.dto';
import { NearbyShopsQueryDto } from './dto/nearby-shops-query.dto';
import { ShopQueryDto } from './dto/shop-query.dto';
import { UpdateMyShopStatusDto } from './dto/update-my-shop-status.dto';
import { UpdateShopLocationDto } from './dto/update-shop-location.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { UpdateShopStatusDto } from './dto/update-shop-status.dto';

@Injectable()
export class ShopsService {
  private readonly defaultNearbyRadiusKm = 5;
  private readonly maxNearbyRadiusKm = 20;
  private readonly nearbyCacheTtlSeconds = 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mapsService: MapsService,
    private readonly redisService?: RedisService,
    private readonly notificationsService?: NotificationsService,
  ) {}

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

  async findNearby(query: NearbyShopsQueryDto) {
    const radiusKm = this.safeRadiusKm(query.radiusKm);
    this.assertLatLng(query.lat, query.lng);
    const cacheKey = this.nearbyCacheKey(query.lat, query.lng, radiusKm);
    const cached = await this.getNearbyCache(cacheKey);
    if (cached) return ok(cached);

    const shops = await this.prisma.shop.findMany({
      where: {
        status: ShopStatus.APPROVED,
        latitude: { not: null },
        longitude: { not: null },
      },
      include: this.shopInclude(),
    });
    const nearby = shops
      .map((shop) => {
        const locatedShop = shop as typeof shop & {
          serviceRadiusKm?: unknown;
          deliveryRadiusKm?: unknown;
        };
        const distanceKm = this.mapsService.distanceKm(
          query.lat,
          query.lng,
          locatedShop.latitude,
          locatedShop.longitude,
        );
        const serviceRadiusKm = Number(
          locatedShop.serviceRadiusKm ??
            locatedShop.deliveryRadiusKm ??
            radiusKm,
        );
        return {
          shop,
          distanceKm,
          estimatedDeliveryMinutes: this.estimatedDeliveryMinutes(distanceKm),
          serviceRadiusKm,
        };
      })
      .filter(
        (item) =>
          Number.isFinite(item.distanceKm) &&
          item.distanceKm <= radiusKm &&
          item.distanceKm <= item.serviceRadiusKm,
      )
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .map(({ serviceRadiusKm: _serviceRadiusKm, ...item }) => ({
        ...item,
        distanceKm: Number(item.distanceKm.toFixed(3)),
      }));

    await this.setNearbyCache(cacheKey, nearby);
    return ok(nearby);
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
    this.assertLocationPayload(dto, true);
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
        status: ShopStatus.SUBMITTED,
        verificationStatus: VerificationStatus.PENDING,
        submittedAt: new Date(),
      },
      include: this.shopInclude(),
    });
    await this.syncShopCategory(shop.id, dto.categoryId);
    return ok(shop, 'Shop submitted for approval');
  }

  async findMyShop(ownerId: string) {
    const shop = await this.findOwnedShop(ownerId);
    return ok(shop);
  }

  async updateMyShop(ownerId: string, dto: UpdateShopDto) {
    this.assertLocationPayload(dto, false);
    this.assertServiceRadius(dto.serviceRadiusKm ?? dto.deliveryRadiusKm);
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
      ShopStatus.SUBMITTED,
      ShopStatus.PENDING_APPROVAL,
    ];
    if (!ownerEditableStatuses.includes(dto.status)) {
      throw new BadRequestException(
        'Shop owner can only set DRAFT, SUBMITTED, or PENDING_APPROVAL',
      );
    }
    const shop = await this.findOwnedShop(ownerId);
    const updated = await this.prisma.shop.update({
      where: { id: shop.id },
      data: { status: dto.status },
    });
    return ok(updated, 'Shop status updated');
  }

  async updateMyLocation(ownerId: string, dto: UpdateShopLocationDto) {
    const shop = await this.findOwnedShop(ownerId);
    return this.updateShopLocation(shop.id, dto);
  }

  async updateLocation(user: AuthUser, shopId: string, dto: UpdateShopLocationDto) {
    const adminRoles: UserRole[] = [UserRole.ADMIN, UserRole.SUPER_ADMIN];
    if (!user.roles.some((role) => adminRoles.includes(role))) {
      await this.assertOwner(shopId, user.sub);
    }
    return this.updateShopLocation(shopId, dto);
  }

  async updateStatus(
    adminId: string,
    shopId: string,
    dto: UpdateShopStatusDto,
  ) {
    if (
      (dto.status === ShopStatus.REJECTED ||
        dto.status === ShopStatus.CHANGES_REQUESTED) &&
      !dto.rejectionReason
    ) {
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
        reviewNotes: dto.reviewNotes,
        changesRequestedAt:
          dto.status === ShopStatus.CHANGES_REQUESTED ? new Date() : undefined,
        submittedAt:
          dto.status === ShopStatus.SUBMITTED ||
          dto.status === ShopStatus.PENDING_APPROVAL
            ? new Date()
            : undefined,
      },
      include: this.shopInclude(),
    });
    if (dto.status === ShopStatus.APPROVED) {
      await this.notificationsService?.notifyShopApproved(shop.ownerId, shop.id);
    }
    if (dto.status === ShopStatus.REJECTED) {
      await this.notificationsService?.notifyShopRejected(
        shop.ownerId,
        shop.id,
        dto.rejectionReason,
      );
    }
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

  requestChanges(
    adminId: string,
    shopId: string,
    reason: string,
    reviewNotes?: string,
  ) {
    return this.updateStatus(adminId, shopId, {
      status: ShopStatus.CHANGES_REQUESTED,
      rejectionReason: reason,
      reviewNotes,
    });
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

  async createMyShopRider(ownerId: string, dto: CreateShopRiderDto) {
    const shop = await this.findOwnedShop(ownerId);
    return ok(
      await this.prisma.shopRider.create({
        data: {
          shopId: shop.id,
          fullName: dto.fullName,
          phone: dto.phone,
          email: dto.email,
          vehicleType: dto.vehicleType,
          vehicleNumber: dto.vehicleNumber,
          upiId: dto.upiId,
          bankAccount: dto.bankAccount,
          emergencyName: dto.emergencyName,
          emergencyPhone: dto.emergencyPhone,
          profilePhotoUrl: dto.profilePhotoUrl,
          status: ShopRiderStatus.SUBMITTED,
          submittedAt: new Date(),
        },
        include: { verificationDocuments: true },
      }),
      'Shop rider submitted for approval',
    );
  }

  async findMyShopRiders(ownerId: string) {
    const shop = await this.findOwnedShop(ownerId);
    return ok(
      await this.prisma.shopRider.findMany({
        where: { shopId: shop.id },
        include: { verificationDocuments: true },
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
      ownerPhotoUrl: dto.ownerPhotoUrl,
      upiId: dto.upiId,
      gstNumber: dto.gstNumber,
      fssaiNumber: dto.fssaiNumber,
      udyamNumber: dto.udyamNumber,
      panNumber: dto.panNumber,
      deliveryMode,
      deliveryRadiusKm: this.cappedServiceRadius(dto.deliveryRadiusKm),
      serviceRadiusKm: this.cappedServiceRadius(
        dto.serviceRadiusKm ?? dto.deliveryRadiusKm,
      ),
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

  private assertLocationPayload(dto: Partial<CreateShopDto>, required: boolean) {
    const hasLat = dto.latitude !== undefined && dto.latitude !== null;
    const hasLng = dto.longitude !== undefined && dto.longitude !== null;
    if (required && (!hasLat || !hasLng)) {
      throw new BadRequestException(
        'latitude and longitude are required for shop location',
      );
    }
    if (hasLat !== hasLng) {
      throw new BadRequestException(
        'latitude and longitude must be provided together',
      );
    }
    if (hasLat && hasLng) this.assertLatLng(dto.latitude, dto.longitude);
    this.assertServiceRadius(dto.serviceRadiusKm ?? dto.deliveryRadiusKm);
  }

  private estimatedDeliveryMinutes(distanceKm: number) {
    if (!Number.isFinite(distanceKm)) return null;
    return Math.max(15, Math.round(12 + distanceKm * 6));
  }

  private async updateShopLocation(shopId: string, dto: UpdateShopLocationDto) {
    this.assertLatLng(dto.latitude, dto.longitude);
    this.assertServiceRadius(dto.serviceRadiusKm);
    const shop = await this.prisma.shop.update({
      where: { id: shopId },
      data: {
        latitude: dto.latitude,
        longitude: dto.longitude,
        serviceRadiusKm: this.cappedServiceRadius(dto.serviceRadiusKm),
      },
      include: this.shopInclude(),
    });
    return ok(shop, 'Shop location updated');
  }

  private safeRadiusKm(radiusKm?: number) {
    const radius = radiusKm ?? this.defaultNearbyRadiusKm;
    if (!Number.isFinite(radius) || radius <= 0) {
      throw new BadRequestException('radiusKm must be greater than 0');
    }
    if (radius > this.maxNearbyRadiusKm) {
      throw new BadRequestException('radiusKm cannot exceed 20km');
    }
    return radius;
  }

  private assertLatLng(latitude: unknown, longitude: unknown) {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      throw new BadRequestException('latitude must be between -90 and 90');
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      throw new BadRequestException('longitude must be between -180 and 180');
    }
  }

  private assertServiceRadius(radiusKm?: number) {
    if (radiusKm === undefined || radiusKm === null) return;
    const radius = Number(radiusKm);
    if (!Number.isFinite(radius) || radius <= 0 || radius > 20) {
      throw new BadRequestException('serviceRadiusKm must be between 0.1 and 20');
    }
  }

  private cappedServiceRadius(radiusKm?: number) {
    if (radiusKm === undefined || radiusKm === null) return undefined;
    this.assertServiceRadius(radiusKm);
    return Math.min(Number(radiusKm), this.maxNearbyRadiusKm);
  }

  private nearbyCacheKey(latitude: number, longitude: number, radiusKm: number) {
    return [
      'shops:nearby',
      Number(latitude).toFixed(3),
      Number(longitude).toFixed(3),
      radiusKm.toFixed(1),
    ].join(':');
  }

  private async getNearbyCache(key: string) {
    try {
      return await this.redisService?.getJson<unknown[]>(key);
    } catch {
      return null;
    }
  }

  private async setNearbyCache(key: string, value: unknown) {
    try {
      await this.redisService?.setJson(
        key,
        value,
        this.nearbyCacheTtlSeconds,
      );
    } catch {}
  }

  private verificationStatusFor(status: ShopStatus) {
    if (status === ShopStatus.APPROVED) return VerificationStatus.APPROVED;
    if (
      status === ShopStatus.REJECTED ||
      status === ShopStatus.CHANGES_REQUESTED
    )
      return VerificationStatus.REJECTED;
    if (status === ShopStatus.SUSPENDED) return VerificationStatus.SUSPENDED;
    return VerificationStatus.PENDING;
  }

  private shopInclude() {
    return {
      city: true,
      zone: true,
      category: true,
      documents: true,
      shopRiders: true,
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
