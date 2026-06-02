import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AdminModule } from './modules/admin/admin.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CitiesModule } from './modules/cities/cities.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { ItemRequestsModule } from './modules/item-requests/item-requests.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProductsModule } from './modules/products/products.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { ShopsModule } from './modules/shops/shops.module';
import { UsersModule } from './modules/users/users.module';
import { ZonesModule } from './modules/zones/zones.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'dev-secret'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d'),
        },
      }),
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    AddressesModule,
    CitiesModule,
    ZonesModule,
    ShopsModule,
    CategoriesModule,
    ProductsModule,
    OrdersModule,
    ItemRequestsModule,
    DeliveryModule,
    PaymentsModule,
    NotificationsModule,
    ReviewsModule,
    AdminModule,
  ],
})
export class AppModule {}
