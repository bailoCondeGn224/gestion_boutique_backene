// src/livreurs/livreurs.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Livreur } from './entities/livreur.entity';
import { StoreFront } from '../storefront/entities/storefront.entity';
import { LivreursService } from './livreurs.service';
import {
  LivreursController,
  LivreursPublicController,
  LivreurAuthController,
} from './livreurs.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Livreur, StoreFront]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [LivreursController, LivreursPublicController, LivreurAuthController],
  providers: [LivreursService],
  exports: [LivreursService],
})
export class LivreursModule {}
