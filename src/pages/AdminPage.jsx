// ─────────────────────────────────────────────────────────────────────────────
// AdminPage — gestion des comptes (approbation, droits admin)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Check, ShieldCheck, X } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../contexts/AuthContext.jsx";

export function AdminPage({ onBack }) {
  const { profile: currentProfile } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setProfiles(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateProfile = async (id, patch) => {
    const { error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", id);
    if (error) {
      alert("Erreur : " + error.message);
      return;
    }
    load();
  };

  const formatDate = (iso) => {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const pending = profiles.filter((p) => !p.approved);
  const approved = profiles.filter((p) => p.approved);

  return (
    <div className="min-h-screen bg-stone-100">
      <header className="bg-white border-b border-stone-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-medium text-stone-600 hover:text-stone-900 px-3 py-2 border border-stone-300 hover:border-stone-500 rounded-sm"
          >
            <ArrowLeft size={12} />
            Retour
          </button>
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-medium">
              Administration
            </div>
            <h1 className="text-lg font-semibold text-stone-900">
              Comptes utilisateurs
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {loading && (
          <div className="text-xs text-stone-400 text-center p-8">
            Chargement…
          </div>
        )}

        {/* En attente */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-medium">
              En attente d'approbation
            </h2>
            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-sm font-medium">
              {pending.length}
            </span>
          </div>
          {pending.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-sm p-6 text-xs text-stone-400 text-center">
              Aucun compte en attente.
            </div>
          ) : (
            <div className="bg-white border border-stone-200 rounded-sm divide-y divide-stone-100">
              {pending.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-4 px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-stone-900">
                      {p.full_name || p.email}
                    </div>
                    <div className="text-[11px] text-stone-500">
                      {p.email} · inscrit le {formatDate(p.created_at)}
                    </div>
                  </div>
                  <button
                    onClick={() => updateProfile(p.id, { approved: true })}
                    className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-medium text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-sm"
                  >
                    <Check size={11} />
                    Approuver
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Approuvés */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-medium">
              Comptes approuvés
            </h2>
            <span className="text-[10px] bg-stone-200 text-stone-700 px-2 py-0.5 rounded-sm font-medium">
              {approved.length}
            </span>
          </div>
          <div className="bg-white border border-stone-200 rounded-sm divide-y divide-stone-100">
            {approved.map((p) => {
              const isSelf = p.id === currentProfile.id;
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-4 px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-stone-900">
                        {p.full_name || p.email}
                      </span>
                      {p.is_admin && (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] font-medium bg-stone-900 text-white px-2 py-0.5 rounded-sm">
                          <ShieldCheck size={10} />
                          Admin
                        </span>
                      )}
                      {isSelf && (
                        <span className="text-[10px] uppercase tracking-[0.14em] font-medium text-stone-400">
                          (toi)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-stone-500">{p.email}</div>
                  </div>
                  {!isSelf && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          updateProfile(p.id, { is_admin: !p.is_admin })
                        }
                        className="text-[10px] uppercase tracking-[0.18em] font-medium text-stone-600 hover:text-stone-900 px-3 py-1.5 border border-stone-200 hover:border-stone-500 rounded-sm"
                      >
                        {p.is_admin ? "Retirer admin" : "Promouvoir admin"}
                      </button>
                      <button
                        onClick={() =>
                          confirm(`Révoquer l'accès de ${p.email} ?`) &&
                          updateProfile(p.id, { approved: false, is_admin: false })
                        }
                        className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-medium text-red-700 hover:bg-red-50 px-3 py-1.5 border border-red-200 hover:border-red-500 rounded-sm"
                      >
                        <X size={11} />
                        Révoquer
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
