import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityLog, ActivityLogSchema } from '../../database/schemas/activity-log.schema';
import { AdminSetting, AdminSettingSchema } from '../../database/schemas/admin-setting.schema';
import { Task, TaskSchema } from '../../database/schemas/task.schema';
import { UserTaskCompletion, UserTaskCompletionSchema } from '../../database/schemas/user-task-completion.schema';
import { Withdrawal, WithdrawalSchema } from '../../database/schemas/withdrawal.schema';
import { WalletTransaction, WalletTransactionSchema } from '../../database/schemas/wallet-transaction.schema';
import { UserModule } from '../user/user.module';
import { User, UserSchema } from '../user/schemas/user.schema';
import { AdminController } from './controllers/admin.controller';
import { AdminService } from './services/admin.service';

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Task.name, schema: TaskSchema },
      { name: UserTaskCompletion.name, schema: UserTaskCompletionSchema },
      { name: Withdrawal.name, schema: WithdrawalSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: ActivityLog.name, schema: ActivityLogSchema },
      { name: AdminSetting.name, schema: AdminSettingSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
