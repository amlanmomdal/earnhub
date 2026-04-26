import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FileMetadata } from '../schemas/file-metadata.schema';

@Injectable()
export class FileRepository {
  constructor(
    @InjectModel(FileMetadata.name)
    private readonly fileModel: Model<FileMetadata>,
  ) {}

  create(payload: {
    key: string;
    originalName: string;
    mimeType: string;
    size: number;
    uploadedBy: string;
  }) {
    return this.fileModel.create({
      ...payload,
      uploadedBy: new Types.ObjectId(payload.uploadedBy),
    });
  }

  async findOrFail(id: string) {
    const file = await this.fileModel.findById(id).lean().exec();
    if (!file) {
      throw new NotFoundException('File metadata not found');
    }

    return file;
  }

  async remove(id: string) {
    const file = await this.fileModel.findByIdAndDelete(id).lean().exec();
    if (!file) {
      throw new NotFoundException('File metadata not found');
    }

    return file;
  }
}
