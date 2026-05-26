// ─────────────────────────────────────────────────────────────────────────────
// EditorPage — l'éditeur en mode collaboratif
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, History, Loader2, CloudOff, Cloud, Tag, Undo2, Redo2, X, BookMarked, Check, Mail, Send } from "lucide-react";
import { Toolbar } from "../components/Toolbar.jsx";
import { PreviewPanel } from "../components/PreviewPanel.jsx";
import { EditorPanel } from "../components/EditorPanel.jsx";
import { LockBanner } from "../components/LockBanner.jsx";
import { LockRequestBanner } from "../components/LockRequestBanner.jsx";
import { VersionsPanel } from "../components/VersionsPanel.jsx";
import { Wordmark } from "../components/Wordmark.jsx";
import { Tooltip } from "../components/Tooltip.jsx";
import { buildEmailHtml } from "../render/buildEmail.js";
import { supabase } from "../lib/supabase.js";
import { useNewsletter } from "../lib/useNewsletter.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useToast, useConfirm, usePrompt } from "../components/Dialog.jsx";
import { copyHtmlToClipboard } from "../utils/exportImport.js";
import { exportAssetPack, exportBrazeHtml } from "../utils/exportAssetPack.js";
import { useLabels, useNewsletterLabels } from "../lib/useLabels.js";
import { createTemplatePreset } from "../lib/templatePresets.js";

export function EditorPage({ newsletterId, onBack }) {
  const { profile } = useAuth();
  const addToast = useToast();
  const confirm = useConfirm();
  const prompt = usePrompt();
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
    lockRequest,
    setLockRequest,
    lockTakenBy,
    setLockTakenBy,
    saveVersion,
    takeOverLock,
    updateTitle,
  } = useNewsletter(
    newsletterId,
    profile?.id,
    profile?.full_name || profile?.email
  );

  const [view, setView] = useState("preview");
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [showVersions, setShowVersions] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingBraze, setExportingBraze] = useState(false);
  const [previewSendOpen, setPreviewSendOpen] = useState(false);
  const [previewRecipients, setPreviewRecipients] = useState("");
  const [previewSubject, setPreviewSubject] = useState("");
  const [sendingPreview, setSendingPreview] = useState(false);
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [savingPreset, setSavingPreset] = useState(false);
  const [presetSaved, setPresetSaved] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);
  const [dirtySinceVersion, setDirtySinceVersion] = useState(false);
  const [labelPickerOpen, setLabelPickerOpen] = useState(false);
  const { labels } = useLabels();
  const { labelIds, toggle: toggleLabel } = useNewsletterLabels(newsletterId);
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const lastStateRef = useRef(null);
  const skipHistoryRef = useRef(false);

  // Toast quand quelqu'un nous prend la main sur l'édition
  useEffect(() => {
    if (!lockTakenBy) return;
    addToast(
      `${lockTakenBy.takerName} a pris la main sur l'édition.`,
      "error"
    );
    setLockTakenBy(null);
  }, [lockTakenBy, addToast, setLockTakenBy]);

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
    const comment = await prompt(
      "La version sera numérotée automatiquement. Commentaire optionnel :",
      { title: "Sauvegarder une version", confirmLabel: "Sauvegarder", cancelLabel: "Annuler", cancelValue: null }
    );
    if (comment === null) return;
    const { error } = await saveVersion(comment.trim() || null);
    if (error) addToast("Erreur : " + error);
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

    // 3 choix : Confirmer (sauvegarder) / Je quitte sans sauvegarder / Annuler (rester)
    const result = await confirm(
      "Créer une version avant de quitter cette newsletter ?",
      { extraLabel: "Passer" }
    );
    if (result === false) return;        // Annuler → rester sur la page
    if (result === "leave") { onBack(); return; } // Quitter sans sauvegarder

    // result === true → demander un commentaire
    const comment = await prompt(
      "La version sera numérotée automatiquement. Commentaire optionnel :",
      { title: "Sauvegarder une version", confirmLabel: "Sauvegarder", cancelLabel: "Annuler", cancelValue: null }
    );
    if (comment === null) return;

    setLeaving(true);
    const { error } = await saveVersion(comment.trim() || null);
    setLeaving(false);
    if (error) {
      addToast("Erreur : " + error);
      return;
    }
    setDirtySinceVersion(false);
    onBack();
  };

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
      addToast("Erreur à l'export : " + (e.message || e));
    } finally {
      setExporting(false);
    }
  };

  const handleOpenPresetModal = () => {
    if (!state || !profile?.is_admin) return;
    setPresetName(newsletter?.title || "");
    setPresetSaved(false);
    setPresetModalOpen(true);
  };

  const handleSaveAsPreset = async () => {
    if (!state || !presetName.trim()) return;
    setSavingPreset(true);
    try {
      await createTemplatePreset({
        name: presetName.trim(),
        sections: state.sections || [],
        includeDefaultContent: true,
        showSectionNumbers: state.show_section_numbers !== false,
        showBlockSeparators: state.show_block_separators !== false,
        themeVariant: state.theme_variant || "dark",
      });
      setPresetSaved(true);
      setTimeout(() => setPresetModalOpen(false), 1200);
    } catch (e) {
      addToast("Erreur lors de l'enregistrement du preset : " + (e.message || e));
    } finally {
      setSavingPreset(false);
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
      addToast(
        `Export Braze terminé : ${Object.keys(result.assets).length} image(s) uploadée(s).`,
        "success"
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[export braze] erreur :", e);
      addToast("Erreur à l'export Braze : " + (e.message || e));
    } finally {
      setExportingBraze(false);
    }
  };

  const handleOpenSendPreview = () => {
    if (!state) return;
    setPreviewRecipients(profile?.email || "");
    setPreviewSubject(`[Preview] ${newsletter?.title || state.brand_name || "Newsletter"}`);
    setPreviewSendOpen(true);
  };

  const handleSendPreview = async () => {
    if (!state || !html) return;
    setSendingPreview(true);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      const accessToken = data?.session?.access_token;
      if (!accessToken) throw new Error("Session expirée. Reconnecte-toi puis réessaie.");

      const response = await fetch("/api/send-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          to: previewRecipients,
          subject: previewSubject,
          previewText: state.preview_text || "",
          html,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Envoi preview impossible.");
      }
      addToast(`Preview envoyée à ${payload.to?.join(", ") || previewRecipients}.`, "success");
      setPreviewSendOpen(false);
    } catch (e) {
      addToast("Erreur Resend : " + (e.message || e), "error");
    } finally {
      setSendingPreview(false);
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
          style={{ background: "rgb(var(--d-panel))" }}
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

      {/* Bandeau de demande d'accès (pour le détenteur du lock) */}
      {!lockedByOther && (
        <LockRequestBanner
          lockRequest={lockRequest}
          onDismiss={() => setLockRequest(null)}
        />
      )}

      {/* Topbar : logo + titre + statut + actions */}
      <header
        className="border-b border-line px-3 py-2 sm:px-6 sm:py-0"
        style={{ background: "rgb(var(--d-panel))", minHeight: "52px" }}
      >
        <div className="flex min-h-9 items-center gap-1.5 sm:min-h-[52px] sm:gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
            <button type="button" onClick={handleBack} disabled={leaving} className="shrink-0 opacity-90 hover:opacity-100 transition-opacity">
              <Wordmark size={18} />
            </button>
            <div
              className="hidden h-5 w-px sm:block"
              style={{ background: "var(--d-line2)", flexShrink: 0 }}
            />
            <button
              onClick={handleBack}
              disabled={leaving}
              className="hidden flex-shrink-0 items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-d-fg3 transition-colors hover:border-line2 hover:text-d-fg disabled:cursor-not-allowed disabled:opacity-50 sm:flex"
            >
              {leaving ? <Loader2 size={12} className="animate-spin" /> : <ArrowLeft size={12} />}
              {leaving ? "Sauvegarde…" : "Retour"}
            </button>
            <Tooltip label="Cliquer pour renommer cette newsletter" side="bottom" className="min-w-0 flex-1 sm:max-w-xs">
              <input
                type="text"
                value={newsletter?.title || ""}
                onChange={(e) => updateTitle(e.target.value)}
                placeholder="Titre de la newsletter…"
                className="w-full rounded-full border border-transparent bg-transparent px-2 py-1.5 text-xs font-medium text-d-fg transition-colors hover:border-line focus:border-line2 focus:bg-d-panel2 focus:outline-none sm:px-3 sm:text-sm"
                style={{ fontFamily: "'Sora', sans-serif" }}
              />
            </Tooltip>
            {labels.length > 0 && (
              <div className="relative flex items-center gap-1.5 overflow-visible">
                {labels.filter((l) => labelIds.includes(l.id)).map((label) => (
                  <span
                    key={label.id}
                    className="hidden flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] sm:inline-flex"
                    style={{
                      background: label.color + "22",
                      border: `1px solid ${label.color}55`,
                      color: label.color,
                    }}
                  >
                    {label.name}
                  </span>
                ))}
                <button
                  onClick={() => setLabelPickerOpen((o) => !o)}
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-line text-[10px] font-medium uppercase tracking-[0.14em] transition-colors sm:h-auto sm:w-auto sm:gap-1.5 sm:px-2.5 sm:py-1.5 ${labelPickerOpen ? "bg-d-panel2 text-d-fg2" : "text-d-fg4 hover:text-d-fg2 hover:bg-d-panel2"}`}
                  aria-label="Labels"
                >
                  <Tag size={11} />
                  <span className="hidden sm:inline">Labels</span>
                </button>
                {labelPickerOpen && (
                  <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-xl border border-line bg-d-panel shadow-xl">
                    {labels.map((label) => {
                      const checked = labelIds.includes(label.id);
                      return (
                        <button
                          key={label.id}
                          onClick={() => toggleLabel(label.id, profile?.id)}
                          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-d-panel2"
                        >
                          <span
                            className="h-3 w-3 flex-shrink-0 rounded-full border-2 transition-all"
                            style={{
                              background: checked ? label.color : "transparent",
                              borderColor: label.color,
                            }}
                          />
                          <span style={{ color: label.color }} className="font-semibold uppercase tracking-[0.1em] text-[10px]">
                            {label.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <SaveIndicator
              saving={saving}
              lastSavedAt={lastSavedAt}
              lockedByOther={lockedByOther}
            />
            <button
              onClick={() => setShowVersions(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-d-fg3 transition-colors hover:border-line2 hover:text-d-fg sm:h-auto sm:w-auto sm:p-2"
              aria-label="Versions"
            >
              <History size={14} />
            </button>
            <Tooltip label="Annuler le dernier changement" side="bottom">
              <button
                onClick={handleUndo}
                disabled={!undoCount || lockedByOther}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-d-fg3 transition-colors hover:border-line2 hover:text-d-fg disabled:cursor-not-allowed disabled:opacity-30 sm:h-auto sm:w-auto sm:p-2"
                aria-label="Annuler"
              >
                <Undo2 size={14} />
              </button>
            </Tooltip>
            <Tooltip label="Restaurer le dernier changement annulé" side="bottom" align="right">
              <button
                onClick={handleRedo}
                disabled={!redoCount || lockedByOther}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-d-fg3 transition-colors hover:border-line2 hover:text-d-fg disabled:cursor-not-allowed disabled:opacity-30 sm:h-auto sm:w-auto sm:p-2"
                aria-label="Restaurer"
              >
                <Redo2 size={14} />
              </button>
            </Tooltip>
          </div>
        </div>
      </header>

      <Toolbar
        brandName={state.brand_name}
        view={view}
        setView={setView}
        onSave={handleSave}
        onCopy={handleCopy}
        onExportZip={handleExportZip}
        onExportBraze={profile?.is_admin ? handleExportBraze : null}
        onSendPreview={handleOpenSendPreview}
        onSaveAsPreset={profile?.is_admin ? handleOpenPresetModal : null}
        copied={copied}
        saved={savedFlash}
        exporting={exporting}
        exportingBraze={exportingBraze}
        sendingPreview={sendingPreview}
      />

      <div
        className="grid grid-cols-1 gap-5 p-4 sm:p-6 sm:grid-cols-[minmax(380px,480px)_1fr] sm:gap-6"
      >
        <div
          className={`min-w-0 sm:max-h-[calc(100vh-180px)] sm:overflow-y-auto sm:pr-1 ${
            lockedByOther ? "pointer-events-none opacity-60" : ""
          }`}
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

      {/* Modal — Enregistrer comme preset */}
      {presetModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => !savingPreset && setPresetModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-line bg-d-panel p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-2">
              <BookMarked size={16} className="text-d-fg3" />
              <h3
                className="text-sm font-semibold text-d-fg"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Enregistrer comme preset
              </h3>
            </div>
            <p className="mb-4 text-xs text-d-fg3">
              Le contenu actuel (sections et données) sera conservé dans le preset.
            </p>
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !savingPreset && handleSaveAsPreset()}
              placeholder="Nom du preset…"
              autoFocus
              className="mb-4 w-full rounded-xl border border-line bg-d-panel2 px-3 py-2.5 text-sm text-d-fg placeholder:text-d-fg4 focus:border-line2 focus:outline-none transition-colors"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPresetModalOpen(false)}
                disabled={savingPreset}
                className="rounded-full border border-line px-4 py-2 text-[11px] uppercase tracking-[0.14em] font-medium text-d-fg3 hover:bg-d-panel2 transition-colors disabled:opacity-40"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveAsPreset}
                disabled={savingPreset || !presetName.trim()}
                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.14em] font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: presetSaved ? "#03FFCF" : "#4141FF", color: presetSaved ? "#15151A" : "#fff" }}
              >
                {savingPreset ? (
                  <><Loader2 size={12} className="animate-spin" /> Enregistrement…</>
                ) : presetSaved ? (
                  <><Check size={12} /> Enregistré</>
                ) : (
                  <><BookMarked size={12} /> Enregistrer</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {previewSendOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => !sendingPreview && setPreviewSendOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-line bg-d-panel p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-d-pink" />
                <h3
                  className="text-sm font-semibold text-d-fg"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  Envoyer une preview
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewSendOpen(false)}
                disabled={sendingPreview}
                className="text-d-fg4 transition-colors hover:text-d-fg2 disabled:opacity-40"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-d-fg4">
                  Destinataires
                </span>
                <textarea
                  value={previewRecipients}
                  onChange={(event) => setPreviewRecipients(event.target.value)}
                  placeholder="thomas@coinhouse.com, equipe@coinhouse.com"
                  rows={3}
                  className="w-full resize-y rounded-xl border border-line bg-d-panel2 px-3 py-2.5 text-sm leading-relaxed text-d-fg outline-none transition-colors placeholder:text-d-fg4 focus:border-line2"
                />
                <span className="mt-1 block text-[11px] leading-relaxed text-d-fg4">
                  Sépare les adresses par une virgule, un point-virgule ou un retour ligne. Maximum 10 destinataires.
                </span>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-d-fg4">
                  Sujet
                </span>
                <input
                  type="text"
                  value={previewSubject}
                  onChange={(event) => setPreviewSubject(event.target.value)}
                  className="w-full rounded-xl border border-line bg-d-panel2 px-3 py-2.5 text-sm text-d-fg outline-none transition-colors placeholder:text-d-fg4 focus:border-line2"
                />
              </label>
              <div className="rounded-xl border border-line bg-d-panel2 px-3 py-3 text-xs leading-relaxed text-d-fg3">
                L'email envoyé reprend exactement le HTML affiché dans l'aperçu actuel. Le pré-header est déjà intégré au HTML généré.
              </div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPreviewSendOpen(false)}
                disabled={sendingPreview}
                className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-d-fg3 transition-colors hover:border-line2 hover:text-d-fg disabled:opacity-40"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSendPreview}
                disabled={sendingPreview || !previewRecipients.trim() || !previewSubject.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-d-pink px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sendingPreview ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Envoyer la preview
              </button>
            </div>
          </div>
        </div>
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
        <span className="hidden sm:inline">Lecture seule</span>
      </div>
    );
  }
  if (saving) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-d-fg3">
        <Loader2 size={12} className="animate-spin" />
        <span className="hidden sm:inline">Sauvegarde…</span>
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
        className="flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] shadow-sm"
        style={{
          color: "#007C66",
          background: "#D9FFF7",
          borderColor: "#00BB97",
        }}
      >
        <Cloud size={12} strokeWidth={2.4} />
        <span className="hidden sm:inline">Sauvé · {time}</span>
      </div>
    );
  }
  return null;
}
