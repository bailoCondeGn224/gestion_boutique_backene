import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateModeVenteDto } from './create-mode-vente.dto';

export class UpdateModeVenteDto extends PartialType(
  OmitType(CreateModeVenteDto, ['articleId'] as const),
) {}
