import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventairesController } from './inventaires.controller';
import { InventairesService } from './inventaires.service';
import { Inventaire } from './entities/inventaire.entity';
import { ComptageInventaire } from './entities/comptage-inventaire.entity';
import { Article } from '../stock/entities/article.entity';
import { MouvementStock } from '../mouvements-stock/entities/mouvement-stock.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Inventaire,
      ComptageInventaire,
      Article,
      MouvementStock,
    ]),
  ],
  controllers: [InventairesController],
  providers: [InventairesService],
  exports: [InventairesService],
})
export class InventairesModule {}
