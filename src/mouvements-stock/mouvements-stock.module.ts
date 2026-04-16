import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MouvementStock } from './entities/mouvement-stock.entity';
import { MouvementsStockService } from './mouvements-stock.service';
import { MouvementsStockController } from './mouvements-stock.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MouvementStock])],
  controllers: [MouvementsStockController],
  providers: [MouvementsStockService],
  exports: [MouvementsStockService],
})
export class MouvementsStockModule {}
