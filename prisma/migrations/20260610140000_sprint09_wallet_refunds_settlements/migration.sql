-- Sprint-09 wallet, refunds, settlements, and reconciliation foundation.

CREATE TYPE "WalletTransactionType" AS ENUM ('CREDIT', 'DEBIT', 'REFUND', 'ADJUSTMENT');
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'PROCESSING', 'SETTLED', 'FAILED');

CREATE TABLE "Wallet" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "balance" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "totalCredits" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "totalDebits" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WalletTransaction" (
  "id" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "WalletTransactionType" NOT NULL,
  "amount" DECIMAL(10, 2) NOT NULL,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Refund" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "amount" DECIMAL(10, 2) NOT NULL,
  "reason" TEXT,
  "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
  "providerRefundId" TEXT,
  "walletCredit" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Settlement" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "orderId" TEXT,
  "amount" DECIMAL(10, 2) NOT NULL,
  "commissionAmount" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "platformFee" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "settlementStatus" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
  "periodStart" TIMESTAMP(3),
  "periodEnd" TIMESTAMP(3),
  "settledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");
CREATE INDEX "Wallet_userId_idx" ON "Wallet"("userId");
CREATE INDEX "WalletTransaction_walletId_idx" ON "WalletTransaction"("walletId");
CREATE INDEX "WalletTransaction_userId_idx" ON "WalletTransaction"("userId");
CREATE INDEX "WalletTransaction_referenceType_referenceId_idx" ON "WalletTransaction"("referenceType", "referenceId");
CREATE INDEX "WalletTransaction_createdAt_idx" ON "WalletTransaction"("createdAt");
CREATE INDEX "Refund_orderId_idx" ON "Refund"("orderId");
CREATE INDEX "Refund_paymentId_idx" ON "Refund"("paymentId");
CREATE INDEX "Refund_status_idx" ON "Refund"("status");
CREATE INDEX "Refund_createdAt_idx" ON "Refund"("createdAt");
CREATE UNIQUE INDEX "Settlement_orderId_key" ON "Settlement"("orderId");
CREATE INDEX "Settlement_shopId_idx" ON "Settlement"("shopId");
CREATE INDEX "Settlement_settlementStatus_idx" ON "Settlement"("settlementStatus");
CREATE INDEX "Settlement_settledAt_idx" ON "Settlement"("settledAt");

ALTER TABLE "Wallet"
ADD CONSTRAINT "Wallet_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WalletTransaction"
ADD CONSTRAINT "WalletTransaction_walletId_fkey"
FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WalletTransaction"
ADD CONSTRAINT "WalletTransaction_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Refund"
ADD CONSTRAINT "Refund_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Refund"
ADD CONSTRAINT "Refund_paymentId_fkey"
FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Settlement"
ADD CONSTRAINT "Settlement_shopId_fkey"
FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Settlement"
ADD CONSTRAINT "Settlement_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
