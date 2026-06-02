import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CitiesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.city.findMany({
      where: { isActive: true },
      include: { zones: { where: { isActive: true } } },
      orderBy: { name: 'asc' },
    });
  }
}
