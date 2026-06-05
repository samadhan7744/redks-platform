import { Module } from '@nestjs/common';
import { LocalStorageProvider } from './local-storage.provider';
import { MediaController } from './media.controller';
import { StorageService } from './storage.service';

@Module({
  controllers: [MediaController],
  providers: [StorageService, LocalStorageProvider],
  exports: [StorageService],
})
export class MediaModule {}
