// ─────────────────────────────────────────────────────────────────────────────
// Panneau d'aperçu — iframe pour rendu HTML, ou code brut, avec toggle device
// ─────────────────────────────────────────────────────────────────────────────

import { Monitor, Smartphone } from "lucide-react";
import { THEME } from "../config/theme.js";

export function PreviewPanel({ html, view, previewDevice, setPreviewDevice }) {
  return (
    <div
      className="bg-white border border-stone-200 rounded-sm overflow-hidden flex flex-col"
      style={{ height: "calc(100vh - 110px)" }}
    >
      {view === "preview" && (
        <div className="flex items-center justify-center gap-1 px-3 py-2 border-b border-stone-200 bg-stone-50/60">
          <button
            onClick={() => setPreviewDevice("desktop")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] rounded-sm transition-colors ${
              previewDevice === "desktop"
                ? "bg-white text-stone-800 shadow-sm border border-stone-200"
                : "text-stone-500 hover:text-stone-700"
            }`}
            title="Aperçu desktop"
          >
            <Monitor size={12} /> Desktop
          </button>
          <button
            onClick={() => setPreviewDevice("mobile")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] rounded-sm transition-colors ${
              previewDevice === "mobile"
                ? "bg-white text-stone-800 shadow-sm border border-stone-200"
                : "text-stone-500 hover:text-stone-700"
            }`}
            title="Aperçu mobile"
          >
            <Smartphone size={12} /> Mobile
          </button>
        </div>
      )}

      {view === "preview" ? (
        <div
          className="flex-1 overflow-auto flex justify-center"
          style={{ background: THEME.bgPage }}
        >
          <iframe
            title="Aperçu newsletter"
            srcDoc={html}
            style={{
              width: previewDevice === "mobile" ? "430px" : "100%",
              maxWidth: previewDevice === "mobile" ? "100%" : "none",
              height: "100%",
              border: previewDevice === "mobile" ? `1px solid ${THEME.border}` : "none",
              background: THEME.bgPage,
              flexShrink: 0,
            }}
          />
        </div>
      ) : (
        <pre className="flex-1 overflow-auto p-4 text-[11px] leading-relaxed text-stone-700 bg-stone-50 font-mono whitespace-pre-wrap">
          {html}
        </pre>
      )}
    </div>
  );
}
