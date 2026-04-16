import { IsString, IsOptional, IsArray, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ example: 'VENDEUR' })
  @IsString()
  nom: string;

  @ApiProperty({ example: 'Vendeur avec accès aux ventes uniquement', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: true, required: false, default: true })
  @IsOptional()
  @IsBoolean()
  actif?: boolean;

  @ApiProperty({
    example: ['uuid-1', 'uuid-2'],
    description: 'IDs des permissions à assigner au rôle',
    required: false,
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds?: string[];
}
