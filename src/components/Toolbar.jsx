// ─────────────────────────────────────────────────────────────────────────────
// Barre d'outils en haut de l'éditeur
// ─────────────────────────────────────────────────────────────────────────────
// Boutons : aperçu/code, sauvegarder une version, copier HTML, export ZIP.

import {
  Eye,
  Settings,
  Save,
  Copy,
  Check,
  Package,
  Loader2,
} from "lucide-react";

export function Toolbar({
  brandName,
  view,
  setView,
  onSave,
  onCopy,
  onExportZip,
  copied,
  saved,
  exporting,
}) {
  return (
    <div className="bg-white border-b border-stone-200 sticky top-0 z-20">
      <div className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500">
            {brandName}
          </div>
          <div className="text-lg font-medium text-stone-900">
            Éditeur de newsletter
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Switch Aperçu / Code */}
          <div className="flex items-center bg-stone-100 rounded-sm p-0.5 mr-2">
            <button
              onClick={() => setView("preview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] rounded-sm transition-colors ${
                view === "preview"
                  ? "bg-white text-stone-800 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              <Eye size={12} /> Aperçu
            </button>
            <button
              onClick={() => setView("code")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] rounded-sm transition-colors ${
                view === "code"
                  ? "bg-white text-stone-800 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              <Settings size={12} /> Code HTML
            </button>
          </div>

          {/* Sauvegarder une version */}
          <button
            onClick={onSave}
            className="flex items-center gap-1.5 px-3 py-2 text-[10px] uppercase tracking-[0.18em] border border-stone-300 text-stone-700 rounded-sm hover:bg-stone-50 transition-colors"
            title="Créer une version (snapshot) avec un commentaire"
          >
            {saved ? <Check size={12} /> : <Save size={12} />}
            {saved ? "Sauvé" : "Sauvegarder"}
          </button>

          <div className="w-px h-6 bg-stone-200 mx-1" />

          {/* Export HTML inline */}
          <button
            onClick={onCopy}
            className="flex items-center gap-1.5 px-3 py-2 text-[10px] uppercase tracking-[0.18em] bg-stone-800 text-white rounded-sm hover:bg-stone-700 transition-colors"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copié" : "Copier HTML"}
          </button>

          {/* Export ZIP avec assets */}
          {onExportZip && (
            <button
              onClick={onExportZip}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-2 text-[10px] uppercase tracking-[0.18em] bg-pink-600 hover:bg-pink-700 text-white rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        </div>
      </div>
    </div>
  );
}
