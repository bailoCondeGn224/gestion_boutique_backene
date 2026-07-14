import { IsString, IsNumber, Min, IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateModeVenteDto {
  @ApiProperty({
    example: 'uuid-article',
    description: 'ID de l\'article associé',
  })
  @IsUUID()
  articleId: string;

  @ApiProperty({
    example: 'Casier',
    description: 'Nom du mode de vente (ex: Casier, Bouteille, Sac 50kg)',
  })
  @IsString()
  nom: string;

  @ApiProperty({
    example: 12,
    description: 'Nombre d\'unités de base dans ce mode (ex: 12 bouteilles par casier)',
    minimum: 0.0001,
  })
  @IsNumber()
  @Min(0.0001, { message: 'La quantité doit être supérieure à 0' })
  quantiteStock: number;

  @ApiProperty({
    example: 60000,
    description: 'Prix de vente pour ce mode en GNF',
    minimum: 0,
  })
  @IsNumber()
  @Min(0, { message: 'Le prix de vente ne peut pas être négatif' })
  prixVente: number;

  @ApiProperty({
    example: '1234567890123',
    description: 'Code-barres pour ce mode de vente',
    required: false,
  })
  @IsString()
  @IsOptional()
  codeBarre?: string;

  @ApiProperty({
    example: true,
    description: 'Définir comme mode de vente par défaut',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  parDefaut?: boolean;
}
