# Authentification Client sur la Vitrine — Spécification

> **Pour agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Date:** 2026-07-27
**Auteur:** Claude + Bailo conde
**Version:** 1.0

## Goal

Implémenter un système d'authentification complet pour les clients sur la vitrine en ligne, permettant aux clients de créer un compte, se connecter, suivre leurs commandes et recevoir des notifications automatiques sur les changements de statut de leurs commandes.

## Architecture

Utilisation de **Context API** (approche cohérente avec le reste du codebase) via le `CustomerAuthContext` existant. Les composants UI accèdent à l'état d'authentification via le hook `useCustomerAuth()`. Les données serveur (commandes, profil) sont gérées par React Query pour le caching et la synchronisation.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **UI:** Shadcn UI + Tailwind CSS
- **État global:** Context API (`CustomerAuthContext` existant)
- **Requêtes serveur:** React Query (TanStack Query)
- **Routing:** React Router v6
- **Backend API:** NestJS (déjà existant dans `src/customer-auth/`)
- **Authentification:** JWT tokens stockés dans localStorage
- **Validation:** class-validator (backend) + validation manuelle (frontend)

## Global Constraints

- **Mobile-first:** Tous les composants doivent être optimisés pour mobile (vitrine = mobile)
- **Token séparé:** Le token client (`customer_token`) est distinct du token admin (`access_token`)
- **Pas de Zustand:** Utiliser Context API pour cohérence avec le codebase existant
- **Backend existant:** Utiliser les endpoints `/public/auth/*` déjà implémentés
- **Téléphone unique:** Le numéro de téléphone sert d'identifiant unique (pas d'email obligatoire)
- **Mot de passe min 6 caractères:** Validation côté frontend et backend
- **Format téléphone:** 9 à 15 chiffres (regex: `/^[0-9]{9,15}$/`)
- **Pas de OAuth V1:** Connexion Google/Facebook réservée pour version future
- **Intercepteur axios:** Gérer les deux tokens (admin et client) dans le même intercepteur
- **Notifications:** Backend envoie automatiquement des notifications aux clients authentifiés

---

## 1. Architecture Globale

### 1.1 Flux d'authentification

```
┌─────────────────────────────────────────────────┐
│  Composants UI (Storefront)                     │
│  - StorefrontHeader (bouton Compte)             │
│  - CustomerAuthModal (Login/Register)           │
│  - CustomerAccountMenu (dropdown)               │
│  - CartDrawer (intégration auth)                │
│  - StorefrontOrders (page commandes)            │
│  - StorefrontProfile (page profil)              │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  CustomerAuthContext (existant)                 │
│  - État: customer, isAuthenticated, isLoading   │
│  - Actions: login, register, logout, update     │
│  - Stockage: localStorage (customer_token)      │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  API Layer (src/api/customer-auth.ts)           │
│  - POST /public/auth/register                   │
│  - POST /public/auth/login                      │
│  - GET /public/auth/me                          │
│  - PUT /public/auth/profile                     │
│  - GET /public/orders/my-orders (nouveau)       │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  Backend API (déjà existant)                    │
│  - customer-auth.controller.ts                  │
│  - customer-auth.service.ts                     │
│  - online-orders.service.ts (à modifier)        │
└─────────────────────────────────────────────────┘
```

### 1.2 Points clés

1. **Token unique par type d'utilisateur:**
   - Admin: `access_token` (routes `/admin/*`, `/api/*`)
   - Client: `customer_token` (routes `/public/auth/*`, `/public/orders/*`)

2. **Intercepteur axios intelligent:**
   - Détecte le type de route et utilise le bon token
   - Sur 401 pour routes client: ouvre CustomerAuthModal (ne redirige PAS vers `/login`)
   - Sur 401 pour routes admin: redirige vers `/login`

3. **Stockage localStorage:**
   - `customer_token`: JWT token du client
   - `customer_data`: Objet `{ id, nom, telephone, email, isActive }`

4. **Synchronisation multi-tabs:**
   - Écouter les événements `storage` pour détecter logout/login dans autre tab
   - Mettre à jour l'état CustomerAuthContext automatiquement

---

## 2. Composants à créer

### 2.1 `src/api/customer-auth.ts`

**Responsabilité:** Client API pour l'authentification client.

**Interface:**

```typescript
export interface RegisterCustomerDto {
  nom: string;
  telephone: string;
  email?: string;
  password: string;
}

export interface LoginCustomerDto {
  telephone: string;
  password: string;
}

export interface UpdateCustomerDto {
  nom?: string;
  telephone?: string;
  email?: string;
}

export interface CustomerAccount {
  id: string;
  nom: string;
  telephone: string;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  access_token: string;
  customer: CustomerAccount;
}

export const customerAuthApi = {
  register: (data: RegisterCustomerDto): Promise<AuthResponse> =>
    apiClient.post('/public/auth/register', data).then(res => res.data),

  login: (data: LoginCustomerDto): Promise<AuthResponse> =>
    apiClient.post('/public/auth/login', data).then(res => res.data),

  getProfile: (): Promise<CustomerAccount> =>
    apiClient.get('/public/auth/me').then(res => res.data),

  updateProfile: (data: UpdateCustomerDto): Promise<CustomerAccount> =>
    apiClient.put('/public/auth/profile', data).then(res => res.data),
};
```

**Validation:**
- Register: Tous les champs requis sauf email
- Login: telephone + password requis
- UpdateProfile: Au moins un champ fourni

---

### 2.2 `src/components/storefront/CustomerAuthModal.tsx`

**Responsabilité:** Modal d'authentification avec tabs Login/Register.

**Props:**
```typescript
interface CustomerAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'login' | 'register';
}
```

**Structure:**
- Dialog (Shadcn UI)
- Tabs: "Connexion" | "Créer un compte"
- **Tab Login:**
  - Input téléphone (type="tel", placeholder="624123456")
  - Input mot de passe (type="password")
  - Bouton "Se connecter" (loading state)
  - Lien "Pas de compte ? Créez-en un" (switch tab)
- **Tab Register:**
  - Input nom
  - Input téléphone
  - Input email (optionnel)
  - Input mot de passe
  - Bouton "Créer mon compte" (loading state)
  - Lien "Déjà un compte ? Connectez-vous"

**Validation frontend:**
```typescript
// Téléphone
if (!/^[0-9]{9,15}$/.test(telephone)) {
  setError("Le numéro doit contenir entre 9 et 15 chiffres");
  return;
}

// Mot de passe
if (password.length < 6) {
  setError("Le mot de passe doit contenir au moins 6 caractères");
  return;
}

// Email (si fourni)
if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  setError("Format d'email invalide");
  return;
}
```

**Comportement:**
1. Appelle `customerAuth.login()` ou `customerAuth.register()`
2. Sur succès: ferme le modal automatiquement + toast de bienvenue
3. Sur erreur: affiche le message d'erreur sous le formulaire
4. Loading state: désactive tous les champs et affiche spinner sur bouton

**Gestion d'erreurs:**
- 409 (téléphone déjà utilisé): "Ce numéro est déjà enregistré"
- 401 (identifiants incorrects): "Téléphone ou mot de passe incorrect"
- Network error: "Erreur de connexion. Vérifiez votre internet"

---

### 2.3 `src/components/storefront/CustomerAccountMenu.tsx`

**Responsabilité:** Menu dropdown quand le client est connecté.

**Props:**
```typescript
interface CustomerAccountMenuProps {
  storefront: StoreFront;
}
```

**Structure:**
- Dropdown menu (Shadcn UI)
- **Header:**
  - Icône utilisateur
  - Nom du client
  - Téléphone du client (gris, petit)
- **Separator**
- **Options:**
  - 📦 Mes commandes → `/storefront/:slug/orders`
  - 👤 Mon profil → `/storefront/:slug/profile`
  - **Separator**
  - 🏪 **Infos boutique** (section non cliquable)
  - 🕐 Horaires: [storefront.horaires]
  - 📍 Adresse: [storefront.adresse]
  - 🚚 Livraison: [storefront.fraisLivraison]
  - 📱 WhatsApp: [bouton qui ouvre wa.me]
  - **Separator**
  - 🚪 Déconnexion (rouge)

**Comportement déconnexion:**
```typescript
const handleLogout = () => {
  // Vider le panier (pour éviter confusion entre comptes)
  cartContext.clear();
  // Déconnecter
  customerAuth.logout();
  // Toast
  toast.info("Déconnexion réussie");
  // Fermer le menu
  setOpen(false);
};
```

---

### 2.4 `src/pages/storefront/StorefrontOrders.tsx`

**Responsabilité:** Page listant toutes les commandes du client connecté.

**Route:** `/storefront/:slug/orders`

**Layout:** Utilise `StorefrontLayout`

**Protection:**
```typescript
const { isAuthenticated } = useCustomerAuth();
const navigate = useNavigate();

useEffect(() => {
  if (!isAuthenticated) {
    navigate(`/storefront/${slug}`);
    // TODO: déclencher ouverture CustomerAuthModal via état global
  }
}, [isAuthenticated]);
```

**Chargement des commandes:**
```typescript
const { data: orders, isLoading } = useQuery({
  queryKey: ['customer-orders', customer?.id],
  queryFn: () => apiClient.get('/public/orders/my-orders').then(res => res.data),
  enabled: !!customer,
});
```

**Affichage:**
- Si `isLoading`: Skeleton loader (3-4 cards)
- Si `orders.length === 0`: Message "Aucune commande pour le moment" + bouton "Découvrir les produits"
- Sinon: Liste de cards cliquables

**Card de commande:**
```
┌─────────────────────────────────────────┐
│ 📦 Commande #CMD-202607-00001           │
│ 🕐 27 juillet 2026                      │
│ 💰 125,000 GNF                          │
│ [Badge statut: EN_ATTENTE/CONFIRMEE...] │
└─────────────────────────────────────────┘
```

**Couleurs des statuts:**
- EN_ATTENTE: Jaune/Orange
- CONFIRMEE: Bleu
- PRETE: Vert clair
- LIVREE: Vert foncé
- ANNULEE: Rouge

**Clique sur card:** Navigate vers `/storefront/:slug/orders/:orderId`

---

### 2.5 `src/pages/storefront/StorefrontOrderDetail.tsx`

**Responsabilité:** Page détail d'une commande spécifique.

**Route:** `/storefront/:slug/orders/:orderId`

**Chargement:**
```typescript
const { data: order, isLoading } = useQuery({
  queryKey: ['customer-order', orderId],
  queryFn: () => apiClient.get(`/public/orders/${orderId}`).then(res => res.data),
});
```

**Affichage:**
- **Header:** Numéro de commande + badge statut
- **Timeline:** Historique des statuts (EN_ATTENTE → CONFIRMEE → PRETE → LIVREE)
- **Articles:**
  - Photo de l'article
  - Nom
  - Quantité x Prix unitaire
  - Sous-total
- **Totaux:**
  - Sous-total
  - Frais de livraison
  - **Total**
- **Infos livraison:**
  - Adresse
  - Téléphone
  - Mode (Retrait/Livraison)
- **Bouton WhatsApp:** Contacter la boutique pour cette commande

---

### 2.6 `src/pages/storefront/StorefrontProfile.tsx`

**Responsabilité:** Page profil du client (édition).

**Route:** `/storefront/:slug/profile`

**Formulaire:**
```typescript
const [formData, setFormData] = useState({
  nom: customer.nom,
  telephone: customer.telephone,
  email: customer.email || '',
});

const { mutate: updateProfile, isLoading } = useMutation({
  mutationFn: (data: UpdateCustomerDto) => customerAuthApi.updateProfile(data),
  onSuccess: (updated) => {
    customerAuth.updateProfile(updated); // Met à jour le context
    toast.success("Profil mis à jour");
  },
});
```

**Champs:**
- Input nom (requis)
- Input téléphone (requis, validation)
- Input email (optionnel)
- Bouton "Enregistrer" (loading state)

**Section "Changer le mot de passe"** (V2 - hors scope V1):
- Lien "Modifier mon mot de passe" → ouvre modal séparée

---

## 3. Composants à modifier

### 3.1 `src/components/storefront/StorefrontHeader.tsx`

**Changements:**

**Avant:**
```
[Menu] [Nom Boutique] [Panier]
```

**Après:**
```
[Compte] [Nom Boutique] [Panier]
```

**Bouton "Compte":**
```typescript
const { isAuthenticated, customer } = useCustomerAuth();
const [authModalOpen, setAuthModalOpen] = useState(false);
const [accountMenuOpen, setAccountMenuOpen] = useState(false);

// Bouton
<Button
  variant="ghost"
  size="icon"
  onClick={() => {
    if (isAuthenticated) {
      setAccountMenuOpen(true);
    } else {
      setAuthModalOpen(true);
    }
  }}
>
  <User className="h-5 w-5" />
</Button>

// Modals/Menus
{!isAuthenticated && (
  <CustomerAuthModal
    open={authModalOpen}
    onOpenChange={setAuthModalOpen}
  />
)}

{isAuthenticated && (
  <CustomerAccountMenu
    open={accountMenuOpen}
    onOpenChange={setAccountMenuOpen}
    storefront={storefront}
  />
)}
```

**Retrait du menu boutique:**
- Le Sheet avec les infos boutique (horaires, adresse, etc.) est supprimé
- Ces infos sont maintenant dans CustomerAccountMenu

---

### 3.2 `src/components/storefront/CartDrawer.tsx`

**Changements dans l'étape "checkout":**

**Avant (step === 'checkout'):**
```typescript
// Affiche directement le formulaire
<CheckoutForm onSubmit={handleSubmitOrder} />
```

**Après:**
```typescript
const { isAuthenticated, customer } = useCustomerAuth();
const [authModalOpen, setAuthModalOpen] = useState(false);

// Dans le step 'checkout'
{!isAuthenticated ? (
  <div className="flex-1 flex flex-col items-center justify-center p-6">
    <User className="h-16 w-16 text-gray-300 mb-4" />
    <h3 className="font-semibold text-lg mb-2">Connexion requise</h3>
    <p className="text-sm text-gray-600 text-center mb-4">
      Créez un compte ou connectez-vous pour passer commande et suivre vos livraisons
    </p>
    <Button onClick={() => setAuthModalOpen(true)}>
      Se connecter / Créer un compte
    </Button>

    <CustomerAuthModal
      open={authModalOpen}
      onOpenChange={setAuthModalOpen}
    />
  </div>
) : (
  <CheckoutForm
    onSubmit={handleSubmitOrder}
    defaultValues={{
      nomClient: customer.nom,
      telephone: customer.telephone,
      email: customer.email || '',
    }}
  />
)}
```

**Pré-remplissage du formulaire:**
- Si `customer` existe, pré-remplir nom, téléphone, email
- L'utilisateur peut modifier ces valeurs si besoin
- Adresse de livraison reste vide (à saisir à chaque commande)

**Lors de la soumission:**
```typescript
const handleSubmitOrder = async (formData) => {
  // ... code existant ...

  const orderData = {
    nomClient: formData.nomClient,
    telephone: formData.telephone,
    adresseLivraison: formData.adresseLivraison,
    notes: formData.notes,
    articles: items.map(item => ({
      articleId: item.articleId,
      quantite: item.quantity,
      prixUnitaire: item.prixUnitaire,
      modeVenteId: item.modeVenteId,
    }))
  };

  await apiClient.post(`/public/stores/${slug}/orders`, orderData);

  // ... reste du code (WhatsApp, etc.) ...
};
```

**Note:** Le backend détectera automatiquement le `customer_token` dans le header Authorization et liera la commande au customerAccountId.

---

### 3.3 `src/lib/api-client.ts`

**Modification de l'intercepteur pour gérer les deux tokens:**

**Intercepteur request (avant):**
```typescript
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

**Intercepteur request (après):**
```typescript
apiClient.interceptors.request.use((config) => {
  // Déterminer quel token utiliser selon la route
  const isCustomerRoute = config.url?.startsWith('/public/auth') ||
                          config.url?.startsWith('/public/orders');

  const token = isCustomerRoute
    ? localStorage.getItem('customer_token')
    : localStorage.getItem('access_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
```

**Intercepteur response (modification):**
```typescript
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isCustomerRoute = error.config?.url?.startsWith('/public/auth') ||
                              error.config?.url?.startsWith('/public/orders');

      if (isCustomerRoute) {
        // Client token expiré
        localStorage.removeItem('customer_token');
        localStorage.removeItem('customer_data');
        // Déclencher ouverture CustomerAuthModal
        // TODO: Event bus ou state global pour ouvrir la modal
        window.dispatchEvent(new CustomEvent('customer-auth-required'));
      } else {
        // Admin token expiré
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

---

## 4. Modifications Backend

### 4.1 `src/online-orders/online-orders.service.ts`

**Méthode `createFromStorefront` (ligne 663):**

**Changement:** Extraire le `customerAccountId` du JWT token si présent.

**Avant:**
```typescript
const order = queryRunner.manager.create(OnlineOrder, {
  numero,
  organizationId: storefront.organizationId,
  customerAccountId: null, // ❌ Toujours null
  clientId: null,
  clientNom: dto.nomClient || null,
  // ...
});
```

**Après:**
```typescript
// Extraire customerAccountId du token JWT si présent
let customerAccountId: string | null = null;
const authHeader = request.headers.authorization;

if (authHeader?.startsWith('Bearer ')) {
  try {
    const token = authHeader.substring(7);
    const decoded = this.jwtService.verify(token);
    customerAccountId = decoded.sub; // ID du customer dans le JWT
  } catch (err) {
    // Token invalide ou expiré - continuer sans customerAccountId
  }
}

const order = queryRunner.manager.create(OnlineOrder, {
  numero,
  organizationId: storefront.organizationId,
  customerAccountId, // ✅ Maintenant peut être rempli
  clientId: null,
  clientNom: dto.nomClient || null,
  // ...
});
```

**Note:** Cette modification permet au backend de lier automatiquement la commande au compte client si le token est présent, sans que le frontend ait à envoyer explicitement le `customerAccountId`.

---

### 4.2 Nouveau endpoint: `GET /public/orders/my-orders`

**Contrôleur:** `src/online-orders/online-orders-public.controller.ts`

**Nouveau endpoint:**
```typescript
@Get('my-orders')
@UseGuards(CustomerJwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({ summary: 'Récupérer les commandes du client connecté' })
async getMyOrders(@CurrentCustomer() customer: CustomerAccount) {
  return this.onlineOrdersService.getByCustomer(customer.id);
}
```

**Service:** `src/online-orders/online-orders.service.ts`

**Méthode existante à exposer:**
```typescript
async getByCustomer(customerId: string, page: number = 1, limit: number = 20) {
  // Déjà implémentée (ligne 207)
  // Retourne les commandes filtrées par customerAccountId
}
```

**Guard:** `src/customer-auth/guards/customer-jwt-auth.guard.ts` (à créer si n'existe pas)

**Decorator:** `src/customer-auth/decorators/current-customer.decorator.ts` (à créer si n'existe pas)

---

## 5. Flux de données détaillés

### 5.1 Flux de connexion (Login)

```
1. User clique bouton "Compte" → CustomerAuthModal s'ouvre (tab "Connexion")
2. User entre téléphone (624123456) + mot de passe → clique "Se connecter"
3. CustomerAuthModal appelle:
   const { login } = useCustomerAuth();
   await login({ telephone, password });
4. CustomerAuthContext.login():
   a. setIsLoading(true)
   b. response = await customerAuthApi.login({ telephone, password })
      → POST /public/auth/login
      → Backend valide et retourne: { access_token, customer: {...} }
   c. localStorage.setItem('customer_token', response.access_token)
   d. localStorage.setItem('customer_data', JSON.stringify(response.customer))
   e. setCustomer(response.customer)
   f. setIsLoading(false)
5. Modal se ferme automatiquement (useEffect sur isAuthenticated)
6. Toast: "Bienvenue [nom] !"
7. Header affiche bouton "Compte" avec état connecté
8. Si user était en train de commander → CartDrawer pré-remplit le formulaire
```

### 5.2 Flux d'inscription (Register)

```
1. User clique tab "Créer un compte" dans CustomerAuthModal
2. User remplit:
   - Nom: Mamadou Diallo
   - Téléphone: 624123456
   - Email: mamadou@example.com (optionnel)
   - Mot de passe: ******
3. Validation frontend:
   - Téléphone: /^[0-9]{9,15}$/ ✅
   - Mot de passe: length >= 6 ✅
   - Email (si fourni): format valide ✅
4. CustomerAuthModal appelle:
   await register({ nom, telephone, email, password });
5. CustomerAuthContext.register():
   a. setIsLoading(true)
   b. response = await customerAuthApi.register(data)
      → POST /public/auth/register
      → Backend crée le compte et retourne: { access_token, customer }
   c. localStorage.setItem('customer_token', response.access_token)
   d. localStorage.setItem('customer_data', JSON.stringify(response.customer))
   e. setCustomer(response.customer)
   f. setIsLoading(false)
6. Modal se ferme
7. Toast: "Compte créé avec succès ! Bienvenue Mamadou !"
8. User est maintenant connecté (même effet que login)
```

### 5.3 Flux de commande (avec authentification)

```
1. User (non connecté) ajoute articles au panier
2. User clique icône Panier → CartDrawer s'ouvre (step: 'cart')
3. User clique bouton "Commander" → setStep('checkout')
4. CartDrawer vérifie isAuthenticated:
   if (!isAuthenticated) {
     // Afficher message + bouton "Se connecter"
     <CustomerAuthModal open={authModalOpen} />
   }
5. User se connecte ou s'inscrit via la modal
6. Après auth réussie, modal se ferme automatiquement
7. CartDrawer détecte isAuthenticated = true → affiche formulaire pré-rempli:
   - nomClient: customer.nom
   - telephone: customer.telephone
   - email: customer.email
   - adresseLivraison: "" (vide, à saisir)
8. User complète adresse + notes, clique "Confirmer"
9. CartDrawer envoie:
   POST /public/stores/:slug/orders
   Headers: { Authorization: "Bearer [customer_token]" }
   Body: {
     nomClient: "Mamadou Diallo",
     telephone: "624123456",
     adresseLivraison: "Quartier X, Rue Y",
     notes: "Livrer après 18h",
     articles: [...]
   }
10. Backend (createFromStorefront):
    a. Extrait customerAccountId du JWT token (sub claim)
    b. Crée la commande avec customerAccountId rempli
    c. Envoie notification à la boutique
    d. Envoie notification au client (car customerAccountId existe) ✅
    e. Retourne { success: true, orderId, numero }
11. CartDrawer:
    a. Vide le panier (clear())
    b. Passe à step 'success'
    c. Ouvre WhatsApp (comportement actuel conservé)
12. User peut maintenant aller dans "Mes commandes" pour suivre sa commande
```

### 5.4 Flux "Mes commandes"

```
1. User connecté clique "Mes commandes" dans CustomerAccountMenu
2. Navigate vers /storefront/:slug/orders
3. StorefrontOrders vérifie isAuthenticated:
   useEffect(() => {
     if (!isAuthenticated) {
       navigate(`/storefront/${slug}`);
       // Ouvrir CustomerAuthModal
     }
   }, [isAuthenticated]);
4. Si connecté, charge les commandes:
   useQuery({
     queryKey: ['customer-orders', customer.id],
     queryFn: () => GET /public/orders/my-orders
       Headers: { Authorization: "Bearer [customer_token]" }
   })
5. Backend (getMyOrders):
   - Extrait customerAccountId du JWT
   - Filtre les commandes: WHERE customerAccountId = :id
   - Retourne la liste avec relations (items)
6. Affichage:
   - Skeleton loader pendant chargement
   - Liste de cards (commande + statut + montant)
   - Tri par date décroissante (plus récente en haut)
7. User clique sur une commande → /storefront/:slug/orders/:orderId
8. Charge le détail:
   GET /public/orders/:orderId
   Backend vérifie que customerAccountId du JWT = celui de la commande (sécurité)
9. Affiche détail complet avec timeline des statuts
```

### 5.5 Gestion du token expiré

```
1. User connecté laisse l'onglet ouvert 2 heures
2. JWT token expire côté backend
3. User navigue vers "Mes commandes"
4. Frontend envoie:
   GET /public/orders/my-orders
   Headers: { Authorization: "Bearer [expired_token]" }
5. Backend retourne 401 Unauthorized
6. Intercepteur axios détecte 401 sur route /public/*:
   a. localStorage.removeItem('customer_token')
   b. localStorage.removeItem('customer_data')
   c. Déclenche événement: window.dispatchEvent(new CustomEvent('customer-auth-required'))
   d. Toast: "Session expirée. Veuillez vous reconnecter"
7. CustomerAuthContext écoute l'événement et met à jour state:
   setCustomer(null)
8. Page "Mes commandes" détecte isAuthenticated = false
9. Navigate vers /storefront/:slug
10. Ouvre CustomerAuthModal automatiquement
11. User se reconnecte
12. Peut retourner sur "Mes commandes"
```

---

## 6. Gestion des erreurs

### 6.1 Erreurs d'authentification

**Login - 401 Unauthorized:**
```
Backend: { statusCode: 401, message: "Identifiants incorrects" }
Frontend: Toast error("Téléphone ou mot de passe incorrect")
```

**Login - 404 Not Found:**
```
Backend: { statusCode: 404, message: "Compte non trouvé" }
Frontend: Toast error("Aucun compte trouvé avec ce numéro")
```

**Register - 409 Conflict:**
```
Backend: { statusCode: 409, message: "Ce téléphone est déjà utilisé" }
Frontend: Toast error("Ce numéro est déjà enregistré. Connectez-vous ou utilisez un autre numéro")
```

**Register - 400 Bad Request:**
```
Backend: {
  statusCode: 400,
  message: ["telephone must match /^[0-9]{9,15}$/", "password must be at least 6 characters"]
}
Frontend: Afficher chaque erreur sous le champ correspondant
```

**Network Error:**
```
Axios error sans response.data
Frontend: Toast error("Erreur de connexion. Vérifiez votre internet")
```

### 6.2 Validation frontend (avant envoi)

**CustomerAuthModal - Tab Login:**
```typescript
const validateLogin = () => {
  if (!telephone) return "Le téléphone est requis";
  if (!/^[0-9]{9,15}$/.test(telephone)) return "Le numéro doit contenir entre 9 et 15 chiffres";
  if (!password) return "Le mot de passe est requis";
  return null;
};
```

**CustomerAuthModal - Tab Register:**
```typescript
const validateRegister = () => {
  if (!nom.trim()) return "Le nom est requis";
  if (!telephone) return "Le téléphone est requis";
  if (!/^[0-9]{9,15}$/.test(telephone)) return "Le numéro doit contenir entre 9 et 15 chiffres";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Format d'email invalide";
  if (!password) return "Le mot de passe est requis";
  if (password.length < 6) return "Le mot de passe doit contenir au moins 6 caractères";
  return null;
};
```

### 6.3 Cas particuliers

**Déconnexion dans un autre tab:**
```typescript
// CustomerAuthContext
useEffect(() => {
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'customer_token' && !e.newValue) {
      // Token supprimé dans autre tab = logout
      setCustomer(null);
      toast.info("Vous avez été déconnecté");
    }
  };

  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, []);
```

**Changement de compte (logout puis login d'un autre user):**
```typescript
const logout = () => {
  // Vider le panier pour éviter confusion
  // TODO: Accès au CartContext depuis CustomerAuthContext (injection via props ou context global)
  localStorage.removeItem('customer_token');
  localStorage.removeItem('customer_data');
  setCustomer(null);
};
```

**Commande d'un client ayant déjà un compte mais non connecté:**
```
1. User (non connecté) entre son téléphone dans CartDrawer
2. Ce téléphone correspond à un CustomerAccount existant
3. Backend détecte: CustomerAccount avec ce téléphone existe, mais pas de token
4. Backend retourne 409: "Un compte existe avec ce numéro. Veuillez vous connecter"
5. Frontend affiche le message + ouvre CustomerAuthModal (tab Login)
6. User se connecte
7. Formulaire pré-rempli, user peut continuer
```

---

## 7. Routes et navigation

### 7.1 Nouvelles routes

**Routes publiques (storefront):**
```typescript
// Dans App.tsx
<Route path="/storefront/:slug" element={<StorefrontLayout />}>
  <Route index element={<StorefrontHome />} />
  <Route path="product/:productId" element={<StorefrontProduct />} />
  <Route path="cart" element={<StorefrontCart />} />
  <Route path="checkout" element={<StorefrontCheckout />} />

  {/* Nouvelles routes protégées client */}
  <Route path="orders" element={<CustomerProtectedRoute><StorefrontOrders /></CustomerProtectedRoute>} />
  <Route path="orders/:orderId" element={<CustomerProtectedRoute><StorefrontOrderDetail /></CustomerProtectedRoute>} />
  <Route path="profile" element={<CustomerProtectedRoute><StorefrontProfile /></CustomerProtectedRoute>} />
</Route>
```

**CustomerProtectedRoute:**
```typescript
// src/components/customer/CustomerProtectedRoute.tsx
export const CustomerProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useCustomerAuth();
  const { slug } = useParams();
  const navigate = useNavigate();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      // Rediriger vers home + ouvrir modal
      navigate(`/storefront/${slug}`);
      setAuthModalOpen(true);
    }
  }, [isAuthenticated, slug, navigate]);

  if (!isAuthenticated) {
    return <CustomerAuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />;
  }

  return <>{children}</>;
};
```

### 7.2 Navigation depuis CustomerAccountMenu

**Mes commandes:**
```typescript
<DropdownMenuItem onClick={() => navigate(`/storefront/${slug}/orders`)}>
  <Package className="mr-2 h-4 w-4" />
  Mes commandes
</DropdownMenuItem>
```

**Mon profil:**
```typescript
<DropdownMenuItem onClick={() => navigate(`/storefront/${slug}/profile`)}>
  <User className="mr-2 h-4 w-4" />
  Mon profil
</DropdownMenuItem>
```

---

## 8. Améliorations futures (hors scope V1)

Ces fonctionnalités ne seront **PAS** implémentées dans la V1, mais sont prévues pour des versions ultérieures :

### 8.1 V2 (prochaine version)

- 🔐 **Réinitialisation du mot de passe** par SMS/Email
- 📱 **Vérification du numéro** par code OTP SMS
- 🔑 **Changer le mot de passe** depuis le profil
- 📧 **Notifications par email** en plus des notifications in-app
- 📍 **Adresses enregistrées** (adresses de livraison favorites)
- 🔔 **Notifications push** dans le navigateur (Web Push API)

### 8.2 V3 (future)

- 🌐 **Connexion avec Google OAuth**
- 📱 **Connexion avec Facebook**
- ⭐ **Favoris / Wishlist**
- 🎁 **Programme de fidélité** avec points
- 💳 **Moyens de paiement enregistrés** (mobile money)
- 🔗 **Partage de panier** via lien
- 💬 **Chat en temps réel** avec la boutique

---

## 9. Tests recommandés

### 9.1 Tests manuels critiques

**Authentification:**
- [ ] Login avec credentials valides → succès
- [ ] Login avec mot de passe incorrect → erreur claire
- [ ] Login avec téléphone inexistant → erreur claire
- [ ] Register avec téléphone déjà utilisé → erreur 409
- [ ] Register avec téléphone valide → compte créé + auto-login
- [ ] Logout → token supprimé + redirect
- [ ] Token expiré → message + re-login

**Commande:**
- [ ] Commander sans compte → modal auth s'affiche
- [ ] Commander après login → formulaire pré-rempli
- [ ] Commander avec compte → customerAccountId lié dans DB
- [ ] Notification envoyée au client après confirmation de commande

**Navigation:**
- [ ] Accès "Mes commandes" sans auth → redirect + modal
- [ ] Accès "Mes commandes" avec auth → liste affichée
- [ ] Accès "Mon profil" sans auth → redirect + modal
- [ ] Modification du profil → données mises à jour

**Multi-tabs:**
- [ ] Logout dans tab A → tab B détecte et se déconnecte
- [ ] Login dans tab A → tab B détecte et se connecte

### 9.2 Tests d'intégration (optionnel)

- Cypress: Flow complet inscription → ajout au panier → commande
- Cypress: Flow complet login → voir mes commandes → détail commande
- Cypress: Vérifier pré-remplissage du formulaire après auth

---

## 10. Critères de succès

**La fonctionnalité est considérée comme complète quand :**

1. ✅ Un client peut créer un compte depuis la vitrine (modal)
2. ✅ Un client peut se connecter depuis la vitrine (modal)
3. ✅ Le bouton "Compte" remplace le bouton "Menu" dans le header
4. ✅ Le menu compte affiche les infos boutique + options client
5. ✅ Une commande nécessite obligatoirement une authentification
6. ✅ Le formulaire de commande est pré-rempli avec les données du client connecté
7. ✅ La commande est liée au customerAccountId dans la base de données
8. ✅ Le client reçoit des notifications quand sa commande change de statut
9. ✅ Le client peut voir toutes ses commandes dans "Mes commandes"
10. ✅ Le client peut voir le détail d'une commande spécifique
11. ✅ Le client peut modifier son profil (nom, téléphone, email)
12. ✅ Le logout vide le panier pour éviter confusion entre comptes
13. ✅ L'intercepteur axios gère correctement les deux tokens (admin/client)
14. ✅ Un token expiré déclenche une demande de re-connexion
15. ✅ Les routes client sont protégées (redirect si non authentifié)

---

## Résumé technique

**Complexité:** Moyenne
**Temps estimé:** Non fourni (selon principes du skill)
**Fichiers créés:** 7 (api, 5 composants, 1 route guard)
**Fichiers modifiés:** 4 (StorefrontHeader, CartDrawer, api-client, online-orders.service)
**Backend changes:** Minimes (extraction JWT, nouveau endpoint, guard)
**Breaking changes:** Aucun (comportement existant conservé)

**Dépendances:**
- Aucune nouvelle dépendance npm (tout existe déjà)
- Backend API déjà implémentée (`src/customer-auth/`)
- CustomerAuthContext déjà créé
- React Query déjà configuré
- Shadcn UI déjà installé

**Risques:**
- Aucun risque majeur identifié
- Changement UX (menu → compte) simple et intuitif
- Migration progressive possible (ancien flux compatible)
