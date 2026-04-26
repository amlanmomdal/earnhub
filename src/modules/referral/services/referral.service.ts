import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { AdminSetting } from '../../../database/schemas/admin-setting.schema';
import { Referral } from '../../../database/schemas/referral.schema';
import { WalletTransaction } from '../../../database/schemas/wallet-transaction.schema';
import { User, UserDocument } from '../../user/schemas/user.schema';

@Injectable()
export class ReferralService {
  constructor(
    @InjectModel(Referral.name) private readonly referralModel: Model<Referral>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(WalletTransaction.name)
    private readonly walletTransactionModel: Model<WalletTransaction>,
    @InjectModel(AdminSetting.name)
    private readonly adminSettingModel: Model<AdminSetting>,
    private readonly configService: ConfigService,
  ) {}

  async handleSignupReferral(referrerId: string, referredUserId: string) {
    const existing = await this.referralModel
      .findOne({
        referrerId: new Types.ObjectId(referrerId),
        referredUserId: new Types.ObjectId(referredUserId),
      })
      .exec();
    if (existing) {
      return existing;
    }

    const settings = await this.getSettings();
    const referrer = await this.userModel.findById(referrerId).exec();
    if (!referrer) {
      throw new NotFoundException('Referrer not found');
    }

    const balanceBefore = referrer.balance.pending;
    referrer.balance.pending += settings.signupReferralBonus;
    referrer.balance.totalEarned += settings.signupReferralBonus;
    await referrer.save();

    await this.walletTransactionModel.create({
      userId: referrer._id,
      type: 'referral_bonus',
      amount: settings.signupReferralBonus,
      description: 'Referral sign up bonus',
      balanceBefore,
      balanceAfter: referrer.balance.pending,
    });

    const totalReferred = await this.referralModel.countDocuments({
      referrerId: referrer._id,
    });
    const milestoneTriggered =
      String(totalReferred + 1) in settings.referralMilestones
        ? String(totalReferred + 1)
        : '';

    if (milestoneTriggered) {
      const milestoneBonus = settings.referralMilestones[milestoneTriggered];
      const milestoneBalanceBefore = referrer.balance.pending;
      referrer.balance.pending += milestoneBonus;
      referrer.balance.totalEarned += milestoneBonus;
      await referrer.save();

      await this.walletTransactionModel.create({
        userId: referrer._id,
        type: 'referral_bonus',
        amount: milestoneBonus,
        description: `Referral milestone ${milestoneTriggered} bonus`,
        balanceBefore: milestoneBalanceBefore,
        balanceAfter: referrer.balance.pending,
      });
    }

    return this.referralModel.create({
      referrerId: referrer._id,
      referredUserId: new Types.ObjectId(referredUserId),
      bonusEarned:
        settings.signupReferralBonus +
        (milestoneTriggered ? settings.referralMilestones[milestoneTriggered] : 0),
      milestoneTriggered,
    });
  }

  async getMyLink(userId: string) {
    const user = await this.userModel.findById(userId).lean().exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      referralCode: user.referralCode,
      referralLink: `${this.configService.get<string>('app.frontendUrl')}/register?ref=${user.referralCode}`,
    };
  }

  async getStats(userId: string) {
    const [totalReferred, bonuses, settings] = await Promise.all([
      this.referralModel.countDocuments({ referrerId: new Types.ObjectId(userId) }).exec(),
      this.referralModel
        .aggregate([
          { $match: { referrerId: new Types.ObjectId(userId) } },
          { $group: { _id: null, totalBonusEarned: { $sum: '$bonusEarned' } } },
        ])
        .exec(),
      this.getSettings(),
    ]);

    return {
      totalReferred,
      totalBonusEarned: bonuses[0]?.totalBonusEarned ?? 0,
      milestones: Object.entries(settings.referralMilestones).map(([count, bonus]) => ({
        count: Number(count),
        bonus,
        achieved: totalReferred >= Number(count),
      })),
    };
  }

  async listReferredUsers(userId: string) {
    return this.referralModel
      .find({ referrerId: new Types.ObjectId(userId) })
      .populate('referredUserId', 'email name createdAt')
      .lean()
      .exec();
  }

  private async getSettings() {
    const existing = await this.adminSettingModel.findOne().lean().exec();
    if (existing) {
      return existing;
    }

    return this.adminSettingModel.create({
      dailyProfitRate: this.configService.get<number>('earnhub.dailyProfitRate'),
      platformName: 'EarnHub Simulator',
      maintenanceMode: false,
      signupReferralBonus: this.configService.get<number>('earnhub.signupReferralBonus'),
      minWithdrawalAmount: this.configService.get<number>('earnhub.minWithdrawalAmount'),
      referralMilestones: this.configService.get<Record<string, number>>(
        'earnhub.referralMilestones',
      ),
    });
  }
}
