import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateParametreDto {
  @IsNotEmpty()
  @IsString()
  nomComplet: string;

  @IsNotEmpty()
  @IsString()
  nomCourt: string;

  @IsOptional()
  @IsString()
  slogan?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  telephone: string;

  @IsNotEmpty()
  @IsString()
  adresse: string;

  @IsOptional()
  @IsString()
  siteWeb?: string;

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
