import { useDeferredValue, useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { estimateExportSize, heaviestSections, formatKo } from "../utils/emailSize.js";

const STYLES = {
  warn: { color: "#FF8B28", bg: "rgba(255,139,40,0.10)", border: "rgba(255,139,40,0.30)" },
  danger: { color: "#FF4B28", bg: "rgba(255,75,40,0.12)", border: "rgba(255,75,40,0.35)" },
};

export function EmailSizeAlert({ state }) {
  const deferredState = useDeferredValue(state);
  const size = useMemo(() => (deferredState ? estimateExportSize(deferredState) : null), [deferredState]);
  const heavy = useMemo(
    () => (size && size.level !== "ok" ? heaviestSections(deferredState) : []),
    [deferredState, size]
  );

  if (!size || size.level === "ok") return null;
  const s = STYLES[size.level];
  const over = size.bytes >= size.limit;

  return (
    <div
      role="alert"
      className="mx-4 mt-4 flex items-start gap-3 rounded-xl px-4 py-3 text-xs sm:mx-6"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
    >
      <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <div className="font-semibold">
          {over
            ? "Gmail va tronquer cet email"
            : "Risque de troncature par Gmail"}
          {" · "}~{formatKo(size.bytes)} sur {formatKo(size.limit)} ({size.percent} %)
        </div>
        <div className="mt-1 opacity-90">
          Gmail coupe les emails de plus de 102 Ko (le lien de désinscription et les mentions légales
          disparaissent derrière « Afficher l'intégralité »). Estimation après export Braze, liens
          trackés inclus.
          {heavy.length > 0 && (
            <>
              {" "}Blocs les plus lourds : {heavy.map((h) => `${h.label} (${formatKo(h.bytes)})`).join(", ")}.
            </>
          )}
        </div>
      </div>
    </div>
  );
}
