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
          <div className="relative group/save">
            <button
              onClick={onSave}
              aria-describedby="save-version-tooltip"
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] uppercase tracking-[0.14em] font-medium border border-line2 text-d-fg2 rounded-full hover:bg-d-panel2 focus:bg-d-panel2 focus:outline-none focus:ring-2 focus:ring-d-pink/30 transition-colors"
            >
              {saved ? <Check size={12} /> : <Save size={12} />}
              {saved ? "Sauvé" : "Sauvegarder"}
            </button>
            <div
              id="save-version-tooltip"
              role="tooltip"
              className="pointer-events-none absolute right-0 top-[calc(100%+10px)] z-30 w-72 rounded-2xl border border-line bg-d-panel px-4 py-3 text-left opacity-0 shadow-2xl transition-all duration-150 translate-y-1 group-hover/save:opacity-100 group-hover/save:translate-y-0 group-focus-within/save:opacity-100 group-focus-within/save:translate-y-0"
            >
              <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-d-pink mb-1">
                Sauvegarde
              </div>
              <div className="text-xs leading-relaxed text-d-fg3 normal-case tracking-normal">
                Crée une version numérotée automatiquement. Le champ proposé sert uniquement à ajouter un commentaire optionnel.
              </div>
            </div>
          </div>

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
            <button
              onClick={onExportZip}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] uppercase tracking-[0.14em] font-semibold rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white"
              style={{
                background: "linear-gradient(90deg, #4141FF 0%, #FF00AA 60%, #FF4B28 100%)",
              }}
              title="Exporter HTML + dossier assets/ avec PNG dans un ZIP"
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
          )}

          {/* Export Braze */}
          {onExportBraze && (
            <button
              onClick={onExportBraze}
              disabled={exportingBraze}
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] uppercase tracking-[0.14em] font-semibold rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white"
              style={{ background: "#FF00AA" }}
              title="Uploader les images dans Braze et exporter le HTML avec les URLs Braze"
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
          )}
        </div>
      </div>
    </div>
  );
}
