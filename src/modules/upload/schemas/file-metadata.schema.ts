import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from '../../../database/base/base.schema';
import { User } from '../../user/schemas/user.schema';

export type FileMetadataDocument = HydratedDocument<FileMetadata>;

@Schema({ collection: 'files', timestamps: true, versionKey: false })
export class FileMetadata extends BaseSchema {
  @Prop({ required: true, index: true })
  key!: string;

  @Prop({ required: true })
  originalName!: string;

  @Prop({ required: true })
  mimeType!: string;

  @Prop({ required: true })
  size!: number;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  uploadedBy!: Types.ObjectId;
}

export const FileMetadataSchema = SchemaFactory.createForClass(FileMetadata);
FileMetadataSchema.index({ uploadedBy: 1, createdAt: -1 });
