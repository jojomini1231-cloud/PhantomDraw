import {
  BadGatewayException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import * as path from 'path';

@Injectable()
export class ObjectStorageService implements OnModuleInit {
  private readonly logger = new Logger(ObjectStorageService.name);
  private readonly bucket: string;
  private readonly endpointUrl: string;
  private readonly publicBackendUrl: string;
  private readonly client: S3Client;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('S3_BUCKET', 'phantomdraw');
    this.endpointUrl = this.resolveEndpointUrl();
    this.publicBackendUrl = this.resolvePublicBackendUrl();

    this.client = new S3Client({
      region: this.configService.get<string>('S3_REGION', 'us-east-1'),
      endpoint: this.endpointUrl,
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.configService.get<string>('S3_ACCESS_KEY', ''),
        secretAccessKey: this.configService.get<string>('S3_SECRET_KEY', ''),
      },
    });
  }

  async onModuleInit() {
    await this.ensureBucketExists();
  }

  buildAssetUrl(taskId: string): string {
    return `${this.publicBackendUrl}/api/generate/assets/${encodeURIComponent(taskId)}`;
  }

  async storeGeneratedImage(
    taskId: string,
    imageSource: string,
  ): Promise<{ storageKey: string; imageUrl: string }> {
    const { buffer, mimeType, extension } =
      await this.loadImageSource(imageSource);
    const storageKey = this.buildStorageKey(taskId, extension);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: buffer,
        ContentType: mimeType,
        ContentLength: buffer.length,
      }),
    );

    return {
      storageKey,
      imageUrl: this.buildAssetUrl(taskId),
    };
  }

  async getStoredImage(
    storageKey: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
        }),
      );

      if (!response.Body) {
        throw new NotFoundException('Stored image body is empty');
      }

      const bytes = await response.Body.transformToByteArray();
      return {
        buffer: Buffer.from(bytes),
        contentType: response.ContentType || 'application/octet-stream',
      };
    } catch (error: unknown) {
      const s3Error = error as {
        $metadata?: { httpStatusCode?: number };
        name?: string;
      };
      if (
        s3Error?.$metadata?.httpStatusCode === 404 ||
        s3Error?.name === 'NoSuchKey'
      ) {
        throw new NotFoundException('Stored image not found');
      }

      throw error;
    }
  }

  private async ensureBucketExists() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error: unknown) {
      const s3Error = error as {
        $metadata?: { httpStatusCode?: number };
        name?: string;
      };
      if (
        s3Error?.$metadata?.httpStatusCode !== 404 &&
        s3Error?.name !== 'NotFound'
      ) {
        throw error;
      }

      this.logger.log(
        `Bucket ${this.bucket} not found. Creating it on ${this.endpointUrl}.`,
      );
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  private async loadImageSource(
    imageSource: string,
  ): Promise<{ buffer: Buffer; mimeType: string; extension: string }> {
    if (/^https?:\/\//i.test(imageSource)) {
      const response = await fetch(imageSource);
      if (!response.ok) {
        throw new BadGatewayException(
          `Failed to download generated image: ${response.status}`,
        );
      }

      const mimeType =
        response.headers.get('content-type')?.split(';')[0] ||
        this.detectMimeTypeFromPath(imageSource) ||
        'image/png';

      if (!mimeType.toLowerCase().startsWith('image/')) {
        throw new BadGatewayException(
          `Generated image response was not an image: ${mimeType}`,
        );
      }

      const arrayBuffer = await response.arrayBuffer();

      return {
        buffer: Buffer.from(arrayBuffer),
        mimeType,
        extension: this.extensionFromMimeType(mimeType, imageSource),
      };
    }

    const dataUrlMatch = imageSource.match(
      /^data:(image\/[\w.+-]+);base64,(.*)$/s,
    );
    if (dataUrlMatch) {
      const mimeType = dataUrlMatch[1];
      const base64Payload = dataUrlMatch[2];

      return {
        buffer: Buffer.from(base64Payload, 'base64'),
        mimeType,
        extension: this.extensionFromMimeType(mimeType),
      };
    }

    throw new BadGatewayException('Unsupported generated image format');
  }

  private buildStorageKey(taskId: string, extension: string): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    return `generated/${year}/${month}/${day}/${taskId}.${extension}`;
  }

  private extensionFromMimeType(mimeType: string, inputPath?: string): string {
    const normalized = mimeType.toLowerCase();
    if (normalized.includes('png')) return 'png';
    if (normalized.includes('jpeg') || normalized.includes('jpg')) return 'jpg';
    if (normalized.includes('webp')) return 'webp';
    if (normalized.includes('gif')) return 'gif';
    if (normalized.includes('svg')) return 'svg';

    if (inputPath) {
      const pathname = this.safePathname(inputPath);
      const extension = path.extname(pathname).replace('.', '').toLowerCase();
      if (extension) {
        return extension;
      }
    }

    return 'png';
  }

  private detectMimeTypeFromPath(inputPath: string): string | null {
    const extension = path.extname(this.safePathname(inputPath)).toLowerCase();
    if (extension === '.png') return 'image/png';
    if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
    if (extension === '.webp') return 'image/webp';
    if (extension === '.gif') return 'image/gif';
    if (extension === '.svg') return 'image/svg+xml';
    return null;
  }

  private safePathname(inputPath: string): string {
    try {
      return new URL(inputPath).pathname;
    } catch {
      return inputPath;
    }
  }

  private resolveEndpointUrl(): string {
    const rawEndpoint = this.configService
      .get<string>('S3_ENDPOINT', '127.0.0.1')
      .trim();
    if (/^https?:\/\//i.test(rawEndpoint)) {
      return rawEndpoint.replace(/\/+$/, '');
    }

    const port = this.configService.get<string>('S3_PORT', '9000');
    const useSsl =
      this.configService.get<string>('S3_USE_SSL', 'false') === 'true';
    return `${useSsl ? 'https' : 'http'}://${rawEndpoint}${port ? `:${port}` : ''}`;
  }

  private resolvePublicBackendUrl(): string {
    const configuredUrl =
      this.configService.get<string>('BACKEND_PUBLIC_URL') ||
      `http://localhost:${this.configService.get<string>('PORT', '3001')}`;

    return configuredUrl.replace(/\/+$/, '');
  }
}
