import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPrixAchatToLigneCommande1752300000000
  implements MigrationInterface
{
  name = 'AddPrixAchatToLigneCommande1752300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ajouter la colonne prixAchat à ligne_commande
    await queryRunner.query(`
      ALTER TABLE "ligne_commande"
      ADD COLUMN IF NOT EXISTS "prixAchat" decimal(15,2) DEFAULT 0
    `);

    console.log('✅ Colonne prixAchat ajoutée à ligne_commande');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ligne_commande"
      DROP COLUMN IF EXISTS "prixAchat"
    `);
  }
}
