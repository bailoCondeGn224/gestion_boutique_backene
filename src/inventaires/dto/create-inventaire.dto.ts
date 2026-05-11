import { IsString, IsOptional, IsDateString, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateInventaireDto {
  @ApiPropertyOptional({
    example: '2026-05-10T10:00:00.000Z',
    description: 'Date de l\'inventaire (ne peut pas être dans le futur)'
  })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value ? new Date(value).toISOString() : undefined)
  date?: string;

  @ApiPropertyOptional({ example: 'Inventaire mensuel mai 2026' })
  @IsString()
  @IsOptional()
  note?: string;
}
