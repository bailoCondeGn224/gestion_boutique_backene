import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateVersementClientTable1776183000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'versement_client',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'clientId',
                        type: 'uuid',
                    },
                    {
                        name: 'clientNom',
                        type: 'varchar',
                    },
                    {
                        name: 'venteId',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'venteNumero',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'montant',
                        type: 'decimal',
                        precision: 12,
                        scale: 2,
                    },
                    {
                        name: 'modePaiement',
                        type: 'enum',
                        enum: ['especes', 'mobile_money', 'virement', 'cheque', 'carte'],
                        default: "'especes'",
                    },
                    {
                        name: 'reference',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'date',
                        type: 'date',
                    },
                    {
                        name: 'note',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'userId',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'userNom',
                        type: 'varchar',
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

        // Foreign key vers clients
        await queryRunner.createForeignKey(
            'versement_client',
            new TableForeignKey({
                columnNames: ['clientId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'clients',
                onDelete: 'CASCADE',
            }),
        );

        // Foreign key vers ventes (nullable)
        await queryRunner.createForeignKey(
            'versement_client',
            new TableForeignKey({
                columnNames: ['venteId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'ventes',
                onDelete: 'SET NULL',
            }),
        );

        // Foreign key vers users (nullable)
        await queryRunner.createForeignKey(
            'versement_client',
            new TableForeignKey({
                columnNames: ['userId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'users',
                onDelete: 'SET NULL',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('versement_client');
        const clientForeignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('clientId') !== -1);
        const venteForeignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('venteId') !== -1);
        const userForeignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('userId') !== -1);

        if (clientForeignKey) {
            await queryRunner.dropForeignKey('versement_client', clientForeignKey);
        }
        if (venteForeignKey) {
            await queryRunner.dropForeignKey('versement_client', venteForeignKey);
        }
        if (userForeignKey) {
            await queryRunner.dropForeignKey('versement_client', userForeignKey);
        }

        await queryRunner.dropTable('versement_client');
    }

}
