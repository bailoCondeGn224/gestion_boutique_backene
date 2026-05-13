import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInventaireIdToDepense1778700000000 implements MigrationInterface {
  name = 'AddInventaireIdToDepense1778700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Vérifier si la colonne existe déjà
    const columnExists = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'depense' AND column_name = 'inventaireId'
    `);

    // Ajouter la colonne seulement si elle n'existe pas
    if (columnExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "depense"
        ADD COLUMN "inventaireId" uuid NULL
      `);
    }

    // Ajouter la contrainte de clé étrangère (si elle n'existe pas déjà)
    const constraintExists = await queryRunner.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'depense' AND constraint_name = 'FK_depense_inventaire'
    `);

    if (constraintExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "depense"
        ADD CONSTRAINT "FK_depense_inventaire"
        FOREIGN KEY ("inventaireId")
        REFERENCES "inventaire"("id")
        ON DELETE SET NULL
      `);
    }

    // Créer un index (si il n'existe pas déjà)
    const indexExists = await queryRunner.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'depense' AND indexname = 'IDX_depense_inventaireId'
    `);

    if (indexExists.length === 0) {
      await queryRunner.query(`
        CREATE INDEX "IDX_depense_inventaireId"
        ON "depense" ("inventaireId")
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer l'index
    await queryRunner.query(`
      DROP INDEX "IDX_depense_inventaireId"
    `);

    // Supprimer la contrainte de clé étrangère
    await queryRunner.query(`
      ALTER TABLE "depense"
      DROP CONSTRAINT "FK_depense_inventaire"
    `);

    // Supprimer la colonne
    await queryRunner.query(`
      ALTER TABLE "depense"
      DROP COLUMN "inventaireId"
    `);
  }
}
