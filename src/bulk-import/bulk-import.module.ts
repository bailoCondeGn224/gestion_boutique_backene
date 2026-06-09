import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BulkImportController } from './bulk-import.controller';
import { BulkImportService } from './bulk-import.service';
import { Article } from '../stock/entities/article.entity';
import { Categorie } from '../categories/entities/categorie.entity';
import { Fournisseur } from '../fournisseurs/entities/fournisseur.entity';
import { Approvisionnement } from '../approvisionnements/entities/approvisionnement.entity';
import { LigneApprovisionnement } from '../approvisionnements/entities/ligne-approvisionnement.entity';
import { MouvementStock } from '../mouvements-stock/entities/mouvement-stock.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Article,
      Categorie,
      Fournisseur,
      Approvisionnement,
      LigneApprovisionnement,
      MouvementStock,
    ]),
  ],
  controllers: [BulkImportController],
  providers: [BulkImportService],
  exports: [BulkImportService],
})
export class BulkImportModule {}
