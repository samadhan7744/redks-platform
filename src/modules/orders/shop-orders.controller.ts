import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/auth-user.type';
import { RejectOrderDto } from './dto/reject-order.dto';
import { OrdersService } from './orders.service';

@ApiTags('Shop Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SHOP_OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('shop/orders')
export class ShopOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findShopOrders(@CurrentUser() user: AuthUser) {
    return this.ordersService.findForShopOwner(user.sub);
  }

  @Patch(':id/accept')
  accept(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ordersService.shopAccept(user, id);
  }

  @Patch(':id/reject')
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RejectOrderDto,
  ) {
    return this.ordersService.shopReject(user, id, dto.reason);
  }

  @Patch(':id/ready')
  ready(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ordersService.shopReady(user, id);
  }
}
