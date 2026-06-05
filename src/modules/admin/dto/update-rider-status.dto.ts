import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RiderStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateRiderStatusDto {
  @ApiProperty({
    enum: [
      RiderStatus.APPROVED,
      RiderStatus.REJECTED,
      RiderStatus.SUSPENDED,
      RiderStatus.CHANGES_REQUESTED,
      RiderStatus.UNDER_REVIEW,
    ],
  })
  @IsEnum(RiderStatus)
  status: RiderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}
