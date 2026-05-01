import {
  IsString,
  IsNumber,
  Min,
  IsUUID,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RaisonRetour } from '../enums/raison-retour.enum';

export class LigneRetourDto {
  @ApiProperty({ example: 'uuid-article', description: 'ID de l\'article' })
  @IsUUID()
  articleId: string;

  @ApiProperty({ example: 'Abaya Noire Premium', description: 'Nom de l\'article' })
  @IsString()
  nom: string;

  @ApiProperty({ example: 2, minimum: 1, description: 'Quantité retournée' })
  @IsNumber()
  @Min(1, { message: 'La quantité doit être au moins 1' })
  quantite: number;

  @ApiProperty({ example: 85000, description: 'Prix unitaire (du retour)' })
  @IsNumber()
  @Min(0)
  prixUnitaire: number;

  @ApiProperty({ example: 170000, description: 'Sous-total du retour' })
  @IsNumber()
  @Min(0)
  sousTotal: number;

  @ApiProperty({
    enum: RaisonRetour,
    example: RaisonRetour.DEFECTUEUX,
    description: 'Raison du retour',
    required: false,
  })
  @IsEnum(RaisonRetour)
  @IsOptional()
  raison?: RaisonRetour;

  @ApiProperty({
    example: 'Tâche sur le tissu',
    description: 'Note spécifique pour cet article',
    required: false,
  })
  @IsString()
  @IsOptional()
  noteArticle?: string;
}
