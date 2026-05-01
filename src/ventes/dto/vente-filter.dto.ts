import { IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

// Helper pour transformer les chaînes vides en undefined
const TransformEmptyToUndefined = () =>
  Transform(({ value }) => (value === '' ? undefined : value));

export class VenteFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Recherche par numéro de vente',
    example: 'V-001',
  })
  @IsOptional()
  @TransformEmptyToUndefined()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par client ID',
    example: 'uuid-client-123',
  })
  @IsOptional()
  @TransformEmptyToUndefined()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Date de début pour filtrer les ventes',
    example: '2024-01-01',
  })
  @IsOptional()
  @TransformEmptyToUndefined()
  dateDebut?: string;

  @ApiPropertyOptional({
    description: 'Date de fin pour filtrer les ventes',
    example: '2024-12-31',
  })
  @IsOptional()
  @TransformEmptyToUndefined()
  dateFin?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par type de paiement',
    enum: ['especes', 'carte', 'mobile', 'cheque', 'credit'],
    example: 'especes',
  })
  @IsOptional()
  @TransformEmptyToUndefined()
  @IsString()
  typePaiement?: string;
}
