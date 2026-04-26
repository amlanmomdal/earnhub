import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from '../base/base.schema';
import { User } from '../../modules/user/schemas/user.schema';

export type WalletTransactionDocument = HydratedDocument<WalletTransaction>;

@Schema({ collection: 'walletTransactions', timestamps: true, versionKey: false })
export class WalletTransaction extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['profit_claim', 'referral_bonus', 'withdrawal_debit', 'admin_credit', 'task_reward', 'withdrawal_refund'],
    index: true,
  })
  type!:
    | 'profit_claim'
    | 'referral_bonus'
    | 'withdrawal_debit'
    | 'admin_credit'
    | 'task_reward'
    | 'withdrawal_refund';

  @Prop({ required: true })
  amount!: number;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({ required: true })
  balanceBefore!: number;

  @Prop({ required: true })
  balanceAfter!: number;
}

export const WalletTransactionSchema =
  SchemaFactory.createForClass(WalletTransaction);
WalletTransactionSchema.index({ userId: 1, createdAt: -1 });
