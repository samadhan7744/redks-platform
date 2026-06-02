import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/auth-user.type';
import { AdminShopQueryDto } from './dto/admin-shop-query.dto';
import { RejectShopDto } from './dto/reject-shop.dto';
import { AdminService } from './admin.service';
import { UpdateRiderStatusDto } from './dto/update-rider-status.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('shops/pending')
  pendingShops() {
    return this.adminService.pendingShops();
  }

  @Get('shops')
  shops(@Query() query: AdminShopQueryDto) {
    return this.adminService.findShops(query);
  }

  @Patch('shops/:id/approve')
  approveShop(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.adminService.approveShop(user.sub, id);
  }

  @Patch('shops/:id/reject')
  rejectShop(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: RejectShopDto) {
    return this.adminService.rejectShop(user.sub, id, dto.reason);
  }

  @Patch('shops/:id/suspend')
  suspendShop(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.adminService.suspendShop(user.sub, id);
  }

  @Get('riders/pending')
  pendingRiders() {
    return this.adminService.pendingRiders();
  }

  @Patch('riders/:id/status')
  updateRiderStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateRiderStatusDto,
  ) {
    return this.adminService.updateRiderStatus(user.sub, id, dto);
  }

  @Get('dashboard/summary')
  dashboardSummary() {
    return this.adminService.dashboardSummary();
  }
}
