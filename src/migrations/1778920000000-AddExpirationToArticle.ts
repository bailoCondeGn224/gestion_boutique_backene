import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddExpirationToArticle1778920000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ajouter la colonne dateExpiration (optionnelle)
    await queryRunner.addColumn(
      'article',
      new TableColumn({
        name: 'dateExpiration',
        type: 'date',
        isNullable: true,
        comment: 'Date d\'expiration du produit (ou du lot le plus proche)',
      }),
    );

    // Ajouter la colonne delaiAlerteExpiration (défaut 30 jours)
    await queryRunner.addColumn(
      'article',
      new TableColumn({
        name: 'delaiAlerteExpiration',
        type: 'int',
        default: 30,
        comment: 'Jours avant expiration pour déclencher une alerte',
      }),
    );

    console.log('✅ Migration AddExpirationToArticle: Colonnes ajoutées avec succès');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer les colonnes
    await queryRunner.dropColumn('article', 'delaiAlerteExpiration');
    await queryRunner.dropColumn('article', 'dateExpiration');

    console.log('✅ Migration AddExpirationToArticle: Colonnes supprimées');
  }
}
