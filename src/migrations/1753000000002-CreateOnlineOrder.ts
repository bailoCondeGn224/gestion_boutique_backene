import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOnlineOrder1753000000002 implements MigrationInterface {
  name = 'CreateOnlineOrder1753000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums if they don't exist
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "online_order_statut_enum" AS ENUM ('EN_ATTENTE', 'CONFIRMEE', 'PRETE', 'LIVREE', 'ANNULEE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "online_order_mode_livraison_enum" AS ENUM ('LIVRAISON', 'RETRAIT_BOUTIQUE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create online_order table if not exists
    const orderTableExists = await queryRunner.hasTable('online_order');
    if (!orderTableExists) {
      await queryRunner.query(`
        CREATE TABLE "online_order" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "numero" varchar(50) NOT NULL UNIQUE,
          "organizationId" uuid NOT NULL,
          "customerAccountId" uuid NOT NULL,
          "clientId" uuid,
          "statut" "online_order_statut_enum" NOT NULL DEFAULT 'EN_ATTENTE',
          "modeLivraison" "online_order_mode_livraison_enum" NOT NULL,
          "adresseLivraison" varchar(500),
          "telephoneLivraison" varchar(20),
          "fraisLivraison" decimal(15,2) NOT NULL DEFAULT 0,
          "sousTotal" decimal(15,2) NOT NULL,
          "total" decimal(15,2) NOT NULL,
          "motifAnnulation" text,
          "confirmeePar" uuid,
          "confirmeeLe" timestamp,
          "preteLe" timestamp,
          "livreeLe" timestamp,
          "annuleeLe" timestamp,
          "venteId" uuid,
          "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "PK_online_order" PRIMARY KEY ("id")
        )
      `);
    }

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_online_order_organizationId" ON "online_order" ("organizationId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_online_order_statut" ON "online_order" ("statut")
    `);

    // Create online_order_item table if not exists
    const itemTableExists = await queryRunner.hasTable('online_order_item');
    if (!itemTableExists) {
      await queryRunner.query(`
        CREATE TABLE "online_order_item" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "onlineOrderId" uuid NOT NULL,
          "articleId" uuid NOT NULL,
          "articleNom" varchar(255) NOT NULL,
          "modeVenteId" uuid,
          "modeVenteNom" varchar(100),
          "quantite" int NOT NULL,
          "prixUnitaire" decimal(15,2) NOT NULL,
          "sousTotal" decimal(15,2) NOT NULL,
          "organizationId" uuid NOT NULL,
          CONSTRAINT "PK_online_order_item" PRIMARY KEY ("id")
        )
      `);
    }

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_online_order_item_organizationId" ON "online_order_item" ("organizationId")
    `);

    // Create FK if not exists
    const fkExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_type = 'FOREIGN KEY'
      AND table_name = 'online_order_item'
      AND constraint_name LIKE '%onlineOrderId%'
    `);

    if (fkExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "online_order_item"
        ADD CONSTRAINT "FK_online_order_item_onlineOrderId"
        FOREIGN KEY ("onlineOrderId") REFERENCES "online_order"("id") ON DELETE CASCADE
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "online_order_item" DROP CONSTRAINT IF EXISTS "FK_online_order_item_onlineOrderId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_online_order_item_organizationId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "online_order_item"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_online_order_statut"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_online_order_organizationId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "online_order"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "online_order_mode_livraison_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "online_order_statut_enum"`);
  }
}
