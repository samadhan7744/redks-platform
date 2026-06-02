import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/auth-user.type';
import { OrdersService } from './orders.service';

@ApiTags('Rider Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.RIDER)
@Controller('rider/orders')
export class RiderOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('available')
  available(@CurrentUser() user: AuthUser) {
    return this.ordersService.findAvailableForRider(user.sub);
  }

  @Patch(':id/accept')
  accept(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ordersService.riderAccept(user.sub, id);
  }

  @Patch(':id/pickup')
  pickup(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ordersService.riderPickup(user.sub, id);
  }

  @Patch(':id/deliver')
  deliver(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ordersService.riderDeliver(user.sub, id);
  }
}
