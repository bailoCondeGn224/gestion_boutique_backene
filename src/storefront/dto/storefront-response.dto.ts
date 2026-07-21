import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StorefrontResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  logoUrl?: string;

  @ApiPropertyOptional()
  whatsappNumber?: string;

  @ApiPropertyOptional()
  horaires?: string;

  @ApiProperty()
  fraisLivraison: number;

  @ApiPropertyOptional()
  adresse?: string;

  @ApiProperty()
  organizationNom: string;

  @ApiProperty()
  fullUrl: string;
}
