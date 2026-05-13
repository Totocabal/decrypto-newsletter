// ─────────────────────────────────────────────────────────────────────────────
// NewslettersListPage — page d'accueil avec liste de toutes les newsletters
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  FileText,
  Copy,
  Trash2,
  Lock,
  Clock,
  LogOut,
  Settings,
  ChevronRight,
} from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { INITIAL_STATE } from "../config/schema.js";
import { Wordmark } from "../components/Wordmark.jsx";

export function NewslettersListPage({ onOpen, onOpenAdmin }) {
  const { profile, signOut } = useAuth();
  const [newsletters, setNewsletters] = useState([]);
  const [locks, setLocks] = useState({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: nls, error: nlsError }, { data: lks, error: locksError }] =
        await Promise.all([
          supabase
            .from("newsletters")
            .select(
              "id, title, issue_number, updated_at, updated_by, archived"
            )
            .eq("archived", false)
            .order("updated_at", { ascending: false }),
          supabase
            .from("locks")
            .select("*")
            .gt("expires_at", new Date().toISOString()),
        ]);

      if (nlsError) throw nlsError;
      if (locksError) {
        // eslint-disable-next-line no-console
        console.warn("[newsletters] locks indisponibles:", locksError);
      }

      setNewsletters(Array.isArray(nls) ? nls : []);
      const map = {};
      (Array.isArray(lks) ? lks : []).forEach((l) => {
        if (l?.newsletter_id) map[l.newsletter_id] = l;
      });
      setLocks(map);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[newsletters] chargement impossible:", error);
      setNewsletters([]);
      setLocks({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const handleCreate = async () => {
    if (!profile?.id) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("newsletters")
      .insert({
        title: `Décrypto N°${INITIAL_STATE.issue_number}`,
        issue_number: INITIAL_STATE.issue_number,
        current_state: INITIAL_STATE,
        created_by: profile.id,
        updated_by: profile.id,
      })
      .select()
      .single();
    setCreating(false);
    if (error) {
      alert("Erreur à la création : " + error.message);
      return;
    }
    onOpen(data.id);
  };

  const handleDuplicate = async (nl) => {
    if (!profile?.id || !nl?.id) return;
    const { data: full } = await supabase
      .from("newsletters")
      .select("*")
      .eq("id", nl.id)
      .single();
    if (!full) return;
    const { data, error } = await supabase
      .from("newsletters")
      .insert({
        title: full.title + " (copie)",
        issue_number: full.issue_number,
        current_state: full.current_state,
        created_by: profile.id,
        updated_by: profile.id,
      })
      .select()
      .single();
    if (error) {
      alert("Erreur à la duplication : " + error.message);
      return;
    }
    load();
  };

  const handleDelete = async (nl) => {
    if (!profile?.is_admin) {
      alert("Seuls les administrateurs peuvent supprimer une newsletter.");
      return;
    }
    if (!nl?.id) return;
    if (!confirm(`Supprimer définitivement « ${nl.title || "cette newsletter"} » ?`)) return;
    const { error } = await supabase.from("newsletters").delete().eq("id", nl.id);
    if (error) {
      alert("Erreur : " + error.message);
      return;
    }
    load();
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Date inconnue";
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-d-bg">
      {/* Header */}
      <header
        className="bg-d-panel border-b px-6 py-0 border-line"
        style={{ height: 64, display: "flex", alignItems: "center" }}
      >
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
          <Wordmark size={18} />

          <div className="flex items-center gap-3">
            {profile?.is_admin && (
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-2 px-3 py-1.5 border border-line2 text-d-fg2 text-[11px] uppercase tracking-[0.18em] font-medium rounded-full hover:bg-d-panel2 transition-colors"
              >
                <Settings size={12} />
                Admin
              </button>
            )}
            <div
              className="text-xs text-d-fg3 px-3 font-dm"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {profile?.full_name || profile?.email}
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-3 py-1.5 border border-line2 text-d-fg2 text-[11px] uppercase tracking-[0.18em] font-medium rounded-full hover:bg-d-panel2 transition-colors"
            >
              <LogOut size={12} />
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1
              className="text-d-fg font-bold text-3xl tracking-tight mb-1"
              style={{ fontFamily: "'Sora', sans-serif", letterSpacing: "-0.02em" }}
            >
              Mes newsletters
            </h1>
            <p className="text-sm text-d-fg3">
              {loading
                ? "Chargement…"
                : `${newsletters.length} newsletter${newsletters.length > 1 ? "s" : ""}`}
            </p>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 px-5 py-2.5 text-[12px] uppercase tracking-[0.18em] font-semibold rounded-full transition-colors disabled:opacity-50"
            style={{ background: "#FFFFFF", color: "#15151A" }}
          >
            <Plus size={14} />
            Nouvelle newsletter
          </button>
        </div>

        {!loading && newsletters.length === 0 && (
          <div
            className="border rounded-2xl p-14 text-center border-line"
            style={{ background: "transparent", borderStyle: "dashed" }}
          >
            <FileText className="text-d-fg4 mx-auto mb-4" size={36} />
            <div className="text-sm text-d-fg2 mb-1 font-medium">
              Aucune newsletter pour l'instant
            </div>
            <div className="text-xs text-d-fg3">
              Clique sur « Nouvelle newsletter » pour démarrer.
            </div>
          </div>
        )}

        {newsletters.length > 0 && (
          <div
            className="bg-d-panel rounded-2xl overflow-hidden border border-line"
          >
            {newsletters.map((nl, i, arr) => {
              const lock = locks[nl.id];
              const lockedByOther = lock && lock.user_id !== profile?.id;
              return (
                <div key={nl.id}>
                  <div className="flex items-center gap-4 px-5 py-4 hover:bg-d-panel2 transition-colors group">
                    {/* Icon */}
                    <div
                      className="flex-shrink-0 w-11 h-11 rounded-xl bg-d-panel2 border border-line flex items-center justify-center"
                    >
                      <FileText size={18} className="text-d-fg3" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          onClick={() => onOpen(nl.id)}
                          className="text-sm font-semibold text-d-fg hover:text-white truncate text-left transition-colors"
                          style={{ fontFamily: "'Sora', sans-serif" }}
                        >
                          {nl.title || "Newsletter sans titre"}
                        </button>
                        {lockedByOther && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(255,75,40,0.12)", color: "#FF8466" }}
                          >
                            <Lock size={10} />
                            {lock.user_full_name || lock.user_email}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-d-fg3">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {formatDate(nl.updated_at)}
                        </span>
                        {nl.issue_number && (
                          <span className="text-d-fg4">N° {nl.issue_number}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDuplicate(nl)}
                        className="p-2 text-d-fg4 hover:text-d-fg2 hover:bg-d-panel3 rounded-lg transition-colors"
                        title="Dupliquer"
                      >
                        <Copy size={14} />
                      </button>
                      {profile?.is_admin && (
                        <button
                          onClick={() => handleDelete(nl)}
                          className="p-2 text-d-fg4 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => onOpen(nl.id)}
                      className="p-2 text-d-fg4 hover:text-d-fg2 transition-colors"
                      title="Ouvrir"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="h-px mx-5 border-line" style={{ background: "var(--d-line)" }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
