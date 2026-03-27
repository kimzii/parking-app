import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

function generateReferenceCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'TOPUP-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private gateway: NotificationsGateway,
  ) {}

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

  // ──────────────────────────────────────────────
  // Top-Up Request Flow
  // ──────────────────────────────────────────────

  async createTopUpRequest(userId: string, amount: number) {
    const wallet = await this.getOrCreateWallet(userId);
    if (wallet.status !== 'ACTIVE') {
      throw new BadRequestException('Wallet is suspended');
    }

    const referenceCode = generateReferenceCode();

    const request = await this.prisma.topUpRequest.create({
      data: {
        userId,
        amount,
        referenceCode,
      },
    });

    return {
      id: request.id,
      amount: request.amount,
      referenceCode: request.referenceCode,
      status: request.status,
      createdAt: request.createdAt,
    };
  }

  async uploadTopUpProof(requestId: string, userId: string, imageUrl: string) {
    const request = await this.prisma.topUpRequest.findFirst({
      where: { id: requestId, userId },
    });

    if (!request) throw new NotFoundException('Top-up request not found');
    if (request.status !== 'PENDING') {
      throw new BadRequestException('This request has already been processed');
    }

    return this.prisma.topUpRequest.update({
      where: { id: requestId },
      data: { proofImageUrl: imageUrl },
    });
  }

  async getMyTopUpRequests(userId: string) {
    return this.prisma.topUpRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getPendingTopUpRequests() {
    return this.prisma.topUpRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });
  }

  async approveTopUp(requestId: string, adminUserId: string) {
    const request = await this.prisma.topUpRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundException('Top-up request not found');
    if (request.status !== 'PENDING') {
      throw new BadRequestException('This request has already been processed');
    }

    const wallet = await this.getOrCreateWallet(request.userId);
    const balanceBefore = wallet.balance;
    const amount = new Decimal(request.amount);
    const balanceAfter = new Decimal(balanceBefore).add(amount);

    await this.prisma.$transaction([
      this.prisma.topUpRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          reviewedBy: adminUserId,
          reviewedAt: new Date(),
        },
      }),
      this.prisma.wallet.update({
        where: { userId: request.userId },
        data: { balance: { increment: amount.toNumber() } },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'CREDIT',
          source: 'TOP_UP',
          amount: amount.toNumber(),
          balanceBefore,
          balanceAfter,
        },
      }),
    ]);

    await this.notificationsService.send({
      userId: request.userId,
      title: 'Top-Up Approved',
      message: `₱${amount.toFixed(2)} has been added to your wallet.`,
      type: 'TOPUP_APPROVED',
      data: { topUpRequestId: requestId },
    });

    // Real-time balance update
    this.gateway.sendBalanceUpdate(request.userId, balanceAfter.toFixed(2));

    return { success: true };
  }

  async rejectTopUp(requestId: string, adminUserId: string) {
    const request = await this.prisma.topUpRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundException('Top-up request not found');
    if (request.status !== 'PENDING') {
      throw new BadRequestException('This request has already been processed');
    }

    await this.prisma.topUpRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
      },
    });

    await this.notificationsService.send({
      userId: request.userId,
      title: 'Top-Up Rejected',
      message: `Your top-up request for ₱${new Decimal(request.amount).toFixed(2)} was rejected.`,
      type: 'TOPUP_REJECTED',
      data: { topUpRequestId: requestId },
    });

    return { success: true };
  }

  // ──────────────────────────────────────────────
  // Withdraw Request Flow
  // ──────────────────────────────────────────────

  async createWithdrawRequest(userId: string, amount: number) {
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

    const request = await this.prisma.withdrawRequest.create({
      data: {
        userId,
        amount,
      },
    });

    return {
      id: request.id,
      amount: request.amount,
      status: request.status,
      createdAt: request.createdAt,
    };
  }

  async getMyWithdrawRequests(userId: string) {
    return this.prisma.withdrawRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getPendingWithdrawRequests() {
    return this.prisma.withdrawRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });
  }

  async approveWithdraw(requestId: string, adminUserId: string) {
    const request = await this.prisma.withdrawRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundException('Withdraw request not found');
    if (request.status !== 'PENDING') {
      throw new BadRequestException('This request has already been processed');
    }

    const wallet = await this.getOrCreateWallet(request.userId);
    const currentBalance = new Decimal(wallet.balance);
    const amount = new Decimal(request.amount);

    if (currentBalance.lt(amount)) {
      throw new BadRequestException('User no longer has sufficient balance');
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = currentBalance.sub(amount);

    const user = await this.prisma.user.findUnique({
      where: { id: request.userId },
      select: { phoneNumber: true },
    });

    await this.prisma.$transaction([
      this.prisma.withdrawRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          reviewedBy: adminUserId,
          reviewedAt: new Date(),
        },
      }),
      this.prisma.wallet.update({
        where: { userId: request.userId },
        data: { balance: { decrement: amount.toNumber() } },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEBIT',
          source: 'HOST_PAYOUT',
          amount: amount.toNumber(),
          balanceBefore,
          balanceAfter,
        },
      }),
    ]);

    const gcashNumber = user?.phoneNumber || 'your GCash';
    await this.notificationsService.send({
      userId: request.userId,
      title: 'Withdrawal Approved',
      message: `₱${amount.toFixed(2)} has been sent to ${gcashNumber}.`,
      type: 'WITHDRAW_APPROVED',
      data: { withdrawRequestId: requestId },
    });

    // Real-time balance update
    this.gateway.sendBalanceUpdate(request.userId, balanceAfter.toFixed(2));

    return { success: true };
  }

  async rejectWithdraw(requestId: string, adminUserId: string) {
    const request = await this.prisma.withdrawRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundException('Withdraw request not found');
    if (request.status !== 'PENDING') {
      throw new BadRequestException('This request has already been processed');
    }

    await this.prisma.withdrawRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
      },
    });

    await this.notificationsService.send({
      userId: request.userId,
      title: 'Withdrawal Rejected',
      message: `Your withdrawal request for ₱${new Decimal(request.amount).toFixed(2)} was rejected.`,
      type: 'WITHDRAW_REJECTED',
      data: { withdrawRequestId: requestId },
    });

    return { success: true };
  }

  // ──────────────────────────────────────────────
  // Transaction History (unchanged)
  // ──────────────────────────────────────────────

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
