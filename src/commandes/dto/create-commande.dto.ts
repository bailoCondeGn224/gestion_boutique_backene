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

export class LigneCommandeDto {
  @ApiProperty({ example: 'uuid-article' })
  @IsUUID()
  articleId: string;

  @ApiProperty({ example: 'Abaya Noire Premium' })
  @IsString()
  nom: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsNumber()
  @Min(1, { message: 'La quantité doit être au moins 1' })
  quantite: number;

  @ApiProperty({ example: 85000, minimum: 0 })
  @IsNumber()
  @Min(0, { message: 'Le prix unitaire ne peut pas être négatif' })
  prixUnitaire: number;

  @ApiProperty({ example: 170000, minimum: 0 })
  @IsNumber()
  @Min(0, { message: 'Le sous-total ne peut pas être négatif' })
  sousTotal: number;
}

export class CreateCommandeDto {
  @ApiProperty({
    example: 'uuid-client',
    description: 'ID du client (REQUIS pour les commandes)',
  })
  @IsUUID()
  clientId: string;

  @ApiProperty({
    type: [LigneCommandeDto],
    example: [
      {
        articleId: 'uuid',
        nom: 'Abaya Noire',
        quantite: 2,
        prixUnitaire: 85000,
        sousTotal: 170000,
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LigneCommandeDto)
  lignes: LigneCommandeDto[];

  @ApiProperty({ example: 170000, minimum: 0 })
  @IsNumber()
  @Min(0, { message: 'Le total ne peut pas être négatif' })
  total: number;

  @ApiProperty({
    example: 50000,
    minimum: 0,
    description: 'Acompte versé à la commande',
    required: false,
  })
  @IsNumber()
  @Min(0, { message: "L'acompte ne peut pas être négatif" })
  @IsOptional()
  acompte?: number;

  @ApiProperty({
    example: 120000,
    minimum: 0,
    description: 'Montant restant à payer à la livraison',
    required: false,
  })
  @IsNumber()
  @Min(0, { message: 'Le montant restant ne peut pas être négatif' })
  @IsOptional()
  montantRestant?: number;

  @ApiProperty({
    example: '2026-05-01',
    description: 'Date de livraison souhaitée',
    required: false,
  })
  @IsOptional()
  dateLivraison?: string;

  @ApiProperty({
    example: 'Commande urgente',
    description: 'Note sur la commande',
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
