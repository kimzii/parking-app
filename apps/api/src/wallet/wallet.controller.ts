import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WalletService } from './wallet.service';
import { TopUpDto } from './dto/top-up.dto';
import { WithdrawDto } from './dto/withdraw.dto';

@ApiTags('Wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get wallet balance' })
  @ApiResponse({ status: 200, description: 'Wallet balance retrieved' })
  async getBalance(@Request() req: { user: { id: string } }) {
    return this.walletService.getBalance(req.user.id);
  }

  @Post('top-up')
  @ApiOperation({ summary: 'Top up wallet balance' })
  @ApiResponse({ status: 201, description: 'Wallet topped up successfully' })
  @ApiResponse({ status: 400, description: 'Wallet is suspended' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async topUp(
    @Request() req: { user: { id: string } },
    @Body() topUpDto: TopUpDto,
  ) {
    return this.walletService.topUp(req.user.id, topUpDto.amount);
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'Withdraw from wallet' })
  @ApiResponse({ status: 201, description: 'Withdrawal successful' })
  @ApiResponse({
    status: 400,
    description: 'Insufficient balance or wallet suspended',
  })
  async withdraw(
    @Request() req: { user: { id: string } },
    @Body() withdrawDto: WithdrawDto,
  ) {
    return this.walletService.withdraw(req.user.id, withdrawDto.amount);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get wallet transaction history' })
  @ApiResponse({ status: 200, description: 'Transaction history retrieved' })
  async getTransactions(
    @Request() req: { user: { id: string } },
    @Query('limit') limit?: string,
  ) {
    return this.walletService.getTransactions(
      req.user.id,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
