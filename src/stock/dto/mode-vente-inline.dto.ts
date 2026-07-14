import { IsString, IsNumber, Min, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ModeVenteInlineDto {
  @ApiProperty({
    example: 'Casier',
    description: 'Nom du mode de vente',
  })
  @IsString()
  nom: string;

  @ApiProperty({
    example: 12,
    description: 'Nombre d\'unités de base dans ce mode',
    minimum: 0.0001,
  })
  @IsNumber()
  @Min(0.0001)
  quantiteStock: number;

  @ApiProperty({
    example: 60000,
    description: 'Prix de vente pour ce mode',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  prixVente: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  codeBarre?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  parDefaut?: boolean;
}
