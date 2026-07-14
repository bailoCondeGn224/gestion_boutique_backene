import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { Article } from './entities/article.entity';
import { ModeVente } from './entities/mode-vente.entity';
import { ModeVenteService } from './mode-vente.service';
import { ModeVenteController } from './mode-vente.controller';
import { CategoriesModule } from '../categories/categories.module';
import { MouvementsStockModule } from '../mouvements-stock/mouvements-stock.module';
import { MouvementStock } from '../mouvements-stock/entities/mouvement-stock.entity';
import { LigneVente } from '../ventes/entities/ligne-vente.entity';
import { LigneApprovisionnement } from '../approvisionnements/entities/ligne-approvisionnement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Article,
      ModeVente,
      LigneVente,
      LigneApprovisionnement,
      MouvementStock,
    ]),
    CategoriesModule,
    MouvementsStockModule,
  ],
  controllers: [StockController, ModeVenteController],
  providers: [StockService, ModeVenteService],
  exports: [StockService, ModeVenteService],
})
export class StockModule {}
