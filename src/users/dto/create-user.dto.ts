import { IsEmail, IsString, MinLength, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    example: 'admin@boutique.com',
    description: 'Email de l\'utilisateur',
  })
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @ApiProperty({
    example: 'motdepasse123',
    description: 'Mot de passe (minimum 6 caractères)',
    minLength: 6,
  })
  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  password: string;

  @ApiProperty({
    example: 'Admin Boutique',
    description: 'Nom complet de l\'utilisateur',
  })
  @IsString()
  nom: string;

  @ApiProperty({
    example: 'uuid-role-id',
    description: 'ID du rôle à assigner (optionnel)',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  roleId?: string;
}
