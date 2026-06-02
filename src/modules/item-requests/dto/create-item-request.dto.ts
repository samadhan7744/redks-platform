import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class CreateItemRequestDto {
  @ApiProperty({ example: 'city_cuid' })
  @IsString()
  cityId: string;

  @ApiPropertyOptional({ example: 'zone_cuid' })
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ApiPropertyOptional({ example: 'preferred_shop_cuid' })
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiProperty({ example: 'Need a 2kg chocolate cake and birthday candles by 7 PM.' })
  @IsString()
  @Length(5, 500)
  description: string;
}
