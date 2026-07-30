// src/livreurs/dto/update-position.dto.ts
import { IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePositionDto {
  @ApiProperty({ description: 'Latitude GPS' })
  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @ApiProperty({ description: 'Longitude GPS' })
  @IsNumber()
  @IsNotEmpty()
  longitude: number;
}
