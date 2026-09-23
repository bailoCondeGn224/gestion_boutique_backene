import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Suppression de la référence (SKU) des articles.
 * Le champ n'était pas utilisé : la recherche et l'import Excel passent désormais par le nom.
 * Les valeurs déjà saisies sont perdues, la migration inverse ne recrée qu'une colonne vide.
 */
export class DropReferenceFromArticle1780000000004 implements MigrationInterface {
  name = 'DropReferenceFromArticle1780000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "article"
      DROP COLUMN IF EXISTS "reference"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "article"
      ADD COLUMN IF NOT EXISTS "reference" character varying NULL
    `);
  }
}
