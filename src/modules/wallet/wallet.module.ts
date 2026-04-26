import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminSetting, AdminSettingSchema } from '../../database/schemas/admin-setting.schema';
import { Withdrawal, WithdrawalSchema } from '../../database/schemas/withdrawal.schema';
import {
  WalletTransaction,
  WalletTransactionSchema,
} from '../../database/schemas/wallet-transaction.schema';
import { User, UserSchema } from '../user/schemas/user.schema';
import { TaskModule } from '../task/task.module';
import { WalletController } from './controllers/wallet.controller';
import { AdminWithdrawalController } from './controllers/admin-withdrawal.controller';
import { WalletService } from './services/wallet.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: Withdrawal.name, schema: WithdrawalSchema },
      { name: AdminSetting.name, schema: AdminSettingSchema },
    ]),
    TaskModule,
  ],
  controllers: [WalletController, AdminWithdrawalController],
  providers: [WalletService],
  exports: [WalletService, MongooseModule],
})
export class WalletModule {}
