// src/online-orders/online-orders.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnlineOrder } from './entities/online-order.entity';
import { OnlineOrderItem } from './entities/online-order-item.entity';
import { StoreFront } from '../storefront/entities/storefront.entity';
import { Article } from '../stock/entities/article.entity';
import { ModeVente } from '../stock/entities/mode-vente.entity';
import { Client } from '../clients/entities/client.entity';
import { CustomerAccount } from '../customer-auth/entities/customer-account.entity';
import { Vente } from '../ventes/entities/vente.entity';
import { LigneVente } from '../ventes/entities/ligne-vente.entity';
import { Livreur } from '../livreurs/entities/livreur.entity';
import { OnlineOrdersService } from './online-orders.service';
import { OnlineOrdersController } from './online-orders.controller';
import { OnlineOrdersPublicController } from './online-orders-public.controller';
import { LivreurOrdersController } from './livreur-orders.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { StockModule } from '../stock/stock.module';
import { MouvementsStockModule } from '../mouvements-stock/mouvements-stock.module';
import { LivreursModule } from '../livreurs/livreurs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OnlineOrder,
      OnlineOrderItem,
      StoreFront,
      Article,
      ModeVente,
      Client,
      CustomerAccount,
      Vente,
      LigneVente,
      Livreur,
    ]),
    NotificationsModule,
    StockModule,
    MouvementsStockModule,
    LivreursModule,
  ],
  controllers: [OnlineOrdersController, OnlineOrdersPublicController, LivreurOrdersController],
  providers: [OnlineOrdersService],
  exports: [OnlineOrdersService],
})
export class OnlineOrdersModule {}
