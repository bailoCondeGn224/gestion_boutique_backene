import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FournisseurFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Recherche dans nom, email et téléphone du fournisseur',
    example: 'dupont',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par statut du fournisseur',
    enum: ['actif', 'inactif'],
    example: 'actif',
  })
  @IsOptional()
  @IsEnum(['actif', 'inactif'])
  statut?: 'actif' | 'inactif';
}
