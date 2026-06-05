import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { extname, join } from 'path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  StorageProvider,
  StorageUploadInput,
  StoredFile,
} from './storage-provider.interface';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly rootDir: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.rootDir = this.configService.get<string>('UPLOAD_ROOT_DIR', 'uploads');
    this.publicBaseUrl = this.configService.get<string>(
      'UPLOAD_PUBLIC_BASE_URL',
      '/uploads',
    );
  }

  async upload(input: StorageUploadInput): Promise<StoredFile> {
    const extension =
      extname(input.file.originalname ?? '').toLowerCase() ||
      this.extensionFor(input.file.mimetype);
    const filename = `${Date.now()}-${randomUUID()}${extension}`;
    const folder = input.folder.replace(/[^a-zA-Z0-9/_-]/g, '-');
    const targetDir = join(process.cwd(), this.rootDir, folder);
    await fs.mkdir(targetDir, { recursive: true });
    const targetPath = join(targetDir, filename);
    await fs.writeFile(targetPath, input.file.buffer);
    const publicPath =
      `${this.publicBaseUrl.replace(/\/$/, '')}/${folder}/${filename}`.replace(
        /\\/g,
        '/',
      );
    return {
      url: publicPath,
      path: targetPath,
      originalName: input.file.originalname,
      mimeType: input.file.mimetype,
      sizeBytes: input.file.size,
    };
  }

  private extensionFor(mimeType?: string) {
    if (mimeType === 'image/png') return '.png';
    if (mimeType === 'image/webp') return '.webp';
    return '.jpg';
  }
}
