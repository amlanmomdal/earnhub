import { Prop, Schema } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false, _id: false })
export class BaseSchema {
  _id!: Types.ObjectId;

  @Prop({ default: false, index: true })
  isDeleted!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}
