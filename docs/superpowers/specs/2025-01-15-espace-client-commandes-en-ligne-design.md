# Espace Client & Commandes en Ligne - Document de Design

**Date:** 2025-01-15
**Statut:** Approuvé
**Auteur:** Claude Code

---

## 1. Objectif

Ajouter un **Espace Client public** permettant aux clients de passer des commandes en ligne directement auprès des boutiques de la plateforme multi-tenant existante.

---

## 2. Décisions de conception

| Aspect | Décision |
|--------|----------|
| Architecture frontend | Même application React, routing séparé (`/b/*`, `/customer/*`, `/stores`) |
| Authentification client | Table `CustomerAccount` séparée avec JWT dédié |
| Gestion stock | Pas de réservation, décrémentation uniquement à la confirmation |
| Notifications boutique | Polling 30s + notifications navigateur |
| Envoi commande | Bouton unique : enregistre en BDD + ouvre WhatsApp vers gérant |
| Architecture notifications | Interface abstraite `NotificationProvider` (évolutif) |
| Visibilité produits | Case "Disponible en ligne" sur chaque article |
| Prix en ligne | Champ `prixEnLigne` optionnel sur Article |
| Frais de livraison | Montant fixe par boutique |
| Lien Client/CustomerAccount | Automatique à la première commande (par téléphone) |
| Paiement | Pas de sélection, gérant contacte le client après commande |
| Mobile | Mobile-first, pattern `Mobile*` composants séparés |

---

## 3. Schéma des entités

### 3.1 Nouvelles entités

```
CustomerAccount (compte client portail)
├── id: UUID (PK)
├── nom: string
├── telephone: string (unique, index)
├── email: string (nullable)
├── passwordHash: string
├── isActive: boolean (default: true)
├── createdAt: timestamp
└── updatedAt: timestamp

StoreFront (configuration vitrine boutique)
├── id: UUID (PK)
├── organizationId: UUID (FK → Organization, unique)
├── slug: string (unique, index)
├── isActive: boolean (default: false)
├── description: text (nullable)
├── logoUrl: string (nullable)
├── whatsappNumber: string (nullable)
├── horaires: string (nullable)
├── fraisLivraison: decimal (default: 0)
├── adresse: string (nullable)
├── createdAt: timestamp
└── updatedAt: timestamp

OnlineOrder (commande en ligne)
├── id: UUID (PK)
├── numero: string (unique)
├── organizationId: UUID (FK, index)
├── customerAccountId: UUID (FK → CustomerAccount)
├── clientId: UUID (FK → Client, nullable)
├── statut: enum (EN_ATTENTE, CONFIRMEE, PRETE, LIVREE, ANNULEE)
├── modeLivraison: enum (LIVRAISON, RETRAIT_BOUTIQUE)
├── adresseLivraison: string (nullable)
├── telephoneLivraison: string (nullable)
├── fraisLivraison: decimal
├── sousTotal: decimal
├── total: decimal
├── motifAnnulation: string (nullable)
├── confirmeePar: UUID (nullable)
├── confirmeeLe: timestamp (nullable)
├── preteLe: timestamp (nullable)
├── livreeLe: timestamp (nullable)
├── annuleeLe: timestamp (nullable)
├── venteId: UUID (FK → Vente, nullable)
├── createdAt: timestamp
└── updatedAt: timestamp

OnlineOrderItem (ligne de commande)
├── id: UUID (PK)
├── onlineOrderId: UUID (FK → OnlineOrder)
├── articleId: UUID (FK → Article)
├── articleNom: string
├── modeVenteId: UUID (FK, nullable)
├── modeVenteNom: string (nullable)
├── quantite: int
├── prixUnitaire: decimal
├── sousTotal: decimal
└── organizationId: UUID (FK, index)

Notification (historique notifications)
├── id: UUID (PK)
├── type: enum (NOUVELLE_COMMANDE, COMMANDE_CONFIRMEE, COMMANDE_PRETE, COMMANDE_LIVREE, COMMANDE_ANNULEE)
├── recipientType: enum (BOUTIQUE, CLIENT)
├── recipientId: UUID
├── title: string
├── message: text
├── data: jsonb (nullable)
├── isRead: boolean (default: false)
├── createdAt: timestamp
└── organizationId: UUID (nullable)
```

### 3.2 Modifications entités existantes

```
Article (ajouts)
├── + disponibleEnLigne: boolean (default: false)
└── + prixEnLigne: decimal (nullable)

Client (ajout)
└── + customerAccountId: UUID (FK → CustomerAccount, nullable)
```

---

## 4. Endpoints API

### 4.1 API Publique (sans auth back-office)

```
Vitrine Boutique (accès libre)
GET    /api/public/stores                    — Liste boutiques actives
GET    /api/public/stores/:slug              — Détails boutique (+ meta OG)
GET    /api/public/stores/:slug/products     — Catalogue produits (paginé)

Auth Client
POST   /api/public/auth/register             — Créer compte client
POST   /api/public/auth/login                — Connexion (téléphone + mdp)
GET    /api/public/auth/me                   — Profil client (JWT requis)
PUT    /api/public/auth/profile              — Modifier profil (JWT requis)

Commandes Client (JWT client requis)
POST   /api/public/orders                    — Passer commande
GET    /api/public/orders                    — Mes commandes (paginé)
GET    /api/public/orders/:id                — Détail commande
GET    /api/public/notifications             — Mes notifications
```

### 4.2 API Back-Office (auth existante)

```
Gestion Vitrine
GET    /api/storefront                       — Ma config vitrine
PUT    /api/storefront                       — Modifier vitrine
POST   /api/storefront/logo                  — Upload logo
GET    /api/storefront/qrcode                — Générer QR code

Gestion Commandes en ligne
GET    /api/online-orders                    — Liste commandes (paginé)
GET    /api/online-orders/stats              — Statistiques
GET    /api/online-orders/:id                — Détail commande
PATCH  /api/online-orders/:id/confirm        — Confirmer
PATCH  /api/online-orders/:id/ready          — Marquer prête
PATCH  /api/online-orders/:id/deliver        — Marquer livrée
PATCH  /api/online-orders/:id/cancel         — Annuler (+ motif)
GET    /api/online-orders/pending-count      — Nombre en attente (badge)

Notifications Boutique
GET    /api/notifications                    — Mes notifications
PATCH  /api/notifications/:id/read           — Marquer comme lue
```

---

## 5. Pages Frontend

### 5.1 Pages Publiques

| Route | Page | Description |
|-------|------|-------------|
| `/stores` | StoresListPage | Liste des boutiques |
| `/b/:slug` | StorePage | Vitrine boutique (catalogue) |
| `/b/:slug/cart` | CartPage | Panier |
| `/b/:slug/checkout` | CheckoutPage | Finalisation commande |
| `/customer/login` | CustomerLoginPage | Connexion client |
| `/customer/register` | CustomerRegisterPage | Inscription client |
| `/customer/orders` | CustomerOrdersPage | Historique commandes |
| `/customer/orders/:id` | CustomerOrderDetailPage | Détail commande |
| `/customer/profile` | CustomerProfilePage | Mon profil |

### 5.2 Pages Back-Office (ajouts)

| Route | Page | Description |
|-------|------|-------------|
| `/online-orders` | OnlineOrders | Liste commandes en ligne |
| `/online-orders/:id` | OnlineOrderDetail | Détail + actions |
| `/settings/storefront` | StorefrontSettings | Config vitrine |

### 5.3 Layouts

- `PublicLayout` — Header simple (logo, panier, connexion), footer, sans sidebar
- `CustomerLayout` — Header avec menu client (Commandes, Profil, Déconnexion)
- `AppLayout` — Layout existant pour back-office

---

## 6. Flux de commande

```
CLIENT                                    BOUTIQUE
  │                                          │
  ├── Parcourt vitrine /b/:slug              │
  ├── Ajoute au panier (localStorage)        │
  ├── Clique "Commander"                     │
  ├── Se connecte/inscrit si nécessaire      │
  ├── Choisit mode livraison + adresse       │
  ├── Clique "Valider et envoyer"            │
  │         │                                │
  │         ▼                                │
  │   [1] POST /api/public/orders            │
  │       → Commande créée EN_ATTENTE        │
  │       → Notification créée               │
  │                                          │
  │   [2] window.open(waLink)                │
  │       → WhatsApp s'ouvre                 │
  │       → Message avec détails commande    ──────▶ Gérant reçoit WhatsApp
  │                                          │
  │                                          ├── Badge "1 nouvelle commande"
  │                                          ├── Notification navigateur
  │                                          │
  │                                          ├── Consulte détail commande
  │                                          ├── Contacte client si besoin
  │                                          ├── Confirme commande
  │                                          │       │
  │   [NOTIFICATION]◀────────────────────────┤       ▼
  │   "Commande confirmée"                   │   [CONFIRMEE]
  │                                          │   • Stock décrémenté
  │                                          │   • Vente créée
  │                                          │   • MouvementStock
  │                                          │
  │                                          ├── Marque "Prête"
  │   [NOTIFICATION]◀────────────────────────┤
  │   "Commande prête"                       │
  │                                          │
  │                                          ├── Marque "Livrée"
  │   [NOTIFICATION]◀────────────────────────┤
  │   "Commande livrée"                      │   [LIVREE] ✓
```

### Annulation

- **Avant confirmation:** Changement statut uniquement
- **Après confirmation:** Stock remis + Vente annulée + Notification client

---

## 7. Message WhatsApp généré

```
🛒 *Nouvelle commande #{numero}*

📦 *Articles:*
• {articleNom} (x{quantite}) - {sousTotal} GNF
• ...

💰 *Total: {total} GNF*

📍 *Mode:* {Livraison/Retrait en boutique}
📍 *Adresse:* {adresse}
📞 *Contact:* {telephone}

👤 *Client:* {nom}
```

---

## 8. Notifications

### 8.1 Architecture

```typescript
// Interface abstraite
interface NotificationProvider {
  sendToStore(organizationId: string, payload: NotificationPayload): Promise<void>;
  sendToCustomer(customerAccountId: string, payload: NotificationPayload): Promise<void>;
}

// Implémentation Phase 1
class DefaultNotificationProvider implements NotificationProvider {
  async sendToStore(organizationId, payload) {
    // 1. Créer entrée table Notification
    // 2. (Polling côté front met à jour le badge)
  }

  async sendToCustomer(customerAccountId, payload) {
    // 1. Créer entrée table Notification
  }
}

// Future: WhatsAppBusinessProvider pour envoi automatique
```

### 8.2 Polling (côté gérant)

- Toutes les 30 secondes: `GET /api/online-orders/pending-count`
- Si nouveau: notification navigateur + mise à jour badge sidebar

---

## 9. Configuration vitrine

Page `/settings/storefront` dans le back-office:

- Toggle "Boutique en ligne activée/désactivée"
- Lien boutique avec bouton copier
- QR Code téléchargeable (PNG)
- Champs: slug, description, logo, WhatsApp, horaires, adresse, frais livraison

### Balises Open Graph

```html
<meta property="og:title" content="{nom boutique}" />
<meta property="og:description" content="{description}" />
<meta property="og:image" content="{logoUrl}" />
<meta property="og:url" content="https://domain.com/b/{slug}" />
```

---

## 10. Structure des modules NestJS

```
src/
├── customer-auth/
│   ├── entities/
│   │   └── customer-account.entity.ts
│   ├── dto/
│   ├── guards/
│   │   └── customer-jwt-auth.guard.ts
│   ├── strategies/
│   │   └── customer-jwt.strategy.ts
│   ├── decorators/
│   │   └── current-customer.decorator.ts
│   ├── customer-auth.controller.ts
│   ├── customer-auth.service.ts
│   └── customer-auth.module.ts
│
├── storefront/
│   ├── entities/
│   │   └── storefront.entity.ts
│   ├── dto/
│   ├── storefront.controller.ts
│   ├── storefront-public.controller.ts
│   ├── storefront.service.ts
│   └── storefront.module.ts
│
├── online-orders/
│   ├── entities/
│   │   ├── online-order.entity.ts
│   │   └── online-order-item.entity.ts
│   ├── dto/
│   ├── online-orders.controller.ts
│   ├── online-orders-public.controller.ts
│   ├── online-orders.service.ts
│   └── online-orders.module.ts
│
├── notifications/
│   ├── entities/
│   │   └── notification.entity.ts
│   ├── providers/
│   │   ├── notification.provider.ts
│   │   └── default-notification.provider.ts
│   ├── dto/
│   ├── notifications.controller.ts
│   ├── notifications.service.ts
│   └── notifications.module.ts
│
└── migrations/
    ├── XXXX-CreateCustomerAccount.ts
    ├── XXXX-CreateStorefront.ts
    ├── XXXX-CreateOnlineOrder.ts
    ├── XXXX-CreateNotification.ts
    └── XXXX-AddOnlineFieldsToArticle.ts
```

---

## 11. Structure Frontend (ajouts)

```
src/
├── layouts/
│   ├── PublicLayout.tsx
│   └── CustomerLayout.tsx
│
├── pages/
│   ├── public/
│   │   ├── StorePage.tsx
│   │   ├── CartPage.tsx
│   │   ├── CheckoutPage.tsx
│   │   └── StoresListPage.tsx
│   │
│   ├── customer/
│   │   ├── CustomerLoginPage.tsx
│   │   ├── CustomerRegisterPage.tsx
│   │   ├── CustomerOrdersPage.tsx
│   │   ├── CustomerOrderDetailPage.tsx
│   │   └── CustomerProfilePage.tsx
│   │
│   ├── OnlineOrders.tsx
│   ├── OnlineOrderDetail.tsx
│   └── settings/
│       └── StorefrontSettings.tsx
│
├── components/
│   ├── public/
│   │   ├── ProductCard.tsx
│   │   ├── CartDrawer.tsx
│   │   ├── CheckoutForm.tsx
│   │   ├── MobileStoreHeader.tsx
│   │   └── MobileProductDetail.tsx
│   │
│   ├── online-orders/
│   │   ├── OrderStatusBadge.tsx
│   │   ├── OrderActionButtons.tsx
│   │   ├── OnlineOrderCard.tsx
│   │   ├── MobileOnlineOrderDetail.tsx
│   │   └── MobileOnlineOrdersList.tsx
│   │
│   └── customer/
│       ├── MobileCustomerOrders.tsx
│       └── MobileCustomerProfile.tsx
│
├── hooks/
│   ├── useCustomerAuth.ts
│   ├── useStorefront.ts
│   ├── useOnlineOrders.ts
│   ├── usePublicStore.ts
│   └── useCart.ts
│
├── api/
│   ├── customer-auth.ts
│   ├── storefront.ts
│   ├── online-orders.ts
│   └── public-store.ts
│
└── contexts/
    └── CustomerAuthContext.tsx
```

---

## 12. Responsive & Mobile

### Pattern existant respecté

```tsx
// Exemple: OnlineOrderDetail.tsx
export default function OnlineOrderDetail() {
  return (
    <>
      {/* Version Mobile */}
      <div className="lg:hidden">
        <MobileOnlineOrderDetail order={order} />
      </div>

      {/* Version Desktop */}
      <AppLayout>
        <div className="hidden lg:block">
          {/* ... */}
        </div>
      </AppLayout>
    </>
  );
}
```

### Vitrine mobile-first

- Header sticky (logo + panier)
- Grille: 2 colonnes mobile, 3-4 colonnes desktop
- Panier: Sheet (mobile) / Drawer (desktop)
- Boutons tactiles (min 44px height)
- Pull-to-refresh sur listes

---

## 13. Sécurité

- **Rate limiting** sur API publique (express-rate-limit)
- **Validation DTO** avec class-validator
- **JWT séparé** pour clients (ne pas mélanger avec back-office)
- **Isolation multi-tenant** via organizationId sur toutes les entités
- **Sanitization** des inputs utilisateur

---

## 14. Librairies à ajouter

### Backend
- `qrcode` — Génération QR code

### Frontend
- Aucune nouvelle librairie (utilise shadcn/ui existant)

---

## 15. Migrations requises

1. `CreateCustomerAccount` — Table customer_account
2. `CreateStorefront` — Table storefront
3. `CreateOnlineOrder` — Tables online_order + online_order_item
4. `CreateNotification` — Table notification
5. `AddOnlineFieldsToArticle` — Colonnes disponibleEnLigne, prixEnLigne sur article
6. `AddCustomerAccountIdToClient` — Colonne customerAccountId sur client
