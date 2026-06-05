import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class NearbyShopsQueryDto {
  @ApiProperty({ example: 12.9715987 })
  @Type(() => Number)
  @IsLatitude()
  lat: number;

  @ApiProperty({ example: 77.5945627 })
  @Type(() => Number)
  @IsLongitude()
  lng: number;

  @ApiPropertyOptional({ example: 5, default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(20)
  radiusKm?: number;
}
