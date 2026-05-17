// ─────────────────────────────────────────────────────────────────────────────
// Panneau d'aperçu — iframe pour rendu HTML, ou code brut, avec toggle device
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { Monitor, Smartphone, Maximize2, Minimize2 } from "lucide-react";
import { THEME } from "../config/theme.js";
import { Tooltip } from "./Tooltip.jsx";

function DeviceToggle({ previewDevice, setPreviewDevice }) {
  return (
    <div className="flex items-center rounded-full border border-line bg-d-panel2 p-1">
      <button
        onClick={() => setPreviewDevice("desktop")}
        className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] font-semibold transition-colors outline-none ${
          previewDevice === "desktop"
            ? "bg-white text-[#15151A]"
            : "text-d-fg3 hover:text-d-fg2"
        }`}
      >
        <Monitor size={12} /> Desktop
      </button>
      <button
        onClick={() => setPreviewDevice("mobile")}
        className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] font-semibold transition-colors outline-none ${
          previewDevice === "mobile"
            ? "bg-white text-[#15151A]"
            : "text-d-fg3 hover:text-d-fg2"
        }`}
      >
        <Smartphone size={12} /> Mobile
      </button>
    </div>
  );
}

export function PreviewPanel({ html, view, previewDevice, setPreviewDevice }) {
  const [fullscreen, setFullscreen] = useState(false);

  const iframeEl = (
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
  );

  return (
    <>
      {/* Panneau normal */}
      <div className="flex h-[70vh] min-h-[420px] min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-d-panel xl:h-[calc(100vh-180px)]">
        {view === "preview" && (
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <div className="flex-1" />
            <DeviceToggle previewDevice={previewDevice} setPreviewDevice={setPreviewDevice} />
            <div className="flex flex-1 justify-end">
              <Tooltip label="Plein écran" side="bottom" align="right">
                <button
                  onClick={() => setFullscreen(true)}
                  className="flex items-center justify-center p-1.5 text-d-fg4 hover:text-d-fg2 transition-colors rounded-full"
                >
                  <Maximize2 size={14} />
                </button>
              </Tooltip>
            </div>
          </div>
        )}

        {view === "preview" ? (
          <div
            className="flex-1 overflow-auto flex justify-center"
            style={{
              background: "radial-gradient(ellipse at top, rgba(65,65,255,0.05), transparent 60%), #0B0B0D",
            }}
          >
            {iframeEl}
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

      {/* Overlay plein écran */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: "#0B0B0D" }}
        >
          <div
            className="flex items-center justify-between border-b border-line px-4 py-2 flex-shrink-0"
            style={{ background: "#1E1E22" }}
          >
            <div className="flex-1" />
            <DeviceToggle previewDevice={previewDevice} setPreviewDevice={setPreviewDevice} />
            <div className="flex flex-1 justify-end">
              <Tooltip label="Quitter le plein écran" side="bottom" align="right">
                <button
                  onClick={() => setFullscreen(false)}
                  className="flex items-center justify-center p-1.5 text-d-fg4 hover:text-d-fg2 transition-colors rounded-full"
                >
                  <Minimize2 size={14} />
                </button>
              </Tooltip>
            </div>
          </div>
          <div
            className="flex flex-1 overflow-auto justify-center"
            style={{
              background: "radial-gradient(ellipse at top, rgba(65,65,255,0.05), transparent 60%), #0B0B0D",
            }}
          >
            <iframe
              title="Aperçu newsletter plein écran"
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
        </div>
      )}
    </>
  );
}
