import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationStatus,
  NotificationType,
  Prisma,
  UserRole,
} from '@prisma/client';
import { AuthUser } from '../../common/types/auth-user.type';
import {
  ok,
  paginated,
  paginationParams,
} from '../../common/utils/api-response.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotificationTemplateDto } from './dto/create-notification-template.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { UpdateNotificationTemplateDto } from './dto/update-notification-template.dto';
import {
  NotificationProvider,
  ProviderResult,
} from './providers/notification-provider.interface';

export const NOTIFICATION_PROVIDER = Symbol('NOTIFICATION_PROVIDER');

type NotificationInput = {
  userId: string;
  type?: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
};

type RenderVariables = Record<string, string | number | boolean | null | undefined>;

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(NOTIFICATION_PROVIDER)
    private readonly provider: NotificationProvider,
  ) {}

  async findForUser(userId: string, query: NotificationQueryDto = {}) {
    const { page, limit, skip, take } = paginationParams(
      query.page,
      query.limit,
    );
    const where: Prisma.NotificationWhereInput = {
      userId,
      type: query.type,
      status: query.status,
    };
    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    return {
      ...paginated(items, total, page, limit, 'Notifications fetched'),
      unreadCount,
    };
  }

  async findAllForAdmin(query: NotificationQueryDto = {}) {
    const { page, limit, skip, take } = paginationParams(
      query.page,
      query.limit,
    );
    const where: Prisma.NotificationWhereInput = {
      userId: query.userId,
      type: query.type,
      status: query.status,
    };
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return paginated(items, total, page, limit, 'Notifications fetched');
  }

  async findByIdForAdmin(id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    return ok(notification);
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.userId !== userId) {
      throw new ForbiddenException('You can read only your notifications');
    }
    return ok(
      await this.prisma.notification.update({
        where: { id },
        data: { readAt: notification.readAt ?? new Date() },
      }),
      'Notification marked as read',
    );
  }

  async createTemplate(dto: CreateNotificationTemplateDto) {
    return ok(
      await this.prisma.notificationTemplate.create({
        data: {
          code: dto.code,
          name: dto.name,
          channel: dto.channel,
          subject: dto.subject,
          content: dto.content,
          variables: dto.variables ?? [],
          isActive: dto.isActive ?? true,
        },
      }),
      'Notification template created',
    );
  }

  async findTemplates() {
    return ok(
      await this.prisma.notificationTemplate.findMany({
        orderBy: { createdAt: 'desc' },
      }),
      'Notification templates fetched',
    );
  }

  async updateTemplate(id: string, dto: UpdateNotificationTemplateDto) {
    return ok(
      await this.prisma.notificationTemplate.update({
        where: { id },
        data: {
          code: dto.code,
          name: dto.name,
          channel: dto.channel,
          subject: dto.subject,
          content: dto.content,
          variables: dto.variables,
          isActive: dto.isActive,
        },
      }),
      'Notification template updated',
    );
  }

  async create(input: NotificationInput) {
    const type = input.type ?? NotificationType.IN_APP;
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type,
        title: input.title,
        message: input.message,
        metadata: input.metadata as Prisma.InputJsonValue,
        status:
          type === NotificationType.IN_APP
            ? NotificationStatus.SENT
            : NotificationStatus.PENDING,
        sentAt: type === NotificationType.IN_APP ? new Date() : undefined,
      },
    });

    if (type === NotificationType.IN_APP) return notification;

    try {
      const result = await this.dispatch(type, {
        title: input.title,
        message: input.message,
        metadata: input.metadata,
      });
      return this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.SENT,
          provider: result.provider,
          providerMessageId: result.providerMessageId,
          sentAt: new Date(),
        },
      });
    } catch (error) {
      return this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.FAILED,
          metadata: {
            ...(input.metadata ?? {}),
            error: error instanceof Error ? error.message : 'Provider failed',
          },
        },
      });
    }
  }

  renderTemplate(content: string, variables: RenderVariables) {
    return content.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
      const value = variables[key];
      return value === null || value === undefined ? '' : String(value);
    });
  }

  async createFromTemplate(
    userId: string,
    code: string,
    variables: RenderVariables,
    fallback: { title: string; message: string; type?: NotificationType },
  ) {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { code },
    });
    if (!template?.isActive) {
      return this.create({
        userId,
        type: fallback.type,
        title: fallback.title,
        message: fallback.message,
        metadata: { code, variables },
      });
    }
    return this.create({
      userId,
      type: template.channel,
      title: template.subject ?? fallback.title,
      message: this.renderTemplate(template.content, variables),
      metadata: { code, variables },
    });
  }

  async notifyOtpSent(phone: string) {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) return null;
    return this.safeCreate({
      userId: user.id,
      type: NotificationType.SMS,
      title: 'OTP sent',
      message: 'Your RedKS login OTP has been sent.',
      metadata: { event: 'AUTH_OTP_SENT', phone },
    });
  }

  async notifyLoginSuccess(userId: string) {
    return this.safeCreate({
      userId,
      title: 'Login successful',
      message: 'You have logged in to RedKS successfully.',
      metadata: { event: 'AUTH_LOGIN_SUCCESS' },
    });
  }

  async notifyOrderPlaced(order: {
    id: string;
    orderNumber: string;
    customerId: string;
  }) {
    return this.safeCreate({
      userId: order.customerId,
      title: 'Order placed',
      message: `Order ${order.orderNumber} has been placed successfully.`,
      metadata: { event: 'ORDER_PLACED', orderId: order.id },
    });
  }

  async notifyOrderAccepted(order: {
    id: string;
    orderNumber: string;
    customerId: string;
  }) {
    return this.safeCreate({
      userId: order.customerId,
      title: 'Order accepted',
      message: `Your order ${order.orderNumber} has been accepted by the shop.`,
      metadata: { event: 'ORDER_ACCEPTED', orderId: order.id },
    });
  }

  async notifyRiderAssigned(order: {
    id: string;
    orderNumber: string;
    customerId: string;
    rider?: { userId: string } | null;
  }) {
    const notifications = [
      this.safeCreate({
        userId: order.customerId,
        title: 'Rider assigned',
        message: `A rider has been assigned for order ${order.orderNumber}.`,
        metadata: { event: 'RIDER_ASSIGNED', orderId: order.id },
      }),
    ];
    if (order.rider?.userId) {
      notifications.push(
        this.safeCreate({
          userId: order.rider.userId,
          title: 'Delivery assigned',
          message: `You have been assigned order ${order.orderNumber}.`,
          metadata: { event: 'RIDER_ASSIGNED', orderId: order.id },
        }),
      );
    }
    return Promise.all(notifications);
  }

  async notifyRiderArrived(order: { id: string; orderNumber: string; customerId: string }) {
    return this.safeCreate({
      userId: order.customerId,
      title: 'Rider on the way',
      message: `Your order ${order.orderNumber} is out for delivery.`,
      metadata: { event: 'RIDER_ARRIVED', orderId: order.id },
    });
  }

  async notifyOrderDelivered(order: {
    id: string;
    orderNumber: string;
    customerId: string;
  }) {
    return this.safeCreate({
      userId: order.customerId,
      title: 'Order delivered',
      message: `Order ${order.orderNumber} has been delivered.`,
      metadata: { event: 'ORDER_DELIVERED', orderId: order.id },
    });
  }

  async notifyOrderCancelled(order: {
    id: string;
    orderNumber: string;
    customerId: string;
  }) {
    return this.safeCreate({
      userId: order.customerId,
      title: 'Order cancelled',
      message: `Order ${order.orderNumber} has been cancelled.`,
      metadata: { event: 'ORDER_CANCELLED', orderId: order.id },
    });
  }

  async notifyPaymentSuccessful(userId: string, orderId: string) {
    return this.safeCreate({
      userId,
      title: 'Payment successful',
      message: 'Your RedKS payment was successful.',
      metadata: { event: 'PAYMENT_SUCCESSFUL', orderId },
    });
  }

  async notifyPaymentFailed(userId: string, orderId: string) {
    return this.safeCreate({
      userId,
      title: 'Payment failed',
      message: 'Your RedKS payment failed. Please try again.',
      metadata: { event: 'PAYMENT_FAILED', orderId },
    });
  }

  async notifyRefundProcessed(userId: string, orderId: string) {
    return this.safeCreate({
      userId,
      title: 'Refund processed',
      message: 'Your refund has been processed.',
      metadata: { event: 'REFUND_PROCESSED', orderId },
    });
  }

  async notifyShopApproved(userId: string, shopId: string) {
    return this.safeCreate({
      userId,
      title: 'Shop approved',
      message: 'Your shop has been approved on RedKS.',
      metadata: { event: 'SHOP_APPROVED', shopId },
    });
  }

  async notifyShopRejected(userId: string, shopId: string, reason?: string | null) {
    return this.safeCreate({
      userId,
      title: 'Shop rejected',
      message: reason
        ? `Your shop was rejected: ${reason}`
        : 'Your shop was rejected by RedKS.',
      metadata: { event: 'SHOP_REJECTED', shopId, reason },
    });
  }

  async notifyRiderApproved(userId: string, riderId: string) {
    return this.safeCreate({
      userId,
      title: 'Rider approved',
      message: 'Your rider profile has been approved on RedKS.',
      metadata: { event: 'RIDER_APPROVED', riderId },
    });
  }

  async notifyRiderRejected(userId: string, riderId: string, reason?: string | null) {
    return this.safeCreate({
      userId,
      title: 'Rider rejected',
      message: reason
        ? `Your rider profile was rejected: ${reason}`
        : 'Your rider profile was rejected by RedKS.',
      metadata: { event: 'RIDER_REJECTED', riderId, reason },
    });
  }

  async notifyNewShopReview(userId: string, shopId: string, reviewId: string) {
    return this.safeCreate({
      userId,
      title: 'New shop review',
      message: 'Your shop received a new customer review.',
      metadata: { event: 'NEW_SHOP_REVIEW', shopId, reviewId },
    });
  }

  async notifyNewRiderReview(userId: string, riderId: string, reviewId: string) {
    return this.safeCreate({
      userId,
      title: 'New rider review',
      message: 'You received a new delivery review.',
      metadata: { event: 'NEW_RIDER_REVIEW', riderId, reviewId },
    });
  }

  async notifyReviewReply(userId: string, reviewId: string) {
    return this.safeCreate({
      userId,
      title: 'Review reply',
      message: 'A shop replied to your review.',
      metadata: { event: 'REVIEW_REPLY', reviewId },
    });
  }

  canAdmin(user: AuthUser) {
    return (
      user.roles.includes(UserRole.ADMIN) ||
      user.roles.includes(UserRole.SUPER_ADMIN)
    );
  }

  private async safeCreate(input: NotificationInput) {
    try {
      return await this.create(input);
    } catch (error) {
      console.error('[notifications] failed to create notification', error);
      return null;
    }
  }

  private dispatch(type: NotificationType, message: {
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }): Promise<ProviderResult> {
    switch (type) {
      case NotificationType.SMS:
        return this.provider.sendSMS(message);
      case NotificationType.WHATSAPP:
        return this.provider.sendWhatsApp(message);
      case NotificationType.PUSH:
        return this.provider.sendPush(message);
      case NotificationType.EMAIL:
        return this.provider.sendEmail(message);
      case NotificationType.IN_APP:
      default:
        return Promise.resolve({ provider: 'database' });
    }
  }
}
