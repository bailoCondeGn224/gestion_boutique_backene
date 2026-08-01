import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { Livreur } from './entities/livreur.entity';
import { LivreursService } from './livreurs.service';
import { LivreursController } from './livreurs.controller';
import { LivreursPublicController } from './livreurs-public.controller';
import { LivreurJwtStrategy } from './strategies/livreur-jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([Livreur]),
    PassportModule.register({ defaultStrategy: 'livreur-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '30d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [LivreursController, LivreursPublicController],
  providers: [LivreursService, LivreurJwtStrategy],
  exports: [LivreursService, TypeOrmModule],
})
export class LivreursModule {}
