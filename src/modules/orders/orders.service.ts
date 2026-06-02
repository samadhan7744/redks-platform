import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(customerId: string, dto: CreateOrderDto) {
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: dto.items.map((item) => item.productId) },
        shopId: dto.shopId,
      },
    });

    if (products.length !== dto.items.length) {
      throw new BadRequestException('One or more products are invalid for this shop');
    }

    const shop = await this.prisma.shop.findUnique({ where: { id: dto.shopId } });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    const orderItems = dto.items.map((item) => {
      const product = products.find((candidate) => candidate.id === item.productId);

      if (!product || product.stock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for product ${item.productId}`);
      }

      const unitPrice = Number(product.price);
      const lineTotal = unitPrice * item.quantity;

      return {
        productId: product.id,
        name: product.name,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
      };
    });

    const subtotal = orderItems.reduce((total, item) => total + item.lineTotal, 0);
    const deliveryFee = 0;
    const totalAmount = subtotal + deliveryFee;
    const commissionPercent = Number(shop.defaultCommissionPercent);
    const commissionAmount = (subtotal * commissionPercent) / 100;

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber: this.generateOrderNumber(),
          customerId,
          shopId: dto.shopId,
          addressId: dto.addressId,
          paymentMethod: dto.paymentMethod ?? PaymentMethod.COD,
          subtotal,
          deliveryFee,
          totalAmount,
          commissionPercent,
          commissionAmount,
          customerNote: dto.customerNote,
          items: { create: orderItems },
          delivery: { create: {} },
          payment: {
            create: {
              method: dto.paymentMethod ?? PaymentMethod.COD,
              amount: totalAmount,
            },
          },
        },
        include: { items: true, delivery: true, payment: true },
      });

      for (const item of dto.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return order;
    });
  }

  findForCustomer(customerId: string) {
    return this.prisma.order.findMany({
      where: { customerId },
      include: { items: true, shop: true, delivery: true, payment: true },
      orderBy: { placedAt: 'desc' },
    });
  }

  findAll() {
    return this.prisma.order.findMany({
      include: { customer: true, shop: true, items: true, delivery: true, payment: true },
      orderBy: { placedAt: 'desc' },
    });
  }

  async findById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { customer: true, shop: true, items: true, delivery: true, payment: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  private generateOrderNumber() {
    return `RKS${Date.now()}`;
  }
}
