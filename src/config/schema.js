// ─────────────────────────────────────────────────────────────────────────────
// Schema — modèle de données basé sur des sections modulaires
// ─────────────────────────────────────────────────────────────────────────────
// Un brouillon est composé de :
//   - propriétés racine : brand, issue_number, date, preview_text, header, footer
//   - un tableau `sections: [...]` où chaque section a un { id, type, data }
//
// Les sections sont déplaçables / dupliquables / suppressibles. Le type détermine
// le rendu (édito, graphique, jauge, etc.). Le contenu de chaque section vit
// dans `data`.
//
// L'header et le footer sont FIXES (toujours présents) pour garantir les
// mentions légales PSAN obligatoires.

import { BRAND } from "./theme.js";

// ─────────────────────────────────────────────────────────────────────────────
// Catalogue des types de sections disponibles
// ─────────────────────────────────────────────────────────────────────────────
// Pour chaque type :
//   - label    : nom affiché dans la palette
//   - icon     : nom Lucide (string)
//   - factory  : fonction qui retourne une instance vierge de ce type
//   - render   : (déclaré dans buildEmail.js, on s'en sert juste pour la palette)
//
// Pour ajouter un nouveau type : (1) ajouter une entrée ici, (2) ajouter la
// fonction de rendu dans buildEmail.js, (3) ajouter le formulaire d'édition
// dans SectionEditor.jsx.

export const SECTION_TYPES = {
  hero: {
    label: "Hero",
    icon: "Megaphone",
    factory: () => ({
      kicker: "━━ \u00A0 DÉCRYPTO · L'HEBDO COINHOUSE",
      title: "Le marché reprend son souffle.",
      title_accent: "souffle",
      title_part1: "Le marché",
      title_part2: "reprend son ",
      title_highlight: "souffle.",
      subtitle:
        "Volatilité au plus bas, ETF en relais, FED qui tempère. On déroule la semaine en quatre temps.",
      chips: [
        { label: "BTC +2,93 %", type: "btc" },
        { label: "ETH +1,80 %", type: "eth" },
        { label: "F&G 72 · Greed", type: "fear_greed" },
      ],
    }),
  },
  index: {
    label: "Sommaire",
    icon: "List",
    factory: () => ({
      label: "Au sommaire",
      items: [
        { number: "01", title: "Édito — La détente du marché" },
        { number: "02", title: "Indicateur — Fear & Greed à 72" },
        { number: "03", title: "Analyse — 4 signaux à suivre" },
        { number: "04", title: "Macro — Que retenir de la FED" },
      ],
    }),
  },
  edito: {
    label: "Édito + KPI",
    icon: "Newspaper",
    factory: () => ({
      kicker: "ÉDITO",
      title: "La détente du marché",
      body:
        "Bitcoin a refranchi les <strong>64 000 €</strong> sans accroc, dans un climat où la volatilité implicite à 30 jours s'est effondrée. Le mouvement n'a rien d'euphorique — et c'est ce qui le rend solide.",
      kpis: [],
    }),
  },
  focus: {
    label: "Texte & Media",
    icon: "ImageIcon",
    factory: () => ({
      kicker: "FOCUS",
      title: "Confier ses crypto à des experts, sans renoncer au contrôle",
      items: [
        {
          id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2),
          type: "text",
          body: "Sur un marché qui mûrit, beaucoup d'investisseurs nous posent la même question : <strong>comment intégrer la crypto dans une stratégie patrimoniale long terme, sans y consacrer ses week-ends ?</strong> La réponse Coinhouse tient en trois principes. <strong>D'abord la sécurité :</strong> nos actifs sont conservés en cold storage chez des dépositaires régulés en Europe, avec une assurance dédiée. <strong>Ensuite la transparence :</strong> chaque arbitrage est documenté, chaque frais explicite. <strong>Enfin l'accompagnement :</strong> un conseiller dédié, joignable, qui connaît votre allocation globale et ajuste l'exposition crypto au fil des cycles.",
        },
      ],
    }),
  },
  chart: {
    label: "Graphique",
    icon: "TrendingUp",
    factory: () => ({
      chart_mode: "auto",
      chart_crypto: "bitcoin",
      chart_currency: "eur",
      chart_days: 7,
      label: "BTC / EUR",
      value: "64 492,76 €",
      price_start: "62 654 €",
      price_high: "",
      price_low: "",
      y_axis_ticks: [],
      delta: "▲ +2,93 %",
      delta_tone: "positive",
      subdelta: "+1 838 € sur 7j",
      // Points : 0 = bas du graphique (prix bas), 100 = haut (prix élevé)
      points: [31.1, 40, 21.1, 50, 59.4, 70.6, 93.3],
      x_labels: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
    }),
  },
  fear_greed: {
    label: "Fear & Greed",
    icon: "Gauge",
    factory: () => ({
      kicker: "INDICATEUR",
      title: "Fear & Greed Index",
      value: "72",
      classification: "GREED",
      commentary:
        "Premier passage en zone <strong>Greed</strong> depuis février. Historiquement, ces phases coïncident avec des prises de bénéfices partielles plutôt qu'avec un afflux massif d'acheteurs.",
    }),
  },
  signals: {
    label: "Signaux",
    icon: "Activity",
    factory: () => ({
      kicker: "ANALYSE",
      title: "4 signaux à suivre cette semaine",
      signals: [
        {
          direction: "up",
          title: "Flux entrants ETF spot",
          description: "+1,2 Md$ sur 7 jours · retour des allocations institutionnelles.",
        },
        {
          direction: "down",
          title: "Concentration des wallets",
          description: "Top 100 BTC = 14,8 % de l'offre · plus haut depuis 2023.",
        },
        {
          direction: "up",
          title: "MiCA phase 2",
          description: "Standards techniques publiés · Coinhouse conforme.",
        },
        {
          direction: "down",
          title: "Stablecoins · pression US",
          description: "Sénat américain en examen · impact potentiel sur USDT/USDC.",
        },
      ],
    }),
  },
  macro: {
    label: "Macro / Citation",
    icon: "Quote",
    factory: () => ({
      kicker: "MACRO",
      title: "Que retenir de la FED",
      body:
        "Powell confirme une posture <strong>« higher for longer »</strong>, tout en ouvrant la porte à une première baisse en septembre si l'inflation cœur poursuit sa décrue.",
      quote:
        "Nous avons besoin de plus de confiance que l'inflation se rapproche durablement de notre cible avant d'envisager un assouplissement.",
      quote_author: "Jerome Powell · Conférence du 1<sup>er</sup> mai",
      bg_image_url: "",
      bg_image_path: "",
    }),
  },
  macro_bars: {
    label: "Barres Macro",
    icon: "BarChart2",
    factory: () => ({
      bars: [
        { label: "Baisses pricées en 2026", value: "1,5", percent: "38", caption: "vs 3 il y a 1 mois" },
        { label: "Inflation cœur (CPI)", value: "3,2", percent: "53", caption: "cible 2 %" },
        { label: "Probabilité baisse sept.", value: "62 %", percent: "62", caption: "implicite Fed Funds" },
      ],
    }),
  },
  commented_number: {
    label: "Chiffre commenté",
    icon: "Hash",
    factory: () => ({
      index_label: "Le chiffre de la semaine",
      kicker: "LE CHIFFRE",
      value: "+1,2",
      unit: "Md $",
      caption: "Flux ETF spot · 7 jours",
      title: "Les allocations institutionnelles reprennent leur place.",
      body:
        "Premier flux net hebdo positif depuis trois semaines. BlackRock et Fidelity captent à eux deux <strong>62 %</strong> du volume — la concentration s'accentue.",
    }),
  },
  feature_grid: {
    label: "Grille bénéfices",
    icon: "Grid2X2",
    factory: () => ({
      kicker: "Bloc visuel · Hiérarchisé",
      featured: {
        label: "Bénéfice n°1",
        title: "Vos achats crypto, enfin sans friction bancaire.",
        body: "Compte euro indépendant — fini les refus, les frais cachés, les appels du conseiller.",
        picto: "check",
        show_icon: true,
        color: "#FF00AA",
      },
      bg_image_url: "",
      bg_image_path: "",
      cta_label: "",
      cta_url: "",
      cta_style: "gradient",
      cta_arrow: true,
      items: [
        {
          title: "Moins de frais qu'avec votre carte",
          body: "Virer depuis votre compte euro coûte moins cher que payer par CB.",
          picto: "euro",
          color: "#00FFFF",
        },
        {
          title: "Achats récurrents sans rejet",
          body: "Vos investissements programmés s'exécutent automatiquement.",
          picto: "pin",
          color: "#FF8B28",
        },
        {
          title: "IBAN français FR76",
          body: "Partenariat filiale Société Générale.",
          picto: "shield",
          color: "#B36BFF",
        },
        {
          title: "Gratuit · 24h/24",
          body: "Aucun frais de tenue de compte pour les particuliers.",
          picto: "check",
          color: "#03FFCF",
        },
      ],
    }),
  },
  comparison: {
    label: "Comparatif",
    icon: "Grid2X2",
    factory: () => ({
      kicker: "Comparatif",
      column_left: "Staking<br>Standard",
      column_right: "Staking<br>Flexible",
      rows: [
        {
          label: "Disponibilité des fonds",
          left: "Délai de 1 à 30 jours",
          right: "Retrait instantané*",
          highlight: "right",
        },
        {
          label: "Taux de rendement annuel indicatif",
          left: "Plus élevé",
          right: "Plus faible",
          highlight: "left",
        },
        {
          label: "Idéal pour",
          left: "Long terme, sans besoin de liquidité",
          right: "Garder de la flexibilité",
          highlight: "none",
        },
        {
          label: "Compatible avec",
          left: "Tous les abonnements",
          right: "Tous les abonnements",
          highlight: "none",
        },
      ],
      footnote: "* Sous réserve des conditions de marché.",
    }),
  },
  editorial_list: {
    label: "Liste éditoriale",
    icon: "List",
    factory: () => ({
      kicker: "Cinq raisons d'activer",
      items: [
        {
          title: "Vos achats crypto, sans friction bancaire",
          body: "Compte indépendant. Plus de refus, plus d'appels du conseiller.",
          tag: "Zéro blocage",
          tag_color: "#03FFCF",
        },
        {
          title: "Achetez moins cher qu'avec votre carte",
          body: "Virer depuis votre compte euro réduit vos frais de transaction.",
          tag: "Frais réduits",
          tag_color: "#00FFFF",
        },
        {
          title: "Programmez vos achats sans y penser",
          body: "Vos investissements récurrents s'exécutent sans risque de rejet de CB.",
          tag: "Auto",
          tag_color: "#FF8B28",
        },
        {
          title: "Un IBAN français à votre nom",
          body: "FR76, adossé à un partenariat filiale Société Générale.",
          tag: "FR76",
          tag_color: "#C46BFF",
        },
        {
          title: "Gratuit, disponible 24h/24",
          body: "Aucun frais de tenue de compte pour les particuliers.",
          tag: "0 €",
          tag_color: "#FF00AA",
        },
      ],
    }),
  },
  event: {
    label: "Évènement",
    icon: "Calendar",
    factory: () => ({
      day: "14",
      month: "MAI",
      year: "2026",
      kicker: "ÉVÈNEMENT · PARIS",
      title: "Crypto pour Tous",
      description:
        "Une soirée pour comprendre comment intégrer 1 à 5 % de crypto dans une allocation patrimoniale. 40 places.",
      cta_label: "S'inscrire — gratuit →",
      cta_url: "#",
    }),
  },
  referral: {
    label: "Parrainage",
    icon: "Gift",
    factory: () => ({
      kicker: "Programme de parrainage",
      title: "Invitez vos proches et recevez jusqu'a <strong>500€</strong> en bitcoin",
      description: "",
      code_label: "Votre code",
      code_liquid: "{{custom_attribute.${referral_code}}}",
      cta_label: "Partager →",
      cta_url: "#",
      bg_image_url: "",
      bg_image_path: "",
    }),
  },
  text_block: {
    label: "Texte",
    icon: "Type",
    factory: () => ({
      kicker: "État du marché",
      title: "Ce qu'il faut retenir",
      body:
        "Bitcoin vient de repasser le cap des 80 000 $. Mais derrière ce beau rebond, s'agit-il d'une vraie reprise ou d'une simple respiration du marché ? On fait le point.\n\n\nLe meilleur mois depuis un an : \nLe cours a franchi la barre symbolique des 80 000 $ (flirtant même avec les 81 000 $), son plus haut niveau depuis fin janvier.  \nAvec près de 12 % de hausse sur le mois d'avril, le Bitcoin signe sa meilleure performance depuis un an et met fin à cinq longs mois de baisse.\n \nLes institutionnels à la manœuvre : \nCe regain d'énergie est largement porté par la finance traditionnelle via les ETF.  \nPrès de 1,97 milliard de dollars y ont été injectés en avril, avec un pic impressionnant de 630 millions sur la seule journée du 1er mai.",
      cta_label: "",
      cta_url: "",
      cta_style: "gradient",
    }),
  },
  cta: {
    label: "CTA",
    icon: "MousePointerClick",
    factory: () => ({
      label: "Découvrir",
      url: "#",
      cta_style: "gradient",
      arrow: true,
      centered: false,
      show_top_separator: true,
      secondary_label: "",
      secondary_url: "",
      secondary_arrow: false,
    }),
  },
  spacer: {
    label: "Spacer",
    icon: "ChevronsUpDown",
    factory: () => ({
      height: 32,
    }),
  },
  image_block: {
    label: "Image",
    icon: "ImageIcon",
    factory: () => ({
      image_url: "",
      image_path: "",
      image_alt: "Visuel d'illustration",
      link_url: "",
      show_border: true,
    }),
  },
  divider: {
    label: "Séparateur",
    icon: "Minus",
    factory: () => ({
      style: "thin", // thin | thick | gradient
    }),
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// État initial — la structure type Décrypto
// ─────────────────────────────────────────────────────────────────────────────

let nextSectionId = 1;
const sid = () => `s${Date.now()}_${nextSectionId++}`;

function section(type, dataOverride = {}) {
  const data = SECTION_TYPES[type].factory();
  return { id: sid(), type, data: normalizeSectionData(type, { ...data, ...dataOverride }) };
}

const REFERRAL_OLD_DEFAULTS = {
  kicker: "→ Programme de parrainage",
  title: "Chaque proche que vous parrainez, c'est <strong>20 €</strong> pour vous deux.",
  description: "Aucun plafond. Plus vous partagez Décrypto autour de vous, plus vous cumulez.",
};

function normalizeSectionData(type, data = {}) {
  if (type !== "referral") return data;
  const defaults = SECTION_TYPES.referral.factory();
  return {
    ...data,
    kicker: data.kicker === REFERRAL_OLD_DEFAULTS.kicker ? defaults.kicker : (data.kicker ?? defaults.kicker),
    title: data.title === REFERRAL_OLD_DEFAULTS.title ? defaults.title : (data.title ?? defaults.title),
    description: data.description === REFERRAL_OLD_DEFAULTS.description ? defaults.description : (data.description ?? defaults.description),
    code_label: data.code_label ?? defaults.code_label,
    code_liquid: data.code_liquid ?? defaults.code_liquid,
    cta_label: data.cta_label ?? defaults.cta_label,
    cta_url: data.cta_url ?? defaults.cta_url,
    bg_image_url: data.bg_image_url ?? defaults.bg_image_url,
    bg_image_path: data.bg_image_path ?? defaults.bg_image_path,
  };
}

function normalizeExistingSections(sections = []) {
  return sections.map((sec) => ({
    ...sec,
    data: normalizeSectionData(sec.type, sec.data || {}),
  }));
}

function thursdayOfCurrentWeek() {
  const now = new Date();
  const diff = 4 - now.getDay(); // 4 = jeudi
  const thu = new Date(now);
  thu.setDate(now.getDate() + diff);
  const d = String(thu.getDate()).padStart(2, "0");
  const m = String(thu.getMonth() + 1).padStart(2, "0");
  return `${d}.${m}.${thu.getFullYear()}`;
}

export const INITIAL_STATE = {
  // ── Identité de marque ────────────────────────────────────────────────
  brand_name: BRAND.name,

  // ── En-tête fixe ──────────────────────────────────────────────────────
  issue_number: "1",
  issue_date: thursdayOfCurrentWeek(),
  preview_text:
    "Le marché reprend son souffle — F&G à 72, ETF +1,2 Md$, FED qui tempère.",
  show_section_numbers: true,
  show_block_separators: true,
  theme_variant: "dark",

  // ── Sections modulaires ───────────────────────────────────────────────
  sections: [
    section("hero"),
    section("index"),
    section("edito"),
    section("chart"),
    section("fear_greed"),
    section("signals"),
    section("macro"),
    section("event"),
  ],

  // ── Pied de page fixe ─────────────────────────────────────────────────
  footer: {
    links: [
      { label: "Particuliers", url: "http://coinhouse.com/fr/particuliers" },
      { label: "Clientèle Privée", url: "https://www.coinhouse.com/fr/clientele-privee" },
      { label: "Entreprises", url: "https://www.coinhouse.com/fr/entreprises" },
      { label: "Académie", url: "https://www.coinhouse.com/fr/academie" },
    ],
    address: BRAND.address,
    legal: BRAND.legalNotice,
    unsub_url: "{{${set_user_to_unsubscribed_url}}}",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Migration : état ancien (props à plat) → nouveau (sections)
// ─────────────────────────────────────────────────────────────────────────────
// Détectée à l'ouverture d'une newsletter : si pas de `sections`, on convertit.

export function migrateLegacyState(oldState) {
  if (oldState && Array.isArray(oldState.sections)) {
    // Déjà au nouveau format
    return {
      ...oldState,
      sections: normalizeExistingSections(oldState.sections),
      show_section_numbers: oldState.show_section_numbers !== false,
      show_block_separators: oldState.show_block_separators !== false,
      theme_variant: oldState.theme_variant === "light" ? "light" : "dark",
    };
  }
  if (!oldState) return INITIAL_STATE;

  const o = oldState;
  const sections = [];

  // Hero
  if (o.hero_title_part1 !== undefined || o.hero_kicker !== undefined) {
    sections.push({
      id: sid(),
      type: "hero",
      data: {
        kicker: o.hero_kicker ?? "",
        title: [o.hero_title_part1, o.hero_title_part2, o.hero_title_highlight].filter(Boolean).join(""),
        title_accent: o.hero_title_highlight ?? "",
        title_part1: o.hero_title_part1 ?? "",
        title_part2: o.hero_title_part2 ?? "",
        title_highlight: o.hero_title_highlight ?? "",
        subtitle: o.hero_subtitle ?? "",
        chips: o.hero_chips ?? [],
      },
    });
  }

  // Index
  if (o.index_items && o.index_items.length) {
    sections.push({
      id: sid(),
      type: "index",
      data: {
        label: o.index_label ?? "Au sommaire",
        items: o.index_items,
      },
    });
  }

  // Édito + KPI
  if (o.edito_title !== undefined || o.edito_body !== undefined) {
    sections.push({
      id: sid(),
      type: "edito",
      data: {
        kicker: o.edito_kicker ?? "ÉDITO",
        title: o.edito_title ?? "",
        body: o.edito_body ?? "",
        kpis: o.edito_kpis ?? [],
      },
    });
  }

  // Chart
  if (o.chart_value !== undefined || o.chart_points) {
    sections.push({
      id: sid(),
      type: "chart",
      data: {
        label: o.chart_label ?? "",
        value: o.chart_value ?? "",
        delta: o.chart_delta ?? "",
        delta_tone: o.chart_delta_tone ?? "positive",
        subdelta: o.chart_subdelta ?? "",
        points: o.chart_points ?? [50, 50, 50, 50, 50, 50, 50],
        x_labels: o.chart_x_labels ?? ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
      },
    });
  }

  // Fear & Greed
  if (o.fg_value !== undefined) {
    sections.push({
      id: sid(),
      type: "fear_greed",
      data: {
        kicker: o.fg_kicker ?? "INDICATEUR",
        title: o.fg_title ?? "Fear & Greed Index",
        value: o.fg_value ?? "50",
        classification: o.fg_classification ?? "NEUTRAL",
        commentary: o.fg_commentary ?? "",
      },
    });
  }

  // Signaux
  if (o.signals && o.signals.length) {
    sections.push({
      id: sid(),
      type: "signals",
      data: {
        kicker: o.signals_kicker ?? "ANALYSE",
        title: o.signals_title ?? "",
        signals: o.signals,
      },
    });
  }

  // Macro
  if (o.macro_title !== undefined || o.macro_quote !== undefined) {
    sections.push({
      id: sid(),
      type: "macro",
      data: {
        kicker: o.macro_kicker ?? "MACRO",
        title: o.macro_title ?? "",
        body: o.macro_body ?? "",
        quote: o.macro_quote ?? "",
        quote_author: o.macro_quote_author ?? "",
        bars: o.macro_bars ?? [],
      },
    });
  }

  // Évènement
  if (o.event_title !== undefined) {
    sections.push({
      id: sid(),
      type: "event",
      data: {
        day: o.event_day ?? "",
        month: o.event_month ?? "",
        year: o.event_year ?? "",
        kicker: o.event_kicker ?? "",
        title: o.event_title ?? "",
        description: o.event_description ?? "",
        cta_label: o.event_cta_label ?? "",
        cta_url: o.event_cta_url ?? "#",
      },
    });
  }

  return {
    brand_name: o.brand_name ?? BRAND.name,
    issue_number: o.issue_number ?? "",
    issue_date: o.issue_date ?? "",
    preview_text: o.preview_text ?? "",
    show_section_numbers: o.show_section_numbers !== false,
    show_block_separators: o.show_block_separators !== false,
    theme_variant: o.theme_variant === "light" ? "light" : "dark",
    sections,
    footer: {
      links: o.footer_links ?? [],
      address: o.footer_address ?? BRAND.address,
      legal: o.footer_legal ?? BRAND.legalNotice,
      unsub_url: o.footer_unsub_url ?? "{{${set_user_to_unsubscribed_url}}}",
    },
  };
}

// Utilitaire pour créer une nouvelle section depuis l'UI
export function createSection(type) {
  if (!SECTION_TYPES[type]) {
    throw new Error(`Type de section inconnu : ${type}`);
  }
  return section(type, getDefaultSectionData(type));
}

// ─────────────────────────────────────────────────────────────────────────────
// Template par défaut configurable par l'admin
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "decrypto:default_sections";
const SECTION_DEFAULTS_KEY = "decrypto:section_defaults";
const ROOT_DEFAULTS_KEY = "decrypto:root_defaults";

export const INITIAL_SECTION_TYPES = INITIAL_STATE.sections.map((s) => s.type);
export const DEFAULT_TEMPLATE_USES_CONTENT = true;

export function getAllDefaultSectionOverrides() {
  try {
    const raw = localStorage.getItem(SECTION_DEFAULTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getDefaultSectionData(type) {
  const base = SECTION_TYPES[type]?.factory?.() ?? {};
  const overrides = getAllDefaultSectionOverrides();
  return normalizeSectionData(type, overrides[type] ? { ...base, ...overrides[type] } : base);
}

export function saveDefaultSectionOverride(type, data) {
  try {
    const all = getAllDefaultSectionOverrides();
    all[type] = data;
    localStorage.setItem(SECTION_DEFAULTS_KEY, JSON.stringify(all));
  } catch {
    // Storage may be unavailable
  }
}

export function resetDefaultSectionOverride(type) {
  try {
    const all = getAllDefaultSectionOverrides();
    delete all[type];
    localStorage.setItem(SECTION_DEFAULTS_KEY, JSON.stringify(all));
  } catch {
    // Storage may be unavailable
  }
}

function cloneRootDefaults(source = INITIAL_STATE) {
  return {
    brand_name: source.brand_name ?? BRAND.name,
    issue_number: source.issue_number ?? "1",
    issue_date: source.issue_date ?? "",
    preview_text: source.preview_text ?? "",
    footer: {
      links: Array.isArray(source.footer?.links)
        ? source.footer.links.map((link) => ({ ...link }))
        : [],
      address: source.footer?.address ?? BRAND.address,
      legal: source.footer?.legal ?? BRAND.legalNotice,
      unsub_url: source.footer?.unsub_url ?? "{{${set_user_to_unsubscribed_url}}}",
    },
  };
}

export function getInitialRootContent() {
  return cloneRootDefaults();
}

export function getDefaultRootContent() {
  const base = cloneRootDefaults();
  try {
    const raw = localStorage.getItem(ROOT_DEFAULTS_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    return {
      ...base,
      ...parsed,
      footer: {
        ...base.footer,
        ...(parsed?.footer || {}),
        links: Array.isArray(parsed?.footer?.links)
          ? parsed.footer.links.map((link) => ({ ...link }))
          : base.footer.links,
      },
    };
  } catch {
    return base;
  }
}

export function hasDefaultRootContentOverride() {
  try {
    return localStorage.getItem(ROOT_DEFAULTS_KEY) !== null;
  } catch {
    return false;
  }
}

export function saveDefaultRootContent(data) {
  try {
    localStorage.setItem(ROOT_DEFAULTS_KEY, JSON.stringify(cloneRootDefaults(data)));
  } catch {
    // Storage may be unavailable
  }
}

export function resetDefaultRootContent() {
  try {
    localStorage.removeItem(ROOT_DEFAULTS_KEY);
  } catch {
    // Storage may be unavailable
  }
}

function templateEntry(type) {
  return {
    id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
  };
}

export function createDefaultSectionTemplateEntry(type) {
  if (!SECTION_TYPES[type]) {
    throw new Error(`Type de section inconnu : ${type}`);
  }
  return templateEntry(type);
}

export const INITIAL_SECTION_TEMPLATE = INITIAL_SECTION_TYPES.map((type) =>
  templateEntry(type)
);

function normalizeTemplateSections(value) {
  const rawSections = Array.isArray(value)
    ? value
    : Array.isArray(value?.sections)
      ? value.sections
      : null;

  if (!rawSections) return INITIAL_SECTION_TEMPLATE.map((entry) => ({ ...entry }));

  const sections = rawSections
    .map((entry) => {
      const type = typeof entry === "string" ? entry : entry?.type;
      if (!SECTION_TYPES[type]) return null;
      const normalized = {
        id: typeof entry === "object" && entry?.id ? entry.id : templateEntry(type).id,
        type,
      };
      if (typeof entry?.counts_for_numbering === "boolean") {
        normalized.counts_for_numbering = entry.counts_for_numbering;
      }
      return normalized;
    })
    .filter(Boolean);

  return sections.length
    ? sections
    : INITIAL_SECTION_TEMPLATE.map((entry) => ({ ...entry }));
}

function emptySectionValue(value) {
  if (Array.isArray(value)) return [];
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, emptySectionValue(child)])
    );
  }
  if (typeof value === "boolean") return false;
  if (typeof value === "number") return 0;
  return "";
}

function emptySectionData(type) {
  return emptySectionValue(SECTION_TYPES[type].factory());
}

export function getDefaultNewsletterTemplate() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        sections: normalizeTemplateSections(parsed),
        includeDefaultContent:
          typeof parsed?.includeDefaultContent === "boolean"
            ? parsed.includeDefaultContent
            : DEFAULT_TEMPLATE_USES_CONTENT,
        showSectionNumbers: parsed?.showSectionNumbers !== false,
        showBlockSeparators: parsed?.showBlockSeparators !== false,
        themeVariant: parsed?.themeVariant === "light" ? "light" : "dark",
        includeIssueDate: parsed?.includeIssueDate !== false,
      };
    }
  } catch {
    // Ignore parse errors
  }
  return {
    sections: INITIAL_SECTION_TEMPLATE.map((entry) => ({ ...entry })),
    includeDefaultContent: DEFAULT_TEMPLATE_USES_CONTENT,
    showSectionNumbers: true,
    showBlockSeparators: true,
    themeVariant: "dark",
    includeIssueDate: true,
  };
}

export function getDefaultSectionTypes() {
  return getDefaultNewsletterTemplate().sections;
}

export function saveDefaultSectionTypes(
  sections,
  includeDefaultContent = DEFAULT_TEMPLATE_USES_CONTENT,
  showSectionNumbers = true,
  showBlockSeparators = true,
  themeVariant = "dark",
  includeIssueDate = true
) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        sections: normalizeTemplateSections(sections),
        includeDefaultContent,
        showSectionNumbers: showSectionNumbers !== false,
        showBlockSeparators: showBlockSeparators !== false,
        themeVariant: themeVariant === "light" ? "light" : "dark",
        includeIssueDate: includeIssueDate !== false,
      })
    );
  } catch {
    // Storage may be unavailable
  }
}

export function buildInitialStateFromTypes(types, options = {}) {
  const includeDefaultContent = options.includeDefaultContent !== false;
  const showSectionNumbers = options.showSectionNumbers !== false;
  const showBlockSeparators = options.showBlockSeparators !== false;
  const themeVariant = options.themeVariant === "light" ? "light" : "dark";
  const includeIssueDate = options.includeIssueDate !== false;
  const sections = normalizeTemplateSections(types);
  const rootContent = includeDefaultContent
    ? getDefaultRootContent()
    : { ...cloneRootDefaults(), preview_text: "" };
  return {
    ...INITIAL_STATE,
    ...rootContent,
    footer: rootContent.footer,
    show_section_numbers: showSectionNumbers,
    show_block_separators: showBlockSeparators,
    theme_variant: themeVariant,
    issue_date: includeIssueDate ? rootContent.issue_date : "",
    sections: sections.map(({ type, counts_for_numbering }) => {
      const nextSection = section(type, includeDefaultContent ? getDefaultSectionData(type) : emptySectionData(type));
      if (typeof counts_for_numbering === "boolean") {
        nextSection.counts_for_numbering = counts_for_numbering;
      }
      return nextSection;
    }),
  };
}

// Numéro affiché d'une section (selon sa position parmi les sections numérotables)
// Hero, sommaire, graphique et divider ne portent pas de numéro.
export const UNNUMBERED_TYPES = new Set(["hero", "index", "chart", "macro_bars", "image_block", "cta", "spacer", "divider"]);

export function computeSectionNumber(sections, sectionId) {
  let counter = 0;
  for (const s of sections) {
    const countsForNumbering = s.counts_for_numbering ?? !UNNUMBERED_TYPES.has(s.type);
    if (!countsForNumbering) continue;
    counter++;
    if (s.id === sectionId) return String(counter).padStart(2, "0");
  }
  return null;
}
