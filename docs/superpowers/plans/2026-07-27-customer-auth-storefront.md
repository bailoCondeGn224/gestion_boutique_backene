# Customer Authentication Storefront Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement complete customer authentication system for online storefront with login/register, protected routes, order tracking, and automatic notifications.

**Architecture:** Context API for auth state management (consistent with existing codebase), React Query for server data, JWT tokens in localStorage with dual-token interceptor (admin/customer), mobile-first UI components.

**Tech Stack:** React 18 + TypeScript + Vite, Shadcn UI, Context API, React Query, React Router v6, NestJS backend (existing), JWT authentication

## Global Constraints

- **Mobile-first:** All components optimized for mobile (storefront = mobile)
- **Token séparé:** Customer token (`customer_token`) distinct from admin token (`access_token`)
- **Context API only:** No Zustand, use existing pattern
- **Backend endpoints:** Use existing `/public/auth/*` endpoints
- **Phone as identifier:** Phone number must be unique (9-15 digits: `/^[0-9]{9,15}$/`)
- **Password min 6 chars:** Frontend and backend validation
- **No OAuth V1:** Google/Facebook login reserved for future version
- **Dual-token interceptor:** Handle both admin and customer tokens in same axios instance
- **Auto notifications:** Backend sends notifications to authenticated customers

---

## File Structure

### Frontend Files to Create

```
src/api/customer-auth.ts                           # API client for customer auth
src/components/storefront/CustomerAuthModal.tsx    # Login/Register modal with tabs
src/components/storefront/CustomerAccountMenu.tsx  # Dropdown menu when authenticated
src/pages/storefront/StorefrontOrders.tsx          # Customer orders list page
src/pages/storefront/StorefrontOrderDetail.tsx     # Single order detail page
src/pages/storefront/StorefrontProfile.tsx         # Customer profile edit page
src/components/customer/CustomerProtectedRoute.tsx # Route guard for customer routes
```

### Frontend Files to Modify

```
src/lib/api-client.ts                              # Update interceptor for dual tokens
src/components/storefront/StorefrontHeader.tsx     # Replace Menu button with Account button
src/components/storefront/CartDrawer.tsx           # Add auth check before checkout
src/App.tsx                                        # Add new customer routes
```

### Backend Files to Modify

```
src/online-orders/online-orders.service.ts         # Extract customerAccountId from JWT
src/online-orders/online-orders-public.controller.ts # Add my-orders endpoint
src/customer-auth/guards/customer-jwt-auth.guard.ts  # May need to create if missing
src/customer-auth/decorators/current-customer.decorator.ts # May need to create
```

---

## Task 1: Create Customer Auth API Client

**Files:**
- Create: `C:\Users\Bailo conde\Documents\projects\Gestion _boutique _walli_indistrie\react-design-studio\src\api\customer-auth.ts`

**Interfaces:**
- Consumes: `apiClient` from `src/lib/api-client.ts`
- Produces: `customerAuthApi` object with methods: `register()`, `login()`, `getProfile()`, `updateProfile()`

- [ ] **Step 1: Create the customer-auth.ts file with TypeScript interfaces**

```typescript
// src/api/customer-auth.ts
import { apiClient } from '@/lib/api-client';

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

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npm run type-check` (from react-design-studio)
Expected: No errors in customer-auth.ts

- [ ] **Step 3: Commit**

```bash
git add src/api/customer-auth.ts
git commit -m "feat(api): add customer auth API client

- Define TypeScript interfaces for customer auth
- Implement register, login, getProfile, updateProfile methods
- Use existing apiClient from lib/api-client.ts

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Update axios interceptor for dual tokens

**Files:**
- Modify: `C:\Users\Bailo conde\Documents\projects\Gestion _boutique _walli_indistrie\react-design-studio\src\lib\api-client.ts:14-39`

**Interfaces:**
- Consumes: Nothing (modifies existing interceptor)
- Produces: Updated `apiClient` that handles both `access_token` and `customer_token`

- [ ] **Step 1: Read current api-client.ts to understand structure**

Read: `src/lib/api-client.ts`

- [ ] **Step 2: Modify request interceptor to detect route type and use correct token**

Replace lines 14-25 with:

```typescript
// Intercepteur pour ajouter le token JWT
apiClient.interceptors.request.use(
  (config) => {
    // Déterminer quel token utiliser selon la route
    const isCustomerRoute = config.url?.startsWith('/public/auth') ||
                            config.url?.startsWith('/public/orders') ||
                            config.url?.startsWith('/public/stores');

    const token = isCustomerRoute
      ? localStorage.getItem('customer_token')
      : localStorage.getItem('access_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
```

- [ ] **Step 3: Modify response interceptor to handle 401 differently for customer routes**

Replace lines 28-39 with:

```typescript
// Intercepteur pour gérer les erreurs
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isCustomerRoute = error.config?.url?.startsWith('/public/auth') ||
                              error.config?.url?.startsWith('/public/orders') ||
                              error.config?.url?.startsWith('/public/stores');

      if (isCustomerRoute) {
        // Client token expiré
        localStorage.removeItem('customer_token');
        localStorage.removeItem('customer_data');
        // Déclencher événement pour ouvrir CustomerAuthModal
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

- [ ] **Step 4: Test that existing admin routes still work**

Run dev server and login as admin, verify dashboard loads
Expected: Admin routes use `access_token`, dashboard displays correctly

- [ ] **Step 5: Commit**

```bash
git add src/lib/api-client.ts
git commit -m "feat(api): add dual-token interceptor for admin and customer auth

- Request interceptor detects route type and uses correct token
- Customer routes use customer_token from localStorage
- Admin routes use access_token from localStorage
- Response interceptor handles 401 differently per route type
- Customer 401: dispatch custom event, no redirect
- Admin 401: redirect to /login as before

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Create CustomerAuthModal component

**Files:**
- Create: `C:\Users\Bailo conde\Documents\projects\Gestion _boutique _walli_indistrie\react-design-studio\src\components\storefront\CustomerAuthModal.tsx`

**Interfaces:**
- Consumes: `customerAuthApi` from `src/api/customer-auth.ts`, `useCustomerAuth()` from `src/contexts/CustomerAuthContext.tsx`
- Produces: `CustomerAuthModal` component with props: `{ open, onOpenChange, defaultTab? }`

- [ ] **Step 1: Create the component file with tab structure**

```typescript
// src/components/storefront/CustomerAuthModal.tsx
import { useState } from 'react';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CustomerAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'login' | 'register';
}

export const CustomerAuthModal = ({
  open,
  onOpenChange,
  defaultTab = 'login'
}: CustomerAuthModalProps) => {
  const { login, register, isLoading } = useCustomerAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(defaultTab);

  // Login form state
  const [loginData, setLoginData] = useState({ telephone: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // Register form state
  const [registerData, setRegisterData] = useState({
    nom: '',
    telephone: '',
    email: '',
    password: '',
  });
  const [registerError, setRegisterError] = useState('');

  const validatePhone = (phone: string): string | null => {
    if (!phone) return 'Le téléphone est requis';
    if (!/^[0-9]{9,15}$/.test(phone)) return 'Le numéro doit contenir entre 9 et 15 chiffres';
    return null;
  };

  const validateEmail = (email: string): string | null => {
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Format d\'email invalide';
    return null;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const phoneError = validatePhone(loginData.telephone);
    if (phoneError) {
      setLoginError(phoneError);
      return;
    }

    if (!loginData.password) {
      setLoginError('Le mot de passe est requis');
      return;
    }

    try {
      await login({
        telephone: loginData.telephone,
        password: loginData.password,
      });
      toast.success('Connexion réussie !');
      onOpenChange(false);
      setLoginData({ telephone: '', password: '' });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erreur de connexion';
      if (error.response?.status === 401) {
        setLoginError('Téléphone ou mot de passe incorrect');
      } else if (error.response?.status === 404) {
        setLoginError('Aucun compte trouvé avec ce numéro');
      } else {
        setLoginError(message);
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');

    if (!registerData.nom.trim()) {
      setRegisterError('Le nom est requis');
      return;
    }

    const phoneError = validatePhone(registerData.telephone);
    if (phoneError) {
      setRegisterError(phoneError);
      return;
    }

    const emailError = validateEmail(registerData.email);
    if (emailError) {
      setRegisterError(emailError);
      return;
    }

    if (!registerData.password) {
      setRegisterError('Le mot de passe est requis');
      return;
    }

    if (registerData.password.length < 6) {
      setRegisterError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      await register({
        nom: registerData.nom,
        telephone: registerData.telephone,
        email: registerData.email || undefined,
        password: registerData.password,
      });
      toast.success(`Compte créé avec succès ! Bienvenue ${registerData.nom} !`);
      onOpenChange(false);
      setRegisterData({ nom: '', telephone: '', email: '', password: '' });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erreur lors de la création du compte';
      if (error.response?.status === 409) {
        setRegisterError('Ce numéro est déjà enregistré. Connectez-vous ou utilisez un autre numéro');
      } else {
        setRegisterError(message);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mon compte</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'register')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Connexion</TabsTrigger>
            <TabsTrigger value="register">Créer un compte</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="login-phone">Téléphone</Label>
                <Input
                  id="login-phone"
                  type="tel"
                  placeholder="624123456"
                  value={loginData.telephone}
                  onChange={(e) => setLoginData({ ...loginData, telephone: e.target.value })}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Mot de passe</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  disabled={isLoading}
                  required
                />
              </div>

              {loginError && (
                <p className="text-sm text-destructive">{loginError}</p>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  'Se connecter'
                )}
              </Button>

              <p className="text-sm text-center text-muted-foreground">
                Pas de compte ?{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className="text-primary hover:underline"
                >
                  Créez-en un
                </button>
              </p>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="register-nom">Nom complet</Label>
                <Input
                  id="register-nom"
                  type="text"
                  placeholder="Mamadou Diallo"
                  value={registerData.nom}
                  onChange={(e) => setRegisterData({ ...registerData, nom: e.target.value })}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-phone">Téléphone</Label>
                <Input
                  id="register-phone"
                  type="tel"
                  placeholder="624123456"
                  value={registerData.telephone}
                  onChange={(e) => setRegisterData({ ...registerData, telephone: e.target.value })}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-email">Email (optionnel)</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="exemple@email.com"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-password">Mot de passe</Label>
                <Input
                  id="register-password"
                  type="password"
                  placeholder="Minimum 6 caractères"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  disabled={isLoading}
                  required
                />
              </div>

              {registerError && (
                <p className="text-sm text-destructive">{registerError}</p>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  'Créer mon compte'
                )}
              </Button>

              <p className="text-sm text-center text-muted-foreground">
                Déjà un compte ?{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="text-primary hover:underline"
                >
                  Connectez-vous
                </button>
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] **Step 2: Test the component manually in browser**

Run dev server, open any storefront page, manually import and render CustomerAuthModal
Expected: Modal displays with login/register tabs, forms work, validation shows errors

- [ ] **Step 3: Commit**

```bash
git add src/components/storefront/CustomerAuthModal.tsx
git commit -m "feat(storefront): add customer auth modal with login/register tabs

- Implement login form with phone and password
- Implement register form with name, phone, email, password
- Frontend validation for phone (9-15 digits) and email format
- Password minimum 6 characters validation
- Loading states with disabled inputs and spinner
- Error messages displayed under forms
- Tab switching between login and register
- Toast notifications on success

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Create CustomerAccountMenu component

**Files:**
- Create: `C:\Users\Bailo conde\Documents\projects\Gestion _boutique _walli_indistrie\react-design-studio\src\components\storefront\CustomerAccountMenu.tsx`

**Interfaces:**
- Consumes: `useCustomerAuth()` from `src/contexts/CustomerAuthContext.tsx`, `useCartContext()` from `src/contexts/CartContext.tsx`, `StoreFront` type from `src/types`
- Produces: `CustomerAccountMenu` component with props: `{ open, onOpenChange, storefront }`

- [ ] **Step 1: Create the component file with dropdown structure**

```typescript
// src/components/storefront/CustomerAccountMenu.tsx
import { useNavigate, useParams } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useCartContext } from '@/contexts/CartContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Package,
  Clock,
  MapPin,
  Truck,
  Phone,
  LogOut
} from 'lucide-react';
import { toast } from 'sonner';
import { StoreFront } from '@/types';

interface CustomerAccountMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storefront: StoreFront;
}

const formatPrix = (prix: number) => {
  return new Intl.NumberFormat('fr-GN', { style: 'decimal' }).format(prix) + ' GNF';
};

export const CustomerAccountMenu = ({
  open,
  onOpenChange,
  storefront
}: CustomerAccountMenuProps) => {
  const { customer, logout } = useCustomerAuth();
  const { clear } = useCartContext();
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  const handleLogout = () => {
    // Vider le panier pour éviter confusion entre comptes
    clear();
    // Déconnecter
    logout();
    // Toast
    toast.info('Déconnexion réussie');
    // Fermer le menu
    onOpenChange(false);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  if (!customer) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px]">
        <SheetHeader className="pb-4">
          <SheetTitle>Mon compte</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* User Info */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{customer.nom}</p>
              <p className="text-sm text-muted-foreground truncate">{customer.telephone}</p>
            </div>
          </div>

          <Separator />

          {/* Menu Options */}
          <div className="space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleNavigation(`/storefront/${slug}/orders`)}
            >
              <Package className="mr-2 h-4 w-4" />
              Mes commandes
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleNavigation(`/storefront/${slug}/profile`)}
            >
              <User className="mr-2 h-4 w-4" />
              Mon profil
            </Button>
          </div>

          <Separator />

          {/* Store Info */}
          <div>
            <p className="text-sm font-medium mb-2 text-muted-foreground">Infos boutique</p>
            <div className="space-y-2">
              {storefront.horaires && (
                <div className="flex items-start gap-2 text-sm">
                  <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Horaires</p>
                    <p className="text-muted-foreground">{storefront.horaires}</p>
                  </div>
                </div>
              )}

              {storefront.adresse && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Adresse</p>
                    <p className="text-muted-foreground">{storefront.adresse}</p>
                  </div>
                </div>
              )}

              {storefront.fraisLivraison !== undefined && (
                <div className="flex items-start gap-2 text-sm">
                  <Truck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Frais de livraison</p>
                    <p className="text-muted-foreground">
                      {storefront.fraisLivraison === 0 ? 'Gratuit' : formatPrix(storefront.fraisLivraison)}
                    </p>
                  </div>
                </div>
              )}

              {storefront.whatsappNumber && (
                <Button
                  variant="default"
                  className="w-full gap-2 mt-2"
                  onClick={() => window.open(`https://wa.me/${storefront.whatsappNumber}`, '_blank')}
                >
                  <Phone className="w-4 h-4" />
                  Nous contacter
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Logout */}
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Déconnexion
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
```

- [ ] **Step 2: Test the component manually**

Render CustomerAccountMenu with mock customer and storefront data
Expected: Menu displays user info, navigation buttons, store info, logout button works

- [ ] **Step 3: Commit**

```bash
git add src/components/storefront/CustomerAccountMenu.tsx
git commit -m "feat(storefront): add customer account menu dropdown

- Display customer name and phone at top
- Navigation to Mes commandes and Mon profil
- Show store info (hours, address, delivery fee, WhatsApp)
- Logout button clears cart and logs out user
- Sheet component slides from left
- Mobile-optimized layout

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Update StorefrontHeader to use Account button

**Files:**
- Modify: `C:\Users\Bailo conde\Documents\projects\Gestion _boutique _walli_indistrie\react-design-studio\src\components\storefront\StorefrontHeader.tsx`

**Interfaces:**
- Consumes: `CustomerAuthModal` and `CustomerAccountMenu` components, `useCustomerAuth()` hook
- Produces: Updated `StorefrontHeader` with Account button instead of Menu button

- [ ] **Step 1: Read current StorefrontHeader to understand structure**

Read: `src/components/storefront/StorefrontHeader.tsx`

- [ ] **Step 2: Add imports for new components and hooks**

Add after existing imports:

```typescript
import { useState } from 'react';
import { User } from 'lucide-react';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { CustomerAuthModal } from './CustomerAuthModal';
import { CustomerAccountMenu } from './CustomerAccountMenu';
```

- [ ] **Step 3: Replace the Menu button and Sheet with Account button logic**

Replace lines 21-88 (the entire Menu Sheet section) with:

```typescript
const { isAuthenticated } = useCustomerAuth();
const [authModalOpen, setAuthModalOpen] = useState(false);
const [accountMenuOpen, setAccountMenuOpen] = useState(false);

// ...existing code for header div...

{/* Account Button */}
<Button
  variant="ghost"
  size="icon"
  className="h-10 w-10"
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

{/* Modals/Menus */}
<CustomerAuthModal
  open={authModalOpen}
  onOpenChange={setAuthModalOpen}
/>

<CustomerAccountMenu
  open={accountMenuOpen}
  onOpenChange={setAccountMenuOpen}
  storefront={storefront}
/>
```

- [ ] **Step 4: Test in browser**

Run dev server, navigate to storefront
Expected:
- Not authenticated: Clicking Account button opens CustomerAuthModal
- After login: Clicking Account button opens CustomerAccountMenu
- Menu with store info is gone, now inside CustomerAccountMenu

- [ ] **Step 5: Commit**

```bash
git add src/components/storefront/StorefrontHeader.tsx
git commit -m "feat(storefront): replace menu button with account button in header

- Remove old menu Sheet with store info
- Add Account button (User icon) that detects auth state
- If not authenticated: opens CustomerAuthModal
- If authenticated: opens CustomerAccountMenu
- Store info now in CustomerAccountMenu instead of separate Sheet
- Mobile-first design maintained

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Update CartDrawer to require authentication before checkout

**Files:**
- Modify: `C:\Users\Bailo conde\Documents\projects\Gestion _boutique _walli_indistrie\react-design-studio\src\components\storefront\CartDrawer.tsx`

**Interfaces:**
- Consumes: `useCustomerAuth()` hook, `CustomerAuthModal` component
- Produces: Updated CartDrawer that shows auth modal before checkout form

- [ ] **Step 1: Read current CartDrawer to understand checkout flow**

Read: `src/components/storefront/CartDrawer.tsx:155-225`

- [ ] **Step 2: Add imports**

Add to imports section:

```typescript
import { User } from 'lucide-react';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { CustomerAuthModal } from './CustomerAuthModal';
```

- [ ] **Step 3: Add state for auth modal in the component**

Add after existing useState declarations (around line 60):

```typescript
const { isAuthenticated, customer } = useCustomerAuth();
const [authModalOpen, setAuthModalOpen] = useState(false);
```

- [ ] **Step 4: Modify the checkout step to check authentication**

Find the section where `step === 'checkout'` is rendered (around line 240-330), replace with:

```typescript
{/* Checkout step */}
{step === 'checkout' && (
  <>
    {!isAuthenticated ? (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <User className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="font-semibold text-lg mb-2">Connexion requise</h3>
        <p className="text-sm text-gray-600 text-center mb-4">
          Créez un compte ou connectez-vous pour passer commande et suivre vos livraisons
        </p>
        <Button onClick={() => setAuthModalOpen(true)} className="w-full max-w-xs">
          Se connecter / Créer un compte
        </Button>

        <CustomerAuthModal
          open={authModalOpen}
          onOpenChange={setAuthModalOpen}
        />
      </div>
    ) : (
      <form onSubmit={handleSubmitOrder} className="flex-1 flex flex-col">
        {/* Existing checkout form - keep all existing code */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="space-y-4">
            {/* Nom complet */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nom complet</label>
              <input
                type="text"
                className="w-full h-10 px-3 bg-gray-100 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                value={formData.nomClient}
                onChange={(e) => setFormData({ ...formData, nomClient: e.target.value })}
                required
              />
            </div>

            {/* Téléphone */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Téléphone</label>
              <input
                type="tel"
                className="w-full h-10 px-3 bg-gray-100 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                value={formData.telephone}
                onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                required
              />
            </div>

            {/* Adresse de livraison */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Adresse de livraison</label>
              <textarea
                className="w-full min-h-[80px] px-3 py-2 bg-gray-100 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all resize-none"
                value={formData.adresseLivraison}
                onChange={(e) => setFormData({ ...formData, adresseLivraison: e.target.value })}
                placeholder="Quartier, rue, point de repère..."
              />
            </div>

            {/* Notes (optionnel) */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes (optionnel)</label>
              <textarea
                className="w-full min-h-[60px] px-3 py-2 bg-gray-100 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all resize-none"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Instructions spéciales..."
              />
            </div>
          </div>
        </div>

        {/* Bottom summary and submit */}
        <div className="border-t bg-white p-4 space-y-3 flex-shrink-0">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Sous-total</span>
              <span className="font-medium">{formatPrix(subtotal)}</span>
            </div>
            {fraisLivraison > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Livraison</span>
                <span className="font-medium">{formatPrix(fraisLivraison)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold pt-2 border-t">
              <span>Total</span>
              <span className="text-primary text-xl">{formatPrix(total)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 flex items-center justify-center gap-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/95 active:scale-[0.98] transition-all shadow-md disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Envoi en cours...
              </>
            ) : (
              'Confirmer la commande'
            )}
          </button>
        </div>
      </form>
    )}
  </>
)}
```

- [ ] **Step 5: Pre-fill form with customer data when authenticated**

Modify the initial formData state (around line 55):

```typescript
const { customer, isAuthenticated } = useCustomerAuth();

const [formData, setFormData] = useState({
  nomClient: customer?.nom || '',
  telephone: customer?.telephone || '',
  adresseLivraison: '',
  notes: '',
});

// Update formData when customer changes
useEffect(() => {
  if (customer) {
    setFormData(prev => ({
      ...prev,
      nomClient: customer.nom,
      telephone: customer.telephone,
    }));
  }
}, [customer]);
```

- [ ] **Step 6: Test the flow**

Run dev server, add items to cart, click Commander
Expected:
- Not authenticated: Shows auth required message + modal
- After login: Shows form pre-filled with customer name and phone
- Form submission works as before

- [ ] **Step 7: Commit**

```bash
git add src/components/storefront/CartDrawer.tsx
git commit -m "feat(cart): require authentication before checkout

- Check isAuthenticated when user clicks Commander
- Show auth required message if not logged in
- Display CustomerAuthModal to login/register
- Pre-fill checkout form with customer name and phone
- After auth, automatically show form with pre-filled data
- Maintain existing order submission logic

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Create CustomerProtectedRoute guard

**Files:**
- Create: `C:\Users\Bailo conde\Documents\projects\Gestion _boutique _walli_indistrie\react-design-studio\src\components\customer\CustomerProtectedRoute.tsx`

**Interfaces:**
- Consumes: `useCustomerAuth()` hook
- Produces: `CustomerProtectedRoute` wrapper component that redirects if not authenticated

- [ ] **Step 1: Create the guard component**

```typescript
// src/components/customer/CustomerProtectedRoute.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { CustomerAuthModal } from '@/components/storefront/CustomerAuthModal';

interface CustomerProtectedRouteProps {
  children: React.ReactNode;
}

export const CustomerProtectedRoute = ({ children }: CustomerProtectedRouteProps) => {
  const { isAuthenticated } = useCustomerAuth();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      // Rediriger vers home de la vitrine
      navigate(`/storefront/${slug}`);
      // Ouvrir modal d'authentification
      setAuthModalOpen(true);
    }
  }, [isAuthenticated, slug, navigate]);

  if (!isAuthenticated) {
    return (
      <CustomerAuthModal
        open={authModalOpen}
        onOpenChange={(open) => {
          setAuthModalOpen(open);
          if (!open) {
            // Si l'utilisateur ferme la modal sans se connecter, rester sur la home
            navigate(`/storefront/${slug}`);
          }
        }}
      />
    );
  }

  return <>{children}</>;
};
```

- [ ] **Step 2: Test the guard manually**

Try to navigate to a protected route without being authenticated
Expected: Redirects to storefront home and opens CustomerAuthModal

- [ ] **Step 3: Commit**

```bash
git add src/components/customer/CustomerProtectedRoute.tsx
git commit -m "feat(customer): add route guard for protected customer pages

- Check isAuthenticated before rendering children
- Redirect to storefront home if not authenticated
- Open CustomerAuthModal automatically
- If modal closed without login, stay on home page
- Wrapper component for protecting customer routes

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Create StorefrontOrders page

**Files:**
- Create: `C:\Users\Bailo conde\Documents\projects\Gestion _boutique _walli_indistrie\react-design-studio\src\pages\storefront\StorefrontOrders.tsx`

**Interfaces:**
- Consumes: `GET /public/orders/my-orders` endpoint, `StorefrontLayout` component
- Produces: `StorefrontOrders` page component showing list of customer orders

- [ ] **Step 1: Create the page component**

```typescript
// src/pages/storefront/StorefrontOrders.tsx
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { StorefrontLayout } from '@/components/storefront/StorefrontLayout';
import { apiClient } from '@/lib/api-client';
import { Loader2, Package, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const formatPrix = (prix: number) => {
  return new Intl.NumberFormat('fr-GN', { style: 'decimal' }).format(prix) + ' GNF';
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const getStatutBadge = (statut: string) => {
  const styles = {
    EN_ATTENTE: 'bg-yellow-100 text-yellow-800',
    CONFIRMEE: 'bg-blue-100 text-blue-800',
    PRETE: 'bg-green-100 text-green-800',
    LIVREE: 'bg-green-600 text-white',
    ANNULEE: 'bg-red-100 text-red-800',
  };

  const labels = {
    EN_ATTENTE: 'En attente',
    CONFIRMEE: 'Confirmée',
    PRETE: 'Prête',
    LIVREE: 'Livrée',
    ANNULEE: 'Annulée',
  };

  return {
    className: styles[statut as keyof typeof styles] || styles.EN_ATTENTE,
    label: labels[statut as keyof typeof labels] || statut,
  };
};

const StorefrontOrders = () => {
  const { slug } = useParams<{ slug: string }>();
  const { customer } = useCustomerAuth();
  const navigate = useNavigate();

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['customer-orders', customer?.id],
    queryFn: () => apiClient.get('/public/orders/my-orders').then(res => res.data),
    enabled: !!customer,
  });

  const orders = ordersData?.data || [];

  if (isLoading) {
    return (
      <StorefrontLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </StorefrontLayout>
    );
  }

  return (
    <StorefrontLayout>
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <h1 className="text-xl font-bold">Mes commandes</h1>
          <p className="text-sm text-gray-600 mt-1">
            {orders.length} {orders.length > 1 ? 'commandes' : 'commande'}
          </p>
        </div>

        {/* Orders List */}
        <div className="p-4 space-y-3">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Package className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="font-semibold text-lg mb-2">Aucune commande</h3>
              <p className="text-sm text-gray-600 text-center mb-4">
                Vous n'avez pas encore passé de commande
              </p>
              <Button onClick={() => navigate(`/storefront/${slug}`)}>
                Découvrir les produits
              </Button>
            </div>
          ) : (
            orders.map((order: any) => {
              const badge = getStatutBadge(order.statut);
              return (
                <div
                  key={order.id}
                  onClick={() => navigate(`/storefront/${slug}/orders/${order.id}`)}
                  className="bg-white rounded-lg border border-gray-200 p-4 active:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="h-4 w-4 text-gray-400 shrink-0" />
                        <p className="font-semibold text-sm truncate">
                          Commande {order.numero}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                    <span className="font-bold text-sm">
                      {formatPrix(order.total)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </StorefrontLayout>
  );
};

export default StorefrontOrders;
```

- [ ] **Step 2: Test the page manually**

Navigate to the page (will need to add route first in Task 11)
Expected: Shows loading spinner, then list of orders or empty state

- [ ] **Step 3: Commit**

```bash
git add src/pages/storefront/StorefrontOrders.tsx
git commit -m "feat(storefront): add customer orders list page

- Display all customer orders from GET /public/orders/my-orders
- Show order number, date, total, and status badge
- Status badge colors: yellow (en attente), blue (confirmée), green (prête/livrée), red (annulée)
- Empty state with link to products
- Loading state with spinner
- Click order card to navigate to detail page
- Mobile-optimized cards layout

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

Due to character limits, I'll continue with the remaining tasks in the next response. The plan will include:

- Task 9: Create StorefrontOrderDetail page
- Task 10: Create StorefrontProfile page
- Task 11: Update App.tsx with new routes
- Task 12: Backend - Add my-orders endpoint
- Task 13: Backend - Update createFromStorefront to extract customerAccountId
- Task 14: Backend - Create CustomerJwtAuthGuard (if needed)
- Task 15: Backend - Create CurrentCustomer decorator (if needed)
- Task 16: Final testing and verification

Should I continue writing the plan?