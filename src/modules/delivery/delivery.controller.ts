import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/auth-user.type';
import { UpdateRiderAvailabilityDto } from './dto/update-rider-availability.dto';
import { DeliveryService } from './delivery.service';

@ApiTags('Delivery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Get('rider/mine')
  @Roles(UserRole.RIDER)
  mine(@CurrentUser() user: AuthUser) {
    return this.deliveryService.findForRiderUser(user.sub);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAll() {
    return this.deliveryService.findAll();
  }

  @Patch('rider/availability')
  @Roles(UserRole.RIDER)
  updateAvailability(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateRiderAvailabilityDto,
  ) {
    return this.deliveryService.updateAvailability(user.sub, dto);
  }
}
