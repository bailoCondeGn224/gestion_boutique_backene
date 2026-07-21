import { IsString, IsUUID, IsNumber, Min, Max, IsOptional, IsDateString, ValidateNested, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ModeVenteInlineDto } from './mode-vente-inline.dto';

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

  @ApiProperty({
    example: 'Bouteille',
    description: 'Unité de stockage de base (ex: Bouteille, Kilo, Pièce)',
    required: false,
  })
  @IsString()
  @IsOptional()
  uniteStock?: string;

  @ApiProperty({
    type: [ModeVenteInlineDto],
    description: 'Modes de vente disponibles pour cet article',
    required: false,
    example: [
      { nom: 'Casier', quantiteStock: 12, prixVente: 60000, parDefaut: true },
      { nom: 'Bouteille', quantiteStock: 1, prixVente: 5500 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModeVenteInlineDto)
  @IsOptional()
  modesVente?: ModeVenteInlineDto[];

  @ApiProperty({
    example: '2025-12-31',
    description: 'Date d\'expiration du produit (YYYY-MM-DD)',
    required: false,
  })
  @IsDateString({}, { message: 'La date d\'expiration doit être au format ISO (YYYY-MM-DD)' })
  @IsOptional()
  dateExpiration?: string;

  @ApiProperty({
    example: 30,
    description: 'Jours avant expiration pour déclencher une alerte (défaut: 30)',
    minimum: 1,
    required: false,
  })
  @IsNumber()
  @Min(1, { message: 'Le délai d\'alerte doit être d\'au moins 1 jour' })
  @IsOptional()
  delaiAlerteExpiration?: number;

  @ApiProperty({
    example: false,
    description: 'Article disponible sur la vitrine en ligne',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  disponibleEnLigne?: boolean;

  @ApiProperty({
    example: 75000,
    description: 'Prix de vente en ligne (si différent du prix de vente normal)',
    minimum: 0,
    required: false,
  })
  @IsNumber()
  @Min(0, { message: 'Le prix en ligne ne peut pas être négatif' })
  @IsOptional()
  prixEnLigne?: number;
}
