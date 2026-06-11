import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddExpirationToArticle1778920000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Vérifier si les colonnes existent déjà
    const table = await queryRunner.getTable('article');
    const hasDateExpiration = table?.findColumnByName('dateExpiration');
    const hasDelaiAlerte = table?.findColumnByName('delaiAlerteExpiration');

    // Ajouter la colonne dateExpiration (optionnelle) si elle n'existe pas
    if (!hasDateExpiration) {
      await queryRunner.addColumn(
        'article',
        new TableColumn({
          name: 'dateExpiration',
          type: 'date',
          isNullable: true,
          comment: 'Date d\'expiration du produit (ou du lot le plus proche)',
        }),
      );
      console.log('✅ Colonne dateExpiration ajoutée');
    } else {
      console.log('⚠️  Colonne dateExpiration existe déjà');
    }

    // Ajouter la colonne delaiAlerteExpiration (défaut 30 jours) si elle n'existe pas
    if (!hasDelaiAlerte) {
      await queryRunner.addColumn(
        'article',
        new TableColumn({
          name: 'delaiAlerteExpiration',
          type: 'int',
          default: 30,
          comment: 'Jours avant expiration pour déclencher une alerte',
        }),
      );
      console.log('✅ Colonne delaiAlerteExpiration ajoutée');
    } else {
      console.log('⚠️  Colonne delaiAlerteExpiration existe déjà');
    }

    console.log('✅ Migration AddExpirationToArticle terminée');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer les colonnes
    await queryRunner.dropColumn('article', 'delaiAlerteExpiration');
    await queryRunner.dropColumn('article', 'dateExpiration');

    console.log('✅ Migration AddExpirationToArticle: Colonnes supprimées');
  }
}
