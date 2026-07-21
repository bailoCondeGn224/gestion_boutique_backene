import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddCustomerAccountIdToClient1753000000005 implements MigrationInterface {
  name = 'AddCustomerAccountIdToClient1753000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'client',
      new TableColumn({
        name: 'customerAccountId',
        type: 'uuid',
        isNullable: true,
      }),
    );

    await queryRunner.createForeignKey(
      'client',
      new TableForeignKey({
        columnNames: ['customerAccountId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'customer_account',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('client');
    const foreignKey = table?.foreignKeys.find(fk => fk.columnNames.indexOf('customerAccountId') !== -1);
    if (foreignKey) {
      await queryRunner.dropForeignKey('client', foreignKey);
    }
    await queryRunner.dropColumn('client', 'customerAccountId');
  }
}
