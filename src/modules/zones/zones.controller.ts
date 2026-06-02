import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZonesService } from './zones.service';

@ApiTags('Zones')
@Controller('zones')
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Get()
  findAll(@Query('cityId') cityId?: string) {
    return this.zonesService.findAll(cityId);
  }
}
