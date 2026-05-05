import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VentesService } from './ventes.service';
import { VentesController } from './ventes.controller';
import { Vente } from './entities/vente.entity';
import { LigneVente } from './entities/ligne-vente.entity';
import { Client } from '../clients/entities/client.entity';
import { VersementClient } from '../versements-client/entities/versement-client.entity';
import { StockModule } from '../stock/stock.module';
import { MouvementsStockModule } from '../mouvements-stock/mouvements-stock.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vente, LigneVente, Client, VersementClient]),
    StockModule,
    MouvementsStockModule,
  ],
  controllers: [VentesController],
  providers: [VentesService],
  exports: [VentesService],
})
export class VentesModule {}
