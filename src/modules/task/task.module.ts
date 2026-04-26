import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityLog, ActivityLogSchema } from '../../database/schemas/activity-log.schema';
import { Task, TaskSchema } from '../../database/schemas/task.schema';
import {
  UserTaskCompletion,
  UserTaskCompletionSchema,
} from '../../database/schemas/user-task-completion.schema';
import {
  WalletTransaction,
  WalletTransactionSchema,
} from '../../database/schemas/wallet-transaction.schema';
import { User, UserSchema } from '../user/schemas/user.schema';
import { TaskController } from './controllers/task.controller';
import { AdminTaskController } from './controllers/admin-task.controller';
import { TaskService } from './services/task.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Task.name, schema: TaskSchema },
      { name: UserTaskCompletion.name, schema: UserTaskCompletionSchema },
      { name: User.name, schema: UserSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: ActivityLog.name, schema: ActivityLogSchema },
    ]),
  ],
  controllers: [TaskController, AdminTaskController],
  providers: [TaskService],
  exports: [TaskService, MongooseModule],
})
export class TaskModule {}
