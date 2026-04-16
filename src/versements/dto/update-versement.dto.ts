import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNumber, Min, IsEnum, IsString, IsOptional, IsDateString } from 'class-validator';
import { ModeVersement, StatutVersement } from '../entities/versement.entity';

export class UpdateVersementDto {
  @ApiProperty({ example: 'uuid-fournisseur', required: false })
  @IsUUID()
  @IsOptional()
  fournisseurId?: string;

  @ApiProperty({ example: 500000, minimum: 0, required: false })
  @IsNumber()
  @Min(0, { message: 'Le montant ne peut pas être négatif' })
  @IsOptional()
  montant?: number;

  @ApiProperty({ example: 'mobile', enum: ModeVersement, required: false })
  @IsEnum(ModeVersement, { message: 'Mode de paiement invalide' })
  @IsOptional()
  modePaiement?: ModeVersement;

  @ApiProperty({ example: '2026-04-08', description: 'Date du versement (format YYYY-MM-DD)', required: false })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiProperty({ example: 'MM123456', required: false })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiProperty({ example: 'Paiement partiel pour commande #123', required: false })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiProperty({ example: 'valide', enum: StatutVersement, required: false })
  @IsEnum(StatutVersement)
  @IsOptional()
  statut?: StatutVersement;
}
