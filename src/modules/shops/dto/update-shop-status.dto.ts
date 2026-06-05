import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShopStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateShopStatusDto {
  @ApiProperty({
    enum: [
      ShopStatus.SUBMITTED,
      ShopStatus.UNDER_REVIEW,
      ShopStatus.APPROVED,
      ShopStatus.REJECTED,
      ShopStatus.SUSPENDED,
      ShopStatus.CHANGES_REQUESTED,
    ],
  })
  @IsEnum(ShopStatus)
  status: ShopStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}
