import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../base/base.schema';

export type TaskDocument = HydratedDocument<Task>;

@Schema({ collection: 'tasks', timestamps: true, versionKey: false })
export class Task extends BaseSchema {
  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({ required: true, trim: true, index: true })
  category!: string;

  @Prop({ required: true, trim: true, index: true })
  difficulty!: string;

  @Prop({ required: true, min: 0 })
  rewardAmount!: number;

  @Prop({ type: [String], default: [] })
  requirements!: string[];

  @Prop({ default: true, index: true })
  isActive!: boolean;

  @Prop({ type: Date, required: true, index: true })
  deadline!: Date;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
TaskSchema.index({ category: 1, difficulty: 1, rewardAmount: -1 });
