import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RefundStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateRefundDto {
  @ApiProperty({ enum: RefundStatus })
  @IsEnum(RefundStatus)
  status: RefundStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  providerRefundId?: string;
}
