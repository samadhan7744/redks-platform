import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class RejectOrderDto {
  @ApiProperty({ example: 'Item is unavailable' })
  @IsString()
  @Length(3, 200)
  reason: string;
}
