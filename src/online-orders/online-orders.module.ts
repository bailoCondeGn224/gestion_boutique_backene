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
import { OnlineOrdersService } from './online-orders.service';
import { OnlineOrdersController } from './online-orders.controller';
import { OnlineOrdersPublicController } from './online-orders-public.controller';
import { NotificationsModule } from '../notifications/notifications.module';

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
    ]),
    NotificationsModule,
  ],
  controllers: [OnlineOrdersController, OnlineOrdersPublicController],
  providers: [OnlineOrdersService],
  exports: [OnlineOrdersService],
})
export class OnlineOrdersModule {}
