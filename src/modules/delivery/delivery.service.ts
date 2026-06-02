import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  async findForRiderUser(userId: string) {
    const rider = await this.prisma.riderProfile.findUnique({ where: { userId } });
    return this.prisma.delivery.findMany({
      where: { riderId: rider?.id ?? 'none' },
      include: { order: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findAll() {
    return this.prisma.delivery.findMany({
      include: { order: true, rider: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
