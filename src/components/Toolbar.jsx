// ─────────────────────────────────────────────────────────────────────────────
// Barre d'outils en haut de l'éditeur
// ─────────────────────────────────────────────────────────────────────────────

import {
  Eye,
  Code2,
  Save,
  Copy,
  Check,
  Package,
  UploadCloud,
  Loader2,
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
  copied,
  saved,
  exporting,
  exportingBraze,
}) {
  return (
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
          <div
            className="mr-1 flex flex-shrink-0 items-center rounded-full border border-line bg-d-panel2 p-1 sm:mr-2"
          >
            <button
              onClick={() => setView("preview")}
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] transition-colors font-semibold ${
                view === "preview"
                  ? "bg-white text-[#15151A]"
                  : "text-d-fg3 hover:text-d-fg2"
              }`}
            >
              <Eye size={12} /> Aperçu
            </button>
            <button
              onClick={() => setView("code")}
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] transition-colors font-semibold ${
                view === "code"
                  ? "bg-white text-[#15151A]"
                  : "text-d-fg3 hover:text-d-fg2"
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
              className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-line2 px-3 py-2 text-[11px] uppercase tracking-[0.14em] font-medium text-d-fg2 transition-colors hover:bg-d-panel2 focus:bg-d-panel2 focus:outline-none focus:ring-2 focus:ring-d-pink/30"
            >
              {saved ? <Check size={12} /> : <Save size={12} />}
              {saved ? "Sauvé" : "Sauvegarder"}
            </button>
          </Tooltip>

          <div className="hidden h-5 w-px sm:block" style={{ background: "var(--d-line2)" }} />

          {/* Copier HTML */}
          <button
            onClick={onCopy}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-line2 px-3 py-2 text-[11px] uppercase tracking-[0.14em] font-medium text-d-fg2 transition-colors hover:bg-d-panel2"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copié" : "Copier HTML"}
          </button>

          {/* Export ZIP */}
          {onExportZip && (
            <Tooltip
              className="flex-shrink-0"
              side="bottom"
              align="right"
              label="Exporter le HTML et le dossier assets avec les PNG dans un fichier ZIP."
            >
            <button
              onClick={onExportZip}
              disabled={exporting}
              className="flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-[11px] uppercase tracking-[0.14em] font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: "linear-gradient(90deg, #4141FF 0%, #FF00AA 60%, #FF4B28 100%)",
              }}
            >
              {exporting ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Export…
                </>
              ) : (
                <>
                  <Package size={12} />
                  Export ZIP
                </>
              )}
            </button>
            </Tooltip>
          )}

          {/* Export Braze */}
          {onExportBraze && (
            <Tooltip
              className="flex-shrink-0"
              side="bottom"
              align="right"
              label="Uploader les images dans Braze et exporter le HTML avec les URLs Braze."
            >
            <button
              onClick={onExportBraze}
              disabled={exportingBraze}
              className="flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-[11px] uppercase tracking-[0.14em] font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: "#FF00AA" }}
            >
              {exportingBraze ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Export…
                </>
              ) : (
                <>
                  <UploadCloud size={12} />
                  Export Braze
                </>
              )}
            </button>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}
