# Backend - Gestion de Boutique d'Abayas

Backend NestJS pour l'application de gestion de boutique d'abayas avec PostgreSQL et TypeORM.

## Prérequis

- Node.js 18+ et npm
- PostgreSQL 14+
- Git

## Installation

```bash
# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Créer la base de données PostgreSQL
psql -U postgres -c "CREATE DATABASE boutique_abayas;"
```

## Configuration

Modifier le fichier `.env` avec vos paramètres de base de données :

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=votre_mot_de_passe
DATABASE_NAME=boutique_abayas

JWT_SECRET=votre_secret_jwt_personnalise
JWT_EXPIRATION=7d

PORT=3000
NODE_ENV=development
```

## Démarrage

```bash
# Mode développement avec hot-reload
npm run start:dev

# Mode production
npm run build
npm run start:prod
```

L'API sera accessible sur `http://localhost:3000`

## Documentation API

Swagger UI disponible sur : `http://localhost:3000/api/docs`

## Modules

### Authentification
- `POST /auth/register` - Créer un compte utilisateur
- `POST /auth/login` - Se connecter (retourne un token JWT)
- `GET /auth/me` - Profil utilisateur (protégé)

### Stock
- `GET /stock` - Liste des articles
- `POST /stock` - Créer un article (protégé)
- `GET /stock/:id` - Détail d'un article
- `PATCH /stock/:id` - Modifier un article (protégé)
- `DELETE /stock/:id` - Supprimer un article (protégé)
- `GET /stock/alerts` - Articles en alerte de stock faible

### Ventes
- `GET /ventes` - Liste des ventes
- `POST /ventes` - Créer une vente (protégé)
- `GET /ventes/:id` - Détail d'une vente
- `GET /ventes/stats` - Statistiques de ventes
- `GET /ventes/recent` - Ventes récentes

### Fournisseurs
- `GET /fournisseurs` - Liste des fournisseurs
- `POST /fournisseurs` - Créer un fournisseur (protégé)
- `GET /fournisseurs/:id` - Détail d'un fournisseur
- `PATCH /fournisseurs/:id` - Modifier un fournisseur (protégé)
- `DELETE /fournisseurs/:id` - Supprimer un fournisseur (protégé)

### Versements
- `GET /versements` - Liste des versements
- `POST /versements` - Enregistrer un paiement fournisseur (protégé)
- `GET /versements/montants-mois` - Total des paiements du mois

### Finances
- `GET /finances/tresorerie` - Solde disponible
- `GET /finances/recettes-mois` - Recettes du mois
- `GET /finances/depenses-mois` - Dépenses du mois
- `GET /finances/transactions` - Historique des transactions
- `GET /finances/rapport-mensuel` - Rapport financier complet

## Seed Data

Pour initialiser la base de données avec des données de test :

```bash
npm run seed
```

Cela créera :
- Un utilisateur admin (email: admin@boutique.com, password: admin123)
- Des articles de démonstration (abayas, foulards, bazin)
- Des fournisseurs de référence

## Tests

```bash
# Tests unitaires
npm run test

# Tests e2e
npm run test:e2e

# Couverture de tests
npm run test:cov
```

## Structure du Projet

```
src/
├── auth/           # Module d'authentification JWT
├── users/          # Module de gestion des utilisateurs
├── stock/          # Module de gestion du stock
├── ventes/         # Module de gestion des ventes
├── fournisseurs/   # Module de gestion des fournisseurs
├── versements/     # Module de gestion des paiements
├── finances/       # Module de gestion financière
├── common/         # Utilitaires partagés
├── database/       # Scripts de seed et migrations
├── app.module.ts   # Module principal
└── main.ts         # Point d'entrée
```

## Technologies

- **Framework**: NestJS 10
- **ORM**: TypeORM 0.3
- **Base de données**: PostgreSQL 14+
- **Authentification**: Passport JWT
- **Validation**: class-validator
- **Documentation**: Swagger/OpenAPI

## Licence

MIT
