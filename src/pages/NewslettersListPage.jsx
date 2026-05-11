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

export function NewslettersListPage({ onOpen, onOpenAdmin }) {
  const { profile, signOut } = useAuth();
  const [newsletters, setNewsletters] = useState([]);
  const [locks, setLocks] = useState({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: nls }, { data: lks }] = await Promise.all([
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
    setNewsletters(nls || []);
    const map = {};
    (lks || []).forEach((l) => {
      map[l.newsletter_id] = l;
    });
    setLocks(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    // Rafraîchit toutes les 20s pour refléter les nouveaux locks
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const handleCreate = async () => {
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
    if (!profile.is_admin) {
      alert("Seuls les administrateurs peuvent supprimer une newsletter.");
      return;
    }
    if (!confirm(`Supprimer définitivement « ${nl.title} » ?`)) return;
    const { error } = await supabase.from("newsletters").delete().eq("id", nl.id);
    if (error) {
      alert("Erreur : " + error.message);
      return;
    }
    load();
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-medium">
              Coinhouse
            </div>
            <h1 className="text-lg font-semibold text-stone-900">
              Éditeur de newsletter
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {profile.is_admin && (
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-2 px-3 py-2 border border-stone-300 hover:border-stone-500 text-stone-700 text-[10px] uppercase tracking-[0.18em] font-medium rounded-sm transition-colors"
              >
                <Settings size={12} />
                Admin
              </button>
            )}
            <div className="text-xs text-stone-500 px-3">
              {profile.full_name || profile.email}
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-3 py-2 border border-stone-300 hover:border-stone-500 text-stone-700 text-[10px] uppercase tracking-[0.18em] font-medium rounded-sm transition-colors"
            >
              <LogOut size={12} />
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="text-xs text-stone-500">
            {loading
              ? "Chargement…"
              : `${newsletters.length} newsletter${
                  newsletters.length > 1 ? "s" : ""
                }`}
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="bg-stone-900 hover:bg-stone-700 text-white text-xs uppercase tracking-[0.18em] font-medium px-4 py-2.5 rounded-sm transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Plus size={14} />
            Nouvelle newsletter
          </button>
        </div>

        {!loading && newsletters.length === 0 && (
          <div className="bg-white border border-dashed border-stone-300 rounded-sm p-12 text-center">
            <FileText className="text-stone-300 mx-auto mb-3" size={36} />
            <div className="text-sm text-stone-600 mb-1">
              Aucune newsletter pour l'instant
            </div>
            <div className="text-xs text-stone-400">
              Clique sur « Nouvelle newsletter » pour démarrer.
            </div>
          </div>
        )}

        {newsletters.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-sm divide-y divide-stone-100">
            {newsletters.map((nl) => {
              const lock = locks[nl.id];
              const lockedByOther = lock && lock.user_id !== profile.id;
              return (
                <div
                  key={nl.id}
                  className="flex items-center gap-4 px-4 py-4 hover:bg-stone-50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        onClick={() => onOpen(nl.id)}
                        className="text-sm font-medium text-stone-900 hover:underline truncate text-left"
                      >
                        {nl.title}
                      </button>
                      {lockedByOther && (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded-sm">
                          <Lock size={10} />
                          {lock.user_full_name || lock.user_email}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-stone-500">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {formatDate(nl.updated_at)}
                      </span>
                      {nl.issue_number && (
                        <span>N° {nl.issue_number}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDuplicate(nl)}
                      className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-sm"
                      title="Dupliquer"
                    >
                      <Copy size={14} />
                    </button>
                    {profile.is_admin && (
                      <button
                        onClick={() => handleDelete(nl)}
                        className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-sm"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => onOpen(nl.id)}
                    className="p-2 text-stone-400 hover:text-stone-700"
                    title="Ouvrir"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
