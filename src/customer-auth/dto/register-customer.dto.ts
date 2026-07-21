import { IsString, IsNotEmpty, MinLength, IsOptional, IsEmail, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterCustomerDto {
  @ApiProperty({ example: 'Mamadou Diallo' })
  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis' })
  nom: string;

  @ApiProperty({ example: '624123456' })
  @IsString()
  @IsNotEmpty({ message: 'Le téléphone est requis' })
  @Matches(/^[0-9]{9,15}$/, { message: 'Numéro de téléphone invalide' })
  telephone: string;

  @ApiPropertyOptional({ example: 'client@email.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Email invalide' })
  email?: string;

  @ApiProperty({ example: 'motdepasse123' })
  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  password: string;
}
