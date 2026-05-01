import { IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

// Helper pour transformer les chaînes vides en undefined
const TransformEmptyToUndefined = () =>
  Transform(({ value }) => (value === '' ? undefined : value));

export class VersementFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Recherche par référence de versement',
    example: 'REF-001',
  })
  @IsOptional()
  @TransformEmptyToUndefined()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par fournisseur ID',
    example: 'uuid-fournisseur-123',
  })
  @IsOptional()
  @TransformEmptyToUndefined()
  @IsString()
  fournisseurId?: string;

  @ApiPropertyOptional({
    description: 'Date de début pour filtrer les versements',
    example: '2024-01-01',
  })
  @IsOptional()
  @TransformEmptyToUndefined()
  dateDebut?: string;

  @ApiPropertyOptional({
    description: 'Date de fin pour filtrer les versements',
    example: '2024-12-31',
  })
  @IsOptional()
  @TransformEmptyToUndefined()
  dateFin?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par mode de paiement',
    enum: ['especes', 'virement', 'cheque', 'mobile'],
    example: 'especes',
  })
  @IsOptional()
  @TransformEmptyToUndefined()
  @IsString()
  modePaiement?: string;
}
