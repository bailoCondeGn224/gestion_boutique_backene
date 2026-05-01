import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Mot de passe actuel',
    example: 'admin123',
  })
  @IsNotEmpty()
  @IsString()
  currentPassword: string;

  @ApiProperty({
    description: 'Nouveau mot de passe (minimum 8 caractères)',
    example: 'NouveauMotDePasse123!',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'Le nouveau mot de passe doit contenir au moins 8 caractères' })
  newPassword: string;
}
