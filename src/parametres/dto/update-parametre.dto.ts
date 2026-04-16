import { PartialType } from '@nestjs/swagger';
import { CreateParametreDto } from './create-parametre.dto';

export class UpdateParametreDto extends PartialType(CreateParametreDto) {}
