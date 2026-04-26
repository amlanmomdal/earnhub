import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly signedUrlExpiresIn: number;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('aws.region', '');
    const accessKeyId = this.configService.get<string>('aws.accessKeyId', '');
    const secretAccessKey = this.configService.get<string>(
      'aws.secretAccessKey',
      '',
    );
    this.bucket = this.configService.get<string>('aws.s3Bucket', '');
    this.signedUrlExpiresIn = this.configService.get<number>(
      'aws.signedUrlExpiresIn',
      900,
    );
    this.enabled = Boolean(
      region && accessKeyId && secretAccessKey && this.bucket,
    );
    this.client = new S3Client({
      region: region || 'ap-south-1',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    if (!this.enabled) {
      this.logger.warn(
        'AWS S3 credentials are not configured. Upload endpoints will stay unavailable until AWS env vars are provided.',
      );
    }
  }

  private ensureEnabled() {
    if (!this.enabled) {
      throw new ServiceUnavailableException(
        'S3 upload is not configured for this environment',
      );
    }
  }

  async uploadFile(file: Express.Multer.File, key: string): Promise<string> {
    this.ensureEnabled();

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return key;
  }

  async deleteFile(key: string): Promise<void> {
    this.ensureEnabled();

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async getSignedUrl(key: string): Promise<string> {
    this.ensureEnabled();

    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
      { expiresIn: this.signedUrlExpiresIn },
    );
  }
}
