import { IsString, IsOptional, IsNumber, Min, IsDateString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImportArticleDto {
  @ApiProperty({ description: 'Code/référence de l\'article' })
  @IsString()
  codeArticle: string;

  @ApiProperty({ description: 'Nom de l\'article' })
  @IsString()
  nom: string;

  @ApiProperty({ description: 'ID ou nom de la catégorie' })
  @IsString()
  categorie: string;

  @ApiProperty({ description: 'Zone de stockage (A-E)' })
  @IsString()
  zone: string;

  @ApiProperty({ description: 'Prix de vente' })
  @IsNumber()
  @Min(0)
  prixVente: number;

  @ApiPropertyOptional({ description: 'Prix d\'achat' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  prixAchat?: number;

  @ApiPropertyOptional({ description: 'Seuil d\'alerte' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  seuilAlerte?: number;

  @ApiProperty({ description: 'Quantité' })
  @IsNumber()
  @Min(0)
  quantite: number;

  @ApiPropertyOptional({ description: 'Nom du fournisseur (si approvisionnement)' })
  @IsOptional()
  @IsString()
  fournisseur?: string;

  @ApiPropertyOptional({ description: 'Date de livraison (si approvisionnement)' })
  @IsOptional()
  @IsDateString()
  dateLivraison?: string;

  @ApiPropertyOptional({ description: 'Numéro de facture (si approvisionnement)' })
  @IsOptional()
  @IsString()
  numeroFacture?: string;

  @ApiPropertyOptional({ description: 'Nom du fichier photo (ex: photo.jpg)' })
  @IsOptional()
  @IsString()
  photo?: string;
}

export class ImportResultDto {
  articlesCreated: number;
  approvisionnementsCreated: number;
  errors: ImportErrorDto[];
  summary: {
    totalRows: number;
    success: number;
    failed: number;
  };
}

export class ImportErrorDto {
  row: number;
  codeArticle?: string;
  nom?: string;
  errors: string[];
}
