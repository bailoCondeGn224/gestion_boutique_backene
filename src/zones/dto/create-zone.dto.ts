import { IsString, IsBoolean, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateZoneDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  code: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nom: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}
