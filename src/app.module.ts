import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { StockModule } from './stock/stock.module';
import { ClientsModule } from './clients/clients.module';
import { VentesModule } from './ventes/ventes.module';
import { FournisseursModule } from './fournisseurs/fournisseurs.module';
import { ApprovisionnementModule } from './approvisionnements/approvisionnements.module';
import { VersementsModule } from './versements/versements.module';
import { VersementsClientModule } from './versements-client/versements-client.module';
import { FinancesModule } from './finances/finances.module';
import { CategoriesModule } from './categories/categories.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { MouvementsStockModule } from './mouvements-stock/mouvements-stock.module';
import { PermissionsModule } from './permissions/permissions.module';
import { RolesModule } from './roles/roles.module';
import { ParametresModule } from './parametres/parametres.module';
import { ZonesModule } from './zones/zones.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST'),
        port: +configService.get('DATABASE_PORT'),
        username: configService.get('DATABASE_USER'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: false,
        extra: {
          max: 10,
          min: 2,
        },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    ZonesModule,
    CategoriesModule,
    StockModule,
    ClientsModule,
    VentesModule,
    FournisseursModule,
    ApprovisionnementModule,
    VersementsModule,
    VersementsClientModule,
    FinancesModule,
    AnalyticsModule,
    MouvementsStockModule,
    PermissionsModule,
    RolesModule,
    ParametresModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
