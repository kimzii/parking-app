import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { WalletService } from './wallet.service';
import { TopUpDto } from './dto/top-up.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { v4 as uuid } from 'uuid';

@ApiTags('Wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(
    private readonly walletService: WalletService,
    private readonly configService: ConfigService,
  ) {
    this.region = this.configService.get('AWS_REGION', 'ap-southeast-1');
    this.bucket = this.configService.get('AWS_S3_BUCKET', '');
    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY', ''),
      },
    });
  }

  // ─── Balance & Transactions ────────────────────

  @Get('balance')
  @ApiOperation({ summary: 'Get wallet balance' })
  async getBalance(@Request() req: { user: { id: string } }) {
    return this.walletService.getBalance(req.user.id);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get wallet transaction history' })
  async getTransactions(
    @Request() req: { user: { id: string } },
    @Query('limit') limit?: string,
  ) {
    return this.walletService.getTransactions(
      req.user.id,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  // ─── Top-Up ────────────────────────────────────

  @Post('top-up')
  @ApiOperation({ summary: 'Create a top-up request (5 min window for admin)' })
  async createTopUp(
    @Request() req: { user: { id: string } },
    @Body() dto: TopUpDto,
  ) {
    return this.walletService.createTopUpRequest(req.user.id, dto.amount);
  }

  @Get('top-up/:id/status')
  @ApiOperation({ summary: 'Get top-up request status (for polling)' })
  async getTopUpStatus(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.walletService.getTopUpStatus(id, req.user.id);
  }

  @Post('top-up/:id/upload-proof')
  @ApiOperation({ summary: 'Upload GCash payment proof screenshot' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadTopUpProof(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @UploadedFile() file: { originalname: string; buffer: Buffer; mimetype: string },
  ) {
    const ext = file.originalname.split('.').pop() || 'jpg';
    const key = `topup-proofs/${uuid()}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      }),
    );

    const imageUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    await this.walletService.uploadTopUpProof(id, req.user.id, imageUrl);
    return { imageUrl };
  }

  @Get('top-up/my-requests')
  @ApiOperation({ summary: 'Get my top-up request history' })
  async getMyTopUpRequests(@Request() req: { user: { id: string } }) {
    return this.walletService.getMyTopUpRequests(req.user.id);
  }

  @Get('top-up/pending')
  @ApiOperation({ summary: 'Admin: Get pending/accepted top-up requests' })
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async getPendingTopUps() {
    return this.walletService.getPendingTopUpRequests();
  }

  @Get('top-up/:id')
  @ApiOperation({ summary: 'Admin: Get single top-up request details' })
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async getTopUpRequest(@Param('id') id: string) {
    return this.walletService.getTopUpRequest(id);
  }

  @Patch('top-up/:id/accept')
  @ApiOperation({ summary: 'Admin: Accept a top-up request (user will see QR)' })
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async acceptTopUp(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.walletService.acceptTopUp(id, req.user.id);
  }

  @Patch('top-up/:id/release')
  @ApiOperation({ summary: 'Admin: Release credits after verifying payment' })
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async releaseTopUpCredits(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.walletService.releaseTopUpCredits(id, req.user.id);
  }

  @Patch('top-up/:id/reject')
  @ApiOperation({ summary: 'Admin: Reject a top-up request' })
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async rejectTopUp(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.walletService.rejectTopUp(id, req.user.id);
  }

  // ─── Withdraw ──────────────────────────────────

  @Post('withdraw')
  @ApiOperation({ summary: 'Create a withdrawal request' })
  async createWithdraw(
    @Request() req: { user: { id: string } },
    @Body() dto: WithdrawDto,
  ) {
    return this.walletService.createWithdrawRequest(req.user.id, dto.amount);
  }

  @Get('withdraw/my-requests')
  @ApiOperation({ summary: 'Get my withdrawal request history' })
  async getMyWithdrawRequests(@Request() req: { user: { id: string } }) {
    return this.walletService.getMyWithdrawRequests(req.user.id);
  }

  @Get('withdraw/pending')
  @ApiOperation({ summary: 'Admin: Get pending withdrawal requests' })
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async getPendingWithdrawals() {
    return this.walletService.getPendingWithdrawRequests();
  }

  @Patch('withdraw/:id/approve')
  @ApiOperation({ summary: 'Admin: Approve a withdrawal request' })
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async approveWithdraw(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.walletService.approveWithdraw(id, req.user.id);
  }

  @Patch('withdraw/:id/reject')
  @ApiOperation({ summary: 'Admin: Reject a withdrawal request' })
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async rejectWithdraw(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.walletService.rejectWithdraw(id, req.user.id);
  }
}
