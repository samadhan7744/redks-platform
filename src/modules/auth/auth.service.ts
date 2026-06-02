import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async requestOtp(dto: RequestOtpDto) {
    const otp = this.configService.get<string>('OTP_DEV_CODE', '123456');
    const ttlSeconds = this.configService.get<number>('OTP_TTL_SECONDS', 300);

    await this.redis.setOtp(dto.phone, otp, ttlSeconds);

    return {
      message: 'OTP generated. SMS provider integration will be added in a later phase.',
      expiresInSeconds: ttlSeconds,
      devOtp: this.configService.get('NODE_ENV') === 'production' ? undefined : otp,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const expectedOtp = await this.redis.getOtp(dto.phone);

    if (!expectedOtp || expectedOtp !== dto.otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const user = await this.prisma.user.upsert({
      where: { phone: dto.phone },
      update: { lastLoginAt: new Date(), status: 'ACTIVE' },
      create: {
        phone: dto.phone,
        roles: [Role.CUSTOMER],
        status: 'ACTIVE',
        lastLoginAt: new Date(),
      },
    });

    await this.redis.deleteOtp(dto.phone);

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      phone: user.phone,
      roles: user.roles,
    });

    return {
      accessToken,
      user,
    };
  }
}
