import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { HostsModule } from './hosts/hosts.module';
import { DriversModule } from './drivers/drivers.module';
import { WalletModule } from './wallet/wallet.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReservationsModule } from './reservations/reservations.module';
import { ReviewsModule } from './reviews/reviews.module';
import { NotificationsModule } from './notifications/notifications.module';
import { S3Module } from './common/s3.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, '..', '..', '.env'),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60, // 60 seconds
        limit: 10, // 10 requests per minute (default)
      },
    ]),
    AuthModule,
    PrismaModule,
    UsersModule,
    HostsModule,
    DriversModule,
    WalletModule,
    DashboardModule,
    ReservationsModule,
    ReviewsModule,
    NotificationsModule,
    S3Module,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
