import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePermissionDto {
  @ApiProperty({ example: 'ventes.create' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Créer une vente' })
  @IsString()
  nom: string;

  @ApiProperty({ example: 'Permet de créer de nouvelles ventes', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
