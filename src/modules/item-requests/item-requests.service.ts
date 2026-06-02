import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ItemRequestStatus, QuoteStatus, UserRole } from '@prisma/client';
import { AuthUser } from '../../common/types/auth-user.type';
import { ok } from '../../common/utils/api-response.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { CreateItemRequestDto } from './dto/create-item-request.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

@Injectable()
export class ItemRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(customerId: string, dto: CreateItemRequestDto) {
    return ok(await this.prisma.itemRequest.create({
      data: { ...dto, customerId },
      include: { city: true, zone: true, shop: true, quotes: true },
    }), 'Item request created');
  }

  async findForCustomer(customerId: string) {
    return ok(await this.prisma.itemRequest.findMany({
      where: { customerId },
      include: { city: true, zone: true, shop: true, quotes: true },
      orderBy: { createdAt: 'desc' },
    }));
  }

  async findForActor(user: AuthUser, id: string) {
    const itemRequest = await this.prisma.itemRequest.findUnique({
      where: { id },
      include: { customer: true, city: true, zone: true, shop: true, quotes: true },
    });
    if (!itemRequest) throw new NotFoundException('Item request not found');
    const adminRoles: UserRole[] = [UserRole.ADMIN, UserRole.SUPER_ADMIN];
    if (user.roles.some((role) => adminRoles.includes(role))) return ok(itemRequest);
    if (itemRequest.customerId === user.sub) return ok(itemRequest);
    if (user.roles.includes(UserRole.SHOP_OWNER)) {
      const shop = await this.findOwnerShop(user.sub);
      if (shop.cityId === itemRequest.cityId && (!itemRequest.zoneId || itemRequest.zoneId === shop.zoneId)) return ok(itemRequest);
    }
    throw new ForbiddenException('You cannot access this item request');
  }

  async findAll() {
    return ok(await this.prisma.itemRequest.findMany({
      include: { customer: true, city: true, zone: true, shop: true, quotes: true },
      orderBy: { createdAt: 'desc' },
    }));
  }

  async findNearbyForShop(ownerId: string) {
    const shop = await this.findOwnerShop(ownerId);
    return ok(await this.prisma.itemRequest.findMany({
      where: {
        cityId: shop.cityId,
        zoneId: shop.zoneId,
        status: { in: [ItemRequestStatus.OPEN, ItemRequestStatus.IN_REVIEW, ItemRequestStatus.QUOTED] },
      },
      include: { customer: true, city: true, zone: true, quotes: true },
      orderBy: { createdAt: 'asc' },
    }));
  }

  async createQuote(ownerId: string, itemRequestId: string, dto: CreateQuoteDto) {
    const shop = await this.findOwnerShop(ownerId);
    const itemRequest = await this.prisma.itemRequest.findFirst({
      where: { id: itemRequestId, cityId: shop.cityId, zoneId: shop.zoneId },
    });
    if (!itemRequest) throw new NotFoundException('Nearby item request not found');
    if (itemRequest.status === ItemRequestStatus.CANCELLED || itemRequest.status === ItemRequestStatus.FULFILLED) {
      throw new BadRequestException('Item request is closed');
    }
    const quote = await this.prisma.$transaction(async (tx) => {
      const created = await tx.itemRequestQuote.create({
        data: {
          itemRequestId,
          shopId: shop.id,
          amount: dto.amount,
          note: dto.note,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
          status: QuoteStatus.SENT,
        },
      });
      await tx.itemRequest.update({
        where: { id: itemRequestId },
        data: { status: ItemRequestStatus.QUOTED, quotedAmount: dto.amount },
      });
      return created;
    });
    return ok(quote, 'Quote sent');
  }

  async updateQuote(ownerId: string, quoteId: string, dto: UpdateQuoteDto) {
    const shop = await this.findOwnerShop(ownerId);
    const quote = await this.prisma.itemRequestQuote.findFirst({ where: { id: quoteId, shopId: shop.id } });
    if (!quote) throw new NotFoundException('Quote not found for this shop');
    if (quote.status === QuoteStatus.ACCEPTED) throw new BadRequestException('Accepted quote cannot be changed');
    const updated = await this.prisma.itemRequestQuote.update({
      where: { id: quoteId },
      data: {
        amount: dto.amount,
        note: dto.note,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        status: dto.status,
      },
    });
    return ok(updated, 'Quote updated');
  }

  async acceptQuote(user: AuthUser, quoteId: string) {
    const quote = await this.prisma.itemRequestQuote.findUnique({
      where: { id: quoteId },
      include: { itemRequest: true, shop: true },
    });
    if (!quote) throw new NotFoundException('Quote not found');
    if (!user.roles.includes(UserRole.ADMIN) && !user.roles.includes(UserRole.SUPER_ADMIN) && quote.itemRequest.customerId !== user.sub) {
      throw new ForbiddenException('You can only accept quotes for your own requests');
    }
    if (quote.status !== QuoteStatus.SENT) throw new BadRequestException('Only sent quotes can be accepted');

    const accepted = await this.prisma.$transaction(async (tx) => {
      await tx.itemRequestQuote.updateMany({
        where: { itemRequestId: quote.itemRequestId, id: { not: quote.id } },
        data: { status: QuoteStatus.REJECTED },
      });
      await tx.itemRequest.update({
        where: { id: quote.itemRequestId },
        data: { status: ItemRequestStatus.ACCEPTED, shopId: quote.shopId, quotedAmount: quote.amount },
      });
      return tx.itemRequestQuote.update({
        where: { id: quote.id },
        data: { status: QuoteStatus.ACCEPTED, acceptedAt: new Date() },
        include: { itemRequest: true, shop: true },
      });
    });

    return ok({
      quote: accepted,
      orderConversionTodo:
        'TODO: Convert accepted quote into a custom order once custom order-item pricing workflow is finalized.',
    }, 'Quote accepted');
  }

  private async findOwnerShop(ownerId: string) {
    const shop = await this.prisma.shop.findFirst({ where: { ownerId } });
    if (!shop) throw new NotFoundException('Shop not found for this owner');
    return shop;
  }
}
