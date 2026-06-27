import { IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateZakatSettingsDto {
  // Prix bétail configurables
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  prixMouton?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  prixVeau1an?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  prixVeau2ans?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  prixVache?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  prixChamelle1an?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  prixChamelle2ans?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  prixChameauAdulte?: number;

  // Taux de change manuel (si besoin)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  tauxUsdGnf?: number;
}
