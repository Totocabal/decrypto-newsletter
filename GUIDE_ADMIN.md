# Guide administrateur — Éditeur Décrypto

Ce guide est destiné aux membres avec le rôle **Admin**. Les fonctionnalités décrites ici ne sont pas accessibles aux utilisateurs standard.

---

## 1. Accès à l'interface admin

Cliquez sur l'icône ⚙ (engrenage) en haut à droite de la liste des newsletters. L'interface admin comporte trois onglets :

| Onglet | Contenu |
|--------|---------|
| **Gestion des comptes** | Approbation, création, droits |
| **Template newsletter** | Structure et contenu par défaut |
| **Labels** | Création et gestion des étiquettes |

---

## 2. Gestion des comptes

### Approuver un compte

Quand un utilisateur se connecte pour la première fois via magic link, son compte apparaît dans la liste **En attente d'approbation**. Cliquez **Approuver** — il accède à l'éditeur dans les secondes qui suivent.

### Révoquer un accès

Cliquez sur **Révoquer** sur un compte approuvé. L'utilisateur est immédiatement déconnecté et ne peut plus se reconnecter.

### Promouvoir / rétrograder admin

Le bouton **Admin** sur chaque compte bascule le statut administrateur. Un admin peut accéder à l'onglet Admin et utiliser l'Export Braze.

> Ne pas révoquer son propre compte admin — il n'y a pas de récupération depuis l'interface.

### Créer un compte directement

Sans attendre qu'un utilisateur se connecte lui-même, créez un compte depuis **Admin → Créer un compte** :

1. Saisissez l'**email** et le **nom affiché**
2. Cochez **Admin** si ce compte doit avoir les droits admin
3. L'outil génère un **mot de passe temporaire** — transmettez-le à l'utilisateur
4. L'utilisateur se connecte avec email + mot de passe temporaire, puis peut modifier son mot de passe

> Cette méthode ne dépend pas de l'envoi d'emails Supabase.

---

## 3. Template newsletter

Cet onglet configure la structure proposée à la création d'une nouvelle newsletter.

### Disposition des blocs

La liste centrale affiche les blocs dans l'ordre où ils apparaîtront dans la newsletter. Vous pouvez :

- **Ajouter un bloc** — cliquez sur un type dans la palette de droite (ou recherchez-le)
- **Réorganiser** — boutons ↑ ↓ ou glisser-déposer
- **Retirer un bloc** — bouton ✕ sur l'entrée

### Réglages par défaut

| Réglage | Effet |
|---------|-------|
| **Avec contenu** | Si activé, les nouveaux blocs sont pré-remplis avec les textes par défaut. Si désactivé, tous les champs démarrent vides. |
| **Numérotation des sections** | Active/désactive les numéros (01, 02…) par défaut |
| **Fond blanc** | Thème clair par défaut (vs sombre) |
| **Inclure la date** | Affiche ou masque la date d'édition par défaut |

### Sauvegarder la version par défaut

Cliquez **Sauvegarder version par défaut** — cette disposition est appliquée à toutes les nouvelles newsletters créées avec l'option "Version par défaut".

### Presets

Un preset est une disposition alternative que les utilisateurs peuvent choisir à la création.

**Créer un preset** — configurez la disposition souhaitée, cliquez **Nouveau preset**, donnez-lui un nom.

**Modifier un preset** — cliquez sur son nom dans la liste des presets. La disposition active est chargée. Modifiez-la, puis cliquez **Sauvegarder le preset**.

**Supprimer un preset** — bouton ✕ sur le preset dans la liste.

> Les presets sont partagés avec toute l'équipe et apparaissent dans la modale de création.

### Contenus par défaut

Cliquez **Contenus par défaut** pour éditer les textes initiaux de chaque type de bloc.

- La **colonne gauche** liste tous les types de blocs — un point cyan indique un contenu personnalisé
- La **colonne droite** affiche le formulaire d'édition complet du bloc sélectionné
- **Sauvegarder** — enregistre les textes pour ce type de bloc
- **Réinitialiser** — remet les textes d'origine

Ces textes sont utilisés quand l'option **Avec contenu** est activée à la création d'une newsletter.

---

## 4. Labels

Les labels sont des étiquettes colorées que les utilisateurs peuvent assigner à leurs newsletters pour les organiser.

### Créer un label

1. Saisissez un nom
2. Choisissez une couleur parmi la palette
3. Cliquez **Créer**

### Modifier / Supprimer

Chaque label existant peut être renommé, recoloré ou supprimé depuis la liste.

> Supprimer un label le retire de toutes les newsletters auxquelles il était assigné.

---

## 5. Export Braze

Le bouton **Export Braze** est réservé aux admins. Il :

1. Génère le HTML de la newsletter
2. Extrait toutes les images (graphiques, images uploadées…)
3. Les uploade dans la **Media Library Braze** via l'API
4. Retourne un fichier HTML avec les URLs CDN Braze définitives

### Prérequis

Les variables d'environnement suivantes doivent être configurées sur Vercel (côté serveur uniquement, jamais `VITE_*`) :

| Variable | Valeur |
|----------|--------|
| `BRAZE_API_KEY` | Clé API Braze avec permission `media_library.create` |
| `BRAZE_BASE_URL` | Ex. `https://rest.fra-01.braze.eu` |

---

## 6. Verrou d'édition — gestion des conflits

Chaque newsletter ne peut être éditée que par une personne à la fois. Le verrou expire automatiquement après **10 minutes** d'inactivité.

Si un utilisateur a oublié de fermer son onglet, un autre peut cliquer **Prendre la main** dès que le verrou est expiré. L'ancien éditeur est alors affiché en lecture seule lors de sa prochaine action.

En cas de problème persistant, un admin peut forcer la libération du verrou directement dans Supabase (table `locks`).

---

## 7. Déploiement et configuration Supabase

### Variables d'environnement (Vercel)

| Variable | Côté | Description |
|----------|------|-------------|
| `VITE_SUPABASE_URL` | Client | URL du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Client | Clé anon public Supabase |
| `VITE_AUTH_REDIRECT_URL` | Client | URL publique exacte de l'app |
| `SUPABASE_URL` | Serveur | Idem (pour les fonctions serverless) |
| `SUPABASE_ANON_KEY` | Serveur | Idem (pour les fonctions serverless) |
| `BRAZE_API_KEY` | Serveur | Clé API Braze |
| `BRAZE_BASE_URL` | Serveur | REST endpoint Braze |
| `CRON_SECRET` | Serveur | Secret pour protéger le keepalive |

### Redirect URLs Supabase

Dans **Supabase → Authentication → URL Configuration**, le champ **Redirect URLs** doit contenir l'URL Vercel de production (et le domaine custom si applicable). Sans cela, les magic links redirigent vers localhost.

### Keepalive (Supabase Free)

Les projets Supabase Free se mettent en pause après 7 jours d'inactivité. Un Cron Vercel appelle automatiquement une RPC légère deux fois par semaine.

Pour l'activer : exécutez `supabase/keepalive.sql` dans le SQL Editor Supabase, puis vérifiez que `SUPABASE_URL`, `SUPABASE_ANON_KEY` et `CRON_SECRET` sont bien renseignés dans Vercel.

---

## 8. Premier déploiement — checklist

- [ ] Projet Supabase créé et schéma `supabase/schema.sql` exécuté
- [ ] `supabase/admin-create-user.sql` exécuté (pour la création de comptes admin)
- [ ] Premier compte promu admin via `supabase/bootstrap-admin.sql`
- [ ] `supabase/keepalive.sql` exécuté
- [ ] Variables d'environnement configurées sur Vercel
- [ ] URL de l'app ajoutée dans **Supabase → Auth → Redirect URLs**
- [ ] Test de l'export Braze avec une newsletter de test

---

*Guide administrateur — version mai 2026.*
