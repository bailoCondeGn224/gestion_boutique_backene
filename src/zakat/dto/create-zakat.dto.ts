import { IsNumber, IsOptional, IsEnum, IsString, IsBoolean, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { IrrigationType } from '../enums/zakat-status.enum';

export class CreateZakatDto {
  // ===== HAWL =====
  @IsOptional()
  @IsDateString()
  dateAtteinteNisab?: string; // Date où le nisab a été atteint pour la première fois

  // ===== LIQUIDITÉS =====
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  cashMaison?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  cashBanque?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  cashMobile?: number;

  // ===== OR & ARGENT =====
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  orPoids?: number; // grammes

  @IsOptional()
  @IsBoolean()
  orInclureBijoux?: boolean; // Inclure bijoux personnels

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  argentPoids?: number; // grammes

  // ===== INVESTISSEMENTS =====
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  investActions?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  investImmobilier?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  investAutres?: number;

  // ===== COMMERCE =====
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  comStockValeur?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  comCreances?: number; // Uniquement créances récupérables

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  comLiquidites?: number;

  // ===== AGRICULTURE =====
  @IsOptional()
  @IsBoolean()
  hasAgriculture?: boolean; // Checkbox: J'ai des activités agricoles

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  agriQuantiteKg?: number; // Quantité en kg (nisab = 653kg)

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  agriValeurRecolte?: number;

  @IsOptional()
  @IsEnum(IrrigationType)
  agriIrrigation?: IrrigationType;

  // ===== BÉTAIL =====
  @IsOptional()
  @IsBoolean()
  hasBetail?: boolean; // Checkbox: J'ai du bétail

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  betailChameaux?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  betailBovins?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  betailOvins?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  betailCaprins?: number;

  // ===== DETTES =====
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  dettesPersonnelles?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  dettesFournisseurs?: number;

  // ===== NOTES =====
  @IsOptional()
  @IsString()
  notes?: string;
}
