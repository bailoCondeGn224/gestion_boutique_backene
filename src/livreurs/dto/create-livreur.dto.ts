// src/livreurs/dto/create-livreur.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsEmail, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLivreurDto {
  @ApiProperty({ description: 'Nom du livreur' })
  @IsString()
  @IsNotEmpty()
  nom: string;

  @ApiProperty({ description: 'Numéro de téléphone (login)' })
  @IsString()
  @IsNotEmpty()
  telephone: string;

  @ApiPropertyOptional({ description: 'Email du livreur' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'Mot de passe' })
  @IsString()
  @MinLength(4)
  password: string;

  @ApiPropertyOptional({ description: 'Photo du livreur' })
  @IsString()
  @IsOptional()
  photo?: string;
}
