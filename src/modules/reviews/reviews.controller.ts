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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/auth-user.type';
import { CreateReviewReplyDto } from './dto/create-review-reply.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import { UpdateReviewStatusDto } from './dto/update-review-status.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a review for a completed order' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(user.sub, dto);
  }

  @Get('my')
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List current customer reviews' })
  mine(@CurrentUser() user: AuthUser, @Query() query: ReviewQueryDto) {
    return this.reviewsService.findMine(user.sub, query);
  }

  @Post(':id/reply')
  @Roles(UserRole.SHOP_OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Reply to a shop review' })
  reply(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateReviewReplyDto,
  ) {
    return this.reviewsService.reply(user, id, dto);
  }
}

@ApiTags('Public Reviews')
@Controller()
export class PublicReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('shops/:shopId/reviews')
  @ApiOperation({ summary: 'List published shop reviews' })
  shopReviews(@Param('shopId') shopId: string, @Query() query: ReviewQueryDto) {
    return this.reviewsService.findPublicForShop(shopId, query);
  }

  @Get('products/:productId/reviews')
  @ApiOperation({ summary: 'List published product reviews' })
  productReviews(
    @Param('productId') productId: string,
    @Query() query: ReviewQueryDto,
  ) {
    return this.reviewsService.findPublicForProduct(productId, query);
  }
}

@ApiTags('Shop Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('shops/me/reviews')
export class ShopReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @Roles(UserRole.SHOP_OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List reviews for current shop owner' })
  mine(@CurrentUser() user: AuthUser, @Query() query: ReviewQueryDto) {
    return this.reviewsService.findForOwnedShop(user.sub, query);
  }
}

@ApiTags('Admin Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all reviews for moderation' })
  findAll(@Query() query: ReviewQueryDto) {
    return this.reviewsService.findAllForAdmin(query);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Publish, hide, or flag a review' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateReviewStatusDto) {
    return this.reviewsService.updateStatus(id, dto);
  }
}
