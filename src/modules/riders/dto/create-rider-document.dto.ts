import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationDocumentType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUrl, Length } from 'class-validator';

export class CreateRiderDocumentDto {
  @ApiProperty({
    enum: VerificationDocumentType,
    example: VerificationDocumentType.AADHAAR,
  })
  @IsEnum(VerificationDocumentType)
  type: VerificationDocumentType;

  @ApiProperty({ example: '/uploads/documents/riders/aadhaar.jpg' })
  @IsString()
  @IsUrl(
    { require_tld: false },
    { message: 'fileUrl must be a valid URL or local upload path' },
  )
  fileUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 200)
  note?: string;
}
