# Import Markdown newsletter

L'import Markdown cree une nouvelle newsletter depuis la liste des newsletters.
Le fichier est converti vers le modele interne `current_state.sections[]`, puis
reste editable dans l'editeur visuel.

## Fichier

- Extension acceptee : `.md` ou `.markdown`.
- Encodage attendu : UTF-8.
- Le front matter est obligatoire et doit commencer a la premiere ligne.
- Les images importees doivent utiliser des URLs absolues `http` ou `https`.

## Front matter

Le parser v1 accepte uniquement des champs scalaires `champ: valeur`. Les
valeurs entre guillemets, les nombres et les booleens `true`/`false` sont
acceptes. Les tableaux YAML et les objets imbriques ne le sont pas encore.

```md
---
title: "Decrypto - Semaine du 22 mai"
issue_number: "42"
issue_date: "22.05.2026"
preview_text: "Les actifs crypto reprennent un peu d'air."
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
| `theme_variant` | non | `dark` ou `light` |
| `show_section_numbers` | non | Active la numerotation des sections |
| `show_block_separators` | non | Active les separateurs automatiques |

Les champs inconnus sont ignores avec un avertissement. Le footer legal reste
celui de l'application.

## Markdown simple

Sans directive, le corps du fichier utilise ces conversions :

| Markdown | Section creee |
| --- | --- |
| premier `# Titre` | `hero` |
| `## Titre` et son contenu | `text_block` |
| texte hors titre | `text_block` |
| image seule `![Alt](https://...)` | `image_block` |
| regle horizontale `---` | `divider` fin |

Le corps des blocs texte conserve le Markdown utile au rendu email : paragraphes,
gras, italique, liens et listes simples.

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

## Directives supportees

Une directive commence par `:::type`, contient des champs scalaires, puis se
ferme avec `:::`. Pour une directive texte, le Markdown place juste apres la
fermeture devient son corps jusqu'a la directive suivante.

```md
:::text_block
kicker: "ANALYSE"
title: "Le retour des flux"
cta_label: "Lire l'analyse"
cta_url: "https://example.com/analyse"
:::

Les flux ETF repartent apres plusieurs semaines hesitantes.
```

Les directives supportees sont :

| Directive | Champs scalaires |
| --- | --- |
| `hero` | `kicker`, `title_part1`, `title_part2`, `title_highlight`, `subtitle` |
| `edito` | `kicker`, `title`, puis corps Markdown |
| `text_block` | `kicker`, `title`, `cta_label`, `cta_url`, puis corps Markdown |
| `focus` | `kicker`, `title`, puis du texte ou des sous-directives `focus_*` |
| `signals` | `kicker`, `title`, puis une ligne `- direction | titre | description` par signal |
| `editorial_list` | `kicker`, puis une ligne `- tag | titre | description | couleur` par entree |
| `image_block` | `image_url`, `image_alt`, `link_url` |
| `divider` | `style`: `thin`, `thick` ou `gradient` |
| `macro` | `kicker`, `title`, `quote`, `quote_author`, `bg_image_url`, puis corps Markdown |
| `macro_bars` | une ligne `- label | valeur | percent | legende` par barre |
| `fear_greed` | `kicker`, `title`, `value`, `classification`, puis commentaire Markdown |
| `commented_number` | `kicker`, `value`, `unit`, `caption`, `title`, puis corps Markdown |
| `event` | `day`, `month`, `year`, `kicker`, `title`, `description`, `cta_label`, `cta_url`, `bg_image_url` |

Chaque directive accepte aussi `counts_for_numbering: true` ou `false`.

Les signaux utilisent `up` ou `down` comme direction :

```md
:::signals
kicker: "ANALYSE"
title: "Signaux a suivre"
:::

- up | Flux ETF | Les allocations reviennent.
- down | Pression macro | Les taux restent eleves.
```

La couleur est optionnelle pour la liste editoriale. Sans couleur, le tag
utilise le rose par defaut.

```md
:::editorial_list
kicker: "Trois raisons de rester attentif"
:::

- ETF | Les flux reviennent | Le marche retrouve un soutien. | #03FFCF
- Macro | Les taux comptent encore | Les publications inflation restent clefs.
```

Un `focus` peut rester un simple bloc de texte, ou enchainer des items dans
l'ordre voulu :

```md
:::focus
kicker: "FOCUS"
title: "Le sujet de la semaine"
:::

Texte d'ouverture du focus.

:::focus_image
image_url: "https://example.com/focus.png"
image_alt: "Visuel focus"
:::

:::focus_cta
label: "Lire la suite"
url: "https://example.com/analyse"
arrow: true
secondary_label: "Voir l'academie"
secondary_url: "https://example.com/academie"
:::

:::focus_callout
label: "A retenir"
picto: "target"
callout_color: "#03FFCF"
footer: "Source Coinhouse"
:::

Le callout accepte lui aussi un corps Markdown.

:::focus_spacer
height: 24
:::
```

Sous-directives `focus` :

| Directive | Champs |
| --- | --- |
| `focus_text` | corps Markdown |
| `focus_image` | `image_url`, `image_alt`, `link_url` |
| `focus_cta` | `label`, `url`, `arrow`, `centered`, `secondary_label`, `secondary_url`, `secondary_arrow` |
| `focus_callout` | `label`, `footer`, `footer_url`, `show_icon`, `picto`, `callout_color`, puis corps Markdown |
| `focus_spacer` | `height` entre `0` et `120` |

Les barres macro attendent un pourcentage entre `0` et `100` :

```md
:::macro_bars
:::

- Baisses pricees | 1,5 | 38 | vs il y a un mois
- Inflation coeur | 3,2 | 53 | cible 2 %
```

## Hors perimetre

- Front matter YAML avec tableaux ou objets imbriques.
- Import de `chart`, `index` et `feature_grid`.
- Upload d'images locales vers Supabase.
- Round trip parfait entre l'editeur et le Markdown source.
