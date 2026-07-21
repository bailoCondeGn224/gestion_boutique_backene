import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOnlineFieldsToArticle1753000000004 implements MigrationInterface {
  name = 'AddOnlineFieldsToArticle1753000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'article',
      new TableColumn({
        name: 'disponibleEnLigne',
        type: 'boolean',
        default: false,
      }),
    );

    await queryRunner.addColumn(
      'article',
      new TableColumn({
        name: 'prixEnLigne',
        type: 'decimal',
        precision: 15,
        scale: 2,
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('article', 'prixEnLigne');
    await queryRunner.dropColumn('article', 'disponibleEnLigne');
  }
}
