import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

@ApiTags('Admin Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Business overview cards' })
  overview() {
    return this.analyticsService.overview();
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Revenue analytics' })
  revenue(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.revenue(query);
  }

  @Get('orders')
  @ApiOperation({ summary: 'Order analytics' })
  orders(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.orders(query);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Customer analytics' })
  customers(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.customers(query);
  }

  @Get('shops')
  @ApiOperation({ summary: 'Shop analytics' })
  shops(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.shops(query);
  }

  @Get('riders')
  @ApiOperation({ summary: 'Rider analytics' })
  riders(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.riders(query);
  }

  @Get('payments')
  @ApiOperation({ summary: 'Payment analytics' })
  payments(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.payments(query);
  }
}
