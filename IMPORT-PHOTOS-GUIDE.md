# Guide d'Import Excel avec Photos

## 📸 Nouvelle Fonctionnalité: Import Massif avec Photos

L'import Excel supporte maintenant les photos des articles! Deux méthodes sont disponibles.

---

## Méthode 1: Import Excel Simple (Sans Photos)

### Utilisation
1. Téléchargez le template Excel depuis l'interface
2. Remplissez les colonnes (laissez la colonne "Photo" vide)
3. Uploadez le fichier Excel (.xlsx ou .xls)
4. Maximum: 10MB

### Colonnes Excel
| Colonne          | Obligatoire | Description                                |
|------------------|-------------|--------------------------------------------|
| Code Article     | ✅          | Référence unique (ex: ART001)              |
| Nom              | ✅          | Nom de l'article                           |
| Catégorie        | ✅          | Nom exact de la catégorie existante        |
| Zone             | ✅          | A, B, C, D ou E                            |
| Prix Vente       | ✅          | En GNF (nombre)                            |
| Prix Achat       | ❌          | Si vide, sera 0                            |
| Seuil Alerte     | ❌          | Si vide, sera 10                           |
| Quantité         | ✅          | Nombre d'unités                            |
| Fournisseur      | ❌          | Si rempli, crée un approvisionnement       |
| Date Livraison   | ❌          | Format AAAA-MM-JJ (ex: 2026-06-15)         |
| N° Facture       | ❌          | Référence facture                          |
| Photo            | ❌          | Nom du fichier photo (ex: article001.jpg)  |

---

## Méthode 2: Import ZIP (Avec Photos)

### Structure du Fichier ZIP

```
import-articles.zip
├── articles.xlsx          ← Votre fichier Excel
└── photos/                ← Dossier contenant les images
    ├── article001.jpg
    ├── article002.png
    ├── article003.jpg
    └── ...
```

### Étapes d'Import avec Photos

#### 1. Préparer le Fichier Excel
- Remplissez toutes les colonnes normalement
- Dans la colonne "Photo", indiquez le **nom exact** du fichier photo
- Exemple: `article001.jpg`, `paracetamol.png`

#### 2. Préparer les Photos
- Créez un dossier nommé **`photos`** (exactement ce nom)
- Placez toutes vos images dans ce dossier
- Formats acceptés: **JPG, PNG, WEBP**
- Taille maximale par photo: **5MB**

#### 3. Créer le ZIP
- Sélectionnez le fichier Excel + le dossier photos
- Compressez-les ensemble en fichier ZIP
- Le ZIP peut faire jusqu'à **50MB**

#### 4. Uploader le ZIP
- Dans l'interface, cliquez sur "Import Excel"
- Sélectionnez votre fichier ZIP
- Cliquez sur "Importer"

### Exemple de Fichier Excel avec Photos

| Code Article | Nom              | Catégorie    | Zone | Prix Vente | ... | Photo            |
|--------------|------------------|--------------|------|------------|-----|------------------|
| ART001       | Paracétamol 500mg| Médicaments  | A    | 5000       | ... | paracetamol.jpg  |
| ART002       | Ibuprofène 400mg | Médicaments  | A    | 8000       | ... | ibuprofene.png   |
| ART003       | Vitamine C       | Compléments  | B    | 15000      | ... | vitamine-c.jpg   |

---

## ⚙️ Fonctionnement Technique

### Traitement des Photos
1. Le système extrait le ZIP dans un dossier temporaire
2. Pour chaque article, il cherche la photo correspondante
3. La photo est copiée vers le storage permanent avec un nom unique
4. Le dossier temporaire est nettoyé automatiquement

### Gestion des Erreurs
- Si une photo n'est pas trouvée, l'article est créé **sans photo**
- Les erreurs sont reportées dans les résultats d'import
- Les photos avec format invalide sont ignorées

---

## 📋 Logique d'Import (Avec ou Sans Photos)

### Sans Fournisseur
- Article créé avec stock initial
- Photo attachée si fournie

### Avec Fournisseur
- Si l'article existe: Approvisionnement créé (photo ignorée)
- Si l'article n'existe pas: Article créé avec photo + Approvisionnement

---

## 💡 Conseils et Bonnes Pratiques

### Nommage des Photos
✅ **Bon**: `article001.jpg`, `paracetamol-500mg.png`
❌ **Éviter**: Espaces, caractères spéciaux, accents

### Organisation
- Groupez les articles par fournisseur pour optimiser l'import
- Vérifiez que toutes les catégories existent avant l'import
- Testez avec un petit fichier (10-20 articles) avant l'import complet

### Performance
- Import de 1000 articles: ~2-5 secondes (sans photos)
- Import de 1000 articles avec photos: ~30-60 secondes
- Recommandé: Maximum 10,000 articles par import

### Taille des Photos
- Résolution recommandée: 800x800px maximum
- Compressez vos images avant l'import
- Utilisez JPG pour les photos, PNG pour les logos

---

## 🔧 Résolution de Problèmes

### "Aucun fichier Excel trouvé dans le ZIP"
➡️ Assurez-vous que le fichier Excel est à la racine du ZIP (pas dans un sous-dossier)

### "Photo non trouvée"
➡️ Vérifiez que:
- Le dossier s'appelle exactement "photos" (minuscules)
- Le nom dans le Excel correspond exactement au nom du fichier
- Le fichier photo existe bien dans le dossier

### "Fichier trop volumineux"
➡️ Compressez les photos ou divisez l'import en plusieurs fichiers

---

## 📊 Exemple Complet

### Fichier Excel (articles.xlsx)
```
Code Article | Nom              | Catégorie  | Zone | Prix Vente | Prix Achat | Quantité | Photo
ART001       | Paracétamol 500mg| Médicaments| A    | 5000       | 3000       | 1000     | para.jpg
ART002       | Ibuprofène 400mg | Médicaments| A    | 8000       | 5000       | 500      | ibu.png
ART003       | Aspirine 100mg   | Médicaments| B    | 3000       | 2000       | 2000     |
```

### Structure ZIP
```
mon-import.zip
├── articles.xlsx
└── photos/
    ├── para.jpg
    └── ibu.png
```

**Note**: ART003 n'a pas de photo, il sera créé sans photo.

---

## 🎯 Résultats d'Import

L'interface affiche:
- ✅ Nombre d'articles créés
- ✅ Nombre d'approvisionnements créés
- ✅ Total de lignes traitées
- ⚠️ Liste des erreurs détaillées (si présentes)

---

## 🚀 Pour Aller Plus Loin

### Import de 1 Million d'Articles (Pharmacie)
- Divisez en fichiers de 10,000 articles
- Importez les articles sans photos d'abord
- Ajoutez les photos progressivement avec des imports complémentaires

### Mise à Jour des Photos
Pour mettre à jour uniquement les photos:
1. Créez un Excel avec Code Article + Photo
2. Laissez les autres champs vides ou avec valeurs actuelles
3. Uploadez avec les nouvelles photos

---

**Dernière mise à jour**: 2026-06-08
**Version**: 1.0
