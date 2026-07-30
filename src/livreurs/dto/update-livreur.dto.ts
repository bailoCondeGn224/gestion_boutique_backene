// src/livreurs/dto/update-livreur.dto.ts
import { IsString, IsOptional, IsEmail, MinLength, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLivreurDto {
  @ApiPropertyOptional({ description: 'Nom du livreur' })
  @IsString()
  @IsOptional()
  nom?: string;

  @ApiPropertyOptional({ description: 'Numéro de téléphone' })
  @IsString()
  @IsOptional()
  telephone?: string;

  @ApiPropertyOptional({ description: 'Email du livreur' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Nouveau mot de passe' })
  @IsString()
  @MinLength(4)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ description: 'Photo du livreur' })
  @IsString()
  @IsOptional()
  photo?: string;

  @ApiPropertyOptional({ description: 'Livreur actif ?' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
