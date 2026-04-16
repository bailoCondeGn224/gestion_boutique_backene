import {
  IsString,
  IsArray,
  IsNumber,
  Min,
  IsEnum,
  ValidateNested,
  IsUUID,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ModePaiement } from '../entities/vente.entity';

export class LigneVenteDto {
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

  @ApiProperty({ example: 60000, minimum: 0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Le prix d\'achat ne peut pas être négatif' })
  prixAchat?: number;

  @ApiProperty({ example: 170000, minimum: 0 })
  @IsNumber()
  @Min(0, { message: 'Le sous-total ne peut pas être négatif' })
  sousTotal: number;
}

export class CreateVenteDto {
  @ApiProperty({
    example: 'uuid-client',
    description: 'ID du client (optionnel si client enregistré)',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  clientId?: string;

  @ApiProperty({
    example: 'Diallo',
    description: 'Nom du client',
    required: false,
  })
  @IsString()
  @IsOptional()
  nom?: string;

  @ApiProperty({
    example: 'Aminata',
    description: 'Prénom du client',
    required: false,
  })
  @IsString()
  @IsOptional()
  prenom?: string;

  @ApiProperty({
    example: '620123456',
    description: 'Téléphone du client',
    required: false,
  })
  @IsString()
  @IsOptional()
  tel?: string;

  @ApiProperty({
    type: [LigneVenteDto],
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
  @Type(() => LigneVenteDto)
  lignes: LigneVenteDto[];

  @ApiProperty({ example: 170000, minimum: 0 })
  @IsNumber()
  @Min(0, { message: 'Le total ne peut pas être négatif' })
  total: number;

  @ApiProperty({
    example: 170000,
    minimum: 0,
    description: 'Montant payé (si différent du total pour crédit)',
    required: false,
  })
  @IsNumber()
  @Min(0, { message: 'Le montant payé ne peut pas être négatif' })
  @IsOptional()
  montantPaye?: number;

  @ApiProperty({
    example: 0,
    minimum: 0,
    description: 'Montant restant à payer',
    required: false,
  })
  @IsNumber()
  @Min(0, { message: 'Le montant restant ne peut pas être négatif' })
  @IsOptional()
  montantRestant?: number;

  @ApiProperty({ example: 'especes', enum: ModePaiement })
  @IsEnum(ModePaiement, { message: 'Mode de paiement invalide' })
  modePaiement: ModePaiement;

  // Champs pour traçabilité (ajoutés automatiquement par le controller)
  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  userNom?: string;
}
