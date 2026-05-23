# Guide utilisateur — Décrypto Newsletter Editor

> **À qui s'adresse ce guide ?** Aux administrateurs et éditeurs de l'outil. Les sections marquées 🔐 sont réservées aux admins.

---

## Table des matières

1. [Connexion et accès](#1-connexion-et-accès)
2. [Page d'accueil — Liste des newsletters](#2-page-daccueil--liste-des-newsletters)
3. [Créer une newsletter](#3-créer-une-newsletter)
4. [L'éditeur](#4-léditeur)
5. [Les blocs — référence complète](#5-les-blocs--référence-complète)
6. [Le gestionnaire d'images](#6-le-gestionnaire-dimages)
7. [Prévisualisation et export](#7-prévisualisation-et-export)
8. [Versions et historique](#8-versions-et-historique)
9. [Collaboration et verrous](#9-collaboration-et-verrous)
10. [Labels](#10-labels)
11. [Administration 🔐](#11-administration-)
    - [Gestion des comptes](#111-gestion-des-comptes)
    - [Template newsletter par défaut](#112-template-newsletter-par-défaut)
    - [Presets de disposition](#113-presets-de-disposition)
    - [Labels](#114-labels)
    - [Contenus par défaut](#115-contenus-par-défaut)

---

## 1. Connexion et accès

### Se connecter

1. Accéder à l'URL de l'application (ex. `https://newsletter.decrypto.com`)
2. Saisir son adresse email professionnelle
3. Cliquer sur le **magic link** reçu par email — aucun mot de passe à retenir
4. Si c'est la première connexion, le compte est **en attente d'approbation** par un admin. Un écran le signale ; aucune action n'est requise de ta part.

> Si un admin t'a créé un compte avec mot de passe temporaire, connecte-toi via le lien reçu et change ton mot de passe dès la première connexion.

### Se déconnecter

Bouton **Déconnexion** (icône de sortie) en haut à droite de l'écran d'accueil.

---

## 2. Page d'accueil — Liste des newsletters

C'est la page principale après connexion. Elle liste toutes les newsletters de l'équipe.

### Lire la liste

Chaque ligne affiche :
- Le **titre** de la newsletter
- La **date de dernière modification** et le **créateur**
- Le **texte de prévisualisation** (tronqué)
- Les **labels** assignés (pastilles colorées)
- Un **badge rouge** avec le nom de l'éditeur si la newsletter est en cours d'édition par quelqu'un

### Rechercher et filtrer

- **Recherche texte** : cherche dans le titre et le texte de prévisualisation. Un bouton × efface la recherche.
- **Tri** : menu déroulant avec 4 options — *Plus récent*, *Plus ancien*, *Titre A→Z*, *Titre Z→A*
- **Filtre par labels** : cliquer sur un ou plusieurs labels pour ne voir que les newsletters correspondantes. La logique est **OU** (une newsletter avec au moins un des labels sélectionnés est visible). Le bouton × réinitialise le filtre.

### Actions sur une newsletter

Survoler une ligne fait apparaître les icônes d'action (toujours visibles sur mobile) :

| Action | Icône | Description |
|---|---|---|
| Assigner des labels | Tag | Ouvre un menu de sélection rapide des labels |
| Dupliquer | Copier | Crée une copie de la newsletter (labels inclus) |
| Supprimer | Corbeille | Supprime définitivement — visible pour l'admin et le créateur uniquement |

Cliquer n'importe où sur la ligne ouvre l'éditeur.

---

## 3. Créer une newsletter

Cliquer sur **Nouveau Template** en haut à droite.

### Étape 1 — Choisir un point de départ

Trois options :

**Version par défaut**
Crée la newsletter avec les blocs du template configuré par l'admin, éventuellement préremplis avec du contenu d'exemple.

**Version vide**
Crée une newsletter sans blocs. À composer entièrement depuis l'éditeur.

**Preset**
Si des presets ont été enregistrés par l'équipe, ils apparaissent ici. Chacun affiche un résumé (*N blocs · clair/sombre · daté/sans date*). Cliquer sur un preset charge sa disposition.

### Étape 2 — Nommer la newsletter

- **Nom** (obligatoire) : ex. `Décrypto N°42`
- **Texte de prévisualisation** (optionnel) : affiché sous l'objet dans les boîtes de réception. Peut être généré automatiquement via le bouton **Améliorer** ✨

Cliquer sur **Créer** ouvre directement l'éditeur.

### Importer une newsletter Markdown

Depuis la liste des newsletters, cliquer sur **Importer Markdown**. La fenêtre est séparée en deux modules :

- **Assistant de génération Gemini** : créer des variantes de contenu CRM depuis une intention courte, choisir une variante, puis générer le Markdown importable ;
- **Importer un Markdown existant** : choisir un fichier `.md` ou `.markdown`, ou coller directement le contenu Markdown dans la zone dédiée.

Si Gemini produit un Markdown invalide, un encart de diagnostic affiche l'erreur, le `trace_id`, le Markdown généré et, si utile, la sortie brute Gemini. Le Markdown est aussi recopié dans la zone de collage pour pouvoir le corriger ou ajuster le prompt.

Avant création, une fenêtre de validation affiche :

- le titre importé ;
- les sections détectées ;
- la date et le texte de prévisualisation ;
- le fond clair ou sombre, la numérotation et les filets entre blocs ;
- les avertissements à relire.

Cliquer sur **Créer la newsletter** seulement après cette vérification.

Le fichier doit commencer par un front matter contenant au minimum `title`. Il peut aussi définir `theme_variant`, `show_section_numbers` et `show_block_separators`, qui restent modifiables dans la validation d'import. Le corps peut ensuite contenir du Markdown simple et des directives structurées pour les blocs avancés. Le fichier d'exemple `examples/newsletter-markdown-import-complet.md` couvre le format complet, et `MARKDOWN_IMPORT_SPEC.md` décrit la syntaxe de référence.

Après import, utiliser **Synchroniser** si un avertissement signale un graphique CoinGecko à rafraîchir.

---

## 4. L'éditeur

L'éditeur est découpé en deux zones côte à côte :
- **Panneau gauche** : liste et configuration des blocs
- **Panneau droit** : prévisualisation en temps réel

### 4.1 La barre d'outils supérieure

| Élément | Description |
|---|---|
| Logo | Retour à la liste (avec proposition de sauvegarder si des modifications sont en cours) |
| ← Retour | Idem (masqué sur mobile) |
| Titre de la newsletter | Cliquable pour renommer la newsletter en direct |
| Labels | Pastilles des labels assignés + bouton Tag pour en ajouter/retirer |
| Indicateur de sauvegarde | Affiche *Sauvegardé HH:MM*, *Sauvegarde…* ou *Lecture seule* |
| 🕐 Versions | Ouvre l'historique des versions |
| ↩ Annuler | Annule la dernière modification |
| ↪ Restaurer | Rétablit la modification annulée |

### 4.2 La barre d'outils secondaire (Toolbar)

Sous la barre principale, collée en haut de l'écran.

| Bouton | Description |
|---|---|
| **Aperçu / Code HTML** | Switche le panneau droit entre l'aperçu visuel et le code HTML brut |
| **Sauvegarder** | Crée une version numérotée avec commentaire optionnel |
| **Preset** 🔐 | Enregistre la disposition actuelle comme preset réutilisable |
| **Exporter** | Ouvre le menu d'export (ZIP ou Braze) |

> L'auto-save est actif en permanence (debounce 2 s). Le bouton **Sauvegarder** crée un point de restauration nommé — c'est différent.

### 4.3 Paramètres généraux (en haut du panneau gauche)

Deux toggles côte à côte :
- **Fond blanc / Fond sombre** : bascule entre le thème clair et le thème sombre de l'email
- **Numérotation** : affiche ou masque les numéros de section (01, 02, 03…)

### 4.4 Section En-tête (accordéon)

Cliquer sur **En-tête** pour déplier :

- **Nom de la marque** : affiché dans l'en-tête de l'email (ex. `COINHOUSE`)
- **Date** : affichée dans l'en-tête (ex. `JEUDI 15 MAI 2025`)
- **Texte de prévisualisation** : le texte affiché sous l'objet dans la boîte de réception. Le bouton ✨ **Générer** le rédige automatiquement à partir du contenu des blocs.

### 4.5 Zone des sections

Liste ordonnée de tous les blocs de la newsletter.

**En-tête de chaque bloc :**
- Poignée de drag-and-drop (⠿)
- Chevron pour plier/déplier
- Numéro de section en rose (si numérotation activée)
- Type du bloc en majuscules + aperçu du titre
- Boutons : **↑ Monter**, **↓ Descendre**, **Dupliquer**, **Supprimer**

**Corps du bloc :** formulaire de contenu (voir [Section 5](#5-les-blocs--référence-complète))

**Toggle de numérotation** (en bas de chaque bloc ouvert) :
- *Ce bloc reçoit un numéro et apparaît dans le sommaire auto*
- *Ce bloc reste sans numéro et hors sommaire auto*

**Réorganiser les blocs**
Glisser un bloc par sa poignée ⠿ pour le déplacer. Une carte fantôme avec bordure rose indique la position de destination.

**Bouton Synchroniser** (gradient bleu→rose→rouge, en haut de la zone sections)
Met à jour en un clic :
- Le sommaire (entrées regénérées depuis les titres des blocs numérotés)
- Les pastilles BTC/ETH/F&G du Hero (données CoinGecko en temps réel)
- Les graphiques Chart en mode automatique

**Ajouter un bloc**
Le bouton **— Ajouter un bloc** (en bas de la liste) ouvre une palette de tous les types disponibles en grille 2 colonnes. Cliquer sur un type l'ajoute en bas de la liste.

### 4.6 Section Pied de page (accordéon)

- **Liens du footer** : liste de liens (libellé + URL), modifiables et supprimables. Bouton *Ajouter un lien*.
- **Adresse / mentions PSAN** : texte de l'adresse légale
- **Disclaimer légal** : texte des mentions légales
- **Lien désinscription** : URL de désinscription (Braze liquid tag par défaut)

> Le header et le footer sont **fixes** dans l'email généré : ils sont toujours présents pour garantir la conformité réglementaire PSAN.

---

## 5. Les blocs — référence complète

### 🟣 Hero — Bandeau principal

Le premier bloc visible de la newsletter.

| Champ | Description |
|---|---|
| Kicker | Texte fin au-dessus du titre (ex. `━━  DÉCRYPTO · L'HEBDO COINHOUSE`) |
| Titre — ligne 1 | Première partie du titre |
| Titre — ligne 2 | Deuxième partie (avant le mot accentué) |
| Mot d'accent | Affiché en magenta (#FF00AA) |
| Sous-titre | Corps de l'accroche (éditeur riche) |
| Pastilles (chips) | Voir ci-dessous |

**Pastilles :**
Chaque pastille a un **type** :
- **Manuel** : libellé saisi à la main
- **BTC auto** / **ETH auto** : prix et variation récupérés depuis CoinGecko (bouton 🔄 pour rafraîchir individuellement)
- **F&G auto** : valeur Fear & Greed (bouton 🔄)

Le bouton global **Synchroniser** dans le panneau gauche rafraîchit toutes les pastilles auto en une fois.

---

### 📋 Sommaire

Table des matières de l'édition.

| Champ | Description |
|---|---|
| Libellé du bloc | Titre affiché (ex. `Au sommaire`) |
| Entrées | Paires numéro + titre, ordonnées et supprimables |

Le bouton **Sync blocs** (🔄) régénère automatiquement les entrées depuis les titres des blocs numérotés de la newsletter.

---

### 📰 Édito + KPI

Bloc éditorial avec grille de chiffres clés.

| Champ | Description |
|---|---|
| Kicker | Surtitre (ex. `ÉDITO`) |
| Titre | Titre de l'édito |
| Corps | Texte riche |
| Grille KPI | Rangée de chiffres clés |

**Chaque KPI :**
- **Label** et **Valeur** (ex. `Volume BTC` / `42 Md$`)
- **Variation** (ex. `+12 %`) et **Ton** : *Positif (cyan)*, *Négatif (rouge)*, *Attention (orange)*, *Neutre*

Boutons Monter / Descendre / Dupliquer / Supprimer sur chaque KPI. Bouton **Ajouter un KPI** en bas.

---

### 📈 Graphique

Graphique de cours sur 7 ou 30 jours.

**Mode Auto (CoinGecko)**
1. Sélectionner la **Crypto** dans la liste (60 cryptos disponibles)
2. Choisir la **Devise** (€ ou $) et la **Période** (7j ou 30j)
3. Cliquer sur 🔄 **Rafraîchir** pour récupérer les données
4. Les champs Libellé, Valeur, Variation, Ton et Sous-variation se remplissent automatiquement

**Mode Manuel**
- Saisir les champs Libellé, Valeur, Variation, Ton, Sous-variation
- Ajuster les **7 points de la courbe** via des sliders (0–100)
- Saisir les **étiquettes de l'axe X** séparées par des virgules (ex. `Lun,Mar,Mer,Jeu,Ven,Sam,Dim`)

---

### 😰 Fear & Greed

Jauge de sentiment du marché crypto.

| Champ | Description |
|---|---|
| Kicker | Surtitre |
| Titre | Titre du bloc |
| Valeur (0–100) | Slider + saisie numérique. La classification (*Extreme Fear / Fear / Neutral / Greed / Extreme Greed*) se calcule automatiquement. |
| Commentaire | Texte riche |

---

### 📡 Signaux

Grille de signaux haussiers/baissiers. Affichage en grille 2×2 — idéalement 4 signaux.

| Champ | Description |
|---|---|
| Kicker | Surtitre |
| Titre | Titre du bloc |
| Signaux | Liste de signaux (accordéon collapsible) |

**Chaque signal :**
- **Direction** : *Positif (↗ cyan)* ou *Négatif (↘ orange)*
- **Titre** du signal
- **Description** (texte court)

Bouton **Ajouter un signal** en bas.

---

### 🌍 Analyse macro

Bloc macro-économique avec citation mise en avant.

| Champ | Description |
|---|---|
| Kicker | Surtitre |
| Titre | Titre du bloc |
| Corps | Texte riche |
| Citation | Texte de la citation |
| Auteur | Nom de l'auteur de la citation |
| Image de fond | Image 1280×480 px pour le fond de la zone citation (picker images) |

---

### 📊 Barres macro

Comparatif visuel sous forme de barres horizontales.

Pour chaque barre :
- **Libellé** + **Valeur** (ex. `Inflation EU` / `2,3 %`)
- **% de remplissage** (0–100) qui détermine la largeur visuelle
- **Commentaire** court affiché à droite

Bouton **Ajouter une barre** en bas.

---

### 🔢 Chiffre commenté

Mise en avant d'un grand chiffre clé avec contexte éditorial.

| Champ | Description |
|---|---|
| Libellé | Titre court du chiffre |
| Légende | Sous-titre |
| Chiffre | Valeur numérique principale |
| Unité | Ex. `Md$`, `%`, `BTC` |
| Titre | Titre de la section de commentaire |
| Commentaire | Texte riche |

---

### 📅 Évènement

Carte d'évènement avec date et bouton d'action.

| Champ | Description |
|---|---|
| Jour / Mois / Année | Date de l'évènement (3 champs séparés) |
| Kicker | Surtitre |
| Titre | Nom de l'évènement |
| Description | Texte de description |
| Texte du bouton | Libellé du CTA |
| Lien du bouton | URL cible |
| Image de fond | Image 1280×480 px pour le fond de la carte (picker images) |

---

### 🖼️ Texte & Media

Le bloc le plus flexible. Il contient une liste libre d'**items** de 5 types différents, combinables et réordonnables.

**Champs d'en-tête du bloc :** Kicker et Titre

Chaque item peut être monté, descendu et supprimé. Boutons d'ajout en bas : **Texte**, **Image**, **CTA**, **Encadré**, **Spacer**.

---

#### Item — Texte

Éditeur de texte riche : gras, italique, souligné, rayé, lien, liste à puces, liste numérotée.

---

#### Item — Image

- Sélectionner une image via le **gestionnaire d'images** (sélection simple ou multi-sélection)
- **Texte alternatif (alt)** : pour l'accessibilité et l'affichage si l'image ne charge pas
- **Lien** (optionnel) : si renseigné, l'image devient cliquable

---

#### Item — CTA (appel à l'action)

**Bouton principal** (dégradé Décrypto) :
- **Texte** du bouton
- **Lien** URL cible
- Toggle **Centrer** (≡)
- Toggle **Flèche →**

**Bouton secondaire** (outline, optionnel) — apparaît automatiquement si son champ Texte est renseigné :
- **Texte** + **Lien**
- Toggle **Flèche →**

> Le bouton principal est rendu en **PNG avec dégradé** dans les exports ZIP et Braze.

---

#### Item — Encadré (callout)

Bloc mis en avant avec pictogramme et couleur thématique.

**1. Choisir une couleur** parmi 9 teintes :

| Couleur | Hex |
|---|---|
| Cyan | `#00FFFF` |
| Menthe | `#03FFCF` |
| Bleu | `#4141FF` |
| Rose | `#FF00AA` |
| Orange | `#FF8B28` |
| Corail | `#FF4B28` |
| Violet | `#B36BFF` |
| Jaune | `#FFE600` |
| Blanc | `#FFFFFF` |

**2. Choisir un picto** (toggle pour afficher/masquer, grille 8 par ligne) :

| N° | Libellé | Usage typique |
|---|---|---|
| 01 | À noter | Information neutre |
| 02 | On décrypte | Explication, définition |
| 03 | L'intuition | Analyse, prédiction |
| 04 | L'épingle | Point clé à retenir |
| 05 | Prudence | Risque, mise en garde |
| 06 | Signal faible | Tendance émergente |
| 07 | Mise en contexte | Historique, comparaison |
| 08 | Pour aller plus loin | Lecture recommandée |
| 09 | Le bon moment | Timing, opportunité |
| 10 | L'essentiel | Résumé, conclusion |
| 11 | Marché US | Actualité américaine |
| 12 | Zone euro | Actualité européenne |
| 13 | Bitcoin | Spécifique BTC |
| 14 | Ethereum | Spécifique ETH |
| 15 | Vous nous demandez | Q&R, réponse lecteur |

> Au survol d'un picto, un aperçu agrandi flotte au-dessus pour faciliter le choix.

**3. Remplir le contenu :**
- **Libellé** : texte court à côté du picto (ex. `Note de la rédac`)
- **Texte** : corps de l'encadré (éditeur riche)
- **Ligne de bas** (optionnel) : mention ou lien en bas de l'encadré + URL cible

---

#### Item — Spacer

Espace vertical vide entre les items. Slider de **0 à 120 px** (pas de 2 px).

---

### 🖼️ Image

Image pleine largeur avec légende optionnelle.

| Champ | Description |
|---|---|
| Image | Picker (gestionnaire d'images) |
| Alt | Texte alternatif |
| Lien | Optionnel : rend l'image cliquable |

---

### ✏️ Texte

Paragraphe de texte libre avec titre et CTA optionnel.

| Champ | Description |
|---|---|
| Kicker | Surtitre |
| Titre | Titre de la section |
| Corps | Éditeur de texte riche |
| Bouton (gradient) | Texte + Lien — laisser vide pour ne pas afficher le bouton |

---

### ─ Séparateur

Séparateur visuel entre deux sections. Trois styles :
- **Fin (1 px)** : fine ligne horizontale
- **Épais (4 px)** : barre épaisse
- **Dégradé Coinhouse** : barre dégradée aux couleurs de la marque

---

## 6. Le gestionnaire d'images

Accessible depuis le bouton **Images** dans le header principal, ou depuis tout champ image d'un bloc.

### Importer des images

**Zone de drop** (panneau gauche) : glisser-déposer une ou plusieurs images, ou cliquer sur **Choisir des fichiers**.

Formats acceptés : PNG, JPEG, GIF, WebP.

**Option de compression** : la case **Compresser et convertir en PNG avant l'upload** est cochée par défaut. Elle réduit la taille des fichiers avant envoi. Un message vert confirme la compression (*ex. Compression : 2,4 Mo → 380 Ko*).

Le **bloc Stockage** affiche la barre de remplissage du bucket avec l'espace utilisé et restant.

### Naviguer dans la bibliothèque

**Modes d'affichage** (switcher en haut à droite du panneau bibliothèque) :
- **4** — Grille 4 colonnes (vue par défaut)
- **8** — Grille compacte 8 colonnes
- **16** — Grille micro 16 colonnes
- **Liste** — Vue tabulaire avec vignettes

**Filtrer par labels** : cliquer sur une ou plusieurs pastilles de label filtre la grille (logique OU). Bouton × pour réinitialiser.

### Sélectionner une image

**Sélection simple** : cliquer sur une image ouvre son panneau de détail → **Sélectionner** l'insère dans le bloc.

**Mode multi-sélection** (bouton **Sélection**) :
- Les cartes sélectionnées s'entourent d'une **bordure rose**
- Bouton **Utiliser (N)** : insère toutes les images sélectionnées (dans les blocs qui le supportent)
- Bouton **Tout sélectionner** / **Tout retirer**
- Bouton **Supprimer (N)** : suppression groupée (confirmation requise)

### Panneau de détail d'une image

Cliquer sur une image (hors mode multi-sélection) ouvre son panneau de détail en plein overlay :

- Aperçu grande taille
- Propriétés : nom, taille, type, dates de création et modification, chemin
- **URL publique** : lien copiable (ouvre dans un nouvel onglet)
- **Labels** : pastilles cliquables — cliquer sur un label l'assigne ou le retire (une coche ✓ indique les labels déjà assignés)
- **Sélectionner** : insère l'image dans le bloc
- **Supprimer** : suppression définitive de l'image (irréversible)

---

## 7. Prévisualisation et export

### Prévisualiser

Le panneau droit de l'éditeur est toujours synchronisé avec le contenu.

- **Desktop** : rendu à 600 px de large (standard email)
- **Mobile** : rendu à 430 px, centré avec bordure
- **Plein écran** (Maximize) : la prévisualisation occupe tout l'écran. Bouton Minimize pour sortir.

### Exporter en JPG

Le bouton **⬇ Export JPG** (en haut du panneau aperçu) génère une capture d'écran de la newsletter via un rendu serveur (Puppeteer/Chromium). Le fichier `preview-desktop.jpg` ou `preview-mobile.jpg` est téléchargé automatiquement.

### Voir le code HTML

Switcher sur **Code HTML** dans la toolbar affiche le code source complet de l'email généré. Utiliser ce code pour un envoi manuel ou un débogage.

### Exporter en ZIP

Bouton **Exporter → Export ZIP** :

1. Génère le HTML complet de l'email avec des chemins relatifs `assets/…`
2. Télécharge toutes les images référencées et les convertit en PNG
3. Génère les boutons CTA gradient en PNG via canvas navigateur
4. Crée l'archive `newsletter.zip` contenant :
   - `newsletter.html`
   - Dossier `assets/` avec tous les PNG

L'archive est prête à uploader sur un CDN ou à intégrer directement dans un ESP.

### Exporter vers Braze 🔐

Bouton **Exporter → Export Braze** (admins uniquement) :

1. Appel sécurisé à la fonction serverless Vercel (clé API Braze côté serveur uniquement)
2. Upload de chaque image dans la **Braze Media Library**
3. Génération du HTML final avec les URLs CDN Braze définitives
4. Téléchargement du fichier HTML Braze prêt à l'emploi

### Enregistrer comme preset 🔐

Depuis la toolbar (bouton 🔖 **Preset**) : sauvegarde la disposition ET le contenu des blocs actuels comme preset partagé avec l'équipe. Saisir un nom puis **Enregistrer**.

---

## 8. Versions et historique

### Créer une version

Cliquer sur **Sauvegarder** dans la toolbar. Une dialog propose d'ajouter un **commentaire optionnel** (ex. *Version finale après relecture*). Les versions sont numérotées automatiquement.

> L'auto-save sauvegarde continuellement les modifications sur le serveur mais ne crée **pas** de version. Le bouton **Sauvegarder** est le seul moyen de créer un point de restauration nommé.

### Consulter l'historique

Bouton 🕐 **Versions** dans la barre supérieure. Le panneau liste les **50 dernières versions**, de la plus récente à la plus ancienne. Pour chaque version :

- Numéro de version, date et heure
- Auteur (nom ou email)
- Commentaire ou *Sans commentaire* en italique

### Restaurer une version

Cliquer sur **↺ Restaurer** sur la version souhaitée → dialog de confirmation → l'état courant de la newsletter est remplacé.

### Dialog "Quitter sans sauvegarder"

Si tu cliques sur **Retour** avec des modifications non versionnées, une dialog propose :
- **Confirmer** : crée une version avant de quitter
- **Passer** : quitte sans créer de version
- **Annuler** : reste dans l'éditeur

---

## 9. Collaboration et verrous

L'outil permet à toute l'équipe d'accéder aux mêmes newsletters, mais **un seul éditeur actif à la fois** par newsletter pour éviter les conflits d'écriture.

### Verrou d'édition

À l'ouverture d'une newsletter, un verrou est automatiquement acquis. Il est renouvelé toutes les 2 minutes tant que l'onglet est actif, et expire après **10 minutes** d'inactivité.

### Bandeau rouge — Lecture seule

Si quelqu'un d'autre détient déjà le verrou, un **bandeau rouge** s'affiche en haut de l'éditeur :

> *Thomas Dupont édite cette newsletter depuis 3 min. Tu es en lecture seule.*

L'éditeur entier est grisé et non interactif.

Deux options disponibles :
- **Retour** : retourner à la liste des newsletters
- **Forcer la prise de contrôle** (⚠) : prend le verrou de force. Une confirmation est demandée — les modifications non sauvegardées de l'autre éditeur risquent d'être écrasées.

### Bandeau jaune — Demande d'accès reçue

Si tu détiens le verrou et qu'un collègue tente d'accéder à la même newsletter, un **bandeau jaune animé** (slide depuis le haut) apparaît pendant **8 secondes** :

> *Marie Martin souhaite accéder à l'édition de cette newsletter.*

Ce bandeau est purement informatif — il n'y a pas de bouton Accepter/Refuser. Tu peux choisir de finir ton travail ou de sauvegarder et fermer pour laisser la place.

### Notification de prise de contrôle

Si quelqu'un force la prise de contrôle pendant que tu édites, un **toast rouge** s'affiche instantanément :

> *Marie Martin a pris la main sur l'édition.*

Tu bascules immédiatement en lecture seule.

### Consulter qui édite quoi

Sur la page d'accueil, les newsletters en cours d'édition affichent un **badge rouge** avec le nom de l'éditeur actif.

---

## 10. Labels

Les labels permettent d'organiser et de filtrer les newsletters et les images par thème (ex. `Marché`, `Macro`, `Régulation`, `BTC`).

### Assigner un label à une newsletter

**Depuis la liste** : survoler une ligne → icône Tag → menu de sélection des labels (clic = toggle immédiat).

**Depuis l'éditeur** : cliquer sur le bouton Tag dans la barre supérieure à côté du titre.

### Assigner un label à une image

Ouvrir le panneau de détail d'une image dans le gestionnaire → section **Labels** → cliquer sur les pastilles pour assigner ou retirer.

### Filtrer par labels

- **Page liste** : barre de filtres sous la recherche
- **Gestionnaire d'images** : barre de filtres en haut de la bibliothèque

Dans les deux cas, la logique est **OU** : un élément est visible s'il a *au moins un* des labels sélectionnés.

---

## 11. Administration 🔐

Accessible via le bouton **Admin** dans le header (visible uniquement pour les admins).

L'admin est organisé en **3 onglets** : Gestion des comptes · Template newsletter · Labels.

---

### 11.1 Gestion des comptes

#### Créer un compte

Formulaire en haut de l'onglet :
1. Saisir l'**email** (ex. `prenom.nom@coinhouse.com`)
2. Saisir le **Nom** affiché dans l'interface
3. Activer le toggle **Admin** si la personne doit avoir les droits d'administration
4. Cliquer sur **Créer**

Un encadré vert apparaît avec l'email et le **mot de passe temporaire**. Utiliser **Copier les identifiants** pour le transmettre à la personne.

#### Approuver un compte

Les comptes créés via magic link arrivent **en attente d'approbation**. La section *Comptes en attente d'approbation* les liste avec un badge bleu **Google** si la connexion est OAuth Google.

Cliquer sur **Approuver** donne immédiatement accès à l'outil.

#### Gérer les comptes approuvés

La section *Comptes approuvés* liste tous les comptes actifs (sauf le tien). Pour chacun :
- Badge violet **Admin** s'il a les droits d'administration
- Bouton **Promouvoir admin** ou **Retirer admin** selon son statut actuel
- Bouton **Révoquer** (rouge) : révoque l'accès à l'outil. Le compte reste dans Supabase Auth mais perd l'accès.

#### Gérer les verrous actifs

La section **Verrous actifs** liste tous les verrous en cours :
- Titre de la newsletter concernée
- Nom/email de l'éditeur qui détient le verrou
- Heure d'expiration
- Badge **Expiré** si le verrou aurait dû se libérer automatiquement

Bouton **Déverrouiller** (rouge) sur chaque verrou : libère le verrou de force. Utile quand un éditeur a fermé son navigateur sans libérer le verrou et que le TTL n'est pas encore atteint.

Bouton **Rafraîchir** (🔄) pour recharger la liste.

---

### 11.2 Template newsletter par défaut

Cet onglet configure ce que les utilisateurs obtiennent en créant une newsletter en **Version par défaut**.

> Si un autre admin ouvre cet onglet simultanément, un **bandeau rose animé** t'en avertit.

L'interface est organisée en **3 colonnes** :

#### Colonne gauche — Bibliothèque

Tous les 14 types de blocs disponibles avec un champ de recherche. Cliquer sur **+** ajoute le bloc à la composition active.

#### Colonne centrale — Composition active

La liste ordonnée des blocs du template. Actions sur chaque bloc :
- ⠿ Poignée de glisser-déposer
- Toggle **Numéroté / Non numéroté**
- ↑ ↓ **Monter / Descendre**
- × **Retirer** de la composition

Boutons d'action en haut :
- **Réinitialiser** (↺) : recharge les blocs codés en dur par défaut
- **Vider les blocs** (×) : vide la composition après confirmation
- **Contenus par défaut** (✏️) : ouvre le modal d'édition des textes d'exemple (voir [11.5](#115-contenus-par-défaut))
- **Sauvegarder version par défaut** (💾 / ✓) : enregistre la composition et les réglages

#### Colonne droite — Réglages par défaut

Quatre toggles qui s'appliquent à la création via *Version par défaut* :

| Réglage | Description |
|---|---|
| Contenu d'exemple | Blocs préremplis avec du dummy text configuré dans Contenus par défaut |
| Numérotation des blocs | Affiche 01, 02, 03… en marge |
| Fond clair | Email en thème clair (logo sombre) |
| Date d'en-tête | Date pré-remplie automatiquement à la création |

---

### 11.3 Presets de disposition

Les presets sont des configurations de blocs **partagées avec toute l'équipe**, disponibles dans le modal de création de newsletter.

#### Créer un preset

**Méthode 1 — Depuis l'éditeur** (recommandée pour capturer le contenu réel)
1. Ouvrir une newsletter bien configurée
2. Toolbar → bouton 🔖 **Preset**
3. Saisir un nom → **Enregistrer**
Le preset capture la disposition ET le contenu des blocs.

**Méthode 2 — Depuis l'admin**
Section **Presets partagés** (colonne droite) → bouton **Créer un preset** → saisir un nom.
Capture la composition active de la colonne centrale au moment de la création.

#### Charger et modifier un preset

Dans la section **Presets partagés** (colonne droite) : cliquer sur un preset le **charge dans la composition active**. Un bandeau *Preset en édition : {nom}* apparaît en haut.

Modifier la composition → **Sauvegarder le preset** (fond rose) pour enregistrer les changements.

Bouton **Revenir au template par défaut** pour quitter sans sauvegarder.

#### Supprimer un preset

Bouton × à droite du preset dans la liste. Visible si tu es admin ou créateur du preset. Si tu n'es ni l'un ni l'autre, une icône 🔒 indique que la suppression n'est pas disponible.

---

### 11.4 Labels

Création et gestion des labels utilisables sur les newsletters et les images.

#### Créer un label

1. Saisir un **Nom** (ex. `Marché`, `Macro`, `Régulation`)
2. Choisir une **Couleur** parmi les 10 pastilles disponibles
3. Cliquer sur **Créer** (+)

#### Modifier un label

Bouton ✏️ **Modifier** → le nom devient un champ texte et la palette de couleurs apparaît → **Sauver** (✓) ou **Annuler**.

#### Supprimer un label

Bouton × rouge à droite du label. La suppression retire le label de **toutes** les newsletters et images auxquelles il est assigné.

---

### 11.5 Contenus par défaut

Accessible depuis l'onglet **Template newsletter** → bouton **Contenus par défaut** (✏️).

Ce modal permet de personnaliser les textes qui préremplissent chaque type de bloc lorsqu'une newsletter est créée avec l'option **Contenu d'exemple** activée.

#### Modifier un contenu par défaut

1. **Sélectionner un type de bloc** dans la colonne gauche
   - Un point cyan signale les types dont le contenu a été modifié par rapport au texte d'usine
2. Le **formulaire complet** du type s'affiche à droite — remplir les champs comme dans l'éditeur habituel
3. Cliquer sur **Sauvegarder** (💾) pour enregistrer

#### Réinitialiser un contenu

Bouton ↺ **Réinitialiser** : revient au texte d'exemple d'usine pour ce type de bloc.

> Ces contenus sont stockés en **localStorage** dans le navigateur de l'admin qui les configure. Pour partager des contenus complets entre admins et entre machines, utiliser plutôt les **Presets** qui, eux, sont stockés en base de données.

---

## Raccourcis et astuces

| Action | Méthode |
|---|---|
| Synchroniser BTC/ETH/F&G/Sommaire | Bouton **Synchroniser** (gradient) dans la zone des sections |
| Générer le texte de prévisualisation IA | Bouton ✨ dans l'en-tête ou à la création de newsletter |
| Corriger l'orthographe | Bouton de correction disponible dans certains champs texte |
| Annuler une modification | Bouton ↩ dans la barre supérieure (désactivé en lecture seule) |
| Restaurer après annulation | Bouton ↪ dans la barre supérieure |
| Voir qui édite en ce moment | Badge rouge sur la ligne de la liste |
| Libérer un verrou bloqué | Admin → Gestion des comptes → Verrous actifs → Déverrouiller |
| Dupliquer une newsletter | Icône Copier au survol d'une ligne dans la liste |
| Réordonner les blocs | Glisser la poignée ⠿ à gauche de chaque bloc |
| Replier un bloc | Cliquer sur son chevron dans la barre de titre |
| Ajouter un bloc en bas de liste | Bouton **— Ajouter un bloc** en bas du panneau |
| Exporter une capture JPG | Bouton ⬇ **Export JPG** dans le panneau aperçu |
