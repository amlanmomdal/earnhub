import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { RedisService } from '../../../redis/redis.service';
import { paginate } from '../../../database/helpers/pagination.helper';
import { AdminSetting } from '../../../database/schemas/admin-setting.schema';
import { Withdrawal, WithdrawalDocument } from '../../../database/schemas/withdrawal.schema';
import {
  WalletTransaction,
  WalletTransactionDocument,
} from '../../../database/schemas/wallet-transaction.schema';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { TaskService } from '../../task/services/task.service';
import { User, UserDocument } from '../../user/schemas/user.schema';
import { WithdrawDto } from '../dto/withdraw.dto';

@Injectable()
export class WalletService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(WalletTransaction.name)
    private readonly walletTransactionModel: Model<WalletTransactionDocument>,
    @InjectModel(Withdrawal.name)
    private readonly withdrawalModel: Model<WithdrawalDocument>,
    @InjectModel(AdminSetting.name)
    private readonly adminSettingModel: Model<AdminSetting>,
    private readonly redisService: RedisService,
    private readonly taskService: TaskService,
  ) {}

  async getBalance(userId: string) {
    const user = await this.userModel.findById(userId).lean().exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.balance;
  }

  getTransactions(userId: string, query: PaginationDto) {
    return paginate(
      this.walletTransactionModel,
      { userId: new Types.ObjectId(userId) },
      query,
    );
  }

  async claimProfit(userId: string) {
    const hasCompleted = await this.taskService.hasCompletedAllActiveTasksToday(userId);
    if (!hasCompleted) {
      throw new BadRequestException('Complete all active tasks today before claiming profit');
    }

    const claimed = await this.redisService.setIfNotExists(
      `profit_claimed:${userId}`,
      { claimedAt: new Date().toISOString() },
      86400,
    );
    if (!claimed) {
      throw new BadRequestException('Daily profit already claimed');
    }

    const settings = await this.getSettings();

    const session = await this.connection.startSession();
    try {
      let result: { amount: number };
      await session.withTransaction(async () => {
        const user = await this.userModel.findById(userId).session(session).exec();
        if (!user) {
          throw new NotFoundException('User not found');
        }

        const amount = Number((user.balance.approved * settings.dailyProfitRate).toFixed(2));
        const balanceBefore = user.balance.approved;
        user.balance.approved += amount;
        user.balance.totalEarned += amount;
        await user.save({ session });

        await this.walletTransactionModel.create(
          [
            {
              userId: user._id,
              type: 'profit_claim',
              amount,
              description: 'Daily profit claim',
              balanceBefore,
              balanceAfter: user.balance.approved,
            },
          ],
          { session },
        );

        result = { amount };
      });

      return result!;
    } catch (error) {
      await this.redisService.del(`profit_claimed:${userId}`);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async requestWithdrawal(userId: string, dto: WithdrawDto) {
    const settings = await this.getSettings();
    if (dto.amount < settings.minWithdrawalAmount) {
      throw new BadRequestException(
        `Minimum withdrawal amount is ${settings.minWithdrawalAmount}`,
      );
    }

    const session = await this.connection.startSession();
    try {
      let result: WithdrawalDocument;
      await session.withTransaction(async () => {
        const user = await this.userModel.findById(userId).session(session).exec();
        if (!user) {
          throw new NotFoundException('User not found');
        }
        if (dto.amount > user.balance.approved) {
          throw new BadRequestException('Insufficient approved balance');
        }

        const balanceBefore = user.balance.approved;
        user.balance.approved -= dto.amount;
        user.binanceAccount = dto.binanceAccount;
        await user.save({ session });

        const [withdrawal] = await this.withdrawalModel.create(
          [
            {
              userId: user._id,
              amount: dto.amount,
              binanceAccount: dto.binanceAccount,
              status: 'pending',
              requestedAt: new Date(),
            },
          ],
          { session },
        );

        await this.walletTransactionModel.create(
          [
            {
              userId: user._id,
              type: 'withdrawal_debit',
              amount: dto.amount,
              description: 'Withdrawal request placed',
              balanceBefore,
              balanceAfter: user.balance.approved,
            },
          ],
          { session },
        );

        result = withdrawal;
      });

      return result!.toObject();
    } finally {
      await session.endSession();
    }
  }

  listWithdrawals(query: PaginationDto & { status?: string }) {
    const filter: Record<string, unknown> = {};
    if (query.status) {
      filter.status = query.status;
    }
    return paginate(this.withdrawalModel, filter, query);
  }

  async approveWithdrawal(withdrawalId: string, adminNote?: string) {
    const withdrawal = await this.withdrawalModel
      .findByIdAndUpdate(
        withdrawalId,
        { status: 'approved', adminNote: adminNote ?? '', processedAt: new Date() },
        { new: true },
      )
      .lean()
      .exec();
    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }
    return withdrawal;
  }

  async rejectWithdrawal(withdrawalId: string, adminNote?: string) {
    const session = await this.connection.startSession();
    try {
      let result: WithdrawalDocument;
      await session.withTransaction(async () => {
        const withdrawal = await this.withdrawalModel.findById(withdrawalId).session(session).exec();
        if (!withdrawal) {
          throw new NotFoundException('Withdrawal not found');
        }
        if (withdrawal.status !== 'pending') {
          throw new BadRequestException('Only pending withdrawals can be rejected');
        }

        const user = await this.userModel.findById(withdrawal.userId).session(session).exec();
        if (!user) {
          throw new NotFoundException('User not found');
        }

        const balanceBefore = user.balance.approved;
        user.balance.approved += withdrawal.amount;
        await user.save({ session });

        withdrawal.status = 'rejected';
        withdrawal.adminNote = adminNote ?? '';
        withdrawal.processedAt = new Date();
        await withdrawal.save({ session });

        await this.walletTransactionModel.create(
          [
            {
              userId: user._id,
              type: 'withdrawal_refund',
              amount: withdrawal.amount,
              description: 'Withdrawal rejected and refunded',
              balanceBefore,
              balanceAfter: user.balance.approved,
            },
          ],
          { session },
        );

        result = withdrawal;
      });
      return result!.toObject();
    } finally {
      await session.endSession();
    }
  }

  private async getSettings() {
    const existing = await this.adminSettingModel.findOne().exec();
    if (existing) {
      return existing;
    }

    return this.adminSettingModel.create({
      dailyProfitRate: 0.025,
      platformName: 'EarnHub Simulator',
      maintenanceMode: false,
      signupReferralBonus: 10,
      minWithdrawalAmount: 25,
      referralMilestones: { '5': 25, '10': 75, '25': 250, '50': 750 },
    });
  }
}
