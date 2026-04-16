# Guide des Données de Test

Ce dossier contient des données de test prêtes à l'emploi pour votre application de gestion de boutique d'abayas.

## 📋 Ordre d'utilisation

Pour une configuration optimale, créez les données dans cet ordre:

1. **01-users.md** - Créez les utilisateurs (admin et vendeurs)
2. **02-categories.md** - Créez les catégories de produits
3. **03-clients.md** - Créez les clients
4. **04-fournisseurs.md** - Créez les fournisseurs
5. **05-articles.md** - Créez les articles (nécessite les IDs des catégories)

## 🚀 Comment utiliser

### Méthode 1: Copier-Coller direct
1. Ouvrez le fichier .md correspondant
2. Copiez le JSON de la donnée souhaitée
3. Collez dans votre formulaire frontend ou outil de test (Postman, Insomnia, etc.)

### Méthode 2: Via votre Frontend
1. Connectez-vous avec le compte admin
2. Accédez au module concerné
3. Utilisez le formulaire de création
4. Copiez-collez les valeurs des champs depuis le fichier .md

## ⚠️ Notes importantes

### Pour les Articles
Les articles nécessitent un `categorieId`. Vous devez:
1. Créer d'abord les catégories
2. Récupérer leurs IDs
3. Remplacer `"CATEGORIE_ID_ICI"` par l'ID réel dans le JSON

### Mots de passe
Tous les utilisateurs de test utilisent des mots de passe simples:
- Admin: `Admin123!`
- Vendeurs: `Vendeur123!`

**⚠️ IMPORTANT:** Ces mots de passe sont pour TEST uniquement. Ne jamais utiliser en production!

### Valeurs nullables
Certains champs peuvent être `null` ou omis:
- Client: `email` (optionnel)
- Fournisseur: `email`, `adresse`, `rating`, `produits` (optionnels)
- Article: `description`, `reference` (optionnels)

## 📊 Statistiques des données

- **Utilisateurs:** 4 (1 admin + 3 vendeurs)
- **Catégories:** 5
- **Clients:** 6
- **Fournisseurs:** 5
- **Articles:** 10

## 🔐 Comptes de test

### Administrateur
- **Email:** admin@boutique.com
- **Mot de passe:** Admin123!
- **Rôle:** admin

### Vendeur
- **Email:** fatou@boutique.com
- **Mot de passe:** Vendeur123!
- **Rôle:** vendeur

## 💡 Conseils

1. **Testez d'abord avec un utilisateur** pour vous assurer que tout fonctionne
2. **Créez les catégories en premier** car les articles en dépendent
3. **Gardez une trace des IDs** générés pour les relations entre entités
4. **Vérifiez les contraintes** (emails uniques, codes uniques, etc.)

## 🎯 Scénarios de test suggérés

### Scénario 1: Configuration initiale
1. Créer l'admin
2. Se connecter comme admin
3. Créer les catégories
4. Créer quelques articles

### Scénario 2: Gestion des ventes
1. Créer des clients
2. Créer des articles avec stock
3. Tester la création de ventes
4. Vérifier la mise à jour du stock

### Scénario 3: Gestion des approvisionnements
1. Créer des fournisseurs
2. Créer des articles
3. Tester les approvisionnements
4. Vérifier la mise à jour des stocks et des dettes

---

**Bonne chance avec vos tests! 🎉**
