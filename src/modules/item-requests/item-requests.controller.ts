import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/auth-user.type';
import { CreateItemRequestDto } from './dto/create-item-request.dto';
import { ItemRequestsService } from './item-requests.service';

@ApiTags('Request Any Item')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('item-requests')
export class ItemRequestsController {
  constructor(private readonly itemRequestsService: ItemRequestsService) {}

  @Post()
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateItemRequestDto) {
    return this.itemRequestsService.create(user.sub, dto);
  }

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.itemRequestsService.findForCustomer(user.sub);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAll() {
    return this.itemRequestsService.findAll();
  }
}
