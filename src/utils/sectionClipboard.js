import { SECTION_TYPES } from "../config/schema.js";

// Presse-papiers de blocs partagé entre newsletters (même navigateur, onglets compris) :
// on copie un bloc dans une newsletter, on le colle dans une autre.
const KEY = "decrypto:section_clipboard";
const EVENT = "decrypto:section_clipboard_change";

export function copySectionToClipboard(section) {
  try {
    const payload = { v: 1, type: section.type, data: JSON.parse(JSON.stringify(section.data || {})), counts_for_numbering: section.counts_for_numbering };
    localStorage.setItem(KEY, JSON.stringify(payload));
    window.dispatchEvent(new Event(EVENT));
    return true;
  } catch {
    return false;
  }
}

export function readSectionClipboard() {
  try {
    const payload = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!payload || payload.v !== 1 || !SECTION_TYPES[payload.type]) return null;
    return payload;
  } catch {
    return null;
  }
}

// Nouveau bloc prêt à insérer (id neuf, données clonées).
export function sectionFromClipboard(payload) {
  const section = {
    id: `s${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: payload.type,
    data: JSON.parse(JSON.stringify(payload.data || {})),
  };
  if (typeof payload.counts_for_numbering === "boolean") section.counts_for_numbering = payload.counts_for_numbering;
  return section;
}

export function subscribeSectionClipboard(callback) {
  const onStorage = (e) => { if (e.key === KEY || e.key === null) callback(); };
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}
