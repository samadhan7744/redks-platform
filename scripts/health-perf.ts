import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const databaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://redks:redks_password@localhost:5432/redks?schema=public';
const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const redis = new Redis(redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
});

async function time<T>(label: string, fn: () => Promise<T>) {
  const start = performance.now();
  const result = await fn();
  const ms = performance.now() - start;
  console.log(`${label}: ${ms.toFixed(2)}ms`);
  return result;
}

async function main() {
  console.log(`DATABASE_URL host: ${new URL(databaseUrl).host}`);
  console.log(`REDIS_URL host: ${new URL(redisUrl).host}`);

  await time('database SELECT 1', () => prisma.$queryRaw`SELECT 1`);
  await time('redis connect', () => redis.connect());
  await time('redis PING', () => redis.ping());
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await redis.quit().catch(() => undefined);
  });
