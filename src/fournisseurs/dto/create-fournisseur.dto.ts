import {
  IsString,
  IsEmail,
  IsArray,
  IsNumber,
  Min,
  Max,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StatutFournisseur } from '../entities/fournisseur.entity';

export class CreateFournisseurDto {
  @ApiProperty({ example: 'Al-Nour Textiles' })
  @IsString()
  nom: string;

  @ApiProperty({
    example: 'Dubaï, Émirats Arabes Unis',
    description: 'Adresse du fournisseur',
    required: false,
  })
  @IsString()
  @IsOptional()
  adresse?: string;

  @ApiProperty({ example: '+971 55 123 4567' })
  @IsString()
  telephone: string;

  @ApiProperty({ example: 'contact@alnour.ae', required: false })
  @IsEmail({}, { message: 'Email invalide' })
  @IsOptional()
  email?: string;

  @ApiProperty({
    example: ['Abayas', 'Foulards'],
    type: [String],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  produits?: string[];

  @ApiProperty({ example: 4.5, minimum: 0, maximum: 5, required: false })
  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  rating?: number;

  @ApiProperty({ example: 'actif', enum: StatutFournisseur, required: false })
  @IsEnum(StatutFournisseur)
  @IsOptional()
  statut?: StatutFournisseur;

  @ApiProperty({ example: 5000000, minimum: 0, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  totalAchats?: number;

  @ApiProperty({ example: 800000, minimum: 0, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  totalPaye?: number;
}
