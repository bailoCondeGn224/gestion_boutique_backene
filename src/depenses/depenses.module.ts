import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepensesService } from './depenses.service';
import { DepensesController } from './depenses.controller';
import { Depense } from './entities/depense.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Depense])],
  controllers: [DepensesController],
  providers: [DepensesService],
  exports: [DepensesService], // Export pour utilisation dans InventairesModule
})
export class DepensesModule {}
