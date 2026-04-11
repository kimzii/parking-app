import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();

    // Soft-delete filter: automatically exclude deleted parking locations
    this.$use(async (params, next) => {
      if (params.model === 'ParkingLocation') {
        if (['findMany', 'findFirst', 'count'].includes(params.action)) {
          params.args = params.args ?? {};
          params.args.where = {
            ...params.args.where,
            deletedAt: null,
          };
        }
        // findUnique only accepts unique fields — convert to findFirst so we
        // can safely add the deletedAt filter alongside the unique field
        if (params.action === 'findUnique') {
          params.action = 'findFirst';
          params.args = params.args ?? {};
          params.args.where = {
            ...params.args.where,
            deletedAt: null,
          };
        }
      }
      return next(params);
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
