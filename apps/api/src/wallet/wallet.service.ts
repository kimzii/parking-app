import { Injectable, BadRequestException } from '@nestjs/common';
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

  async withdraw(userId: string, amount: number) {
    const wallet = await this.getOrCreateWallet(userId);

    if (wallet.status !== 'ACTIVE') {
      throw new BadRequestException('Wallet is suspended');
    }

    const currentBalance = new Decimal(wallet.balance);
    if (currentBalance.lt(amount)) {
      throw new BadRequestException(
        `Insufficient balance. Available: ₱${currentBalance.toFixed(2)}`,
      );
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = currentBalance.sub(new Decimal(amount));

    const [updatedWallet, transaction] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { userId },
        data: {
          balance: { decrement: amount },
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
          type: 'DEBIT',
          source: 'HOST_PAYOUT',
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

  async getTransactions(userId: string, limit = 20) {
    const wallet = await this.getOrCreateWallet(userId);

    const transactions = await this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return transactions.map((t) => ({
      id: t.id,
      type: t.type,
      source: t.source,
      amount: t.amount,
      balanceBefore: t.balanceBefore,
      balanceAfter: t.balanceAfter,
      createdAt: t.createdAt,
    }));
  }
}
