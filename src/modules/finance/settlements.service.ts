import { BadRequestException, Injectable } from '@nestjs/common';
import {
  OrderStatus,
  PaymentStatus,
  Prisma,
  SettlementStatus,
} from '@prisma/client';
import { ok, paginated, paginationParams } from '../../common/utils/api-response.util';
import { PrismaService } from '../../prisma/prisma.service';
import { FinanceQueryDto } from './dto/finance-query.dto';
import { RunSettlementDto } from './dto/run-settlement.dto';

@Injectable()
export class SettlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: FinanceQueryDto = {}) {
    const { page, limit, skip, take } = paginationParams(query.page, query.limit);
    const where: Prisma.SettlementWhereInput = {
      shopId: query.shopId,
      settlementStatus: query.status as SettlementStatus | undefined,
    };
    const [items, total] = await Promise.all([
      this.prisma.settlement.findMany({
        where,
        include: { shop: true, order: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.settlement.count({ where }),
    ]);
    return paginated(items, total, page, limit, 'Settlements fetched');
  }

  async run(dto: RunSettlementDto = {}) {
    if (dto.startDate && dto.endDate && dto.startDate > dto.endDate) {
      throw new BadRequestException('startDate must be before endDate');
    }
    const orders = await this.prisma.order.findMany({
      where: {
        shopId: dto.shopId,
        status: OrderStatus.DELIVERED,
        paymentStatus: { in: [PaymentStatus.PAID, PaymentStatus.COD_COLLECTED] },
        deliveredAt:
          dto.startDate || dto.endDate
            ? { gte: dto.startDate, lte: dto.endDate }
            : undefined,
        settlements: { none: {} },
      },
      select: {
        id: true,
        shopId: true,
        totalAmount: true,
        commissionAmount: true,
        platformFee: true,
      },
      orderBy: { deliveredAt: 'asc' },
    });
    const settlements = await this.prisma.$transaction(
      orders.map((order) => {
        const amount = Number(order.totalAmount) - Number(order.commissionAmount) - Number(order.platformFee);
        return this.prisma.settlement.create({
          data: {
            shopId: order.shopId,
            orderId: order.id,
            amount: Math.max(Number(amount.toFixed(2)), 0),
            commissionAmount: order.commissionAmount,
            platformFee: order.platformFee,
            settlementStatus: SettlementStatus.PENDING,
            periodStart: dto.startDate,
            periodEnd: dto.endDate,
          },
        });
      }),
    );
    return ok(
      {
        generated: settlements.length,
        settlements,
      },
      'Settlement run completed',
    );
  }
}
