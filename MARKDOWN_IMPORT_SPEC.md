# Import Markdown newsletter

Cette spec decrit le format lu par `src/utils/markdownImport.js`.

L'import Markdown cree une nouvelle newsletter depuis la liste des newsletters.
Le fichier est parse cote client, une modale affiche le resultat detecte, puis
la creation Supabase ne se fait qu'apres confirmation.

Le Markdown importe devient le modele interne `current_state.sections[]`. Une
fois la newsletter creee, l'editeur visuel reste la source de verite.

## Fichiers de reference

- Exemple complet importable : `examples/newsletter-markdown-import-complet.md`
- Parseur : `src/utils/markdownImport.js`
- Tests : `src/utils/markdownImport.test.mjs`

## Format general

### Fichier

| Regle | Valeur |
| --- | --- |
| Extension UI | `.md` ou `.markdown` |
| Encodage attendu | UTF-8 |
| Front matter | obligatoire a la premiere ligne |
| Images | URLs absolues `http` ou `https` |
| Footer | footer legal par defaut de l'application |

Le fichier contient :

1. un front matter scalaire ;
2. du Markdown simple optionnel ;
3. des directives newsletter optionnelles.

### Front matter

Le front matter commence et se termine avec `---`.

Le parseur accepte seulement des champs scalaires `champ: valeur`. Les valeurs
entre guillemets, les nombres et les booleens `true` ou `false` sont acceptes.
Les tableaux YAML, objets imbriques et valeurs multilignes YAML ne sont pas
supportes.

```md
---
title: "Decrypto - Semaine du 22 mai"
issue_number: "42"
issue_date: "22.05.2026"
preview_text: "Bitcoin reprend un peu d'air."
brand_name: "COINHOUSE"
theme_variant: dark
show_section_numbers: true
show_block_separators: true
---
```

| Champ | Requis | Description |
| --- | --- | --- |
| `title` | oui | Titre de la newsletter creee |
| `issue_number` | non | Numero affiche dans l'entete |
| `issue_date` | non | Date affichee dans l'entete |
| `preview_text` | non | Preheader email |
| `brand_name` | non | Nom de marque affiche |
| `theme_variant` | non | `dark` ou `light` pour choisir le fond sombre ou clair |
| `show_section_numbers` | non | Active la numerotation des sections |
| `show_block_separators` | non | Active les filets separant les blocs |

Si `preview_text` manque, l'import continue avec un avertissement.

La modale de validation reprend `theme_variant`, `show_section_numbers` et
`show_block_separators` depuis le front matter. Ces trois valeurs peuvent
encore etre ajustees dans la modale avant la creation de la newsletter.

## Syntaxe commune

### Directives

Une directive commence par `:::type`, contient zero ou plusieurs champs
scalaires, puis se ferme avec `:::`.

```md
:::text_block
kicker: "ANALYSE"
title: "Le retour des flux"
cta_label: "Lire l'analyse"
cta_url: "https://example.com/analyse"
:::

Le corps Markdown suit la directive jusqu'a la prochaine directive.
```

Un champ inconnu dans le front matter ou dans une directive est ignore avec un
avertissement.

Toutes les directives de section acceptent aussi :

```md
counts_for_numbering: true
```

ou :

```md
counts_for_numbering: false
```

Cette valeur pilote la numerotation et le sommaire auto apres import.

### Corps Markdown

Pour les directives a corps texte, le bloc Markdown place juste apres la
directive est copie dans le champ riche du bloc. Le rendu email sait gerer les
paragraphes, les liens Markdown, le gras, l'italique et les listes simples.

Une nouvelle directive termine le corps courant.

### Listes a separateur `|`

Plusieurs blocs repetitifs utilisent des lignes de liste :

```md
- colonne 1 | colonne 2 | colonne 3
```

Regles :

- chaque entree commence par `- ` ;
- le separateur de colonnes est `|` ;
- les colonnes requises ne doivent pas etre vides ;
- le caractere `|` ne peut pas etre utilise dans le texte d'une colonne.

## Markdown simple

Du Markdown sans directive est converti automatiquement :

| Markdown | Section creee |
| --- | --- |
| premier `# Titre` | `hero` simplifie |
| `# Titre` apres un hero existant | `text_block` |
| `## Titre` et son corps | `text_block` |
| texte hors titre | `text_block` |
| image seule `![Alt](https://...)` | `image_block` |
| regle horizontale `---` | `divider` `thin` |

Exemple minimal :

```md
---
title: "Decrypto - Import simple"
preview_text: "Les points cles de la semaine."
---

# Le marche attend son signal

## Ce qu'il faut retenir

Bitcoin repart legerement a la hausse.

- Les ETF restent positifs
- La macro reste incertaine

![Graphique BTC](https://example.com/btc.png)
```

## Catalogue des sections

| Section | Champs / corps |
| --- | --- |
| `hero` | `kicker`, `title_part1`, `title_part2`, `title_highlight`, `subtitle` |
| `index` | `label` ; items generes apres import |
| `edito` | `kicker`, `title`, corps Markdown |
| `text_block` | `kicker`, `title`, `cta_label`, `cta_url`, corps Markdown |
| `image_block` | `image_url`, `image_alt`, `link_url` |
| `divider` | `style` |
| `chart` | graphique auto CoinGecko ou graphique manuel |
| `fear_greed` | `kicker`, `title`, `value`, `classification`, commentaire Markdown |
| `signals` | `kicker`, `title`, liste de signaux |
| `macro` | `kicker`, `title`, `quote`, `quote_author`, `bg_image_url`, corps Markdown |
| `macro_bars` | liste de barres |
| `commented_number` | `kicker`, `value`, `unit`, `caption`, `title`, corps Markdown |
| `editorial_list` | `kicker`, liste d'entrees |
| `focus` | `kicker`, `title`, texte et items `focus_*` |
| `feature_grid` | `kicker`, `bg_image_url`, cartes secondaires et carte vedette |
| `event` | `day`, `month`, `year`, `kicker`, `title`, `description`, `cta_label`, `cta_url`, `bg_image_url` |

## Sections simples

### `text_block`

```md
:::text_block
kicker: "ANALYSE"
title: "Le signal a suivre"
cta_label: "Lire la suite"
cta_url: "https://example.com/analyse"
:::

Le corps du bloc reste en Markdown riche.
```

`cta_url`, si renseigne, doit etre une URL `http` ou `https`.

### `image_block`

```md
:::image_block
image_url: "https://example.com/image.png"
image_alt: "Graphique Bitcoin"
link_url: "https://example.com/analyse"
:::
```

`image_url` est obligatoire et doit etre une URL `http` ou `https`.
`link_url`, si renseigne, est valide de la meme facon.

### `divider`

```md
:::divider
style: gradient
:::
```

`style` accepte `thin`, `thick` ou `gradient`. La valeur par defaut est
`thin`.

### `event`

```md
:::event
day: "14"
month: "JUIN"
year: "2026"
kicker: "EVENEMENT - PARIS"
title: "Crypto pour Tous"
description: "Une session pour revoir les fondamentaux."
cta_label: "Decouvrir"
cta_url: "https://example.com/event"
:::
```

`cta_url`, si renseigne, doit etre une URL `http` ou `https`. Un event sans
`title` est importe avec avertissement.

## Hero, sommaire et edito

### `hero` et `hero_chips`

```md
:::hero
kicker: "DECRYPTO"
title_part1: "Le marche"
title_part2: "reprend son "
title_highlight: "souffle."
subtitle: "Les flux reviennent."
:::

:::hero_chips
:::

- btc | BTC a rafraichir
- eth | ETH a rafraichir
- fear_greed | F&G a synchroniser
- manual | Macro prudente
```

`hero_chips` doit suivre directement son `hero`. Chaque ligne contient :

```md
- type | label
```

`type` accepte `manual`, `btc`, `eth` ou `fear_greed`.

### `index`

```md
:::index
label: "Au sommaire"
:::
```

Le sommaire ne prend pas de lignes d'items. Apres conversion de tout le
fichier, ses items sont generes depuis les sections numerotees. Les types
habituellement non numerotes (`hero`, `index`, `chart`, `macro_bars`,
`image_block`, `divider`) restent hors sommaire sauf surcharge
`counts_for_numbering`.

### `edito` et `edito_kpis`

```md
:::edito
kicker: "EDITO"
title: "Les flux reviennent"
:::

Bitcoin retrouve un soutien plus visible.

:::edito_kpis
:::

- BTC | 64 000 EUR | +2,93 % | positive
- ETH | 3 100 EUR | -0,40 % | negative
```

`edito_kpis` doit suivre le corps de son `edito`. Chaque ligne contient :

```md
- label | value | delta | tone
```

`tone` accepte `positive`, `negative`, `warning` ou `muted`.

## Blocs marche

### `chart` auto

Sans `chart_mode`, un graphique est cree en mode auto :

```md
:::chart
chart_crypto: bitcoin
chart_currency: eur
chart_days: 7
:::
```

Regles :

- `chart_currency` accepte `eur` ou `usd` ;
- `chart_days` accepte `7` ou `30` ;
- valeurs par defaut : `bitcoin`, `eur`, `7`.

Le bloc auto est importe sans donnees CoinGecko fraiches. L'import ajoute un
avertissement. Dans l'editeur, utiliser **Synchroniser** ou le bouton de
rafraichissement du chart.

### `chart` manuel

```md
:::chart
chart_mode: manual
label: "BTC scenario"
value: "Projection"
price_start: "62 000 EUR"
price_high: "66 000 EUR"
price_low: "61 000 EUR"
delta: "Stable"
delta_tone: muted
subdelta: "Scenario 4 jours"
points: "10, 45, 30, 80"
x_labels: "Lun, Mar, Mer, Jeu"
:::
```

Regles :

- `chart_mode` vaut `manual` ;
- `points` contient au moins deux nombres separes par virgules ;
- chaque point est compris entre `0` et `100` ;
- `x_labels`, si fourni, contient autant d'entrees que `points` ;
- sans `x_labels`, le parseur genere `P1`, `P2`, etc. ;
- `delta_tone` accepte `positive`, `negative`, `warning` ou `muted`.

### `fear_greed`

```md
:::fear_greed
kicker: "INDICATEUR"
title: "Fear and Greed Index"
value: 72
classification: "GREED"
:::

Le sentiment progresse sans euphorie generale.
```

`value` doit etre compris entre `0` et `100`.

### `signals`

```md
:::signals
kicker: "ANALYSE"
title: "Signaux a suivre"
:::

- up | Flux ETF | Les allocations reviennent.
- down | Pression macro | Les taux restent eleves.
```

Chaque ligne contient :

```md
- direction | title | description
```

`direction` accepte `up` ou `down`.

### `macro`

```md
:::macro
kicker: "MACRO"
title: "La Fed garde le tempo"
quote: "La baisse des taux dependra encore des donnees."
quote_author: "Synthese de marche"
bg_image_url: "https://example.com/macro-bg.png"
:::

Le corps Markdown devient l'analyse macro.
```

`bg_image_url`, si renseigne, doit etre une URL `http` ou `https`.

### `macro_bars`

```md
:::macro_bars
:::

- Baisses pricees | 1,5 | 38 | vs il y a un mois
- Inflation coeur | 3,2 | 53 | cible 2 %
```

Chaque ligne contient :

```md
- label | value | percent | caption
```

`percent` doit etre compris entre `0` et `100`.

### `commented_number`

```md
:::commented_number
kicker: "LE CHIFFRE"
value: "+1,2"
unit: "Md $"
caption: "Flux ETF spot sur sept jours"
title: "Les allocations institutionnelles reviennent."
:::

Le corps Markdown devient le commentaire.
```

## Blocs listes et focus

### `editorial_list`

```md
:::editorial_list
kicker: "Trois raisons de rester attentif"
:::

- ETF | Les flux reviennent | Le marche retrouve un soutien. | #03FFCF
- Macro | Les taux comptent encore | Les publications restent clefs.
```

Chaque ligne contient :

```md
- tag | title | body | tag_color optionnel
```

Sans couleur, `tag_color` prend `#FF00AA`.

### `focus`

Un `focus` peut commencer par un corps Markdown simple :

```md
:::focus
kicker: "FOCUS"
title: "Le sujet de la semaine"
:::

Texte d'ouverture du focus.
```

Des sous-directives `focus_*` placees juste apres ce focus ajoutent des items
dans l'ordre :

| Sous-directive | Champs / corps |
| --- | --- |
| `focus_text` | corps Markdown |
| `focus_image` | `image_url`, `image_alt`, `link_url` |
| `focus_cta` | `label`, `url`, `arrow`, `centered`, `secondary_label`, `secondary_url`, `secondary_arrow` |
| `focus_callout` | `label`, `footer`, `footer_url`, `show_icon`, `picto`, `callout_color`, corps Markdown |
| `focus_spacer` | `height` |

Exemple :

```md
:::focus
kicker: "FOCUS"
title: "Le sujet de la semaine"
:::

Texte d'ouverture.

:::focus_image
image_url: "https://example.com/focus.png"
image_alt: "Visuel focus"
link_url: "https://example.com/article"
:::

:::focus_cta
label: "Lire la suite"
url: "https://example.com/analyse"
arrow: true
centered: false
secondary_label: "Voir l'academie"
secondary_url: "https://example.com/academie"
secondary_arrow: false
:::

:::focus_callout
label: "A retenir"
footer: "Source Coinhouse"
footer_url: "https://example.com/source"
show_icon: true
picto: "target"
callout_color: "#03FFCF"
:::

Le callout accepte un corps Markdown.

:::focus_spacer
height: 24
:::
```

Regles :

- les sous-directives `focus_*` doivent suivre un `focus` ;
- `focus_text` et `focus_callout` exigent un corps Markdown ;
- `focus_image.image_url` est obligatoire et doit etre `http` ou `https` ;
- les URLs de `focus_image`, `focus_cta` et `focus_callout` sont validees
  quand elles sont renseignees ;
- `focus_cta.label` est obligatoire ;
- `focus_spacer.height` doit etre compris entre `0` et `120`.

## `feature_grid`

Une grille de benefices contient :

1. jusqu'a quatre cartes secondaires ;
2. une carte vedette decrite par `feature_grid_featured`.

```md
:::feature_grid
kicker: "Benefices"
bg_image_url: "https://example.com/grid-bg.png"
:::

- Frais | Acheter sans friction bancaire. | euro | #00FFFF
- Auto | Vos achats recurrents continuent. | pin | #FF8B28
- IBAN | Un compte euro a votre nom. | shield | #B36BFF

:::feature_grid_featured
label: "Benefice principal"
title: "Une experience crypto plus fluide"
picto: "check"
show_icon: true
color: "#03FFCF"
:::

Le corps Markdown devient le texte de la carte vedette.
```

Chaque carte secondaire contient :

```md
- title | body | picto | color
```

Regles :

- `feature_grid` exige au moins une carte secondaire ;
- seules les quatre premieres cartes secondaires sont rendues ;
- `bg_image_url`, si renseigne, doit etre `http` ou `https` ;
- `feature_grid_featured` doit suivre son `feature_grid` ;
- `feature_grid_featured.title` est obligatoire ;
- une grille sans carte vedette est importee avec avertissement.

## Validations et avertissements

### Erreurs bloquantes

L'import est refuse notamment si :

- le front matter manque ou n'est pas ferme ;
- `title` manque ;
- une directive est inconnue ou non fermee ;
- une sous-directive `focus_*`, `hero_chips`, `edito_kpis` ou
  `feature_grid_featured` apparait hors de son parent ;
- une URL validee n'est pas `http` ou `https` ;
- une liste a separateur `|` manque de lignes ou de colonnes requises ;
- `divider.style`, `chart_mode`, `chart_currency`, `chart_days`, les tons KPI
  ou les directions `signals` ont une valeur non supportee ;
- `fear_greed.value`, `macro_bars.percent`, les points chart manuels ou le
  spacer focus sortent de leurs bornes.

### Avertissements

L'import continue avec avertissement pour :

- `preview_text` absent ;
- champ inconnu ignore ;
- aucun hero importe ;
- chart auto a rafraichir avec CoinGecko ;
- event sans titre ;
- grille `feature_grid` sans carte vedette ;
- plus de quatre cartes secondaires dans `feature_grid`.

## Hors perimetre

- Front matter YAML avec tableaux ou objets imbriques.
- Upload d'images locales vers Supabase.
- Import depuis un Markdown visant un round trip parfait avec l'editeur.

## API de creation

`POST /api/import-markdown` cree directement une newsletter avec le Markdown
importe.

La route exige un header `Authorization: Bearer <access_token>` Supabase pour un
utilisateur approuve.

### Corps JSON

```json
{
  "markdown": "---\ntitle: \"Decrypto API\"\npreview_text: \"Import direct.\"\n---\n\n# Edition API\n",
  "options": {
    "theme_variant": "light",
    "show_section_numbers": false,
    "show_block_separators": true
  }
}
```

`options` est optionnel. Ces valeurs surchargent le front matter juste avant la
creation.

### Corps Markdown brut

La route accepte aussi un corps `text/markdown` ou `text/plain`. Dans ce mode,
les reglages globaux viennent uniquement du front matter.

### Reponse

En succes, la route repond `201` :

```json
{
  "newsletter": {
    "id": "<uuid>",
    "title": "Decrypto API",
    "issue_number": "",
    "current_state": {}
  },
  "warnings": []
}
```

Les erreurs de format Markdown ou d'options repondent `400`. Une session absente
ou invalide repond `401`, un profil non approuve `403`.
