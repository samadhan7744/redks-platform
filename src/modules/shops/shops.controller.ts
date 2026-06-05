import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/auth-user.type';
import { CreateShopDto } from './dto/create-shop.dto';
import { CreateShopDocumentDto } from './dto/create-shop-document.dto';
import { CreateShopRiderDto } from './dto/create-shop-rider.dto';
import { NearbyShopsQueryDto } from './dto/nearby-shops-query.dto';
import { ShopQueryDto } from './dto/shop-query.dto';
import { UpdateMyShopStatusDto } from './dto/update-my-shop-status.dto';
import { UpdateShopLocationDto } from './dto/update-shop-location.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { UpdateShopStatusDto } from './dto/update-shop-status.dto';
import { ShopsService } from './shops.service';

@ApiTags('Shops')
@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get()
  findApproved(@Query() query: ShopQueryDto) {
    return this.shopsService.findPublic(query);
  }

  @Get('nearby')
  nearby(@Query() query: NearbyShopsQueryDto) {
    return this.shopsService.findNearby(query);
  }

  @Post('register')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.CUSTOMER,
    UserRole.SHOP_OWNER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateShopDto) {
    return this.shopsService.create(user.sub, dto);
  }

  @Get('my-shop')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  myShop(@CurrentUser() user: AuthUser) {
    return this.shopsService.findMyShop(user.sub);
  }

  @Patch('my-shop')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateMyShop(@CurrentUser() user: AuthUser, @Body() dto: UpdateShopDto) {
    return this.shopsService.updateMyShop(user.sub, dto);
  }

  @Post('my-shop/documents')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createMyShopDocument(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateShopDocumentDto,
  ) {
    return this.shopsService.createMyShopDocument(user.sub, dto);
  }

  @Get('my-shop/documents')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  myShopDocuments(@CurrentUser() user: AuthUser) {
    return this.shopsService.findMyShopDocuments(user.sub);
  }

  @Post('my-shop/riders')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createMyShopRider(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateShopRiderDto,
  ) {
    return this.shopsService.createMyShopRider(user.sub, dto);
  }

  @Get('my-shop/riders')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  myShopRiders(@CurrentUser() user: AuthUser) {
    return this.shopsService.findMyShopRiders(user.sub);
  }

  @Patch('my-shop/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateMyStatus(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMyShopStatusDto,
  ) {
    return this.shopsService.updateMyStatus(user.sub, dto);
  }

  @Patch('my-shop/location')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateMyLocation(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateShopLocationDto,
  ) {
    return this.shopsService.updateMyLocation(user.sub, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shopsService.findById(id);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateShopStatusDto,
  ) {
    return this.shopsService.updateStatus(user.sub, id, dto);
  }

  @Patch(':id/location')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateLocation(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateShopLocationDto,
  ) {
    return this.shopsService.updateLocation(user, id, dto);
  }
}
