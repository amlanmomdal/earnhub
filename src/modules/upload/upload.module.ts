import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UploadController } from './controllers/upload.controller';
import { FileRepository } from './repositories/file.repository';
import { FileMetadata, FileMetadataSchema } from './schemas/file-metadata.schema';
import { UploadService } from './services/upload.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FileMetadata.name, schema: FileMetadataSchema },
    ]),
  ],
  controllers: [UploadController],
  providers: [FileRepository, UploadService],
})
export class UploadModule {}
