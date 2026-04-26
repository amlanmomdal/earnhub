import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from '../base/base.schema';
import { Task } from './task.schema';
import { User } from '../../modules/user/schemas/user.schema';

export type UserTaskCompletionDocument = HydratedDocument<UserTaskCompletion>;

@Schema({ collection: 'userTaskCompletions', timestamps: true, versionKey: false })
export class UserTaskCompletion extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Task.name, required: true, index: true })
  taskId!: Types.ObjectId;

  @Prop({ trim: true, default: '' })
  proofUrl!: string;

  @Prop({ required: true, enum: ['image', 'video', 'text'] })
  proofType!: 'image' | 'video' | 'text';

  @Prop({ trim: true, default: '' })
  proofText!: string;

  @Prop({ required: true, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true })
  status!: 'pending' | 'approved' | 'rejected';

  @Prop({ trim: true, default: '' })
  rejectionReason!: string;

  @Prop({ type: Date, default: Date.now, index: true })
  submittedAt!: Date;

  @Prop({ type: Date, default: null })
  reviewedAt?: Date | null;

  @Prop({ type: Types.ObjectId, ref: User.name, default: null })
  reviewedBy?: Types.ObjectId | null;

  @Prop({ type: Date, required: true, index: true })
  submissionDate!: Date;

  @Prop({ type: Number, default: 0 })
  resubmissionCount!: number;
}

export const UserTaskCompletionSchema =
  SchemaFactory.createForClass(UserTaskCompletion);
UserTaskCompletionSchema.index({ userId: 1, taskId: 1, submissionDate: 1 }, { unique: true });
