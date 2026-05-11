// ─────────────────────────────────────────────────────────────────────────────
// VersionsPanel — modal listant l'historique d'une newsletter
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { X, RotateCcw, User, Clock } from "lucide-react";
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
    <div className="fixed inset-0 bg-stone-900/40 z-50 flex items-center justify-center p-6">
      <div className="bg-white border border-stone-200 rounded-sm w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-medium">
              Historique
            </div>
            <h2 className="text-base font-semibold text-stone-900">
              Versions sauvegardées
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-sm"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="p-8 text-center text-xs text-stone-400">
              Chargement…
            </div>
          ) : versions.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-400">
              Aucune version sauvegardée pour l'instant.
              <br />
              Clique sur « Sauvegarder » pour créer un point de restauration.
            </div>
          ) : (
            <ul className="divide-y divide-stone-100">
              {versions.map((v) => (
                <li
                  key={v.id}
                  className="px-5 py-3 hover:bg-stone-50 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 text-[11px] text-stone-500 mb-1">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {formatDate(v.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <User size={10} />
                          {v.profiles?.full_name || v.profiles?.email || "?"}
                        </span>
                      </div>
                      {v.comment && (
                        <div className="text-sm text-stone-700">
                          {v.comment}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRestore(v.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-medium text-stone-700 hover:text-stone-900 px-2 py-1.5 border border-stone-200 hover:border-stone-500 rounded-sm flex-shrink-0"
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
