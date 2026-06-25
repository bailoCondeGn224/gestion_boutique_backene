import { IsString, IsEmail, IsOptional, MinLength, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// DTO pour les informations du propriétaire (admin)
export class OwnerInfoDto {
  @IsString()
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  nom: string;

  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Le téléphone doit contenir au moins 8 caractères' })
  telephone: string;
}

export class RegisterOrganizationDto {
  // ============ INFORMATIONS ORGANISATION ============
  @IsString()
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  nom: string;

  @IsString()
  @MinLength(2, { message: 'Le slug doit contenir au moins 2 caractères' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets',
  })
  slug: string;

  @IsEmail({}, { message: 'Email organisation invalide' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Le téléphone doit contenir au moins 8 caractères' })
  telephone: string;

  // ============ INFORMATIONS PROPRIÉTAIRE (ADMIN) ============
  @ValidateNested()
  @Type(() => OwnerInfoDto)
  proprietaire: OwnerInfoDto;

  @IsOptional()
  @IsString()
  logo?: string;

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

  // Informations légales (optionnelles à l'inscription)
  @IsOptional()
  @IsString()
  rccm?: string;

  @IsOptional()
  @IsString()
  nif?: string;

  @IsOptional()
  @IsString()
  registreCommerce?: string;
}
