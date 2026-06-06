# 🔧 Guide de correction des retours clients corrompus

## 🔴 Problème identifié

### Le bug
Le système permettait de créer des retours dont le **montant total dépasse le montant de la vente originale**.

**Exemple concret:**
- Vente V-003: 200,000 FG
- Retour RC-001: 300,000 FG ❌ **IMPOSSIBLE!**

### Cause racine
Le validator vérifiait les **quantités** mais PAS les **prix unitaires**.

Un utilisateur pouvait:
1. Acheter: 2 articles × 100,000 FG = 200,000 FG
2. Retourner: 2 articles × **150,000 FG** = 300,000 FG

Le système validait la quantité (2 ≤ 2 ✓) mais ne vérifiait jamais que le prix de retour = prix de vente!

---

## ✅ Solution implémentée

### 1. Validation ajoutée
**Fichier modifié:** `src/validation/retours.validator.ts`

Nouvelle règle (ligne ~94):
```typescript
// Vérifier que le prix unitaire correspond au prix de vente original
if (Math.abs(prixUnitaireRetour - prixUnitaireVente) > 0.01) {
  throw new BadRequestException(
    `Prix unitaire incorrect pour "${ligne.nom}": ` +
    `Prix de vente original: ${prixUnitaireVente} FG, ` +
    `Prix du retour: ${prixUnitaireRetour} FG.`
  );
}
```

**Résultat:** Désormais impossible de créer un nouveau retour corrompu! ✓

---

## 🛠️ Étapes de réparation des données existantes

### ÉTAPE 1: Diagnostic

Exécutez le script de diagnostic pour voir l'ampleur du problème:

```bash
psql -U postgres -d gestion_boutique -f diagnostic-retours-corrompus.sql
```

**Ce qu'il fait:**
1. ✅ Liste tous les retours > vente
2. ✅ Trouve les retours orphelins (vente supprimée)
3. ✅ Détecte les prix unitaires incorrects
4. ✅ Calcule l'impact financier
5. ✅ Identifie les clients affectés

**Exemple de résultat:**
```
 Retour  | Vente  |    Client          | Montant Retour | Montant Vente | Différence
---------|--------|--------------------|-----------------|--------------|-----------
 RC-001  | V-003  | Thierno Mamadou    |     300,000     |   200,000    |  100,000  ❌
```

---

### ÉTAPE 2: Backup (IMPORTANT!)

Avant toute modification, faites un backup:

```bash
# Backup complet
pg_dump -U postgres gestion_boutique > backup_avant_correction.sql

# Ou backup des tables concernées uniquement
pg_dump -U postgres -t retour_client -t ligne_retour_client -t client -t vente gestion_boutique > backup_retours.sql
```

---

### ÉTAPE 3: Réparation

Exécutez le script de réparation:

```bash
psql -U postgres -d gestion_boutique -f reparer-retours-corrompus.sql
```

**Ce qu'il fait automatiquement:**

1. **Crée une table de log** `retour_correction_log`
   - Trace toutes les modifications
   - Permet de voir avant/après

2. **Corrige les prix unitaires**
   - Ajuste chaque ligne de retour au prix de vente original
   - Recalcule les sous-totaux

3. **Recalcule les totaux**
   - Met à jour `retour_client.total` à partir des lignes
   - Ajuste `montantRembourse`

4. **Supprime les retours orphelins**
   - Retours dont la vente n'existe plus
   - Avec leurs lignes associées

5. **Recalcule les finances clients**
   - Recalcule `totalAchats` depuis les ventes réelles
   - Recalcule `totalCredits` depuis `montantRestant`

6. **Affiche un rapport**
   - Nombre de corrections
   - Montant total corrigé
   - Détails par type d'action

---

### ÉTAPE 4: Vérification

Après la réparation, vérifiez qu'il n'y a plus d'anomalies:

```sql
-- Ne devrait retourner AUCUNE ligne
SELECT
    rc.numero,
    rc."venteNumero",
    rc.total AS "Retour",
    v.total AS "Vente"
FROM retour_client rc
LEFT JOIN vente v ON rc."venteId" = v.id
WHERE rc.total > COALESCE(v.total, 0);
```

**Résultat attendu:** `0 rows` ✓

---

### ÉTAPE 5: Consulter le log des corrections

```sql
-- Voir toutes les corrections effectuées
SELECT
    "retourNumero",
    "venteNumero",
    "ancienMontant",
    "nouveauMontant",
    "difference",
    action,
    "dateCorrection"
FROM retour_correction_log
ORDER BY ABS("difference") DESC;
```

**Exemple de résultat:**
```
 Retour  | Vente  | Ancien    | Nouveau   | Différence | Action
---------|--------|-----------|-----------|------------|-------------------------
 RC-001  | V-003  | 300,000   | 200,000   | -100,000   | AJUSTEMENT_MONTANT_RETOUR
```

---

## 📊 Comprendre les corrections

### Types d'actions possibles

1. **AJUSTEMENT_MONTANT_RETOUR**
   - Retour dont le montant dépassait la vente
   - Ajusté au montant maximum de la vente
   - Prix unitaires corrigés

2. **RETOUR_ORPHELIN_SUPPRESSION**
   - Retour lié à une vente qui n'existe plus
   - Supprimé complètement (retour + lignes)

---

## 🧪 Tests après correction

### Test 1: Essayer de créer un retour corrompu

Via l'API, tentez de créer un retour avec un prix gonflé:

```json
POST /retours/clients
{
  "venteId": "...",
  "lignes": [
    {
      "articleId": "...",
      "quantite": 1,
      "prixUnitaire": 999999999,  // Prix gonflé
      "sousTotal": 999999999
    }
  ]
}
```

**Résultat attendu:** `400 Bad Request` avec message:
```
Prix unitaire incorrect pour "Article":
Prix de vente original: 100000 FG,
Prix du retour: 999999999 FG.
```

✅ **Le bug est corrigé!**

---

### Test 2: Vérifier les finances clients

```sql
-- Vérifier la cohérence des totaux clients
SELECT
    c.nom,
    c."totalAchats",
    c."totalCredits",
    -- Recalculer depuis les ventes
    (SELECT COALESCE(SUM(v.total), 0) FROM vente v WHERE v."clientId" = c.id) AS "TotalAchatsReel",
    (SELECT COALESCE(SUM(v."montantRestant"), 0) FROM vente v WHERE v."clientId" = c.id) AS "TotalCreditsReel"
FROM client c
WHERE c.id IN (
    SELECT DISTINCT "clientId" FROM retour_correction_log rcl
    INNER JOIN retour_client rc ON rc.numero = rcl."retourNumero"
);
```

**Résultat attendu:** `totalAchats` = `TotalAchatsReel` ET `totalCredits` = `TotalCreditsReel` ✓

---

## 🗑️ Nettoyage (optionnel)

Une fois que tout est vérifié, vous pouvez supprimer la table de log:

```sql
-- Optionnel: supprimer la table de log
DROP TABLE IF EXISTS retour_correction_log;
```

**⚠️ Attendez quelques jours/semaines avant de la supprimer!**
Elle peut servir d'audit trail.

---

## 📝 Récapitulatif

### ✅ Ce qui a été fait

1. ✅ **Bug identifié**: Validation manquante du prix unitaire
2. ✅ **Validation ajoutée**: `retours.validator.ts` ligne ~94
3. ✅ **Script de diagnostic**: `diagnostic-retours-corrompus.sql`
4. ✅ **Script de réparation**: `reparer-retours-corrompus.sql`
5. ✅ **Guide complet**: Ce document

### 🛡️ Protection future

- ✅ Impossible de créer un nouveau retour corrompu
- ✅ Prix unitaire validé = prix de vente
- ✅ Montant total validé ≤ montant vente
- ✅ Quantités validées comme avant

### 📞 En cas de problème

Si après la correction vous constatez des incohérences:

1. **Vérifier le log**: `SELECT * FROM retour_correction_log;`
2. **Restaurer le backup**: `psql -U postgres gestion_boutique < backup_avant_correction.sql`
3. **Analyser le problème** avec le diagnostic
4. **Contacter le support** avec les détails

---

## 🎯 Commandes rapides

```bash
# 1. Diagnostic
psql -U postgres -d gestion_boutique -f diagnostic-retours-corrompus.sql > rapport_diagnostic.txt

# 2. Backup
pg_dump -U postgres gestion_boutique > backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Réparation
psql -U postgres -d gestion_boutique -f reparer-retours-corrompus.sql > rapport_reparation.txt

# 4. Vérification
psql -U postgres -d gestion_boutique -c "SELECT COUNT(*) FROM retour_client rc LEFT JOIN vente v ON rc.venteId = v.id WHERE rc.total > COALESCE(v.total, 0);"
```

**Résultat final attendu:** `count = 0` ✅

---

*Date de création: 5 juin 2026*
*Fichiers: retours.validator.ts, diagnostic-retours-corrompus.sql, reparer-retours-corrompus.sql*
