import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../roles/entities/role.entity';

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT) || 5432,
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'boutique_abayas',
    entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
    synchronize: true,
  });

  await dataSource.initialize();

  console.log('🌱 Démarrage du seeding...\n');

  const userRepository = dataSource.getRepository(User);
  const roleRepository = dataSource.getRepository(Role);

  // 1. Récupérer le rôle ADMIN
  const adminRole = await roleRepository.findOne({
    where: { nom: 'ADMIN' },
  });

  if (!adminRole) {
    console.log('❌ Le rôle ADMIN n\'existe pas. Exécutez d\'abord: npm run seed:permissions');
    await dataSource.destroy();
    process.exit(1);
  }

  // 2. Créer un utilisateur admin
  const existingAdmin = await userRepository.findOne({
    where: { email: 'admin@boutique.com' },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = userRepository.create({
      email: 'admin@boutique.com',
      password: hashedPassword,
      nom: 'Admin Boutique',
      roleId: adminRole.id,
    });
    await userRepository.save(admin);
    console.log('✅ Utilisateur admin créé:');
    console.log('   Email: admin@boutique.com');
    console.log('   Password: admin123\n');
  } else {
    console.log('ℹ️  Utilisateur admin existe déjà\n');

    // Assigner le rôle ADMIN si non assigné
    if (!existingAdmin.roleId) {
      existingAdmin.roleId = adminRole.id;
      await userRepository.save(existingAdmin);
      console.log('✅ Rôle ADMIN assigné à l\'utilisateur existant\n');
    }
  }

  console.log('🎉 Seeding terminé avec succès!\n');
  console.log('📌 Pour vous connecter:');
  console.log('   URL: http://localhost:3000');
  console.log('   Email: admin@boutique.com');
  console.log('   Password: admin123');
  console.log('   Swagger: http://localhost:3000/api/docs\n');

  await dataSource.destroy();
  process.exit(0);
}

seed().catch((error) => {
  console.error('❌ Erreur lors du seeding:', error);
  process.exit(1);
});

