import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../common/types/auth-user.type';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@ApiTags('Addresses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get(['addresses', 'me/addresses'])
  mine(@CurrentUser() user: AuthUser) {
    return this.addressesService.findForUser(user.sub);
  }

  @Post(['addresses', 'me/addresses'])
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAddressDto) {
    return this.addressesService.create(user.sub, dto);
  }

  @Patch('me/addresses/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.update(user.sub, id, dto);
  }

  @Delete('me/addresses/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.addressesService.remove(user.sub, id);
  }

  @Patch('me/addresses/:id/default')
  setDefault(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.addressesService.setDefault(user.sub, id);
  }
}
