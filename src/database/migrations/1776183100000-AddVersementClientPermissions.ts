import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVersementClientPermissions1776183100000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Vérifier si les permissions existent déjà avant de les insérer
        const permissions = [
            {
                code: 'versements-client.create',
                nom: 'Créer un versement client',
                description: 'Permet d\'enregistrer des paiements de dettes clients'
            },
            {
                code: 'versements-client.read',
                nom: 'Voir les versements clients',
                description: 'Permet de consulter les paiements clients'
            },
            {
                code: 'versements-client.update',
                nom: 'Modifier un versement client',
                description: 'Permet de modifier les paiements clients'
            },
            {
                code: 'versements-client.delete',
                nom: 'Supprimer un versement client',
                description: 'Permet d\'annuler des paiements clients'
            }
        ];

        for (const permission of permissions) {
            // Vérifier si la permission existe déjà
            const existing = await queryRunner.query(
                `SELECT id FROM permission WHERE code = $1`,
                [permission.code]
            );

            if (existing.length === 0) {
                await queryRunner.query(
                    `INSERT INTO permission (code, nom, description, "createdAt", "updatedAt")
                     VALUES ($1, $2, $3, NOW(), NOW())`,
                    [permission.code, permission.nom, permission.description]
                );
            }
        }

        // Optionnel: Assigner les permissions au rôle ADMIN (si le rôle existe)
        const adminRole = await queryRunner.query(
            `SELECT id FROM role WHERE nom = 'ADMIN'`
        );

        if (adminRole.length > 0) {
            const adminRoleId = adminRole[0].id;

            for (const permission of permissions) {
                const permissionRecord = await queryRunner.query(
                    `SELECT id FROM permission WHERE code = $1`,
                    [permission.code]
                );

                if (permissionRecord.length > 0) {
                    const permissionId = permissionRecord[0].id;

                    // Vérifier si l'association existe déjà
                    const existing = await queryRunner.query(
                        `SELECT * FROM role_permissions_permission
                         WHERE "roleId" = $1 AND "permissionId" = $2`,
                        [adminRoleId, permissionId]
                    );

                    if (existing.length === 0) {
                        await queryRunner.query(
                            `INSERT INTO role_permissions_permission ("roleId", "permissionId")
                             VALUES ($1, $2)`,
                            [adminRoleId, permissionId]
                        );
                    }
                }
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Supprimer les permissions
        const permissionCodes = [
            'versements-client.create',
            'versements-client.read',
            'versements-client.update',
            'versements-client.delete'
        ];

        for (const code of permissionCodes) {
            // Récupérer l'ID de la permission
            const permission = await queryRunner.query(
                `SELECT id FROM permission WHERE code = $1`,
                [code]
            );

            if (permission.length > 0) {
                const permissionId = permission[0].id;

                // Supprimer les associations avec les rôles
                await queryRunner.query(
                    `DELETE FROM role_permissions_permission WHERE "permissionId" = $1`,
                    [permissionId]
                );

                // Supprimer la permission
                await queryRunner.query(
                    `DELETE FROM permission WHERE id = $1`,
                    [permissionId]
                );
            }
        }
    }

}
