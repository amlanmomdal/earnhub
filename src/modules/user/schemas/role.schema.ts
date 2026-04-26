import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../database/base/base.schema';

export type RoleDocument = HydratedDocument<Role>;

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPPORT = 'support',
}

@Schema({ collection: 'roles', timestamps: true, versionKey: false })
export class Role extends BaseSchema {
  @Prop({ required: true, unique: true, enum: Object.values(UserRole), index: true })
  name!: UserRole;

  @Prop({ type: [String], default: [] })
  permissions!: string[];
}

export const RoleSchema = SchemaFactory.createForClass(Role);
