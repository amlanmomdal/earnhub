import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  paginate,
  PaginatedResult,
  PaginationQuery,
} from '../../../database/helpers/pagination.helper';
import { CreateUserDto } from '../dto/create-user.dto';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class UserRepository {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  create(
    payload: Partial<CreateUserDto> & {
      passwordHash: string;
      role: string;
      referralCode: string;
      referredBy?: Types.ObjectId | null;
    } & Record<string, unknown>,
  ) {
    return this.userModel.create(payload);
  }

  findById(userId: string) {
    return this.userModel.findById(userId).lean().exec();
  }

  findByEmail(email: string, includeSecrets = false) {
    const query = this.userModel.findOne({ email });
    if (includeSecrets) {
      query.select('+passwordHash +hashedRefreshToken');
    }

    return query.exec();
  }

  findByReferralCode(referralCode: string) {
    return this.userModel.findOne({ referralCode }).exec();
  }

  async findOrFail(userId: string) {
    const user = await this.userModel.findById(userId).lean().exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  findAll(
    filter: Record<string, unknown>,
    query: PaginationQuery,
  ): Promise<PaginatedResult<User>> {
    return paginate(this.userModel, filter, query);
  }

  async updateRefreshToken(userId: string, hashedRefreshToken: string | null) {
    await this.userModel
      .findByIdAndUpdate(userId, { hashedRefreshToken }, { new: true })
      .exec();
  }

  async updateProfile(userId: string, updates: Partial<User>) {
    const user = await this.userModel
      .findByIdAndUpdate(userId, updates, { new: true })
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async aggregateUsersByRole() {
    return this.userModel.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$role', totalUsers: { $sum: 1 } } },
      { $project: { _id: 0, role: '$_id', totalUsers: 1 } },
      { $sort: { totalUsers: -1 } },
    ]);
  }
}
