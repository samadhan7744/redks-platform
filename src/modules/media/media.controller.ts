import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ok } from '../../common/utils/api-response.util';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { StorageService, UploadFile } from './storage.service';

@ApiTags('Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly storageService: StorageService) {}

  @Post('shop-photo')
  @Roles(UserRole.SHOP_OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadShopPhoto(@UploadedFile() file: UploadFile) {
    return ok(
      await this.storageService.uploadShopPhoto(file),
      'Shop photo uploaded',
    );
  }

  @Post('product-photo')
  @Roles(UserRole.SHOP_OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadProductPhoto(@UploadedFile() file: UploadFile) {
    return ok(
      await this.storageService.uploadProductPhoto(file),
      'Product photo uploaded',
    );
  }

  @Post('rider-photo')
  @Roles(UserRole.RIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadRiderPhoto(@UploadedFile() file: UploadFile) {
    return ok(
      await this.storageService.uploadRiderPhoto(file),
      'Rider photo uploaded',
    );
  }

  @Post('documents')
  @Roles(
    UserRole.SHOP_OWNER,
    UserRole.RIDER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        ownerType: { type: 'string' },
        ownerId: { type: 'string' },
        type: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: UploadFile,
    @Body() dto: UploadDocumentDto,
  ) {
    const ownerFolder = [
      dto.ownerType?.toLowerCase(),
      dto.ownerId,
      dto.type?.toLowerCase(),
    ]
      .filter(Boolean)
      .join('/');
    return ok(
      await this.storageService.uploadDocument(
        file,
        `documents/${ownerFolder || 'general'}`,
      ),
      'Document uploaded',
    );
  }
}
