import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { UserRole } from '../../user/schemas/role.schema';
import { ProcessWithdrawalDto } from '../dto/process-withdrawal.dto';
import { WalletService } from '../services/wallet.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/withdrawals')
export class AdminWithdrawalController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'List withdrawals' })
  list(@Query() query: PaginationDto & { status?: string }) {
    return this.walletService.listWithdrawals(query);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve withdrawal' })
  approve(@Param('id') withdrawalId: string, @Body() dto: ProcessWithdrawalDto) {
    return this.walletService.approveWithdrawal(withdrawalId, dto.adminNote);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject withdrawal' })
  reject(@Param('id') withdrawalId: string, @Body() dto: ProcessWithdrawalDto) {
    return this.walletService.rejectWithdrawal(withdrawalId, dto.adminNote);
  }
}
