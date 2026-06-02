import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, ShopStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopStatusDto } from './dto/update-shop-status.dto';

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  findApproved() {
    return this.prisma.shop.findMany({
      where: { status: ShopStatus.APPROVED },
      include: { city: true, zone: true, categories: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      include: {
        city: true,
        zone: true,
        products: true,
        categoryCommissions: { include: { category: true } },
      },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    return shop;
  }

  async create(ownerId: string, dto: CreateShopDto) {
    const slug = this.slugify(dto.name);

    const owner = await this.prisma.user.findUniqueOrThrow({ where: { id: ownerId } });
    const roles = Array.from(new Set([...owner.roles, Role.SHOP_OWNER]));

    await this.prisma.user.update({
      where: { id: ownerId },
      data: { roles },
    });

    return this.prisma.shop.create({
      data: {
        ...dto,
        ownerId,
        slug,
        status: ShopStatus.PENDING_APPROVAL,
      },
    });
  }

  async updateStatus(adminId: string, shopId: string, dto: UpdateShopStatusDto) {
    if (dto.status === ShopStatus.REJECTED && !dto.rejectionReason) {
      throw new BadRequestException('Rejection reason is required');
    }

    return this.prisma.shop.update({
      where: { id: shopId },
      data: {
        status: dto.status,
        approvedById: dto.status === ShopStatus.APPROVED ? adminId : undefined,
        approvedAt: dto.status === ShopStatus.APPROVED ? new Date() : undefined,
        rejectionReason: dto.rejectionReason,
      },
    });
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
