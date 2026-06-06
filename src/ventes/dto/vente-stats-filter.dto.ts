import { IsOptional, IsInt, Min, Max, ValidatorConstraint, ValidatorConstraintInterface, Validate, ValidationArguments } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

@ValidatorConstraint({ name: 'IsNotFutureDate', async: false })
export class IsNotFutureDateConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const object = args.object as VenteStatsFilterDto;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    // Si année non fournie ou mois non fourni, pas de validation
    if (!object.annee || !object.mois) {
      return true;
    }

    // Vérifier que la date n'est pas dans le futur
    if (object.annee > currentYear) {
      return false;
    }

    if (object.annee === currentYear && object.mois > currentMonth) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'La date sélectionnée ne peut pas être dans le futur';
  }
}

export class VenteStatsFilterDto {
  @ApiPropertyOptional({ description: 'Mois (1-12)', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  @Validate(IsNotFutureDateConstraint)
  mois?: number;

  @ApiPropertyOptional({ description: 'Année', example: 2024 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  @Validate(IsNotFutureDateConstraint)
  annee?: number;
}
