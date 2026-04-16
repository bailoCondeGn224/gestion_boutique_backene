import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class AddParametresTable1776182780095 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'parametres',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'nomComplet',
                        type: 'varchar',
                    },
                    {
                        name: 'nomCourt',
                        type: 'varchar',
                    },
                    {
                        name: 'slogan',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'logo',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'email',
                        type: 'varchar',
                    },
                    {
                        name: 'telephone',
                        type: 'varchar',
                    },
                    {
                        name: 'adresse',
                        type: 'text',
                    },
                    {
                        name: 'siteWeb',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'rccm',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'nif',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'registreCommerce',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'devise',
                        type: 'varchar',
                        default: "'GNF'",
                    },
                    {
                        name: 'mentionsLegales',
                        type: 'text',
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
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('parametres');
    }

}
