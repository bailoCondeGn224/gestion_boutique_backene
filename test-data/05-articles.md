# Données de Test - Articles

> **Note:** Pour créer des articles, vous devez d'abord créer les catégories et récupérer leurs IDs.
> Remplacez `"CATEGORIE_ID_ICI"` par l'ID réel de la catégorie correspondante.

## Article 1 - Abaya Classique Noire

```json
{
  "nom": "Abaya Classique Noire",
  "reference": "ABY-CLS-001",
  "categorieId": "CATEGORIE_ID_ICI",
  "zone": "A",
  "stock": 15,
  "seuilAlerte": 5,
  "prixVente": 45000,
  "prixAchat": 30000,
  "description": "Abaya classique en tissu de qualité, couleur noire"
}
```

## Article 2 - Abaya Brodée Beige

```json
{
  "nom": "Abaya Brodée Beige",
  "reference": "ABY-CLS-002",
  "categorieId": "CATEGORIE_ID_ICI",
  "zone": "A",
  "stock": 10,
  "seuilAlerte": 3,
  "prixVente": 55000,
  "prixAchat": 38000,
  "description": "Abaya avec broderies élégantes, couleur beige"
}
```

## Article 3 - Hijab Soie Noir

```json
{
  "nom": "Hijab Soie Noir",
  "reference": "HJB-001",
  "categorieId": "CATEGORIE_ID_ICI",
  "zone": "B",
  "stock": 30,
  "seuilAlerte": 10,
  "prixVente": 5000,
  "prixAchat": 2500,
  "description": "Hijab en soie naturelle, couleur noir"
}
```

## Article 4 - Hijab Jersey Blanc

```json
{
  "nom": "Hijab Jersey Blanc",
  "reference": "HJB-002",
  "categorieId": "CATEGORIE_ID_ICI",
  "zone": "B",
  "stock": 25,
  "seuilAlerte": 10,
  "prixVente": 4000,
  "prixAchat": 2000,
  "description": "Hijab en jersey confortable, couleur blanc"
}
```

## Article 5 - Abaya Moderne Grise

```json
{
  "nom": "Abaya Moderne Grise",
  "reference": "ABY-MOD-001",
  "categorieId": "CATEGORIE_ID_ICI",
  "zone": "A",
  "stock": 8,
  "seuilAlerte": 3,
  "prixVente": 65000,
  "prixAchat": 45000,
  "description": "Abaya avec design moderne et coupe contemporaine"
}
```

## Article 6 - Khimar Long Marron

```json
{
  "nom": "Khimar Long Marron",
  "reference": "KHM-001",
  "categorieId": "CATEGORIE_ID_ICI",
  "zone": "C",
  "stock": 12,
  "seuilAlerte": 5,
  "prixVente": 25000,
  "prixAchat": 15000,
  "description": "Khimar long en tissu léger, couleur marron"
}
```

## Article 7 - Épingles à Hijab (Set de 10)

```json
{
  "nom": "Épingles à Hijab (Set de 10)",
  "reference": "ACC-001",
  "categorieId": "CATEGORIE_ID_ICI",
  "zone": "D",
  "stock": 50,
  "seuilAlerte": 15,
  "prixVente": 2000,
  "prixAchat": 1000,
  "description": "Set de 10 épingles décoratives pour hijab"
}
```

## Article 8 - Sous-hijab Bonnet Noir

```json
{
  "nom": "Sous-hijab Bonnet Noir",
  "reference": "ACC-002",
  "categorieId": "CATEGORIE_ID_ICI",
  "zone": "D",
  "stock": 40,
  "seuilAlerte": 10,
  "prixVente": 3000,
  "prixAchat": 1500,
  "description": "Bonnet sous-hijab en coton, couleur noir"
}
```

## Article 9 - Abaya Papillon Bordeaux

```json
{
  "nom": "Abaya Papillon Bordeaux",
  "reference": "ABY-MOD-002",
  "categorieId": "CATEGORIE_ID_ICI",
  "zone": "A",
  "stock": 6,
  "seuilAlerte": 2,
  "prixVente": 70000,
  "prixAchat": 48000,
  "description": "Abaya style papillon avec manches amples"
}
```

## Article 10 - Hijab Premium Bleu Marine

```json
{
  "nom": "Hijab Premium Bleu Marine",
  "reference": "HJB-003",
  "categorieId": "CATEGORIE_ID_ICI",
  "zone": "B",
  "stock": 20,
  "seuilAlerte": 8,
  "prixVente": 7000,
  "prixAchat": 4000,
  "description": "Hijab en tissu premium, couleur bleu marine"
}
```

---

## Instructions

1. Créez d'abord les **catégories** (fichier 02-categories.md)
2. Récupérez les **IDs des catégories** créées
3. Remplacez `"CATEGORIE_ID_ICI"` par l'ID correspondant:
   - Articles 1-2: ID de "Abayas Classiques"
   - Articles 3-4, 10: ID de "Hijabs"
   - Articles 5, 9: ID de "Abayas Modernes"
   - Article 6: ID de "Khimars"
   - Articles 7-8: ID de "Accessoires"
4. Créez les articles avec les IDs mis à jour
