import { PartialType } from '@nestjs/mapped-types';
import { CreateDepenseDto } from './create-depense.dto';

/**
 * DTO pour la mise à jour d'une dépense
 * Tous les champs de CreateDepenseDto deviennent optionnels
 */
export class UpdateDepenseDto extends PartialType(CreateDepenseDto) {}
