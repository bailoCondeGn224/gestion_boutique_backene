import {
  IsArray,
  IsNumber,
  Min,
  ValidateNested,
  IsUUID,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { LigneRetourDto } from './ligne-retour.dto';

export class CreateRetourFournisseurDto {
  @ApiProperty({
    example: 'uuid-approvisionnement',
    description: 'ID de l\'approvisionnement original',
  })
  @IsUUID()
  approvisionnementId: string;

  @ApiProperty({
    type: [LigneRetourDto],
    description: 'Articles retournés au fournisseur',
    example: [
      {
        articleId: 'uuid',
        nom: 'Abaya Noire',
        quantite: 5,
        prixUnitaire: 60000,
        sousTotal: 300000,
        raison: 'defectueux',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LigneRetourDto)
  lignes: LigneRetourDto[];

  @ApiProperty({
    example: 300000,
    minimum: 0,
    description: 'Montant total du retour',
  })
  @IsNumber()
  @Min(0)
  total: number;

  @ApiProperty({
    example: false,
    description: 'Indique si le remboursement a été reçu du fournisseur',
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  remboursementRecu?: boolean;

  @ApiProperty({
    example: 300000,
    description: 'Montant remboursé par le fournisseur (si remboursementRecu=true)',
    required: false,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  montantRembourse?: number;

  @ApiProperty({
    example: 'Articles défectueux retournés au fournisseur',
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
