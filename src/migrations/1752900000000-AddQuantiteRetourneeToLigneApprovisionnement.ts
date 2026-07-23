import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuantiteRetourneeToLigneApprovisionnement1752900000000 implements MigrationInterface {
  name = 'AddQuantiteRetourneeToLigneApprovisionnement1752900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ajouter la colonne quantiteRetournee si elle n'existe pas
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'ligne_approvisionnement'
          AND column_name = 'quantiteRetournee'
        ) THEN
          ALTER TABLE "ligne_approvisionnement" ADD "quantiteRetournee" integer DEFAULT 0;
        END IF;
      END $$;
    `);

    console.log('Colonne quantiteRetournee ajoutée à ligne_approvisionnement');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ligne_approvisionnement" DROP COLUMN IF EXISTS "quantiteRetournee"
    `);
    console.log('Colonne quantiteRetournee supprimée de ligne_approvisionnement');
  }
}
