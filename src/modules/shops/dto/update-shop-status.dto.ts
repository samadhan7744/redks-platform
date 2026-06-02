import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShopStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateShopStatusDto {
  @ApiProperty({ enum: [ShopStatus.APPROVED, ShopStatus.REJECTED, ShopStatus.SUSPENDED] })
  @IsEnum(ShopStatus)
  status: ShopStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
