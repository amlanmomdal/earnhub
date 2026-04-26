import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminSetting, AdminSettingSchema } from '../../database/schemas/admin-setting.schema';
import { Referral, ReferralSchema } from '../../database/schemas/referral.schema';
import {
  WalletTransaction,
  WalletTransactionSchema,
} from '../../database/schemas/wallet-transaction.schema';
import { User, UserSchema } from '../user/schemas/user.schema';
import { ReferralController } from './controllers/referral.controller';
import { ReferralService } from './services/referral.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Referral.name, schema: ReferralSchema },
      { name: User.name, schema: UserSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: AdminSetting.name, schema: AdminSettingSchema },
    ]),
  ],
  controllers: [ReferralController],
  providers: [ReferralService],
  exports: [ReferralService, MongooseModule],
})
export class ReferralModule {}
