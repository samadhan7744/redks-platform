import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

export class UpdateShopCommissionDto {
  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(50)
  commissionPercent: number;
}
