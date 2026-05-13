// ─────────────────────────────────────────────────────────────────────────────
// EditorPage — l'éditeur en mode collaboratif
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, History, Loader2, CloudOff, Cloud, Undo2, Redo2 } from "lucide-react";
import { Toolbar } from "../components/Toolbar.jsx";
import { PreviewPanel } from "../components/PreviewPanel.jsx";
import { EditorPanel } from "../components/EditorPanel.jsx";
import { LockBanner } from "../components/LockBanner.jsx";
import { VersionsPanel } from "../components/VersionsPanel.jsx";
import { Wordmark } from "../components/Wordmark.jsx";
import { Tooltip } from "../components/Tooltip.jsx";
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
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);
  const [dirtySinceVersion, setDirtySinceVersion] = useState(false);
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const lastStateRef = useRef(null);
  const skipHistoryRef = useRef(false);

  const html = useMemo(
    () => (state ? buildEmailHtml(state) : ""),
    [state]
  );

  useEffect(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    lastStateRef.current = null;
    skipHistoryRef.current = false;
    setUndoCount(0);
    setRedoCount(0);
    setDirtySinceVersion(false);
  }, [newsletterId]);

  useEffect(() => {
    if (!state) return;

    if (!lastStateRef.current) {
      lastStateRef.current = state;
      setDirtySinceVersion(false);
      return;
    }

    if (skipHistoryRef.current) {
      lastStateRef.current = state;
      skipHistoryRef.current = false;
      return;
    }

    undoStackRef.current = [...undoStackRef.current, lastStateRef.current].slice(-50);
    redoStackRef.current = [];
    setUndoCount(undoStackRef.current.length);
    setRedoCount(0);
    setDirtySinceVersion(true);
    lastStateRef.current = state;
  }, [state]);

  const setStateWithHistory = useCallback(
    (updater) => setState(updater),
    [setState]
  );

  const handleUndo = () => {
    const previous = undoStackRef.current.pop();
    if (!previous) return;
    if (lastStateRef.current) {
      redoStackRef.current = [...redoStackRef.current, lastStateRef.current].slice(-50);
    }
    skipHistoryRef.current = true;
    setUndoCount(undoStackRef.current.length);
    setRedoCount(redoStackRef.current.length);
    setDirtySinceVersion(true);
    setState(previous);
  };

  const handleRedo = () => {
    const next = redoStackRef.current.pop();
    if (!next) return;
    if (lastStateRef.current) {
      undoStackRef.current = [...undoStackRef.current, lastStateRef.current].slice(-50);
    }
    skipHistoryRef.current = true;
    setUndoCount(undoStackRef.current.length);
    setRedoCount(redoStackRef.current.length);
    setDirtySinceVersion(true);
    setState(next);
  };

  const handleSave = async () => {
    const comment = window.prompt(
      "La version sera numérotée automatiquement. Commentaire optionnel :",
      ""
    );
    if (comment === null) return;
    const { error } = await saveVersion(comment.trim() || null);
    if (error) alert("Erreur : " + error);
    else {
      setDirtySinceVersion(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    }
  };

  const handleBack = async () => {
    if (!state || lockedByOther || !dirtySinceVersion) {
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
      "La version sera numérotée automatiquement. Commentaire optionnel :",
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
    setDirtySinceVersion(false);
    onBack();
  };

  useEffect(() => {
    if (!state || lockedByOther || !dirtySinceVersion) return;

    const warnBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [state, lockedByOther, dirtySinceVersion]);

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
      <div className="min-h-screen bg-d-bg flex items-center justify-center">
        <div className="text-xs uppercase tracking-[0.18em] text-d-fg3 flex items-center gap-2">
          <Loader2 className="animate-spin" size={14} />
          Chargement…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-d-bg flex items-center justify-center p-6">
        <div
          className="rounded-2xl p-6 max-w-md border border-line"
          style={{ background: "#1E1E22" }}
        >
          <div className="text-sm font-semibold mb-2" style={{ color: "#FF8466" }}>
            Erreur de chargement
          </div>
          <div className="text-xs text-d-fg3 mb-4">{error}</div>
          <button
            onClick={onBack}
            className="text-[10px] uppercase tracking-[0.18em] text-d-fg2 border border-line2 hover:border-d-fg3 px-3 py-2 rounded-full transition-colors"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-d-bg">
      {/* Bandeau de verrou */}
      {lockedByOther && (
        <LockBanner
          lockInfo={lockInfo}
          onTakeOver={takeOverLock}
          onBack={onBack}
        />
      )}

      {/* Topbar : logo + titre + statut + actions */}
      <div
        className="border-b border-line px-6 py-2.5"
        style={{ background: "#1E1E22", height: 64, display: "flex", alignItems: "center" }}
      >
        <div className="flex items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <Wordmark size={17} />
            <div
              className="w-px h-6"
              style={{ background: "var(--d-line2)", flexShrink: 0 }}
            />
            <button
              onClick={handleBack}
              disabled={leaving}
              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-medium text-d-fg3 hover:text-d-fg px-3 py-1.5 border border-line hover:border-line2 rounded-full flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {leaving ? <Loader2 size={12} className="animate-spin" /> : <ArrowLeft size={12} />}
              {leaving ? "Sauvegarde…" : "Retour"}
            </button>
            <Tooltip label="Cliquer pour renommer cette newsletter" side="bottom" className="flex-1 min-w-0 max-w-md">
              <input
                type="text"
                value={newsletter?.title || ""}
                onChange={(e) => updateTitle(e.target.value)}
                placeholder="Titre de la newsletter…"
                className="w-full text-sm font-medium text-d-fg bg-transparent border border-transparent hover:border-line focus:border-line2 focus:bg-d-panel2 px-3 py-1.5 rounded-full focus:outline-none transition-colors"
                style={{ fontFamily: "'Sora', sans-serif" }}
              />
            </Tooltip>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <SaveIndicator
              saving={saving}
              lastSavedAt={lastSavedAt}
              lockedByOther={lockedByOther}
            />
            <button
              onClick={() => setShowVersions(true)}
              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-medium text-d-fg3 hover:text-d-fg px-3 py-1.5 border border-line hover:border-line2 rounded-full transition-colors"
            >
              <History size={12} />
              Versions
            </button>
            <Tooltip label="Annuler le dernier changement" side="bottom">
              <button
                onClick={handleUndo}
                disabled={!undoCount || lockedByOther}
                className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] font-medium text-d-fg3 hover:text-d-fg px-3 py-1.5 border border-line hover:border-line2 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Undo2 size={12} />
                Annuler
              </button>
            </Tooltip>
            <Tooltip label="Restaurer le dernier changement annulé" side="bottom" align="right">
              <button
                onClick={handleRedo}
                disabled={!redoCount || lockedByOther}
                className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] font-medium text-d-fg3 hover:text-d-fg px-3 py-1.5 border border-line hover:border-line2 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Redo2 size={12} />
                Restaurer
              </button>
            </Tooltip>
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
          <EditorPanel state={state} setState={setStateWithHistory} />
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
          onRestore={(restoredState) => setStateWithHistory(restoredState)}
          onClose={() => setShowVersions(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SaveIndicator
// ─────────────────────────────────────────────────────────────────────────────

function SaveIndicator({ saving, lastSavedAt, lockedByOther }) {
  if (lockedByOther) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-d-fg4">
        <CloudOff size={12} />
        Lecture seule
      </div>
    );
  }
  if (saving) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-d-fg3">
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
      <div
        className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em]"
        style={{ color: "#03FFCF" }}
      >
        <Cloud size={12} />
        Sauvé · {time}
      </div>
    );
  }
  return null;
}
