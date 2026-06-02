import { BadRequestException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { createHash, randomInt } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { ok } from '../../common/utils/api-response.util';
import { RefreshTokenDto } from './dto/refresh-token.dto';
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
    const otp =
      this.configService.get('NODE_ENV') === 'production'
        ? randomInt(100000, 999999).toString()
        : this.configService.get<string>('OTP_DEV_CODE', '123456');
    const ttlSeconds = this.configService.get<number>('OTP_TTL_SECONDS', 300);

    await this.redis.setOtp(dto.phone, this.hashOtp(dto.phone, otp), ttlSeconds);
    await this.redis.resetOtpAttempts(dto.phone, ttlSeconds);

    return {
      success: true,
      message: 'OTP generated. SMS provider integration will be added in a later phase.',
      expiresInSeconds: ttlSeconds,
      devOtp: this.configService.get('NODE_ENV') === 'production' ? undefined : otp,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const ttlSeconds = this.configService.get<number>('OTP_TTL_SECONDS', 300);
    const maxAttempts = this.configService.get<number>('OTP_MAX_ATTEMPTS', 5);
    const attempts = await this.redis.incrementOtpAttempts(dto.phone, ttlSeconds);

    if (attempts > maxAttempts) {
      throw new HttpException('Too many OTP verification attempts', HttpStatus.TOO_MANY_REQUESTS);
    }

    const expectedOtp = await this.redis.getOtp(dto.phone);

    if (!expectedOtp || expectedOtp !== this.hashOtp(dto.phone, dto.otp)) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const user = await this.prisma.user.upsert({
      where: { phone: dto.phone },
      update: { lastLoginAt: new Date(), status: 'ACTIVE' },
      create: {
        phone: dto.phone,
        roles: [UserRole.CUSTOMER],
        status: 'ACTIVE',
        lastLoginAt: new Date(),
      },
    });

    await this.redis.deleteOtp(dto.phone);

    const payload = {
      sub: user.id,
      phone: user.phone,
      roles: user.roles,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.jwtService.signAsync(
      { ...payload, tokenType: 'refresh' },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '30d') as JwtSignOptions['expiresIn'],
      },
    );

    return ok({
      accessToken,
      refreshToken,
      refreshTokenPlaceholder: 'Persist hashed refresh tokens and rotation metadata in a later auth phase.',
      user,
    }, 'OTP verified');
  }

  async refreshToken(dto: RefreshTokenDto) {
    try {
      const payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
      });

      if (payload.tokenType !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.prisma.user.findUniqueOrThrow({ where: { id: payload.sub } });
      const accessToken = await this.jwtService.signAsync({
        sub: user.id,
        phone: user.phone,
        roles: user.roles,
      });

      return ok({ accessToken }, 'Access token refreshed');
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { addresses: true, ownedShops: true, riderProfile: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return ok(user);
  }

  private hashOtp(phone: string, otp: string) {
    const secret = this.configService.get<string>('JWT_SECRET', 'dev-secret');
    return createHash('sha256').update(`${phone}:${otp}:${secret}`).digest('hex');
  }
}
