import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Servir les fichiers statiques depuis le dossier uploads
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Validation globale
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS - Configuration permissive pour le développement
  app.enableCors({
    origin: true, // Accepte toutes les origines en dev
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['Authorization', 'Content-Length', 'X-Request-Id'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Configuration Swagger
  const config = new DocumentBuilder()
    .setTitle('API Gestion Boutique Abayas')
    .setDescription(
      'API REST pour la gestion d\'une boutique d\'abayas - Stock, Ventes, Fournisseurs, Finances',
    )
    .setVersion('1.0')
    .addTag('auth', 'Authentification et gestion des sessions')
    .addTag('users', 'Gestion des utilisateurs')
    .addTag('stock', 'Gestion du stock et des articles')
    .addTag('ventes', 'Gestion des ventes et transactions')
    .addTag('fournisseurs', 'Gestion des fournisseurs')
    .addTag('versements', 'Gestion des paiements fournisseurs')
    .addTag('finances', 'Rapports financiers et trésorerie')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`\n🚀 Application démarrée sur http://localhost:${port}`);
  console.log(`📚 Documentation Swagger : http://localhost:${port}/api/docs\n`);
}
bootstrap();
