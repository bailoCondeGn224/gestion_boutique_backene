import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class VersementClientFilterDto extends PaginationDto {
  @ApiProperty({ required: false, description: 'Filtrer par client' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiProperty({ required: false, description: 'Filtrer par vente' })
  @IsOptional()
  @IsUUID()
  venteId?: string;

  @ApiProperty({ required: false, description: 'Date de début (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  dateDebut?: string;

  @ApiProperty({ required: false, description: 'Date de fin (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  dateFin?: string;

  @ApiProperty({ required: false, description: 'Recherche par nom client ou référence' })
  @IsOptional()
  @IsString()
  search?: string;
}
