import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

// Helper pour transformer les chaînes vides en undefined
const TransformEmptyToUndefined = () =>
  Transform(({ value }) => (value === '' ? undefined : value));

export class ApprovisionnementFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Recherche par numéro d\'approvisionnement',
    example: 'APP-001',
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
    description: 'Date de début pour filtrer les approvisionnements',
    example: '2024-01-01',
  })
  @IsOptional()
  @TransformEmptyToUndefined()
  dateDebut?: string;

  @ApiPropertyOptional({
    description: 'Date de fin pour filtrer les approvisionnements',
    example: '2024-12-31',
  })
  @IsOptional()
  @TransformEmptyToUndefined()
  dateFin?: string;

  @ApiPropertyOptional({
    description: 'Inclure les approvisionnements annulés dans les résultats',
    example: false,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return false;
  })
  @IsBoolean()
  includeAnnules?: boolean;
}
