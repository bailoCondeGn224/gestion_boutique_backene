import {
  IsString,
  IsArray,
  IsNumber,
  Min,
  ValidateNested,
  IsUUID,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LigneApprovisionnementDto {
  @ApiProperty({ example: 'uuid-article', description: 'ID de l\'article' })
  @IsUUID()
  articleId: string;

  @ApiProperty({ example: 'Abaya Noire Premium', description: 'Nom de l\'article' })
  @IsString()
  nom: string;

  @ApiProperty({ example: 50, minimum: 1, description: 'Quantité fournie' })
  @IsNumber()
  @Min(1, { message: 'La quantité doit être au moins 1' })
  quantite: number;

  @ApiProperty({
    example: 60000,
    minimum: 0,
    description: 'Prix d\'achat unitaire en GNF',
  })
  @IsNumber()
  @Min(0, { message: 'Le prix unitaire ne peut pas être négatif' })
  prixUnitaire: number;

  @ApiProperty({
    example: 3000000,
    minimum: 0,
    description: 'Sous-total de la ligne',
  })
  @IsNumber()
  @Min(0, { message: 'Le sous-total ne peut pas être négatif' })
  sousTotal: number;
}

export class CreateApprovisionnementDto {
  @ApiProperty({
    example: 'uuid-fournisseur',
    description: 'ID du fournisseur',
  })
  @IsUUID()
  fournisseurId: string;

  @ApiProperty({
    example: 'Al-Nour Textiles',
    description: 'Nom du fournisseur',
  })
  @IsString()
  fournisseurNom: string;

  @ApiProperty({
    type: [LigneApprovisionnementDto],
    description: 'Liste des articles fournis',
    example: [
      {
        articleId: 'uuid',
        nom: 'Abaya Noire Premium',
        quantite: 50,
        prixUnitaire: 60000,
        sousTotal: 3000000,
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LigneApprovisionnementDto)
  lignes: LigneApprovisionnementDto[];

  @ApiProperty({
    example: 3000000,
    minimum: 0,
    description: 'Montant total de l\'approvisionnement',
  })
  @IsNumber()
  @Min(0, { message: 'Le total ne peut pas être négatif' })
  total: number;

  @ApiProperty({
    example: 1500000,
    minimum: 0,
    description: 'Montant déjà payé',
    required: false,
  })
  @IsNumber()
  @Min(0, { message: 'Le montant payé ne peut pas être négatif' })
  @IsOptional()
  montantPaye?: number;

  @ApiProperty({
    example: 1500000,
    minimum: 0,
    description: 'Montant restant à payer',
    required: false,
  })
  @IsNumber()
  @Min(0, { message: 'Le montant restant ne peut pas être négatif' })
  @IsOptional()
  montantRestant?: number;

  @ApiProperty({
    example: '2026-04-04',
    description: 'Date de livraison (format YYYY-MM-DD)',
  })
  @IsDateString()
  dateLivraison: string;

  @ApiProperty({
    example: 'FACT-2026-001',
    description: 'Numéro de facture fournisseur',
    required: false,
  })
  @IsString()
  @IsOptional()
  numeroFacture?: string;

  @ApiProperty({
    example: 'Livraison conforme, articles en bon état',
    description: 'Notes additionnelles',
    required: false,
  })
  @IsString()
  @IsOptional()
  note?: string;

  // Champs pour traçabilité (ajoutés automatiquement par le controller)
  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  userNom?: string;
}
