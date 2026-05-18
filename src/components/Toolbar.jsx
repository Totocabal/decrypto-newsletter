// ─────────────────────────────────────────────────────────────────────────────
// Barre d'outils en haut de l'éditeur
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import {
  Eye,
  Code2,
  Save,
  Copy,
  Check,
  Package,
  UploadCloud,
  Loader2,
  BookMarked,
  X,
} from "lucide-react";
import { Tooltip } from "./Tooltip.jsx";

export function Toolbar({
  brandName,
  view,
  setView,
  onSave,
  onCopy,
  onExportZip,
  onExportBraze,
  onSaveAsPreset,
  copied,
  saved,
  exporting,
  exportingBraze,
}) {
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const busy = exporting || exportingBraze;

  const handleExportZip = () => {
    setExportModalOpen(false);
    onExportZip?.();
  };

  const handleExportBraze = () => {
    setExportModalOpen(false);
    onExportBraze?.();
  };

  return (
    <>
      <div className="bg-d-panel border-b border-line sticky top-0 z-20">
        <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div
              className="truncate text-[10px] uppercase tracking-[0.22em] text-d-fg3 font-semibold"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {brandName}
            </div>
            <div
              className="mt-0.5 text-lg font-bold text-d-fg sm:text-xl"
              style={{ fontFamily: "'Sora', sans-serif", letterSpacing: "-0.01em" }}
            >
              Éditeur de newsletter
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto overflow-y-hidden pb-1 lg:flex-wrap lg:justify-end lg:overflow-visible lg:pb-0">
            {/* Switch Aperçu / Code */}
            <div className="mr-1 flex flex-shrink-0 items-center rounded-full border border-line bg-d-panel2 p-1 sm:mr-2">
              <button
                onClick={() => setView("preview")}
                className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] transition-colors font-semibold ${
                  view === "preview" ? "bg-white text-[#15151A]" : "text-d-fg3 hover:text-d-fg2"
                }`}
              >
                <Eye size={12} /> Aperçu
              </button>
              <button
                onClick={() => setView("code")}
                className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] transition-colors font-semibold ${
                  view === "code" ? "bg-white text-[#15151A]" : "text-d-fg3 hover:text-d-fg2"
                }`}
              >
                <Code2 size={12} /> Code HTML
              </button>
            </div>

            {/* Sauvegarder une version */}
            <Tooltip
              className="flex-shrink-0"
              side="bottom"
              align="right"
              label="Crée une version numérotée automatiquement. Le champ proposé sert uniquement à ajouter un commentaire optionnel."
            >
              <button
                onClick={onSave}
                aria-label={saved ? "Sauvé" : "Sauvegarder"}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-line2 text-d-fg2 transition-colors hover:bg-d-panel2 focus:bg-d-panel2 focus:outline-none focus:ring-2 focus:ring-d-pink/30 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-2 sm:text-[11px] sm:font-medium sm:uppercase sm:tracking-[0.14em]"
              >
                {saved ? <Check size={12} /> : <Save size={12} />}
                <span className="hidden sm:inline">{saved ? "Sauvé" : "Sauvegarder"}</span>
              </button>
            </Tooltip>

            <div className="hidden h-5 w-px sm:block" style={{ background: "var(--d-line2)" }} />

            {/* Enregistrer comme preset */}
            {onSaveAsPreset && (
              <Tooltip
                className="flex-shrink-0"
                side="bottom"
                align="right"
                label="Enregistrer le contenu actuel comme preset réutilisable."
              >
                <button
                  onClick={onSaveAsPreset}
                  aria-label="Preset"
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-line2 text-d-fg2 transition-colors hover:bg-d-panel2 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-2 sm:text-[11px] sm:font-medium sm:uppercase sm:tracking-[0.14em]"
                >
                  <BookMarked size={12} />
                  <span className="hidden sm:inline">Preset</span>
                </button>
              </Tooltip>
            )}

            {/* Bouton Export unique */}
            {(onExportZip || onExportBraze) && (
              <button
                onClick={() => setExportModalOpen(true)}
                disabled={busy}
                aria-label="Exporter"
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center whitespace-nowrap rounded-full text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-2 sm:text-[11px] sm:font-semibold sm:uppercase sm:tracking-[0.14em]"
                style={{ background: "linear-gradient(90deg, #4141FF 0%, #FF00AA 60%, #FF4B28 100%)" }}
              >
                {busy ? (
                  <><Loader2 size={12} className="animate-spin" /> <span className="hidden sm:inline">Export…</span></>
                ) : (
                  <><Package size={12} /> <span className="hidden sm:inline">Exporter</span></>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modale de choix d'export */}
      {exportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setExportModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-line bg-d-panel p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3
                className="text-sm font-semibold text-d-fg"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Exporter la newsletter
              </h3>
              <button
                onClick={() => setExportModalOpen(false)}
                className="text-d-fg4 hover:text-d-fg2 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {onExportZip && (
                <button
                  onClick={handleExportZip}
                  className="flex w-full items-start gap-4 rounded-xl border border-line bg-d-panel2 px-4 py-4 text-left transition-colors hover:border-line2 hover:bg-d-panel3"
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(65,65,255,0.15)" }}>
                    <Package size={16} style={{ color: "#4141FF" }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-d-fg">Export ZIP</div>
                    <div className="mt-0.5 text-xs text-d-fg3">HTML + dossier assets avec tous les PNG. À héberger sur ton CDN.</div>
                  </div>
                </button>
              )}

              {onExportBraze && (
                <button
                  onClick={handleExportBraze}
                  className="flex w-full items-start gap-4 rounded-xl border border-line bg-d-panel2 px-4 py-4 text-left transition-colors hover:border-line2 hover:bg-d-panel3"
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(255,0,170,0.15)" }}>
                    <UploadCloud size={16} style={{ color: "#FF00AA" }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-d-fg">Export Braze</div>
                    <div className="mt-0.5 text-xs text-d-fg3">Upload les images dans Braze et génère le HTML avec les URLs finales.</div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
