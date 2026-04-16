import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { seedPermissionsAndRoles } from './seed-permissions-roles';
import { seedParametres } from './seed-parametres';

// Charger les variables d'environnement
config();

async function runSeeds() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'gestion_boutique',
    entities: ['src/**/*.entity{.ts,.js}'],
    synchronize: false,
  });

  try {
    console.log('📦 Connexion à la base de données...');
    await dataSource.initialize();
    console.log('✅ Connecté à la base de données');

    // Exécuter le seed des permissions et rôles
    await seedPermissionsAndRoles(dataSource);

    // Exécuter le seed des paramètres
    await seedParametres(dataSource);

    console.log('\n🎉 Tous les seeds ont été exécutés avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution des seeds:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('🔌 Connexion fermée');
  }
}

runSeeds();
