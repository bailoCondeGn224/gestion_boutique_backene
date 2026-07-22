# Intégration WhatsApp pour Confirmation de Commande - Plan d'Implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ouvrir automatiquement WhatsApp avec un message pré-rempli contenant les détails de la commande après confirmation par le client sur la vitrine

**Architecture:** Modification frontend uniquement dans CartDrawer.tsx. Utilisation de liens wa.me pour ouvrir WhatsApp avec message formaté. Intégration non-bloquante qui n'affecte pas le flux de commande existant.

**Tech Stack:** React, TypeScript, wa.me links, window.open API

## Global Constraints

- Frontend uniquement - aucune modification backend
- Non bloquant - échec WhatsApp ne doit jamais empêcher création de commande
- Compatible mobile (iOS/Android) et desktop (Chrome/Firefox/Safari)
- Utilise données déjà disponibles (storefront, items, formData)
- Encodage URI pour sécurité (encodeURIComponent)
- Formatage prix avec formatPrix existant (Intl.NumberFormat fr-GN + ' GNF')

---

## File Structure

**Files to Modify:**
1. `react-design-studio/src/components/storefront/CartDrawer.tsx` - Ajout fonctions WhatsApp + intégration dans handleSubmitOrder
2. `react-design-studio/src/components/storefront/StorefrontLayout.tsx` - Passer storefront comme prop à CartDrawer

**No new files created** - Tout dans les fichiers existants

---

### Task 1: Ajouter Fonction de Construction du Message WhatsApp

**Files:**
- Modify: `react-design-studio/src/components/storefront/CartDrawer.tsx:1-25`

**Interfaces:**
- Consumes: `CartItem` type (déjà défini), `formatPrix` function (ligne 23-25)
- Produces: `buildWhatsAppMessage(orderData: OrderData, storeName: string): string`
  - OrderData = { nomClient: string, items: CartItem[], subtotal: number, fraisLivraison: number, total: number, adresseLivraison?: string, telephone: string }

- [ ] **Step 1: Définir le type OrderData**

Ajouter après l'interface `CartDrawerProps` (ligne 21):

```typescript
interface OrderData {
  nomClient: string;
  items: CartItem[];
  subtotal: number;
  fraisLivraison: number;
  total: number;
  adresseLivraison?: string;
  telephone: string;
}
```

- [ ] **Step 2: Créer la fonction buildWhatsAppMessage**

Ajouter après la fonction `formatPrix` (ligne 25):

```typescript
const buildWhatsAppMessage = (orderData: OrderData, storeName: string): string => {
  // Construction de la liste des articles
  const articlesText = orderData.items
    .map(item => `• ${item.nom} x${item.quantity} - ${formatPrix(item.prixUnitaire)}`)
    .join('\n');

  // Construction du message complet
  const message = `
🛍️ Nouvelle Commande Confirmée

Bonjour ${orderData.nomClient}!

Votre commande a été enregistrée avec succès.

📦 Articles commandés:
${articlesText}

💰 Sous-total: ${formatPrix(orderData.subtotal)}
🚚 Frais de livraison: ${formatPrix(orderData.fraisLivraison)}
✅ TOTAL: ${formatPrix(orderData.total)}

📍 Adresse de livraison: ${orderData.adresseLivraison || 'Non spécifiée'}
📞 Téléphone: ${orderData.telephone}

Nous vous contacterons bientôt pour confirmer votre commande.

Merci pour votre confiance! 🙏
${storeName}
  `.trim();

  return encodeURIComponent(message);
};
```

- [ ] **Step 3: Vérifier que le code compile**

Run: `cd "../react-design-studio" && npm run build`
Expected: Build réussit sans erreurs TypeScript

- [ ] **Step 4: Commit**

```bash
git add "../react-design-studio/src/components/storefront/CartDrawer.tsx"
git commit -m "feat(storefront): add WhatsApp message builder function

Add buildWhatsAppMessage function to format order details as WhatsApp message.
Includes items, prices, totals, delivery info with emojis.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Ajouter Fonction d'Ouverture WhatsApp

**Files:**
- Modify: `react-design-studio/src/components/storefront/CartDrawer.tsx` (après buildWhatsAppMessage)

**Interfaces:**
- Consumes: Aucune dépendance sur autres tâches
- Produces: `openWhatsApp(whatsappNumber: string, encodedMessage: string): void`

- [ ] **Step 1: Créer la fonction openWhatsApp**

Ajouter après la fonction `buildWhatsAppMessage`:

```typescript
const openWhatsApp = (whatsappNumber: string, encodedMessage: string): void => {
  // Nettoyer le numéro (enlever espaces, +, tirets, parenthèses, etc.)
  const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '');

  // Construire l'URL wa.me
  const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;

  // Ouvrir dans nouvelle fenêtre
  try {
    window.open(whatsappUrl, '_blank');
  } catch (error) {
    console.error('Erreur lors de l\'ouverture de WhatsApp:', error);
    // Ne pas bloquer le flux si l'ouverture échoue
  }
};
```

- [ ] **Step 2: Vérifier que le code compile**

Run: `cd "../react-design-studio" && npm run build`
Expected: Build réussit sans erreurs TypeScript

- [ ] **Step 3: Commit**

```bash
git add "../react-design-studio/src/components/storefront/CartDrawer.tsx"
git commit -m "feat(storefront): add WhatsApp opener function

Add openWhatsApp function to open wa.me links with error handling.
Cleans phone number and opens WhatsApp in new window/tab.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 3: Passer Storefront comme Prop à CartDrawer

**Files:**
- Modify: `react-design-studio/src/components/storefront/CartDrawer.tsx:12-21` (CartDrawerProps interface)
- Modify: `react-design-studio/src/components/storefront/CartDrawer.tsx:27-35` (destructure props)
- Modify: `react-design-studio/src/components/storefront/StorefrontLayout.tsx:56-65` (pass storefront prop)

**Interfaces:**
- Consumes: `storefront` object from useStorefront hook (déjà chargé dans StorefrontLayout)
- Produces: `storefront` prop available in CartDrawer component

- [ ] **Step 1: Ajouter storefront à l'interface CartDrawerProps**

Modifier l'interface `CartDrawerProps` (ligne 12-21):

```typescript
interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  subtotal: number;
  fraisLivraison: number;
  onRemove: (articleId: string, modeVenteId?: string) => void;
  onUpdateQuantity: (articleId: string, quantity: number, modeVenteId?: string) => void;
  onCheckout: () => void;
  storefront: { nom: string; whatsappNumber?: string };
}
```

- [ ] **Step 2: Destructurer storefront dans les props du composant**

Modifier la ligne 27-35:

```typescript
export const CartDrawer = ({
  open,
  onOpenChange,
  items,
  subtotal,
  fraisLivraison,
  onRemove,
  onUpdateQuantity,
  storefront,
}: CartDrawerProps) => {
```

- [ ] **Step 3: Passer storefront depuis StorefrontLayout**

Dans `StorefrontLayout.tsx`, modifier l'appel à CartDrawer (ligne 56-65):

```typescript
<CartDrawer
  open={isOpen}
  onOpenChange={(open) => !open && closeCart()}
  items={items}
  subtotal={subtotal}
  fraisLivraison={storefront.fraisLivraison}
  onRemove={removeItem}
  onUpdateQuantity={updateQuantity}
  onCheckout={() => {}}
  storefront={storefront}
/>
```

- [ ] **Step 4: Vérifier que le code compile**

Run: `cd "../react-design-studio" && npm run build`
Expected: Build réussit sans erreurs TypeScript

- [ ] **Step 5: Commit**

```bash
git add "../react-design-studio/src/components/storefront/CartDrawer.tsx" "../react-design-studio/src/components/storefront/StorefrontLayout.tsx"
git commit -m "feat(storefront): pass storefront to CartDrawer

Add storefront prop to CartDrawer to access store name and WhatsApp number.
Updated CartDrawerProps interface and StorefrontLayout to pass the prop.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 4: Intégrer WhatsApp dans handleSubmitOrder

**Files:**
- Modify: `react-design-studio/src/components/storefront/CartDrawer.tsx:63-105` (handleSubmitOrder function)

**Interfaces:**
- Consumes:
  - `buildWhatsAppMessage(orderData: OrderData, storeName: string): string` from Task 1
  - `openWhatsApp(whatsappNumber: string, encodedMessage: string): void` from Task 2
  - `storefront` prop from Task 3
- Produces: Intégration WhatsApp complète dans le flux de commande

- [ ] **Step 1: Ajouter l'intégration WhatsApp après clear()**

Modifier la fonction `handleSubmitOrder` en ajoutant le bloc WhatsApp après `clear()` et avant `setStep('success')`.

Localiser cette section (environ ligne 87-92):

```typescript
await apiClient.post(`/public/stores/${slug}/orders`, orderData);

// Vider le panier après succès
clear();

setStep('success');
```

La remplacer par:

```typescript
await apiClient.post(`/public/stores/${slug}/orders`, orderData);

// Vider le panier après succès
clear();

// Intégration WhatsApp
if (storefront?.whatsappNumber) {
  try {
    // Construire le message WhatsApp
    const encodedMessage = buildWhatsAppMessage({
      nomClient: formData.nomClient,
      items: items,
      subtotal: subtotal,
      fraisLivraison: fraisLivraison,
      total: total,
      adresseLivraison: formData.adresseLivraison,
      telephone: formData.telephone
    }, storefront.nom);

    // Ouvrir WhatsApp avec le message
    openWhatsApp(storefront.whatsappNumber, encodedMessage);
  } catch (whatsappError) {
    // Logger l'erreur mais ne pas bloquer le flux
    console.error('Erreur WhatsApp:', whatsappError);
  }
}

setStep('success');
```

- [ ] **Step 2: Vérifier que le code compile**

Run: `cd "../react-design-studio" && npm run build`
Expected: Build réussit sans erreurs TypeScript

- [ ] **Step 3: Test manuel - Commande avec numéro WhatsApp**

1. Démarrer le dev server: `cd "../react-design-studio" && npm run dev`
2. Ouvrir la vitrine dans le navigateur
3. Ajouter des articles au panier
4. Remplir le formulaire de commande (nom, téléphone)
5. Confirmer la commande
6. Vérifier que:
   - La commande est créée
   - Le panier est vidé
   - Une nouvelle fenêtre WhatsApp s'ouvre
   - Le message contient les bons détails
   - L'écran de succès s'affiche

Expected: Toutes les vérifications passent

- [ ] **Step 4: Test manuel - Commande sans numéro WhatsApp**

1. Configurer une boutique sans whatsappNumber (ou le mettre à null/undefined)
2. Passer une commande
3. Vérifier que:
   - La commande est créée normalement
   - Le panier est vidé
   - WhatsApp ne s'ouvre PAS
   - Aucune erreur visible à l'utilisateur
   - L'écran de succès s'affiche

Expected: Toutes les vérifications passent, pas d'erreur

- [ ] **Step 5: Vérifier la console pour erreurs**

Run: Ouvrir DevTools console
Expected: Aucune erreur JavaScript (sauf éventuellement "Erreur WhatsApp" si bloqueur de popups actif, ce qui est acceptable)

- [ ] **Step 6: Commit**

```bash
git add "../react-design-studio/src/components/storefront/CartDrawer.tsx"
git commit -m "feat(storefront): integrate WhatsApp auto-open on order confirmation

After successful order creation, automatically open WhatsApp with pre-filled
message containing order details if store has WhatsApp number configured.

Features:
- Non-blocking integration (errors don't prevent order)
- Formatted message with emojis and order details
- Works on mobile (opens app) and desktop (opens web)
- Skips gracefully if no WhatsApp number

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 5: Tests Cross-Browser et Documentation

**Files:**
- Create: `react-design-studio/docs/WHATSAPP_INTEGRATION.md`

**Interfaces:**
- Consumes: Implémentation complète des Tasks 1-4
- Produces: Documentation et validation cross-browser

- [ ] **Step 1: Test Mobile iOS Safari**

Sur iPhone:
1. Ouvrir la vitrine en ligne
2. Passer une commande
3. Vérifier que l'app WhatsApp s'ouvre
4. Vérifier que le message est bien formaté (emojis, sauts de ligne)
5. Vérifier que le destinataire est correct
6. Vérifier qu'on peut envoyer le message

Expected: Tout fonctionne correctement

- [ ] **Step 2: Test Mobile Android Chrome**

Sur Android:
1. Ouvrir la vitrine en ligne
2. Passer une commande
3. Vérifier que l'app WhatsApp s'ouvre
4. Vérifier que le message est bien formaté
5. Vérifier que le destinataire est correct

Expected: Tout fonctionne correctement

- [ ] **Step 3: Test Desktop Chrome**

Sur ordinateur Chrome:
1. Ouvrir la vitrine en ligne
2. Passer une commande
3. Vérifier que WhatsApp Web s'ouvre dans nouvel onglet
4. Vérifier le formatage du message
5. Tester avec bloqueur de popups activé
6. Vérifier que la commande se crée quand même

Expected: Fonctionne correctement, gère le bloqueur de popups

- [ ] **Step 4: Test Desktop Firefox**

Sur Firefox:
1. Passer une commande
2. Vérifier que WhatsApp Web s'ouvre
3. Vérifier le formatage

Expected: Fonctionne correctement

- [ ] **Step 5: Créer la documentation**

Créer le fichier `react-design-studio/docs/WHATSAPP_INTEGRATION.md`:

```markdown
# Intégration WhatsApp - Confirmation de Commande

## Fonctionnalité

Lorsqu'un client confirme une commande sur la vitrine en ligne, WhatsApp s'ouvre automatiquement avec un message pré-rempli contenant:
- Numéro et détails de commande
- Liste des articles avec quantités et prix
- Sous-total, frais de livraison, total
- Adresse et téléphone de livraison
- Message de confirmation professionnel

## Configuration

Pour activer cette fonctionnalité:
1. Configurer le numéro WhatsApp de la boutique dans le backoffice
2. Le numéro doit être au format international (ex: 224621234567)
3. Sauvegarder

Si aucun numéro WhatsApp n'est configuré, la fonctionnalité est simplement ignorée.

## Fonctionnement Technique

### URL Format
```
https://wa.me/{phoneNumber}?text={encodedMessage}
```

### Comportement
- **Mobile**: Ouvre l'application WhatsApp installée
- **Desktop**: Ouvre WhatsApp Web dans un nouvel onglet
- **Bloqueur de popups**: La commande est créée normalement, mais WhatsApp peut ne pas s'ouvrir

### Non-bloquant
Cette fonctionnalité est conçue pour être **non-bloquante**:
- Si le numéro WhatsApp n'est pas configuré → skip silencieusement
- Si window.open() échoue (bloqueur) → erreur loggée, commande créée
- Si erreur de construction du message → erreur loggée, commande créée

La création de commande n'est JAMAIS empêchée par un problème WhatsApp.

## Format du Message

Template utilisé:
```
🛍️ Nouvelle Commande Confirmée

Bonjour {nomClient}!

Votre commande a été enregistrée avec succès.

📦 Articles commandés:
• {article} x{qty} - {prix} GNF
...

💰 Sous-total: {subtotal} GNF
🚚 Frais de livraison: {frais} GNF
✅ TOTAL: {total} GNF

📍 Adresse de livraison: {adresse}
📞 Téléphone: {tel}

Nous vous contacterons bientôt pour confirmer votre commande.

Merci pour votre confiance! 🙏
{nomBoutique}
```

## Code Source

Fichiers modifiés:
- `src/components/storefront/CartDrawer.tsx` - Fonctions et intégration
- `src/components/storefront/StorefrontLayout.tsx` - Passage du prop storefront

Fonctions principales:
- `buildWhatsAppMessage()` - Construit le message formaté
- `openWhatsApp()` - Ouvre l'URL wa.me
- Intégration dans `handleSubmitOrder()` après création de commande

## Tests

### Tests Manuels Recommandés

1. **Commande normale avec WhatsApp**
   - Passer commande
   - Vérifier ouverture WhatsApp
   - Vérifier formatage message
   - Vérifier destinataire correct

2. **Commande sans numéro WhatsApp**
   - Désactiver le numéro dans config
   - Passer commande
   - Vérifier que tout fonctionne sans WhatsApp

3. **Avec bloqueur de popups**
   - Activer bloqueur
   - Passer commande
   - Vérifier que commande est créée

4. **Différents navigateurs**
   - iOS Safari
   - Android Chrome
   - Desktop Chrome/Firefox/Safari

### Résultats Attendus

Tous les tests doivent passer avec:
- Commande créée en base de données
- Panier vidé
- Écran de succès affiché
- WhatsApp ouvert (si numéro configuré et pas de bloqueur)

## Compatibilité Navigateurs

| Navigateur | Version | Support |
|------------|---------|---------|
| iOS Safari | 11+ | ✅ |
| Android Chrome | 60+ | ✅ |
| Desktop Chrome | 60+ | ✅ |
| Desktop Firefox | 60+ | ✅ |
| Desktop Safari | 11+ | ✅ |

## Sécurité

- Numéro WhatsApp nettoyé avec regex (enlève caractères non-numériques)
- Message encodé avec `encodeURIComponent()` (prévention XSS)
- Données utilisateur déjà validées côté backend

## Limitations Connues

- Pas d'images dans le message (limitation wa.me)
- Dépend du numéro WhatsApp configuré
- Peut être bloqué par bloqueurs de popups (non bloquant pour commande)

## Support

Pour toute question ou problème, consulter:
- Spec: `docs/superpowers/specs/2026-07-22-whatsapp-integration-design.md`
- Plan: `docs/superpowers/plans/2026-07-22-whatsapp-integration.md`
```

- [ ] **Step 6: Vérifier le build final**

Run: `cd "../react-design-studio" && npm run build`
Expected: Build réussit sans warnings ni erreurs

- [ ] **Step 7: Commit final**

```bash
git add "../react-design-studio/docs/WHATSAPP_INTEGRATION.md"
git commit -m "docs: add WhatsApp integration documentation

Add comprehensive documentation for WhatsApp auto-open feature including:
- Functionality description
- Configuration steps
- Technical implementation details
- Test scenarios and results
- Browser compatibility matrix
- Known limitations

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Self-Review Checklist

**Spec Coverage:**
- ✅ Fonction de construction du message (Task 1)
- ✅ Fonction d'ouverture WhatsApp (Task 2)
- ✅ Passage du storefront comme prop (Task 3)
- ✅ Intégration dans handleSubmitOrder (Task 4)
- ✅ Gestion d'erreurs non-bloquante (Task 4)
- ✅ Tests cross-browser (Task 5)
- ✅ Documentation (Task 5)

**Placeholders:**
- ✅ Aucun TBD ou TODO
- ✅ Code complet dans chaque step
- ✅ Commandes exactes avec output attendu

**Type Consistency:**
- ✅ `OrderData` interface définie et utilisée
- ✅ `buildWhatsAppMessage` retourne `string`
- ✅ `openWhatsApp` retourne `void`
- ✅ `storefront` prop typé avec `nom` et `whatsappNumber?`

**Complete:**
- ✅ Tous les fichiers identifiés
- ✅ Toutes les modifications documentées
- ✅ Tests manuels inclus
- ✅ Documentation créée
