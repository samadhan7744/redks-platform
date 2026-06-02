import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ZonesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(cityId?: string) {
    return this.prisma.zone.findMany({
      where: { cityId, isActive: true },
      include: { city: true },
      orderBy: { name: 'asc' },
    });
  }
}
