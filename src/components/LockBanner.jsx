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
    <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
      <div className="max-w-6xl mx-auto flex items-center gap-3">
        <Lock className="text-amber-600 flex-shrink-0" size={16} />
        <div className="flex-1 text-sm text-amber-900">
          <strong>
            {lockInfo?.user_full_name || lockInfo?.user_email}
          </strong>{" "}
          édite cette newsletter
          {minutes > 0 && ` depuis ${minutes} min`}. Tu es en lecture seule.
        </div>
        <button
          onClick={onBack}
          className="text-[10px] uppercase tracking-[0.18em] font-medium text-amber-900 hover:text-amber-700 px-3 py-1.5 border border-amber-300 hover:border-amber-500 rounded-sm"
        >
          Retour
        </button>
        <button
          onClick={handleTakeOver}
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-medium text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-sm"
        >
          <AlertTriangle size={11} />
          Forcer la prise de contrôle
        </button>
      </div>
    </div>
  );
}
