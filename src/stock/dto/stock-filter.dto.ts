import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class StockFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Recherche dans nom et référence de l\'article',
    example: 'bazin',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par ID de catégorie',
    example: 'uuid-categorie',
  })
  @IsOptional()
  @IsString()
  categorieId?: string;

  @ApiPropertyOptional({
    description: 'Si true, retourne seulement les articles en alerte (stock <= seuilAlerte)',
    example: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  enAlerte?: boolean;
}
