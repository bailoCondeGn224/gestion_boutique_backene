import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CustomerResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nom: string;

  @ApiProperty()
  telephone: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;
}
