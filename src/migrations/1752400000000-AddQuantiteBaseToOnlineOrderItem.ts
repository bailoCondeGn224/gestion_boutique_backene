import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddQuantiteBaseToOnlineOrderItem1752400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ajouter la colonne quantiteBase
    await queryRunner.addColumn(
      'online_order_item',
      new TableColumn({
        name: 'quantiteBase',
        type: 'int',
        isNullable: true, // Nullable pour les anciennes données
        comment: 'Quantité en unités de stock (ex: 3 paquets × 4 = 12 unités)',
      }),
    );

    // Mettre à jour les anciennes données: quantiteBase = quantite pour les items sans mode de vente
    await queryRunner.query(`
      UPDATE online_order_item
      SET quantiteBase = quantite
      WHERE quantiteBase IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('online_order_item', 'quantiteBase');
  }
}
