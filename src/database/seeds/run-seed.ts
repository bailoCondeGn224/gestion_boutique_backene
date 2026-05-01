 import {AppDataSource } from "../data-source";
import { config } from 'dotenv';
import { seedPermissionsAndRoles } from './seed-permissions-roles';
import { seedSuperAdmin } from './seed-super-admin';

// Charger les variables d'environnement
config();

async function runSeeds() {

  try {
    console.log('Connexion à la base de données...');
    await AppDataSource.initialize();
    console.log('Connecté à la base de données');

    // Exécuter le seed des permissions et rôles
    await seedPermissionsAndRoles(AppDataSource);

    // Exécuter le seed du SUPER_ADMIN
    await seedSuperAdmin(AppDataSource);
  } catch (error) {
    console.error('Erreur lors de l\'exécution des seeds:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
    console.log('Connexion fermée');
  }
}

runSeeds();
