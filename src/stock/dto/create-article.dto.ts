import { IsString, IsUUID, IsNumber, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateArticleDto {
  @ApiProperty({
    example: 'Abaya Noire Premium',
    description: 'Nom de l\'article',
  })
  @IsString()
  nom: string;

  @ApiProperty({
    example: 'ART-001',
    description: 'Référence/Code-barres/SKU',
    required: false,
  })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiProperty({
    example: 'uuid-categorie',
    description: 'ID de la catégorie de l\'article',
  })
  @IsUUID()
  categorieId: string;

  @ApiProperty({
    example: 'A',
    description: 'Zone de stockage (A, B, C, D, E)',
    minLength: 1,
    maxLength: 1,
  })
  @IsString()
  zone: string;

  @ApiProperty({
    example: 50,
    description: 'Quantité en stock',
    minimum: 0,
  })
  @IsNumber()
  @Min(0, { message: 'Le stock ne peut pas être négatif' })
  stock: number;

  @ApiProperty({
    example: 10,
    description: 'Seuil d\'alerte minimum',
    minimum: 0,
  })
  @IsNumber()
  @Min(0, { message: 'Le seuil ne peut pas être négatif' })
  seuilAlerte: number;

  @ApiProperty({
    example: 100,
    description: 'Stock maximum',
    minimum: 1,
  })
  @IsNumber()
  @Min(1, { message: 'Le stock maximum doit être supérieur à 0' })
  max: number;

  @ApiProperty({
    example: 85000,
    description: 'Prix de vente unitaire en GNF',
    minimum: 0,
  })
  @IsNumber()
  @Min(0, { message: 'Le prix de vente ne peut pas être négatif' })
  prixVente: number;

  @ApiProperty({
    example: 60000,
    description: 'Prix d\'achat moyen en GNF',
    minimum: 0,
    required: false,
  })
  @IsNumber()
  @Min(0, { message: 'Le prix d\'achat ne peut pas être négatif' })
  @IsOptional()
  prixAchat?: number;

  @ApiProperty({
    example: 'Abaya élégante en tissu premium, couleur noir intense',
    description: 'Description détaillée de l\'article',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}
