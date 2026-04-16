import { PartialType } from '@nestjs/swagger';
import { CreateVersementClientDto } from './create-versement-client.dto';

export class UpdateVersementClientDto extends PartialType(CreateVersementClientDto) {}
