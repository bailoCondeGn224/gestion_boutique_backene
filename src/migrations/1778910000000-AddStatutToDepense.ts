import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddStatutToDepense1778910000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Créer le type enum pour le statut des dépenses
    await queryRunner.query(`
      CREATE TYPE "depense_statut_enum" AS ENUM ('EN_ATTENTE', 'INCLUSE');
    `);

    // Ajouter la colonne statut avec valeur par défaut
    await queryRunner.addColumn(
      'depense',
      new TableColumn({
        name: 'statut',
        type: 'enum',
        enum: ['EN_ATTENTE', 'INCLUSE'],
        default: "'EN_ATTENTE'",
        comment: 'Statut de la dépense (EN_ATTENTE ou INCLUSE dans un inventaire)',
      }),
    );

    // Mettre à jour les dépenses existantes qui ont déjà un inventaireId
    await queryRunner.query(`
      UPDATE depense
      SET statut = 'INCLUSE'
      WHERE "inventaireId" IS NOT NULL;
    `);

    console.log('✅ Migration AddStatutToDepense: Colonne statut ajoutée avec succès');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer la colonne statut
    await queryRunner.dropColumn('depense', 'statut');

    // Supprimer le type enum
    await queryRunner.query(`DROP TYPE "depense_statut_enum";`);

    console.log('✅ Migration AddStatutToDepense: Colonne statut supprimée');
  }
}
