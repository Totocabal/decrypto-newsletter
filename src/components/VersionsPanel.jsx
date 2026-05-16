// ─────────────────────────────────────────────────────────────────────────────
// VersionsPanel — modal listant l'historique d'une newsletter
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { X, RotateCcw, User, Clock, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { Tooltip } from "./Tooltip.jsx";

export function VersionsPanel({ newsletterId, onRestore, onClose }) {
  const [versions, setVersions] = useState([]);
  const [totalVersions, setTotalVersions] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, count } = await supabase
        .from("versions")
        .select(
          "id, created_at, comment, author_id, profiles:profiles!versions_author_id_fkey(full_name, email)",
          { count: "exact" }
        )
        .eq("newsletter_id", newsletterId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (mounted) {
        setVersions(data || []);
        setTotalVersions(count ?? data?.length ?? 0);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm sm:p-6">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-d-panel shadow-2xl sm:max-h-[82vh]">
        <div className="h-1 bg-gradient-to-r from-d-blue via-d-pink to-d-green" />
        <div className="flex items-start justify-between gap-4 border-b border-line px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.22em] text-d-pink font-semibold mb-1">
              Historique
            </div>
            <h2
              className="text-lg font-semibold tracking-tight text-d-fg sm:text-xl"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Versions sauvegardées
            </h2>
          </div>
          <Tooltip label="Fermer" align="right">
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 inline-flex items-center justify-center text-d-fg4 hover:text-d-fg2 hover:bg-d-panel2 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </Tooltip>
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
              {versions.map((v, index) => {
                const versionNumber = Math.max(totalVersions - index, 1);
                return (
                <li
                  key={v.id}
                  className="px-4 py-4 transition-colors hover:bg-d-panel2 sm:px-6"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-sm font-semibold text-d-fg mb-2"
                        style={{ fontFamily: "'Sora', sans-serif" }}
                      >
                        Version {versionNumber}
                      </div>
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
                      className="flex flex-shrink-0 items-center justify-center rounded-lg border border-line p-2 text-d-fg2 transition-colors hover:border-line2 hover:text-d-fg"
                    >
                      <RotateCcw size={13} />
                    </button>
                  </div>
                </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
