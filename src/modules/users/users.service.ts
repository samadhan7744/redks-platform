import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ok, paginated, paginationParams } from '../../common/utils/api-response.util';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: AdminUserQueryDto) {
    const { page, limit, skip, take } = paginationParams(query.page, query.limit);
    const where = {
      status: query.status,
      roles: query.role ? { has: query.role } : undefined,
      OR: query.search
        ? [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            { phone: { contains: query.search } },
            { email: { contains: query.search, mode: 'insensitive' as const } },
          ]
        : undefined,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          phone: true,
          email: true,
          name: true,
          roles: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginated(data, total, page, limit);
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { addresses: true, riderProfile: true, ownedShops: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return ok(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id },
      data: dto,
    });
    return ok(user, 'User updated');
  }

  async adminUpdate(id: string, dto: AdminUpdateUserDto) {
    await this.ensureExists(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: dto,
    });
    return ok(user, 'User updated');
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      throw new NotFoundException('User not found');
    }
  }
}
