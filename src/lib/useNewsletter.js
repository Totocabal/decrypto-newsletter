// ─────────────────────────────────────────────────────────────────────────────
// useNewsletter — hook qui gère le cycle de vie d'une newsletter ouverte
// ─────────────────────────────────────────────────────────────────────────────
// Responsabilités :
//   - Charger la newsletter (state initial)
//   - Acquérir le lock à l'ouverture, le renouveler toutes les 2 min
//   - Le libérer à la fermeture (ou expiration auto côté serveur après 10 min)
//   - Auto-save (debounce 2s) sur current_state
//   - Save explicite → crée une version + met à jour current_state

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "../lib/supabase.js";
import { migrateLegacyState } from "../config/schema.js";

const LOCK_RENEW_INTERVAL_MS = 2 * 60 * 1000; // 2 min
const AUTOSAVE_DEBOUNCE_MS = 2000; // 2 s
const LOCAL_DRAFT_PREFIX = "decrypto-newsletter-draft";

function getLocalDraftKey(newsletterId) {
  return `${LOCAL_DRAFT_PREFIX}:${newsletterId}`;
}

function loadLocalDraft(newsletterId) {
  try {
    const raw = localStorage.getItem(getLocalDraftKey(newsletterId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.state || !parsed?.saved_at) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveLocalDraft(newsletterId, state) {
  const savedAt = new Date().toISOString();
  try {
    localStorage.setItem(
      getLocalDraftKey(newsletterId),
      JSON.stringify({ state, saved_at: savedAt })
    );
    return savedAt;
  } catch {
    // Storage may be full or unavailable; autosave remains the fallback.
    return null;
  }
}

function clearLocalDraft(newsletterId, savedAt = null) {
  try {
    if (savedAt) {
      const current = loadLocalDraft(newsletterId);
      if (current?.saved_at && current.saved_at !== savedAt) return;
    }
    localStorage.removeItem(getLocalDraftKey(newsletterId));
  } catch {
    // Best effort.
  }
}

function isDraftNewerThanNewsletter(draft, newsletter) {
  if (!draft?.saved_at) return false;
  if (!newsletter?.updated_at) return true;
  return new Date(draft.saved_at).getTime() > new Date(newsletter.updated_at).getTime();
}

export function useNewsletter(newsletterId, userId) {
  const [newsletter, setNewsletter] = useState(null);
  const [state, setState] = useState(null);
  const [lockInfo, setLockInfo] = useState(null);
  const [lockedByOther, setLockedByOther] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const autosaveTimer = useRef(null);
  const lockRenewTimer = useRef(null);
  const isMounted = useRef(true);
  // Pour éviter d'auto-save l'état initial au tout premier render
  const skipNextAutosave = useRef(true);

  // ── 1. Chargement initial + acquisition du lock ──
  useEffect(() => {
    if (!newsletterId || !userId) return;
    isMounted.current = true;

    (async () => {
      setLoading(true);
      setError(null);

      // Récupère la newsletter
      const { data: nl, error: nlError } = await supabase
        .from("newsletters")
        .select("*")
        .eq("id", newsletterId)
        .single();

      if (!isMounted.current) return;
      if (nlError || !nl) {
        setError(nlError?.message || "Newsletter introuvable");
        setLoading(false);
        return;
      }
      setNewsletter(nl);
      // Migration auto : si la newsletter a été créée avec l'ancien format
      // (propriétés à plat sans `sections`), on convertit au nouveau format
      // basé sur sections. Transparent pour l'utilisateur.
      let migrated = null;
      try {
        migrated = migrateLegacyState(nl.current_state);
        const localDraft = loadLocalDraft(newsletterId);
        if (isDraftNewerThanNewsletter(localDraft, nl)) {
          migrated = migrateLegacyState(localDraft.state);
        }
      } catch (migrationError) {
        console.error("[useNewsletter] migration état impossible:", migrationError);
        setError("Le contenu de cette newsletter est illisible. Restaure une version précédente ou contacte un administrateur.");
        setLoading(false);
        return;
      }
      setState(migrated);

      // Tente d'acquérir le lock
      const { data: lock, error: lockError } = await supabase.rpc(
        "acquire_lock",
        { p_newsletter_id: newsletterId, p_force: false }
      );

      if (!isMounted.current) return;
      if (lockError) {
        setError("Lock impossible : " + lockError.message);
      } else {
        setLockInfo(lock);
        setLockedByOther(lock.user_id !== userId);
      }

      setLoading(false);
      // L'état initial est posé — autoriser l'autosave aux prochains changements
      skipNextAutosave.current = true;
    })();

    return () => {
      isMounted.current = false;
    };
  }, [newsletterId, userId]);

  // ── 2. Renouvellement périodique du lock (si on l'a) ──
  useEffect(() => {
    if (!newsletterId || lockedByOther || !lockInfo) return;

    const renew = async () => {
      const { data, error } = await supabase.rpc("acquire_lock", {
        p_newsletter_id: newsletterId,
        p_force: false,
      });
      if (!isMounted.current) return;
      if (!error && data) {
        setLockInfo(data);
        setLockedByOther(data.user_id !== userId);
      }
    };

    lockRenewTimer.current = setInterval(renew, LOCK_RENEW_INTERVAL_MS);
    return () => {
      if (lockRenewTimer.current) clearInterval(lockRenewTimer.current);
    };
  }, [newsletterId, userId, lockedByOther, lockInfo]);

  // ── 3. Libération du lock à la fermeture ──
  useEffect(() => {
    if (!newsletterId) return;

    const release = () => {
      // Best-effort. Au refresh, le navigateur peut couper la requête: on
      // absorbe l'erreur pour éviter une rejection globale pendant l'unload.
      void Promise.resolve(
        supabase.rpc("release_lock", { p_newsletter_id: newsletterId })
      ).catch(() => {});
    };

    window.addEventListener("beforeunload", release);
    return () => {
      window.removeEventListener("beforeunload", release);
      // À la sortie React (changement de page), on libère explicitement
      void Promise.resolve(
        supabase.rpc("release_lock", { p_newsletter_id: newsletterId })
      ).catch(() => {});
    };
  }, [newsletterId]);

  // ── 4. Auto-save (debounce 2s) sur current_state ──
  useEffect(() => {
    if (!newsletterId || !state || lockedByOther) return;
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }

    const localDraftSavedAt = saveLocalDraft(newsletterId, state);

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      setSaving(true);
      const { error } = await supabase
        .from("newsletters")
        .update({ current_state: state })
        .eq("id", newsletterId);
      if (!isMounted.current) return;
      setSaving(false);
      if (!error) {
        clearLocalDraft(newsletterId, localDraftSavedAt);
        setLastSavedAt(new Date());
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [state, newsletterId, lockedByOther]);

  // ── 5. Save explicite (= snapshot de version) ──
  const saveVersion = useCallback(
    async (comment = null) => {
      if (!newsletterId || !state || !userId) return { error: "Pas prêt" };
      // 1. Force la sauvegarde de current_state
      const { error: e1 } = await supabase
        .from("newsletters")
        .update({ current_state: state })
        .eq("id", newsletterId);
      if (e1) return { error: e1.message };

      // 2. Crée la version
      const { error: e2 } = await supabase.from("versions").insert({
        newsletter_id: newsletterId,
        state,
        author_id: userId,
        comment,
      });
      if (e2) return { error: e2.message };

      clearLocalDraft(newsletterId);
      setLastSavedAt(new Date());
      return { error: null };
    },
    [newsletterId, state, userId]
  );

  // ── 6. Forcer la prise de contrôle ──
  const takeOverLock = useCallback(async () => {
    const { data, error } = await supabase.rpc("acquire_lock", {
      p_newsletter_id: newsletterId,
      p_force: true,
    });
    if (!error && data) {
      setLockInfo(data);
      setLockedByOther(false);
    }
    return { error: error?.message || null };
  }, [newsletterId]);

  // ── 7. Mise à jour du titre (colonne dédiée, pas dans current_state) ──
  // Update optimiste en local puis envoi à Supabase. Debounce 500ms pour
  // éviter une requête à chaque frappe.
  const titleTimer = useRef(null);
  const updateTitle = useCallback(
    (newTitle) => {
      // Update optimiste pour que l'input réagisse instantanément
      setNewsletter((n) => (n ? { ...n, title: newTitle } : n));
      if (titleTimer.current) clearTimeout(titleTimer.current);
      titleTimer.current = setTimeout(async () => {
        if (!newsletterId) return;
        const { error } = await supabase
          .from("newsletters")
          .update({ title: newTitle })
          .eq("id", newsletterId);
        if (error) {
          // eslint-disable-next-line no-console
          console.error("[useNewsletter] updateTitle:", error);
        }
      }, 500);
    },
    [newsletterId]
  );

  return {
    newsletter,
    state,
    setState,
    loading,
    error,
    saving,
    lastSavedAt,
    lockInfo,
    lockedByOther,
    saveVersion,
    takeOverLock,
    updateTitle,
  };
}
