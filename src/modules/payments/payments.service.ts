import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.payment.findMany({ include: { order: true }, orderBy: { createdAt: 'desc' } });
  }

  async findById(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id }, include: { order: true } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }
}
