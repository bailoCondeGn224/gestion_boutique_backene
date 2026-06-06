# 🔄 Migration vers le nouveau service de retours

## ✅ Ce qui a été créé

### 1. Repositories (dans `/repositories`)
- `article.repository.ts` - Gestion stock articles
- `mouvement-stock.repository.ts` - Gestion mouvements
- `client.repository.ts` - Gestion finances clients
- `vente.repository.ts` - Gestion ventes
- `transaction.repository.ts` - Gestion transactions

### 2. Nouveau service
- `retours.service.NOUVEAU.ts` - Service propre avec logique claire

### 3. Entité modifiée
- `vente.entity.ts` - Ajout enum `StatutVente` et champ `statut`

### 4. Migration
- `1738900000002-AddStatutVente.ts` - Ajoute le champ statut à la table vente

---

## 🚀 Étapes de migration

### ÉTAPE 1: Exécuter la migration

```bash
npm run typeorm:run-migrations
```

Cela va ajouter le champ `statut` à la table `vente`.

---

### ÉTAPE 2: Enregistrer les repositories dans `retours.module.ts`

Ouvrez `src/retours/retours.module.ts` et ajoutez:

```typescript
import { ArticleRepository } from '../stock/repositories/article.repository';
import { MouvementStockRepository } from '../mouvements-stock/repositories/mouvement-stock.repository';
import { ClientRepository } from '../clients/repositories/client.repository';
import { VenteRepository } from '../ventes/repositories/vente.repository';
import { TransactionRepository } from '../finances/repositories/transaction.repository';

@Module({
  // ... imports existants
  providers: [
    RetoursService,
    RetoursValidator,
    // Ajouter les repositories
    ArticleRepository,
    MouvementStockRepository,
    ClientRepository,
    VenteRepository,
    TransactionRepository,
  ],
  // ... reste
})
```

---

### ÉTAPE 3: Remplacer l'ancien service

```bash
# Backup de l'ancien
mv src/retours/retours.service.ts src/retours/retours.service.OLD.ts

# Utiliser le nouveau
mv src/retours/retours.service.NOUVEAU.ts src/retours/retours.service.ts
```

---

### ÉTAPE 4: Redémarrer l'application

```bash
npm run start:dev
```

---

## 🧪 Tests

### Test 1: Retour partiel avec dette

**Situation:**
- Vente: 1,000,000 FG
- Payé: 600,000 FG
- Dette: 400,000 FG
- Retour: 200,000 FG

**Résultat attendu:**
- Dette réduite: 400,000 → 200,000 FG
- Montant payé inchangé: 600,000 FG
- Pas de remboursement cash

---

### Test 2: Retour partiel dépassant la dette

**Situation:**
- Vente: 1,000,000 FG
- Payé: 800,000 FG
- Dette: 200,000 FG
- Retour: 500,000 FG

**Résultat attendu:**
- Dette annulée: 200,000 FG
- Remboursement cash: 300,000 FG (500K - 200K)
- Nouveau montant payé: 500,000 FG (800K - 300K)

---

### Test 3: Retour total

**Situation:**
- Vente: 500,000 FG
- Payé: 300,000 FG
- Dette: 200,000 FG
- Retour: 500,000 FG (tous les articles)

**Résultat attendu:**
- Vente marquée ANNULEE
- Remboursement cash: 300,000 FG
- Dette annulée: 200,000 FG
- Vente total = 0

---

## 📊 Logs détaillés

Le nouveau service affiche des logs clairs:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 DÉBUT DU RETOUR CLIENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Vente: V-001
   Total: 1,000,000 FG
   Montant payé: 600,000 FG
   Dette restante: 400,000 FG

🔍 Validation OK - Montant retour: 200,000 FG

💡 CALCUL DES MONTANTS:
   Type: RETOUR PARTIEL
   → Remboursement cash: 0 FG
   → Crédit annulé: 200,000 FG
   → Nouveau total vente: 800,000 FG
   → Nouveau montant payé: 600,000 FG
   → Nouvelle dette: 200,000 FG

📦 Mise à jour du stock:
   ✓ Article A: 10 → 11 (+1)

✏️ Vente mise à jour (retour partiel)

📄 Retour RC-001 créé avec succès

👤 Finances client mises à jour:
   Réduction totalAchats: -200,000 FG
   Réduction totalCredits: -200,000 FG

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ RETOUR CLIENT TERMINÉ AVEC SUCCÈS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ✨ Avantages du nouveau service

✅ **Code propre et lisible**
- Séparation des responsabilités (repositories)
- Pas de requêtes SQL dans le service
- Logique métier claire et documentée

✅ **Logs détaillés**
- Chaque étape est loggée
- Facile de débugger
- Voir exactement ce qui se passe

✅ **Validation robuste**
- Prix unitaire vérifié
- Montants cohérents
- Messages d'erreur clairs

✅ **Logique métier respectée**
- Q1: Réduction de vente ✓
- Q2: Gestion paiements (Option C) ✓
- Q3: Partiel/Total ✓
- Q4: Modes remboursement ✓
- Q5: Règles validation ✓

---

## 🐛 En cas de problème

Si vous voyez une erreur après migration:

1. **Vérifier les imports** dans `retours.module.ts`
2. **Vérifier la migration** a bien été exécutée
3. **Consulter les logs** pour voir où ça bloque
4. **Revenir à l'ancien** si nécessaire:
   ```bash
   mv src/retours/retours.service.ts src/retours/retours.service.NOUVEAU.ts
   mv src/retours/retours.service.OLD.ts src/retours/retours.service.ts
   ```

Testez maintenant et dites-moi si ça fonctionne! 🚀
