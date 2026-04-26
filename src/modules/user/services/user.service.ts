import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { hashValue } from '../../../common/utils/password.util';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { paginate } from '../../../database/helpers/pagination.helper';
import { Referral } from '../../../database/schemas/referral.schema';
import {
  WalletTransaction,
  WalletTransactionDocument,
} from '../../../database/schemas/wallet-transaction.schema';
import { RedisService } from '../../../redis/redis.service';
import { UserRepository } from '../repositories/user.repository';
import { User, UserDocument } from '../schemas/user.schema';
import { UserRole } from '../schemas/role.schema';
import { UpdateProfileDto } from '../dto/update-profile.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly redisService: RedisService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(WalletTransaction.name)
    private readonly walletTransactionModel: Model<WalletTransactionDocument>,
    @InjectModel(Referral.name) private readonly referralModel: Model<Referral>,
  ) {}

  async getProfile(userId: string) {
    const cacheKey = `users:profile:${userId}`;
    const cachedProfile = await this.redisService.get(cacheKey);
    if (cachedProfile) {
      return cachedProfile;
    }

    const profile = await this.userRepository.findOrFail(userId);
    await this.redisService.set(cacheKey, profile, 300);
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const profile = await this.userRepository.updateProfile(userId, dto as never);
    await this.redisService.set(`users:profile:${userId}`, profile, 300);
    return profile;
  }

  async getMyTransactions(userId: string, query: PaginationDto) {
    return paginate(
      this.walletTransactionModel,
      { userId: new Types.ObjectId(userId) },
      query,
    );
  }

  async getMyReferrals(userId: string) {
    return this.referralModel
      .find({ referrerId: new Types.ObjectId(userId) })
      .populate('referredUserId', 'email name createdAt')
      .lean()
      .exec();
  }

  listUsers(query: PaginationDto & { status?: string; kycStatus?: string; search?: string }) {
    const filter: Record<string, unknown> = { isDeleted: false };
    if (query.status === 'active') filter.isActive = true;
    if (query.status === 'inactive') filter.isActive = false;
    if (query.kycStatus) filter.kycStatus = query.kycStatus;
    if (query.search) filter.email = { $regex: query.search, $options: 'i' };

    return paginate(this.userModel, filter, query);
  }

  async getUserDetail(userId: string) {
    const user = await this.userModel.findById(userId).lean().exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateUserStatus(
    userId: string,
    status: 'active' | 'inactive' | 'banned',
  ) {
    const updates =
      status === 'banned'
        ? { isBanned: true, isActive: false }
        : { isBanned: false, isActive: status === 'active' };

    const user = await this.userModel
      .findByIdAndUpdate(userId, updates, { new: true })
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async creditUser(userId: string, amount: number, reason: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const balanceBefore = user.balance.approved;
    user.balance.approved += amount;
    user.balance.totalEarned += amount;
    await user.save();

    await this.walletTransactionModel.create({
      userId: user._id,
      type: 'admin_credit',
      amount,
      description: reason,
      balanceBefore,
      balanceAfter: user.balance.approved,
    });

    return user.toObject();
  }

  getRoleDistribution() {
    return this.userRepository.aggregateUsersByRole();
  }

  async provisionUser(input: {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
  }) {
    const passwordHash = await hashValue(input.password);
    return this.userRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role ?? UserRole.USER,
      referralCode: `${input.email.split('@')[0].slice(0, 4).toUpperCase()}${Date.now().toString().slice(-6)}`,
      balance: { pending: 0, approved: 0, totalEarned: 0 },
    });
  }
}
