import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VersementsClientService } from './versements-client.service';
import { VersementsClientController } from './versements-client.controller';
import { VersementClient } from './entities/versement-client.entity';
import { Client } from '../clients/entities/client.entity';
import { Vente } from '../ventes/entities/vente.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VersementClient, Client, Vente])],
  controllers: [VersementsClientController],
  providers: [VersementsClientService],
  exports: [VersementsClientService],
})
export class VersementsClientModule {}
