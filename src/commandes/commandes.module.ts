import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommandesService } from './commandes.service';
import { CommandesController } from './commandes.controller';
import { Commande } from './entities/commande.entity';
import { LigneCommande } from './entities/ligne-commande.entity';
import { VentesModule } from '../ventes/ventes.module';
import { ClientsModule } from '../clients/clients.module';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Commande, LigneCommande]),
    VentesModule,
    ClientsModule,
    StockModule,
  ],
  controllers: [CommandesController],
  providers: [CommandesService],
  exports: [CommandesService],
})
export class CommandesModule {}
