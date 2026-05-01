import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script pour insérer les données de test dans la base de données
 * Utilise le fichier test-data-boutique.json
 */
export async function seedTestData(dataSource: DataSource, organizationId: string) {
  console.log('🌱 Insertion des données de test...');

  // Lire le fichier JSON
  const jsonPath = path.join(__dirname, 'test-data-boutique.json');
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  try {
    // 1. Insérer les catégories
    console.log('\n📦 Insertion des catégories...');
    const categoriesMap = new Map<string, any>();

    for (const catData of jsonData.categories) {
      const result = await dataSource.query(
        `INSERT INTO categorie (nom, code, description, actif, "organizationId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT (code) DO NOTHING
         RETURNING id, nom`,
        [catData.nom, catData.code, catData.description, catData.actif, organizationId]
      );

      if (result.length > 0) {
        categoriesMap.set(result[0].nom, result[0].id);
        console.log(`  ✅ Catégorie créée: ${result[0].nom}`);
      } else {
        // Si la catégorie existe déjà, la récupérer
        const existing = await dataSource.query(
          `SELECT id, nom FROM categorie WHERE code = $1 AND "organizationId" = $2`,
          [catData.code, organizationId]
        );
        if (existing.length > 0) {
          categoriesMap.set(existing[0].nom, existing[0].id);
          console.log(`  ⏭️  Catégorie existe déjà: ${existing[0].nom}`);
        }
      }
    }

    // 2. Insérer les zones de stockage
    console.log('\n📍 Insertion des zones de stockage...');
    const zonesMap = new Map<string, string>();

    for (const zoneData of jsonData.zones_stockage) {
      const result = await dataSource.query(
        `INSERT INTO zones (code, nom, description, actif, "organizationId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT (code) DO NOTHING
         RETURNING code, nom`,
        [zoneData.code, zoneData.nom, zoneData.description, zoneData.actif, organizationId]
      );

      if (result.length > 0) {
        zonesMap.set(result[0].code, result[0].code);
        console.log(`  ✅ Zone créée: ${result[0].nom}`);
      } else {
        const existing = await dataSource.query(
          `SELECT code, nom FROM zones WHERE code = $1 AND "organizationId" = $2`,
          [zoneData.code, organizationId]
        );
        if (existing.length > 0) {
          zonesMap.set(existing[0].code, existing[0].code);
          console.log(`  ⏭️  Zone existe déjà: ${existing[0].nom}`);
        }
      }
    }

    // 3. Insérer les fournisseurs
    console.log('\n🏢 Insertion des fournisseurs...');

    for (const fournData of jsonData.fournisseurs) {
      const result = await dataSource.query(
        `INSERT INTO fournisseur (nom, telephone, email, adresse, statut, "organizationId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         ON CONFLICT DO NOTHING
         RETURNING id, nom`,
        [
          fournData.nom,
          fournData.telephone,
          fournData.email || null,
          fournData.adresse || null,
          fournData.statut || 'actif',
          organizationId
        ]
      );

      if (result.length > 0) {
        console.log(`  ✅ Fournisseur créé: ${result[0].nom}`);
      } else {
        console.log(`  ⏭️  Fournisseur existe déjà: ${fournData.nom}`);
      }
    }

    // 4. Insérer les clients
    console.log('\n👥 Insertion des clients...');

    for (const clientData of jsonData.clients) {
      const result = await dataSource.query(
        `INSERT INTO client (nom, telephone, email, adresse, "organizationId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT DO NOTHING
         RETURNING id, nom`,
        [
          clientData.nom,
          clientData.telephone || null,
          clientData.email || null,
          clientData.adresse || null,
          organizationId
        ]
      );

      if (result.length > 0) {
        console.log(`  ✅ Client créé: ${result[0].nom}`);
      } else {
        console.log(`  ⏭️  Client existe déjà: ${clientData.nom}`);
      }
    }

    // 5. Insérer les articles
    console.log('\n📦 Insertion des articles...');

    for (const articleData of jsonData.articles) {
      const categorieId = categoriesMap.get(articleData.categorie);

      if (!categorieId) {
        console.log(`  ⚠️  Catégorie non trouvée pour: ${articleData.nom}`);
        continue;
      }

      const result = await dataSource.query(
        `INSERT INTO article (
          nom, reference, description, "prixAchat", "prixVente", stock, "seuilAlerte", zone, "categorieId",
          "organizationId", "createdAt", "updatedAt"
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
         ON CONFLICT DO NOTHING
         RETURNING id, nom`,
        [
          articleData.nom,
          articleData.reference,
          articleData.description,
          articleData.prixAchat,
          articleData.prixVente,
          articleData.stock,
          articleData.seuilAlerte,
          articleData.zone,
          categorieId,
          organizationId
        ]
      );

      if (result.length > 0) {
        console.log(`  ✅ Article créé: ${result[0].nom}`);
      } else {
        console.log(`  ⏭️  Article existe déjà: ${articleData.nom}`);
      }
    }

    console.log('\n✨ Données de test insérées avec succès!');
    console.log(`\nRésumé:`);
    console.log(`  - ${jsonData.categories.length} catégories`);
    console.log(`  - ${jsonData.zones_stockage.length} zones de stockage`);
    console.log(`  - ${jsonData.fournisseurs.length} fournisseurs`);
    console.log(`  - ${jsonData.clients.length} clients`);
    console.log(`  - ${jsonData.articles.length} articles`);

  } catch (error) {
    console.error('❌ Erreur lors de l\'insertion des données:', error);
    throw error;
  }
}
