import { IsOptional, IsEnum, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TypeMouvement, MotifMouvement } from '../entities/mouvement-stock.entity';

export class MouvementFilterDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string; // Recherche par nom d'article

  @IsOptional()
  @IsEnum(TypeMouvement)
  type?: TypeMouvement;

  @IsOptional()
  @IsEnum(MotifMouvement)
  motif?: MotifMouvement;

  @IsOptional()
  @IsString()
  dateDebut?: string;

  @IsOptional()
  @IsString()
  dateFin?: string;

  @IsOptional()
  @IsString()
  articleId?: string;
}
