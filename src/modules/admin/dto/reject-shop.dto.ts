import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class RejectShopDto {
  @ApiProperty({ example: 'Documents are incomplete' })
  @IsString()
  @Length(3, 200)
  reason: string;

  @ApiProperty({
    required: false,
    example: 'GST photo is unclear. Owner photo is missing.',
  })
  @IsOptional()
  @IsString()
  @Length(3, 500)
  reviewNotes?: string;
}
