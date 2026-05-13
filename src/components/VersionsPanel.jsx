// ─────────────────────────────────────────────────────────────────────────────
// VersionsPanel — modal listant l'historique d'une newsletter
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { X, RotateCcw, User, Clock, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase.js";

export function VersionsPanel({ newsletterId, onRestore, onClose }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("versions")
        .select(
          "id, created_at, comment, author_id, profiles:profiles!versions_author_id_fkey(full_name, email)"
        )
        .eq("newsletter_id", newsletterId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (mounted) {
        setVersions(data || []);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [newsletterId]);

  const handleRestore = async (versionId) => {
    if (
      !confirm(
        "Restaurer cette version remplacera l'état courant de la newsletter. Continuer ?"
      )
    )
      return;
    const { data } = await supabase
      .from("versions")
      .select("state")
      .eq("id", versionId)
      .single();
    if (data?.state) onRestore(data.state);
    onClose();
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-d-panel border border-line rounded-2xl w-full max-w-2xl max-h-[82vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="h-1 bg-gradient-to-r from-d-blue via-d-pink to-d-green" />
        <div className="flex items-center justify-between px-6 py-5 border-b border-line">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-d-pink font-semibold mb-1">
              Historique
            </div>
            <h2
              className="text-xl font-semibold text-d-fg tracking-tight"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Versions sauvegardées
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 inline-flex items-center justify-center text-d-fg4 hover:text-d-fg2 hover:bg-d-panel2 rounded-lg transition-colors"
            title="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="p-10 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.18em] text-d-fg3">
              <Loader2 className="animate-spin" size={14} />
              Chargement…
            </div>
          ) : versions.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-sm text-d-fg2 mb-2">
                Aucune version sauvegardée pour l'instant.
              </div>
              <div className="text-xs text-d-fg4">
                Clique sur "Sauvegarder" pour créer un point de restauration.
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {versions.map((v) => (
                <li
                  key={v.id}
                  className="px-6 py-4 hover:bg-d-panel2 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-d-fg3 mb-2">
                        <span className="flex items-center gap-1.5">
                          <Clock size={10} />
                          {formatDate(v.created_at)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <User size={10} />
                          {v.profiles?.full_name || v.profiles?.email || "?"}
                        </span>
                      </div>
                      {v.comment ? (
                        <div className="text-sm text-d-fg2 leading-relaxed">
                          {v.comment}
                        </div>
                      ) : (
                        <div className="text-sm text-d-fg4 italic">
                          Sans commentaire
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestore(v.id)}
                      className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold text-d-fg2 hover:text-d-fg px-3 py-2 border border-line hover:border-line2 rounded-lg flex-shrink-0 transition-colors"
                    >
                      <RotateCcw size={11} />
                      Restaurer
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
