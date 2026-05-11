// ─────────────────────────────────────────────────────────────────────────────
// Auto-sauvegarde du brouillon dans le navigateur (localStorage)
// ─────────────────────────────────────────────────────────────────────────────

// Clé unique pour ce projet — change-la si tu déploies plusieurs éditeurs
// sur le même domaine pour éviter les conflits
const STORAGE_KEY = "decrypto-newsletter-draft-v1";

export function loadDraft(initialState) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw);
    // Fusion avec l'état initial pour absorber d'éventuels nouveaux champs
    return { ...initialState, ...parsed };
  } catch {
    return initialState;
  }
}

export function saveDraft(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
