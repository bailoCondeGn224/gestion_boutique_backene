import { IsOptional, IsEnum, IsISO8601 } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum PeriodeFilter {
  DERNIER_MOIS = '1',
  TROIS_MOIS = '3',
  SIX_MOIS = '6',
  UN_AN = '12',
  TOUT = 'tout',
}

export class InventaireDashboardFilterDto {
  @ApiPropertyOptional({
    enum: PeriodeFilter,
    description: 'Période à analyser',
    default: PeriodeFilter.TROIS_MOIS,
  })
  @IsOptional()
  @IsEnum(PeriodeFilter)
  periode?: PeriodeFilter = PeriodeFilter.TROIS_MOIS;

  @ApiPropertyOptional({
    description: 'Date de début personnalisée (format ISO)',
  })
  @IsOptional()
  @IsISO8601()
  dateDebut?: string;

  @ApiPropertyOptional({
    description: 'Date de fin personnalisée (format ISO)',
  })
  @IsOptional()
  @IsISO8601()
  dateFin?: string;
}
