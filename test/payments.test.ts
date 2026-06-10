import assert from 'node:assert/strict';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { createHmac } from 'crypto';
import { OrdersService } from '../src/modules/orders/orders.service';
import { PaymentsService } from '../src/modules/payments/payments.service';

const razorpaySecret = 'test_razorpay_secret';
const webhookSecret = 'test_webhook_secret';

function configMock() {
  return {
    get: (key: string, fallback?: unknown) => {
      const values: Record<string, unknown> = {
        RAZORPAY_KEY_ID: 'rzp_test_redks',
        RAZORPAY_KEY_SECRET: razorpaySecret,
        RAZORPAY_WEBHOOK_SECRET: webhookSecret,
        RAZORPAY_API_BASE_URL: 'https://razorpay.test',
        RAZORPAY_TIMEOUT_MS: 10000,
      };
      return values[key] ?? fallback;
    },
  } as ConfigService;
}

function onlineOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order_1',
    orderNumber: 'RKS-1',
    customerId: 'customer_1',
    shopId: 'shop_1',
    addressId: 'address_1',
    status: OrderStatus.PLACED,
    paymentMethod: PaymentMethod.ONLINE,
    paymentStatus: PaymentStatus.INITIATED,
    subtotal: new Prisma.Decimal(100),
    deliveryFee: new Prisma.Decimal(20),
    platformFee: new Prisma.Decimal(3.45),
    discountAmount: new Prisma.Decimal(0),
    totalAmount: new Prisma.Decimal(123.45),
    commissionPercent: new Prisma.Decimal(10),
    commissionAmount: new Prisma.Decimal(10),
    assignedAt: null,
    assignmentAttempts: 0,
    lastAssignmentAt: null,
    placedAt: new Date(),
    deliveredAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    customerNote: null,
    cancellationReason: null,
    riderId: null,
    payment: {
      id: 'payment_1',
      orderId: 'order_1',
      method: PaymentMethod.ONLINE,
      status: PaymentStatus.INITIATED,
      provider: 'RAZORPAY',
      providerOrderId: 'order_rzp_1',
      providerPaymentId: null,
      providerSignature: null,
      amount: new Prisma.Decimal(123.45),
      currency: 'INR',
      idempotencyKey: null,
      gatewayResponse: null,
      paidAt: null,
      failedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    ...overrides,
  };
}

function paymentSignature(orderId: string, paymentId: string) {
  return createHmac('sha256', razorpaySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}

function webhookSignature(rawBody: Buffer) {
  return createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
}

async function testRazorpayOrderUsesServerAmount() {
  const originalFetch = globalThis.fetch;
  let requestBody: Record<string, unknown> | null = null;
  globalThis.fetch = async (_url, init) => {
    requestBody = JSON.parse(String(init?.body));
    return {
      ok: true,
      json: async () => ({ id: 'order_rzp_new', amount: 12345, currency: 'INR', status: 'created' }),
    } as Response;
  };

  const paymentUpdates: unknown[] = [];
  const prisma = {
    order: {
      findFirst: async () =>
        onlineOrder({
          payment: { ...onlineOrder().payment, providerOrderId: null },
        }),
    },
    payment: {
      update: async ({ data }: { data: unknown }) => {
        paymentUpdates.push(data);
        return { ...onlineOrder().payment, ...(data as object) };
      },
    },
  };

  try {
    const service = new PaymentsService(prisma as never, configMock());
    const response = await service.createRazorpayOrder('customer_1', {
      orderId: 'order_1',
    });

    assert.equal(requestBody?.amount, 12345);
    assert.equal(requestBody?.currency, 'INR');
    assert.equal(response.data.providerOrderId, 'order_rzp_new');
    assert.equal((paymentUpdates[0] as { providerOrderId: string }).providerOrderId, 'order_rzp_new');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testVerifyRazorpaySignatureSuccess() {
  const writes: string[] = [];
  const prisma = {
    order: { findFirst: async () => onlineOrder() },
    $transaction: async (callback: (tx: unknown) => unknown) =>
      callback({
        payment: {
          findUnique: async () => onlineOrder().payment,
          update: async () => {
            writes.push('payment.paid');
            return { ...onlineOrder().payment, status: PaymentStatus.PAID };
          },
        },
        order: {
          update: async () => writes.push('order.paid'),
        },
      }),
  };
  const service = new PaymentsService(prisma as never, configMock());
  const response = await service.verifyRazorpayPayment('customer_1', {
    orderId: 'order_1',
    razorpayOrderId: 'order_rzp_1',
    razorpayPaymentId: 'pay_1',
    razorpaySignature: paymentSignature('order_rzp_1', 'pay_1'),
  });

  assert.equal(response.data.status, PaymentStatus.PAID);
  assert.deepEqual(writes, ['payment.paid', 'order.paid']);
}

async function testVerifyRazorpaySignatureFailureMarksFailed() {
  const writes: string[] = [];
  const prisma = {
    order: { findFirst: async () => onlineOrder() },
    $transaction: async (callback: (tx: unknown) => unknown) =>
      callback({
        payment: {
          findUnique: async () => onlineOrder().payment,
          update: async () => writes.push('payment.failed'),
        },
        order: {
          update: async () => writes.push('order.failed'),
        },
      }),
  };
  const service = new PaymentsService(prisma as never, configMock());

  await assert.rejects(
    () =>
      service.verifyRazorpayPayment('customer_1', {
        orderId: 'order_1',
        razorpayOrderId: 'order_rzp_1',
        razorpayPaymentId: 'pay_1',
        razorpaySignature: 'bad_signature',
      }),
    BadRequestException,
  );
  assert.deepEqual(writes, ['payment.failed', 'order.failed']);
}

async function testWebhookIdempotencyDuplicateIsIgnored() {
  const prismaError = new Prisma.PrismaClientKnownRequestError('duplicate', {
    code: 'P2002',
    clientVersion: 'test',
  });
  const prisma = {
    $transaction: async () => {
      throw prismaError;
    },
  };
  const service = new PaymentsService(prisma as never, configMock());
  const rawBody = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
  const response = await service.handleRazorpayWebhook(
    webhookSignature(rawBody),
    rawBody,
    { event: 'payment.captured' },
    'evt_1',
  );

  assert.equal(response.data.duplicate, true);
}

async function testWebhookCapturedMarksPaymentPaid() {
  const writes: string[] = [];
  const payload = {
    event: 'payment.captured',
    payload: {
      payment: { entity: { id: 'pay_1', order_id: 'order_rzp_1', amount: 12345 } },
    },
  };
  const rawBody = Buffer.from(JSON.stringify(payload));
  const prisma = {
    $transaction: async (callback: (tx: unknown) => unknown) =>
      callback({
        payment: {
          findFirst: async () => onlineOrder().payment,
          update: async () => writes.push('payment.paid'),
        },
        paymentEvent: {
          create: async () => writes.push('event.created'),
        },
        order: {
          update: async () => writes.push('order.paid'),
        },
      }),
  };
  const service = new PaymentsService(prisma as never, configMock());
  await service.handleRazorpayWebhook(
    webhookSignature(rawBody),
    rawBody,
    payload,
    'evt_capture_1',
  );

  assert.deepEqual(writes, ['event.created', 'payment.paid', 'order.paid']);
}

async function testPaymentStatusRequiresOwnership() {
  const prisma = {
    order: {
      findUnique: async () => ({
        ...onlineOrder({ customerId: 'customer_2' }),
        shop: { ownerId: 'owner_2' },
      }),
    },
  };
  const service = new PaymentsService(prisma as never, configMock());

  await assert.rejects(
    () =>
      service.findForOrder(
        { sub: 'customer_1', phone: '9000000001', roles: [UserRole.CUSTOMER] },
        'order_1',
      ),
    ForbiddenException,
  );
}

async function testCodCanBeAcceptedButUnpaidOnlineCannot() {
  const updates: string[] = [];
  const prisma = {
    order: {
      findUnique: async ({ where }: { where: { id: string } }) => ({
        ...onlineOrder({
          id: where.id,
          paymentMethod:
            where.id === 'cod_order' ? PaymentMethod.COD : PaymentMethod.ONLINE,
          paymentStatus:
            where.id === 'cod_order'
              ? PaymentStatus.COD_PENDING
              : PaymentStatus.INITIATED,
          shop: { ownerId: 'owner_1' },
          items: [],
        }),
      }),
      update: async () => {
        updates.push('accepted');
        return {};
      },
    },
  };
  const service = new OrdersService(prisma as never, {} as never, {} as never);
  const user = {
    sub: 'owner_1',
    phone: '9000000002',
    roles: [UserRole.SHOP_OWNER],
  };

  await assert.rejects(
    () => service.shopAccept(user, 'online_order'),
    BadRequestException,
  );
  await service.shopAccept(user, 'cod_order');
  assert.deepEqual(updates, ['accepted']);
}

void (async () => {
  await testRazorpayOrderUsesServerAmount();
  await testVerifyRazorpaySignatureSuccess();
  await testVerifyRazorpaySignatureFailureMarksFailed();
  await testWebhookIdempotencyDuplicateIsIgnored();
  await testWebhookCapturedMarksPaymentPaid();
  await testPaymentStatusRequiresOwnership();
  await testCodCanBeAcceptedButUnpaidOnlineCannot();
  console.log('payment tests passed');
})();
