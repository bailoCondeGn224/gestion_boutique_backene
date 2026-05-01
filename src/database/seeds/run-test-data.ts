import { AppDataSource } from '../data-source';
import { config } from 'dotenv';
import { seedTestData } from './seed-test-data';

// Charger les variables d'environnement
config();

async function runTestDataSeed() {
  // Récupérer l'organizationId depuis les arguments de ligne de commande
  const organizationId = process.argv[2];

  if (!organizationId) {
    console.error('❌ Erreur: Vous devez fournir un organizationId');
    console.log('\nUtilisation:');
    console.log('  npm run seed:test-data <organizationId>');
    console.log('\nExemple:');
    console.log('  npm run seed:test-data 123e4567-e89b-12d3-a456-426614174000');
    process.exit(1);
  }

  try {
    console.log('🚀 Démarrage du seed des données de test...');
    console.log(`📍 Organization ID: ${organizationId}\n`);

    console.log('Connexion à la base de données...');
    await AppDataSource.initialize();
    console.log('✅ Connecté à la base de données\n');

    // Vérifier si l'organization existe
    const orgResult = await AppDataSource.query(
      'SELECT id, nom FROM organization WHERE id = $1',
      [organizationId]
    );

    if (orgResult.length === 0) {
      console.error(`❌ Erreur: Aucune organization trouvée avec l'ID ${organizationId}`);
      process.exit(1);
    }

    console.log(`✅ Organization trouvée: ${orgResult[0].nom}\n`);

    // Exécuter le seed des données de test
    await seedTestData(AppDataSource, organizationId);

    console.log('\n🎉 Seed terminé avec succès!');
  } catch (error) {
    console.error('\n❌ Erreur lors de l\'exécution du seed:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
    console.log('\n👋 Connexion fermée');
  }
}

runTestDataSeed();
