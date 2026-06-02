import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/auth-user.type';
import { DeliveryService } from './delivery.service';

@ApiTags('Delivery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Get('rider/mine')
  @Roles(Role.RIDER)
  mine(@CurrentUser() user: AuthUser) {
    return this.deliveryService.findForRiderUser(user.sub);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  findAll() {
    return this.deliveryService.findAll();
  }
}
