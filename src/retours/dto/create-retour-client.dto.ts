import {
  IsArray,
  IsNumber,
  Min,
  IsEnum,
  ValidateNested,
  IsUUID,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { LigneRetourDto } from './ligne-retour.dto';
import { ModeRemboursement } from '../enums/mode-remboursement.enum';

export class CreateRetourClientDto {
  @ApiProperty({
    example: 'uuid-vente',
    description: 'ID de la vente originale',
  })
  @IsUUID()
  venteId: string;

  @ApiProperty({
    type: [LigneRetourDto],
    description: 'Articles retournés',
    example: [
      {
        articleId: 'uuid',
        nom: 'Abaya Noire',
        quantite: 1,
        prixUnitaire: 85000,
        sousTotal: 85000,
        raison: 'defectueux',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LigneRetourDto)
  lignes: LigneRetourDto[];

  @ApiProperty({
    example: 85000,
    minimum: 0,
    description: 'Montant total du retour',
  })
  @IsNumber()
  @Min(0)
  total: number;

  @ApiProperty({
    enum: ModeRemboursement,
    example: ModeRemboursement.ESPECES,
    description: 'Mode de remboursement',
  })
  @IsEnum(ModeRemboursement)
  modeRemboursement: ModeRemboursement;

  @ApiProperty({
    example: 'Client insatisfait de la qualité',
    description: 'Note générale sur le retour',
    required: false,
  })
  @IsString()
  @IsOptional()
  note?: string;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  userNom?: string;
}
