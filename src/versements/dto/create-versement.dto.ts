import { IsUUID, IsNumber, Min, IsEnum, IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ModeVersement, StatutVersement } from '../entities/versement.entity';

export class CreateVersementDto {
  @ApiProperty({ example: 'uuid-fournisseur' })
  @IsUUID()
  fournisseurId: string;

  @ApiProperty({ example: 500000, minimum: 0 })
  @IsNumber()
  @Min(0, { message: 'Le montant ne peut pas être négatif' })
  montant: number;

  @ApiProperty({ example: 'mobile', enum: ModeVersement })
  @IsEnum(ModeVersement, { message: 'Mode de paiement invalide' })
  modePaiement: ModeVersement;

  @ApiProperty({ example: '2026-04-08', description: 'Date du versement (format YYYY-MM-DD)' })
  @IsDateString()
  date: string;

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
