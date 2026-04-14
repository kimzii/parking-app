import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

const TOP_UP_EXPIRY_MINUTES = 5;

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
  // Top-Up Request Flow (NEW)
  // 1. User creates request → PENDING (5 min window)
  // 2. Admin accepts → ACCEPTED (user sees QR)
  // 3. User pays via GCash, uploads proof
  // 4. Admin verifies sender number + amount → releases credits (APPROVED)
  // ──────────────────────────────────────────────

  async createTopUpRequest(userId: string, amount: number) {
    const wallet = await this.getOrCreateWallet(userId);
    if (wallet.status !== 'ACTIVE') {
      throw new BadRequestException('Wallet is suspended');
    }

    const referenceCode = generateReferenceCode();
    const expiresAt = new Date(Date.now() + TOP_UP_EXPIRY_MINUTES * 60 * 1000);

    const request = await this.prisma.topUpRequest.create({
      data: {
        userId,
        amount,
        referenceCode,
        expiresAt,
      },
    });

    // Notify admins about new top-up request
    await this.notifyAdminsNewTopUp(request.id, amount, userId);

    return {
      id: request.id,
      amount: request.amount,
      referenceCode: request.referenceCode,
      status: request.status,
      expiresAt: request.expiresAt,
      createdAt: request.createdAt,
    };
  }

  /** Admin accepts a top-up request (within the 5-min window) */
  async acceptTopUp(requestId: string, adminUserId: string) {
    const request = await this.prisma.topUpRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundException('Top-up request not found');
    if (request.status !== 'PENDING') {
      throw new BadRequestException('This request is no longer pending');
    }

    // Check if expired
    if (request.expiresAt && new Date() > request.expiresAt) {
      await this.prisma.topUpRequest.update({
        where: { id: requestId },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('This top-up request has expired');
    }

    await this.prisma.topUpRequest.update({
      where: { id: requestId },
      data: {
        status: 'ACCEPTED',
        reviewedBy: adminUserId,
      },
    });

    // Notify user that admin accepted — they can now pay via QR
    await this.notificationsService.send({
      userId: request.userId,
      title: 'Top-Up Accepted',
      message: `Your top-up request for ₱${new Decimal(request.amount).toFixed(2)} has been accepted. Please pay via GCash now.`,
      type: 'TOPUP_APPROVED',
      data: { topUpRequestId: requestId, action: 'SHOW_QR' },
    });

    // Real-time event so mobile can transition to QR step
    this.gateway.sendToUser(request.userId, {
      type: 'topup-accepted',
      topUpRequestId: requestId,
    });

    return { success: true };
  }

  async uploadTopUpProof(requestId: string, userId: string, imageUrl: string) {
    const request = await this.prisma.topUpRequest.findFirst({
      where: { id: requestId, userId },
    });

    if (!request) throw new NotFoundException('Top-up request not found');
    if (request.status !== 'ACCEPTED') {
      throw new BadRequestException(
        'This request must be accepted by admin before uploading proof',
      );
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

  async getTopUpRequestsByUser(userId: string, limit = 10) {
    return this.prisma.topUpRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getPendingTopUpRequests() {
    await this.expireOldTopUpRequests();

    return this.prisma.topUpRequest.findMany({
      where: { status: { in: ['PENDING', 'ACCEPTED'] } },
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
      include: {
        user: { select: { phoneNumber: true } },
      },
    });

    if (!request) throw new NotFoundException('Top-up request not found');
    if (request.status !== 'ACCEPTED') {
      throw new BadRequestException(
        'This request must be in ACCEPTED status to release credits',
      );
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

    this.gateway.sendBalanceUpdate(request.userId, balanceAfter.toFixed(2));

    return { success: true };
  }

  async rejectTopUp(requestId: string, adminUserId: string, reason?: string) {
    const request = await this.prisma.topUpRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundException('Top-up request not found');
    if (request.status !== 'PENDING' && request.status !== 'ACCEPTED') {
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

    const baseMessage = `Your top-up request for ₱${new Decimal(request.amount).toFixed(2)} was rejected.`;
    const message = reason
      ? `${baseMessage} Reason: ${reason}. For further help, contact support@parklink.com`
      : `${baseMessage} For further help, contact support@parklink.com`;

    await this.notificationsService.send({
      userId: request.userId,
      title: 'Top-Up Rejected',
      message,
      type: 'TOPUP_REJECTED',
      data: { topUpRequestId: requestId, reason: reason ?? null },
    });

    return { success: true };
  }

  /** Check and expire old pending top-up requests */
  async expireOldTopUpRequests() {
    const now = new Date();
    const expired = await this.prisma.topUpRequest.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: now },
      },
    });

    if (expired.length === 0) return;

    // Update and notify per-row: only send notification if this call is the one
    // that actually flipped the status from PENDING → EXPIRED. This prevents
    // duplicate notifications when two endpoints call this method concurrently.
    for (const req of expired) {
      const result = await this.prisma.topUpRequest.updateMany({
        where: { id: req.id, status: 'PENDING' },
        data: { status: 'EXPIRED' },
      });

      if (result.count > 0) {
        await this.notificationsService.send({
          userId: req.userId,
          title: 'Top-Up Expired',
          message: `Your top-up request for ₱${new Decimal(req.amount).toFixed(2)} has expired.`,
          type: 'TOPUP_REJECTED',
          data: { topUpRequestId: req.id },
        });
      }
    }
  }

  /** Get all top-up requests (admin) */
  async getAllTopUpRequests() {
    await this.expireOldTopUpRequests();

    return this.prisma.topUpRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
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

  /** Get all withdraw requests (admin) */
  async getAllWithdrawRequests() {
    return this.prisma.withdrawRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
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

  /** Get a single top-up request with user details (for admin) */
  async getTopUpRequest(requestId: string) {
    const request = await this.prisma.topUpRequest.findUnique({
      where: { id: requestId },
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

    if (!request) throw new NotFoundException('Top-up request not found');
    return request;
  }

  /** Get top-up request status (for mobile polling) */
  async getTopUpStatus(requestId: string, userId: string) {
    const request = await this.prisma.topUpRequest.findFirst({
      where: { id: requestId, userId },
    });

    if (!request) throw new NotFoundException('Top-up request not found');

    // Auto-expire if needed
    if (
      request.status === 'PENDING' &&
      request.expiresAt &&
      new Date() > request.expiresAt
    ) {
      await this.prisma.topUpRequest.update({
        where: { id: requestId },
        data: { status: 'EXPIRED' },
      });
      return { ...request, status: 'EXPIRED' };
    }

    return request;
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

    // Verify user has a phone number (GCash number)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phoneNumber: true },
    });

    if (!user?.phoneNumber) {
      throw new BadRequestException(
        'Please add your GCash number to your profile before requesting a withdrawal.',
      );
    }

    const request = await this.prisma.withdrawRequest.create({
      data: {
        userId,
        amount,
      },
    });

    // Notify admins
    await this.notifyAdminsNewWithdraw(request.id, amount, userId);

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
  // Transaction History
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

  // ──────────────────────────────────────────────
  // Admin Notification Helpers
  // ──────────────────────────────────────────────

  private async getAdminUserIds(): Promise<string[]> {
    const admins = await this.prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role: { name: 'ADMIN' },
            status: 'VERIFIED',
          },
        },
      },
      select: { id: true },
    });
    return admins.map((a) => a.id);
  }

  private async notifyAdminsNewTopUp(
    requestId: string,
    amount: number,
    userId: string,
  ) {
    const adminIds = await this.getAdminUserIds();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    const name = user
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
      : 'A user';

    await Promise.all(
      adminIds.map((adminId) =>
        this.notificationsService.send({
          userId: adminId,
          title: 'New Top-Up Request',
          message: `${name} requested a top-up of ₱${amount.toFixed(2)}. You have 5 minutes to accept.`,
          type: 'GENERAL',
          data: { kind: 'TOPUP_REQUEST', topUpRequestId: requestId },
        }),
      ),
    );
  }

  private async notifyAdminsNewWithdraw(
    requestId: string,
    amount: number,
    userId: string,
  ) {
    const adminIds = await this.getAdminUserIds();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    const name = user
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
      : 'A user';

    await Promise.all(
      adminIds.map((adminId) =>
        this.notificationsService.send({
          userId: adminId,
          title: 'New Withdrawal Request',
          message: `${name} requested a withdrawal of ₱${amount.toFixed(2)}.`,
          type: 'GENERAL',
          data: { kind: 'WITHDRAW_REQUEST', withdrawRequestId: requestId },
        }),
      ),
    );
  }
}
