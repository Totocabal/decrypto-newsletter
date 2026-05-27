# Décrypto — Newsletter Editor

Éditeur collaboratif de newsletters HTML pour **Décrypto**, l'hebdo crypto de Coinhouse. React 18 + Vite 5 côté front, **Supabase** (Postgres + Auth + Storage + Realtime) côté backend, déployé sur **Vercel**.

---

## Table des matières

1. [Stack technique](#stack-technique)
2. [Architecture des fichiers](#architecture-des-fichiers)
3. [Modèle de données éditeur](#modèle-de-données-éditeur)
4. [Blocs disponibles](#blocs-disponibles)
5. [Composants UI](#composants-ui)
6. [Moteur de rendu email](#moteur-de-rendu-email)
7. [Système d'export](#système-dexport)
8. [Import Markdown](#import-markdown)
9. [Collaboration en temps réel](#collaboration-en-temps-réel)
10. [Gestion des images](#gestion-des-images)
11. [Données marché CoinGecko](#données-marché-coingecko)
12. [Thème et identité visuelle](#thème-et-identité-visuelle)
13. [Schéma de base de données](#schéma-de-base-de-données)
14. [API serverless Vercel](#api-serverless-vercel)
15. [Setup local](#setup-local)
16. [Déploiement Vercel](#déploiement-vercel)
17. [Scripts](#scripts)

---

## Stack technique

| Couche | Technologie | Version |
|---|---|---|
| Front-end | React | ^18.3.1 |
| Bundler | Vite | ^5.4.21 |
| Styles | Tailwind CSS | ^3.4.4 |
| Éditeur de texte riche | Quill | ^2.0.3 |
| Drag-and-drop | @dnd-kit/core + sortable + utilities | ^6.3.1 / ^10.0.0 / ^3.2.2 |
| Backend / BDD | Supabase JS | ^2.105.4 |
| Export ZIP | JSZip | ^3.10.1 |
| Screenshots serveur | Puppeteer Core + @sparticuz/chromium | ^25.0.2 / ^148.0.0 |
| Traitement image serveur | Sharp | ^0.34.5 |
| Parsing CSV | PapaParse | ^5.4.1 |
| Icônes | Lucide React | ^0.383.0 |
| Déploiement | Vercel | — |

Module type : `"module"` (ESM pur). Les tests ciblés Markdown utilisent `node:test`.

---

## Architecture des fichiers

```
src/
├── config/
│   ├── schema.js             ← 14 types de blocs, INITIAL_STATE, migration, template par défaut
│   ├── theme.js              ← tokens couleur (THEME/LIGHT_THEME), BRAND, FONTS, BRAND_LOGOS
│   └── calloutPictos.js      ← 15 pictos SVG + 9 couleurs pour les encadrés focus
│
├── contexts/
│   └── AuthContext.jsx       ← session Supabase + profil (approved, is_admin)
│
├── lib/
│   ├── supabase.js           ← client Supabase (singleton)
│   ├── useNewsletter.js      ← hook principal : chargement, lock, auto-save, Realtime
│   ├── useCoinGecko.js       ← fetching CoinGecko (60 cryptos, prix + courbes)
│   ├── templatePresets.js    ← CRUD presets de disposition (table template_presets)
│   └── imageUpload.js        ← upload/delete/list images Supabase Storage
│
├── pages/
│   ├── LoginPage.jsx
│   ├── PendingApprovalPage.jsx
│   ├── SetPasswordPage.jsx
│   ├── SetupErrorPage.jsx
│   ├── NewslettersListPage.jsx ← liste, filtres, labels, prévisualisation, création
│   ├── EditorPage.jsx          ← éditeur principal split EditorPanel / PreviewPanel
│   └── AdminPage.jsx           ← comptes, template, presets, labels
│
├── components/
│   ├── EditorPanel.jsx         ← panneau gauche : blocs, DnD, header global, footer
│   ├── SectionEditor.jsx       ← formulaires spécifiques par type de bloc
│   ├── PreviewPanel.jsx        ← iframe desktop/mobile + export JPG
│   ├── FormControls.jsx        ← Field, Input, TextArea (Quill), Section
│   ├── VersionsPanel.jsx       ← historique 50 versions + restauration
│   ├── ImageManagerModal.jsx   ← modal images : upload, labels, sélection, multi-select
│   ├── LockBanner.jsx          ← bandeau rouge "verrouillé par X"
│   ├── LockRequestBanner.jsx   ← bandeau ambre animé "Y demande l'accès"
│   ├── Toolbar.jsx             ← barre d'outils en-tête
│   └── Tooltip.jsx             ← tooltip générique
│
├── render/
│   └── buildEmail.js           ← moteur HTML email (640px, tables, inline CSS, SVG)
│
├── utils/
│   ├── exportAssetPack.js      ← export ZIP + export Braze
│   ├── exportImport.js         ← import/export JSON, téléchargement HTML, presse-papier
│   ├── markdownImport.js       ← import Markdown structuré vers `current_state`
│   └── storage.js              ← draft localStorage (clé v1, usage legacy)
│
└── App.jsx / main.jsx

supabase/
├── schema.sql                  ← schéma complet (tables, RLS, RPCs, triggers)
├── bootstrap-admin.sql         ← création du premier admin
├── add-google-oauth.sql
├── add-password-set.sql
├── admin-create-user.sql
├── fix-rls-recursion.sql
├── keepalive.sql
├── newsletters-owner-delete-policy.sql
├── storage.sql
└── template-presets.sql

api/
├── export-braze.js             ← serverless : upload assets → Braze Media Library
├── export-preview-jpg.js       ← serverless : rendu JPG via Puppeteer/Chromium
├── generate-preview-text.js    ← serverless : génération IA du texte d'aperçu
├── correct-text.js             ← serverless : correction orthographique IA
└── supabase-keepalive.js       ← serverless : cron ping anti-pause Supabase Free
```

### Flux de données éditeur

```
EditorPage
  ├── useNewsletter(newsletterId, userId, userName)
  │     → charge current_state depuis Supabase (+ draft localStorage si plus récent)
  │     → acquiert le lock via RPC acquire_lock
  │     → auto-save (debounce 2 s) sur current_state
  │     → Realtime channel lock-requests:{newsletterId}
  │
  ├── EditorPanel({ state, setState })
  │     └── SectionEditor({ type, data, onChange }) — formulaires par type
  │
  └── PreviewPanel({ html, view, previewDevice })
        → buildEmail(state) → HTML injecté dans <iframe srcDoc>
```

---

## Modèle de données éditeur

### Structure `state`

```js
{
  brand_name: "COINHOUSE",
  issue_number: "1",
  issue_date: "JEUDI 1ER JANVIER 2026",  // calculé automatiquement (jeudi courant)
  preview_text: "",
  show_section_numbers: true,
  theme_variant: "dark",                  // "dark" | "light"
  sections: [                             // liste ordonnée de blocs
    { id: "<uuid>", type: "<type>", data: { ... } }
  ],
  footer: {
    links: [
      { label: "Particuliers", url: "" },
      { label: "Clientèle Privée", url: "" },
      { label: "Entreprises", url: "" },
      { label: "Académie", url: "" }
    ],
    address: "",
    legal: "",
    unsub_url: "{{${set_user_to_unsubscribed_url}}}"  // Braze liquid tag
  }
}
```

### Clés localStorage

| Clé | Usage |
|---|---|
| `decrypto-newsletter-draft:{newsletterId}` | Draft auto-sauvegardé par `useNewsletter` (format `{ state, saved_at }`) |
| `decrypto:default_sections` | Types de blocs du template par défaut (admin) |
| `decrypto:section_defaults` | Contenus par défaut par type de bloc (admin) |
| `decrypto-newsletter-draft-v1` | Draft legacy mono-newsletter (utilisé par `storage.js`) |

### Section auto-numérotée ou non

Les types listés dans `UNNUMBERED_TYPES` ne reçoivent pas de numéro de section :

```js
new Set(["hero", "index", "chart", "macro_bars", "image_block", "divider"])
```

### Migration legacy

`migrateLegacyState(state)` convertit les newsletters créées avant l'architecture `sections[]` (propriétés à plat) vers le format courant. Appelée automatiquement au chargement dans `useNewsletter`.

---

## Blocs disponibles

### 1. `hero` — Bandeau principal

| Champ | Type | Description |
|---|---|---|
| `kicker` | string | Texte au-dessus du titre |
| `title_part1` | string | Première ligne du titre |
| `title_part2` | string | Deuxième ligne (avant le mot accentué) |
| `title_highlight` | string | Mot en couleur magenta (#FF00AA) |
| `subtitle` | string | Sous-titre (texte riche) |
| `chips[]` | array | Pastilles : `{ label, type }` où `type` est `manual`, `btc`, `eth` ou `fear_greed` |

Les chips `btc` et `eth` se synchronisent automatiquement depuis CoinGecko. Les chips `fear_greed` lisent la valeur du bloc `fear_greed` de la même newsletter.

### 2. `index` — Sommaire

| Champ | Type | Description |
|---|---|---|
| `label` | string | Titre du sommaire |
| `items[]` | array | Entrées : `{ section_id, number, title }` |

Le bouton "Sync blocs" recrée automatiquement les entrées depuis tous les blocs numérotés de l'édition. Dans le rendu, chaque entrée pointe vers l'ancre de sa section.

### 3. `edito` — Édito + KPI

| Champ | Type | Description |
|---|---|---|
| `kicker` | string | Kicker |
| `title` | string | Titre |
| `body` | string | Corps (texte riche HTML) |
| `kpis[]` | array | `{ label, value, delta, tone }` — `tone` : `positive`, `negative`, `warning`, `muted` |

La grille KPI s'auto-dimensionne selon le nombre de colonnes.

### 4. `chart` — Graphique de cours

| Champ | Type | Description |
|---|---|---|
| `chart_mode` | `"auto"` \| `"manual"` | Source des données |
| `chart_crypto` | string | ID CoinGecko (ex. `"bitcoin"`) |
| `chart_currency` | `"eur"` \| `"usd"` | Devise |
| `chart_days` | `7` \| `30` | Période en jours |
| `label` | string | Libellé de la paire (ex. `BTC / EUR`) |
| `value` | string | Prix actuel affiché |
| `price_start` | number | Prix de début de période |
| `price_high` | number | Prix le plus haut |
| `price_low` | number | Prix le plus bas |
| `delta` | string | Variation affichée (ex. `▲ +2,93 %`) |
| `delta_tone` | string | `positive`, `negative`, `warning`, `muted` |
| `subdelta` | string | Variation secondaire (ex. `+1 838 € sur 7j`) |
| `points[]` | number[] | Valeurs normalisées 0–100 (0 = min, 100 = max) |
| `x_labels[]` | string[] | Étiquettes de l'axe X |
| `y_axis_ticks[]` | number[] | Ticks axe Y (auto-calculés, pas en chevauche-ment) |
| `raw_prices[]` | array | `{ date, price }` — données brutes CoinGecko |

En mode manuel, les points sont éditables via des sliders dans l'interface.

### 5. `fear_greed` — Jauge Fear & Greed

| Champ | Type | Description |
|---|---|---|
| `kicker` | string | Kicker |
| `title` | string | Titre |
| `value` | number | 0–100 |
| `classification` | string | Calculé automatiquement depuis `value` |
| `commentary` | string | Commentaire (texte riche HTML) |

Zones de classification : `EXTREME FEAR` (0–24), `FEAR` (25–44), `NEUTRAL` (45–54), `GREED` (55–74), `EXTREME GREED` (75–100).

### 6. `signals` — Signaux de marché

| Champ | Type | Description |
|---|---|---|
| `kicker` | string | Kicker |
| `title` | string | Titre |
| `signals[]` | array | `{ direction, title, description }` — `direction` : `"up"` (↗ cyan) ou `"down"` (↘ orange) |

Rendu en grille 2×2. Idéal pour 4 signaux.

### 7. `macro` — Macro / Citation

À utiliser pour un contexte macroéconomique, mais aussi pour une citation corporate ou dirigeant explicitement fournie dans un brief. Exemple : `Citation de Nicolas Louvet, CEO : "..."` doit être converti en bloc `macro` avec `quote` et `quote_author`.

| Champ | Type | Description |
|---|---|---|
| `kicker` | string | Kicker |
| `title` | string | Titre |
| `body` | string | Corps (texte riche) |
| `quote` | string | Citation |
| `quote_author` | string | Auteur de la citation |
| `bg_image_url` | string | URL de l'image de fond (recommandé 1280×480) |
| `bg_image_path` | string | Chemin Supabase Storage (pour l'export ZIP/Braze) |

Rendu avec fallback VML pour Outlook.

### 8. `macro_bars` — Barres comparatives

| Champ | Type | Description |
|---|---|---|
| `bars[]` | array | `{ label, value, percent, caption }` — `percent` : 0–100 pour la largeur de barre |

Bloc non numéroté.

### 9. `commented_number` — Chiffre commenté

| Champ | Type | Description |
|---|---|---|
| `kicker` | string | Libellé |
| `value` | string | Chiffre mis en avant |
| `unit` | string | Unité |
| `caption` | string | Légende |
| `title` | string | Titre de la partie texte |
| `body` | string | Commentaire (texte riche) |

Rendu en carte divisée : panneau chiffre à gauche, panneau texte à droite.

### 10. `event` — Évènement

| Champ | Type | Description |
|---|---|---|
| `day` | string | Jour |
| `month` | string | Mois |
| `year` | string | Année |
| `kicker` | string | Kicker |
| `title` | string | Titre |
| `description` | string | Description |
| `cta_label` | string | Texte du bouton |
| `cta_url` | string | URL du bouton |
| `bg_image_url` | string | Image de fond (recommandé 1280×480) |
| `bg_image_path` | string | Chemin Supabase Storage |

Image de fond visible dans Apple Mail, iOS Mail, Samsung Mail. Gmail affiche le fond sombre.

### 11. `focus` — Texte & Média (bloc libre)

| Champ | Type | Description |
|---|---|---|
| `kicker` | string | Kicker |
| `title` | string | Titre |
| `items[]` | array | Liste d'items de types différents |

Chaque item possède un `id` UUID et un `type` parmi :

**`text`** : `{ body }` — texte riche HTML.

**`image`** : `{ image_url, image_path, image_alt, link_url }` — l'image devient cliquable si `link_url` est renseigné.

**`cta`** : `{ label, url, arrow, centered, secondary_label, secondary_url, secondary_arrow }` — bouton principal gradient (#4141FF→#8701FF→#FF00AA) + bouton secondaire outline optionnel.

**`callout`** : `{ label, body, footer, footer_url, show_icon, picto, callout_color }` — encadré avec picto parmi les 15 disponibles et couleur parmi les 9 définies.

**`spacer`** : `{ height }` — espace vertical en px, de 0 à 120.

La multi-sélection d'images dans le gestionnaire insère plusieurs items `image` consécutifs.

### 12. `cta` — CTA autonome

| Champ | Type | Description |
|---|---|---|
| `label` | string | Texte du bouton principal |
| `url` | string | URL du bouton principal |
| `arrow` | boolean | Ajoute une flèche au libellé |
| `centered` | boolean | Centre le bouton |
| `secondary_label` | string | Texte du bouton secondaire optionnel |
| `secondary_url` | string | URL du bouton secondaire |
| `secondary_arrow` | boolean | Ajoute une flèche au bouton secondaire |

À utiliser quand le bouton est un bloc autonome. Pour `texte + CTA + texte`,
le bloc `focus` reste préférable.

### 13. `spacer` — Espace vertical

| Champ | Type | Description |
|---|---|---|
| `height` | number | Hauteur en px, de 0 à 120 |

### 14. `image_block` — Image pleine largeur

| Champ | Type | Description |
|---|---|---|
| `image_url` | string | URL de l'image (recommandé 568×280) |
| `image_path` | string | Chemin Supabase Storage |
| `image_alt` | string | Texte alternatif |
| `link_url` | string | Lien de redirection optionnel |

Bloc non numéroté.

### 15. `text_block` — Bloc texte libre

| Champ | Type | Description |
|---|---|---|
| `kicker` | string | Kicker |
| `title` | string | Titre |
| `body` | string | Corps (texte riche) |
| `cta_label` | string | Texte du bouton gradient (laissé vide = masqué) |
| `cta_url` | string | URL du bouton |

### 16. `divider` — Séparateur

| Champ | Type | Valeurs |
|---|---|---|
| `style` | string | `"thin"` (1 px), `"thick"` (4 px), `"gradient"` (3 px dégradé Coinhouse) |

Bloc non numéroté.

---

## Composants UI

### `FormControls.jsx` — composants réutilisables

**`Field({ label, children, hint, action, noMargin })`**
Conteneur de champ de formulaire : label en petites majuscules, hint en dessous, slot `action` à droite du label.

**`Input({ readOnly, ...props })`**
Input HTML standard. En mode `readOnly` : fond plus sombre (`bg-d-panel3`), curseur `default`.

**`TextArea(props)`**
Wrappeur Quill v2 avec error boundary. Si Quill échoue, bascule en `PlainTextFallback` (textarea HTML) avec bouton "Réessayer l'éditeur". Le bouton "Corriger" appelle `/api/correct-text` (IA).

Toolbar Quill : `[bold, italic, underline, strike]`, `[list ordered, list bullet]`, `[link]`, `[clean]`.

Formats supportés : `bold`, `italic`, `underline`, `strike`, `link`, `list`, `indent`.

Raccourci Shift+Enter dans une liste : insère un `<BR>` (blot custom `SoftBreakBlot`) sans créer un nouvel item.

Stockage : HTML sémantique via `quill.getSemanticHTML()` (pas `innerHTML`).

**`Section({ title, children, defaultOpen, action })`**
Conteneur collapsible avec chevron, slot `action` dans l'en-tête.

**Exports de compatibilité :**
- `htmlToEditorJsBlocks(html)` — convertit HTML → bloc Editor.js (rétrocompat)
- `editorJsBlocksToHtml(blocks)` — convertit blocs Editor.js → HTML (rétrocompat)

### `SectionEditor.jsx` — formulaires par type

Composant exporté principal :

```js
export function SectionEditor({ type, data, onChange, sections = [] })
```

Dispatch par `switch(type)` vers 14 sous-composants :

| Composant | Type |
|---|---|
| `HeroEditor` | `hero` |
| `IndexEditor` | `index` |
| `EditoEditor` | `edito` |
| `ChartEditor` | `chart` |
| `FearGreedEditor` | `fear_greed` |
| `SignalsEditor` | `signals` |
| `MacroEditor` | `macro` |
| `MacroBarsEditor` | `macro_bars` |
| `CommentedNumberEditor` | `commented_number` |
| `EventEditor` | `event` |
| `FocusEditor` | `focus` |
| `ImageBlockEditor` | `image_block` |
| `TextBlockEditor` | `text_block` |
| `CtaEditor` | `cta` |
| `SpacerEditor` | `spacer` |
| `DividerEditor` | `divider` |

`ChipEditor` (sous-composant de `HeroEditor`) gère les chips avec sélecteur de type et bouton refresh CoinGecko.

`FocusEditor` gère la liste d'items avec collapse individuel, migration de l'ancien format plat, et ouverture du gestionnaire d'images.

---

## Moteur de rendu email

**`src/render/buildEmail.js`** — fonction pure, pas de React.

### Export principal

```js
buildEmailHtml(state, options = {})
// options.assetMode : "inline" (SVG inline, par défaut) | "external" (assets/xxx.png)
// options.ctaGradientUrl : URL du PNG gradient pour les boutons CTA
```

### Largeur et responsive

- Container email : **640 px**
- Breakpoint 1 : < 640 px (padding réduit)
- Breakpoint 2 : < 380 px (layout simplifié)

### Fonctions utilitaires exportées

| Fonction | Description |
|---|---|
| `escapeHtml(str)` | Échappe `&`, `<`, `>`, `"`, `'` |
| `escapeAttr(str)` | Échappe les attributs HTML |
| `sanitizeRichText(text)` | Convertit HTML riche (gras, italic, lien, listes, markdown `**`, `*`, `[text](url)`, `-`) en HTML email-safe |
| `getLogoSvg(size, color)` | SVG du logo hexagone Coinhouse |
| `getChartSvgFull(points, opts)` | SVG de la courbe de prix (polyline + remplissage dégradé) |
| `getGaugeSvgFull(value, opts)` | SVG de la jauge Fear & Greed (arcs colorés + aiguille) |
| `getCalloutPictoFilename(pictoId, color)` | Nom de fichier PNG du picto (ex. `callout-picto-info-00ffff-white.png`) |

### Fonctions de rendu par section (privées)

`renderHero`, `renderIndex`, `renderEdito`, `renderChart`, `renderFearGreed`, `renderSignals`, `renderMacro`, `renderMacroBars`, `renderCommentedNumber`, `renderEvent`, `renderFocus`, `renderFocusItem`, `renderImageBlock`, `renderTextBlock`, `renderDivider`

### Assets SVG générés

- **Logo** : hexagone Coinhouse en SVG inline
- **Graphique** : SVG polyline avec remplissage dégradé (transparent → couleur accent)
- **Jauge Fear & Greed** : 5 arcs de couleur + aiguille SVG — zones : 0–24 (rouge), 25–44 (orange), 45–54 (jaune), 55–74 (vert clair), 75–100 (cyan)

### Polices

16 déclarations `@font-face` : 8 graisses (100–800) pour Sora + 8 pour DM Sans, hébergées sur le CDN Braze en `.ttf`.

### Fallbacks Outlook (VML)

- Boutons CTA (VML `v:roundrect`)
- Fond de la carte évènement
- Fond du bloc macro/citation

---

## Système d'export

### Hook `useNewsletter`

Undo/redo (profondeur 50) géré dans `EditorPage` via `undoStackRef` et `redoStackRef`.

### Export ZIP — `exportAssetPack(state, filename)`

Génère un ZIP contenant :
- `email.html` — HTML complet avec chemins relatifs `assets/…`
- `assets/chart.png` — courbe SVG convertie en PNG (1120×360, PIXEL_RATIO = 2)
- `assets/gauge.png` — jauge SVG convertie en PNG (200×120, PIXEL_RATIO = 2)
- `assets/gradient-header.png` — fetché depuis l'URL Vercel
- `assets/event-bg.png` — fetché
- `assets/macro-quote-bg.png` — fetché
- `assets/gradient-cta.png` — généré canvas (600×46, dégradé #4141FF → #8701FF → #FF00AA)
- `assets/callout-picto-{id}-{color}-white.png` — 32×32 à 2× pour chaque combinaison picto+couleur unique
- Images externes des blocs `focus` et `image_block` téléchargées dans `assets/`
- `README.md` — explications sur les chemins relatifs

### Export Braze — `exportBrazeHtml(state, filename, accessToken)`

1. Appel POST `/api/export-braze` avec les assets en base64
2. La fonction serverless vérifie l'auth Supabase + `is_admin`
3. Limite : **30 assets max**, **5 MB max** par asset
4. Chaque asset est uploadé dans la Braze Media Library via `{BRAZE_BASE_URL}/media_library/create`
5. Les URLs Braze CDN remplacent les chemins `assets/…` dans le HTML final
6. Le HTML est téléchargé côté client

### Export JSON — `exportStateAsJson(state, filename)`

Télécharge le state brut en JSON. Réimportable via `importStateFromJson(file, onSuccess, onError)`.

### Copie presse-papier — `copyHtmlToClipboard(html)`

Utilise `navigator.clipboard`. Retourne un booléen.

### Export JPG — `/api/export-preview-jpg`

Appel depuis `PreviewPanel` avec `{ html, device }` et le token Bearer. Génère une capture d'écran JPG via Puppeteer + Chromium.

---

## Import Markdown

La liste des newsletters propose deux entrées : **Assistant Gemini** pour créer plusieurs variantes de contenu CRM Coinhouse B2C depuis une intention courte, puis convertir la variante choisie en Markdown importable ; et **Importer Markdown** pour charger un fichier `.md` ou coller un contenu Markdown existant. Le Markdown est ensuite généré ou parsé côté client, puis une modale affiche le titre, le preheader, les sections détectées et les avertissements avant la création Supabase. Cette validation permet aussi d'ajuster le fond clair ou sombre, la numérotation des sections et les filets entre blocs.

Le format accepte :

- un front matter scalaire obligatoire avec `title` ;
- les réglages globaux `theme_variant`, `show_section_numbers` et `show_block_separators` dans le front matter ;
- du Markdown simple converti vers `hero`, `text_block`, `image_block` et `divider` ;
- des directives `:::type` pour tous les blocs du catalogue, dont `chart` auto ou manuel, `focus` multi-items et `feature_grid` ;
- les raffinements `hero_chips`, `edito_kpis` et `index` auto.

Dans la génération Gemini, le prompt CRM intègre la bibliothèque de blocs Décrypto afin de proposer des variantes déjà pensées pour la conversion Markdown : `text_block`, `editorial_list`, `focus`, `cta`, `spacer`, `feature_grid`, `commented_number`, `event`, signaux, blocs marché et CTA. Le bloc `hero` est réservé aux newsletters éditoriales ou contenus de marché, pas aux emails CRM transactionnels, onboarding, upsell ou relance. Les listes à puces de 2 à 4 items sont orientées vers le bloc `editorial_list` quand elles représentent des étapes, bénéfices, arguments produit ou points pédagogiques. Les enchaînements texte court, recommandation, encadré ou image liés à un CTA sont orientés vers `focus` avec ses sous-blocs plutôt que vers `text_block` puis CTA isolé ; `cta` est réservé aux boutons vraiment autonomes, et `spacer` aux respirations verticales seules. Pour `texte + CTA + texte`, Gemini doit privilégier `focus_text`, `focus_cta`, puis `focus_text` dans un même `focus`. Un séparateur interne au bloc `focus` peut être généré avec `focus_divider` (`thin`, `thick`, `gradient`) quand il faut découper un parcours texte/image/CTA sans créer une nouvelle section. `feature_grid` peut être utilisé dès 3 bénéfices ou fonctionnalités structurés, sans inventer une 4e carte. Sa carte vedette est optionnelle et n'est générée que si un bénéfice prioritaire est clairement fourni. `commented_number` reste disponible, mais il n'est demandé que lorsqu'un chiffre est explicitement central dans le brief ou formulé comme chiffre clé. Les blocs "Information légale" ou disclaimers ne sont pas générés par défaut, car les mentions légales communes sont déjà incluses dans le footer de tous les templates. L'interface permet d'agrandir une variante pour la lire confortablement, puis de l'améliorer avec Gemini à partir de commentaires libres. L'API tente aussi de récupérer un extrait de `coinhouse.com` pour fournir un contexte produit supplémentaire au prompt.

Le parseur vit dans `src/utils/markdownImport.js`. Le contrat complet, les syntaxes et les limites sont documentés dans `MARKDOWN_IMPORT_SPEC.md`. Un fichier prêt à importer est disponible dans `examples/newsletter-markdown-import-complet.md`.

La création du contenu CRM appelle `POST /api/generate-crm-brief`, puis la génération Markdown appelle `POST /api/generate-markdown-import`. Les deux routes utilisent Gemini 3.1 Flash Lite et nécessitent `GEMINI_API_KEY` côté serveur. La génération Markdown valide ensuite le résultat avec le parseur avant d'ouvrir la modale de création. Si le Markdown généré est invalide, l'interface affiche l'erreur de validation, un `trace_id`, le Markdown généré et la sortie brute Gemini disponible ; le serveur écrit aussi un log structuré `[generate-markdown-import] invalid_markdown`.

Les graphiques auto importés créent un bloc CoinGecko configuré mais sans données fraîches. L'import affiche un avertissement et l'éditeur les remplit avec **Synchroniser** ou le bouton de rafraîchissement du bloc.

### API `POST /api/import-markdown`

Cette route crée une newsletter depuis du Markdown sans passer par la modale. Elle accepte deux modes d'authentification :

- le `access_token` de la session Auth Supabase d'un utilisateur connecté et approuvé ;
- le secret fixe `MARKDOWN_IMPORT_API_TOKEN` pour une intégration machine-to-machine.

Le Personal Access Token Supabase du dashboard ne correspond à aucun de ces deux modes.

#### Mode utilisateur

Dans ce mode, l'API écrit avec le token utilisateur et les règles RLS normales.

Depuis le code client de l'application :

```js
const {
  data: { session },
} = await supabase.auth.getSession();

const response = await fetch("/api/import-markdown", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ markdown }),
});
```

Pour un test manuel depuis la console navigateur de l'app connectée :

```js
const { supabase } = await import("/src/lib/supabase.js");
const { data: { session } } = await supabase.auth.getSession();
copy(session.access_token);
```

Puis dans le terminal :

```bash
export SUPABASE_ACCESS_TOKEN="token_copie"

curl -X POST http://127.0.0.1:5173/api/import-markdown \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: text/markdown" \
  --data-binary @examples/newsletter-markdown-import-complet.md
```

#### Mode intégration

Dans ce mode, le Bearer est le secret `MARKDOWN_IMPORT_API_TOKEN`. La route utilise un client Supabase serveur pour l'insertion et attribue la newsletter au profil technique `MARKDOWN_IMPORT_USER_ID`.

Variables serveur requises :

```env
MARKDOWN_IMPORT_API_TOKEN=secret_long_et_aleatoire
MARKDOWN_IMPORT_USER_ID=<uuid-du-profil-technique>
SUPABASE_SECRET_KEY=<secret-key-supabase>
```

`SUPABASE_SERVICE_ROLE_KEY` reste accepté comme fallback legacy si le projet ne dispose pas encore de `SUPABASE_SECRET_KEY`. Ces clés sont uniquement serveur : ne pas les préfixer par `VITE_`.

Appel :

```bash
curl -X POST https://decrypto-newsletter.vercel.app/api/import-markdown \
  -H "Authorization: Bearer $MARKDOWN_IMPORT_API_TOKEN" \
  -H "Content-Type: text/markdown" \
  --data-binary @examples/newsletter-markdown-import-complet.md
```

Corps JSON :

```json
{
  "markdown": "---\ntitle: \"Décrypto API\"\npreview_text: \"Import direct.\"\n---\n\n# Édition API\n",
  "options": {
    "theme_variant": "light",
    "show_section_numbers": false,
    "show_block_separators": true
  }
}
```

La route accepte aussi le Markdown brut avec `Content-Type: text/markdown`. En succès elle répond `201` avec `newsletter` et les `warnings` d'import.

---

## Collaboration en temps réel

### Hook `useNewsletter` — constantes

| Constante | Valeur |
|---|---|
| `LOCK_RENEW_INTERVAL_MS` | 120 000 ms (2 min) |
| `AUTOSAVE_DEBOUNCE_MS` | 2 000 ms (2 s) |
| `LOCAL_DRAFT_PREFIX` | `"decrypto-newsletter-draft"` |

### Cycle de vie du lock

1. **Acquisition** : `supabase.rpc("acquire_lock", { p_newsletter_id, p_force: false })` à l'ouverture
2. **Renouvellement** : toutes les 2 minutes si l'utilisateur est propriétaire du lock
3. **Libération** : `supabase.rpc("release_lock")` sur `beforeunload` et cleanup React
4. **TTL** : 10 minutes côté serveur (configurable dans `acquire_lock`)
5. **Force** : `takeOverLock()` appelle `acquire_lock` avec `p_force: true` puis broadcast `lock-taken`

### Canal Realtime

Canal stable `lock-requests:{newsletterId}`, créé une seule fois par couple `(newsletterId, userId)`.

| Événement broadcast | Émetteur | Récepteur | Description |
|---|---|---|---|
| `lock-request` | Observateur (B) | Propriétaire du lock (A) | B demande l'accès |
| `lock-taken` | Nouveau propriétaire (B) | Tous sauf B | B a pris le contrôle |

Le canal est géré via des refs (`channelRef`, `channelReadyRef`, `lockedByOtherRef`, `forcedOutRef`, `lockRequestSentRef`) pour éviter les doublons d'envoi et les récréations intempestives.

### `LockRequestBanner`

Slide-in animé côté A quand B demande l'accès. Auto-dismiss après **8 000 ms** (`AUTO_DISMISS_MS`). Animation CSS `lock-request-slide` (translateY -100% → 0).

### Draft local

Si le localStorage contient un draft `{ state, saved_at }` plus récent que `newsletter.updated_at`, il est utilisé à la place de la DB au chargement.

---

## Gestion des images

### `imageUpload.js` — constantes

| Constante | Valeur |
|---|---|
| `MAX_IMAGE_FILE_SIZE_BYTES` | 5 242 880 (5 Mo) |
| `MAX_IMAGE_FILE_SIZE_LABEL` | `"5 Mo"` |
| `MAX_IMAGE_STORAGE_BYTES` | 1 073 741 824 (1 Go) |
| `MAX_IMAGE_STORAGE_LABEL` | `"1 Go"` |

### Upload

- Formats acceptés : PNG, JPG, GIF, WebP
- Nommage : `{userId}/{timestamp}-{safename}.{ext}`, cache-control 31 536 000 (1 an)
- Compression optionnelle : canvas → PNG, jusqu'à 8 tentatives à 0,8× de ratio
- Stockage : bucket Supabase `newsletter-images`

### `listImages(userId, isAdmin)`

Liste les images de la racine + tous les dossiers utilisateurs (limite 200 par requête). `canDelete = true` si `isAdmin` OU si le dossier correspond à `userId`. Exclut `.emptyFolderPlaceholder` et le dossier `braze-export`.

### `ImageManagerModal` — modes d'affichage

| Mode | Colonnes desktop → mobile |
|---|---|
| `grid4` | 4 → 2 colonnes |
| `grid8` | 8 → 4 colonnes |
| `grid16` | 16 → 8 colonnes |
| `list` | Tableau |

### Sélection

- **Simple** : `onSelect({ url, path })` — sélectionne et ferme
- **Multi-select** : `onSelectMany(images[])` — sélection multiple avec bouton "Utiliser", select all, suppression groupée
- **Label filter** : logique OR (image affichée si elle possède au moins un label sélectionné)

---

## Données marché CoinGecko

### `useCoinGecko.js` — 60 cryptos

Bitcoin, Ethereum, USD-Coin, Solana, XRP, Dogecoin, Cardano, Avalanche, TON, Chainlink, Polkadot, Litecoin, Bitcoin Cash, Shiba Inu, Uniswap, Stellar, Aave, Tezos, Cosmos, Filecoin, Arbitrum, Optimism, Pepe, Hyperliquid, Bittensor, Injective, Sui, Aptos, Render, Fetch.ai, Near, Kaspa, Polygon, Lido DAO, Raydium, MultiversX, Bonk, dogwifhat, Axie Infinity, Floki, The Graph, Arweave, Jupiter, StarkNet, Gnosis, GMX, Curve, dYdX, Synthetix, Decentraland, Algorand, ApeCoin, Gala, The Sandbox, Loopring, Sonic, Pyth Network, Ondo Finance, Sky, Basic Attention Token, Sushi, ENS.

### `fetch7d(cryptoId, currency = "eur", days = 7)`

Appelle `https://api.coingecko.com/api/v3/coins/{id}/market_chart`.

Retourne :

```js
{
  label,         // ex. "BTC / EUR"
  value,         // prix courant formaté
  price_start,   // prix début de période
  price_high,    // prix le plus haut
  price_low,     // prix le plus bas
  delta,         // ex. "▲ +2,93 %"
  delta_tone,    // "positive" | "negative"
  subdelta,      // ex. "+1 838 € sur 7j"
  points,        // float[] normalisés 0–100
  x_labels,      // string[] — noms des jours ou "DD/MM" si > 7 jours
  raw_prices,    // { date, price }[]
  y_axis_ticks   // float[] — ticks axe Y (nice step multiple de 100, 3–6 ticks)
}
```

Points dédupliqués par jour calendaire UTC (dernière valeur du jour retenue).

---

## Thème et identité visuelle

### `theme.js` — tokens

**Thème sombre (`THEME`)** :

| Token | Valeur |
|---|---|
| `accentPrimary` | `#FF00AA` (magenta) |
| `accentSecondary` | `#4141FF` (bleu) |
| `accentTertiary` | `#8701FF` (violet) |
| `accentWarm` | `#FF4B28` |
| `positive` | `#03FFCF` (cyan) |
| `negative` | `#FF4B28` |
| `warning` | `#FF8B28` |
| `bgPage` / `bgEmail` | `#0B0B0D` |
| `bgSection` | `#101018` |
| `bgFooter` | `#000000` |
| `bgEventCard` | `#171717` |

**Thème clair (`LIGHT_THEME`)** : étend `THEME` avec `bgEmail = #FFFFFF`, `bgSection = #F7F8FA`, `positive = #00BB97`.

**Polices** :

```js
FONTS.heading = FONTS.body = FONTS.mono = "'Sora', Calibri, 'Trebuchet MS', Arial, sans-serif"
FONTS.sora = [/* 8 graisses 100–800, fichiers .ttf sur CDN Braze */]
```

**Marque** :
- Nom : `COINHOUSE`
- Adresse : SAS au capital de 210 000 €, RCS Paris 815 254 545
- Mention légale : PSCA agréé MiCA n°A2026-013

### `calloutPictos.js` — 15 pictos

| ID | Label | Couleur par défaut |
|---|---|---|
| `info` | Info | #00FFFF |
| `decode` | Décryptage | #00FFFF |
| `insight` | Analyse | #00FFFF |
| `pin` | À retenir | #00FFFF |
| `warning` | Attention | #FF4B28 |
| `signal` | Signal | #03FFCF |
| `context` | Contexte | #00FFFF |
| `read` | Lecture | #00FFFF |
| `timing` | Timing | #00FFFF |
| `target` | Objectif | #FF00AA |
| `dollar` | Dollar | #03FFCF |
| `euro` | Euro | #00FFFF |
| `btc` | Bitcoin | #FF8B28 |
| `eth` | Ethereum | #B36BFF |
| `question` | Question | #00FFFF |

**9 couleurs de callout** : `#00FFFF` Cyan, `#03FFCF` Menthe, `#4141FF` Bleu, `#FF00AA` Rose, `#FF8B28` Orange, `#FF4B28` Corail, `#B36BFF` Violet, `#FFE600` Jaune, `#FFFFFF` Blanc.

`DEFAULT_PICTO_ID = "info"`, `DEFAULT_CALLOUT_COLOR = "#00FFFF"`.

---

## Schéma de base de données

Extension PostgreSQL requise : `pgcrypto`.

### Tables

#### `profiles`

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | Référence `auth.users(id)` CASCADE |
| `full_name` | text | |
| `avatar_url` | text | |
| `email` | text NOT NULL | |
| `approved` | boolean | default `false` |
| `is_admin` | boolean | default `false` |
| `password_set` | boolean | default `false` |
| `auth_provider` | text | default `'email'` |
| `created_at` | timestamptz | |

Trigger `on_auth_user_created` : insère un profil non approuvé à chaque inscription. `password_set` vaut `true` pour les providers OAuth (Google…).

#### `newsletters`

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `title` | text NOT NULL | |
| `issue_number` | text | |
| `current_state` | jsonb NOT NULL | Brouillon complet (auto-save) |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | Auto-mis à jour par trigger |
| `created_by` | uuid | → `profiles`, SET NULL |
| `updated_by` | uuid | → `profiles`, SET NULL — mis à jour par trigger |
| `archived` | boolean | default `false` |

Index : `updated_at DESC`, `archived`.

#### `versions`

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `newsletter_id` | uuid NOT NULL | → `newsletters` CASCADE |
| `state` | jsonb NOT NULL | Snapshot complet |
| `author_id` | uuid | → `profiles`, SET NULL |
| `comment` | text | |
| `created_at` | timestamptz | |

Index : `(newsletter_id, created_at DESC)`.

#### `template_presets`

Presets réutilisables de structure newsletter. Chaque utilisateur approuvé peut en créer et modifier les siens. Les admins voient, éditent et suppriment tous les presets.

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text NOT NULL | |
| `sections` | jsonb | default `'[]'` |
| `include_default_content` | boolean | default `true` |
| `show_section_numbers` | boolean | default `true` |
| `theme_variant` | text | `'dark'` ou `'light'`, check constraint |
| `show_issue_date` | boolean | default `true` |
| `created_at` / `updated_at` | timestamptz | |
| `created_by` / `updated_by` | uuid | → `profiles`, SET NULL |

Index : `lower(name)`.

#### `locks`

| Colonne | Type | Notes |
|---|---|---|
| `newsletter_id` | uuid PK | → `newsletters` CASCADE |
| `user_id` | uuid NOT NULL | → `profiles` CASCADE |
| `acquired_at` | timestamptz | |
| `expires_at` | timestamptz NOT NULL | `now() + interval '10 minutes'` |
| `user_full_name` | text | |
| `user_email` | text | |

### RPC Postgres

#### `acquire_lock(p_newsletter_id uuid, p_force boolean = false)`

Retourne une ligne `public.locks`. Logique atomique (UPSERT) :
- Pas de lock, ou lock expiré, ou lock de l'utilisateur courant → upsert
- `p_force = true` → force le remplacement
- Sinon → retourne la ligne existante (client affiche le bandeau)

`acquired_at` est préservé si l'utilisateur renouvelle son propre lock.

#### `release_lock(p_newsletter_id uuid)`

Supprime le lock si `user_id = auth.uid()`.

#### `admin_create_user(p_email, p_password, p_full_name, p_approved, p_is_admin)`

Crée un utilisateur Auth confirmé (sans email de confirmation) + son profil. Si l'email existe déjà dans `auth.users`, met à jour le profil uniquement. Mot de passe minimum : 8 caractères. Retourne le profil créé.

#### Fonctions utilitaires (SECURITY DEFINER)

- `current_user_is_admin()` → boolean
- `current_user_is_approved()` → boolean
- `touch_updated_at()` → trigger — met à jour `updated_at` et `updated_by` avant chaque UPDATE

### Triggers

- `on_auth_user_created` (AFTER INSERT on `auth.users`) → `handle_new_user()`
- `newsletters_touch` (BEFORE UPDATE on `newsletters`) → `touch_updated_at()`
- `template_presets_touch` (BEFORE UPDATE on `template_presets`) → `touch_updated_at()`

### RLS (Row Level Security)

Toutes les tables ont RLS activé.

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | Tous les authentifiés | Trigger uniquement | Soi-même (sans changer `is_admin`) OU admin | Admin |
| `newsletters` | Approuvés | Approuvés | Approuvés | Admin OU créateur |
| `versions` | Approuvés | Approuvés (`author_id = auth.uid()`) | — | — |
| `template_presets` | Approuvés | Approuvés (`created_by = auth.uid()`) | Créateur OU admin | Créateur OU admin |
| `locks` | Approuvés | Approuvés (`user_id = auth.uid()`) | Propriétaire | Propriétaire OU expiré OU admin |

---

## API serverless Vercel

### `api/export-braze.js` — POST

Auth : Bearer token → vérifie `profiles.is_admin AND approved`.

Body :
```json
{
  "assets": [
    { "assetName": "chart.png", "base64": "…" },
    { "assetName": "header.png", "assetUrl": "https://…" }
  ]
}
```

Limites : 30 assets max, 5 Mo par asset.

Réponse :
```json
{ "assets": { "chart.png": "https://cdn.braze.eu/…" } }
```

Variables d'environnement : `BRAZE_API_KEY`, `BRAZE_BASE_URL` (ou `BRAZE_REST_ENDPOINT`), `SUPABASE_URL` / `VITE_SUPABASE_URL`, `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`.

### `api/send-preview.js` — POST

Auth : Bearer token Supabase → vérifie `profiles.approved`.

Body :
```json
{
  "to": "thomas@coinhouse.com, equipe@coinhouse.com",
  "subject": "[Preview] Newsletter",
  "previewText": "Texte de prévisualisation.",
  "html": "<!doctype html>..."
}
```

Envoie le HTML courant via Resend. Limites : 10 destinataires max, HTML max 2 Mo.

Variables d'environnement : `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (ou `RESEND_FROM`), `SUPABASE_URL` / `VITE_SUPABASE_URL`, `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`.

### `api/supabase-keepalive.js` — GET ou POST

Cron Vercel : lundi et jeudi à 08h17 (schedule `"17 8 * * 1,4"`).

Appelle `POST {SUPABASE_URL}/rest/v1/rpc/keepalive`. Accepte `CRON_SECRET` optionnel en Authorization.

### `api/export-preview-jpg.js` — POST

Auth : Bearer token Supabase. Corps : `{ html, device }`. Rend le HTML via Puppeteer + @sparticuz/chromium et retourne un JPG.

### `api/generate-preview-text.js` — POST

Corps : `{ draft }` ou `{ state }`. Génère un texte d'aperçu email via IA.

### `api/correct-text.js` — POST

Corps : `{ html }`. Retourne `{ html }` corrigé orthographiquement.

---

## Setup local

### 1. Créer le projet Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Dans **SQL Editor**, exécuter `supabase/schema.sql`

### 2. Configurer Supabase Storage

Créer un bucket `newsletter-images` (public).

### 3. Variables d'environnement

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_AUTH_REDIRECT_URL=http://localhost:5173
```

### 4. Lancer en local

```bash
npm install
npm run dev
```

### 5. Créer le premier compte admin

1. Ouvrir `http://localhost:5173`, créer un compte
2. Dans Supabase → SQL Editor, exécuter `supabase/bootstrap-admin.sql` avec son email
3. Recharger → accès complet

---

## Déploiement Vercel

### Variables d'environnement Vercel

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | URL du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clé anon public Supabase |
| `VITE_AUTH_REDIRECT_URL` | URL publique de l'app |
| `SUPABASE_URL` | Idem (pour les fonctions serverless) |
| `SUPABASE_ANON_KEY` | Idem (pour les fonctions serverless) |
| `SUPABASE_SECRET_KEY` | Clé Supabase serveur pour le mode intégration Markdown |
| `SUPABASE_SERVICE_ROLE_KEY` | Fallback legacy pour le mode intégration Markdown |
| `MARKDOWN_IMPORT_API_TOKEN` | Bearer fixe pour l'import Markdown machine-to-machine |
| `MARKDOWN_IMPORT_USER_ID` | UUID du profil technique auteur des imports Markdown |
| `GEMINI_API_KEY` | Clé serveur Gemini pour générer un Markdown depuis un brief libre |
| `RESEND_API_KEY` | Clé serveur Resend pour envoyer les previews email |
| `RESEND_FROM_EMAIL` | Expéditeur vérifié Resend, ex. `Coinhouse Preview <preview@coinhouse.com>` |
| `BRAZE_API_KEY` | Clé serveur Braze (permission `media_library.create`) |
| `BRAZE_BASE_URL` | REST endpoint Braze (ex. `https://rest.fra-01.braze.eu`) |
| `CRON_SECRET` | Secret optionnel pour l'endpoint keepalive |

### `vercel.json`

```json
{
  "crons": [{ "path": "/api/supabase-keepalive", "schedule": "17 8 * * 1,4" }],
  "headers": [
    { "source": "/", "headers": [{ "key": "Cache-Control", "value": "no-store, no-cache, must-revalidate, max-age=0" }] },
    { "source": "/index.html", "headers": [{ "key": "Cache-Control", "value": "no-store, no-cache, must-revalidate, max-age=0" }] },
    { "source": "/assets/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] }
  ],
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Ajouter l'URL Vercel aux Redirect URLs Supabase

Dans **Supabase → Authentication → URL Configuration**.

---

## Scripts

```bash
npm run dev      # Serveur de développement (http://localhost:5173)
npm run build    # Build de production (dist/)
npm run preview  # Prévisualiser le build de production localement
npm run test:markdown  # Tests ciblés du parseur d'import Markdown
```

---

## Étendre le projet

### Ajouter un type de bloc

1. `src/config/schema.js` → `SECTION_TYPES` : ajouter `label`, `icon`, `factory()`
2. `src/render/buildEmail.js` → ajouter la fonction de rendu et le case dans `renderSection()`
3. `src/components/SectionEditor.jsx` → ajouter le formulaire et le case dans `SectionEditor`

Si le bloc ne doit pas être numéroté, l'ajouter à `UNNUMBERED_TYPES` dans `schema.js`.

### Ajouter un picto d'encadré

`src/config/calloutPictos.js` → `CALLOUT_PICTOS` : `{ id, num, label, color, svgInner }` (SVG 24×24).

### Modifier la palette

`src/config/theme.js` pour les couleurs email et marque. `tailwind.config.js` pour les tokens Tailwind utilisés dans l'UI.
