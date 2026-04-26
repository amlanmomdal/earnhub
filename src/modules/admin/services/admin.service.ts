import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { paginate } from '../../../database/helpers/pagination.helper';
import { ActivityLog } from '../../../database/schemas/activity-log.schema';
import { AdminSetting } from '../../../database/schemas/admin-setting.schema';
import { User } from '../../user/schemas/user.schema';
import { UserService } from '../../user/services/user.service';
import { Task } from '../../../database/schemas/task.schema';
import { UserTaskCompletion } from '../../../database/schemas/user-task-completion.schema';
import { Withdrawal } from '../../../database/schemas/withdrawal.schema';
import { WalletTransaction } from '../../../database/schemas/wallet-transaction.schema';

@Injectable()
export class AdminService {
  constructor(
    private readonly userService: UserService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Task.name) private readonly taskModel: Model<Task>,
    @InjectModel(UserTaskCompletion.name)
    private readonly completionModel: Model<UserTaskCompletion>,
    @InjectModel(Withdrawal.name) private readonly withdrawalModel: Model<Withdrawal>,
    @InjectModel(WalletTransaction.name)
    private readonly walletTransactionModel: Model<WalletTransaction>,
    @InjectModel(ActivityLog.name) private readonly activityLogModel: Model<ActivityLog>,
    @InjectModel(AdminSetting.name)
    private readonly adminSettingModel: Model<AdminSetting>,
  ) {}

  async getDashboard() {
    const [totalUsers, activeUsers, pendingTasks, pendingWithdrawals, totalProfitPaid] =
      await Promise.all([
        this.userModel.countDocuments({ isDeleted: false }).exec(),
        this.userModel.countDocuments({ isActive: true, isDeleted: false }).exec(),
        this.completionModel.countDocuments({ status: 'pending' }).exec(),
        this.withdrawalModel.countDocuments({ status: 'pending' }).exec(),
        this.walletTransactionModel
          .aggregate([
            { $match: { type: 'profit_claim' } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
          ])
          .exec(),
      ]);

    const users = await this.userModel.find({ isDeleted: false }).lean().exec();
    const platformBalance = users.reduce(
      (sum, user) => sum + user.balance.pending + user.balance.approved,
      0,
    );

    return {
      totalUsers,
      activeUsers,
      pendingTasks,
      pendingWithdrawals,
      totalProfitPaid: totalProfitPaid[0]?.total ?? 0,
      platformBalance,
    };
  }

  getActivityLogs(query: PaginationDto) {
    return paginate(this.activityLogModel, {}, query);
  }

  async getSettings() {
    const existing = await this.adminSettingModel.findOne().lean().exec();
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

  async updateSettings(updates: Partial<AdminSetting>) {
    const existing = await this.adminSettingModel.findOne().exec();
    if (!existing) {
      return this.adminSettingModel.create(updates);
    }

    Object.assign(existing, updates);
    await existing.save();
    return existing.toObject();
  }

  createUser(dto: {
    name: string;
    email: string;
    password: string;
    role?: import('../../user/schemas/role.schema').UserRole;
  }) {
    return this.userService.provisionUser(dto);
  }
}
