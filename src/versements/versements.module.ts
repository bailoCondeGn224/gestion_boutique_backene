import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VersementsService } from './versements.service';
import { VersementsController } from './versements.controller';
import { Versement } from './entities/versement.entity';
import { FournisseursModule } from '../fournisseurs/fournisseurs.module';

@Module({
  imports: [TypeOrmModule.forFeature([Versement]), FournisseursModule],
  controllers: [VersementsController],
  providers: [VersementsService],
  exports: [VersementsService],
})
export class VersementsModule {}
