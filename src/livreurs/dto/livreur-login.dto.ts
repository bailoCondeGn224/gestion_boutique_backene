// src/livreurs/dto/livreur-login.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LivreurLoginDto {
  @ApiProperty({ description: 'Numéro de téléphone du livreur' })
  @IsString()
  @IsNotEmpty()
  telephone: string;

  @ApiProperty({ description: 'Mot de passe' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: 'Slug de la boutique' })
  @IsString()
  @IsNotEmpty()
  storeSlug: string;
}
