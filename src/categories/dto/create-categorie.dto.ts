import { IsString, IsOptional, IsBoolean } from 'class-validator';
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
}
