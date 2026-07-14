# Architecture SaaS Simplifiée - Un seul plan avec Essai/Mensuel/Annuel

## 🎯 Concept Simple

**Un seul plan avec 3 modes de facturation:**
1. **ESSAI** - 1 mois gratuit (toutes fonctionnalités)
2. **MENSUEL** - Paiement mensuel après l'essai
3. **ANNUEL** - Paiement annuel après l'essai (avec réduction)

---

## 📊 Structure Tarifaire

### Plan Unique: "BOUTIQUE"

| Période | Prix | Fonctionnalités |
|---------|------|-----------------|
| **ESSAI** | 0 GNF (1 mois) | ✅ Toutes les fonctionnalités incluses |
| **MENSUEL** | 25,000 GNF/mois | ✅ Toutes les fonctionnalités incluses |
| **ANNUEL** | 250,000 GNF/an | ✅ Toutes les fonctionnalités incluses<br>💰 2 mois offerts |

### Fonctionnalités incluses (toutes périodes):
- ✅ Gestion de stock complète (articles illimités)
- ✅ Ventes et approvisionnements
- ✅ Clients et fournisseurs
- ✅ **Inventaires physiques** (illimités)
- ✅ **Zakat** (calcul automatique)
- ✅ Rapports et analytics
- ✅ Multi-utilisateurs (illimité)
- ✅ Alertes SMS (via Nimba)
- ✅ Export Excel/PDF
- ✅ Multi-magasins (zones)

---

## 🏗️ Modifications Base de Données

### 1. Simplification de la table `plan`

```sql
-- Garder seulement 1 plan
DELETE FROM plan WHERE code != 'BOUTIQUE';

-- Si le plan BOUTIQUE n'existe pas, le créer
INSERT INTO plan (id, nom, code, description, "prixMensuel", "prixAnnuel", actif)
VALUES (
  uuid_generate_v4(),
  'Plan Boutique',
  'BOUTIQUE',
  'Plan complet pour la gestion de votre boutique',
  25000.00,
  250000.00,
  true
)
ON CONFLICT (code) DO UPDATE SET
  nom = 'Plan Boutique',
  "prixMensuel" = 25000.00,
  "prixAnnuel" = 250000.00,
  actif = true;

-- Supprimer les anciens plans
DELETE FROM plan WHERE code IN ('FREE', 'STANDARD', 'PREMIUM', 'ENTERPRISE');
```

### 2. Table `subscriptions` - Déjà adaptée

```sql
-- Structure existante convient parfaitement:
-- - type: MENSUEL ou ANNUEL
-- - statut: ESSAI, ACTIF, EXPIRE, SUSPENDU, ANNULE
-- - dateFinEssai: Date de fin de l'essai (30 jours)
-- - montant: Prix selon le type (MENSUEL ou ANNUEL)

-- Pas de modification nécessaire !
```

### 3. Supprimer `module_purchases` (plus nécessaire)

```sql
-- Migration pour supprimer module_purchases
DROP TABLE IF EXISTS module_purchases CASCADE;
```

### 4. Pas besoin de `plan_features` ni `organization_usage`

**Pourquoi ?**
- Tout le monde a accès à tout (pas de limitations)
- Un seul plan = pas besoin de matrice de features
- Pas de quotas à gérer

---

## 💻 Modifications Backend

### 1. Enum PlanCode simplifié

```typescript
// src/plans/enums/plan-code.enum.ts
export enum PlanCode {
  BOUTIQUE = 'BOUTIQUE',
}
```

### 2. SubscriptionGuard - Simplifié

```typescript
// src/common/guards/subscription.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, SubscriptionStatus } from '../../payments/entities/subscription.entity';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const organizationId = request.user?.organizationId;

    if (!organizationId) {
      throw new ForbiddenException('Organization ID manquant');
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });

    if (!subscription) {
      throw new ForbiddenException(
        'Aucun abonnement trouvé. Veuillez créer un abonnement pour accéder à cette fonctionnalité.'
      );
    }

    const now = new Date();

    // Vérifier les différents statuts
    switch (subscription.statut) {
      case SubscriptionStatus.ANNULE:
        throw new ForbiddenException('Votre abonnement a été annulé. Contactez le support.');

      case SubscriptionStatus.SUSPENDU:
        throw new ForbiddenException('Votre abonnement est suspendu. Contactez le support.');

      case SubscriptionStatus.EXPIRE:
        throw new ForbiddenException('Votre abonnement a expiré. Veuillez renouveler votre abonnement.');

      case SubscriptionStatus.ESSAI:
        // Vérifier si l'essai est encore valide
        if (subscription.dateFinEssai && new Date(subscription.dateFinEssai) < now) {
          throw new ForbiddenException(
            'Votre période d\'essai a expiré. Veuillez effectuer un paiement pour continuer.'
          );
        }
        return true;

      case SubscriptionStatus.ACTIF:
        // Vérifier si l'abonnement n'a pas expiré
        if (subscription.dateExpiration && new Date(subscription.dateExpiration) < now) {
          throw new ForbiddenException(
            'Votre abonnement a expiré. Veuillez renouveler votre abonnement.'
          );
        }
        return true;

      default:
        throw new ForbiddenException('Statut d\'abonnement invalide.');
    }
  }
}
```

### 3. Utilisation simple dans les Controllers

```typescript
// Appliquer le guard sur TOUTES les routes métier
@Controller('stock')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class StockController {
  // Toutes les méthodes sont protégées
}

@Controller('ventes')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class VentesController {
  // Toutes les méthodes sont protégées
}

@Controller('inventaires')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class InventairesController {
  // Toutes les méthodes sont protégées
}

@Controller('zakat')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class ZakatController {
  // Toutes les méthodes sont protégées
}
```

### 4. Migration pour assigner le plan BOUTIQUE à tous

```typescript
// src/migrations/[TIMESTAMP]-SimplifyToSinglePlan.ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class SimplifyToSinglePlan[TIMESTAMP] implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Créer le plan BOUTIQUE s'il n'existe pas
        await queryRunner.query(`
            INSERT INTO plan (id, nom, code, description, "prixMensuel", "prixAnnuel", actif)
            VALUES (
                uuid_generate_v4(),
                'Plan Boutique',
                'BOUTIQUE',
                'Plan complet pour la gestion de votre boutique',
                25000.00,
                250000.00,
                true
            )
            ON CONFLICT (code) DO UPDATE SET
                nom = 'Plan Boutique',
                "prixMensuel" = 25000.00,
                "prixAnnuel" = 250000.00,
                actif = true;
        `);

        // 2. Récupérer l'ID du plan BOUTIQUE
        const planResult = await queryRunner.query(`
            SELECT id FROM plan WHERE code = 'BOUTIQUE'
        `);
        const boutiquePlanId = planResult[0].id;

        // 3. Mettre à jour toutes les organisations pour utiliser le plan BOUTIQUE
        await queryRunner.query(`
            UPDATE organization
            SET "planId" = $1
        `, [boutiquePlanId]);

        // 4. Mettre à jour toutes les subscriptions pour pointer vers le plan BOUTIQUE
        await queryRunner.query(`
            UPDATE subscriptions
            SET "planId" = $1
        `, [boutiquePlanId]);

        // 5. Supprimer les anciens plans
        await queryRunner.query(`
            DELETE FROM plan WHERE code IN ('FREE', 'STANDARD', 'PREMIUM', 'ENTERPRISE')
        `);

        // 6. Supprimer la table module_purchases (plus nécessaire)
        await queryRunner.query(`DROP TABLE IF EXISTS module_purchases CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Pas de rollback - cette migration est irréversible
        throw new Error('Cannot revert to multiple plans');
    }
}
```

---

## 🎨 Modifications Frontend

### 1. Page Subscription simplifiée

```tsx
// src/pages/Subscription.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

const Subscription = () => {
  const { subscription, isLoading } = useSubscription();

  if (!subscription) {
    return <div>Aucun abonnement</div>;
  }

  const plan = subscription.plan; // Plan BOUTIQUE unique
  const isTrialActive = subscription.statut === 'ESSAI';
  const trialDaysRemaining = calculateTrialDays(subscription.dateFinEssai);

  return (
    <div className="space-y-6">
      {/* Statut actuel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Votre Abonnement</CardTitle>
              <CardDescription>
                {isTrialActive
                  ? `Essai gratuit - ${trialDaysRemaining} jours restants`
                  : `Abonnement ${subscription.type === 'MENSUEL' ? 'mensuel' : 'annuel'}`
                }
              </CardDescription>
            </div>
            <Badge className={getStatusColor(subscription.statut)}>
              {getStatusLabel(subscription.statut)}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Options de paiement */}
      {isTrialActive && (
        <Card>
          <CardHeader>
            <CardTitle>Choisissez votre formule</CardTitle>
            <CardDescription>
              Après votre période d'essai, sélectionnez la formule qui vous convient
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Option Mensuelle */}
              <PricingOption
                type="MENSUEL"
                price={plan.prixMensuel}
                period="mois"
                features={[
                  'Toutes les fonctionnalités',
                  'Annulation à tout moment',
                  'Support prioritaire'
                ]}
                isActive={subscription.type === 'MENSUEL'}
              />

              {/* Option Annuelle */}
              <PricingOption
                type="ANNUEL"
                price={plan.prixAnnuel}
                period="an"
                features={[
                  'Toutes les fonctionnalités',
                  '2 mois offerts',
                  'Support prioritaire',
                  `Économie de ${(plan.prixMensuel * 12 - plan.prixAnnuel).toLocaleString()} GNF`
                ]}
                isActive={subscription.type === 'ANNUEL'}
                badge="Meilleure offre"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fonctionnalités incluses */}
      <Card>
        <CardHeader>
          <CardTitle>Fonctionnalités incluses</CardTitle>
          <CardDescription>
            Tout est inclus dans votre abonnement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {ALL_FEATURES.map(feature => (
              <div key={feature} className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const ALL_FEATURES = [
  'Gestion de stock complète',
  'Ventes et approvisionnements',
  'Clients et fournisseurs',
  'Inventaires physiques',
  'Calcul Zakat automatique',
  'Rapports et analytics',
  'Multi-utilisateurs',
  'Alertes SMS',
  'Export Excel/PDF',
  'Multi-magasins'
];
```

### 2. Supprimer les références aux modules

```typescript
// Supprimer ces fichiers:
// - src/hooks/useModules.ts
// - src/components/ModulePurchaseDialog.tsx
// - src/api/payments.ts (méthodes liées aux modules)

// Supprimer ces imports dans Inventaires.tsx et Zakat.tsx:
// import { useModules } from '@/hooks/useModules';
// import ModulePurchaseDialog from '@/components/ModulePurchaseDialog';
```

### 3. Simplifier les pages Inventaires et Zakat

```tsx
// src/pages/Inventaires.tsx
const Inventaires = () => {
  // Plus besoin de vérifier les modules
  // Le SubscriptionGuard backend s'en charge

  return (
    <div>
      <Button onClick={() => setShowCreateDialog(true)}>
        Créer un inventaire
      </Button>
      {/* ... reste du code */}
    </div>
  );
};
```

---

## 📅 Plan de Migration (Simple et Rapide)

### Étape 1: Backend (1-2 heures)
1. ✅ Créer la migration `SimplifyToSinglePlan`
2. ✅ Mettre à jour PlanCode enum
3. ✅ Simplifier SubscriptionGuard
4. ✅ Appliquer SubscriptionGuard sur tous les controllers métier
5. ✅ Supprimer le code lié aux modules (ModulePurchase, etc.)

### Étape 2: Frontend (1-2 heures)
1. ✅ Simplifier la page Subscription
2. ✅ Supprimer useModules, ModulePurchaseDialog
3. ✅ Nettoyer Inventaires.tsx et Zakat.tsx
4. ✅ Mettre à jour les types (supprimer ModulePurchase)

### Étape 3: Base de données (30 min)
1. ✅ Exécuter la migration
2. ✅ Vérifier que toutes les orgs ont le plan BOUTIQUE
3. ✅ Vérifier que module_purchases est supprimé

### Étape 4: Tests (1 heure)
1. ✅ Tester l'essai de 30 jours
2. ✅ Tester le paiement mensuel
3. ✅ Tester le paiement annuel
4. ✅ Tester le blocage après expiration
5. ✅ Tester l'accès à toutes les fonctionnalités

---

## ✅ Avantages de cette approche

### Pour l'entreprise:
- ✅ **Ultra simple à gérer** - Un seul plan à maintenir
- ✅ **Message clair** - "Tout est inclus, pas de surprises"
- ✅ **Conversion facile** - Essai → Paiement direct
- ✅ **Revenue prévisible** - Mensuel ou annuel

### Pour les utilisateurs:
- ✅ **Pas de confusion** - Tout le monde a les mêmes fonctionnalités
- ✅ **Pas de paywall frustrant** - Accès complet pendant l'essai
- ✅ **Choix simple** - Mensuel ou annuel, c'est tout
- ✅ **Prix transparent** - Un seul tarif

### Technique:
- ✅ **Code simplifié** - Moins de logique, moins de bugs
- ✅ **Maintenance facile** - Pas de matrice de features complexe
- ✅ **Rapide à implémenter** - 4-5 heures maximum
- ✅ **Facile à tester** - Moins de cas d'usage

---

## 🚀 Workflow Utilisateur

```
Jour 0: Création du compte
  ↓
Abonnement ESSAI créé automatiquement (30 jours)
  ↓
Accès à TOUTES les fonctionnalités gratuitement
  ↓
Jour 30: Fin de l'essai
  ↓
Choix:
  - Payer 25,000 GNF/mois (facturation mensuelle)
  - Payer 250,000 GNF/an (économie de 50,000 GNF)
  ↓
Après paiement: Abonnement ACTIF
  ↓
Continue à accéder à TOUT
  ↓
À l'expiration: Renouvellement (si auto-renew) ou blocage
```

---

## 📊 Comparaison Avant/Après

| Aspect | Avant (Complexe) | Après (Simple) |
|--------|------------------|----------------|
| Plans | 4 (FREE, STANDARD, PREMIUM, ENTERPRISE) | 1 (BOUTIQUE) |
| Modules | Payants séparément (25k chacun) | Inclus |
| Fonctionnalités | Différentes par plan | Toutes incluses |
| Quotas | Variables | Aucun |
| Code | Guards complexes, quotas, features | 1 guard simple |
| Tables DB | 5 (plan, subscriptions, payments, module_purchases, plan_features) | 3 (plan, subscriptions, payments) |
| Confusion utilisateur | Élevée | Aucune |
| Temps d'implémentation | 2-3 semaines | 4-5 heures |

---

Voulez-vous que je commence l'implémentation de cette architecture simplifiée ?
