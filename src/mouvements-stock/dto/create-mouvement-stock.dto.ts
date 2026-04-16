import { IsEnum, IsInt, IsString, IsOptional, IsUUID, IsNumber, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { TypeMouvement, MotifMouvement } from '../entities/mouvement-stock.entity';

export class CreateMouvementStockDto {
  @IsUUID()
  articleId: string;

  @IsString()
  articleNom: string;

  @IsEnum(TypeMouvement)
  type: TypeMouvement;

  @IsEnum(MotifMouvement)
  motif: MotifMouvement;

  @IsInt()
  quantite: number;

  @IsInt()
  stockAvant: number;

  @IsInt()
  stockApres: number;

  @IsOptional()
  @IsNumber()
  prixUnitaire?: number;

  @IsOptional()
  @IsNumber()
  valeurTotal?: number;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  userNom?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsUUID()
  venteId?: string;

  @IsOptional()
  @IsUUID()
  approvisionnementId?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsDate()
  @Type(() => Date)
  date: Date;
}
