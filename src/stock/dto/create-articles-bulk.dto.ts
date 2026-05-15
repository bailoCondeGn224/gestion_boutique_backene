import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateArticleDto } from './create-article.dto';

export class CreateArticlesBulkDto {
  @ApiProperty({
    description: 'Liste des articles à créer',
    type: [CreateArticleDto],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Au moins un article doit être fourni' })
  @ValidateNested({ each: true })
  @Type(() => CreateArticleDto)
  articles: CreateArticleDto[];
}
