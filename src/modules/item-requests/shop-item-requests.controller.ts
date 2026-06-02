import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/auth-user.type';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { ItemRequestsService } from './item-requests.service';

@ApiTags('Shop Item Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SHOP_OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('shop/item-requests')
export class ShopItemRequestsController {
  constructor(private readonly itemRequestsService: ItemRequestsService) {}

  @Get('nearby')
  nearby(@CurrentUser() user: AuthUser) {
    return this.itemRequestsService.findNearbyForShop(user.sub);
  }

  @Post(':id/quotes')
  quote(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CreateQuoteDto) {
    return this.itemRequestsService.createQuote(user.sub, id, dto);
  }

  @Patch('quotes/:quoteId')
  updateQuote(@CurrentUser() user: AuthUser, @Param('quoteId') quoteId: string, @Body() dto: UpdateQuoteDto) {
    return this.itemRequestsService.updateQuote(user.sub, quoteId, dto);
  }
}
