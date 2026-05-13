// ─────────────────────────────────────────────────────────────────────────────
// NewslettersListPage — page d'accueil avec liste de toutes les newsletters
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Plus,
  FileText,
  ImageIcon,
  Copy,
  Trash2,
  Lock,
  Clock,
  User,
  LogOut,
  Settings,
  ChevronRight,
  Search,
  X,
  ArrowUpDown,
} from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { INITIAL_STATE, getDefaultNewsletterTemplate, buildInitialStateFromTypes } from "../config/schema.js";
import { Wordmark } from "../components/Wordmark.jsx";
import { ImageManagerModal } from "../components/ImageManagerModal.jsx";
import { Tooltip } from "../components/Tooltip.jsx";

export function NewslettersListPage({ onOpen, onOpenAdmin }) {
  const { profile, signOut } = useAuth();
  const [newsletters, setNewsletters] = useState([]);
  const [locks, setLocks] = useState({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createChoiceOpen, setCreateChoiceOpen] = useState(false);
  const [imageManagerOpen, setImageManagerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("updated_desc");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: nls, error: nlsError }, { data: lks, error: locksError }] =
        await Promise.all([
          supabase
            .from("newsletters")
            .select(
              "id, title, current_state, updated_at, updated_by, archived, created_by, creator:profiles!newsletters_created_by_fkey(full_name, email)"
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

  const handleCreate = async (mode = "template") => {
    if (!profile?.id) return;
    setCreating(true);
    const initialState =
      mode === "blank"
        ? { ...INITIAL_STATE, sections: [] }
        : (() => {
            const template = getDefaultNewsletterTemplate();
            return buildInitialStateFromTypes(template.sections, {
              includeDefaultContent: template.includeDefaultContent,
            });
          })();
    const { data, error } = await supabase
      .from("newsletters")
      .insert({
        title: `Décrypto N°${INITIAL_STATE.issue_number}`,
        issue_number: INITIAL_STATE.issue_number,
        current_state: initialState,
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
    setCreateChoiceOpen(false);
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

  const getPreviewText = (nl) => {
    const text = nl?.current_state?.preview_text || "";
    const normalized = String(text)
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return normalized || "Aucun texte de prévisualisation";
  };

  const getCreatorName = (nl) =>
    nl?.creator?.full_name || nl?.creator?.email || "Créateur inconnu";

  const normalize = (s) =>
    String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  const filteredNewsletters = useMemo(() => {
    const q = normalize(search);
    let list = q
      ? newsletters.filter(
          (nl) =>
            normalize(nl.title).includes(q) ||
            normalize(getPreviewText(nl)).includes(q)
        )
      : [...newsletters];

    if (sortBy === "updated_asc") list.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));
    else if (sortBy === "updated_desc") list.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    else if (sortBy === "title_asc") list.sort((a, b) => normalize(a.title).localeCompare(normalize(b.title)));
    else if (sortBy === "title_desc") list.sort((a, b) => normalize(b.title).localeCompare(normalize(a.title)));

    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newsletters, search, sortBy]);

  return (
    <div className="min-h-screen bg-d-bg">
      {/* Header */}
      <header
        className="border-b border-line bg-d-panel px-4 py-3 sm:px-6"
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Wordmark size={18} />

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:justify-end sm:overflow-visible sm:pb-0">
            {profile?.is_admin && (
              <button
                onClick={onOpenAdmin}
                className="flex flex-shrink-0 items-center gap-2 rounded-full border border-line2 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-d-fg2 font-medium transition-colors hover:bg-d-panel2"
              >
                <Settings size={12} />
                Admin
              </button>
            )}
            <button
              onClick={() => setImageManagerOpen(true)}
              className="flex flex-shrink-0 items-center gap-2 rounded-full border border-line2 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-d-fg2 font-medium transition-colors hover:bg-d-panel2"
            >
              <ImageIcon size={12} />
              Images
            </button>
            <div
              className="hidden max-w-[180px] truncate px-2 text-xs text-d-fg3 font-dm md:block"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {profile?.full_name || profile?.email}
            </div>
            <button
              onClick={signOut}
              className="flex flex-shrink-0 items-center gap-2 rounded-full border border-line2 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-d-fg2 font-medium transition-colors hover:bg-d-panel2"
            >
              <LogOut size={12} />
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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
                : filteredNewsletters.length === newsletters.length
                  ? `${newsletters.length} newsletter${newsletters.length > 1 ? "s" : ""}`
                  : `${filteredNewsletters.length} / ${newsletters.length} newsletter${newsletters.length > 1 ? "s" : ""}`}
            </p>
          </div>
          <button
            onClick={() => setCreateChoiceOpen(true)}
            disabled={creating}
            className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[12px] uppercase tracking-[0.18em] font-semibold transition-colors disabled:opacity-50 sm:w-auto"
            style={{ background: "#FFFFFF", color: "#15151A" }}
          >
            <Plus size={14} />
            Nouvelle newsletter
          </button>
        </div>

        {/* Barre recherche + tri */}
        {newsletters.length > 0 && (
          <div className="mb-5 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-d-fg4 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par titre ou texte de prévisualisation…"
                className="w-full pl-9 pr-8 py-2.5 bg-d-panel border border-line rounded-xl text-sm text-d-fg placeholder:text-d-fg4 focus:outline-none focus:border-line2 transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-d-fg4 hover:text-d-fg2 transition-colors"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <div className="relative">
              <ArrowUpDown size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-d-fg4 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="pl-8 pr-4 py-2.5 bg-d-panel border border-line rounded-xl text-sm text-d-fg focus:outline-none focus:border-line2 transition-colors appearance-none cursor-pointer"
              >
                <option value="updated_desc">Plus récent</option>
                <option value="updated_asc">Plus ancien</option>
                <option value="title_asc">Titre A → Z</option>
                <option value="title_desc">Titre Z → A</option>
              </select>
            </div>
          </div>
        )}

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

        {!loading && newsletters.length > 0 && filteredNewsletters.length === 0 && (
          <div
            className="border rounded-2xl p-12 text-center border-line"
            style={{ background: "transparent", borderStyle: "dashed" }}
          >
            <Search className="text-d-fg4 mx-auto mb-3" size={28} />
            <div className="text-sm text-d-fg2 mb-1 font-medium">Aucun résultat</div>
            <div className="text-xs text-d-fg3">
              Aucune newsletter ne correspond à « {search} ».
            </div>
          </div>
        )}

        {filteredNewsletters.length > 0 && (
          <div
            className="bg-d-panel rounded-2xl overflow-hidden border border-line"
          >
            {filteredNewsletters.map((nl, i, arr) => {
              const lock = locks[nl.id];
              const lockedByOther = lock && lock.user_id !== profile?.id;
              return (
                <div key={nl.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpen(nl.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onOpen(nl.id);
                      }
                    }}
                    className="group flex cursor-pointer items-start gap-3 px-4 py-4 transition-colors hover:bg-d-panel2 focus:bg-d-panel2 focus:outline-none sm:items-center sm:gap-4 sm:px-5"
                  >
                    {/* Icon */}
                    <div
                      className="flex-shrink-0 w-11 h-11 rounded-xl bg-d-panel2 border border-line flex items-center justify-center"
                    >
                      <FileText size={18} className="text-d-fg3" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="mb-1 flex min-w-0 flex-wrap items-center gap-2">
                        <div
                          className="text-sm font-semibold text-d-fg truncate text-left"
                          style={{ fontFamily: "'Sora', sans-serif" }}
                        >
                          {nl.title || "Newsletter sans titre"}
                        </div>
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
                      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-d-fg3">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {formatDate(nl.updated_at)}
                        </span>
                        <span className="flex items-center gap-1 min-w-0">
                          <User size={11} />
                          <span className="truncate">{getCreatorName(nl)}</span>
                        </span>
                        <span className="text-d-fg4 truncate">
                          {getPreviewText(nl)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                      <Tooltip label="Dupliquer" side="bottom" align="left">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDuplicate(nl);
                          }}
                          className="p-2 text-d-fg4 hover:text-d-fg2 hover:bg-d-panel3 rounded-lg transition-colors"
                        >
                          <Copy size={14} />
                        </button>
                      </Tooltip>
                      {profile?.is_admin && (
                        <Tooltip label="Supprimer" side="bottom" align="left">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDelete(nl);
                            }}
                            className="p-2 text-d-fg4 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </Tooltip>
                      )}
                    </div>

                    <div className="hidden p-2 text-d-fg4 transition-colors group-hover:text-d-fg2 sm:block">
                      <ChevronRight size={16} />
                    </div>
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
      {createChoiceOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-d-panel shadow-2xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-d-blue via-d-pink to-d-green" />
            <div className="p-6 border-b border-line flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-d-pink font-semibold mb-2">
                  Nouvelle newsletter
                </div>
                <h2
                  className="text-xl font-semibold text-d-fg tracking-tight"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  Choisir un point de départ
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCreateChoiceOpen(false)}
                disabled={creating}
                className="h-8 w-8 inline-flex items-center justify-center text-d-fg4 hover:text-d-fg2 hover:bg-d-panel2 rounded-lg transition-colors disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-6">
              <button
                type="button"
                onClick={() => handleCreate("template")}
                disabled={creating}
                className="text-left rounded-2xl border border-line bg-d-panel2 p-5 hover:border-line2 hover:bg-d-panel3 transition-colors disabled:opacity-50"
              >
                <FileText size={18} className="text-d-pink mb-4" />
                <div className="text-sm font-semibold text-d-fg mb-2" style={{ fontFamily: "'Sora', sans-serif" }}>
                  Version par défaut
                </div>
                <div className="text-xs leading-relaxed text-d-fg4">
                  Crée la newsletter avec les blocs du template admin, selon le réglage de contenu par défaut.
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleCreate("blank")}
                disabled={creating}
                className="text-left rounded-2xl border border-line bg-d-panel2 p-5 hover:border-line2 hover:bg-d-panel3 transition-colors disabled:opacity-50"
              >
                <Plus size={18} className="text-d-green mb-4" />
                <div className="text-sm font-semibold text-d-fg mb-2" style={{ fontFamily: "'Sora', sans-serif" }}>
                  Version vide
                </div>
                <div className="text-xs leading-relaxed text-d-fg4">
                  Crée une newsletter sans blocs placés. Tu pourras composer la structure depuis l'éditeur.
                </div>
              </button>
            </div>
            {creating && (
              <div className="px-6 pb-6 text-xs uppercase tracking-[0.18em] text-d-fg3 flex items-center gap-2">
                <Clock size={13} className="animate-spin" />
                Création…
              </div>
            )}
          </div>
        </div>
      )}
      {imageManagerOpen && (
        <ImageManagerModal
          onClose={() => setImageManagerOpen(false)}
          userId={profile?.id}
        />
      )}
    </div>
  );
}
