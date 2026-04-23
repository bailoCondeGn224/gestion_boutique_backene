import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class AddOrganizationIdToAllEntities1730000000002 implements MigrationInterface {
  // Tables qui doivent avoir organizationId (étendent BaseTenantEntity)
  private tables = [
    'article',
    'categorie',
    'client',
    'vente',
    'ligne_vente',
    'fournisseur',
    'approvisionnement',
    'ligne_approvisionnement',
    'versement',
    'versement_client',
    'mouvement_stock',
    'transaction',
    'zones',
    'parametres', // Même si on va la supprimer, pour compatibilité migration
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const tableName of this.tables) {
      // Ajouter la colonne organizationId
      await queryRunner.addColumn(
        tableName,
        new TableColumn({
          name: 'organizationId',
          type: 'uuid',
          isNullable: false,
        }),
      );

      // Ajouter l'index sur organizationId (performance)
      await queryRunner.createIndex(
        tableName,
        new TableIndex({
          name: `IDX_${tableName}_organizationId`,
          columnNames: ['organizationId'],
        }),
      );

      // Ajouter la foreign key vers organization
      await queryRunner.createForeignKey(
        tableName,
        new TableForeignKey({
          columnNames: ['organizationId'],
          referencedColumnNames: ['id'],
          referencedTableName: 'organization',
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const tableName of this.tables) {
      // Supprimer la foreign key
      const table = await queryRunner.getTable(tableName);
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('organizationId') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey(tableName, foreignKey);
      }

      // Supprimer l'index
      await queryRunner.dropIndex(tableName, `IDX_${tableName}_organizationId`);

      // Supprimer la colonne
      await queryRunner.dropColumn(tableName, 'organizationId');
    }
  }
}
