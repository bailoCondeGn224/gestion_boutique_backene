import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParametresService } from './parametres.service';
import { ParametresController } from './parametres.controller';
import { Parametre } from './entities/parametre.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Parametre])],
  controllers: [ParametresController],
  providers: [ParametresService],
  exports: [ParametresService], // Permettre aux autres modules d'utiliser le service
})
export class ParametresModule {}
