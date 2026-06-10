import { BadRequestException } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export type AnalyticsGroupBy = 'day' | 'week' | 'month';

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiPropertyOptional({ enum: ['day', 'week', 'month'], default: 'day' })
  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  groupBy?: AnalyticsGroupBy = 'day';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}

export function assertValidDateRange(query: AnalyticsQueryDto) {
  if (query.startDate && Number.isNaN(query.startDate.getTime())) {
    throw new BadRequestException('Invalid startDate');
  }
  if (query.endDate && Number.isNaN(query.endDate.getTime())) {
    throw new BadRequestException('Invalid endDate');
  }
  if (query.startDate && query.endDate && query.startDate > query.endDate) {
    throw new BadRequestException('startDate must be before endDate');
  }
}
