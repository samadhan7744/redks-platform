import { ApiProperty } from '@nestjs/swagger';
import { ShopStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateMyShopStatusDto {
  @ApiProperty({ enum: [ShopStatus.DRAFT, ShopStatus.PENDING_APPROVAL] })
  @IsEnum(ShopStatus)
  status: ShopStatus;
}
