import { IsOptional, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class VenteFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Recherche par numéro de vente',
    example: 'V-001',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par client ID',
    example: 'uuid-client-123',
  })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Date de début pour filtrer les ventes (format ISO 8601)',
    example: '2024-01-01',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDateString()
  dateDebut?: string;

  @ApiPropertyOptional({
    description: 'Date de fin pour filtrer les ventes (format ISO 8601)',
    example: '2024-12-31',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDateString()
  dateFin?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par type de paiement',
    enum: ['especes', 'carte', 'mobile', 'cheque', 'credit'],
    example: 'especes',
  })
  @IsOptional()
  @IsString()
  typePaiement?: string;
}
