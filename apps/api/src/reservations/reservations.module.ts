import { Module } from '@nestjs/common';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [PrismaModule, WalletModule],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
