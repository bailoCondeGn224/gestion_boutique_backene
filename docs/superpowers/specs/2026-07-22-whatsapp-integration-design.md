# Intégration WhatsApp pour Confirmation de Commande

## Objectif

Permettre l'ouverture automatique de WhatsApp avec un message pré-rempli contenant les détails de la commande après qu'un client confirme sa commande sur la vitrine en ligne.

## Contexte

Actuellement, lorsqu'un client passe une commande sur la vitrine publique (storefront), il reçoit simplement une confirmation visuelle à l'écran. Pour améliorer la communication et faciliter le suivi, nous voulons que le client puisse immédiatement envoyer les détails de sa commande à la boutique via WhatsApp.

Les clients ont déjà vu les images des produits sur la vitrine avant de commander, donc seuls les détails textuels (noms, quantités, prix) sont nécessaires dans le message WhatsApp.

## Solution Technique

### Approche

Utilisation des liens `wa.me` pour ouvrir WhatsApp automatiquement avec un message pré-rempli. Cette approche:
- Ne nécessite pas WhatsApp Business API (gratuit)
- Fonctionne sur mobile (ouvre l'app) et desktop (ouvre WhatsApp Web)
- Permet de pré-remplir le message texte
- Requiert uniquement du code frontend

### Architecture

**Modification Frontend Uniquement**
- Fichier: `react-design-studio/src/components/storefront/CartDrawer.tsx`
- Aucune modification backend nécessaire
- Utilisation de données déjà disponibles (storefront, commande, items)

### Flux de Données

```
1. Client confirme commande dans CartDrawer
   ↓
2. API POST /public/stores/{slug}/orders
   ↓
3. Succès: Commande créée en base de données
   ↓
4. Frontend: clear() - Vide le panier
   ↓
5. Frontend: Génère message WhatsApp formaté
   ↓
6. Frontend: Construit URL wa.me avec message encodé
   ↓
7. Frontend: window.open(whatsappUrl, '_blank')
   ↓
8. Navigateur: Ouvre nouvelle fenêtre/onglet
   ↓
9. WhatsApp: S'ouvre avec message pré-rempli
   ↓
10. Client: Peut relire et envoyer le message
   ↓
11. Frontend: Affiche écran de succès
```

### Format du Message WhatsApp

Template du message pré-rempli:

```
🛍️ Nouvelle Commande Confirmée

Bonjour {nomClient}!

Votre commande a été enregistrée avec succès.

📦 Articles commandés:
• {nomArticle1} x{quantité1} - {prixUnitaire1} GNF
• {nomArticle2} x{quantité2} - {prixUnitaire2} GNF
...

💰 Sous-total: {subtotal} GNF
🚚 Frais de livraison: {fraisLivraison} GNF
✅ TOTAL: {total} GNF

📍 Adresse de livraison: {adresseLivraison}
📞 Téléphone: {telephone}

Nous vous contacterons bientôt pour confirmer votre commande.

Merci pour votre confiance! 🙏
{nomBoutique}
```

### Format de l'URL

```
https://wa.me/{numeroWhatsappBoutique}?text={messageEncodéURIComponent}
```

**Exemple**:
```
https://wa.me/224621234567?text=%F0%9F%9B%8D%EF%B8%8F%20Nouvelle%20Commande...
```

### Données Nécessaires

**Depuis le storefront** (déjà chargé):
- `storefront.whatsappNumber` - Numéro WhatsApp de la boutique
- `storefront.nom` - Nom de la boutique

**Depuis le formulaire de commande**:
- `formData.nomClient` - Nom du client
- `formData.telephone` - Téléphone du client
- `formData.adresseLivraison` - Adresse de livraison (optionnel)

**Depuis le panier**:
- `items[]` - Liste des articles
  - `item.nom` - Nom de l'article
  - `item.quantity` - Quantité commandée
  - `item.prixUnitaire` - Prix unitaire
- `subtotal` - Sous-total calculé
- `fraisLivraison` - Frais de livraison
- `total` - Total calculé (subtotal + fraisLivraison)

## Implémentation Détaillée

### 1. Fonction de Construction du Message

```typescript
const buildWhatsAppMessage = (orderData: {
  nomClient: string;
  items: CartItem[];
  subtotal: number;
  fraisLivraison: number;
  total: number;
  adresseLivraison?: string;
  telephone: string;
}, storeName: string): string => {
  // Construction du message avec template literals
  const articlesText = orderData.items
    .map(item => `• ${item.nom} x${item.quantity} - ${formatPrix(item.prixUnitaire)}`)
    .join('\n');

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

### 2. Fonction d'Ouverture WhatsApp

```typescript
const openWhatsApp = (whatsappNumber: string, encodedMessage: string): void => {
  // Nettoyer le numéro (enlever espaces, +, tirets, parenthèses)
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

### 3. Intégration dans CartDrawer

Modification de la fonction `handleSubmitOrder` dans `CartDrawer.tsx`:

**Emplacement**: Après `clear()` et avant `setStep('success')`

```typescript
const handleSubmitOrder = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!formData.nomClient.trim() || !formData.telephone.trim()) {
    toast.error('Veuillez remplir le nom et le téléphone');
    return;
  }

  setIsSubmitting(true);

  try {
    const orderData = {
      nomClient: formData.nomClient.trim(),
      telephone: formData.telephone.trim(),
      adresseLivraison: formData.adresseLivraison.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      articles: items.map(item => ({
        articleId: item.articleId,
        quantite: item.quantity,
        prixUnitaire: item.prixUnitaire,
        modeVenteId: item.modeVenteId || undefined
      }))
    };

    await apiClient.post(`/public/stores/${slug}/orders`, orderData);

    // Vider le panier après succès
    clear();

    // ========== NOUVEAU: Intégration WhatsApp ==========
    // Vérifier si la boutique a un numéro WhatsApp configuré
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
    // ========== FIN NOUVEAU ==========

    setStep('success');

    // Close drawer after 3 seconds
    setTimeout(() => {
      handleCloseDrawer();
    }, 3000);

  } catch (error: any) {
    console.error('Error submitting order:', error);
    toast.error(error.response?.data?.message || 'Erreur lors de l\'envoi de la commande');
  } finally {
    setIsSubmitting(false);
  }
};
```

### 4. Ajout du Type StoreFront (si nécessaire)

Si le type `StoreFront` n'inclut pas encore `whatsappNumber`, vérifier dans le contexte ou props.

**Note**: Le champ `whatsappNumber` existe déjà dans l'entité `StoreFront` backend, donc il devrait être disponible dans les données chargées.

## Gestion des Erreurs

### Scénarios d'Erreur

1. **Boutique sans numéro WhatsApp**
   - Comportement: Skip silencieusement l'étape WhatsApp
   - Impact: Aucun - la commande est créée normalement
   - Code: `if (storefront?.whatsappNumber) { ... }`

2. **Bloqueur de popups**
   - Comportement: `window.open()` peut échouer
   - Impact: Message WhatsApp non ouvert, mais commande créée
   - Code: `try-catch` autour de `window.open()`
   - Log: Console error pour debugging

3. **Erreur de construction du message**
   - Comportement: Catch dans le try-catch
   - Impact: Pas de WhatsApp, mais commande créée
   - Code: `try-catch` englobant toute la section WhatsApp

4. **Données manquantes**
   - Comportement: Valeurs par défaut dans le template
   - Exemple: `adresseLivraison || 'Non spécifiée'`

### Principe

**L'intégration WhatsApp est une fonctionnalité bonus**. Elle ne doit JAMAIS empêcher:
- La création de la commande
- Le vidage du panier
- L'affichage de l'écran de succès

Toute erreur WhatsApp est loggée mais ne bloque pas le flux.

## Tests

### Tests Fonctionnels

1. **Test Mobile - iOS Safari**
   - Créer une commande sur iPhone
   - Vérifier que l'app WhatsApp s'ouvre
   - Vérifier que le message est pré-rempli correctement
   - Vérifier le formatage (emojis, sauts de ligne)
   - Vérifier que le destinataire est le bon numéro

2. **Test Mobile - Android Chrome**
   - Créer une commande sur Android
   - Vérifier que l'app WhatsApp s'ouvre
   - Vérifier le message pré-rempli
   - Vérifier le formatage

3. **Test Desktop - Chrome/Firefox/Safari**
   - Créer une commande sur ordinateur
   - Vérifier que WhatsApp Web s'ouvre dans nouvel onglet
   - Vérifier le message pré-rempli
   - Vérifier le formatage

4. **Test sans numéro WhatsApp**
   - Configurer une boutique sans `whatsappNumber`
   - Créer une commande
   - Vérifier que la commande se crée normalement
   - Vérifier qu'aucune fenêtre WhatsApp ne s'ouvre
   - Vérifier aucune erreur affichée à l'utilisateur

5. **Test avec bloqueur de popups**
   - Activer bloqueur de popups dans navigateur
   - Créer une commande
   - Vérifier que la commande se crée quand même
   - Vérifier erreur loggée dans console (acceptable)

6. **Test formatage du message**
   - Commande avec 1 article
   - Commande avec plusieurs articles
   - Commande avec/sans adresse de livraison
   - Vérifier que les prix sont correctement formatés (GNF)
   - Vérifier que les emojis s'affichent
   - Vérifier que les sauts de ligne sont préservés

### Tests d'Intégration

1. **Flux complet de commande**
   - Ajouter articles au panier
   - Remplir formulaire
   - Confirmer commande
   - Vérifier création en base de données
   - Vérifier vidage du panier
   - Vérifier ouverture WhatsApp
   - Vérifier affichage écran succès

2. **Compatibilité avec fonctionnalités existantes**
   - Vérifier que les modes de vente (gros/détail) fonctionnent toujours
   - Vérifier que les frais de livraison sont corrects
   - Vérifier que le formatage des prix est cohérent

## Contraintes Globales

- **Pas de modifications backend**: Toute l'implémentation est côté frontend
- **Pas de dépendances externes**: Utilisation uniquement de fonctionnalités web standard
- **Non bloquant**: L'échec WhatsApp ne doit pas empêcher la création de commande
- **Compatible mobile et desktop**: Fonctionne sur tous les navigateurs modernes
- **Données existantes**: Utilise uniquement les données déjà disponibles dans le contexte

## Compatibilité Navigateurs

| Navigateur | Version Minimale | Support wa.me |
|------------|------------------|---------------|
| iOS Safari | 11+ | ✅ Ouvre app WhatsApp |
| Android Chrome | 60+ | ✅ Ouvre app WhatsApp |
| Desktop Chrome | 60+ | ✅ Ouvre WhatsApp Web |
| Desktop Firefox | 60+ | ✅ Ouvre WhatsApp Web |
| Desktop Safari | 11+ | ✅ Ouvre WhatsApp Web |

## Sécurité

### Validation des Données

- **Numéro WhatsApp**: Nettoyage avec regex `replace(/[^0-9]/g, '')` pour enlever caractères non-numériques
- **Message**: Encodage avec `encodeURIComponent()` pour éviter injection de code
- **Données utilisateur**: Déjà validées côté backend lors de la création de commande

### Protection XSS

Les données insérées dans le message proviennent:
- Du formulaire (déjà validé backend)
- De la base de données (articles, boutique)
- Toutes passent par `encodeURIComponent()` avant inclusion dans l'URL

## Performance

### Impact

- **Temps d'exécution**: < 5ms pour construction du message
- **Charge réseau**: Aucune - tout est local jusqu'à `window.open()`
- **Expérience utilisateur**:
  - Ouverture WhatsApp instantanée après confirmation
  - Pas d'attente supplémentaire pour l'utilisateur

### Optimisations

- Construction du message uniquement si `whatsappNumber` existe
- Pas de requêtes API supplémentaires
- Calculs réutilisent les valeurs déjà calculées (subtotal, total)

## Améliorations Futures (Hors Scope)

- Analytics: Tracker combien de clients utilisent WhatsApp
- Personnalisation: Permettre à la boutique de customiser le template du message
- Images: Si migration vers WhatsApp Business API, inclure photos produits
- Traductions: Support multilingue du template

## Résumé

Cette implémentation permet d'ouvrir automatiquement WhatsApp avec un message de confirmation de commande pré-rempli, améliorant la communication entre le client et la boutique sans nécessiter de modifications backend ni d'API externe payante.

**Avantages**:
- Simple et rapide à implémenter
- Gratuit (pas d'API)
- Compatible tous supports
- Non bloquant
- Améliore l'expérience utilisateur

**Limitations acceptées**:
- Pas d'images dans le message (client les a déjà vues)
- Dépend du numéro WhatsApp configuré dans la boutique
- Peut être bloqué par bloqueur de popups (non bloquant)
