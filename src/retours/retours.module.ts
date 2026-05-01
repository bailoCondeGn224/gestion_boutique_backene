import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RetoursService } from './retours.service';
import { RetoursController } from './retours.controller';
import { Vente } from '../ventes/entities/vente.entity';
import { LigneVente } from '../ventes/entities/ligne-vente.entity';
import { Approvisionnement } from '../approvisionnements/entities/approvisionnement.entity';
import { LigneApprovisionnement } from '../approvisionnements/entities/ligne-approvisionnement.entity';
import { Client } from '../clients/entities/client.entity';
import { Fournisseur } from '../fournisseurs/entities/fournisseur.entity';
import { Article } from '../stock/entities/article.entity';
import { Transaction } from '../finances/entities/transaction.entity';
import { MouvementsStockModule } from '../mouvements-stock/mouvements-stock.module';
import { ValidationModule } from '../validation/validation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Vente,
      LigneVente,
      Approvisionnement,
      LigneApprovisionnement,
      Client,
      Fournisseur,
      Article,
      Transaction,
    ]),
    MouvementsStockModule,
    ValidationModule,
  ],
  controllers: [RetoursController],
  providers: [RetoursService],
  exports: [RetoursService],
})
export class RetoursModule {}
