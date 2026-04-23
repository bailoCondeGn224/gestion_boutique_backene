import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class CreateSuperAdmin1730000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Créer le role SUPER_ADMIN (organizationId = null = role système)
    await queryRunner.query(`
      INSERT INTO role (id, nom, description, actif, "organizationId")
      VALUES (
        uuid_generate_v4(),
        'SUPER_ADMIN',
        'Super administrateur avec accès complet à toutes les organisations',
        true,
        NULL
      )
      ON CONFLICT (nom) DO NOTHING;
    `);

    // Récupérer l'ID du role SUPER_ADMIN
    const roleResult = await queryRunner.query(`
      SELECT id FROM role WHERE nom = 'SUPER_ADMIN' LIMIT 1;
    `);
    const superAdminRoleId = roleResult[0]?.id;

    if (!superAdminRoleId) {
      throw new Error('Impossible de créer le role SUPER_ADMIN');
    }

    // Hash du mot de passe par défaut: "SuperAdmin@2024"
    const hashedPassword = await bcrypt.hash('SuperAdmin@2024', 10);

    // Créer le user SUPER_ADMIN
    await queryRunner.query(`
      INSERT INTO "user" (id, email, password, nom, "roleId", "organizationId", "isSuperAdmin")
      VALUES (
        uuid_generate_v4(),
        'admin@system.com',
        $1,
        'Super Admin',
        $2,
        NULL,
        true
      )
      ON CONFLICT (email) DO NOTHING;
    `, [hashedPassword, superAdminRoleId]);

    console.log('✅ SUPER_ADMIN créé avec succès');
    console.log('   Email: admin@system.com');
    console.log('   Mot de passe: SuperAdmin@2024');
    console.log('   ⚠️  CHANGEZ CE MOT DE PASSE EN PRODUCTION !');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer le user SUPER_ADMIN
    await queryRunner.query(`
      DELETE FROM "user" WHERE email = 'admin@system.com';
    `);

    // Supprimer le role SUPER_ADMIN
    await queryRunner.query(`
      DELETE FROM role WHERE nom = 'SUPER_ADMIN';
    `);
  }
}
