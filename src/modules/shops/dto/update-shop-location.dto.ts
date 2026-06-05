import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsNumber, Max, Min } from 'class-validator';

export class UpdateShopLocationDto {
  @ApiProperty({ example: 12.9715987 })
  @Type(() => Number)
  @IsLatitude()
  latitude: number;

  @ApiProperty({ example: 77.5945627 })
  @Type(() => Number)
  @IsLongitude()
  longitude: number;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(20)
  serviceRadiusKm: number;
}
