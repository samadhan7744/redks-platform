import assert from 'node:assert/strict';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  RefundStatus,
  SettlementStatus,
  UserRole,
  WalletTransactionType,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { RefundsService } from '../src/modules/finance/refunds.service';
import { SettlementsService } from '../src/modules/finance/settlements.service';
import { WalletService } from '../src/modules/finance/wallet.service';

function decimal(value: number) {
  return new Prisma.Decimal(value);
}

async function testWalletCreditsDebits() {
  const transactions: unknown[] = [];
  const tx = {
    wallet: {
      upsert: async ({ create, update }: { create: { balance?: number }; update: object }) => ({
        id: 'wallet_1',
        userId: 'user_1',
        balance: create.balance ?? decimal(100),
        ...update,
      }),
      update: async ({ data }: { data: unknown }) => ({ id: 'wallet_1', ...data }),
    },
    walletTransaction: {
      create: async ({ data }: { data: unknown }) => {
        transactions.push(data);
        return { id: `txn_${transactions.length}`, ...(data as object) };
      },
    },
  };
  const service = new WalletService({} as never);

  await service.credit(tx as never, {
    userId: 'user_1',
    amount: 50,
    type: WalletTransactionType.CREDIT,
  });
  await service.debit(tx as never, { userId: 'user_1', amount: 25 });

  assert.equal(transactions.length, 2);
  assert.equal(transactions[0]['type'], WalletTransactionType.CREDIT);
  assert.equal(transactions[1]['type'], WalletTransactionType.DEBIT);
}

async function testWalletNegativeBlocked() {
  const tx = {
    wallet: {
      upsert: async () => ({ id: 'wallet_1', balance: decimal(10) }),
    },
  };
  const service = new WalletService({} as never);

  await assert.rejects(
    () => service.debit(tx as never, { userId: 'user_1', amount: 25 }),
    /Wallet balance cannot become negative/,
  );
}

function paidOrder(refunds: Array<{ amount: Prisma.Decimal; status: RefundStatus }> = []) {
  return {
    id: 'order_1',
    customerId: 'customer_1',
    status: OrderStatus.DELIVERED,
    paymentStatus: PaymentStatus.PAID,
    payment: {
      id: 'payment_1',
      status: PaymentStatus.PAID,
      amount: decimal(500),
    },
    refunds,
  };
}

async function testPartialRefundProcessing() {
  const updates: unknown[] = [];
  const prisma = {
    order: { findUnique: async () => paidOrder() },
    $transaction: async (callback: (tx: unknown) => unknown) =>
      callback({
        refund: {
          create: async ({ data }: { data: unknown }) => ({ id: 'refund_1', ...(data as object) }),
        },
        payment: { update: async ({ data }: { data: unknown }) => updates.push({ payment: data }) },
        order: { update: async ({ data }: { data: unknown }) => updates.push({ order: data }) },
      }),
  };
  const service = new RefundsService(prisma as never, {} as never);
  const response = await service.create({
    orderId: 'order_1',
    amount: 100,
    reason: 'Partial',
  });

  assert.equal(response.data.status, RefundStatus.PENDING);
  assert.deepEqual(updates[0], { payment: { status: PaymentStatus.REFUND_PENDING } });
  assert.equal(updates[1]['order']['status'], OrderStatus.REFUND_INITIATED);
}

async function testFullRefundToWallet() {
  const credits: unknown[] = [];
  const prisma = {
    order: { findUnique: async () => paidOrder() },
    $transaction: async (callback: (tx: unknown) => unknown) =>
      callback({
        refund: {
          create: async ({ data }: { data: unknown }) => ({ id: 'refund_1', ...(data as object) }),
        },
        payment: { update: async () => undefined },
        order: { update: async () => undefined },
      }),
  };
  const wallet = {
    credit: async (_tx: unknown, data: unknown) => credits.push(data),
  };
  const service = new RefundsService(prisma as never, wallet as never);
  const response = await service.create({
    orderId: 'order_1',
    amount: 500,
    walletCredit: true,
  });

  assert.equal(response.data.status, RefundStatus.COMPLETED);
  assert.equal(credits[0]['type'], WalletTransactionType.REFUND);
  assert.equal(credits[0]['amount'], 500);
}

async function testSettlementGeneration() {
  const created: unknown[] = [];
  const prisma = {
    order: {
      findMany: async () => [
        {
          id: 'order_1',
          shopId: 'shop_1',
          totalAmount: decimal(1000),
          commissionAmount: decimal(100),
          platformFee: decimal(20),
        },
      ],
    },
    settlement: {
      create: ({ data }: { data: unknown }) => {
        created.push(data);
        return { id: 'settlement_1', ...(data as object) };
      },
    },
    $transaction: async (ops: unknown[]) => Promise.all(ops),
  };
  const service = new SettlementsService(prisma as never);
  const response = await service.run({ shopId: 'shop_1' });

  assert.equal(response.data.generated, 1);
  assert.equal(created[0]['amount'], 880);
  assert.equal(created[0]['settlementStatus'], SettlementStatus.PENDING);
}

async function testDuplicateSettlementPrevention() {
  const prisma = {
    order: { findMany: async () => [] },
    $transaction: async (ops: unknown[]) => Promise.all(ops),
  };
  const service = new SettlementsService(prisma as never);
  const response = await service.run({ shopId: 'shop_1' });

  assert.equal(response.data.generated, 0);
}

function executionContext(roles: UserRole[]) {
  return {
    getHandler: () => 'handler',
    getClass: () => 'class',
    switchToHttp: () => ({ getRequest: () => ({ user: { roles } }) }),
  } as unknown as ExecutionContext;
}

async function testAdminAuthorization() {
  const reflector = {
    getAllAndOverride: (key: string) =>
      key === ROLES_KEY ? [UserRole.ADMIN, UserRole.SUPER_ADMIN] : undefined,
  } as Reflector;
  const guard = new RolesGuard(reflector);

  assert.equal(guard.canActivate(executionContext([UserRole.SUPER_ADMIN])), true);
  assert.throws(
    () => guard.canActivate(executionContext([UserRole.CUSTOMER])),
    ForbiddenException,
  );
}

void (async () => {
  await testWalletCreditsDebits();
  await testWalletNegativeBlocked();
  await testPartialRefundProcessing();
  await testFullRefundToWallet();
  await testSettlementGeneration();
  await testDuplicateSettlementPrevention();
  await testAdminAuthorization();
  console.log('finance tests passed');
})();
