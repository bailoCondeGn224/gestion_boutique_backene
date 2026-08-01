import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableColumn,
} from 'typeorm';

export class AddLivreurTable1779000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('livreur');
    if (!tableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'livreur',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'uuid_generate_v4()',
            },
            { name: 'organizationId', type: 'uuid', isNullable: false },
            { name: 'nom', type: 'varchar', length: '255', isNullable: false },
            {
              name: 'telephone',
              type: 'varchar',
              length: '20',
              isUnique: true,
              isNullable: false,
            },
            {
              name: 'passwordHash',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            { name: 'isActive', type: 'boolean', default: true },
            {
              name: 'latitude',
              type: 'decimal',
              precision: 10,
              scale: 7,
              isNullable: true,
            },
            {
              name: 'longitude',
              type: 'decimal',
              precision: 10,
              scale: 7,
              isNullable: true,
            },
            { name: 'lastPositionAt', type: 'timestamp', isNullable: true },
            { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
            { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          ],
          indices: [{ columnNames: ['organizationId'] }],
        }),
        true,
      );
    }

    const hasLivreurIdColumn = await queryRunner.hasColumn(
      'online_order',
      'livreurId',
    );
    if (!hasLivreurIdColumn) {
      await queryRunner.addColumn(
        'online_order',
        new TableColumn({ name: 'livreurId', type: 'uuid', isNullable: true }),
      );

      await queryRunner.createForeignKey(
        'online_order',
        new TableForeignKey({
          columnNames: ['livreurId'],
          referencedColumnNames: ['id'],
          referencedTableName: 'livreur',
          onDelete: 'SET NULL',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('online_order');
    if (table) {
      const fk = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('livreurId') !== -1,
      );
      if (fk) await queryRunner.dropForeignKey('online_order', fk);
      const hasColumn = await queryRunner.hasColumn('online_order', 'livreurId');
      if (hasColumn) {
        await queryRunner.dropColumn('online_order', 'livreurId');
      }
    }
    const tableExists = await queryRunner.hasTable('livreur');
    if (tableExists) {
      await queryRunner.dropTable('livreur');
    }
  }
}
