# Décrypto — Newsletter Editor

Éditeur collaboratif de newsletters HTML pour **Décrypto**, l'hebdo crypto Coinhouse. Construit avec React + Vite côté front, **Supabase** (Postgres + Auth) côté backend, déployé sur Vercel.

---

## Fonctionnalités

### Éditeur

- **14 types de blocs** modulaires, réorganisables par glisser-déposer ou boutons ↑↓ :
  - `hero` · `sommaire` · `édito + KPI` · `graphique` · `fear & greed` · `signaux` · `macro / citation` · `barres macro` · `chiffre commenté` · `évènement` · `texte` · `texte & media` · `image` · `séparateur`
- Chaque bloc est **collapsible** ; actions de duplication et suppression dans l'en-tête
- **Texte & Media** : composition libre d'items texte riche, image, encadré (15 pictos + 9 couleurs) et CTA
- **Éditeur de texte riche** avec gras, italique, souligné, rayé, lien, liste à puces et liste numérotée
- Header et footer **fixes** (mentions légales PSAN garanties)
- Numérotation automatique des sections
- **Thème sombre / clair** commutable depuis l'en-tête

### Données auto

- **CoinGecko** : graphiques synchronisés (7j / 30j, EUR / USD), chips BTC / ETH dans le hero
- **Fear & Greed Index** : synchronisation en un clic
- Bouton **Synchroniser** global + bouton individuel par bloc

### Prévisualisation

- Aperçu **temps réel** Desktop (600 px) et Mobile (430 px)
- Vue **Code HTML** brut avec copie en un clic
- Fidèle aux principaux clients email (Gmail, Apple Mail, Outlook, iOS Mail)

### Export

- **Export ZIP** : `newsletter.html` + dossier `assets/` avec les images en PNG — prêt CDN
- **Export Braze** : upload automatique des images dans la Media Library Braze, HTML avec URLs CDN définitives

### Collaboration

- Auth par **magic link** (aucun mot de passe)
- **Validation manuelle des comptes** par un admin
- **Verrou d'édition** : un seul éditeur actif à la fois, TTL serveur 10 min
- **Bandeau de présence** avec prise de contrôle forcée si verrou expiré
- **Auto-save** serveur (debounce 2s)
- **Versions** : snapshot nommé avec auteur + commentaire, restauration depuis l'historique (50 versions)
- **Labels** colorés pour organiser la liste des newsletters
- **Archivage** des éditions terminées

### Admin

- Approbation / révocation des comptes, création directe avec mot de passe temporaire
- **Template newsletter** : configurer la disposition par défaut (blocs, numérotation, thème, date)
- **Contenus par défaut** : éditer les textes initiaux de chaque type de bloc
- **Presets** : sauvegarder des dispositions réutilisables par toute l'équipe

---

## Setup

### 1. Créer le projet Supabase

1. Va sur [supabase.com](https://supabase.com), crée un projet.
2. Région recommandée : **eu-central-1** (Francfort) pour la conformité RGPD.

### 2. Exécuter le schéma

Dans **SQL Editor** du dashboard Supabase, exécute `supabase/schema.sql`. Cela crée :

- Tables `profiles`, `newsletters`, `versions`, `locks`
- RLS policies, RPC `acquire_lock` / `release_lock`, triggers

### 3. Récupérer les clés API

Dans **Project Settings → API** :
- `Project URL` → `VITE_SUPABASE_URL`
- `anon public` key → `VITE_SUPABASE_ANON_KEY`

### 4. Lancer en local

```bash
cp .env.example .env
# Remplir .env avec les valeurs Supabase
npm install
npm run dev
```

### 5. Créer le premier compte admin

1. Ouvre `http://localhost:5173`, saisis ton email.
2. Clique le magic link reçu — compte en attente.
3. Dans Supabase → SQL Editor, exécute `supabase/bootstrap-admin.sql` avec ton email.
4. Recharge la page — accès à la liste.

### 6. Créer un compte depuis l'admin (optionnel)

Exécute `supabase/admin-create-user.sql` dans le SQL Editor, puis utilise **Admin → Créer un compte**.

---

## Déploiement Vercel

1. Push sur GitHub.
2. Import Project sur Vercel → ton repo.
3. Ajoute dans **Settings → Environment Variables** :

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | URL du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clé anon public Supabase |
| `VITE_AUTH_REDIRECT_URL` | URL publique exacte de l'app |
| `BRAZE_API_KEY` | Clé serveur Braze (`media_library.create`) |
| `BRAZE_BASE_URL` | REST endpoint Braze (ex. `https://rest.fra-01.braze.eu`) |
| `SUPABASE_URL` | Idem VITE_SUPABASE_URL (pour le keepalive serveur) |
| `SUPABASE_ANON_KEY` | Idem VITE_SUPABASE_ANON_KEY (pour le keepalive serveur) |

4. Dans Supabase → **Authentication → URL Configuration**, ajoute l'URL Vercel dans **Redirect URLs**.

### Export Braze sécurisé

La clé Braze est serveur uniquement (jamais `VITE_*`). Le bouton Export Braze appelle `/api/export-braze` qui vérifie la session Supabase et le flag `is_admin` avant d'utiliser `BRAZE_API_KEY`.

### Keepalive Supabase Free

Les projets Supabase Free se mettent en pause après 7 jours d'inactivité. Un Cron Vercel appelle une RPC légère deux fois par semaine.

1. Exécute `supabase/keepalive.sql` dans le SQL Editor.
2. Ajoute `CRON_SECRET` dans les variables Vercel (optionnel mais recommandé).
3. Teste `GET /api/supabase-keepalive` après déploiement.

---

## Structure du projet

```
src/
  config/
    theme.js              ← palette, polices, marque
    schema.js             ← modèle de données + template par défaut
    calloutPictos.js      ← 15 pictos + palette 9 couleurs pour les encadrés
  contexts/
    AuthContext.jsx        ← session + profil
  lib/
    supabase.js            ← client Supabase
    useNewsletter.js       ← hook : load + lock + auto-save
    templatePresets.js     ← presets de disposition admin
    useLabels.js           ← labels colorés
  pages/
    LoginPage.jsx
    PendingApprovalPage.jsx
    NewslettersListPage.jsx
    EditorPage.jsx
    AdminPage.jsx
  components/
    EditorPanel.jsx        ← panneau gauche : liste des blocs + paramètres
    SectionEditor.jsx      ← formulaires d'édition par type de bloc
    PreviewPanel.jsx       ← prévisualisation temps réel
    FormControls.jsx       ← éditeur de texte riche (Slate.js)
    VersionsPanel.jsx      ← historique des versions
    ImageManagerModal.jsx  ← gestionnaire d'images
    Toolbar.jsx
    Tooltip.jsx
    Wordmark.jsx
  render/
    buildEmail.js          ← génération HTML email (tables, inline CSS, SVG)
  App.jsx
  main.jsx
supabase/
  schema.sql
  admin-create-user.sql
  bootstrap-admin.sql
  keepalive.sql
api/
  export-braze.js          ← serverless function Vercel (upload images Braze)
  supabase-keepalive.js    ← serverless function Vercel (cron ping)
```

## Scripts

```bash
npm run dev      # serveur de développement (http://localhost:5173)
npm run build    # build de production
npm run preview  # prévisualiser le build
```
