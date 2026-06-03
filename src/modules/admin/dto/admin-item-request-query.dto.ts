import { ApiPropertyOptional } from '@nestjs/swagger';
import { ItemRequestStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class AdminItemRequestQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ItemRequestStatus })
  @IsOptional()
  @IsEnum(ItemRequestStatus)
  status?: ItemRequestStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  zoneId?: string;
}
