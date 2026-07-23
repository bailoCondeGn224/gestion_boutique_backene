import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RetoursService } from './retours.service';
import { RetoursController } from './retours.controller';
import { Vente } from '../ventes/entities/vente.entity';
import { LigneVente } from '../ventes/entities/ligne-vente.entity';
import { RetourClient } from './entities/retour-client.entity';
import { LigneRetourClient } from './entities/ligne-retour-client.entity';
import { RetourFournisseur } from './entities/retour-fournisseur.entity';
import { LigneRetourFournisseur } from './entities/ligne-retour-fournisseur.entity';
import { Approvisionnement } from '../approvisionnements/entities/approvisionnement.entity';
import { LigneApprovisionnement } from '../approvisionnements/entities/ligne-approvisionnement.entity';
import { Client } from '../clients/entities/client.entity';
import { Fournisseur } from '../fournisseurs/entities/fournisseur.entity';
import { Article } from '../stock/entities/article.entity';
import { Transaction } from '../finances/entities/transaction.entity';
import { MouvementsStockModule } from '../mouvements-stock/mouvements-stock.module';
import { ValidationModule } from '../validation/validation.module';

// Import des nouveaux repositories
import { ArticleRepository } from '../stock/repositories/article.repository';
import { MouvementStockRepository } from '../mouvements-stock/repositories/mouvement-stock.repository';
import { ClientRepository } from '../clients/repositories/client.repository';
import { VenteRepository } from '../ventes/repositories/vente.repository';
import { TransactionRepository } from '../finances/repositories/transaction.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Vente,
      LigneVente,
      RetourClient,
      LigneRetourClient,
      RetourFournisseur,
      LigneRetourFournisseur,
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
  providers: [
    RetoursService,
    ArticleRepository,
    MouvementStockRepository,
    ClientRepository,
    VenteRepository,
    TransactionRepository,
  ],
  exports: [RetoursService],
})
export class RetoursModule {}
