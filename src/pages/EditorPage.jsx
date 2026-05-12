// ─────────────────────────────────────────────────────────────────────────────
// EditorPage — l'éditeur en mode collaboratif
// ─────────────────────────────────────────────────────────────────────────────
// Wraps l'ancien éditeur avec :
//   - chargement / save serveur (au lieu de localStorage)
//   - bandeau de verrou si quelqu'un d'autre édite
//   - bouton "Versions" pour ouvrir l'historique
//   - indicateur d'auto-save dans la toolbar

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, History, Loader2, CloudOff, Cloud } from "lucide-react";
import { Toolbar } from "../components/Toolbar.jsx";
import { PreviewPanel } from "../components/PreviewPanel.jsx";
import { EditorPanel } from "../components/EditorPanel.jsx";
import { LockBanner } from "../components/LockBanner.jsx";
import { VersionsPanel } from "../components/VersionsPanel.jsx";
import { buildEmailHtml } from "../render/buildEmail.js";
import { supabase } from "../lib/supabase.js";
import { useNewsletter } from "../lib/useNewsletter.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { copyHtmlToClipboard } from "../utils/exportImport.js";
import { exportAssetPack, exportBrazeHtml } from "../utils/exportAssetPack.js";

export function EditorPage({ newsletterId, onBack }) {
  const { profile } = useAuth();
  const {
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
  } = useNewsletter(newsletterId, profile?.id);

  const [view, setView] = useState("preview");
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [showVersions, setShowVersions] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingBraze, setExportingBraze] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const html = useMemo(
    () => (state ? buildEmailHtml(state) : ""),
    [state]
  );

  // ── Boutons ──
  const handleSave = async () => {
    const comment = window.prompt(
      "Commentaire pour cette version (optionnel) ?",
      ""
    );
    if (comment === null) return; // l'utilisateur a annulé
    const { error } = await saveVersion(comment.trim() || null);
    if (error) alert("Erreur : " + error);
    else {
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    }
  };

  const handleBack = async () => {
    if (!state || lockedByOther) {
      onBack();
      return;
    }

    const shouldSave = window.confirm(
      "Créer une version avant de quitter cette newsletter ?"
    );
    if (!shouldSave) {
      onBack();
      return;
    }

    const comment = window.prompt(
      "Commentaire pour cette version (optionnel) ?",
      ""
    );
    if (comment === null) return;

    setLeaving(true);
    const { error } = await saveVersion(comment.trim() || null);
    setLeaving(false);
    if (error) {
      alert("Erreur : " + error);
      return;
    }
    onBack();
  };

  useEffect(() => {
    if (!state || lockedByOther) return;

    const warnBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [state, lockedByOther]);

  const handleCopy = async () => {
    const ok = await copyHtmlToClipboard(html);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleExportZip = async () => {
    if (!state) return;
    setExporting(true);
    try {
      const safe = (newsletter?.title || "newsletter")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      await exportAssetPack(state, `${safe}.zip`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[export] erreur :", e);
      alert("Erreur à l'export : " + (e.message || e));
    } finally {
      setExporting(false);
    }
  };

  const handleExportBraze = async () => {
    if (!state || !profile?.is_admin) return;
    setExportingBraze(true);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      const accessToken = data?.session?.access_token;
      if (!accessToken) throw new Error("Session expirée. Reconnecte-toi puis réessaie.");

      const safe = (newsletter?.title || "newsletter")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      const result = await exportBrazeHtml(state, `${safe}-braze.html`, accessToken);
      alert(
        `Export Braze terminé : ${Object.keys(result.assets).length} image(s) uploadée(s).`
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[export braze] erreur :", e);
      alert("Erreur à l'export Braze : " + (e.message || e));
    } finally {
      setExportingBraze(false);
    }
  };

  // Loader bloquant
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="text-xs uppercase tracking-[0.18em] text-stone-500 flex items-center gap-2">
          <Loader2 className="animate-spin" size={14} />
          Chargement…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
        <div className="bg-white border border-red-200 rounded-sm p-6 max-w-md">
          <div className="text-red-700 text-sm font-medium mb-2">
            Erreur de chargement
          </div>
          <div className="text-xs text-stone-600 mb-4">{error}</div>
          <button
            onClick={onBack}
            className="text-[10px] uppercase tracking-[0.18em] text-stone-700 border border-stone-300 hover:border-stone-500 px-3 py-2 rounded-sm"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Bandeau de verrou si quelqu'un d'autre édite */}
      {lockedByOther && (
        <LockBanner
          lockInfo={lockInfo}
          onTakeOver={takeOverLock}
          onBack={onBack}
        />
      )}

      {/* Toolbar custom au-dessus de l'ancienne — pour back + titre éditable + statut + versions */}
      <div className="bg-white border-b border-stone-200 px-6 py-2.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={handleBack}
              disabled={leaving}
              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-medium text-stone-600 hover:text-stone-900 px-3 py-1.5 border border-stone-200 hover:border-stone-500 rounded-sm flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {leaving ? <Loader2 size={12} className="animate-spin" /> : <ArrowLeft size={12} />}
              {leaving ? "Sauvegarde…" : "Retour"}
            </button>
            <input
              type="text"
              value={newsletter?.title || ""}
              onChange={(e) => updateTitle(e.target.value)}
              placeholder="Titre de la newsletter…"
              className="flex-1 min-w-0 max-w-md text-sm text-stone-800 bg-transparent border border-transparent hover:border-stone-200 focus:border-stone-400 focus:bg-white px-2 py-1 rounded-sm focus:outline-none transition-colors"
              title="Cliquer pour renommer cette newsletter"
            />
          </div>
          <div className="flex items-center gap-3">
            {/* Indicateur de save */}
            <SaveIndicator
              saving={saving}
              lastSavedAt={lastSavedAt}
              lockedByOther={lockedByOther}
            />
            <button
              onClick={() => setShowVersions(true)}
              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-medium text-stone-700 hover:text-stone-900 px-3 py-1.5 border border-stone-200 hover:border-stone-500 rounded-sm"
            >
              <History size={12} />
              Versions
            </button>
          </div>
        </div>
      </div>

      <Toolbar
        brandName={state.brand_name}
        view={view}
        setView={setView}
        onSave={handleSave}
        onCopy={handleCopy}
        onExportZip={handleExportZip}
        onExportBraze={profile?.is_admin ? handleExportBraze : null}
        copied={copied}
        saved={savedFlash}
        exporting={exporting}
        exportingBraze={exportingBraze}
      />

      <div
        className="p-6 grid gap-6"
        style={{ gridTemplateColumns: "minmax(380px, 480px) 1fr" }}
      >
        <div
          className={`overflow-y-auto pr-1 ${
            lockedByOther ? "pointer-events-none opacity-60" : ""
          }`}
          style={{ maxHeight: "calc(100vh - 180px)" }}
        >
          <EditorPanel state={state} setState={setState} />
        </div>

        <PreviewPanel
          html={html}
          view={view}
          previewDevice={previewDevice}
          setPreviewDevice={setPreviewDevice}
        />
      </div>

      {showVersions && (
        <VersionsPanel
          newsletterId={newsletterId}
          onRestore={(restoredState) => setState(restoredState)}
          onClose={() => setShowVersions(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SaveIndicator — petit composant de statut
// ─────────────────────────────────────────────────────────────────────────────

function SaveIndicator({ saving, lastSavedAt, lockedByOther }) {
  if (lockedByOther) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-stone-400">
        <CloudOff size={12} />
        Lecture seule
      </div>
    );
  }
  if (saving) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-stone-500">
        <Loader2 size={12} className="animate-spin" />
        Sauvegarde…
      </div>
    );
  }
  if (lastSavedAt) {
    const time = lastSavedAt.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return (
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-emerald-700">
        <Cloud size={12} />
        Sauvegardé · {time}
      </div>
    );
  }
  return null;
}
