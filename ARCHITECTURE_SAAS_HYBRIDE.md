# Architecture SaaS Hybride - Abonnement + Pay-per-use

## 🎯 Modèle de Facturation

### Partie 1: Abonnement de base (OBLIGATOIRE)
Donne accès à la plateforme et aux fonctionnalités de base.

| Période | Prix | Fonctionnalités incluses |
|---------|------|--------------------------|
| **ESSAI** | 0 GNF (30 jours) | ✅ Gestion de stock<br>✅ Ventes<br>✅ Approvisionnements<br>✅ Clients/Fournisseurs<br>✅ Rapports basiques<br>✅ Multi-utilisateurs |
| **MENSUEL** | 25,000 GNF/mois | ✅ Toutes les fonctions de base<br>✅ Rapports avancés<br>✅ Export Excel/PDF<br>✅ Multi-magasins |
| **ANNUEL** | 250,000 GNF/an | ✅ Tout de MENSUEL<br>💰 Économie de 50,000 GNF (2 mois offerts) |

### Partie 2: Modules Pay-per-use (OPTIONNELS)
Fonctionnalités avancées payées à chaque utilisation.

| Module | Prix | Détail |
|--------|------|--------|
| **INVENTAIRE** | 25,000 GNF | Par inventaire physique créé<br>Usage unique |
| **ZAKAT** | 25,000 GNF | Par calcul Zakat créé<br>Valable 1 an |

---

## 📊 Structure des Plans

### Un seul plan: BOUTIQUE

```sql
-- Plan unique
INSERT INTO plan (id, nom, code, description, "prixMensuel", "prixAnnuel", actif)
VALUES (
  uuid_generate_v4(),
  'Plan Boutique',
  'BOUTIQUE',
  'Plan complet pour la gestion de votre boutique',
  25000.00,
  250000.00,
  true
);
```

**Fonctionnalités incluses dans l'abonnement:**
- ✅ Gestion de stock (articles, catégories, mouvements)
- ✅ Ventes et encaissements
- ✅ Approvisionnements et fournisseurs
- ✅ Clients et relations commerciales
- ✅ Rapports et analytics
- ✅ Multi-utilisateurs avec rôles
- ✅ Multi-magasins (zones)
- ✅ Export Excel/PDF
- ✅ Alertes SMS (via Nimba)

**Fonctionnalités Pay-per-use (non incluses):**
- 💰 Inventaires physiques → 25,000 GNF par inventaire
- 💰 Calcul Zakat → 25,000 GNF par calcul (valable 1 an)

---

## 🏗️ Architecture Technique

### Tables Base de Données

#### 1. `plan` (1 seul plan)
```sql
CREATE TABLE plan (
  id UUID PRIMARY KEY,
  nom VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL, -- 'BOUTIQUE'
  description TEXT,
  "prixMensuel" DECIMAL(10,2) DEFAULT 0,
  "prixAnnuel" DECIMAL(10,2) DEFAULT 0,
  actif BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);
```

#### 2. `subscriptions` (ESSAI/MENSUEL/ANNUEL)
```sql
-- Structure existante - CONSERVÉE
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  "organizationId" UUID NOT NULL REFERENCES organization(id),
  "planId" UUID REFERENCES plan(id),
  type VARCHAR(20) NOT NULL, -- 'MENSUEL' ou 'ANNUEL'
  statut VARCHAR(20) DEFAULT 'ESSAI', -- 'ESSAI', 'ACTIF', 'EXPIRE', 'SUSPENDU', 'ANNULE'
  montant DECIMAL(15,2) NOT NULL,
  "dateDebut" DATE NOT NULL,
  "dateFinEssai" DATE,
  "dateProchainPaiement" DATE,
  "dateExpiration" DATE,
  "autoRenew" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);
```

#### 3. `module_purchases` (INVENTAIRE/ZAKAT)
```sql
-- Structure existante - CONSERVÉE
CREATE TABLE module_purchases (
  id UUID PRIMARY KEY,
  "organizationId" UUID NOT NULL REFERENCES organization(id),
  "moduleType" VARCHAR(20) NOT NULL, -- 'INVENTAIRE' ou 'ZAKAT'
  montant DECIMAL(10,2) NOT NULL, -- 25000
  "dateAchat" DATE NOT NULL,
  "dateExpiration" DATE, -- Pour Zakat: +1 an, Pour Inventaire: NULL
  utilise BOOLEAN DEFAULT false,
  "dateUtilisation" TIMESTAMP,
  "inventaireId" UUID, -- Lien vers l'inventaire créé
  "zakatCalculationId" UUID, -- Lien vers le calcul Zakat créé
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);
```

#### 4. `payments` (Paiements unifié)
```sql
-- Structure existante - CONSERVÉE
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  "organizationId" UUID NOT NULL REFERENCES organization(id),
  "subscriptionId" UUID REFERENCES subscriptions(id), -- NULL si module
  "modulePurchaseId" UUID REFERENCES module_purchases(id), -- NULL si subscription
  montant DECIMAL(15,2) NOT NULL,
  methode VARCHAR(50) NOT NULL, -- 'ORANGE_MONEY', 'MTN_MONEY', 'PAYCARD'
  statut VARCHAR(20) DEFAULT 'EN_ATTENTE', -- 'EN_ATTENTE', 'REUSSI', 'ECHOUE', 'REMBOURSE'
  "djomyTransactionId" VARCHAR(255),
  "djomyReference" VARCHAR(255),
  "djomyResponse" JSONB,
  "numeroTelephone" VARCHAR(20),
  "datePaiement" TIMESTAMP,
  description TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),

  -- Contrainte: un paiement doit être soit pour subscription, soit pour module
  CHECK (
    ("subscriptionId" IS NOT NULL AND "modulePurchaseId" IS NULL) OR
    ("subscriptionId" IS NULL AND "modulePurchaseId" IS NOT NULL)
  )
);
```

---

## 💻 Backend - Guards et Contrôles

### 1. SubscriptionGuard (pour accès à la plateforme)

```typescript
// src/common/guards/subscription.guard.ts
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
        'Aucun abonnement actif. Veuillez vous abonner pour accéder à la plateforme.'
      );
    }

    const now = new Date();

    // Vérifier statut et dates
    switch (subscription.statut) {
      case SubscriptionStatus.ANNULE:
        throw new ForbiddenException('Abonnement annulé. Contactez le support.');

      case SubscriptionStatus.SUSPENDU:
        throw new ForbiddenException('Abonnement suspendu. Contactez le support.');

      case SubscriptionStatus.EXPIRE:
        throw new ForbiddenException('Abonnement expiré. Veuillez renouveler.');

      case SubscriptionStatus.ESSAI:
        if (subscription.dateFinEssai && new Date(subscription.dateFinEssai) < now) {
          throw new ForbiddenException(
            'Période d\'essai expirée. Effectuez un paiement pour continuer.'
          );
        }
        return true;

      case SubscriptionStatus.ACTIF:
        if (subscription.dateExpiration && new Date(subscription.dateExpiration) < now) {
          throw new ForbiddenException('Abonnement expiré. Veuillez renouveler.');
        }
        return true;

      default:
        throw new ForbiddenException('Statut d\'abonnement invalide.');
    }
  }
}
```

### 2. Appliquer SubscriptionGuard globalement

```typescript
// Sur TOUS les controllers métier
@Controller('stock')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class StockController { }

@Controller('ventes')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class VentesController { }

@Controller('clients')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class ClientsController { }

// etc.
```

### 3. Logique spécifique pour Inventaires et Zakat

```typescript
// src/inventaires/inventaires.controller.ts
@Controller('inventaires')
@UseGuards(JwtAuthGuard, SubscriptionGuard) // Vérifie l'abonnement de base
export class InventairesController {

  @Post()
  async create(@Body() createDto: CreateInventaireDto, @Request() req) {
    const organizationId = req.user.organizationId;

    // 1. Vérifier si un module INVENTAIRE disponible existe
    const availableModule = await this.paymentsService.getAvailableModules(
      organizationId,
      ModuleType.INVENTAIRE
    );

    if (availableModule.length === 0) {
      throw new ForbiddenException(
        'Aucun module inventaire disponible. Veuillez acheter un module pour créer un inventaire.'
      );
    }

    // 2. Créer l'inventaire
    const inventaire = await this.inventairesService.create(createDto, organizationId);

    // 3. Marquer le module comme utilisé
    await this.paymentsService.markModuleAsUsed(
      availableModule[0].id,
      organizationId,
      inventaire.id
    );

    return inventaire;
  }

  @Get()
  async findAll(@Request() req) {
    // Pas besoin de module pour CONSULTER les inventaires
    return this.inventairesService.findAll(req.user.organizationId);
  }
}
```

```typescript
// src/zakat/zakat.controller.ts
@Controller('zakat')
@UseGuards(JwtAuthGuard, SubscriptionGuard) // Vérifie l'abonnement de base
export class ZakatController {

  @Post('calculations')
  async createCalculation(@Body() createDto: CreateZakatDto, @Request() req) {
    const organizationId = req.user.organizationId;

    // 1. Vérifier si un module ZAKAT disponible existe
    const availableModule = await this.paymentsService.getAvailableModules(
      organizationId,
      ModuleType.ZAKAT
    );

    if (availableModule.length === 0) {
      throw new ForbiddenException(
        'Aucun module Zakat disponible. Veuillez acheter un module pour calculer la Zakat.'
      );
    }

    // 2. Créer le calcul Zakat
    const calculation = await this.zakatService.createCalculation(createDto, organizationId);

    // 3. Marquer le module comme utilisé
    await this.paymentsService.markModuleAsUsed(
      availableModule[0].id,
      organizationId,
      calculation.id
    );

    return calculation;
  }

  @Get('calculations')
  async findAll(@Request() req) {
    // Pas besoin de module pour CONSULTER les calculs Zakat
    return this.zakatService.findAll(req.user.organizationId);
  }
}
```

---

## 🎨 Frontend - UX Clair

### 1. Page Subscription (afficher les deux types de coûts)

```tsx
// src/pages/Subscription.tsx
const Subscription = () => {
  const { subscription } = useSubscription();

  return (
    <div className="space-y-6">
      {/* Section 1: Abonnement de base */}
      <Card>
        <CardHeader>
          <CardTitle>Votre Abonnement</CardTitle>
          <CardDescription>
            Accès à la plateforme et fonctionnalités de base
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* MENSUEL */}
            <PricingCard
              title="Mensuel"
              price="25,000 GNF"
              period="par mois"
              features={[
                'Gestion de stock complète',
                'Ventes et approvisionnements',
                'Rapports et analytics',
                'Multi-utilisateurs',
                'Export Excel/PDF'
              ]}
              isActive={subscription.type === 'MENSUEL'}
            />

            {/* ANNUEL */}
            <PricingCard
              title="Annuel"
              price="250,000 GNF"
              period="par an"
              badge="2 mois offerts"
              features={[
                'Toutes les fonctionnalités',
                'Économie de 50,000 GNF',
                'Facturation annuelle'
              ]}
              isActive={subscription.type === 'ANNUEL'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Modules Pay-per-use */}
      <Card>
        <CardHeader>
          <CardTitle>Modules Complémentaires</CardTitle>
          <CardDescription>
            Fonctionnalités avancées payées à l'utilisation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <ModuleCard
              name="Module Inventaire"
              description="Créez un inventaire physique complet de votre stock"
              price="25,000 GNF"
              priceDetail="par inventaire créé"
              features={[
                'Comptage physique des articles',
                'Détection des écarts',
                'Rapport détaillé',
                'Usage unique'
              ]}
            />

            <ModuleCard
              name="Module Zakat"
              description="Calculez votre Zakat selon les règles islamiques"
              price="25,000 GNF"
              priceDetail="par calcul (valable 1 an)"
              features={[
                'Calcul automatique Zakat al-Mal',
                'Agriculture et élevage',
                'Vérification Nisab et Hawl',
                'Valable 1 an'
              ]}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
```

### 2. Page Inventaires (afficher le statut des modules)

```tsx
// src/pages/Inventaires.tsx
const Inventaires = () => {
  const { availableModules, isLoading } = useModules(ModuleType.INVENTAIRE);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);

  const handleCreateClick = () => {
    if (availableModules.length === 0) {
      // Aucun module disponible → afficher le dialog d'achat
      setShowPurchaseDialog(true);
    } else {
      // Module disponible → créer directement
      setShowCreateDialog(true);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Inventaires" />

        <div className="flex items-center gap-3">
          {/* Indicateur de modules disponibles */}
          <Badge variant={availableModules.length > 0 ? "success" : "secondary"}>
            {availableModules.length} module{availableModules.length > 1 ? 's' : ''} disponible{availableModules.length > 1 ? 's' : ''}
          </Badge>

          <Button onClick={handleCreateClick}>
            <Plus className="mr-2 h-4 w-4" />
            Créer un inventaire
          </Button>
        </div>
      </div>

      {/* Liste des inventaires */}
      <InventairesList />

      {/* Dialog d'achat de module */}
      <ModulePurchaseDialog
        open={showPurchaseDialog}
        onOpenChange={setShowPurchaseDialog}
        moduleType={ModuleType.INVENTAIRE}
        onPurchaseSuccess={() => {
          setShowPurchaseDialog(false);
          setShowCreateDialog(true);
        }}
      />

      {/* Dialog de création */}
      <CreateInventaireDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
};
```

### 3. ModulePurchaseDialog amélioré

```tsx
// src/components/ModulePurchaseDialog.tsx
const ModulePurchaseDialog = ({ moduleType, open, onOpenChange, onPurchaseSuccess }) => {
  const moduleInfo = {
    INVENTAIRE: {
      name: 'Module Inventaire',
      price: 25000,
      description: 'Créez un inventaire physique complet',
      usage: 'Usage unique - Une fois l\'inventaire créé, le module sera consommé',
      features: [
        'Comptage physique complet',
        'Détection automatique des écarts',
        'Rapport détaillé (pertes/surplus)',
        'Historique conservé'
      ]
    },
    ZAKAT: {
      name: 'Module Zakat',
      price: 25000,
      description: 'Calculez votre Zakat automatiquement',
      usage: 'Valable 1 an - Vous pouvez créer plusieurs calculs pendant 1 an',
      features: [
        'Calcul automatique Zakat al-Mal',
        'Gestion agriculture/élevage',
        'Vérification Nisab et Hawl',
        'Rapport pour comptabilité'
      ]
    }
  };

  const info = moduleInfo[moduleType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Acheter {info.name}</DialogTitle>
          <DialogDescription>{info.description}</DialogDescription>
        </DialogHeader>

        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Prix */}
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <div className="text-3xl font-bold text-primary">
                {info.price.toLocaleString()} GNF
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {info.usage}
              </div>
            </div>

            {/* Fonctionnalités */}
            <div className="space-y-2">
              <h4 className="font-medium">Inclus dans ce module:</h4>
              <ul className="space-y-2">
                {info.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Bouton d'achat */}
            <Button
              onClick={() => setShowPaymentDialog(true)}
              className="w-full"
              size="lg"
            >
              Acheter maintenant
            </Button>
          </CardContent>
        </Card>
      </DialogContent>

      {/* Dialog de paiement Mobile Money */}
      <MobileMoneyPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        montant={info.price}
        description={`Achat ${info.name}`}
        onPaymentInitiated={handlePaymentInitiated}
        onPaymentSuccess={onPurchaseSuccess}
      />
    </Dialog>
  );
};
```

---

## 📅 Migration (Simplification des Plans)

```typescript
// src/migrations/[TIMESTAMP]-SimplifyToSinglePlan.ts
export class SimplifyToSinglePlan[TIMESTAMP] implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Créer ou mettre à jour le plan BOUTIQUE
    await queryRunner.query(`
      INSERT INTO plan (id, nom, code, description, "prixMensuel", "prixAnnuel", actif)
      VALUES (
        uuid_generate_v4(),
        'Plan Boutique',
        'BOUTIQUE',
        'Accès complet à la plateforme de gestion',
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
    const [boutiquePlan] = await queryRunner.query(`
      SELECT id FROM plan WHERE code = 'BOUTIQUE'
    `);

    // 3. Mettre à jour toutes les organisations
    await queryRunner.query(`
      UPDATE organization SET "planId" = $1
    `, [boutiquePlan.id]);

    // 4. Mettre à jour toutes les subscriptions
    await queryRunner.query(`
      UPDATE subscriptions SET "planId" = $1
    `, [boutiquePlan.id]);

    // 5. Supprimer les anciens plans
    await queryRunner.query(`
      DELETE FROM plan WHERE code IN ('FREE', 'STANDARD', 'PREMIUM', 'ENTERPRISE')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('Cannot revert - data would be lost');
  }
}
```

---

## ✅ Workflow Complet

### Parcours Utilisateur

```
1. Inscription
   ↓
2. Abonnement ESSAI créé automatiquement (30 jours gratuits)
   ↓
3. Accès aux fonctionnalités de base:
   - Stock, Ventes, Approvisionnements ✅
   - Clients, Fournisseurs ✅
   - Rapports ✅
   ↓
4. Veut créer un INVENTAIRE
   ↓
5. Message: "Aucun module disponible. Achetez un module (25,000 GNF)"
   ↓
6. Paiement module INVENTAIRE → Module acheté (utilise=false)
   ↓
7. Crée l'inventaire → Module marqué utilisé (utilise=true)
   ↓
8. Veut créer un 2ème inventaire
   ↓
9. Doit re-acheter un module (25,000 GNF)
   ↓
...
   ↓
10. Fin période d'essai (30 jours)
    ↓
11. Choix: MENSUEL (25k/mois) ou ANNUEL (250k/an)
    ↓
12. Paiement → Abonnement ACTIF
    ↓
13. Continue à utiliser la plateforme
    ↓
14. Les modules restent payants séparément
```

---

## 🎯 Clarification pour l'Utilisateur

### Ce qui est INCLUS dans l'abonnement (25k/mois):
- ✅ Accès à la plateforme
- ✅ Stock complet
- ✅ Ventes illimitées
- ✅ Approvisionnements
- ✅ Clients/Fournisseurs
- ✅ Rapports
- ✅ Multi-utilisateurs
- ✅ Export

### Ce qui est PAYÉ SÉPARÉMENT (25k à l'usage):
- 💰 **Inventaire physique** - Chaque inventaire créé coûte 25,000 GNF
- 💰 **Calcul Zakat** - Chaque module Zakat acheté coûte 25,000 GNF (valable 1 an)

---

Est-ce que cette architecture hybride correspond bien à ce que vous voulez ?
- Abonnement simple (ESSAI/MENSUEL/ANNUEL) pour l'accès
- Modules payants à l'utilisation (INVENTAIRE/ZAKAT)

Si oui, je peux commencer l'implémentation ! 🚀
