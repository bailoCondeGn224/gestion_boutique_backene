import { IsUUID, IsInt, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddComptageDto {
  @ApiProperty({ example: 'uuid-article' })
  @IsUUID()
  articleId: string;

  @ApiProperty({ example: 8, description: 'Quantité comptée physiquement' })
  @IsInt()
  @Min(0)
  quantiteComptee: number;

  @ApiPropertyOptional({ example: '2 articles abîmés' })
  @IsString()
  @IsOptional()
  note?: string;
}
