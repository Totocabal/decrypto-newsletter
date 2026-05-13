// ─────────────────────────────────────────────────────────────────────────────
// LockBanner — bandeau quand la newsletter est verrouillée par quelqu'un d'autre
// ─────────────────────────────────────────────────────────────────────────────

import { Lock, AlertTriangle } from "lucide-react";

export function LockBanner({ lockInfo, onTakeOver, onBack }) {
  const minutes = lockInfo
    ? Math.max(
        0,
        Math.round((new Date(lockInfo.acquired_at) - new Date()) / 60000) * -1
      )
    : 0;

  const handleTakeOver = () => {
    if (
      !confirm(
        `Forcer la prise de contrôle ?\n\n${
          lockInfo?.user_full_name || lockInfo?.user_email
        } est en train d'éditer cette newsletter. En forçant, ses modifications non sauvegardées risquent d'être écrasées.`
      )
    )
      return;
    onTakeOver();
  };

  return (
    <div
      className="border-b px-4 py-3 sm:px-6"
      style={{
        background: "rgba(255,75,40,0.08)",
        borderColor: "rgba(255,75,40,0.20)",
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center">
        <Lock size={16} style={{ color: "#FF8466", flexShrink: 0 }} />
        <div className="flex-1 text-sm" style={{ color: "#FFB8A0" }}>
          <strong style={{ color: "#FFCFBD" }}>
            {lockInfo?.user_full_name || lockInfo?.user_email}
          </strong>{" "}
          édite cette newsletter
          {minutes > 0 && ` depuis ${minutes} min`}. Tu es en lecture seule.
        </div>
        <button
          onClick={onBack}
          className="text-[10px] uppercase tracking-[0.18em] font-medium px-3 py-1.5 rounded-full transition-colors"
          style={{
            color: "#FFB8A0",
            border: "1px solid rgba(255,75,40,0.30)",
          }}
        >
          Retour
        </button>
        <button
          onClick={handleTakeOver}
          className="flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold text-white transition-colors"
          style={{ background: "#FF4B28" }}
        >
          <AlertTriangle size={11} />
          Forcer la prise de contrôle
        </button>
      </div>
    </div>
  );
}
