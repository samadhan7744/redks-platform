import { PartialType } from '@nestjs/mapped-types';
import { CreateRiderProfileDto } from './create-rider-profile.dto';

export class UpdateRiderProfileDto extends PartialType(CreateRiderProfileDto) {}
