import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DeliveryStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
  RiderAssignmentAttemptStatus,
  RiderAvailabilityStatus,
  RiderStatus,
  UserRole,
} from '@prisma/client';
import { AuthUser } from '../../common/types/auth-user.type';
import {
  ok,
  paginated,
  paginationParams,
} from '../../common/utils/api-response.util';
import { AssignmentService } from '../assignment/assignment.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { OrderCalculationService } from './order-calculation.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: OrderCalculationService,
    private readonly assignmentService: AssignmentService,
  ) {}

  async create(customerId: string, dto: CreateOrderDto) {
    const productIds = [...new Set(dto.items.map((item) => item.productId))];
    const [products, shop, address] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          id: { in: productIds },
          shopId: dto.shopId,
          status: ProductStatus.ACTIVE,
        },
      }),
      this.prisma.shop.findUnique({
        where: { id: dto.shopId },
        include: { zone: true },
      }),
      this.prisma.address.findFirst({
        where: { id: dto.addressId, userId: customerId },
      }),
    ]);

    if (!shop) throw new NotFoundException('Shop not found');
    if (!address)
      throw new BadRequestException('Address does not belong to this customer');
    if (products.length !== productIds.length) {
      throw new BadRequestException(
        'One or more products are invalid for this shop',
      );
    }

    const orderItems = dto.items.map((item) => {
      const product = products.find(
        (candidate) => candidate.id === item.productId,
      );
      if (!product || product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for product ${item.productId}`,
        );
      }

      const unitPrice = Number(product.price);
      return {
        productId: product.id,
        name: product.name,
        quantity: item.quantity,
        unitPrice,
        lineTotal: unitPrice * item.quantity,
      };
    });

    const totals = this.calculator.calculate({
      items: orderItems,
      deliveryFee: Number(shop.zone.baseDeliveryFee ?? 0),
      platformFee: 0,
      discountAmount: 0,
      commissionPercent: Number(shop.defaultCommissionPercent),
    });

    return ok(
      await this.prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: {
            orderNumber: this.generateOrderNumber(),
            customerId,
            shopId: dto.shopId,
            addressId: dto.addressId,
            paymentMethod: dto.paymentMethod ?? PaymentMethod.COD,
            paymentStatus:
              (dto.paymentMethod ?? PaymentMethod.COD) === PaymentMethod.COD
                ? PaymentStatus.COD_PENDING
                : PaymentStatus.INITIATED,
            subtotal: totals.subtotal,
            deliveryFee: totals.deliveryFee,
            platformFee: totals.platformFee,
            discountAmount: totals.discountAmount,
            totalAmount: totals.totalAmount,
            commissionPercent: totals.commissionPercent,
            commissionAmount: totals.commissionAmount,
            customerNote: dto.customerNote,
            items: { create: orderItems },
            delivery: { create: { status: DeliveryStatus.PENDING } },
            payment: {
              create: {
                method: dto.paymentMethod ?? PaymentMethod.COD,
                status:
                  (dto.paymentMethod ?? PaymentMethod.COD) === PaymentMethod.COD
                    ? PaymentStatus.COD_PENDING
                    : PaymentStatus.INITIATED,
                amount: totals.totalAmount,
              },
            },
          },
          include: this.orderInclude(),
        });

        for (const item of dto.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }

        return order;
      }),
      'Order created and stock reserved',
    );
  }

  async findForCustomer(customerId: string) {
    return ok(
      await this.prisma.order.findMany({
        where: { customerId },
        include: this.orderInclude(),
        orderBy: { placedAt: 'desc' },
      }),
    );
  }

  async findForShopOwner(ownerId: string) {
    const shop = await this.findOwnerShop(ownerId);
    return ok(
      await this.prisma.order.findMany({
        where: { shopId: shop.id },
        include: this.orderInclude(),
        orderBy: { placedAt: 'desc' },
      }),
    );
  }

  async findAll(query: OrderQueryDto) {
    const { page, limit, skip, take } = paginationParams(
      query.page,
      query.limit,
    );
    const where = {
      customerId: query.customerId,
      shopId: query.shopId,
      riderId: query.riderId,
      status: query.status,
      paymentMethod: query.paymentMethod,
      paymentStatus: query.paymentStatus,
      OR: query.search
        ? [
            {
              orderNumber: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip,
        take,
        include: this.orderInclude(),
        orderBy: { placedAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);
    return paginated(data, total, page, limit);
  }

  async findById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: this.orderInclude(),
    });
    if (!order) throw new NotFoundException('Order not found');
    return ok(order);
  }

  async findForActor(user: AuthUser, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: this.orderInclude(),
    });
    if (!order) throw new NotFoundException('Order not found');
    const adminRoles: UserRole[] = [UserRole.ADMIN, UserRole.SUPER_ADMIN];
    if (user.roles.some((role) => adminRoles.includes(role))) return ok(order);
    if (order.customerId === user.sub) return ok(order);
    if (
      user.roles.includes(UserRole.SHOP_OWNER) &&
      order.shop.ownerId === user.sub
    )
      return ok(order);
    if (user.roles.includes(UserRole.RIDER)) {
      const rider = await this.prisma.riderProfile.findUnique({
        where: { userId: user.sub },
      });
      if (rider && order.riderId === rider.id) return ok(order);
    }
    throw new ForbiddenException('You cannot access this order');
  }

  async cancelCustomerOrder(
    user: AuthUser,
    orderId: string,
    dto: CancelOrderDto,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (
      !user.roles.includes(UserRole.ADMIN) &&
      !user.roles.includes(UserRole.SUPER_ADMIN) &&
      order.customerId !== user.sub
    ) {
      throw new ForbiddenException('You can only cancel your own orders');
    }
    const cancellableStatuses: OrderStatus[] = [
      OrderStatus.PLACED,
      OrderStatus.CONFIRMED,
      OrderStatus.ACCEPTED,
    ];
    if (!cancellableStatuses.includes(order.status)) {
      throw new BadRequestException('Order cannot be cancelled at this stage');
    }

    return ok(
      await this.prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
        return tx.order.update({
          where: { id: orderId },
          data: {
            status: OrderStatus.CANCELLED,
            cancellationReason: dto.reason ?? 'Cancelled by customer',
            delivery: { update: { status: DeliveryStatus.CANCELLED } },
          },
          include: this.orderInclude(),
        });
      }),
      'Order cancelled and stock restored',
    );
  }

  async shopAccept(user: AuthUser, orderId: string) {
    const order = await this.assertShopOrder(user, orderId);
    if (order.status !== OrderStatus.PLACED)
      throw new BadRequestException('Only placed orders can be accepted');
    return ok(
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.ACCEPTED },
        include: this.orderInclude(),
      }),
      'Order accepted',
    );
  }

  async shopReject(user: AuthUser, orderId: string, reason: string) {
    const order = await this.assertShopOrder(user, orderId);
    const rejectableStatuses: OrderStatus[] = [
      OrderStatus.PLACED,
      OrderStatus.ACCEPTED,
    ];
    if (!rejectableStatuses.includes(order.status)) {
      throw new BadRequestException('Order cannot be rejected at this stage');
    }
    return ok(
      await this.prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
        return tx.order.update({
          where: { id: orderId },
          data: {
            status: OrderStatus.REJECTED,
            cancellationReason: reason,
            delivery: { update: { status: DeliveryStatus.CANCELLED } },
          },
          include: this.orderInclude(),
        });
      }),
      'Order rejected and stock restored',
    );
  }

  async shopReady(user: AuthUser, orderId: string) {
    const order = await this.assertShopOrder(user, orderId);
    const readyStatuses: OrderStatus[] = [
      OrderStatus.ACCEPTED,
      OrderStatus.PACKING,
      OrderStatus.PACKED,
    ];
    if (!readyStatuses.includes(order.status)) {
      throw new BadRequestException(
        'Order must be accepted before it can be marked ready',
      );
    }
    const readyOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.READY_FOR_PICKUP,
        delivery: { update: { status: DeliveryStatus.SEARCHING_RIDER } },
      },
      include: this.orderInclude(),
    });
    const assignedOrder = await this.assignmentService.assignBestRider(orderId);
    return ok(
      assignedOrder ?? readyOrder,
      assignedOrder
        ? 'Order ready for pickup and rider assigned'
        : 'Order ready for pickup; rider assignment pending',
    );
  }

  async findAvailableForRider(userId: string) {
    const rider = await this.findApprovedRider(userId);
    return ok(
      await this.prisma.order.findMany({
        where: {
          riderId: null,
          status: OrderStatus.READY_FOR_PICKUP,
          shop: { zoneId: rider.zoneId ?? undefined, cityId: rider.cityId },
        },
        include: this.orderInclude(),
        orderBy: { placedAt: 'asc' },
      }),
    );
  }

  async findActiveForRider(userId: string) {
    const rider = await this.findApprovedRider(userId);
    return ok(
      await this.prisma.order.findMany({
        where: {
          riderId: rider.id,
          status: {
            in: [
              OrderStatus.ASSIGNED,
              OrderStatus.PICKED_UP,
              OrderStatus.OUT_FOR_DELIVERY,
            ],
          },
        },
        include: this.orderInclude(),
        orderBy: { assignedAt: 'asc' },
      }),
    );
  }

  async riderAccept(userId: string, orderId: string) {
    const rider = await this.findApprovedRider(userId);
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { shop: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.riderId) throw new BadRequestException('Order already assigned');
    if (order.status !== OrderStatus.READY_FOR_PICKUP)
      throw new BadRequestException('Order is not available');
    if (
      order.shop.cityId !== rider.cityId ||
      (rider.zoneId && order.shop.zoneId !== rider.zoneId)
    ) {
      throw new ForbiddenException('Order is outside your delivery zone');
    }
    const activeOrderCount = await this.assignmentService.activeOrderCount(
      rider.id,
    );
    if (activeOrderCount >= 3) {
      throw new BadRequestException('Rider has maximum active orders');
    }
    const nextAvailabilityStatus =
      activeOrderCount + 1 >= 3
        ? RiderAvailabilityStatus.BUSY
        : RiderAvailabilityStatus.ONLINE;
    return ok(
      await this.prisma.$transaction(async (tx) => {
        const assigned = await tx.order.updateMany({
          where: {
            id: orderId,
            riderId: null,
            status: OrderStatus.READY_FOR_PICKUP,
          },
          data: {
            riderId: rider.id,
            status: OrderStatus.ASSIGNED,
            assignedAt: new Date(),
          },
        });
        if (assigned.count !== 1) {
          throw new BadRequestException('Order already assigned');
        }
        await tx.riderProfile.update({
          where: { id: rider.id },
          data: { availabilityStatus: nextAvailabilityStatus },
        });
        await tx.riderAssignmentAttempt.create({
          data: {
            orderId,
            riderId: rider.id,
            status: RiderAssignmentAttemptStatus.ACCEPTED,
          },
        });
        await tx.delivery.upsert({
          where: { orderId },
          update: {
            riderId: rider.id,
            status: DeliveryStatus.ASSIGNED,
            assignedAt: new Date(),
          },
          create: {
            orderId,
            riderId: rider.id,
            status: DeliveryStatus.ASSIGNED,
            assignedAt: new Date(),
          },
        });
        return tx.order.findUnique({
          where: { id: orderId },
          include: this.orderInclude(),
        });
      }),
      'Order assigned to rider',
    );
  }

  async riderReject(
    userId: string,
    orderId: string,
    reason = 'Rejected by rider',
  ) {
    const { rider, order } = await this.assertAssignedRiderOrder(
      userId,
      orderId,
    );
    if (order.status !== OrderStatus.ASSIGNED) {
      throw new BadRequestException(
        'Only assigned orders can be rejected by rider',
      );
    }

    await this.assignmentService.markLatestAttemptRejected(
      orderId,
      rider.id,
      reason,
    );
    const hasOtherActiveOrders =
      await this.assignmentService.hasOtherActiveOrders(rider.id, orderId);
    await this.prisma.$transaction(async (tx) => {
      await tx.riderProfile.update({
        where: { id: rider.id },
        data: {
          availabilityStatus: hasOtherActiveOrders
            ? RiderAvailabilityStatus.BUSY
            : RiderAvailabilityStatus.ONLINE,
        },
      });
      await tx.order.update({
        where: { id: orderId },
        data: {
          riderId: null,
          status: OrderStatus.READY_FOR_PICKUP,
          delivery: {
            update: {
              riderId: null,
              status: DeliveryStatus.SEARCHING_RIDER,
            },
          },
        },
      });
    });
    const reassigned =
      await this.assignmentService.reassignAfterRejection(orderId);
    const latest = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: this.orderInclude(),
    });
    return ok(
      reassigned ?? latest,
      reassigned
        ? 'Order reassigned to next rider'
        : 'Rider rejected; reassignment pending',
    );
  }

  async riderPickup(userId: string, orderId: string) {
    const { rider, order } = await this.assertAssignedRiderOrder(
      userId,
      orderId,
    );
    if (order.status !== OrderStatus.ASSIGNED)
      throw new BadRequestException('Order is not assigned for pickup');
    return ok(
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.OUT_FOR_DELIVERY,
          delivery: {
            update: {
              status: DeliveryStatus.IN_TRANSIT,
              pickedUpAt: new Date(),
            },
          },
          riderId: rider.id,
        },
        include: this.orderInclude(),
      }),
      'Order picked up',
    );
  }

  async riderDeliver(userId: string, orderId: string) {
    const { rider, order } = await this.assertAssignedRiderOrder(
      userId,
      orderId,
    );
    if (order.status !== OrderStatus.OUT_FOR_DELIVERY)
      throw new BadRequestException('Order is not out for delivery');
    const otherActiveOrderCount =
      await this.assignmentService.activeOrderCount(rider.id, orderId);
    return ok(
      await this.prisma.$transaction(async (tx) => {
        await tx.riderProfile.update({
          where: { id: rider.id },
          data: {
            availabilityStatus:
              otherActiveOrderCount > 0
                ? RiderAvailabilityStatus.BUSY
                : RiderAvailabilityStatus.ONLINE,
            lastAvailableAt:
              otherActiveOrderCount > 0 ? undefined : new Date(),
          },
        });
        return tx.order.update({
          where: { id: orderId },
          data: {
            status: OrderStatus.DELIVERED,
            deliveredAt: new Date(),
            paymentStatus:
              order.paymentMethod === PaymentMethod.COD
                ? PaymentStatus.COD_COLLECTED
                : order.paymentStatus,
            delivery: {
              update: {
                status: DeliveryStatus.DELIVERED,
                deliveredAt: new Date(),
              },
            },
            payment:
              order.paymentMethod === PaymentMethod.COD
                ? { update: { status: PaymentStatus.COD_COLLECTED } }
                : undefined,
          },
          include: this.orderInclude(),
        });
      }),
      'Order delivered',
    );
  }

  private async assertShopOrder(user: AuthUser, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, shop: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (
      !user.roles.includes(UserRole.ADMIN) &&
      !user.roles.includes(UserRole.SUPER_ADMIN) &&
      order.shop.ownerId !== user.sub
    ) {
      throw new ForbiddenException('You can only manage your own shop orders');
    }
    return order;
  }

  private async findOwnerShop(ownerId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { ownerId },
      select: { id: true },
    });
    if (!shop) throw new NotFoundException('Shop not found for this owner');
    return shop;
  }

  private async findApprovedRider(userId: string) {
    const rider = await this.prisma.riderProfile.findUnique({
      where: { userId },
    });
    if (!rider || rider.status !== RiderStatus.APPROVED) {
      throw new ForbiddenException('Approved rider profile required');
    }
    return rider;
  }

  private async assertAssignedRiderOrder(userId: string, orderId: string) {
    const rider = await this.findApprovedRider(userId);
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.riderId !== rider.id)
      throw new ForbiddenException('You can only update assigned orders');
    return { rider, order };
  }

  private orderInclude() {
    return {
      customer: true,
      shop: true,
      rider: { include: { user: true } },
      address: true,
      items: true,
      delivery: true,
      payment: true,
    };
  }

  private generateOrderNumber() {
    return `RKS${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }
}
