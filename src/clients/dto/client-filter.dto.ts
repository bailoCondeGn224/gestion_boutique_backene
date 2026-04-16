import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ClientFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Recherche dans nom, téléphone et email du client',
    example: 'diallo',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Si true, retourne seulement les clients avec des crédits en cours (totalCredits > 0)',
    example: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasCredits?: boolean;
}
