import { IsOptional, IsEnum, IsUUID, IsDateString, IsNumber, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { StatutCommande } from '../enums/statut-commande.enum';

// Helper pour transformer les chaînes vides en undefined
const TransformEmptyToUndefined = () =>
  Transform(({ value }) => (value === '' ? undefined : value));

export class CommandeFilterDto {
  @ApiProperty({ example: 1, required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ example: 10, required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({
    example: 'CMD-001',
    required: false,
    description: 'Rechercher par numéro de commande ou nom client',
  })
  @IsOptional()
  @TransformEmptyToUndefined()
  search?: string;

  @ApiProperty({
    enum: StatutCommande,
    required: false,
    description: 'Filtrer par statut',
  })
  @IsOptional()
  @TransformEmptyToUndefined()
  @IsEnum(StatutCommande)
  statut?: StatutCommande;

  @ApiProperty({
    example: 'uuid-client',
    required: false,
    description: 'Filtrer par client',
  })
  @IsOptional()
  @TransformEmptyToUndefined()
  @IsUUID()
  clientId?: string;

  @ApiProperty({
    example: '2026-04-01',
    required: false,
    description: 'Date de début',
  })
  @IsOptional()
  @TransformEmptyToUndefined()
  dateDebut?: string;

  @ApiProperty({
    example: '2026-04-30',
    required: false,
    description: 'Date de fin',
  })
  @IsOptional()
  @TransformEmptyToUndefined()
  dateFin?: string;
}
