import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { Article } from './entities/article.entity';
import { CategoriesModule } from '../categories/categories.module';
import { MouvementsStockModule } from '../mouvements-stock/mouvements-stock.module';
import { MouvementStock } from '../mouvements-stock/entities/mouvement-stock.entity';
import { LigneVente } from '../ventes/entities/ligne-vente.entity';
import { LigneApprovisionnement } from '../approvisionnements/entities/ligne-approvisionnement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Article, LigneVente, LigneApprovisionnement, MouvementStock]),
    CategoriesModule,
    MouvementsStockModule,
  ],
  controllers: [StockController],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}
