# Architecture SaaS Professionnelle - Système de Paiement

## 🎯 Objectif
Transformer le système actuel en une vraie plateforme SaaS avec:
- Contrôle d'accès par plan
- Fonctionnalités incluses dans les plans (pas de modules séparés)
- Quotas et limites par plan
- Enforcement automatique des abonnements

---

## 📊 Nouvelle Structure des Plans

### FREE (Plan Gratuit)
**Prix:** 0 GNF
**Fonctionnalités:**
- ✅ Gestion de stock basique (max 50 articles)
- ✅ Ventes simples (max 20/mois)
- ✅ 1 utilisateur
- ✅ Rapports basiques
- ❌ Inventaires physiques
- ❌ Zakat
- ❌ Approvisionnements
- ❌ Multi-utilisateurs
- ❌ Export de données

**Quotas:**
- Articles: 50 max
- Ventes: 20/mois
- Utilisateurs: 1
- Stockage: 100 MB

---

### STANDARD (Plan Standard)
**Prix:** 25,000 GNF/mois ou 250,000 GNF/an (2 mois offerts)
**Fonctionnalités:**
- ✅ Gestion de stock complète (max 500 articles)
- ✅ Ventes illimitées
- ✅ Approvisionnements
- ✅ **Inventaires physiques** (2/mois inclus)
- ✅ Clients et fournisseurs
- ✅ Rapports et analytics
- ✅ Jusqu'à 3 utilisateurs
- ✅ Export Excel/PDF
- ❌ Zakat
- ❌ API access

**Quotas:**
- Articles: 500 max
- Ventes: Illimitées
- Utilisateurs: 3 max
- Inventaires: 2/mois
- Stockage: 1 GB

---

### PREMIUM (Plan Premium)
**Prix:** 50,000 GNF/mois ou 500,000 GNF/an
**Fonctionnalités:**
- ✅ Tout de STANDARD +
- ✅ Articles illimités
- ✅ **Zakat** (calcul automatique inclus)
- ✅ **Inventaires illimités**
- ✅ Jusqu'à 10 utilisateurs
- ✅ Alertes SMS (via Nimba)
- ✅ Sauvegarde automatique
- ✅ Support prioritaire
- ❌ API access
- ❌ White-label

**Quotas:**
- Articles: Illimités
- Ventes: Illimitées
- Utilisateurs: 10 max
- Inventaires: Illimités
- Zakat: Illimité
- Stockage: 5 GB

---

### ENTERPRISE (Plan Entreprise)
**Prix:** 100,000 GNF/mois ou 1,000,000 GNF/an
**Fonctionnalités:**
- ✅ Tout de PREMIUM +
- ✅ Utilisateurs illimités
- ✅ Multi-magasins (zones)
- ✅ API access
- ✅ White-label (personnalisation)
- ✅ Formation dédiée
- ✅ Support 24/7
- ✅ SLA garanti
- ✅ Stockage illimité

**Quotas:**
- Tout illimité

---

## 🏗️ Modifications Base de Données

### 1. Table `plan_features` (Nouvelle)
Définit les fonctionnalités incluses dans chaque plan.

```sql
CREATE TABLE plan_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  planId UUID NOT NULL REFERENCES plan(id) ON DELETE CASCADE,

  -- Fonctionnalités booléennes
  inventairesEnabled BOOLEAN DEFAULT false,
  zakatEnabled BOOLEAN DEFAULT false,
  approvisionnementEnabled BOOLEAN DEFAULT true,
  exportEnabled BOOLEAN DEFAULT false,
  apiAccessEnabled BOOLEAN DEFAULT false,
  smsAlertsEnabled BOOLEAN DEFAULT false,
  multiMagasinsEnabled BOOLEAN DEFAULT false,

  -- Quotas
  maxArticles INTEGER, -- NULL = illimité
  maxUsers INTEGER,
  maxVentesParMois INTEGER, -- NULL = illimité
  maxInventairesParMois INTEGER, -- NULL = illimité
  maxStockageMB INTEGER,

  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX idx_plan_features_plan ON plan_features(planId);
```

### 2. Table `organization_usage` (Nouvelle)
Suivi de l'utilisation pour vérifier les quotas.

```sql
CREATE TABLE organization_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizationId UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,

  -- Compteurs
  articlesCount INTEGER DEFAULT 0,
  usersCount INTEGER DEFAULT 1,
  ventesThisMonth INTEGER DEFAULT 0,
  inventairesThisMonth INTEGER DEFAULT 0,
  stockageUsedMB DECIMAL(10,2) DEFAULT 0,

  -- Dates de réinitialisation
  lastVentesReset DATE DEFAULT CURRENT_DATE,
  lastInventairesReset DATE DEFAULT CURRENT_DATE,

  updatedAt TIMESTAMP DEFAULT NOW(),

  UNIQUE(organizationId)
);

-- Index
CREATE INDEX idx_org_usage_org ON organization_usage(organizationId);
```

### 3. Supprimer `module_purchases`
Les modules ne sont plus vendus séparément, ils sont inclus dans les plans.

```sql
-- Migration pour supprimer module_purchases (après migration des données)
DROP TABLE IF EXISTS module_purchases CASCADE;
```

---

## 💻 Implémentation Backend

### 1. Nouvelle entité `PlanFeatures`

```typescript
// src/plans/entities/plan-features.entity.ts
@Entity('plan_features')
export class PlanFeatures {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  planId: string;

  @ManyToOne(() => Plan)
  @JoinColumn({ name: 'planId' })
  plan: Plan;

  // Fonctionnalités
  @Column({ default: false })
  inventairesEnabled: boolean;

  @Column({ default: false })
  zakatEnabled: boolean;

  @Column({ default: true })
  approvisionnementEnabled: boolean;

  @Column({ default: false })
  exportEnabled: boolean;

  @Column({ default: false })
  apiAccessEnabled: boolean;

  @Column({ default: false })
  smsAlertsEnabled: boolean;

  @Column({ default: false })
  multiMagasinsEnabled: boolean;

  // Quotas (NULL = illimité)
  @Column({ type: 'integer', nullable: true })
  maxArticles: number | null;

  @Column({ type: 'integer', nullable: true })
  maxUsers: number | null;

  @Column({ type: 'integer', nullable: true })
  maxVentesParMois: number | null;

  @Column({ type: 'integer', nullable: true })
  maxInventairesParMois: number | null;

  @Column({ type: 'integer', nullable: true })
  maxStockageMB: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 2. Nouvelle entité `OrganizationUsage`

```typescript
// src/organizations/entities/organization-usage.entity.ts
@Entity('organization_usage')
export class OrganizationUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  organizationId: string;

  @OneToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ type: 'integer', default: 0 })
  articlesCount: number;

  @Column({ type: 'integer', default: 1 })
  usersCount: number;

  @Column({ type: 'integer', default: 0 })
  ventesThisMonth: number;

  @Column({ type: 'integer', default: 0 })
  inventairesThisMonth: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  stockageUsedMB: number;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  lastVentesReset: Date;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  lastInventairesReset: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 3. Guards pour contrôler l'accès

#### SubscriptionGuard - Vérifie que l'abonnement est actif

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
      throw new ForbiddenException('Aucun abonnement trouvé. Veuillez créer un abonnement.');
    }

    // Vérifier le statut
    if (subscription.statut === SubscriptionStatus.ANNULE) {
      throw new ForbiddenException('Votre abonnement a été annulé.');
    }

    if (subscription.statut === SubscriptionStatus.SUSPENDU) {
      throw new ForbiddenException('Votre abonnement est suspendu. Contactez le support.');
    }

    // Vérifier l'expiration
    if (subscription.statut === SubscriptionStatus.ACTIF && subscription.dateExpiration) {
      const now = new Date();
      if (new Date(subscription.dateExpiration) < now) {
        throw new ForbiddenException('Votre abonnement a expiré. Veuillez renouveler.');
      }
    }

    // Période d'essai expirée sans paiement
    if (subscription.statut === SubscriptionStatus.ESSAI && subscription.dateFinEssai) {
      const now = new Date();
      if (new Date(subscription.dateFinEssai) < now) {
        throw new ForbiddenException('Votre période d\'essai a expiré. Veuillez effectuer un paiement.');
      }
    }

    return true;
  }
}
```

#### FeatureGuard - Vérifie que le plan inclut la fonctionnalité

```typescript
// src/common/guards/feature.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { PlanFeatures } from '../../plans/entities/plan-features.entity';

export const REQUIRED_FEATURE = 'requiredFeature';
export const RequireFeature = (feature: string) => SetMetadata(REQUIRED_FEATURE, feature);

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(PlanFeatures)
    private planFeaturesRepository: Repository<PlanFeatures>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.get<string>(REQUIRED_FEATURE, context.getHandler());

    if (!requiredFeature) {
      return true; // Pas de feature requise
    }

    const request = context.switchToHttp().getRequest();
    const organizationId = request.user?.organizationId;

    if (!organizationId) {
      throw new ForbiddenException('Organization ID manquant');
    }

    // Récupérer l'organization avec son plan
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
      relations: ['plan'],
    });

    if (!organization || !organization.plan) {
      throw new ForbiddenException('Plan non trouvé');
    }

    // Récupérer les features du plan
    const planFeatures = await this.planFeaturesRepository.findOne({
      where: { planId: organization.plan.id },
    });

    if (!planFeatures) {
      throw new ForbiddenException('Fonctionnalités du plan non configurées');
    }

    // Vérifier la feature
    const featureEnabled = planFeatures[requiredFeature];

    if (!featureEnabled) {
      throw new ForbiddenException(
        `Cette fonctionnalité n'est pas incluse dans votre plan. Passez à un plan supérieur.`
      );
    }

    return true;
  }
}
```

#### QuotaGuard - Vérifie les quotas

```typescript
// src/common/guards/quota.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { PlanFeatures } from '../../plans/entities/plan-features.entity';
import { OrganizationUsage } from '../../organizations/entities/organization-usage.entity';

export const REQUIRED_QUOTA = 'requiredQuota';
export const RequireQuota = (quota: string) => SetMetadata(REQUIRED_QUOTA, quota);

@Injectable()
export class QuotaGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(PlanFeatures)
    private planFeaturesRepository: Repository<PlanFeatures>,
    @InjectRepository(OrganizationUsage)
    private usageRepository: Repository<OrganizationUsage>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredQuota = this.reflector.get<string>(REQUIRED_QUOTA, context.getHandler());

    if (!requiredQuota) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const organizationId = request.user?.organizationId;

    if (!organizationId) {
      throw new ForbiddenException('Organization ID manquant');
    }

    // Récupérer organization avec plan
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
      relations: ['plan'],
    });

    if (!organization || !organization.plan) {
      throw new ForbiddenException('Plan non trouvé');
    }

    // Récupérer les features/quotas du plan
    const planFeatures = await this.planFeaturesRepository.findOne({
      where: { planId: organization.plan.id },
    });

    if (!planFeatures) {
      throw new ForbiddenException('Quotas du plan non configurés');
    }

    // Récupérer l'utilisation actuelle
    let usage = await this.usageRepository.findOne({
      where: { organizationId },
    });

    if (!usage) {
      // Créer un enregistrement d'utilisation si inexistant
      usage = this.usageRepository.create({
        organizationId,
        articlesCount: 0,
        usersCount: 1,
        ventesThisMonth: 0,
        inventairesThisMonth: 0,
        stockageUsedMB: 0,
      });
      await this.usageRepository.save(usage);
    }

    // Vérifier le quota
    switch (requiredQuota) {
      case 'maxArticles':
        if (planFeatures.maxArticles !== null && usage.articlesCount >= planFeatures.maxArticles) {
          throw new ForbiddenException(
            `Limite d'articles atteinte (${planFeatures.maxArticles}). Passez à un plan supérieur.`
          );
        }
        break;

      case 'maxUsers':
        if (planFeatures.maxUsers !== null && usage.usersCount >= planFeatures.maxUsers) {
          throw new ForbiddenException(
            `Limite d'utilisateurs atteinte (${planFeatures.maxUsers}). Passez à un plan supérieur.`
          );
        }
        break;

      case 'maxVentesParMois':
        // Réinitialiser le compteur si nouveau mois
        const today = new Date();
        const lastReset = new Date(usage.lastVentesReset);
        if (today.getMonth() !== lastReset.getMonth() || today.getFullYear() !== lastReset.getFullYear()) {
          usage.ventesThisMonth = 0;
          usage.lastVentesReset = today;
          await this.usageRepository.save(usage);
        }

        if (planFeatures.maxVentesParMois !== null && usage.ventesThisMonth >= planFeatures.maxVentesParMois) {
          throw new ForbiddenException(
            `Limite de ventes mensuelle atteinte (${planFeatures.maxVentesParMois}). Passez à un plan supérieur.`
          );
        }
        break;

      case 'maxInventairesParMois':
        // Réinitialiser si nouveau mois
        const todayInv = new Date();
        const lastResetInv = new Date(usage.lastInventairesReset);
        if (todayInv.getMonth() !== lastResetInv.getMonth() || todayInv.getFullYear() !== lastResetInv.getFullYear()) {
          usage.inventairesThisMonth = 0;
          usage.lastInventairesReset = todayInv;
          await this.usageRepository.save(usage);
        }

        if (planFeatures.maxInventairesParMois !== null && usage.inventairesThisMonth >= planFeatures.maxInventairesParMois) {
          throw new ForbiddenException(
            `Limite d'inventaires mensuelle atteinte (${planFeatures.maxInventairesParMois}). Passez à un plan supérieur.`
          );
        }
        break;
    }

    return true;
  }
}
```

### 4. Utilisation des Guards dans les Controllers

```typescript
// src/inventaires/inventaires.controller.ts
@Controller('inventaires')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class InventairesController {

  @Post()
  @UseGuards(FeatureGuard, QuotaGuard)
  @RequireFeature('inventairesEnabled')
  @RequireQuota('maxInventairesParMois')
  async create(@Body() createDto: CreateInventaireDto, @Request() req) {
    // Créer l'inventaire
    const inventaire = await this.inventairesService.create(createDto, req.user.organizationId);

    // Incrémenter le compteur d'utilisation
    await this.usageService.incrementInventairesCount(req.user.organizationId);

    return inventaire;
  }
}
```

```typescript
// src/zakat/zakat.controller.ts
@Controller('zakat')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class ZakatController {

  @Post('calculations')
  @UseGuards(FeatureGuard)
  @RequireFeature('zakatEnabled')
  async createCalculation(@Body() createDto: CreateZakatDto, @Request() req) {
    return this.zakatService.createCalculation(createDto, req.user.organizationId);
  }
}
```

---

## 🎨 Modifications Frontend

### 1. Afficher les features du plan

```typescript
// src/hooks/usePlanFeatures.ts
export const usePlanFeatures = () => {
  const { data: planFeatures, isLoading } = useQuery({
    queryKey: ['plan-features'],
    queryFn: async () => {
      const response = await apiClient.get('/plans/my-features');
      return response.data;
    },
  });

  return {
    planFeatures,
    isLoading,
    hasFeature: (feature: string) => planFeatures?.[feature] === true,
  };
};
```

### 2. Masquer les features non disponibles

```typescript
// src/pages/Inventaires.tsx
const { planFeatures, hasFeature } = usePlanFeatures();

if (!hasFeature('inventairesEnabled')) {
  return <UpgradePlanPrompt feature="Inventaires" />;
}
```

### 3. Afficher les quotas

```typescript
// src/components/QuotaIndicator.tsx
export const QuotaIndicator = ({ quota, used, max }) => {
  const percentage = max ? (used / max) * 100 : 0;
  const isNearLimit = percentage > 80;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>{quota}</span>
        <span className={isNearLimit ? 'text-orange-600' : ''}>
          {used} / {max || '∞'}
        </span>
      </div>
      {max && (
        <Progress value={percentage} className={isNearLimit ? 'bg-orange-200' : ''} />
      )}
    </div>
  );
};
```

---

## 📅 Plan de Migration

### Phase 1: Mise en place de la structure (1 semaine)
1. Créer les migrations pour plan_features et organization_usage
2. Créer les entités PlanFeatures et OrganizationUsage
3. Créer les guards (Subscription, Feature, Quota)
4. Peupler plan_features avec les données de chaque plan

### Phase 2: Implémentation des contrôles (1 semaine)
1. Ajouter les guards sur tous les endpoints critiques
2. Créer le service UsageService pour gérer les compteurs
3. Implémenter l'incrémentation automatique des compteurs
4. Tester les quotas et features

### Phase 3: Frontend (1 semaine)
1. Créer usePlanFeatures hook
2. Afficher les limites du plan sur chaque page
3. Créer UpgradePlanPrompt pour inciter aux upgrades
4. Afficher les quotas en temps réel
5. Bloquer les actions si quota atteint

### Phase 4: Migration des données (3 jours)
1. Migrer les module_purchases existants vers plan_features
2. Calculer l'utilisation actuelle pour organization_usage
3. Supprimer la table module_purchases
4. Nettoyer le code lié aux modules

### Phase 5: Tests et déploiement (3 jours)
1. Tests end-to-end de tous les quotas
2. Tests des guards
3. Tests des upgrades
4. Déploiement progressif

---

## 🎯 Avantages de cette architecture

### Pour l'entreprise:
- ✅ **Revenue récurrent** - Abonnements mensuels/annuels stables
- ✅ **Upsell facile** - Les utilisateurs voient les limites et sont incités à upgrader
- ✅ **Gestion simplifiée** - Plus de vente de modules à l'unité
- ✅ **Metriques claires** - Usage par plan pour optimiser l'offre

### Pour les utilisateurs:
- ✅ **Clarté** - Savent exactement ce qui est inclus
- ✅ **Prévisibilité** - Prix fixes, pas de surprises
- ✅ **Flexibilité** - Peuvent upgrader/downgrader selon leurs besoins
- ✅ **Essai gratuit** - 30 jours pour tester

### Technique:
- ✅ **Sécurisé** - Guards empêchent l'accès non autorisé
- ✅ **Scalable** - Facile d'ajouter de nouvelles features
- ✅ **Maintenable** - Code organisé et réutilisable
- ✅ **Testable** - Guards peuvent être testés unitairement

---

## 🚀 Prochaines étapes

1. **Valider cette architecture** avec vous
2. **Prioriser les features** de chaque plan
3. **Créer les migrations** et entités
4. **Implémenter les guards** progressivement
5. **Mettre à jour le frontend** pour afficher les limites
6. **Tester** sur un environnement de staging
7. **Déployer** en production avec migration des données

Voulez-vous que je commence l'implémentation de cette architecture ?
