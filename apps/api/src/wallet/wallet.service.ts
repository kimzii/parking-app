import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  private async getOrCreateWallet(userId: string) {
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: { userId },
      });
    }

    return wallet;
  }

  async getBalance(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);

    return {
      id: wallet.id,
      balance: wallet.balance,
      status: wallet.status,
    };
  }

  async topUp(userId: string, amount: number) {
    const wallet = await this.getOrCreateWallet(userId);

    if (wallet.status !== 'ACTIVE') {
      throw new BadRequestException('Wallet is suspended');
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = new Decimal(balanceBefore).add(new Decimal(amount));

    const [updatedWallet, transaction] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { userId },
        data: {
          balance: { increment: amount },
        },
        select: {
          id: true,
          balance: true,
          status: true,
        },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'CREDIT',
          source: 'TOP_UP',
          amount,
          balanceBefore,
          balanceAfter,
        },
      }),
    ]);

    return {
      wallet: updatedWallet,
      transaction,
    };
  }
}
