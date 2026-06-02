import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class RejectShopDto {
  @ApiProperty({ example: 'Documents are incomplete' })
  @IsString()
  @Length(3, 200)
  reason: string;
}
