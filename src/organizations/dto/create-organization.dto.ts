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
}
