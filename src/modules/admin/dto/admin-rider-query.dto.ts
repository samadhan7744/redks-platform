import { ApiPropertyOptional } from '@nestjs/swagger';
import { RiderAvailabilityStatus, RiderStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class AdminRiderQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: RiderStatus })
  @IsOptional()
  @IsEnum(RiderStatus)
  status?: RiderStatus;

  @ApiPropertyOptional({ enum: RiderAvailabilityStatus })
  @IsOptional()
  @IsEnum(RiderAvailabilityStatus)
  availabilityStatus?: RiderAvailabilityStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  zoneId?: string;
}
