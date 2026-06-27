import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixZakatPrixPrecision1750000000001 implements MigrationInterface {
  name = 'FixZakatPrixPrecision1750000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Augmenter la précision des colonnes prix or et argent
    await queryRunner.query(`
      ALTER TABLE "zakat_calculations"
      ALTER COLUMN "orPrixGramme" TYPE numeric(18,2)
    `);

    await queryRunner.query(`
      ALTER TABLE "zakat_calculations"
      ALTER COLUMN "argentPrixGramme" TYPE numeric(18,2)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "zakat_calculations"
      ALTER COLUMN "orPrixGramme" TYPE numeric(10,4)
    `);

    await queryRunner.query(`
      ALTER TABLE "zakat_calculations"
      ALTER COLUMN "argentPrixGramme" TYPE numeric(10,4)
    `);
  }
}
