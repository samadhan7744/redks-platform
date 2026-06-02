import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { QuoteStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateQuoteDto } from './create-quote.dto';

export class UpdateQuoteDto extends PartialType(CreateQuoteDto) {
  @ApiPropertyOptional({ enum: [QuoteStatus.SENT, QuoteStatus.REJECTED, QuoteStatus.CANCELLED] })
  @IsOptional()
  @IsEnum(QuoteStatus)
  status?: QuoteStatus;
}
