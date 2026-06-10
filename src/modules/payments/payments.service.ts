import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Order,
  Payment,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import { AuthUser } from '../../common/types/auth-user.type';
import { ok } from '../../common/utils/api-response.util';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateRazorpayOrderDto } from './dto/create-razorpay-order.dto';
import { VerifyRazorpayPaymentDto } from './dto/verify-razorpay-payment.dto';

type OrderWithPayment = Order & {
  payment: Payment | null;
  shop?: { ownerId: string };
};

type OrderWithRequiredPayment = Order & {
  payment: Payment;
  shop?: { ownerId: string };
};

type RazorpayOrderResponse = {
  id: string;
  amount: number;
  currency: string;
  status: string;
};

type RazorpayWebhookEntity = {
  id?: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  error_description?: string;
};

type RazorpayWebhookPayload = {
  event?: string;
  created_at?: number;
  payload?: {
    payment?: { entity?: RazorpayWebhookEntity };
    order?: { entity?: RazorpayWebhookEntity };
  };
};

@Injectable()
export class PaymentsService {
  private readonly provider = 'RAZORPAY';

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly notificationsService?: NotificationsService,
  ) {}

  findAll() {
    return this.prisma.payment.findMany({
      include: { order: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { order: true },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  async findForOrder(user: AuthUser, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, shop: { select: { ownerId: true } } },
    });
    if (!order?.payment) {
      throw new NotFoundException('Payment not found');
    }
    this.assertPaymentAccess(user, order);
    return ok(order.payment, 'Payment status fetched');
  }

  async createRazorpayOrder(customerId: string, dto: CreateRazorpayOrderDto) {
    const order = await this.getCustomerOrderWithPayment(customerId, dto.orderId);
    this.assertOnlinePaymentOrder(order);

    if (order.payment.status === PaymentStatus.PAID) {
      return ok(
        this.toClientOrderPayload(order.payment, order),
        'Payment already completed',
      );
    }

    if (order.payment.providerOrderId) {
      return ok(
        this.toClientOrderPayload(order.payment, order),
        'Existing Razorpay order reused',
      );
    }

    const keyId = this.requiredEnv('RAZORPAY_KEY_ID');
    const keySecret = this.requiredEnv('RAZORPAY_KEY_SECRET');
    const amountPaise = this.toPaise(order.totalAmount);
    const currency = order.payment.currency || 'INR';
    const gatewayOrder = await this.createRazorpayGatewayOrder(
      keyId,
      keySecret,
      {
        amount: amountPaise,
        currency,
        receipt: order.orderNumber,
        notes: {
          orderId: order.id,
          paymentId: order.payment.id,
          orderNumber: order.orderNumber,
        },
      },
    );

    const payment = await this.prisma.payment.update({
      where: { id: order.payment.id },
      data: {
        provider: this.provider,
        providerOrderId: gatewayOrder.id,
        status: PaymentStatus.INITIATED,
        currency: gatewayOrder.currency ?? currency,
        gatewayResponse: gatewayOrder as unknown as Prisma.InputJsonValue,
      },
    });

    return ok(
      this.toClientOrderPayload(payment, order),
      'Razorpay order created',
    );
  }

  async verifyRazorpayPayment(customerId: string, dto: VerifyRazorpayPaymentDto) {
    const order = await this.getCustomerOrderWithPayment(customerId, dto.orderId);
    this.assertOnlinePaymentOrder(order);

    if (order.payment.status === PaymentStatus.PAID) {
      return ok(order.payment, 'Payment already verified');
    }

    if (order.payment.providerOrderId !== dto.razorpayOrderId) {
      throw new BadRequestException('Payment does not belong to this order');
    }

    const keySecret = this.requiredEnv('RAZORPAY_KEY_SECRET');
    const isValid = this.verifyRazorpayPaymentSignature(
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
      keySecret,
    );

    if (!isValid) {
      await this.markPaymentFailed(
        order.payment.id,
        order.id,
        order.customerId,
        dto.razorpayPaymentId,
        dto.razorpaySignature,
        { reason: 'Invalid Razorpay signature' },
      );
      throw new BadRequestException('Invalid payment signature');
    }

    const payment = await this.markPaymentPaid(
      order.payment.id,
      order.id,
      order.customerId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
      { source: 'client_verify' },
    );

    return ok(payment, 'Payment verified');
  }

  async handleRazorpayWebhook(
    signature: string | undefined,
    rawBody: Buffer | undefined,
    payload: RazorpayWebhookPayload,
    eventIdHeader?: string,
  ) {
    if (!rawBody?.length) {
      throw new BadRequestException('Webhook raw body is required');
    }
    const webhookSecret = this.requiredEnv('RAZORPAY_WEBHOOK_SECRET');
    if (!signature || !this.verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      throw new BadRequestException('Invalid Razorpay webhook signature');
    }

    const eventType = payload.event ?? 'unknown';
    const paymentEntity = payload.payload?.payment?.entity;
    const orderEntity = payload.payload?.order?.entity;
    const providerOrderId = paymentEntity?.order_id ?? orderEntity?.id;
    const providerPaymentId = paymentEntity?.id;
    const eventId =
      eventIdHeader ??
      `${eventType}:${providerOrderId ?? 'no-order'}:${providerPaymentId ?? 'no-payment'}:${payload.created_at ?? 'no-time'}`;

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const payment = providerOrderId
          ? await tx.payment.findFirst({
              where: { provider: this.provider, providerOrderId },
              include: { order: true },
            })
          : null;

        await tx.paymentEvent.create({
          data: {
            provider: this.provider,
            eventId,
            eventType,
            paymentId: payment?.id,
            orderId: payment?.orderId,
            payload: payload as unknown as Prisma.InputJsonValue,
          },
        });

        if (!payment) {
          return { handled: false, reason: 'Payment not found for webhook' };
        }

        if (payment.status === PaymentStatus.PAID) {
          return { handled: true, reason: 'Payment already paid' };
        }

        if (eventType === 'payment.captured' || eventType === 'order.paid') {
          const entityAmount = paymentEntity?.amount ?? orderEntity?.amount;
          this.assertWebhookAmount(payment, entityAmount);
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.PAID,
              providerPaymentId: providerPaymentId ?? payment.providerPaymentId,
              paidAt: new Date(),
              gatewayResponse: payload as unknown as Prisma.InputJsonValue,
            },
          });
          await tx.order.update({
            where: { id: payment.orderId },
            data: { paymentStatus: PaymentStatus.PAID },
          });
          return {
            handled: true,
            reason: 'Payment marked paid',
            notification: payment.order?.customerId
              ? {
                  type: 'success',
                  userId: payment.order.customerId,
                  orderId: payment.orderId,
                }
              : undefined,
          };
        }

        if (eventType === 'payment.failed') {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.FAILED,
              providerPaymentId: providerPaymentId ?? payment.providerPaymentId,
              failedAt: new Date(),
              gatewayResponse: payload as unknown as Prisma.InputJsonValue,
            },
          });
          await tx.order.update({
            where: { id: payment.orderId },
            data: { paymentStatus: PaymentStatus.FAILED },
          });
          return {
            handled: true,
            reason: 'Payment marked failed',
            notification: payment.order?.customerId
              ? {
                  type: 'failed',
                  userId: payment.order.customerId,
                  orderId: payment.orderId,
                }
              : undefined,
          };
        }

        return { handled: false, reason: `Unhandled event ${eventType}` };
      });

      if (result.notification?.type === 'success') {
        await this.notificationsService?.notifyPaymentSuccessful(
          result.notification.userId,
          result.notification.orderId,
        );
      }
      if (result.notification?.type === 'failed') {
        await this.notificationsService?.notifyPaymentFailed(
          result.notification.userId,
          result.notification.orderId,
        );
      }

      return ok(result, 'Webhook processed');
    } catch (error) {
      if (this.isPrismaUniqueError(error)) {
        return ok({ handled: false, duplicate: true }, 'Webhook already processed');
      }
      throw error;
    }
  }

  verifyRazorpayPaymentSignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
    secret: string,
  ) {
    const expected = createHmac('sha256', secret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');
    return this.safeCompare(expected, razorpaySignature);
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string, secret: string) {
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    return this.safeCompare(expected, signature);
  }

  private async getCustomerOrderWithPayment(
    customerId: string,
    orderId: string,
  ): Promise<OrderWithRequiredPayment> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId },
      include: { payment: true },
    });
    if (!order?.payment) {
      throw new NotFoundException('Payment not found for this order');
    }
    return order as OrderWithRequiredPayment;
  }

  private assertOnlinePaymentOrder(order: OrderWithRequiredPayment) {
    if (order.paymentMethod !== PaymentMethod.ONLINE || order.payment.method !== PaymentMethod.ONLINE) {
      throw new BadRequestException('Razorpay is available only for online payment orders');
    }
    if (order.payment.status === PaymentStatus.COD_COLLECTED || order.payment.status === PaymentStatus.COD_PENDING) {
      throw new BadRequestException('COD payments cannot be processed online');
    }
  }

  private assertPaymentAccess(user: AuthUser, order: OrderWithPayment) {
    if (
      user.roles.includes(UserRole.ADMIN) ||
      user.roles.includes(UserRole.SUPER_ADMIN) ||
      order.customerId === user.sub ||
      order.shop?.ownerId === user.sub
    ) {
      return;
    }
    throw new ForbiddenException('You cannot access this payment');
  }

  private async createRazorpayGatewayOrder(
    keyId: string,
    keySecret: string,
    payload: Record<string, unknown>,
  ): Promise<RazorpayOrderResponse> {
    const apiBaseUrl = this.configService.get<string>(
      'RAZORPAY_API_BASE_URL',
      'https://api.razorpay.com/v1',
    );
    const timeoutMs = this.configService.get<number>('RAZORPAY_TIMEOUT_MS', 10000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${apiBaseUrl}/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const json = (await response.json()) as RazorpayOrderResponse & {
        error?: { description?: string };
      };

      if (!response.ok) {
        throw new BadRequestException(
          json.error?.description ?? 'Razorpay order creation failed',
        );
      }
      return json;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new ServiceUnavailableException('Razorpay is currently unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }

  private async markPaymentPaid(
    paymentId: string,
    orderId: string,
    customerId: string,
    providerPaymentId: string,
    providerSignature: string | undefined,
    gatewayResponse: Prisma.InputJsonValue,
  ) {
    const payment = await this.prisma.$transaction(async (tx) => {
      const current = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!current) throw new NotFoundException('Payment not found');
      if (current.status === PaymentStatus.PAID) return current;

      const payment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.PAID,
          providerPaymentId,
          providerSignature,
          paidAt: new Date(),
          gatewayResponse,
        },
      });
      await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: PaymentStatus.PAID },
      });
      return payment;
    });
    await this.notificationsService?.notifyPaymentSuccessful(customerId, orderId);
    return payment;
  }

  private async markPaymentFailed(
    paymentId: string,
    orderId: string,
    customerId: string,
    providerPaymentId: string | undefined,
    providerSignature: string | undefined,
    gatewayResponse: Prisma.InputJsonValue,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!current || current.status === PaymentStatus.PAID) return;
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.FAILED,
          providerPaymentId,
          providerSignature,
          failedAt: new Date(),
          gatewayResponse,
        },
      });
      await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: PaymentStatus.FAILED },
      });
    });
    await this.notificationsService?.notifyPaymentFailed(customerId, orderId);
  }

  private assertWebhookAmount(payment: Payment, providerAmount: number | undefined) {
    if (!providerAmount || providerAmount !== this.toPaise(payment.amount)) {
      throw new BadRequestException('Webhook amount does not match payment amount');
    }
  }

  private toClientOrderPayload(payment: Payment, order: Order) {
    return {
      keyId: this.configService.get<string>('RAZORPAY_KEY_ID'),
      provider: this.provider,
      providerOrderId: payment.providerOrderId,
      paymentId: payment.id,
      orderId: order.id,
      amount: this.toPaise(payment.amount),
      currency: payment.currency,
      status: payment.status,
    };
  }

  private toPaise(amount: Prisma.Decimal | number) {
    return Math.round(Number(amount) * 100);
  }

  private requiredEnv(name: string) {
    const value = this.configService.get<string>(name);
    if (!value) {
      throw new InternalServerErrorException(`${name} is not configured`);
    }
    return value;
  }

  private safeCompare(expected: string, received: string) {
    const expectedBuffer = Buffer.from(expected, 'hex');
    const receivedBuffer = Buffer.from(received, 'hex');
    return (
      expectedBuffer.length === receivedBuffer.length &&
      timingSafeEqual(expectedBuffer, receivedBuffer)
    );
  }

  private isPrismaUniqueError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
