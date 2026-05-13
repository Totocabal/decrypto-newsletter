// ─────────────────────────────────────────────────────────────────────────────
// Panneau d'aperçu — iframe pour rendu HTML, ou code brut, avec toggle device
// ─────────────────────────────────────────────────────────────────────────────

import { Monitor, Smartphone } from "lucide-react";
import { THEME } from "../config/theme.js";
import { Tooltip } from "./Tooltip.jsx";

export function PreviewPanel({ html, view, previewDevice, setPreviewDevice }) {
  return (
    <div
      className="bg-d-panel border border-line rounded-2xl overflow-hidden flex flex-col"
      style={{ height: "calc(100vh - 180px)" }}
    >
      {view === "preview" && (
        <div className="flex items-center justify-center gap-1 px-3 py-2 border-b border-line">
          <div className="flex items-center bg-d-panel2 rounded-full p-1 border border-line">
            <Tooltip label="Aperçu desktop">
              <button
                onClick={() => setPreviewDevice("desktop")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] rounded-full font-semibold transition-colors ${
                  previewDevice === "desktop"
                    ? "bg-white text-[#15151A]"
                    : "text-d-fg3 hover:text-d-fg2"
                }`}
              >
                <Monitor size={12} /> Desktop
              </button>
            </Tooltip>
            <Tooltip label="Aperçu mobile">
              <button
                onClick={() => setPreviewDevice("mobile")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] rounded-full font-semibold transition-colors ${
                  previewDevice === "mobile"
                    ? "bg-white text-[#15151A]"
                    : "text-d-fg3 hover:text-d-fg2"
                }`}
              >
                <Smartphone size={12} /> Mobile
              </button>
            </Tooltip>
          </div>
        </div>
      )}

      {view === "preview" ? (
        <div
          className="flex-1 overflow-auto flex justify-center"
          style={{
            background:
              "radial-gradient(ellipse at top, rgba(65,65,255,0.05), transparent 60%), #0B0B0D",
          }}
        >
          <iframe
            title="Aperçu newsletter"
            srcDoc={html}
            style={{
              width: previewDevice === "mobile" ? "430px" : "100%",
              maxWidth: previewDevice === "mobile" ? "100%" : "none",
              height: "100%",
              border:
                previewDevice === "mobile"
                  ? `1px solid ${THEME.border}`
                  : "none",
              background: THEME.bgPage,
              flexShrink: 0,
            }}
          />
        </div>
      ) : (
        <pre
          className="flex-1 overflow-auto p-4 text-[11px] leading-relaxed text-d-fg3 font-mono whitespace-pre-wrap"
          style={{ background: "#0B0B0D" }}
        >
          {html}
        </pre>
      )}
    </div>
  );
}
