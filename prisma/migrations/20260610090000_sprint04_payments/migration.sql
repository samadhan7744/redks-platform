-- Sprint-04 payments: Razorpay provider fields and idempotent webhook events.

ALTER TABLE "Payment"
ADD COLUMN "providerOrderId" TEXT,
ADD COLUMN "providerSignature" TEXT,
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN "idempotencyKey" TEXT,
ADD COLUMN "gatewayResponse" JSONB,
ADD COLUMN "paidAt" TIMESTAMP(3),
ADD COLUMN "failedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Payment_providerOrderId_key" ON "Payment"("providerOrderId");
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");
CREATE INDEX "Payment_idempotencyKey_idx" ON "Payment"("idempotencyKey");

CREATE TABLE "PaymentEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "paymentId" TEXT,
  "orderId" TEXT,
  "payload" JSONB,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentEvent_eventId_key" ON "PaymentEvent"("eventId");
CREATE INDEX "PaymentEvent_provider_eventType_idx" ON "PaymentEvent"("provider", "eventType");
CREATE INDEX "PaymentEvent_paymentId_idx" ON "PaymentEvent"("paymentId");
CREATE INDEX "PaymentEvent_orderId_idx" ON "PaymentEvent"("orderId");

ALTER TABLE "PaymentEvent"
ADD CONSTRAINT "PaymentEvent_paymentId_fkey"
FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentEvent"
ADD CONSTRAINT "PaymentEvent_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
