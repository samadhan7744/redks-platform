import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/auth-user.type';
import { CreateRiderDocumentDto } from './dto/create-rider-document.dto';
import { CreateRiderProfileDto } from './dto/create-rider-profile.dto';
import { UpdateRiderProfileDto } from './dto/update-rider-profile.dto';
import { UpdateRiderAvailabilityStatusDto } from './dto/update-rider-availability-status.dto';
import { RidersService } from './riders.service';

@ApiTags('Riders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('riders')
export class RidersController {
  constructor(private readonly ridersService: RidersService) {}

  @Post('register')
  @Roles(
    UserRole.CUSTOMER,
    UserRole.RIDER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  register(@CurrentUser() user: AuthUser, @Body() dto: CreateRiderProfileDto) {
    return this.ridersService.register(user.sub, dto);
  }

  @Get('me')
  @Roles(UserRole.RIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  me(@CurrentUser() user: AuthUser) {
    return this.ridersService.me(user.sub);
  }

  @Patch('me/status')
  @Roles(UserRole.RIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateRiderAvailabilityStatusDto,
  ) {
    return this.ridersService.updateAvailabilityStatus(user.sub, dto);
  }

  @Get('available')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SHOP_OWNER)
  available() {
    return this.ridersService.available();
  }

  @Patch('me')
  @Roles(UserRole.RIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateRiderProfileDto) {
    return this.ridersService.updateMe(user.sub, dto);
  }

  @Post('me/submit')
  @Roles(UserRole.RIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  submit(@CurrentUser() user: AuthUser) {
    return this.ridersService.submit(user.sub);
  }

  @Post('me/documents')
  @Roles(UserRole.RIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createDocument(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateRiderDocumentDto,
  ) {
    return this.ridersService.createDocument(user.sub, dto);
  }

  @Get('me/documents')
  @Roles(UserRole.RIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  documents(@CurrentUser() user: AuthUser) {
    return this.ridersService.documents(user.sub);
  }
}
