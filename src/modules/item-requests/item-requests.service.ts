import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateItemRequestDto } from './dto/create-item-request.dto';

@Injectable()
export class ItemRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  create(customerId: string, dto: CreateItemRequestDto) {
    return this.prisma.itemRequest.create({
      data: { ...dto, customerId },
    });
  }

  findForCustomer(customerId: string) {
    return this.prisma.itemRequest.findMany({
      where: { customerId },
      include: { city: true, zone: true, shop: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findAll() {
    return this.prisma.itemRequest.findMany({
      include: { customer: true, city: true, zone: true, shop: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
