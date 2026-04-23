import { IsString, IsEmail, IsOptional, IsBoolean, IsUUID, IsDateString } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  nom: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;

  @IsUUID()
  planId: string; // ID du plan à assigner

  @IsOptional()
  @IsDateString()
  abonnementExpire?: string;

  // Informations supplémentaires (ex-Parametre)
  @IsOptional()
  @IsString()
  nomCourt?: string;

  @IsOptional()
  @IsString()
  slogan?: string;

  @IsOptional()
  @IsString()
  adresse?: string;

  @IsOptional()
  @IsString()
  siteWeb?: string;

  // Informations légales
  @IsOptional()
  @IsString()
  rccm?: string;

  @IsOptional()
  @IsString()
  nif?: string;

  @IsOptional()
  @IsString()
  registreCommerce?: string;

  @IsOptional()
  @IsString()
  devise?: string;

  @IsOptional()
  @IsString()
  mentionsLegales?: string;
}
