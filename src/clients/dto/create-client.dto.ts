import { IsString, IsEmail, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({
    example: 'Mamadou Diallo',
    description: 'Nom complet du client',
  })
  @IsString()
  nom: string;

  @ApiProperty({
    example: '+224 620 00 00 00',
    description: 'Numéro de téléphone',
    required: false,
  })
  @IsString()
  @IsOptional()
  telephone?: string;

  @ApiProperty({
    example: 'mamadou@example.com',
    description: 'Adresse email',
    required: false,
  })
  @IsEmail({}, { message: 'Format email invalide' })
  @IsOptional()
  email?: string;

  @ApiProperty({
    example: 'Kaloum, Conakry',
    description: 'Adresse physique',
    required: false,
  })
  @IsString()
  @IsOptional()
  adresse?: string;

  @ApiProperty({
    example: 0,
    description: 'Total des achats (calculé automatiquement)',
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  totalAchats?: number;

  @ApiProperty({
    example: 0,
    description: 'Total des crédits en cours',
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  totalCredits?: number;
}
