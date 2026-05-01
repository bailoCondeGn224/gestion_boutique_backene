# Guide d'utilisation du seed de données de test

Ce guide explique comment insérer les données de test dans votre base de données.

## Données de test incluses

Le fichier `test-data-boutique.json` contient :

- **5 Catégories** : Électronique, Vêtements, Alimentaire, Cosmétiques, Fournitures
- **3 Zones de stockage** : Magasin Principal, Réserve, Vitrine
- **5 Fournisseurs** : Avec contacts complets (nom, téléphone, email, adresse)
- **8 Clients** : Avec coordonnées complètes
- **20 Articles** : Produits variés avec prix d'achat, prix de vente, quantités et seuils d'alerte

## Prérequis

1. Avoir une organization créée dans la base de données
2. Connaître l'ID de cette organization

## Comment obtenir l'ID de votre organization

### Option 1 : Via psql (PostgreSQL)

```bash
psql -U votre_user -d votre_database

SELECT id, nom FROM organizations;
```

### Option 2 : Via l'API

```bash
curl http://localhost:3000/organizations
```

### Option 3 : Via PgAdmin ou autre outil GUI

Connectez-vous à votre base de données et exécutez :

```sql
SELECT id, nom FROM organizations;
```

## Exécution du seed

Une fois que vous avez l'ID de votre organization, exécutez :

```bash
npm run seed:test-data <ORGANIZATION_ID>
```

### Exemple

```bash
npm run seed:test-data 123e4567-e89b-12d3-a456-426614174000
```

## Résultat attendu

Le script va :

1. ✅ Vérifier que l'organization existe
2. ✅ Insérer les 5 catégories
3. ✅ Insérer les 3 zones de stockage
4. ✅ Insérer les 5 fournisseurs
5. ✅ Insérer les 8 clients
6. ✅ Insérer les 20 articles

## Gestion des doublons

Le script utilise `ON CONFLICT DO NOTHING`, donc :

- Si une donnée existe déjà, elle ne sera pas dupliquée
- Vous pouvez exécuter le script plusieurs fois sans risque
- Les données existantes ne seront pas modifiées

## Exemple de sortie

```
🚀 Démarrage du seed des données de test...
📍 Organization ID: 123e4567-e89b-12d3-a456-426614174000

Connexion à la base de données...
✅ Connecté à la base de données

✅ Organization trouvée: Ma Boutique

🌱 Insertion des données de test...

📦 Insertion des catégories...
  ✅ Catégorie créée: Électronique
  ✅ Catégorie créée: Vêtements
  ✅ Catégorie créée: Alimentaire
  ✅ Catégorie créée: Cosmétiques
  ✅ Catégorie créée: Fournitures

📍 Insertion des zones de stockage...
  ✅ Zone créée: Magasin Principal
  ✅ Zone créée: Réserve
  ✅ Zone créée: Vitrine

🏢 Insertion des fournisseurs...
  ✅ Fournisseur créé: Tech Distribution Guinée
  ✅ Fournisseur créé: Fashion Import
  ✅ Fournisseur créé: Alimentation Moderne
  ✅ Fournisseur créé: Beauty Products Sarl
  ✅ Fournisseur créé: Bureau Plus

👥 Insertion des clients...
  ✅ Client créé: Ousmane Diallo
  ✅ Client créé: Mariama Condé
  ✅ Client créé: Thierno Bah
  ✅ Client créé: Kadiatou Sylla
  ✅ Client créé: Sékou Touré
  ✅ Client créé: Awa Camara
  ✅ Client créé: Mamadou Barry
  ✅ Client créé: Hawa Soumah

📦 Insertion des articles...
  ✅ Article créé: Samsung Galaxy A54
  ✅ Article créé: iPhone 13
  ✅ Article créé: Écouteurs Bluetooth
  ... (et 17 autres articles)

✨ Données de test insérées avec succès!

Résumé:
  - 5 catégories
  - 3 zones de stockage
  - 5 fournisseurs
  - 8 clients
  - 20 articles

🎉 Seed terminé avec succès!
```

## Erreurs courantes

### Erreur : "Vous devez fournir un organizationId"

**Solution** : Vous avez oublié de passer l'ID de l'organization

```bash
# ❌ Incorrect
npm run seed:test-data

# ✅ Correct
npm run seed:test-data 123e4567-e89b-12d3-a456-426614174000
```

### Erreur : "Aucune organization trouvée avec l'ID..."

**Solution** : L'ID fourni n'existe pas dans la base de données. Vérifiez l'ID avec :

```sql
SELECT id, nom FROM organizations;
```

### Erreur de connexion à la base de données

**Solution** : Vérifiez votre fichier `.env` :

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=votre_password
DB_DATABASE=gestion_boutique
```

## Personnalisation des données

Pour modifier les données de test :

1. Éditez le fichier `src/database/seeds/test-data-boutique.json`
2. Ajoutez, modifiez ou supprimez des entrées
3. Re-exécutez le script

## Support

En cas de problème, vérifiez :

1. ✅ La connexion à la base de données
2. ✅ L'existence de l'organization
3. ✅ Les permissions sur la base de données
4. ✅ Le format du fichier JSON
