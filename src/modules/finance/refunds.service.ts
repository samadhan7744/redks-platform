import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  OrderStatus,
  PaymentStatus,
  RefundStatus,
  WalletTransactionType,
} from '@prisma/client';
import { ok, paginated, paginationParams } from '../../common/utils/api-response.util';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { FinanceQueryDto } from './dto/finance-query.dto';
import { UpdateRefundDto } from './dto/update-refund.dto';
import { WalletService } from './wallet.service';

@Injectable()
export class RefundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly notificationsService?: NotificationsService,
  ) {}

  async create(dto: CreateRefundDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { payment: true, refunds: true },
    });
    if (!order?.payment) throw new NotFoundException('Paid order not found');
    if (order.payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException('Refund allowed only for PAID orders');
    }
    const alreadyRefunded = order.refunds
      .filter((refund) => refund.status !== RefundStatus.FAILED)
      .reduce((total, refund) => total + Number(refund.amount), 0);
    if (alreadyRefunded + dto.amount > Number(order.payment.amount)) {
      throw new BadRequestException('Refund amount exceeds paid amount');
    }

    const refund = await this.prisma.$transaction(async (tx) => {
      const created = await tx.refund.create({
        data: {
          orderId: order.id,
          paymentId: order.payment!.id,
          amount: dto.amount,
          reason: dto.reason,
          walletCredit: dto.walletCredit ?? false,
          status: dto.walletCredit ? RefundStatus.COMPLETED : RefundStatus.PENDING,
          completedAt: dto.walletCredit ? new Date() : undefined,
        },
      });
      await tx.payment.update({
        where: { id: order.payment!.id },
        data: {
          status:
            alreadyRefunded + dto.amount >= Number(order.payment!.amount)
              ? PaymentStatus.REFUNDED
              : PaymentStatus.REFUND_PENDING,
        },
      });
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus:
            alreadyRefunded + dto.amount >= Number(order.payment!.amount)
              ? PaymentStatus.REFUNDED
              : PaymentStatus.REFUND_PENDING,
          status:
            alreadyRefunded + dto.amount >= Number(order.payment!.amount)
              ? OrderStatus.REFUNDED
              : OrderStatus.REFUND_INITIATED,
        },
      });
      if (dto.walletCredit) {
        await this.walletService.credit(tx, {
          userId: order.customerId,
          amount: dto.amount,
          type: WalletTransactionType.REFUND,
          referenceType: 'REFUND',
          referenceId: created.id,
          description: dto.reason ?? 'Order refund credited to wallet',
        });
      }
      return created;
    });

    if (refund.status === RefundStatus.COMPLETED) {
      await this.notificationsService?.notifyRefundProcessed(order.customerId, order.id);
    }
    return ok(refund, 'Refund created');
  }

  async findAll(query: FinanceQueryDto = {}) {
    const { page, limit, skip, take } = paginationParams(query.page, query.limit);
    const where = {
      status: query.status as RefundStatus | undefined,
    };
    const [items, total] = await Promise.all([
      this.prisma.refund.findMany({
        where,
        include: { order: true, payment: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.refund.count({ where }),
    ]);
    return paginated(items, total, page, limit, 'Refunds fetched');
  }

  async update(id: string, dto: UpdateRefundDto) {
    const refund = await this.prisma.refund.update({
      where: { id },
      data: {
        status: dto.status,
        providerRefundId: dto.providerRefundId,
        completedAt: dto.status === RefundStatus.COMPLETED ? new Date() : undefined,
      },
      include: { order: true },
    });
    if (dto.status === RefundStatus.COMPLETED) {
      await this.notificationsService?.notifyRefundProcessed(
        refund.order.customerId,
        refund.orderId,
      );
    }
    return ok(refund, 'Refund updated');
  }
}
