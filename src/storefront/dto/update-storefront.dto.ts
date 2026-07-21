import { IsString, IsOptional, IsBoolean, IsNumber, Min, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStorefrontDto {
  @ApiPropertyOptional({ example: 'boutique-mariama' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets' })
  slug?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Vêtements et accessoires de qualité' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '+224624123456' })
  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @ApiPropertyOptional({ example: 'Lun-Sam 9h-18h' })
  @IsOptional()
  @IsString()
  horaires?: string;

  @ApiPropertyOptional({ example: 10000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fraisLivraison?: number;

  @ApiPropertyOptional({ example: 'Marché Madina, Conakry' })
  @IsOptional()
  @IsString()
  adresse?: string;
}
