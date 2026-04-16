import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { Client } from './entities/client.entity';
import { Vente } from '../ventes/entities/vente.entity';
import { VersementClient } from '../versements-client/entities/versement-client.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Client, Vente, VersementClient])],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
