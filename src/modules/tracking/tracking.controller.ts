import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/auth-user.type';
import { UpdateRiderLocationDto } from './dto/update-rider-location.dto';
import { TrackingService } from './tracking.service';

@ApiTags('Tracking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post('riders/me/location')
  @Roles(UserRole.RIDER)
  updateMyLocation(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateRiderLocationDto,
  ) {
    return this.trackingService.updateRiderLocation(user.sub, dto);
  }

  @Get('orders/:id/tracking')
  getOrderTracking(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.trackingService.getCurrentLocation(id, user);
  }
}
