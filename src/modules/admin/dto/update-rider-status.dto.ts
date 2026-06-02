import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RiderStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateRiderStatusDto {
  @ApiProperty({ enum: [RiderStatus.APPROVED, RiderStatus.REJECTED, RiderStatus.SUSPENDED] })
  @IsEnum(RiderStatus)
  status: RiderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
