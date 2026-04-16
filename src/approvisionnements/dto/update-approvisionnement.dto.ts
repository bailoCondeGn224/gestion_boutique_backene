import { PartialType } from '@nestjs/swagger';
import {
  CreateApprovisionnementDto,
  LigneApprovisionnementDto,
} from './create-approvisionnement.dto';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateLigneApprovisionnementDto {
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

export class UpdateApprovisionnementDto {
  @ApiProperty({
    example: 'uuid-fournisseur',
    description: 'ID du fournisseur',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  fournisseurId?: string;

  @ApiProperty({
    example: 'Al-Nour Textiles',
    description: 'Nom du fournisseur',
    required: false,
  })
  @IsString()
  @IsOptional()
  fournisseurNom?: string;

  @ApiProperty({
    type: [UpdateLigneApprovisionnementDto],
    description: 'Liste des articles fournis',
    required: false,
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
  @Type(() => UpdateLigneApprovisionnementDto)
  @IsOptional()
  lignes?: UpdateLigneApprovisionnementDto[];

  @ApiProperty({
    example: 3000000,
    minimum: 0,
    description: 'Montant total de l\'approvisionnement',
    required: false,
  })
  @IsNumber()
  @Min(0, { message: 'Le total ne peut pas être négatif' })
  @IsOptional()
  total?: number;

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
    required: false,
  })
  @IsDateString()
  @IsOptional()
  dateLivraison?: string;

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
}
