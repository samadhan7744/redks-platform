export type StoredFile = {
  url: string;
  path: string;
  originalName?: string;
  mimeType?: string;
  sizeBytes?: number;
};

export type StorageUploadInput = {
  file: {
    buffer: Buffer;
    originalname?: string;
    mimetype?: string;
    size?: number;
  };
  folder: string;
};

export interface StorageProvider {
  upload(input: StorageUploadInput): Promise<StoredFile>;
}

export interface CloudflareR2StorageProvider extends StorageProvider {
  readonly provider: 'cloudflare-r2';
}
