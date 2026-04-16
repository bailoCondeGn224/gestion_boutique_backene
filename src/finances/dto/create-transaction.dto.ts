import {
  IsString,
  IsNumber,
  Min,
  IsEnum,
  IsOptional,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  TypeTransaction,
  CategorieTransaction,
} from '../entities/transaction.entity';

export class CreateTransactionDto {
  @ApiProperty({
    example: 'Vente #V-001',
    description: 'Description de la transaction',
  })
  @IsString()
  description: string;

  @ApiProperty({
    example: 170000,
    minimum: 0,
    description: 'Montant de la transaction en GNF',
  })
  @IsNumber()
  @Min(0, { message: 'Le montant ne peut pas être négatif' })
  montant: number;

  @ApiProperty({
    example: 'in',
    enum: TypeTransaction,
    description: 'Type de transaction (in=entrée, out=sortie)',
  })
  @IsEnum(TypeTransaction, { message: 'Type de transaction invalide' })
  type: TypeTransaction;

  @ApiProperty({
    example: 'vente',
    enum: CategorieTransaction,
    description: 'Catégorie de la transaction',
  })
  @IsEnum(CategorieTransaction, { message: 'Catégorie invalide' })
  categorie: CategorieTransaction;

  @ApiProperty({
    example: '2026-04-04',
    description: 'Date de la transaction (format YYYY-MM-DD)',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    example: 'uuid-vente',
    description: 'ID de la vente associée',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  venteId?: string;

  @ApiProperty({
    example: 'uuid-approvisionnement',
    description: 'ID de l\'approvisionnement associé',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  approvisionnementId?: string;

  @ApiProperty({
    example: 'uuid-paiement',
    description: 'ID du paiement fournisseur associé',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  paiementFournisseurId?: string;
}
