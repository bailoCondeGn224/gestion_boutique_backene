import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { Categorie } from './entities/categorie.entity';
import { Article } from '../stock/entities/article.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Categorie, Article])],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
