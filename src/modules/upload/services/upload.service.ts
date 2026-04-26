import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FileRepository } from '../repositories/file.repository';
import { S3Service } from '../../../s3/s3.service';

@Injectable()
export class UploadService {
  constructor(
    private readonly fileRepository: FileRepository,
    private readonly s3Service: S3Service,
  ) {}

  async uploadFile(file: Express.Multer.File, userId: string) {
    const key = `uploads/${userId}/${randomUUID()}-${file.originalname}`;
    await this.s3Service.uploadFile(file, key);
    const metadata = await this.fileRepository.create({
      key,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      uploadedBy: userId,
    });

    return {
      id: metadata.id,
      key,
      signedUrl: await this.s3Service.getSignedUrl(key),
    };
  }

  async deleteFile(fileId: string) {
    const metadata = await this.fileRepository.remove(fileId);
    await this.s3Service.deleteFile(metadata.key);
  }
}
