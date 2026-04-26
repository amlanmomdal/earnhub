import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { WithdrawDto } from '../dto/withdraw.dto';
import { WalletService } from '../services/wallet.service';

@ApiTags('Wallet')
@ApiBearerAuth()
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('claim-profit')
  @ApiOperation({ summary: 'Claim daily profit' })
  claimProfit(@CurrentUser('sub') userId: string) {
    return this.walletService.claimProfit(userId);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get wallet balance' })
  getBalance(@CurrentUser('sub') userId: string) {
    return this.walletService.getBalance(userId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get wallet transaction history' })
  getTransactions(@CurrentUser('sub') userId: string, @Query() query: PaginationDto) {
    return this.walletService.getTransactions(userId, query);
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'Request withdrawal' })
  requestWithdrawal(@CurrentUser('sub') userId: string, @Body() dto: WithdrawDto) {
    return this.walletService.requestWithdrawal(userId, dto);
  }
}
