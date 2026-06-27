import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { ZakatController } from './zakat.controller';
import { ZakatService } from './zakat.service';
import { MetalPricesService } from './metal-prices.service';
import { ZakatCalculation } from './entities/zakat-calculation.entity';
import { ZakatSettings } from './entities/zakat-settings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ZakatCalculation, ZakatSettings]),
    HttpModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [ZakatController],
  providers: [ZakatService, MetalPricesService],
  exports: [ZakatService, MetalPricesService],
})
export class ZakatModule {}
