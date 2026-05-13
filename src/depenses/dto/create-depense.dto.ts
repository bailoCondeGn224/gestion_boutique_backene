import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  Min,
  MaxLength,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TypeDepense, CategorieDepense, TYPE_TO_CATEGORIE_MAP } from '../entities/depense.entity';

/**
 * Validateur personnalisé pour vérifier la cohérence entre type et catégorie
 */
@ValidatorConstraint({ name: 'isValidTypeCategorie', async: false })
export class IsValidTypeCategorieConstraint implements ValidatorConstraintInterface {
  validate(categorie: CategorieDepense, args: ValidationArguments) {
    const obj = args.object as CreateDepenseDto;
    const expectedCategorie = TYPE_TO_CATEGORIE_MAP[obj.type];
    return categorie === expectedCategorie;
  }

  defaultMessage(args: ValidationArguments) {
    const obj = args.object as CreateDepenseDto;
    const expectedCategorie = TYPE_TO_CATEGORIE_MAP[obj.type];
    return `La catégorie pour le type "${obj.type}" doit être "${expectedCategorie}"`;
  }
}

/**
 * DTO pour la création d'une dépense
 */
export class CreateDepenseDto {
  @IsEnum(TypeDepense, {
    message: 'Le type de dépense doit être valide (LOYER, TRANSPORT, SALAIRES, etc.)',
  })
  @IsNotEmpty({ message: 'Le type de dépense est obligatoire' })
  type: TypeDepense;

  @Validate(IsValidTypeCategorieConstraint)
  @IsEnum(CategorieDepense, {
    message: 'La catégorie doit être FIXE, VARIABLE ou EXCEPTIONNELLE',
  })
  @IsNotEmpty({ message: 'La catégorie est obligatoire' })
  categorie: CategorieDepense;

  @IsNumber({}, { message: 'Le montant doit être un nombre' })
  @Min(0, { message: 'Le montant ne peut pas être négatif' })
  @Type(() => Number)
  @IsNotEmpty({ message: 'Le montant est obligatoire' })
  montant: number;

  @IsString({ message: 'La description doit être une chaîne de caractères' })
  @MaxLength(500, {
    message: 'La description ne peut pas dépasser 500 caractères',
  })
  @IsOptional()
  description?: string;

  @IsDateString(
    {},
    { message: 'La date doit être au format ISO (YYYY-MM-DD)' },
  )
  @IsNotEmpty({ message: 'La date est obligatoire' })
  date: string;

  @IsString({ message: 'La référence doit être une chaîne de caractères' })
  @MaxLength(200, {
    message: 'La référence ne peut pas dépasser 200 caractères',
  })
  @IsOptional()
  reference?: string;
}
