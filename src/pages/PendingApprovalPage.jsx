// ─────────────────────────────────────────────────────────────────────────────
// PendingApprovalPage — affichée quand le user est connecté mais pas approuvé
// ─────────────────────────────────────────────────────────────────────────────

import { Clock, LogOut, RefreshCw } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { Wordmark } from "../components/Wordmark.jsx";

export function PendingApprovalPage() {
  const { profile, signOut, refreshProfile } = useAuth();

  return (
    <div className="min-h-screen bg-d-bg flex flex-col items-center justify-center p-6 gap-8">
      <Wordmark size={18} />
      <div
        className="rounded-2xl border border-line w-full max-w-md p-8"
        style={{ background: "#1E1E22" }}
      >
        <div
          className="rounded-xl p-4 mb-6 flex gap-3"
          style={{ background: "rgba(255,165,0,0.08)", border: "1px solid rgba(255,165,0,0.20)" }}
        >
          <Clock style={{ color: "#FFAD33", flexShrink: 0, marginTop: 2 }} size={18} />
          <div>
            <div className="text-sm font-semibold mb-1" style={{ color: "#FFAD33" }}>
              En attente d'approbation
            </div>
            <div className="text-xs text-d-fg3 leading-relaxed">
              Ton compte a bien été créé. Un administrateur doit approuver ton
              accès avant que tu puisses éditer les newsletters.
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="text-[10px] uppercase tracking-[0.18em] text-d-fg4 font-medium mb-1">
            Compte
          </div>
          <div className="text-sm text-d-fg">{profile?.email}</div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={refreshProfile}
            className="flex-1 border border-line hover:border-line2 text-d-fg3 hover:text-d-fg text-[10px] uppercase tracking-[0.18em] font-medium py-2.5 rounded-full transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw size={12} />
            Rafraîchir
          </button>
          <button
            onClick={signOut}
            className="flex-1 border border-line hover:border-line2 text-d-fg3 hover:text-d-fg text-[10px] uppercase tracking-[0.18em] font-medium py-2.5 rounded-full transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={12} />
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}
