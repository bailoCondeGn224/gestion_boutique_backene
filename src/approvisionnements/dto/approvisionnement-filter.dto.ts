import { IsOptional, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ApprovisionnementFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Recherche par numéro d\'approvisionnement',
    example: 'APP-001',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par fournisseur ID',
    example: 'uuid-fournisseur-123',
  })
  @IsOptional()
  @IsString()
  fournisseurId?: string;

  @ApiPropertyOptional({
    description: 'Date de début pour filtrer les approvisionnements (format ISO 8601)',
    example: '2024-01-01',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDateString()
  dateDebut?: string;

  @ApiPropertyOptional({
    description: 'Date de fin pour filtrer les approvisionnements (format ISO 8601)',
    example: '2024-12-31',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDateString()
  dateFin?: string;
}
