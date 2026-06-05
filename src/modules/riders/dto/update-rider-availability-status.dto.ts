import { ApiProperty } from '@nestjs/swagger';
import { RiderAvailabilityStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateRiderAvailabilityStatusDto {
  @ApiProperty({
    enum: [
      RiderAvailabilityStatus.OFFLINE,
      RiderAvailabilityStatus.ONLINE,
      RiderAvailabilityStatus.BUSY,
    ],
  })
  @IsEnum(RiderAvailabilityStatus)
  status: RiderAvailabilityStatus;
}
