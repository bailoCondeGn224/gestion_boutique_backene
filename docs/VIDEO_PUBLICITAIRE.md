# 🎬 Vidéo Publicitaire — Application de Gestion de Boutique

> **Cible :** boutiquiers, pharmaciens, propriétaires de magasin (Guinée / Afrique de l'Ouest).
> **Objectif :** attirer les commerçants vers l'application (back-office + vitrine en ligne).
> **Ton :** proche, concret, « parle-moi de mon quotidien de commerçant ».
> *Inventaire basé sur le code réel actuel du projet (contrôleurs, entités, services).*

**Sommaire**
1. [Inventaire complet des fonctionnalités (A→Z)](#1-inventaire-complet-des-fonctionnalités-az)
2. [Scénario vidéo — version généraliste](#2-scénario-vidéo--version-généraliste)
3. [Storyboard visuel — généraliste](#3-storyboard-visuel--généraliste)
4. [Vidéo dédiée pharmacien](#4-vidéo-dédiée-pharmacien)
5. [Conseils de production](#5-conseils-de-production)

---

## 1️⃣ Inventaire complet des fonctionnalités (A→Z)

### 🛒 Ventes & caisse
- Enregistrement d'une vente rapide + **reçu PDF avec QR code**
- **Plusieurs unités de vente par produit** (unité / carton / gros / détail), chacune avec **son prix et son stock**
- Statistiques de ventes, ventes récentes, mois disponibles
- Suivi des **crédits de vente** par client (paiement échelonné)
- **Retours clients** et **retours fournisseurs** (avec statistiques)
- **Commandes** clients (création, livraison, annulation, suivi)

### 📦 Stock & produits
- Gestion complète des articles (CRUD, photos)
- **Alerte de stock faible** (seuil par article)
- **Alerte de péremption** — date d'expiration + **délai d'alerte configurable** (ex. 30 j) → clé pour pharmacies & alimentaire
- **Import en masse** Excel/CSV **avec photos** + modèle téléchargeable
- **Inventaire** : comptages, calcul des **écarts**, validation, impact financier, **export Excel**
- **Mouvements de stock** & statistiques de **rotation**
- **Catégories** et **zones** de rangement
- Statistiques par article et par zone

### 👥 Clients & crédit
- Fiches clients + **historique d'achats**
- Suivi du **crédit / dette** de chaque client
- **Versements clients** (encaissement des dettes)
- Liste des **meilleurs clients** et des clients à crédit

### 🚚 Fournisseurs & approvisionnements
- Gestion des fournisseurs + détails & stats
- Suivi des **dettes fournisseurs** (avec synchronisation)
- **Versements fournisseurs** + total des paiements du mois
- **Approvisionnements** (réceptions de stock) avec stats et annulation

### 💰 Finances
- **Trésorerie** (solde disponible en temps réel)
- Recettes du mois / dépenses du mois
- **Répartition des charges**
- Historique des transactions
- **Rapport financier mensuel** complet
- Statistiques par période
- Module **Dépenses** dédié (avec statistiques)

### 🌍 Vitrine en ligne (clients finaux)
- **Boutique publique** avec **lien partageable** (slug) — logo, couleurs, bannière
- **QR code de la boutique** à imprimer/afficher en magasin
- Catalogue produits en ligne (photos, catégories, fiche produit)
- **Commandes en ligne** avec cycle : en attente → **confirmée → prête → livrée** → (annulée)
- **Comptes clients** (inscription / connexion / profil)
- **Zones de livraison**
- **Notifications** (WhatsApp / SMS) — compteur de commandes en attente

### 📊 Pilotage & analytics
- **Tableau de bord** : ventes de la semaine, revenus du mois
- Statistiques d'**expiration** (produits qui périment bientôt)
- Vue synthétique de l'activité

### 🕌 Zakat
- Calcul de la **Zakat** avec paramètres personnalisables
- Pré-remplissage automatique, statistiques, marquage « payé »

### 🔐 Comptes, rôles & multi-boutiques (SaaS)
- Authentification JWT (inscription, connexion, profil, changement de mot de passe)
- **Multi-utilisateurs** avec **rôles & permissions** (permissions groupées, activation/désactivation de comptes)
- **Multi-boutiques (SaaS multi-tenant)** : chaque commerce a son espace isolé
- **Onboarding avec approbation** : inscription → en attente → approuvée / rejetée / suspendue / réactivée
- **Console super-admin** : stats globales, par plan, croissance, activité récente
- **Offres d'abonnement** : Gratuit • Standard • Premium • Entreprise

---

## 2️⃣ Scénario vidéo — version généraliste

**Message central :** « Ta boutique dans ta poche. Vends, gère ton stock, encaisse — et reçois des commandes en ligne, même quand tu dors. »
**Slogan :** *« Gère moins, vends plus. »*

### 🎬 Version courte — 60 s (WhatsApp Status / TikTok / Facebook / Instagram — vertical 9:16)

| # | Durée | Image / écran | Voix-off | Texte à l'écran |
|---|------|---------------|----------|-----------------|
| 1 | 0–4s | Boutiquier débordé : cahier, calculatrice, appels. | « Tu gères encore ta boutique avec un cahier ? » | 😩 *Le cahier, c'est fini.* |
| 2 | 4–9s | Il prend son téléphone, l'app s'ouvre. | « Voici l'application qui change tout. » | 📱 **Ta boutique dans ta poche** |
| 3 | 9–16s | Vente + reçu PDF/QR. Choix détail/carton/gros. | « Une vente en quelques secondes. Au détail, au carton ou en gros. » | 🧾 Ventes détail & gros |
| 4 | 16–23s | Alerte stock faible + alerte péremption. | « Stock bas ? Produit bientôt périmé ? L'app te prévient avant. » | 📦 Alertes stock & péremption |
| 5 | 23–31s | Fiche client, dette, versement. | « Tu vends à crédit ? Sache qui te doit combien. » | 💰 Dettes clients maîtrisées |
| 6 | 31–40s | Client commande sur la vitrine → notif chez le boutiquier. | « Et pendant que tu dors… tes clients commandent en ligne. » | 🌍 Ouverte 24h/24 |
| 7 | 40–47s | Rapport financier du mois. | « À la fin du mois, tu sais exactement ce que tu as gagné. » | 📊 Tes bénéfices en un clic |
| 8 | 47–54s | Montage rapide : WhatsApp, Zakat, plusieurs vendeurs, QR code. | « WhatsApp, Zakat, plusieurs vendeurs… tout est là. » | ✅ Tout-en-un |
| 9 | 54–60s | Logo + slogan + CTA. | « Rejoins les commerçants modernes. Essaie gratuitement. » | **[NOM]** — *Gère moins, vends plus.* 👉 Essai gratuit |

**CTA final :** numéro WhatsApp + « Écris ‘BOUTIQUE’ pour un essai gratuit ».

### 🎬 Version longue — 2 min 30 (YouTube / site web / démo — horizontal 16:9)

**Seq 1 — Le problème (0:00–0:20)**
3 commerçants : boutiquier tissus/abayas, **pharmacien** au comptoir, grossiste.
VO : « Boutiquier, pharmacien, grossiste… même problème. Un stock qu'on ne maîtrise pas, des clients qui doivent de l'argent, des comptes faits le soir sur un cahier. »
Texte : *Et si tout devenait simple ?*

**Seq 2 — La solution (0:20–0:35)**
Ouverture app, tableau de bord (ventes semaine, revenus mois).
VO : « [NOM], une seule application pour toute votre boutique. Téléphone, tablette, ordinateur. »
Texte : *Une app. Toute votre boutique.*

**Seq 3 — Vendre au détail et en gros (0:35–0:55)**
Écran : vente → reçu PDF/QR ; montrer plusieurs unités de vente d'un produit.
VO : « Vendez en quelques secondes. Le reçu est prêt. Et chaque produit se vend à l'unité, au carton ou en gros — chacun son prix. »
Texte : *Ventes gros & détail • Reçus PDF/QR*

**Seq 4 — Maîtriser le stock (0:55–1:18)**
Écran : alerte stock faible, **alerte péremption**, import Excel+photos, inventaire.
VO : « Stock toujours à jour. Alerte avant la rupture — et avant qu'un produit ne périme. Parfait pour une pharmacie. Des centaines de produits ? Importez-les d'un coup, avec les photos. »
Texte : *Rupture • Péremption • Import • Inventaire*

**Seq 5 — Clients & crédit (1:18–1:38)**
Écran : fiche client, historique, dette, versement, top clients.
VO : « Vous vendez à crédit ? Vous savez toujours qui vous doit, et combien. Chaque versement est enregistré. Fini les disputes. »
Texte : *Suivi des dettes • Versements*

**Seq 6 — Fournisseurs & finances (1:38–1:58)**
Écran : approvisionnements, dettes fournisseurs, rapport mensuel.
VO : « Gérez fournisseurs et dettes. Et votre rapport financier mensuel est déjà prêt : recettes, dépenses, bénéfice réel. »
Texte : *Fournisseurs • Trésorerie • Rapport mensuel*

**Seq 7 — La vitrine en ligne (1:58–2:18)**
Écran : client commande en ligne → commerçant suit confirmée → prête → livrée ; QR code affiché en magasin.
VO : « Le plus fort : votre boutique a sa page en ligne. Partagez le lien sur WhatsApp ou affichez votre QR code. Vos clients commandent seuls, vous suivez chaque commande. Votre boutique ne ferme jamais. »
Texte : *Boutique en ligne • QR code • Commandes*

**Seq 8 — Grandir en confiance (2:18–2:28)**
Écran : rôles/permissions, Zakat, multi-boutiques, zones.
VO : « Plusieurs vendeurs avec des droits, calcul de la Zakat, plusieurs boutiques… tout est prévu pour grandir. »
Texte : *Rôles • Multi-boutiques • Zakat*

**Seq 9 — CTA (2:28–2:30)**
Logo + offres (Gratuit/Standard/Premium/Entreprise).
VO : « Commencez gratuitement. [NOM]. Gère moins, vends plus. »
Texte : *Essai gratuit 👉 [WhatsApp / lien]*

---

## 3️⃣ Storyboard visuel — généraliste

```
┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
│  PLAN 1 — PROBLÈME   │   │  PLAN 2 — OUVERTURE  │   │  PLAN 3 — VENTE      │
│                      │   │                      │   │                      │
│  [cahier + calc]     │──▶│  [main + téléphone]  │──▶│ [écran vente]        │
│  boutiquier stressé  │   │  app qui s'ouvre     │   │ reçu PDF + QR pop-up │
│  lumière froide      │   │  lumière chaude      │   │ badges: détail/gros  │
│  🎵 tension          │   │  🎵 respiration      │   │ 🎵 rythme monte      │
└─────────────────────┘   └─────────────────────┘   └─────────────────────┘

┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
│  PLAN 4 — STOCK      │   │  PLAN 5 — CLIENT     │   │  PLAN 6 — VITRINE    │
│                      │   │                      │   │                      │
│ [liste produits]     │──▶│ [fiche client]       │──▶│ SPLIT SCREEN :       │
│ 🔴 stock faible      │   │ solde dette: -450k   │   │ gauche = client tél. │
│ ⏰ périme dans 12j   │   │ bouton [+ versement] │   │ droite = notif boutiq│
│ 🎵 alerte douce      │   │ 🎵 apaisant          │   │ 🎵 "ding" commande   │
└─────────────────────┘   └─────────────────────┘   └─────────────────────┘

┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
│  PLAN 7 — FINANCES   │   │  PLAN 8 — MONTAGE    │   │  PLAN 9 — CTA        │
│                      │   │      RAPIDE          │   │                      │
│ [rapport mensuel]    │──▶│ WhatsApp • Zakat •   │──▶│  LOGO centré         │
│ Recettes ▲ vert      │   │ vendeurs • QR code   │   │  slogan              │
│ Bénéfice: +2.3M GNF  │   │ (coupes 0.5s chacune)│   │  👉 WhatsApp + "essai│
│ 🎵 satisfaction      │   │ 🎵 climax            │   │     gratuit"         │
└─────────────────────┘   └─────────────────────┘   └─────────────────────┘
```

---

## 4️⃣ Vidéo dédiée pharmacien

**Message central :** *« Ne perdez plus un seul médicament. Soyez alerté avant chaque péremption, avant chaque rupture — et gardez des comptes toujours nets. »*
**Slogan :** *« Votre pharmacie, sous contrôle. »*
**Angle émotionnel :** le pharmacien jette des boîtes périmées = de l'argent à la poubelle. L'app supprime cette perte.

### 🎬 Version courte — 45 s (vertical 9:16)

| # | Durée | Image / écran | Voix-off | Texte à l'écran |
|---|------|---------------|----------|-----------------|
| 1 | 0–5s | Pharmacien qui jette des boîtes périmées. Gros plan sur une date dépassée. | « Chaque médicament périmé, c'est votre argent à la poubelle. » | 💸 *Combien vous jetez chaque mois ?* |
| 2 | 5–10s | Il ouvre l'app sur sa tablette au comptoir. | « Avec cette application, ça n'arrive plus. » | 💊 **Votre pharmacie, sous contrôle** |
| 3 | 10–18s | Liste d'alertes ⏰ « périme dans 15 j / 30 j ». | « Vous êtes prévenu des semaines à l'avance. Vendez ou retournez avant l'expiration. » | ⏰ Alerte péremption automatique |
| 4 | 18–25s | Alerte stock faible 🔴 + réappro fournisseur. | « Un produit qui manque ? L'app vous prévient avant la rupture. » | 📦 Jamais en rupture |
| 5 | 25–32s | Rapport financier du mois, trésorerie, dépenses. | « Et vos comptes sont toujours nets : recettes, dépenses, bénéfice réel. » | 📊 Comptabilité claire |
| 6 | 32–39s | Vente + reçu, plusieurs vendeurs avec droits différents. | « Plusieurs vendeurs, chacun ses droits. Chaque vente tracée. » | 👥 Équipe & traçabilité |
| 7 | 39–45s | Logo + slogan + CTA. | « Arrêtez de perdre de l'argent. Essayez gratuitement. » | **[NOM]** — *Votre pharmacie, sous contrôle.* 👉 Essai gratuit |

**CTA final :** numéro WhatsApp + « Écris ‘PHARMA’ pour un essai gratuit ».

### 🎬 Version longue — 2 min (démo YouTube / présentation — 16:9)

**Seq 1 — La douleur (0:00–0:20)**
Image : pharmacien vérifie un rayon, trouve 3 boîtes périmées, soupire, les jette. Gros plan sur les dates.
VO : « Dans une pharmacie, chaque produit a une date. Un médicament oublié au fond du rayon, et c'est une perte sèche. Multiplié par des centaines de références… ça chiffre vite. »
Texte : *La péremption, votre ennemie n°1.*

**Seq 2 — La solution (0:20–0:35)**
Image : ouverture de l'app, tableau de bord clair sur tablette.
VO : « [NOM] surveille votre stock à votre place. Sur tablette, téléphone ou ordinateur. »
Texte : *Une app pensée pour votre officine.*

**Seq 3 — Alerte péremption (0:35–0:58)** ⭐ *cœur du message*
Image : écran des alertes d'expiration → « périme dans 30 j / 15 j / 7 j ». Le pharmacien règle le délai d'alerte (ex. 60 jours).
VO : « Fixez votre propre délai d'alerte : 30, 60 jours avant. L'application vous liste tout ce qui approche de la péremption. Vous avez le temps de vendre en priorité, de faire une promo, ou de retourner au fournisseur. Zéro perte. »
Texte : *Alerte péremption réglable • Zéro gaspillage*

**Seq 4 — Stock & réassort (0:58–1:18)**
Image : alerte stock faible, mouvements de stock, statistiques de rotation, réappro fournisseur.
VO : « Plus de rupture non plus. Dès qu'un produit descend sous votre seuil, vous êtes prévenu. Vous voyez ce qui tourne vite… et ce qui dort dans les rayons. »
Texte : *Alerte rupture • Rotation • Réassort*

**Seq 5 — Inventaire & import (1:18–1:35)**
Image : import Excel de centaines de références avec photos ; inventaire → écarts → export Excel.
VO : « Des centaines de références ? Importez-les d'un coup. Et faites votre inventaire sans stress : l'app calcule les écarts et vous sort tout en Excel. »
Texte : *Import en masse • Inventaire • Export Excel*

**Seq 6 — Comptes nets & clients à crédit (1:35–1:52)**
Image : rapport mensuel (recettes, dépenses, trésorerie) ; fiche client régulier avec crédit + versement.
VO : « Vos comptes sont toujours à jour : recettes, dépenses, bénéfice réel, à tout moment. Un client fidèle qui paie plus tard ? Suivez son crédit et ses versements sans un cahier. »
Texte : *Comptabilité claire • Crédit clients suivi*

**Seq 7 — Équipe & vitrine (1:52–2:00)**
Image : plusieurs comptes vendeurs avec droits différents ; brièvement la vitrine en ligne (parapharmacie) + QR code.
VO : « Plusieurs employés, chacun ses droits. Et même une boutique en ligne pour votre parapharmacie. Tout ça, dès aujourd'hui — gratuitement. »
Texte : *Équipe & droits • Boutique en ligne 👉 Essai gratuit*

### 🎬 Storyboard visuel — pharmacien

```
┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
│ PLAN 1 — LA PERTE    │   │ PLAN 2 — L'APP       │   │ PLAN 3 — PÉREMPTION ⭐│
│                      │   │                      │   │                      │
│ [boîtes périmées →   │──▶│ [tablette au         │──▶│ ⏰ Liste alertes :   │
│  poubelle]           │   │  comptoir]           │   │  • Doliprane -7j 🔴  │
│ gros plan date       │   │  dashboard net       │   │  • Amox. -15j 🟠     │
│ 🎵 grave / silence   │   │  🎵 clair            │   │  • Vit C -30j 🟡     │
└─────────────────────┘   └─────────────────────┘   └─────────────────────┘

┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
│ PLAN 4 — RUPTURE     │   │ PLAN 5 — INVENTAIRE  │   │ PLAN 6 — COMPTES     │
│                      │   │                      │   │                      │
│ 🔴 stock faible      │──▶│ [import Excel 300    │──▶│ Recettes ▲           │
│ rotation graphique   │   │  références + photos]│   │ Dépenses             │
│ bouton [réassort]    │   │ écarts → export .xlsx│   │ Bénéfice: +1.8M GNF  │
│ 🎵 rythme monte      │   │ 🎵 efficace          │   │ 🎵 satisfaction      │
└─────────────────────┘   └─────────────────────┘   └─────────────────────┘

┌─────────────────────┐   ┌─────────────────────┐
│ PLAN 7 — ÉQUIPE      │   │ PLAN 8 — CTA         │
│                      │   │                      │
│ [3 comptes vendeurs  │──▶│  LOGO                │
│  droits différents]  │   │  "Votre pharmacie,   │
│ + vitrine parapharma │   │   sous contrôle."    │
│ 🎵 confiance         │   │  👉 WhatsApp "PHARMA"│
└─────────────────────┘   └─────────────────────┘
```

### 🎯 Pourquoi cette version marche sur un pharmacien

| Argument | Fonctionnalité réelle du projet |
|----------|-------------------------------|
| « Je jette des produits périmés » | **Alerte de péremption** (date d'expiration + délai d'alerte réglable) |
| « Je tombe en rupture sur des médicaments demandés » | **Alerte de stock faible** + rotation + réappro |
| « J'ai des centaines de références » | **Import en masse** Excel/CSV + photos |
| « Mon inventaire est un cauchemar » | **Inventaire** avec écarts + **export Excel** |
| « Je veux des comptes carrés » | **Trésorerie, rapport mensuel, dépenses** |
| « Des clients paient plus tard » | **Crédit client + versements** |
| « J'ai plusieurs employés » | **Multi-utilisateurs, rôles & permissions** |
| « Je vends de la parapharmacie » | **Vitrine en ligne + commandes + QR code** |

---

## 5️⃣ Conseils de production

1. **Captures d'écran réelles** de l'app pour chaque plan → crédibilité maximale (enregistreur d'écran du téléphone/tablette).
2. **Sous-titres gros et lisibles** : la plupart regardent sans le son sur WhatsApp/Facebook.
3. **Vraies personnes locales** : un vrai boutiquier, un vrai pharmacien → les gens se reconnaissent.
4. **Prix en GNF** visibles à l'écran (marché local).
5. **Versions courtes (45–60 s)** pour la pub payante et WhatsApp Status ; **versions longues** pour YouTube et démos.
6. Terminer **toujours** par le **numéro WhatsApp + mot-clé** (« écris BOUTIQUE » / « écris PHARMA »).
7. Transitions rapides (0,3–0,5 s), musique afro moderne mais pro, palette de la marque sur fond clair.

---

## 6️⃣ Sous-titres time-codés (format SRT pour CapCut)

> **Comment importer dans CapCut :**
> 1. Copie un bloc ci-dessous dans un fichier texte, enregistre-le avec l'extension **`.srt`** (ex. `spot-60s.srt`).
> 2. Dans CapCut : **Textes → Sous-titres → Importer les sous-titres → Fichier local**, puis choisis ton `.srt`.
> 3. Applique ensuite ton style de police (gros, contour, fond) à tous les sous-titres d'un coup.
>
> Remplace `[NOM]` par le nom réel de ton application avant l'export.

### 📄 `spot-60s.srt` — Spot généraliste 60 s

```srt
1
00:00:00,000 --> 00:00:04,000
Tu gères encore ta boutique avec un cahier ?

2
00:00:04,000 --> 00:00:09,000
Voici l'application qui change tout.

3
00:00:09,000 --> 00:00:16,000
Une vente en quelques secondes.
Au détail, au carton ou en gros.

4
00:00:16,000 --> 00:00:23,000
Stock bas ? Produit bientôt périmé ?
L'app te prévient avant.

5
00:00:23,000 --> 00:00:31,000
Tu vends à crédit ?
Sache qui te doit combien.

6
00:00:31,000 --> 00:00:40,000
Et pendant que tu dors…
tes clients commandent en ligne.

7
00:00:40,000 --> 00:00:47,000
À la fin du mois, tu sais exactement
ce que tu as gagné.

8
00:00:47,000 --> 00:00:54,000
WhatsApp, Zakat, plusieurs vendeurs…
tout est là.

9
00:00:54,000 --> 00:01:00,000
[NOM] — Gère moins, vends plus.
Essaie gratuitement.
```

### 📄 `demo-2min30.srt` — Version longue généraliste 2 min 30

```srt
1
00:00:00,000 --> 00:00:10,000
Boutiquier, pharmacien, grossiste…
vous avez le même problème.

2
00:00:10,000 --> 00:00:20,000
Un stock qu'on ne maîtrise pas.
Des comptes faits le soir sur un cahier.

3
00:00:20,000 --> 00:00:35,000
[NOM], une seule application
pour toute votre boutique.

4
00:00:35,000 --> 00:00:45,000
Vendez en quelques secondes.
Le reçu est prêt tout de suite.

5
00:00:45,000 --> 00:00:55,000
À l'unité, au carton ou en gros —
chacun son prix.

6
00:00:55,000 --> 00:01:07,000
Alerte avant la rupture,
et avant qu'un produit ne périme.

7
00:01:07,000 --> 00:01:18,000
Des centaines de produits ?
Importez-les d'un coup, avec les photos.

8
00:01:18,000 --> 00:01:30,000
Vous vendez à crédit ? Vous savez toujours
qui vous doit, et combien.

9
00:01:30,000 --> 00:01:38,000
Chaque versement est enregistré.
Fini les disputes.

10
00:01:38,000 --> 00:01:48,000
Gérez vos fournisseurs et vos dettes.

11
00:01:48,000 --> 00:01:58,000
Votre rapport financier mensuel
est déjà prêt : bénéfice réel.

12
00:01:58,000 --> 00:02:08,000
Votre boutique a sa page en ligne.
Partagez le lien, ou affichez votre QR code.

13
00:02:08,000 --> 00:02:18,000
Vos clients commandent seuls,
vous suivez chaque commande.

14
00:02:18,000 --> 00:02:28,000
Plusieurs vendeurs, calcul de la Zakat,
plusieurs boutiques.

15
00:02:28,000 --> 00:02:30,000
[NOM]. Gère moins, vends plus.
```

### 📄 `pharma-45s.srt` — Spot pharmacien 45 s

```srt
1
00:00:00,000 --> 00:00:05,000
Chaque médicament périmé,
c'est votre argent à la poubelle.

2
00:00:05,000 --> 00:00:10,000
Avec cette application, ça n'arrive plus.

3
00:00:10,000 --> 00:00:18,000
Vous êtes prévenu des semaines à l'avance.
Vendez ou retournez avant l'expiration.

4
00:00:18,000 --> 00:00:25,000
Un produit qui manque ?
L'app vous prévient avant la rupture.

5
00:00:25,000 --> 00:00:32,000
Vos comptes sont toujours nets :
recettes, dépenses, bénéfice réel.

6
00:00:32,000 --> 00:00:39,000
Plusieurs vendeurs, chacun ses droits.
Chaque vente tracée.

7
00:00:39,000 --> 00:00:45,000
[NOM] — Votre pharmacie, sous contrôle.
Essayez gratuitement.
```

### 📄 `pharma-2min.srt` — Version longue pharmacien 2 min

```srt
1
00:00:00,000 --> 00:00:10,000
Dans une pharmacie, chaque produit a une date.

2
00:00:10,000 --> 00:00:20,000
Un médicament oublié au fond du rayon,
et c'est une perte sèche.

3
00:00:20,000 --> 00:00:35,000
[NOM] surveille votre stock à votre place.

4
00:00:35,000 --> 00:00:47,000
Fixez votre propre délai d'alerte :
30, 60 jours avant.

5
00:00:47,000 --> 00:00:58,000
Vendez en priorité, faites une promo,
ou retournez au fournisseur. Zéro perte.

6
00:00:58,000 --> 00:01:08,000
Plus de rupture non plus.
Vous êtes prévenu sous votre seuil.

7
00:01:08,000 --> 00:01:18,000
Vous voyez ce qui tourne vite…
et ce qui dort dans les rayons.

8
00:01:18,000 --> 00:01:28,000
Des centaines de références ?
Importez-les d'un coup.

9
00:01:28,000 --> 00:01:35,000
L'inventaire calcule les écarts
et sort tout en Excel.

10
00:01:35,000 --> 00:01:45,000
Recettes, dépenses, bénéfice réel,
à tout moment.

11
00:01:45,000 --> 00:01:52,000
Un client fidèle qui paie plus tard ?
Suivez son crédit sans un cahier.

12
00:01:52,000 --> 00:02:00,000
[NOM] — Votre pharmacie, sous contrôle.
Essai gratuit.
```

> 💡 **Astuce lisibilité :** garde chaque sous-titre à **2 lignes max** et coupe les phrases longues là où c'est déjà fait ci-dessus. Sur les formats verticaux (9:16), place les sous-titres dans le **tiers inférieur** mais au-dessus des boutons d'interface (like/partage).
