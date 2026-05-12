# Décrypto — Newsletter Editor (collaboratif)

Éditeur collaboratif de newsletter HTML pour **Décrypto**, l'hebdo crypto
Coinhouse. React + Vite côté front, **Supabase** (Postgres + Auth) côté
backend.

## Fonctionnalités

### Éditeur

- **Éditeur modulaire** : la newsletter est composée de blocs réorganisables.
  Chaque bloc peut être monté/descendu/dupliqué/supprimé. Une palette de 10
  types de blocs disponibles (hero, sommaire, édito+KPI, graphique, jauge F&G,
  signaux, macro/citation, évènement, bloc texte libre, séparateur).
- Header et footer **fixes** pour garantir la présence des mentions PSAN.
- Numérotation automatique des sections selon leur position.
- **Graphique** édité par **sliders** (un par jour), pas de saisie de chiffres
  à la main.
- Éditeur split (formulaires à gauche, aperçu temps réel à droite)
- Aperçu Desktop / Mobile
- Vue Code HTML brut
- HTML email dark : tables imbriquées, inline CSS, fallbacks Outlook (mso),
  SVG inline (chart, gauge, logos), VML pour la carte évènement
- Preview text isolé (anti-aspiration Gmail)
- Responsive via media queries (640px breakpoint)

### Export

- **Copier HTML** : copie le HTML inline (avec SVG) dans le presse-papiers
- **Télécharger HTML** : un seul fichier `.html`, prêt à coller dans Mailjet
- **Export ZIP (asset pack)** : un ZIP contenant :
  - `email.html` avec des `<img src="assets/xxx.png">` au lieu des SVG inline
  - `assets/logo-header.png`, `logo-footer.png`, `chart.png`, `gauge.png` (en
    qualité 2× pour Retina)
  - `README.md` expliquant comment héberger les assets et adapter les chemins

### Collaboration (niveau 2 — asynchrone)

- **Auth par magic link** (pas de mot de passe)
- **Validation manuelle des comptes** par un admin
- **Liste des newsletters** centrale, multi-éditions
- **Verrou d'édition** : un seul éditeur actif à la fois sur une newsletter
- **Bandeau de présence** : on voit qui édite et depuis quand
- **Forçage de prise de contrôle** si quelqu'un a oublié de fermer son onglet
- **TTL serveur 10 min** : le verrou expire automatiquement si l'éditeur ferme
  brutalement
- **Auto-save serveur** (debounce 2s) sur l'état courant
- **Versions** : chaque "Sauvegarder" crée un snapshot avec auteur + commentaire
- **Restauration d'une version** depuis l'historique
- **Page admin** : approuver les comptes, promouvoir/révoquer

## Setup — étape par étape

### 1. Créer le projet Supabase

1. Va sur [supabase.com](https://supabase.com), crée un compte, puis un projet.
2. Choisis la région **eu-central-1** (Francfort) ou **eu-west-3** (Paris) pour
   la conformité RGPD.
3. Définis un mot de passe pour la base.
4. Attends ~2 min que le projet soit prêt.

### 2. Exécuter le schéma

Ouvre **SQL Editor** dans le dashboard Supabase, et exécute le contenu de
`supabase/schema.sql` (copier-coller). Cela crée :

- les tables `profiles`, `newsletters`, `versions`, `locks`
- les RLS policies (sécurité ligne par ligne)
- les RPC `acquire_lock` / `release_lock`
- les triggers (création de profil auto, touch updated_at)

### 3. Récupérer les clés API

Dans le dashboard Supabase → **Project Settings → API** :
- copie **Project URL** → ce sera `VITE_SUPABASE_URL`
- copie **anon public** key → ce sera `VITE_SUPABASE_ANON_KEY`

### 4. Configurer en local

```bash
cp .env.example .env
# Édite .env avec les deux valeurs récupérées
npm install
npm run dev
```

### 5. Créer le premier compte (admin)

1. Va sur `http://localhost:5173`.
2. Saisis ton email pro.
3. Ouvre le magic link reçu par email — tu es connecté mais en attente.
4. Dans Supabase → SQL Editor, exécute `supabase/bootstrap-admin.sql` après
   avoir remplacé l'email par le tien. Cela t'approuve et te promeut admin.
5. Reviens sur l'éditeur, clique "Rafraîchir" — tu accèdes à la liste.

### 6. Approuver les autres membres

Quand un collègue se connecte pour la première fois, son compte apparaît dans
**Admin → En attente d'approbation**. Clique "Approuver" et il accède à
l'éditeur dans les secondes qui suivent.

## Déploiement Vercel

1. Push sur GitHub (voir `.gitignore` qui exclut `.env` et `node_modules`).
2. Sur Vercel : Import Project → ton repo.
3. Dans **Settings → Environment Variables**, ajoute :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_AUTH_REDIRECT_URL` avec ton URL publique exacte
4. Deploy.
5. **Important** : dans Supabase → **Authentication → URL Configuration**,
   ajoute ton URL Vercel (et ton domaine custom) dans **Redirect URLs**.
   Sinon les magic links renverront vers localhost.

### Emails Supabase

Si le lien magique affiche `Error sending confirmation email`, le problème vient
du service email Supabase/Auth :

- vérifie **Authentication → URL Configuration** : `Site URL` et `Redirect URLs`
  doivent contenir l'URL de l'app ;
- vérifie **Authentication → SMTP Settings** si le projet n'utilise pas l'envoi
  email par défaut ou atteint ses limites ;
- le bouton **Lien magique** ne crée plus de compte automatiquement : l'email
  doit déjà correspondre à un utilisateur Supabase.

## Workflow type

1. **Anne** crée une newsletter dans la liste → "Nouvelle newsletter"
2. Elle l'édite, le contenu est auto-sauvegardé toutes les 2s sur Supabase
3. Quand elle a fini sa session, elle clique **Sauvegarder** → ça crée une
   **version** avec un commentaire ("brouillon édito Anne")
4. Elle ferme l'onglet → le verrou se libère
5. **Bertrand** ouvre la même newsletter → il prend le verrou, voit l'état
   laissé par Anne, ajuste les chiffres BTC, **Sauvegarde** ("relecture chiffres")
6. **Camille** ouvre l'historique → vérifie les deux versions, tout est OK
7. Camille **Copie HTML** et le colle dans Mailjet.

## Limites & extensions possibles

- **Pas d'édition simultanée temps réel** (par design — niveau 2). Si
  besoin, migrer vers Liveblocks / Yjs / Partykit.
- **Pas de notifications email** quand un compte est approuvé (l'utilisateur
  doit recharger la page). Ajout possible avec une Edge Function Supabase.
- **Pas de diff visuel** entre versions. Possible avec `jsondiffpatch`.
- **Pas de système de rôles fins** (lecteur seul, etc.). On a juste
  `approved` + `is_admin`.

## Structure du projet

```
src/
  config/
    theme.js            ← palette, polices, marque
    schema.js           ← structure du brouillon
  contexts/
    AuthContext.jsx     ← session + profil
  lib/
    supabase.js         ← client Supabase
    useNewsletter.js    ← hook : load + lock + save
  pages/
    LoginPage.jsx
    PendingApprovalPage.jsx
    NewslettersListPage.jsx
    EditorPage.jsx
    AdminPage.jsx
  components/
    Toolbar.jsx
    EditorPanel.jsx     ← formulaires d'édition
    PreviewPanel.jsx
    LockBanner.jsx
    VersionsPanel.jsx
    FormControls.jsx
  render/
    buildEmail.js       ← génération HTML email
  App.jsx               ← routeur
  main.jsx
supabase/
  schema.sql            ← migration initiale
  bootstrap-admin.sql   ← promouvoir le premier admin
```

## Scripts

```bash
npm run dev      # dev server (http://localhost:5173)
npm run build    # build de production
npm run preview  # prévisualiser le build
node render.mjs ./out.html   # générer un HTML email standalone (sans backend)
```
