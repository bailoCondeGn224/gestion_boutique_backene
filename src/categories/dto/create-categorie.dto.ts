import { IsString, IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategorieDto {
  @ApiProperty({ example: 'Abayas', description: 'Nom de la catégorie' })
  @IsString()
  nom: string;

  @ApiProperty({ example: 'abayas', description: 'Code unique de la catégorie' })
  @IsString()
  code: string;

  @ApiProperty({
    example: 'Catégorie pour les abayas',
    description: 'Description de la catégorie',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: true,
    description: 'Statut actif de la catégorie',
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  actif?: boolean;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID de la zone associée',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  zoneId?: string;
}
