// ─────────────────────────────────────────────────────────────────────────────
// Configuration visuelle — Décrypto / Coinhouse
// ─────────────────────────────────────────────────────────────────────────────

// Palette dark mode utilisée dans le HTML email et l'UI de l'éditeur
export const THEME = {
  // Couleurs d'accentuation (dégradé principal Coinhouse)
  accentPrimary: "#FF00AA",   // Magenta — accent principal
  accentSecondary: "#4141FF", // Bleu électrique
  accentTertiary: "#8701FF",  // Violet
  accentWarm: "#FF4B28",      // Orange / rouge

  // Couleurs sémantiques crypto (perf positive / négative / neutre)
  positive: "#03FFCF",  // Cyan — gains
  negative: "#FF4B28",  // Rouge — pertes
  warning: "#FF8B28",   // Orange — neutre / attention

  // Couleurs de fond (dark theme)
  bgPage: "#0B0B0D",       // Fond extérieur (autour de l'email)
  bgEmail: "#0B0B0D",      // Fond du contenu email
  bgSection: "#101018",    // Fond des blocs alternés (chart, etc.)
  bgFooter: "#000000",     // Fond pied de page
  bgEventCard: "#171717",  // Fond carte évènement

  // Couleurs de texte
  textPrimary: "#FFFFFF",   // Texte principal (titres)
  textSecondary: "#D8DDE6", // Body
  textMuted: "#A8AEB8",     // Captions, métadonnées
  textDim: "#75808B",       // Labels en majuscule
  textFaint: "#5E6872",     // Mentions légales, fines

  // Bordures (rgba pour le HTML email — supportées par tous les clients modernes)
  border: "rgba(255,255,255,0.06)",
  borderStrong: "rgba(255,255,255,0.16)",
  borderSubtle: "rgba(255,255,255,0.08)",
};

// Polices web utilisées dans l'email
// Coinhouse fournit les fontes Sora hostées sur le CDN Braze. Elles sont
// déclarées sous les noms 'Sora' et 'DM Sans' pour rester compatibles avec
// les stacks de polices existantes. Outlook ignore @font-face → fallback Arial.
export const FONTS = {
  // Police principale (titres, chiffres clés)
  heading: "'Sora', Arial, sans-serif",
  // Police body
  body: "'DM Sans', Arial, sans-serif",
  // URLs des fontes Sora hostées sur le CDN Braze
  sora: {
    100: "https://cdn.braze.eu/appboy/communication/assets/font_assets/files/674095fb9216550091ffa745/original.ttf?1732285947",
    200: "https://cdn.braze.eu/appboy/communication/assets/font_assets/files/674095fb8bdb0d00816f28ad/original.ttf?1732285947",
    300: "https://cdn.braze.eu/appboy/communication/assets/font_assets/files/674095fb73d00e008136858e/original.ttf?1732285947",
    500: "https://cdn.braze.eu/appboy/communication/assets/font_assets/files/674095fbd542e00081fc4555/original.ttf?1732285947",
    600: "https://cdn.braze.eu/appboy/communication/assets/font_assets/files/674095fbed9c22008102ea58/original.ttf?1732285947",
    700: "https://cdn.braze.eu/appboy/communication/assets/font_assets/files/674095fbcc898a00752a43a2/original.ttf?1732285947",
    800: "https://cdn.braze.eu/appboy/communication/assets/font_assets/files/674095fbd0634300818b9578/original.ttf?1732285947",
  },
};

// Identité de la marque
export const BRAND = {
  name: "COINHOUSE",
  tagline: "Le partenaire crypto de votre patrimoine.",
  websiteUrl: "https://www.coinhouse.com",
  // Adresse pour mentions légales
  address: "SAS au capital de 210.000 € · RCS Paris 815 254 545 · 14 avenue de l'Opéra, 75001 PARIS",
  legalNotice:
    "Coinhouse est un prestataire de services sur crypto-actifs (PSCA) agréé MiCA enregistré auprès de l’AMF sous le n°A2026-013. Investir en crypto-actifs comporte des risques de perte en capital. Les performances passées ne préjugent pas des performances futures. ©2026 Coinhouse",
};
