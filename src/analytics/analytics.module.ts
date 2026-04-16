import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Article } from '../stock/entities/article.entity';
import { Client } from '../clients/entities/client.entity';
import { Vente } from '../ventes/entities/vente.entity';
import { Fournisseur } from '../fournisseurs/entities/fournisseur.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Article, Client, Vente, Fournisseur]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
