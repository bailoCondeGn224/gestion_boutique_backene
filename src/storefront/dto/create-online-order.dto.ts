// src/storefront/dto/create-online-order.dto.ts
import { IsString, IsNotEmpty, IsArray, ValidateNested, IsNumber, Min, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModeLivraison } from '../../online-orders/entities/online-order.entity';

export class OrderArticleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  articleId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantite: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  prixUnitaire: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  modeVenteId?: string;
}

export class CreateOnlineOrderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nomClient: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  telephone: string;

  @ApiPropertyOptional({ enum: ModeLivraison, default: ModeLivraison.RETRAIT_BOUTIQUE })
  @IsOptional()
  @IsEnum(ModeLivraison)
  modeLivraison?: ModeLivraison;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  adresseLivraison?: string;

  @ApiPropertyOptional({ description: 'Latitude du lieu de livraison' })
  @IsOptional()
  @IsNumber()
  latitudeLivraison?: number;

  @ApiPropertyOptional({ description: 'Longitude du lieu de livraison' })
  @IsOptional()
  @IsNumber()
  longitudeLivraison?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [OrderArticleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderArticleDto)
  articles: OrderArticleDto[];
}
