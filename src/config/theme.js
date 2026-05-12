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
// Coinhouse fournit une font custom hostée sur le CDN Braze, déclarée
// sous les noms 'Sora' et 'DM Sans' pour rester compatible avec les
// stacks de polices habituelles. Outlook ignore @font-face → fallback Arial.
export const FONTS = {
  // Police principale (titres, chiffres clés)
  heading: "'Sora', Arial, sans-serif",
  // Police body
  body: "'DM Sans', Arial, sans-serif",
  // URL de la font custom Coinhouse (CDN Braze)
  customFontUrl:
    "https://cdn.braze.eu/appboy/communication/assets/font_assets/files/6581ae977282ee42cd89d198/original.ttf?1702997655",
};

// Identité de la marque
export const BRAND = {
  name: "COINHOUSE",
  tagline: "Le partenaire crypto de votre patrimoine.",
  websiteUrl: "https://www.coinhouse.com",
  // Adresse pour mentions légales
  address: "SAS au capital de 210.000 € · RCS Paris 815 254 545 · 14 avenue de l'Opéra, 75001 PARIS",
  legalNotice:
    "Coinhouse est un prestataire de services sur crypto-actifs (PSCA) agréé MiCA enregistrée auprès de l'AMF sous le n°A2026-013.\nNous rappelons qu'un investissement dans les actifs numériques comporte des risques de liquidité, de perte partielle ou totale en capital et n'est pas couvert par les mécanismes de garantie des dépôts et des titres. Les performances passées ne préjugent pas des performances futures, les prix des actifs numériques étant particulièrement volatils. Plus d'informations sur coinhouse.com.\n©2026 Coinhouse",
};
