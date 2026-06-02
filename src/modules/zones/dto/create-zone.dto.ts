import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateZoneDto {
  @ApiProperty({ example: 'city_cuid' })
  @IsString()
  cityId: string;

  @ApiProperty({ example: 'Malviya Nagar' })
  @IsString()
  @Length(2, 80)
  name: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseDeliveryFee?: number;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedMinutesMin?: number;

  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedMinutesMax?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
