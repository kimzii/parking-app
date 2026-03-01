import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HostsController } from './hosts.controller';
import { HostsService } from './hosts.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [HostsController],
  providers: [HostsService],
  exports: [HostsService],
})
export class HostsModule {}
