import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeCustomerAccountIdNullable1752400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rendre customerAccountId nullable pour permettre les commandes publiques
    await queryRunner.query(`
      ALTER TABLE "online_order"
      ALTER COLUMN "customerAccountId" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restaurer la contrainte NOT NULL
    await queryRunner.query(`
      ALTER TABLE "online_order"
      ALTER COLUMN "customerAccountId" SET NOT NULL
    `);
  }
}
