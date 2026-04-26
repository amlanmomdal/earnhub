import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from '../base/base.schema';
import { User } from '../../modules/user/schemas/user.schema';

export type ActivityLogDocument = HydratedDocument<ActivityLog>;

@Schema({ collection: 'activityLogs', timestamps: true, versionKey: false })
export class ActivityLog extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: User.name, default: null, index: true })
  userId?: Types.ObjectId | null;

  @Prop({ required: true, trim: true, index: true })
  action!: string;

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, unknown>;

  @Prop({ trim: true, default: '' })
  ipAddress!: string;

  @Prop({ trim: true, default: '' })
  userAgent!: string;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);
ActivityLogSchema.index({ action: 1, createdAt: -1 });
