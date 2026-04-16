import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../roles/entities/role.entity';

async function checkAndFixUser() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT) || 5432,
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'boutique_abayas',
    entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
    synchronize: false,
  });

  await dataSource.initialize();

  console.log('🔍 Vérification de l\'utilisateur admin...\n');

  const userRepository = dataSource.getRepository(User);
  const roleRepository = dataSource.getRepository(Role);

  // Récupérer le rôle ADMIN
  const adminRole = await roleRepository.findOne({
    where: { nom: 'ADMIN' },
  });

  if (!adminRole) {
    console.log('❌ Le rôle ADMIN n\'existe pas. Exécutez d\'abord: npm run seed:permissions');
    await dataSource.destroy();
    process.exit(1);
  }

  // Vérifier si l'utilisateur existe
  const existingUser = await userRepository.findOne({
    where: { email: 'admin@boutique.com' },
  });

  if (existingUser) {

    // Tester le mot de passe
    const isPasswordValid = await bcrypt.compare('admin123', existingUser.password);
    console.log('🔐 Test du mot de passe "admin123":', isPasswordValid ? '✅ VALIDE' : '❌ INVALIDE\n');

    if (!isPasswordValid) {
      console.log('🔧 Correction du mot de passe...');
      const newHashedPassword = await bcrypt.hash('admin123', 10);
      existingUser.password = newHashedPassword;
      await userRepository.save(existingUser);
      console.log('✅ Mot de passe mis à jour avec succès!\n');
    }

    // Assigner le rôle ADMIN si non assigné
    if (!existingUser.roleId) {
      existingUser.roleId = adminRole.id;
      await userRepository.save(existingUser);
      console.log('✅ Rôle ADMIN assigné à l\'utilisateur!\n');
    }
  } else {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = userRepository.create({
      email: 'admin@boutique.com',
      password: hashedPassword,
      nom: 'Admin Boutique',
      roleId: adminRole.id,
    });
    await userRepository.save(admin);
    console.log('✅ Utilisateur admin créé avec succès!\n');
  }

  console.log('📌 Identifiants de connexion:');
  console.log('   Email: admin@boutique.com');
  console.log('   Password: admin123\n');

  await dataSource.destroy();
  process.exit(0);
}

checkAndFixUser().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});
