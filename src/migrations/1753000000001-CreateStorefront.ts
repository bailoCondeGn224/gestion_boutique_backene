import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateStorefront1753000000001 implements MigrationInterface {
  name = 'CreateStorefront1753000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'storefront',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'organizationId',
            type: 'uuid',
            isUnique: true,
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'logoUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'whatsappNumber',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'horaires',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'fraisLivraison',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0,
          },
          {
            name: 'adresse',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'storefront',
      new TableIndex({
        name: 'IDX_storefront_slug',
        columnNames: ['slug'],
      }),
    );

    await queryRunner.createForeignKey(
      'storefront',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organization',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('storefront');
    const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('organizationId') !== -1);
    if (foreignKey) {
      await queryRunner.dropForeignKey('storefront', foreignKey);
    }
    await queryRunner.dropIndex('storefront', 'IDX_storefront_slug');
    await queryRunner.dropTable('storefront');
  }
}
