import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from '../../../database/base/base.schema';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import { UserRole } from './role.schema';

export type UserDocument = HydratedDocument<User>;

@Schema({ _id: false, versionKey: false })
export class WalletBalance {
  @Prop({ type: Number, default: 0 })
  pending!: number;

  @Prop({ type: Number, default: 0 })
  approved!: number;

  @Prop({ type: Number, default: 0 })
  totalEarned!: number;
}

export const WalletBalanceSchema = SchemaFactory.createForClass(WalletBalance);

@Schema({ collection: 'users', timestamps: true, versionKey: false })
export class User extends BaseSchema {
  @Prop({ trim: true, default: '' })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email!: string;

  @Prop({ required: true, select: false })
  passwordHash!: string;

  @Prop({ select: false })
  hashedRefreshToken?: string;

  @Prop({ required: true, enum: Object.values(UserRole), default: UserRole.USER, index: true })
  role!: UserRole;

  @Prop({ required: true, unique: true, uppercase: true, trim: true, index: true })
  referralCode!: string;

  @Prop({ type: Types.ObjectId, ref: User.name, default: null, index: true })
  referredBy?: Types.ObjectId | null;

  @Prop({ type: WalletBalanceSchema, default: () => ({}) })
  balance!: WalletBalance;

  @Prop({ default: 'pending', enum: ['pending', 'approved', 'rejected'], index: true })
  kycStatus!: 'pending' | 'approved' | 'rejected';

  @Prop({ trim: true, default: '' })
  binanceAccount!: string;

  @Prop({ default: true, index: true })
  isActive!: boolean;

  @Prop({ default: false, index: true })
  isBanned!: boolean;

  @Prop({ type: Date, default: null })
  lastLoginAt?: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ role: 1, createdAt: -1 });
UserSchema.plugin(softDeletePlugin);
