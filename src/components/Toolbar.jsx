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
      <div className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div
            className="text-[10px] uppercase tracking-[0.22em] text-d-fg3 font-semibold"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {brandName}
          </div>
          <div
            className="text-xl font-bold text-d-fg mt-0.5"
            style={{ fontFamily: "'Sora', sans-serif", letterSpacing: "-0.01em" }}
          >
            Éditeur de newsletter
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Switch Aperçu / Code */}
          <div
            className="flex items-center bg-d-panel2 rounded-full p-1 mr-2 border border-line"
          >
            <button
              onClick={() => setView("preview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] rounded-full transition-colors font-semibold ${
                view === "preview"
                  ? "bg-white text-[#15151A]"
                  : "text-d-fg3 hover:text-d-fg2"
              }`}
            >
              <Eye size={12} /> Aperçu
            </button>
            <button
              onClick={() => setView("code")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] rounded-full transition-colors font-semibold ${
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
            side="bottom"
            align="right"
            label="Crée une version numérotée automatiquement. Le champ proposé sert uniquement à ajouter un commentaire optionnel."
          >
            <button
              onClick={onSave}
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] uppercase tracking-[0.14em] font-medium border border-line2 text-d-fg2 rounded-full hover:bg-d-panel2 focus:bg-d-panel2 focus:outline-none focus:ring-2 focus:ring-d-pink/30 transition-colors"
            >
              {saved ? <Check size={12} /> : <Save size={12} />}
              {saved ? "Sauvé" : "Sauvegarder"}
            </button>
          </Tooltip>

          <div className="w-px h-5 mx-1" style={{ background: "var(--d-line2)" }} />

          {/* Copier HTML */}
          <button
            onClick={onCopy}
            className="flex items-center gap-1.5 px-3 py-2 text-[11px] uppercase tracking-[0.14em] font-medium border border-line2 text-d-fg2 rounded-full hover:bg-d-panel2 transition-colors"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copié" : "Copier HTML"}
          </button>

          {/* Export ZIP */}
          {onExportZip && (
            <Tooltip
              side="bottom"
              align="right"
              label="Exporter le HTML et le dossier assets avec les PNG dans un fichier ZIP."
            >
            <button
              onClick={onExportZip}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] uppercase tracking-[0.14em] font-semibold rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white"
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
              side="bottom"
              align="right"
              label="Uploader les images dans Braze et exporter le HTML avec les URLs Braze."
            >
            <button
              onClick={onExportBraze}
              disabled={exportingBraze}
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] uppercase tracking-[0.14em] font-semibold rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white"
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
