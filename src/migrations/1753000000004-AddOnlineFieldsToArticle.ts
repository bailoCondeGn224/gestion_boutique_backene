import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOnlineFieldsToArticle1753000000004 implements MigrationInterface {
  name = 'AddOnlineFieldsToArticle1753000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column exists before adding
    const disponibleEnLigneExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'article' AND column_name = 'disponibleEnLigne'
    `);

    if (disponibleEnLigneExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "article" ADD COLUMN "disponibleEnLigne" boolean NOT NULL DEFAULT false
      `);
    }

    const prixEnLigneExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'article' AND column_name = 'prixEnLigne'
    `);

    if (prixEnLigneExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "article" ADD COLUMN "prixEnLigne" decimal(15,2)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "article" DROP COLUMN IF EXISTS "prixEnLigne"`);
    await queryRunner.query(`ALTER TABLE "article" DROP COLUMN IF EXISTS "disponibleEnLigne"`);
  }
}
