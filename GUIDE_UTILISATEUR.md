# Guide utilisateur — Éditeur Décrypto

---

## 1. Vue d'ensemble

L'éditeur Décrypto permet de créer des newsletters visuelles prêtes à l'envoi sans écrire une ligne de code. L'interface est divisée en trois zones :

- **Panneau gauche** — liste des blocs et paramètres généraux de la newsletter
- **Zone centrale** — formulaire d'édition du bloc sélectionné
- **Panneau droit** — prévisualisation live de l'email

---

## 2. La liste des newsletters

### Créer une newsletter

Cliquez sur **Nouvelle newsletter**. Choisissez un point de départ :

| Option | Description |
|--------|-------------|
| **Version par défaut** | Structure standard Décrypto (hero, sommaire, blocs éditoriaux, pied de page) |
| **Version vide** | Page blanche, aucun bloc ajouté |
| **Preset** | Structure personnalisée enregistrée par l'équipe |

Une modale vous demande ensuite :
- **Nom** *(obligatoire)* — titre interne de la newsletter, non affiché dans l'email
- **Texte de prévisualisation** *(facultatif)* — texte affiché sous l'objet dans la boîte de réception

### Rechercher et filtrer

- **Barre de recherche** — filtre par nom de newsletter
- **Labels** — filtres colorés assignés à chaque newsletter (ex. : "En cours", "Envoyée")
- **Archiver** — masque une newsletter terminée de la liste principale

### Dupliquer

Dupliquez une newsletter existante pour en créer une variante depuis son menu.

### Verrou d'édition

Un cadenas affiché sur une carte indique qu'un autre utilisateur édite cette newsletter. Si le verrou est expiré (plus de 10 min d'inactivité), un bouton **Prendre la main** apparaît.

---

## 3. L'éditeur

### Paramètres globaux (panneau gauche, en haut)

| Champ | Description |
|-------|-------------|
| **Nom** | Titre interne |
| **Numéro d'édition** | Numéro de la newsletter |
| **Date** | Date de parution (calculée au jeudi, modifiable) |
| **Texte de prévisualisation** | Texte affiché sous l'objet |
| **Fond blanc** | Bascule entre le thème sombre (défaut) et clair |
| **Numérotation** | Active/désactive les numéros de sections (01, 02…) |

### Gestion des blocs

**Ajouter** — cliquez sur le `+` entre deux blocs pour insérer un bloc à cet endroit. 14 types disponibles.

**Réduire / développer** — cliquez sur l'en-tête d'un bloc pour le replier. Le contenu est conservé.

**Réorganiser** — boutons ↑ ↓ dans l'en-tête, ou glisser-déposer via l'icône ⠿ à gauche.

**Dupliquer / Supprimer** — boutons dans l'en-tête de chaque bloc.

### La prévisualisation

- **Bureau / Mobile** — bascule entre les deux vues (mobile = 430 px)
- **Aperçu / Code HTML** — affiche le rendu visuel ou le code source brut

La prévisualisation se met à jour en temps réel à chaque modification.

### Synchronisation des données automatiques

Le bouton **Synchroniser** (haut du panneau gauche) met à jour en un clic :

- Les graphiques en mode **Auto CoinGecko** (7 ou 30 derniers jours)
- Les chips du Hero en mode **BTC auto / ETH auto** (variation du jour)
- L'indice **Fear & Greed** (valeur actuelle)

Chaque bloc peut aussi être rafraîchi individuellement via son bouton 🔄.

### Annuler / Rétablir

`Cmd/Ctrl + Z` / `Cmd/Ctrl + Shift + Z` — annulable pendant toute la session.

### Sauvegarder une version

Cliquez sur **l'icône disquette** (haut de page). Une fenêtre vous demande un commentaire optionnel (ex. : "Ajout du bloc signaux"). Jusqu'à 50 versions sont conservées.

### Historique des versions

Cliquez sur **l'icône horloge** (haut de page). La liste des versions sauvegardées apparaît avec la date, l'auteur et le commentaire. Cliquez sur **Restaurer** pour revenir à une version antérieure. Les restaurations sont réversibles.

---

## 4. Les blocs en détail

### Blocs de structure

**Hero** — En-tête de la newsletter. Kicker, titre en deux parties avec un mot en couleur magenta, sous-titre en texte riche, et jusqu'à 3 chips (BTC, ETH, Fear & Greed, ou texte manuel).

**Sommaire** — Table des matières. Listez les entrées manuellement ou cliquez **Synchroniser les sections** pour les générer automatiquement depuis les blocs existants. Les entrées deviennent des liens d'ancre dans l'email.

**Séparateur** — Ligne de séparation entre deux blocs. Trois styles : fin (1 px), épais (4 px), dégradé Coinhouse.

---

### Blocs éditoriaux

**Édito + KPI** — Texte long en texte riche + indicateurs chiffrés. Chaque KPI comporte un libellé, une valeur, une variation et une tonalité (positif / négatif / attention / neutre).

**Texte & Media** — Bloc modulaire : un kicker, un titre, puis une liste d'items dans n'importe quel ordre :
- **Texte** — paragraphe en texte riche
- **Image** — photo depuis le gestionnaire d'images
- **Encadré** — bloc Note de la rédaction (voir section dédiée ci-dessous)
- **CTA** — bouton principal + bouton secondaire optionnel

**Texte simple** — Kicker, titre, texte riche, et un CTA optionnel.

**Image** — Image pleine largeur avec texte alt et lien optionnel.

---

### Blocs data

**Graphique** — Courbe à 7 points. En mode **Manuel**, curseurs 0–100 %. En mode **Auto CoinGecko**, choisissez la crypto, la devise (EUR/USD) et la période (7j/30j).

**Fear & Greed** — Jauge de sentiment (0 à 100). Valeur manuelle ou synchronisée. La classification (Extreme Fear → Extreme Greed) est calculée automatiquement.

**Signaux** — Quatre signaux court-terme en grille 2×2. Chaque signal : direction (haussière / baissière), titre, description.

**Barres Macro** — Barres de données comparatives. Chaque barre : libellé, valeur affichée, pourcentage de remplissage (0–100 %), légende.

**Chiffre commenté** — Grand chiffre avec unité, légende, titre et commentaire en texte riche.

---

### Blocs contextuels

**Macro / Citation** — Kicker, titre, texte riche, citation mise en avant avec son auteur. Supporte une image de fond (1280 × 480 px recommandé).

**Évènement** — Date (jour, mois, année), titre, description, lien CTA, image de fond. Idéal pour les conférences ou décisions macro.

---

### L'encadré (dans Texte & Media)

L'encadré est un bloc "Note de la rédaction" avec :

- **Couleur** — 9 teintes (Cyan, Menthe, Bleu, Rose, Orange, Corail, Violet, Jaune, Blanc) — pilote à la fois le picto et le fond/bordure du bloc
- **Afficher le picto** — toggle pour afficher ou masquer l'icône
- **Pictogramme** — 15 icônes disponibles (grille de sélection)
- **Libellé** — texte du badge en haut (ex. : "Note de la rédac")
- **Texte** — corps de l'encadré en texte riche
- **Ligne de bas** — texte de pied optionnel avec lien

#### Les 15 pictogrammes

| # | Picto | Usage |
|---|-------|-------|
| 01 | À noter | Information factuelle, complément neutre |
| 02 | On décrypte | Explication d'un mécanisme ou d'un jargon |
| 03 | L'intuition | Lecture transversale, analyse éditoriale |
| 04 | L'épingle | Point clé à mémoriser |
| 05 | Prudence | Risque, biais, mise en garde |
| 06 | Signal faible | Tendance à surveiller |
| 07 | Mise en contexte | Rappel historique, comparaison |
| 08 | Pour aller plus loin | Lien vers ressource complémentaire |
| 09 | Le bon moment | Catalyseur, fenêtre temporelle |
| 10 | L'essentiel | Conclusion, ce qu'il faut retenir |
| 11 | Marché US | Données USD, ETF, Fed, Treasury |
| 12 | Zone euro | BCE, MiCA, données EUR |
| 13 | Bitcoin | On-chain BTC, ETF spot, halving |
| 14 | Ethereum | DeFi, L2, staking, upgrades ETH |
| 15 | Vous nous demandez | FAQ lecteur, question récurrente |

---

### L'éditeur de texte riche

Tous les champs "texte riche" partagent la même barre d'outils :

| Bouton | Raccourci | Effet |
|--------|-----------|-------|
| **G** | `Cmd/Ctrl + B` | Gras |
| *I* | `Cmd/Ctrl + I` | Italique |
| S | `Cmd/Ctrl + U` | Souligné |
| ~~R~~ | — | Rayé |
| 🔗 | — | Lien hypertexte |
| ≡ | — | Liste à puces |
| 1. | — | Liste numérotée |

**Comportement des touches :**
- Dans une liste — `Entrée` : nouvel item · `Shift + Entrée` : saut de ligne simple
- Hors liste — `Entrée` : saut de ligne · plusieurs `Entrée` = plusieurs sauts

---

## 5. Gestion des images

Le **gestionnaire d'images** (accessible depuis les blocs Image et les items Image du bloc Texte & Media) permet de :
- **Uploader** une nouvelle image depuis votre ordinateur
- **Réutiliser** une image déjà uploadée
- **Supprimer** les images inutilisées

Les images sont stockées par utilisateur.

> Pour les images de fond (blocs Macro et Évènement), la taille recommandée est **1280 × 480 px**. Gmail n'affiche pas les images de fond — un fond sombre de substitution est automatiquement rendu.

---

## 6. Exporter la newsletter

Cliquez sur **Exporter** (bouton en haut à droite).

**Export ZIP** — Archive contenant :
- `newsletter.html` — fichier HTML complet
- `assets/` — toutes les images en PNG

Conçu pour être hébergé sur un CDN. Les images sont référencées avec des chemins relatifs.

**Export Braze** — Pour l'envoi via Braze :
1. Les images sont automatiquement uploadées sur Braze
2. Un fichier HTML est généré avec les URLs Braze définitives
3. Téléchargez le HTML et importez-le dans votre campagne Braze

> Prévisualisez toujours en mode **Mobile** avant d'exporter — certains blocs ont un comportement différent sur petit écran.

---

## 7. Astuces

**Labels** — Organisez vos newsletters par thème, statut ou période depuis la liste (icône étiquette sur chaque carte).

**Sommaire auto** — Le sommaire se synchronise avec les titres réels des blocs. Si vous renommez un titre, re-synchronisez le sommaire pour mettre à jour les entrées et les ancres.

**Copier le HTML** — Le bouton **Code** dans la prévisualisation affiche le HTML brut. Cliquez pour copier en un clic.

**Undo / Redo** — `Cmd/Ctrl + Z` / `Cmd/Ctrl + Shift + Z` pendant toute la session.

---

*Guide rédigé pour l'éditeur Décrypto — version mai 2026.*
