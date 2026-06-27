import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateZakatTables1750000000000 implements MigrationInterface {
  name = 'CreateZakatTables1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Créer l'enum pour le type d'irrigation
    await queryRunner.query(`
      CREATE TYPE "public"."zakat_irrigation_type_enum" AS ENUM('AUCUN', 'PLUIE', 'ARTIFICIEL', 'MIXTE')
    `);

    // Créer l'enum pour le statut
    await queryRunner.query(`
      CREATE TYPE "public"."zakat_status_enum" AS ENUM('BROUILLON', 'CALCULE', 'PAYE')
    `);

    // Créer la table zakat_settings
    await queryRunner.query(`
      CREATE TABLE "zakat_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" uuid NOT NULL,
        "prixOrGrammeUsd" decimal(10,4) NOT NULL DEFAULT '0',
        "prixArgentGrammeUsd" decimal(10,4) NOT NULL DEFAULT '0',
        "tauxUsdGnf" decimal(12,2) NOT NULL DEFAULT '8600',
        "prixOrGrammeGnf" decimal(15,2) NOT NULL DEFAULT '0',
        "prixArgentGrammeGnf" decimal(15,2) NOT NULL DEFAULT '0',
        "nisabGnf" decimal(18,2) NOT NULL DEFAULT '0',
        "prixMouton" decimal(15,2) NOT NULL DEFAULT '500000',
        "prixVeau1an" decimal(15,2) NOT NULL DEFAULT '1500000',
        "prixVeau2ans" decimal(15,2) NOT NULL DEFAULT '2500000',
        "prixVache" decimal(15,2) NOT NULL DEFAULT '3500000',
        "prixChamelle1an" decimal(15,2) NOT NULL DEFAULT '5000000',
        "prixChamelle2ans" decimal(15,2) NOT NULL DEFAULT '8000000',
        "prixChameauAdulte" decimal(15,2) NOT NULL DEFAULT '12000000',
        "lastPriceUpdate" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_zakat_settings" PRIMARY KEY ("id"),
        CONSTRAINT "FK_zakat_settings_organization" FOREIGN KEY ("organizationId")
          REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    // Créer la table zakat_calculations
    await queryRunner.query(`
      CREATE TABLE "zakat_calculations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" uuid NOT NULL,
        "userId" uuid,
        "dateCalcul" date NOT NULL,
        "annee" integer NOT NULL,

        -- Hawl (année lunaire)
        "dateAtteinteNisab" date,
        "hawlComplete" boolean NOT NULL DEFAULT false,

        -- Liquidités
        "cashMaison" decimal(18,2) NOT NULL DEFAULT '0',
        "cashBanque" decimal(18,2) NOT NULL DEFAULT '0',
        "cashMobile" decimal(18,2) NOT NULL DEFAULT '0',

        -- Or & Argent
        "orPoids" decimal(10,2) NOT NULL DEFAULT '0',
        "orInclureBijoux" boolean NOT NULL DEFAULT true,
        "orPrixGramme" decimal(18,2) NOT NULL DEFAULT '0',
        "argentPoids" decimal(10,2) NOT NULL DEFAULT '0',
        "argentPrixGramme" decimal(18,2) NOT NULL DEFAULT '0',

        -- Investissements
        "investActions" decimal(18,2) NOT NULL DEFAULT '0',
        "investImmobilier" decimal(18,2) NOT NULL DEFAULT '0',
        "investAutres" decimal(18,2) NOT NULL DEFAULT '0',

        -- Commerce
        "comStockValeur" decimal(18,2) NOT NULL DEFAULT '0',
        "comCreances" decimal(18,2) NOT NULL DEFAULT '0',
        "comLiquidites" decimal(18,2) NOT NULL DEFAULT '0',

        -- Agriculture (checkbox + champs)
        "hasAgriculture" boolean NOT NULL DEFAULT false,
        "agriQuantiteKg" decimal(10,2) NOT NULL DEFAULT '0',
        "agriValeurRecolte" decimal(18,2) NOT NULL DEFAULT '0',
        "agriIrrigation" "public"."zakat_irrigation_type_enum" NOT NULL DEFAULT 'AUCUN',

        -- Bétail (checkbox + champs)
        "hasBetail" boolean NOT NULL DEFAULT false,
        "betailChameaux" integer NOT NULL DEFAULT '0',
        "betailBovins" integer NOT NULL DEFAULT '0',
        "betailOvins" integer NOT NULL DEFAULT '0',
        "betailCaprins" integer NOT NULL DEFAULT '0',

        -- Dettes
        "dettesPersonnelles" decimal(18,2) NOT NULL DEFAULT '0',
        "dettesFournisseurs" decimal(18,2) NOT NULL DEFAULT '0',

        -- Totaux calculés
        "totalLiquidites" decimal(18,2) NOT NULL DEFAULT '0',
        "totalOrArgent" decimal(18,2) NOT NULL DEFAULT '0',
        "totalInvestissements" decimal(18,2) NOT NULL DEFAULT '0',
        "totalCommerce" decimal(18,2) NOT NULL DEFAULT '0',
        "totalActifs" decimal(18,2) NOT NULL DEFAULT '0',
        "totalDettes" decimal(18,2) NOT NULL DEFAULT '0',
        "montantZakatable" decimal(18,2) NOT NULL DEFAULT '0',

        -- Nisab et assujettissement
        "nisabUtilise" decimal(18,2) NOT NULL DEFAULT '0',
        "assujetti" boolean NOT NULL DEFAULT false,

        -- Zakat calculée
        "zakatMal" decimal(18,2) NOT NULL DEFAULT '0',
        "zakatAgriculture" decimal(18,2) NOT NULL DEFAULT '0',
        "zakatBetail" decimal(18,2) NOT NULL DEFAULT '0',
        "zakatTotal" decimal(18,2) NOT NULL DEFAULT '0',

        -- Statut
        "statut" "public"."zakat_status_enum" NOT NULL DEFAULT 'CALCULE',
        "datePaiement" date,
        "notes" text,

        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),

        CONSTRAINT "PK_zakat_calculations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_zakat_calculations_organization" FOREIGN KEY ("organizationId")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_zakat_calculations_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // Index pour les recherches
    await queryRunner.query(`
      CREATE INDEX "IDX_zakat_calculations_organization" ON "zakat_calculations" ("organizationId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_zakat_calculations_annee" ON "zakat_calculations" ("annee")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_zakat_settings_organization" ON "zakat_settings" ("organizationId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_zakat_settings_organization"`);
    await queryRunner.query(`DROP INDEX "IDX_zakat_calculations_annee"`);
    await queryRunner.query(`DROP INDEX "IDX_zakat_calculations_organization"`);
    await queryRunner.query(`DROP TABLE "zakat_calculations"`);
    await queryRunner.query(`DROP TABLE "zakat_settings"`);
    await queryRunner.query(`DROP TYPE "public"."zakat_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."zakat_irrigation_type_enum"`);
  }
}
