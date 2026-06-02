import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async check() {
    const [database, redis] = await Promise.allSettled([
      this.prisma.$queryRaw`SELECT 1`,
      this.redis.ping(),
    ]);

    return {
      status: database.status === 'fulfilled' && redis.status === 'fulfilled' ? 'ok' : 'degraded',
      service: 'redks-backend',
      timestamp: new Date().toISOString(),
      checks: {
        database: database.status === 'fulfilled' ? 'ok' : 'error',
        redis: redis.status === 'fulfilled' ? 'ok' : 'error',
      },
    };
  }
}
