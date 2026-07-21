import { IsString, IsOptional, IsEmail, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCustomerProfileDto {
  @ApiPropertyOptional({ example: 'Mamadou Diallo' })
  @IsOptional()
  @IsString()
  nom?: string;

  @ApiPropertyOptional({ example: 'client@email.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Email invalide' })
  email?: string;

  @ApiPropertyOptional({ example: 'nouveaumotdepasse' })
  @IsOptional()
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  password?: string;
}
