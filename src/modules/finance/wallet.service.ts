import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, WalletTransactionType } from '@prisma/client';
import { ok, paginated, paginationParams } from '../../common/utils/api-response.util';
import { PrismaService } from '../../prisma/prisma.service';
import { FinanceQueryDto } from './dto/finance-query.dto';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(userId: string) {
    const wallet = await this.prisma.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    return ok(wallet);
  }

  async transactions(userId: string, query: FinanceQueryDto = {}) {
    const wallet = await this.prisma.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    const { page, limit, skip, take } = paginationParams(query.page, query.limit);
    const where = { walletId: wallet.id, userId };
    const [items, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.walletTransaction.count({ where }),
    ]);
    return paginated(items, total, page, limit, 'Wallet transactions fetched');
  }

  async credit(
    tx: Prisma.TransactionClient,
    params: {
      userId: string;
      amount: number;
      type?: WalletTransactionType;
      referenceType?: string;
      referenceId?: string;
      description?: string;
    },
  ) {
    this.assertPositive(params.amount);
    const wallet = await tx.wallet.upsert({
      where: { userId: params.userId },
      update: {
        balance: { increment: params.amount },
        totalCredits: { increment: params.amount },
      },
      create: {
        userId: params.userId,
        balance: params.amount,
        totalCredits: params.amount,
      },
    });
    return tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId: params.userId,
        type: params.type ?? WalletTransactionType.CREDIT,
        amount: params.amount,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        description: params.description,
      },
    });
  }

  async debit(
    tx: Prisma.TransactionClient,
    params: {
      userId: string;
      amount: number;
      referenceType?: string;
      referenceId?: string;
      description?: string;
    },
  ) {
    this.assertPositive(params.amount);
    const wallet = await tx.wallet.upsert({
      where: { userId: params.userId },
      update: {},
      create: { userId: params.userId },
    });
    if (Number(wallet.balance) < params.amount) {
      throw new BadRequestException('Wallet balance cannot become negative');
    }
    const updated = await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: { decrement: params.amount },
        totalDebits: { increment: params.amount },
      },
    });
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId: params.userId,
        type: WalletTransactionType.DEBIT,
        amount: params.amount,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        description: params.description,
      },
    });
    return updated;
  }

  private assertPositive(amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }
  }
}
