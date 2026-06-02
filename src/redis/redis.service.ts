import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(configService: ConfigService) {
    this.client = new Redis(configService.get<string>('REDIS_URL', 'redis://localhost:6379'), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }

  async setOtp(phone: string, otp: string, ttlSeconds: number) {
    await this.client.set(this.otpKey(phone), otp, 'EX', ttlSeconds);
  }

  async getOtp(phone: string) {
    return this.client.get(this.otpKey(phone));
  }

  async deleteOtp(phone: string) {
    await this.client.del(this.otpKey(phone));
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  private otpKey(phone: string) {
    return `auth:otp:${phone}`;
  }
}
