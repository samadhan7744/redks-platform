import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  findForUser(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      include: { city: true, zone: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(userId: string, dto: CreateAddressDto) {
    return this.prisma.address.create({
      data: { ...dto, userId },
    });
  }
}
