// ─────────────────────────────────────────────────────────────────────────────
// PendingApprovalPage — affichée quand le user est connecté mais pas approuvé
// ─────────────────────────────────────────────────────────────────────────────

import { Clock, LogOut, RefreshCw } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";

export function PendingApprovalPage() {
  const { profile, signOut, refreshProfile } = useAuth();

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
      <div className="bg-white border border-stone-200 rounded-sm w-full max-w-md p-8">
        <div className="bg-amber-50 border border-amber-200 rounded-sm p-4 mb-6 flex gap-3">
          <Clock className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <div className="text-sm font-medium text-amber-900 mb-1">
              En attente d'approbation
            </div>
            <div className="text-xs text-amber-800 leading-relaxed">
              Ton compte a bien été créé. Un administrateur doit approuver ton
              accès avant que tu puisses éditer les newsletters.
            </div>
          </div>
        </div>

        <div className="text-xs text-stone-500 mb-6 leading-relaxed">
          <div className="text-[10px] uppercase tracking-[0.18em] text-stone-400 font-medium mb-1">
            Compte
          </div>
          <div className="text-stone-800">{profile?.email}</div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={refreshProfile}
            className="flex-1 border border-stone-300 hover:border-stone-500 text-stone-700 text-xs uppercase tracking-[0.18em] font-medium py-2.5 rounded-sm transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw size={12} />
            Rafraîchir
          </button>
          <button
            onClick={signOut}
            className="flex-1 border border-stone-300 hover:border-stone-500 text-stone-700 text-xs uppercase tracking-[0.18em] font-medium py-2.5 rounded-sm transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={12} />
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}
