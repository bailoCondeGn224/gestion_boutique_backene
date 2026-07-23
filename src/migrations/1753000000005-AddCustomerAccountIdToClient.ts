import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerAccountIdToClient1753000000005 implements MigrationInterface {
  name = 'AddCustomerAccountIdToClient1753000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column exists before adding
    const columnExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'client' AND column_name = 'customerAccountId'
    `);

    if (columnExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "client" ADD COLUMN "customerAccountId" uuid
      `);
    }

    // Check if FK exists before adding
    const fkExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_type = 'FOREIGN KEY'
      AND table_name = 'client'
      AND constraint_name LIKE '%customerAccountId%'
    `);

    if (fkExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "client"
        ADD CONSTRAINT "FK_client_customerAccountId"
        FOREIGN KEY ("customerAccountId") REFERENCES "customer_account"("id") ON DELETE SET NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "client" DROP CONSTRAINT IF EXISTS "FK_client_customerAccountId"`);
    await queryRunner.query(`ALTER TABLE "client" DROP COLUMN IF EXISTS "customerAccountId"`);
  }
}
