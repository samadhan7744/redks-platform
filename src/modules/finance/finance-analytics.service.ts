import { Injectable } from '@nestjs/common';
import { RefundStatus, SettlementStatus } from '@prisma/client';
import { ok } from '../../common/utils/api-response.util';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FinanceAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const [
      walletBalance,
      refundAmount,
      pendingRefunds,
      settledAmount,
      pendingSettlements,
    ] = await Promise.all([
      this.prisma.wallet.aggregate({ _sum: { balance: true } }),
      this.prisma.refund.aggregate({ _sum: { amount: true } }),
      this.prisma.refund.count({ where: { status: RefundStatus.PENDING } }),
      this.prisma.settlement.aggregate({
        where: { settlementStatus: SettlementStatus.SETTLED },
        _sum: { amount: true },
      }),
      this.prisma.settlement.count({
        where: { settlementStatus: SettlementStatus.PENDING },
      }),
    ]);
    return ok({
      totalWalletBalance: Number(walletBalance._sum.balance ?? 0),
      totalRefundAmount: Number(refundAmount._sum.amount ?? 0),
      pendingRefunds,
      settledAmount: Number(settledAmount._sum.amount ?? 0),
      pendingSettlements,
    });
  }
}
