import { IsString, IsNotEmpty, IsEnum, IsArray, ValidateNested, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModeLivraison } from '../entities/online-order.entity';

export class CreateOnlineOrderItemDto {
  @ApiProperty()
  @IsUUID()
  articleId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  modeVenteId?: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantite: number;
}

export class CreateOnlineOrderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  storeSlug: string;

  @ApiProperty({ enum: ModeLivraison })
  @IsEnum(ModeLivraison)
  modeLivraison: ModeLivraison;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adresseLivraison?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telephoneLivraison?: string;

  @ApiProperty({ type: [CreateOnlineOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOnlineOrderItemDto)
  items: CreateOnlineOrderItemDto[];
}
