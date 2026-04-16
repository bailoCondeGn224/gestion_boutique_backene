import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApprovisionnementService } from './approvisionnements.service';
import { ApprovisionnementController } from './approvisionnements.controller';
import { Approvisionnement } from './entities/approvisionnement.entity';
import { LigneApprovisionnement } from './entities/ligne-approvisionnement.entity';
import { MouvementsStockModule } from '../mouvements-stock/mouvements-stock.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Approvisionnement, LigneApprovisionnement]),
    MouvementsStockModule,
  ],
  controllers: [ApprovisionnementController],
  providers: [ApprovisionnementService],
  exports: [ApprovisionnementService],
})
export class ApprovisionnementModule {}
