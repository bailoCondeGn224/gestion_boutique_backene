import {
  IsEnum,
  IsOptional,
  IsDateString,
  IsString,
  IsInt,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { TypeDepense, CategorieDepense } from '../entities/depense.entity';

/**
 * DTO pour filtrer les dépenses
 * Permet de rechercher par période, type, catégorie, etc.
 */
export class DepenseFilterDto {
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsDateString(
    {},
    { message: 'La date de début doit être au format ISO (YYYY-MM-DD)' },
  )
  @IsOptional()
  dateDebut?: string;

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsDateString(
    {},
    { message: 'La date de fin doit être au format ISO (YYYY-MM-DD)' },
  )
  @IsOptional()
  dateFin?: string;

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsEnum(TypeDepense, {
    message: 'Le type de dépense doit être valide',
  })
  @IsOptional()
  type?: TypeDepense;

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsEnum(CategorieDepense, {
    message: 'La catégorie doit être FIXE, VARIABLE ou EXCEPTIONNELLE',
  })
  @IsOptional()
  categorie?: CategorieDepense;

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsString({ message: 'La recherche doit être une chaîne de caractères' })
  @IsOptional()
  search?: string;

  @IsInt({ message: 'La page doit être un nombre entier' })
  @Min(1, { message: 'La page doit être supérieure ou égale à 1' })
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @IsInt({ message: 'La limite doit être un nombre entier' })
  @Min(1, { message: 'La limite doit être supérieure ou égale à 1' })
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;
}
