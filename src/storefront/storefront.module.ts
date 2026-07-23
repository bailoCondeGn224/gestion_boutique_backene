// src/storefront/storefront.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreFront } from './entities/storefront.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Article } from '../stock/entities/article.entity';
import { StorefrontService } from './storefront.service';
import { StorefrontController } from './storefront.controller';
import { StorefrontPublicController } from './storefront-public.controller';
import { OnlineOrdersModule } from '../online-orders/online-orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StoreFront, Organization, Article]),
    OnlineOrdersModule,
  ],
  controllers: [StorefrontController, StorefrontPublicController],
  providers: [StorefrontService],
  exports: [StorefrontService],
})
export class StorefrontModule {}
