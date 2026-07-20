import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCustomerAccount1753000000000 implements MigrationInterface {
  name = 'CreateCustomerAccount1753000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'customer_account',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'nom',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'telephone',
            type: 'varchar',
            length: '20',
            isUnique: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'passwordHash',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
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
      'customer_account',
      new TableIndex({
        name: 'IDX_customer_account_telephone',
        columnNames: ['telephone'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('customer_account', 'IDX_customer_account_telephone');
    await queryRunner.dropTable('customer_account');
  }
}
