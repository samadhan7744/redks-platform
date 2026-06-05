import { BadRequestException, Injectable } from '@nestjs/common';
import { LocalStorageProvider } from './local-storage.provider';
import { StoredFile } from './storage-provider.interface';

const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxImageSizeBytes = 5 * 1024 * 1024;

export type UploadFile = {
  buffer: Buffer;
  originalname?: string;
  mimetype?: string;
  size?: number;
};

@Injectable()
export class StorageService {
  constructor(private readonly localStorageProvider: LocalStorageProvider) {}

  uploadShopPhoto(file: UploadFile) {
    return this.uploadImage(file, 'shops/photos');
  }

  uploadProductPhoto(file: UploadFile) {
    return this.uploadImage(file, 'products/photos');
  }

  uploadRiderPhoto(file: UploadFile) {
    return this.uploadImage(file, 'riders/photos');
  }

  uploadDocument(file: UploadFile, folder = 'documents') {
    return this.uploadImage(file, folder);
  }

  private async uploadImage(
    file: UploadFile,
    folder: string,
  ): Promise<StoredFile> {
    if (!file?.buffer) {
      throw new BadRequestException('File is required');
    }
    if (!file.mimetype || !allowedImageTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Only jpg, png, and webp files are allowed',
      );
    }
    if ((file.size ?? file.buffer.length) > maxImageSizeBytes) {
      throw new BadRequestException('File must be 5MB or smaller');
    }
    return this.localStorageProvider.upload({ file, folder });
  }
}
