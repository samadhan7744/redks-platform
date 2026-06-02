import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  findForShop(shopId: string) {
    return this.prisma.review.findMany({
      where: { shopId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateReviewDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, customerId: userId },
    });

    if (!order) {
      throw new NotFoundException('Order not found for this customer');
    }

    return this.prisma.review.create({
      data: {
        orderId: dto.orderId,
        shopId: order.shopId,
        userId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });
  }
}
