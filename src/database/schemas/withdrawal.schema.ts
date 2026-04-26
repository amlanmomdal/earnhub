import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from '../base/base.schema';
import { User } from '../../modules/user/schemas/user.schema';

export type WithdrawalDocument = HydratedDocument<Withdrawal>;

@Schema({ collection: 'withdrawals', timestamps: true, versionKey: false })
export class Withdrawal extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amount!: number;

  @Prop({ required: true, trim: true })
  binanceAccount!: string;

  @Prop({ required: true, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true })
  status!: 'pending' | 'approved' | 'rejected';

  @Prop({ trim: true, default: '' })
  adminNote!: string;

  @Prop({ type: Date, default: Date.now })
  requestedAt!: Date;

  @Prop({ type: Date, default: null })
  processedAt?: Date | null;
}

export const WithdrawalSchema = SchemaFactory.createForClass(Withdrawal);
WithdrawalSchema.index({ userId: 1, status: 1 });
