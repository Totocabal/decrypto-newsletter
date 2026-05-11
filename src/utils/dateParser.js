// ─────────────────────────────────────────────────────────────────────────────
// Parser de dates françaises pour le tri
// ─────────────────────────────────────────────────────────────────────────────
// Reconnaît plusieurs formats :
//   - "Samedi 2 mai" / "2 mai" / "Le 1er juin"
//   - "10/05/2026", "2-5-26", "2.5.2026"
//   - "Samedi 2" (utilise le mois fallback)
// Retourne un objet Date, ou null si non parsable.

const FRENCH_MONTHS = {
  janvier: 0, jan: 0, janv: 0,
  février: 1, fevrier: 1, fév: 1, fev: 1, févr: 1, fevr: 1,
  mars: 2,
  avril: 3, avr: 3,
  mai: 4,
  juin: 5,
  juillet: 6, juil: 6, jul: 6,
  août: 7, aout: 7,
  septembre: 8, sept: 8, sep: 8,
  octobre: 9, oct: 9,
  novembre: 10, nov: 10,
  décembre: 11, decembre: 11, déc: 11, dec: 11,
};

export function monthNameToIndex(name) {
  if (!name) return null;
  const norm = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  for (const [key, idx] of Object.entries(FRENCH_MONTHS)) {
    const keyNorm = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (norm === keyNorm || norm.startsWith(keyNorm + " ") || keyNorm.startsWith(norm)) {
      return idx;
    }
  }
  return null;
}

export function parseFrenchDate(input, fallbackMonth = null, fallbackYear = null) {
  if (!input) return null;
  const text = String(input).trim().toLowerCase();
  if (!text) return null;

  // Format numérique : 2/5/2026, 02-05-2026, 2.5.2026
  const numMatch = text.match(/(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?/);
  if (numMatch) {
    const day = parseInt(numMatch[1], 10);
    const month = parseInt(numMatch[2], 10) - 1;
    let year = numMatch[3] ? parseInt(numMatch[3], 10) : fallbackYear;
    if (year && year < 100) year += 2000;
    if (!year) year = new Date().getFullYear();
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      return new Date(year, month, day);
    }
  }

  // Format texte : "Samedi 2 mai", "Le 2 mai 2026", "1er juin"
  const textMatch = text.match(/(\d{1,2})(?:er)?\s+([a-zéûîôà]+)(?:\s+(\d{4}))?/i);
  if (textMatch) {
    const day = parseInt(textMatch[1], 10);
    const monthIdx = monthNameToIndex(textMatch[2]);
    const year = textMatch[3]
      ? parseInt(textMatch[3], 10)
      : fallbackYear || new Date().getFullYear();
    if (monthIdx !== null && day >= 1 && day <= 31) {
      return new Date(year, monthIdx, day);
    }
  }

  // Fallback : juste un jour, mois pris du contexte
  const dayOnlyMatch = text.match(/\b(\d{1,2})(?:er)?\b/);
  if (dayOnlyMatch && fallbackMonth !== null) {
    const day = parseInt(dayOnlyMatch[1], 10);
    const year = fallbackYear || new Date().getFullYear();
    if (day >= 1 && day <= 31) {
      return new Date(year, fallbackMonth, day);
    }
  }

  return null;
}
