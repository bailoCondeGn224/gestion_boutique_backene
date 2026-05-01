import { AppDataSource } from '../data-source';
import { seedPermissionsAndRoles } from './seed-permissions-roles';
import { seedSuperAdmin } from './seed-super-admin';

 
 //Exécute tous les seeds dans l'ordre de priorité

async function runAllSeeds() {
  try {
    await AppDataSource.initialize();
    console.log('Connecté à la base de données\n');

    // ORDRE DE PRIORITÉ DES SEEDS

    console.log('1️Exécution: Permissions et Rôles...');
    await seedPermissionsAndRoles(AppDataSource);

    await seedSuperAdmin(AppDataSource);


    //Succès
    console.log('Tous les seeds ont été exécutés avec succès !');
  
  } catch (error) {
    console.error('Erreur lors de l\'exécution des seeds:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
    console.log('🔌 Connexion fermée');
  }
}

// Exécuter les seeds
runAllSeeds();
