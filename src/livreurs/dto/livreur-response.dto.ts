// src/livreurs/dto/livreur-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LivreurResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nom: string;

  @ApiProperty()
  telephone: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  photo?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isDelivering: boolean;

  @ApiPropertyOptional()
  latitude?: number;

  @ApiPropertyOptional()
  longitude?: number;

  @ApiPropertyOptional()
  lastPositionAt?: Date;

  @ApiProperty()
  createdAt: Date;
}
