// src/storefront/dto/create-online-order.dto.ts
import { IsString, IsNotEmpty, IsArray, ValidateNested, IsNumber, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  adresseLivraison?: string;

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
