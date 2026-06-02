import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/auth-user.type';
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
}
