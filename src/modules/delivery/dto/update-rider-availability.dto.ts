import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RiderAvailabilityStatus } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';

export class UpdateRiderAvailabilityDto {
  @ApiProperty({ enum: RiderAvailabilityStatus })
  @IsEnum(RiderAvailabilityStatus)
  availabilityStatus: RiderAvailabilityStatus;

  @ApiPropertyOptional({ example: 12.971599 })
  @IsOptional()
  @IsNumber()
  currentLatitude?: number;

  @ApiPropertyOptional({ example: 77.594566 })
  @IsOptional()
  @IsNumber()
  currentLongitude?: number;
}
