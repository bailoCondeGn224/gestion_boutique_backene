import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { Organization } from '../organizations/entities/organization.entity';
import { User } from '../users/entities/user.entity';
import { Plan } from '../plans/entities/plan.entity';
import { Vente } from '../ventes/entities/vente.entity';
import { Client } from '../clients/entities/client.entity';
import { Article } from '../stock/entities/article.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      User,
      Plan,
      Vente,
      Client,
      Article,
    ]),
  ],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService],
  exports: [AdminDashboardService],
})
export class AdminDashboardModule {}
