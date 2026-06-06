import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddStatutVente1738900000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Créer le type enum seulement s'il n'existe pas déjà
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "vente_statut_enum" AS ENUM ('active', 'annulee');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Vérifier si la colonne existe déjà
    const table = await queryRunner.getTable('vente');
    const statutColumn = table?.findColumnByName('statut');

    if (!statutColumn) {
      // Ajouter la colonne statut avec valeur par défaut 'active'
      await queryRunner.addColumn(
        'vente',
        new TableColumn({
          name: 'statut',
          type: 'vente_statut_enum',
          default: "'active'",
          isNullable: false,
        }),
      );

      // Mettre à jour toutes les ventes existantes comme 'active'
      await queryRunner.query(`
        UPDATE vente SET statut = 'active' WHERE statut IS NULL;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer la colonne
    await queryRunner.dropColumn('vente', 'statut');

    // Supprimer le type enum
    await queryRunner.query(`
      DROP TYPE "vente_statut_enum";
    `);
  }
}
