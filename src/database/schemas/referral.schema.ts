import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from '../base/base.schema';
import { User } from '../../modules/user/schemas/user.schema';

export type ReferralDocument = HydratedDocument<Referral>;

@Schema({ collection: 'referrals', timestamps: true, versionKey: false })
export class Referral extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  referrerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  referredUserId!: Types.ObjectId;

  @Prop({ required: true, default: 0 })
  bonusEarned!: number;

  @Prop({ trim: true, default: '' })
  milestoneTriggered!: string;
}

export const ReferralSchema = SchemaFactory.createForClass(Referral);
ReferralSchema.index({ referrerId: 1, referredUserId: 1 }, { unique: true });
