import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  VerificationDocumentOwnerType,
  VerificationDocumentType,
} from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UploadDocumentDto {
  @ApiPropertyOptional({ enum: VerificationDocumentOwnerType })
  @IsOptional()
  @IsEnum(VerificationDocumentOwnerType)
  ownerType?: VerificationDocumentOwnerType;

  @ApiPropertyOptional({ enum: VerificationDocumentType })
  @IsOptional()
  @IsEnum(VerificationDocumentType)
  type?: VerificationDocumentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerId?: string;
}
