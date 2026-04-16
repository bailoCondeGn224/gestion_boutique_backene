import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ModeVersementClient } from '../entities/versement-client.entity';

export class CreateVersementClientDto {
  @ApiProperty({ description: 'ID du client' })
  @IsUUID()
  @IsNotEmpty()
  clientId: string;

  @ApiProperty({ description: 'Nom du client' })
  @IsString()
  @IsNotEmpty()
  clientNom: string;

  @ApiProperty({ description: 'ID de la vente (optionnel)', required: false })
  @IsUUID()
  @IsOptional()
  venteId?: string;

  @ApiProperty({ description: 'Numéro de la vente (optionnel)', required: false })
  @IsString()
  @IsOptional()
  venteNumero?: string;

  @ApiProperty({ description: 'Montant du versement' })
  @IsNumber()
  @IsNotEmpty()
  montant: number;

  @ApiProperty({ enum: ModeVersementClient, description: 'Mode de paiement' })
  @IsEnum(ModeVersementClient)
  @IsNotEmpty()
  modePaiement: ModeVersementClient;

  @ApiProperty({ description: 'Référence (numéro de transaction, chèque, etc.)', required: false })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiProperty({ description: 'Date du versement' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: 'Note ou commentaire', required: false })
  @IsString()
  @IsOptional()
  note?: string;

  // Ajoutés automatiquement par le système
  userId?: string;
  userNom?: string;
}
