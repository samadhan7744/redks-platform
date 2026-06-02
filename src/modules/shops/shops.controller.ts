import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/auth-user.type';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopStatusDto } from './dto/update-shop-status.dto';
import { ShopsService } from './shops.service';

@ApiTags('Shops')
@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get()
  findApproved() {
    return this.shopsService.findApproved();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shopsService.findById(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER, Role.SHOP_OWNER, Role.ADMIN, Role.SUPER_ADMIN)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateShopDto) {
    return this.shopsService.create(user.sub, dto);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateShopStatusDto) {
    return this.shopsService.updateStatus(user.sub, id, dto);
  }
}
