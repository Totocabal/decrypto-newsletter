# Décrypto — Newsletter Editor

Éditeur collaboratif de newsletters HTML pour **Décrypto**, l'hebdo crypto de Coinhouse. Construit avec React + Vite côté front, **Supabase** (Postgres + Auth + Storage + Realtime) côté backend, déployé sur **Vercel**.

---

## Table des matières

1. [Stack technique](#stack-technique)
2. [Fonctionnalités](#fonctionnalités)
3. [Architecture](#architecture)
4. [Blocs disponibles](#blocs-disponibles)
5. [Système d'export](#système-dexport)
6. [Collaboration en temps réel](#collaboration-en-temps-réel)
7. [Gestion des images](#gestion-des-images)
8. [Système de labels](#système-de-labels)
9. [Schéma de base de données](#schéma-de-base-de-données)
10. [Setup local](#setup-local)
11. [Déploiement Vercel](#déploiement-vercel)
12. [Scripts](#scripts)

---

## Stack technique

| Couche | Technologie |
|---|---|
| Front-end | React 18, Vite 5 |
| Styles | Tailwind CSS v3 |
| Éditeur de texte riche | Slate.js |
| Backend / BDD | Supabase (PostgreSQL) |
| Auth | Supabase Auth — magic link |
| Stockage fichiers | Supabase Storage |
| Temps réel | Supabase Realtime (Broadcast) |
| Déploiement | Vercel (SSR/Edge Functions) |
| Export ZIP | JSZip |
| Graphiques marché | CoinGecko API (public) |

---

## Fonctionnalités

### Éditeur de blocs

- **14 types de blocs** modulaires (voir [liste complète](#blocs-disponibles))
- Réorganisation par glisser-déposer ou boutons ↑ / ↓
- Chaque bloc est **collapsible** pour gagner de la place
- Actions en en-tête de bloc : dupliquer, supprimer
- Numérotation automatique des sections
- **Thème clair / sombre** commutable depuis la barre d'outils

### Éditeur de texte riche (Slate.js)

Disponible dans les champs de corps de texte :

- Gras, italique, souligné, rayé
- Lien hypertexte
- Liste à puces, liste numérotée
- Rendu HTML inline correct pour les clients email

### Données en temps réel

- **CoinGecko** : prix BTC/ETH avec variation sur 7j ou 30j, en EUR ou USD
  - Chips du hero synchronisés automatiquement
  - Graphiques mis à jour en un clic ou à l'ouverture
- **Fear & Greed Index** : synchronisation en un clic
- Bouton **Synchroniser tout** global + bouton individuel par bloc concerné

### Prévisualisation

- Aperçu **temps réel** Desktop (600 px) et Mobile (430 px), dans l'onglet Aperçu
- Vue **Code HTML** brut avec copie en un clic
- Rendu fidèle aux principaux clients email : Gmail, Apple Mail, Outlook, iOS Mail

### Versions

- **Snapshot nommé** : auteur + commentaire + horodatage (jusqu'à 50 versions)
- **Restauration** depuis l'historique côté panneau latéral
- Auto-save serveur avec debounce 2 s (pas besoin de sauvegarder manuellement)

### Labels colorés

- Labels personnalisables (nom + couleur parmi 10 teintes)
- Assignables sur les **newsletters** (page liste) et sur les **images** (gestionnaire)
- Filtre multi-label en OR sur la liste des newsletters et dans le gestionnaire d'images
- Pills de labels sur les cartes avec repli en pastilles de couleur si l'espace manque

### Archivage

- Les newsletters terminées peuvent être **archivées** (masquées de la liste principale)
- Vue dédiée "Archives" accessible depuis la liste

### Admin

- Approbation / révocation des comptes utilisateurs
- Création directe de compte avec mot de passe temporaire
- **Template newsletter** : configurer la disposition par défaut (blocs initiaux, numérotation, thème, date automatique)
- **Contenus par défaut** : éditer les textes initiaux de chaque type de bloc
- **Presets de disposition** : sauvegarder et réutiliser des configurations de blocs pour toute l'équipe

---

## Architecture

```
src/
├── config/
│   ├── theme.js              ← palette Décrypto, polices, constante BRAND
│   ├── schema.js             ← catalogue des types de blocs + factory() + template par défaut
│   └── calloutPictos.js      ← 15 pictos SVG + 9 couleurs pour les blocs encadré
│
├── contexts/
│   └── AuthContext.jsx        ← session Supabase + profil utilisateur (is_approved, is_admin)
│
├── lib/
│   ├── supabase.js            ← client Supabase (singleton)
│   ├── useNewsletter.js       ← hook principal : chargement, lock collaboratif, auto-save, broadcast
│   ├── useLabels.js           ← CRUD labels + hooks newsletter_labels / image_labels
│   ├── templatePresets.js     ← presets de disposition (sauvegarde / chargement admin)
│   ├── useCoinGecko.js        ← fetching CoinGecko + Fear & Greed
│   └── imageUpload.js         ← upload + compression images vers Supabase Storage
│
├── pages/
│   ├── LoginPage.jsx
│   ├── PendingApprovalPage.jsx
│   ├── SetPasswordPage.jsx
│   ├── SetupErrorPage.jsx
│   ├── NewslettersListPage.jsx ← liste + filtres + labels + archivage
│   ├── EditorPage.jsx          ← page principale : split EditorPanel / PreviewPanel
│   └── AdminPage.jsx           ← gestion utilisateurs, template, presets
│
├── components/
│   ├── EditorPanel.jsx         ← panneau gauche : liste ordonnée des blocs + paramètres généraux
│   ├── SectionEditor.jsx       ← formulaires d'édition spécifiques à chaque type de bloc
│   ├── PreviewPanel.jsx        ← iframe de prévisualisation (desktop / mobile / HTML)
│   ├── FormControls.jsx        ← composants UI : Field, RichTextEditor (Slate), Select, Toggle…
│   ├── VersionsPanel.jsx       ← panneau historique des versions (snapshot + restauration)
│   ├── ImageManagerModal.jsx   ← modal gestionnaire d'images (upload, labels, sélection, multi-select)
│   ├── LockBanner.jsx          ← bandeau rouge "template verrouillé par X"
│   ├── LockRequestBanner.jsx   ← bandeau ambre animé "Y souhaite prendre la main"
│   ├── Toolbar.jsx             ← barre d'outils en-tête
│   ├── Tooltip.jsx             ← composant tooltip générique
│   └── Wordmark.jsx            ← logotype Décrypto
│
├── render/
│   └── buildEmail.js           ← moteur de rendu HTML email (tables, inline CSS, SVG inline)
│
├── utils/
│   ├── exportAssetPack.js      ← export ZIP (HTML + assets PNG)
│   ├── exportImport.js         ← import/export JSON du brouillon
│   ├── storage.js              ← helpers Supabase Storage
│   └── dateParser.js           ← parsing dates pour l'automatisation
│
└── App.jsx / main.jsx

supabase/
├── schema.sql                  ← schéma complet (tables, RLS, RPC, triggers)
├── bootstrap-admin.sql         ← script d'initialisation du premier compte admin
├── admin-create-user.sql       ← script pour la création de compte via admin
└── keepalive.sql               ← RPC légère anti-pause (projets Free)

api/
├── export-braze.js             ← serverless Vercel : upload images → Braze Media Library
└── supabase-keepalive.js       ← serverless Vercel : cron ping anti-pause Supabase Free
```

### Flux de données éditeur

```
EditorPage
  ├── useNewsletter()           → charge le brouillon, gère le lock, auto-save, broadcast
  ├── EditorPanel               → modifie sections[] localement → déclenche save
  │     └── SectionEditor       → formulaires par type de bloc
  └── PreviewPanel              → appelle buildEmail(draft) → HTML injecté dans <iframe>
```

---

## Blocs disponibles

| Type | Label UI | Description |
|---|---|---|
| `hero` | Hero | Titre principal, kicker, sous-titre, chips BTC/ETH/F&G |
| `index` | Sommaire | Liste numérotée des sujets de l'édition |
| `edito` | Édito + KPI | Corps éditorial + rangée de KPI chiffrés |
| `chart` | Graphique | Graphique de cours synchronisé CoinGecko (7j/30j, EUR/USD) |
| `fear_greed` | Fear & Greed | Jauge Fear & Greed Index avec valeur et label |
| `signals` | Signaux | Grille de signaux (haussier / neutre / baissier) avec description |
| `macro` | Macro / Citation | Bloc macro-économie ou mise en avant d'une citation |
| `macro_bars` | Barres macro | Comparatif visuel sous forme de barres horizontales |
| `commented_number` | Chiffre commenté | Grand chiffre mis en avant avec titre et commentaire |
| `event` | Évènement | Carte évènement avec date, titre, lieu, description |
| `focus` | Texte & Media | Composition libre d'items : texte riche, image, encadré, CTA |
| `image_block` | Image | Bloc image pleine largeur avec légende optionnelle |
| `text_block` | Texte | Paragraphe de texte libre (riche) |
| `divider` | Séparateur | Séparateur visuel entre sections |

### Bloc Texte & Media — items

Le bloc `focus` est le plus flexible. Il peut contenir autant d'items que souhaité, de quatre types :

- **text** — éditeur de texte riche (Slate.js)
- **image** — image sélectionnée depuis le gestionnaire, avec légende optionnelle
- **callout** — encadré avec 1 des **15 pictos** (info, décrypte, intuition, épingle, prudence, signal, contexte, lecture, timing, essentiel, dollar, euro, bitcoin, ethereum, question) et 1 des **9 couleurs** (cyan, menthe, bleu, rose, orange, corail, violet, jaune, blanc)
- **cta** — bouton d'appel à l'action avec texte, URL, couleur de fond dégradé en PNG exporté

---

## Système d'export

### Export ZIP

Bouton **Exporter ZIP** dans la barre d'outils :

1. `buildEmail(draft)` génère le HTML complet avec toutes les images référencées en chemin relatif `assets/…`
2. Chaque image Supabase Storage est téléchargée et convertie en PNG
3. Les boutons CTA gradient sont générés comme PNG via `<canvas>` (dégradé Décrypto)
4. Archive ZIP produite avec `JSZip` : `newsletter.html` + dossier `assets/`
5. Prêt à uploader sur un CDN ou à envoyer directement

### Export Braze

Bouton **Exporter Braze** (admins uniquement) :

1. Appel à la serverless function Vercel `/api/export-braze`
2. La fonction vérifie la session Supabase + flag `is_admin` côté serveur
3. Chaque image est uploadée dans la **Braze Media Library** via l'API REST Braze
4. Le HTML final utilise les URLs CDN Braze définitives
5. La clé `BRAZE_API_KEY` ne transite jamais côté client

### Export / Import JSON

Menu **⋯ → Exporter JSON** : snapshot du brouillon complet exportable/réimportable, utile pour les sauvegardes ou transferts entre environnements.

---

## Collaboration en temps réel

### Verrou d'édition

Un seul utilisateur peut éditer un template à la fois :

- À l'ouverture, `useNewsletter` tente d'acquérir le verrou via la RPC Postgres `acquire_lock`
- Le verrou a un **TTL de 10 minutes** renouvelé automatiquement toutes les 4 minutes tant que l'onglet est actif
- Si le verrou est pris, un **bandeau rouge** (`LockBanner`) s'affiche avec le nom du détenteur et la date d'expiration
- Une fois le verrou expiré, n'importe quel autre utilisateur peut le prendre de force (**prise de contrôle forcée**)

### Bandeau de demande d'accès (`LockRequestBanner`)

Quand un second utilisateur (B) tente d'accéder à un template verrouillé par A :

1. B voit le bandeau rouge et peut déclencher une **demande d'accès**
2. Un event `lock-request` est broadcasté sur le canal Supabase Realtime `lock-requests:{newsletterId}`
3. A reçoit un **bandeau ambre animé** (slide-in + fade) en haut de l'écran indiquant que B souhaite prendre la main
4. Le bandeau se ferme automatiquement après 8 secondes ou manuellement

### Notification de prise de contrôle

Quand B prend de force le verrou :

1. `takeOverLock` acquiert le verrou côté DB
2. Un event `lock-taken` est broadcasté (avec le nom de B)
3. A reçoit un **toast rouge** : *"[Nom de B] a pris la main sur l'édition."*
4. A est basculé en lecture seule immédiatement

### Canal Realtime stable

Le canal Supabase Realtime est créé **une seule fois** par couple `(newsletterId, userId)` et maintenu via des refs React (`channelRef`, `channelReadyRef`, `lockedByOtherRef`, `forcedOutRef`) pour éviter les récréations intempestives ou les doublons d'events.

---

## Gestion des images

### Upload

- Modal **Gestionnaire d'images** (`ImageManagerModal`) accessible depuis tout champ image
- Upload par glisser-déposer ou sélecteur de fichiers
- **Compression automatique** côté client avant upload (qualité configurable)
- Stockage dans le bucket Supabase Storage `newsletter-images`
- Nommage par hash pour éviter les collisions
- Vue grille, grille compacte et vue liste

### Sélection

- Sélection simple : clic sur une image → insérée dans le champ
- **Multi-sélection** : mode multi-select avec bordure rose sur les cartes sélectionnées (pas de case à cocher)
- Actions groupées disponibles en multi-select (ex. suppression)

### Labels sur les images

- Les images peuvent recevoir des **labels colorés** depuis le panneau de détail
- Filtre par label(s) en OR dans la grille (barre de filtres en haut du modal)
- Affichage des labels sur les cartes : pills colorées, ou pastilles si l'espace manque (détection overflow via `useLayoutEffect`)

### Détail d'une image

Panneau latéral d'une image sélectionnée :
- Aperçu grande taille
- Copie de l'URL
- Assignation / retrait de labels (toggle pill)
- Suppression

---

## Système de labels

### Structure

Labels globaux stockés dans la table `labels` (nom + couleur hex). Associés aux newsletters via `newsletter_labels` et aux images via `image_labels`.

### Gestion

- Page **Admin → Labels** : créer, renommer, recolorer, supprimer
- 10 couleurs prédéfinies : rouge, orange, jaune, vert, cyan, bleu, violet, rose, ardoise, ambre

### Affichage

- Style cohérent sur toute l'app : `uppercase tracking-[0.12em] font-semibold` sur fond de la couleur à 20% d'opacité
- Repli automatique en **pastilles de couleur** quand les pills débordent de la carte

---

## Schéma de base de données

### Tables principales

| Table | Description |
|---|---|
| `profiles` | Profils utilisateurs (full_name, is_approved, is_admin, avatar_url) |
| `newsletters` | Brouillons de newsletters (title, content JSONB, status, created_by) |
| `versions` | Historique de versions (newsletter_id, snapshot JSONB, name, comment, created_by) |
| `locks` | Verrous d'édition (newsletter_id, locked_by, expires_at) |
| `labels` | Labels colorés (name, color, created_by, updated_by) |
| `newsletter_labels` | Association newsletters ↔ labels (newsletter_id, label_id, assigned_by) |
| `image_labels` | Association images ↔ labels (image_path TEXT, label_id, assigned_by) |
| `template_config` | Configuration du template par défaut (admin) |
| `default_content` | Contenus par défaut par type de bloc (admin) |

### RPC Postgres

| Fonction | Description |
|---|---|
| `acquire_lock(newsletter_id, user_id, ttl_minutes)` | Acquiert ou renouvelle le verrou, retourne success/locked_by |
| `release_lock(newsletter_id, user_id)` | Libère le verrou si détenu par cet utilisateur |
| `supabase_keepalive()` | No-op légère pour le cron anti-pause |

### RLS (Row Level Security)

Toutes les tables ont des policies RLS activées :

- `profiles` : lecture publique, écriture par le propriétaire ou admin
- `newsletters` : lecture/écriture pour les utilisateurs approuvés (`is_approved = true`)
- `locks` : lecture publique, modification via RPC uniquement
- `labels` / `newsletter_labels` / `image_labels` : lecture publique, écriture pour les utilisateurs approuvés
- `versions` : lecture/écriture pour les utilisateurs approuvés

---

## Setup local

### 1. Créer le projet Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Région recommandée : **eu-central-1** (Francfort) pour la conformité RGPD

### 2. Exécuter le schéma

Dans **SQL Editor** du dashboard Supabase, exécuter `supabase/schema.sql`. Ce script crée toutes les tables, policies RLS, RPCs et triggers.

### 3. Récupérer les clés API

Dans **Project Settings → API** :
- `Project URL` → `VITE_SUPABASE_URL`
- `anon public` key → `VITE_SUPABASE_ANON_KEY`

### 4. Configurer le Storage

Dans **Storage**, créer un bucket `newsletter-images` :
- Public : oui (pour les URLs d'images dans les emails)
- Policies : insertion/suppression pour les utilisateurs approuvés

### 5. Lancer en local

```bash
cp .env.example .env
# Remplir .env avec les valeurs Supabase
npm install
npm run dev
```

Variables d'environnement nécessaires en local :

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_AUTH_REDIRECT_URL=http://localhost:5173
```

### 6. Créer le premier compte admin

1. Ouvrir `http://localhost:5173`, saisir son email
2. Cliquer le magic link reçu → compte en attente d'approbation
3. Dans Supabase → SQL Editor, exécuter `supabase/bootstrap-admin.sql` avec son email
4. Recharger la page → accès complet

### 7. Créer des comptes utilisateurs (optionnel)

Via l'interface Admin → Créer un compte, ou en exécutant `supabase/admin-create-user.sql` dans le SQL Editor pour créer un compte avec mot de passe temporaire.

---

## Déploiement Vercel

### 1. Push sur GitHub et importer sur Vercel

1. Pousser le repo sur GitHub
2. Importer le projet sur [vercel.com](https://vercel.com)
3. Build command : `npm run build`, Output directory : `dist`

### 2. Variables d'environnement

Dans **Vercel → Settings → Environment Variables** :

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | URL du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clé anon public Supabase |
| `VITE_AUTH_REDIRECT_URL` | URL publique exacte de l'app (ex. `https://newsletter.decrypto.com`) |
| `BRAZE_API_KEY` | Clé serveur Braze (permission `media_library.create`) |
| `BRAZE_BASE_URL` | REST endpoint Braze (ex. `https://rest.fra-01.braze.eu`) |
| `SUPABASE_URL` | Idem `VITE_SUPABASE_URL` (pour les fonctions serverless) |
| `SUPABASE_ANON_KEY` | Idem `VITE_SUPABASE_ANON_KEY` (pour les fonctions serverless) |
| `CRON_SECRET` | Secret optionnel pour sécuriser l'endpoint keepalive |

> **Sécurité Braze** : la clé `BRAZE_API_KEY` n'est jamais exposée côté client (pas de préfixe `VITE_`). Le bouton Export Braze appelle `/api/export-braze` qui vérifie la session Supabase et le flag `is_admin` avant d'utiliser la clé.

### 3. Configurer les redirections Auth

Dans **Supabase → Authentication → URL Configuration**, ajouter l'URL Vercel dans **Redirect URLs**.

### 4. Keepalive anti-pause (projets Supabase Free)

Les projets Supabase Free se mettent en pause après 7 jours d'inactivité. Un Cron Vercel appelle une RPC légère deux fois par semaine :

1. Exécuter `supabase/keepalive.sql` dans le SQL Editor pour créer la fonction
2. Ajouter `CRON_SECRET` dans les variables Vercel (optionnel mais recommandé)
3. Le fichier `vercel.json` configure le cron automatiquement
4. Tester avec `GET /api/supabase-keepalive` après déploiement

---

## Scripts

```bash
npm run dev      # Serveur de développement (http://localhost:5173)
npm run build    # Build de production (dist/)
npm run preview  # Prévisualiser le build de production localement
```

---

## Contribuer / Étendre

### Ajouter un nouveau type de bloc

1. Ajouter une entrée dans `src/config/schema.js` → `SECTION_TYPES` avec `label`, `icon` (nom Lucide), et `factory()`
2. Ajouter la fonction de rendu dans `src/render/buildEmail.js`
3. Ajouter le formulaire d'édition dans `src/components/SectionEditor.jsx`

### Ajouter un picto d'encadré

Ajouter une entrée dans `src/config/calloutPictos.js` → `CALLOUT_PICTOS` avec `id`, `num`, `label`, `color`, `bgRgb`, et `svgInner` (chemin SVG pour viewBox 24×24).

### Modifier la palette de couleurs

Éditer `src/config/theme.js` pour les couleurs de marque, et `tailwind.config.js` pour les tokens Tailwind.
