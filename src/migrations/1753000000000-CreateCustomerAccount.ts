import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCustomerAccount1753000000000 implements MigrationInterface {
  name = 'CreateCustomerAccount1753000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('customer_account');

    if (!tableExists) {
      await queryRunner.query(`
        CREATE TABLE "customer_account" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "nom" varchar(255) NOT NULL,
          "telephone" varchar(20) NOT NULL UNIQUE,
          "email" varchar(255),
          "passwordHash" varchar(255) NOT NULL,
          "isActive" boolean NOT NULL DEFAULT true,
          "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "PK_customer_account" PRIMARY KEY ("id")
        )
      `);
    }

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_customer_account_telephone" ON "customer_account" ("telephone")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_customer_account_telephone"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_account"`);
  }
}
