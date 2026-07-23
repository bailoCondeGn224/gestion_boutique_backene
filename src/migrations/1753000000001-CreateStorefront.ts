import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStorefront1753000000001 implements MigrationInterface {
  name = 'CreateStorefront1753000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table exists
    const tableExists = await queryRunner.hasTable('storefront');

    if (!tableExists) {
      await queryRunner.query(`
        CREATE TABLE "storefront" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "organizationId" uuid NOT NULL,
          "slug" varchar(100) NOT NULL,
          "isActive" boolean NOT NULL DEFAULT false,
          "description" text,
          "logoUrl" varchar(500),
          "whatsappNumber" varchar(20),
          "horaires" varchar(255),
          "fraisLivraison" decimal(15,2) NOT NULL DEFAULT 0,
          "adresse" varchar(500),
          "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "PK_storefront" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_storefront_organizationId" UNIQUE ("organizationId"),
          CONSTRAINT "UQ_storefront_slug" UNIQUE ("slug")
        )
      `);
    }

    // Create index if not exists
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_storefront_slug" ON "storefront" ("slug")
    `);

    // Create FK if not exists
    const fkExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_type = 'FOREIGN KEY'
      AND table_name = 'storefront'
      AND constraint_name LIKE '%organizationId%'
    `);

    if (fkExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "storefront"
        ADD CONSTRAINT "FK_storefront_organizationId"
        FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('storefront');
    const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('organizationId') !== -1);
    if (foreignKey) {
      await queryRunner.dropForeignKey('storefront', foreignKey);
    }
    await queryRunner.dropIndex('storefront', 'IDX_storefront_slug');
    await queryRunner.dropTable('storefront');
  }
}
