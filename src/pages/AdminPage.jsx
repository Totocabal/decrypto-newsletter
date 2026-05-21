// ─────────────────────────────────────────────────────────────────────────────
// AdminPage — gestion des comptes (approbation, droits admin)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  Loader2,
  Lock,
  LockOpen,
  Megaphone,
  Newspaper,
  List,
  TrendingUp,
  Gauge,
  Grid2X2,
  Hash,
  Activity,
  Quote,
  BarChart2,
  Calendar,
  Type,
  ImageIcon,
  Minus,
  Palette,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Tag,
  Users,
  LayoutTemplate,
  UserPlus,
  X,
  FileEdit,
} from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useToast, useConfirm, usePrompt } from "../components/Dialog.jsx";
import { useLabels, createLabel, updateLabel, deleteLabel, LABEL_COLORS } from "../lib/useLabels.js";
import {
  createTemplatePreset,
  deleteTemplatePreset,
  listTemplatePresets,
  updateTemplatePreset,
} from "../lib/templatePresets.js";
import { Wordmark } from "../components/Wordmark.jsx";
import { SectionEditor } from "../components/SectionEditor.jsx";
import {
  SECTION_TYPES,
  INITIAL_SECTION_TEMPLATE,
  createDefaultSectionTemplateEntry,
  getDefaultNewsletterTemplate,
  saveDefaultSectionTypes,
  getDefaultSectionData,
  saveDefaultSectionOverride,
  resetDefaultSectionOverride,
  getAllDefaultSectionOverrides,
  UNNUMBERED_TYPES,
} from "../config/schema.js";

function generateTemporaryPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!#$%?";
  const bytes = new Uint32Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
}

function getAdminCreateErrorMessage(error) {
  const message = error?.message || String(error || "");
  if (/function .*admin_create_user.* does not exist|schema cache/i.test(message)) {
    return "La fonction Supabase admin_create_user n'est pas encore installée. Exécute supabase/admin-create-user.sql dans le SQL Editor, puis réessaie.";
  }
  return message;
}

function formatLastLogin(value) {
  if (!value) return "Jamais connecté";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminPage({ onBack }) {
  const { profile: currentProfile } = useAuth();
  const addToast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState("accounts");
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    fullName: "",
    isAdmin: false,
  });
  const [createdAccount, setCreatedAccount] = useState(null);
  const [locks, setLocks] = useState([]);
  const [locksLoading, setLocksLoading] = useState(false);
  const [accountsSort, setAccountsSort] = useState("name"); // "name" | "last_login"
  const [accountsSearch, setAccountsSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setProfiles(data || []);
    setLoading(false);
  }, []);

  const loadLocks = useCallback(async () => {
    setLocksLoading(true);
    const { data } = await supabase
      .from("locks")
      .select("newsletter_id, user_full_name, user_email, acquired_at, expires_at, newsletters(title)")
      .order("acquired_at", { ascending: false });
    setLocks(data || []);
    setLocksLoading(false);
  }, []);

  useEffect(() => {
    load();
    loadLocks();
  }, [load, loadLocks]);

  const releaseLock = async (newsletterId) => {
    const { error } = await supabase.from("locks").delete().eq("newsletter_id", newsletterId);
    if (error) {
      addToast("Erreur : " + error.message);
      return;
    }
    loadLocks();
  };

  const releaseAllLocks = async () => {
    const count = locks.length;
    if (!count) return;
    const ok = await confirm(
      `Déverrouiller tous les templates actuellement verrouillés (${count}) ?`,
      { danger: true, confirmLabel: "Tout déverrouiller" }
    );
    if (!ok) return;
    setLocksLoading(true);
    const { error } = await supabase.from("locks").delete().neq("newsletter_id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      addToast("Erreur : " + error.message);
      setLocksLoading(false);
      return;
    }
    addToast(`${count} verrou${count > 1 ? "s" : ""} libéré${count > 1 ? "s" : ""}.`, "success");
    await loadLocks();
  };

  const updateProfile = async (id, patch) => {
    const { error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", id);
    if (error) {
      addToast("Erreur : " + error.message);
      return;
    }
    load();
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    const email = createForm.email.trim().toLowerCase();
    if (!email) return;

    const password = generateTemporaryPassword();
    setCreating(true);
    setCreatedAccount(null);

    const { data, error } = await supabase.rpc("admin_create_user", {
      p_email: email,
      p_password: password,
      p_full_name: createForm.fullName.trim() || null,
      p_approved: true,
      p_is_admin: createForm.isAdmin,
    });

    setCreating(false);

    if (error) {
      addToast("Erreur : " + getAdminCreateErrorMessage(error));
      return;
    }

    setCreatedAccount({
      email: data?.email || email,
      password,
      fullName: data?.full_name || createForm.fullName.trim(),
    });
    setCreateForm({ email: "", fullName: "", isAdmin: false });
    load();
  };

  const copyCreatedAccount = async () => {
    if (!createdAccount) return;
    const text = [
      `Email : ${createdAccount.email}`,
      `Mot de passe temporaire : ${createdAccount.password}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard can be blocked; the password remains visible.
    }
  };

  const filteredAndSortedProfiles = [...profiles]
    .filter((p) => {
      const search = accountsSearch.trim().toLowerCase();
      if (!search) return true;
      const name = (p.full_name || "").toLowerCase();
      const email = (p.email || "").toLowerCase();
      return name.includes(search) || email.includes(search);
    })
    .sort((a, b) => {
      if (accountsSort === "name") {
        const nameA = (a.full_name || a.email || "").toLowerCase();
        const nameB = (b.full_name || b.email || "").toLowerCase();
        return nameA.localeCompare(nameB, "fr", { sensitivity: "base" });
      } else {
        const dateA = a.last_login_at ? new Date(a.last_login_at).getTime() : 0;
        const dateB = b.last_login_at ? new Date(b.last_login_at).getTime() : 0;
        if (dateB !== dateA) {
          return dateB - dateA;
        }
        const nameA = (a.full_name || a.email || "").toLowerCase();
        const nameB = (b.full_name || b.email || "").toLowerCase();
        return nameA.localeCompare(nameB, "fr", { sensitivity: "base" });
      }
    });

  const pending = filteredAndSortedProfiles.filter((p) => !p.approved);
  const approved = filteredAndSortedProfiles.filter((p) => p.approved);

  const tabs = [
    { id: "accounts", label: "Gestion des comptes", icon: Users },
    { id: "template", label: "Template newsletter", icon: LayoutTemplate },
    { id: "labels", label: "Labels", icon: Tag },
  ];

  return (
    <div className="min-h-screen bg-d-bg">
      <header
        className="border-b border-line px-4 sm:px-6"
        style={{ background: "rgb(var(--d-panel))", height: "52px" }}
      >
        <div className="flex h-full items-center gap-3 sm:gap-4">
          <button type="button" onClick={onBack} className="shrink-0 opacity-90 hover:opacity-100 transition-opacity">
            <Wordmark size={18} />
          </button>
          <div className="hidden h-5 w-px sm:block" style={{ background: "var(--d-line2)", flexShrink: 0 }} />
          <button
            onClick={onBack}
            className="flex shrink-0 items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-medium text-d-fg3 hover:text-d-fg px-3 py-1.5 border border-line hover:border-line2 rounded-full transition-colors"
          >
            <ArrowLeft size={12} />
            Retour
          </button>
          <div className="hidden text-[10px] uppercase tracking-[0.18em] text-d-fg4 font-medium sm:block">
            Administration
          </div>

          {/* Onglets */}
          <div className="ml-auto flex shrink-0 items-center rounded-full border border-line bg-d-panel2 p-0.5">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 sm:px-3 text-[11px] uppercase tracking-[0.14em] font-semibold transition-colors ${
                  tab === id
                    ? "bg-white text-[#15151A]"
                    : "text-d-fg3 hover:text-d-fg2"
                }`}
              >
                <Icon size={12} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="w-full min-w-0 p-4 sm:p-6">
        {/* ── Onglet Gestion des comptes ── */}
        <div className={`space-y-6 ${tab !== "accounts" ? "hidden" : ""}`}>
            {loading && (
              <div className="text-xs text-d-fg4 text-center p-8 flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Chargement…
              </div>
            )}

            {/* Création */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-[10px] uppercase tracking-[0.18em] text-d-fg3 font-medium">
                  Créer un compte
                </h2>
              </div>
              <div className="bg-d-panel border border-line rounded-2xl p-4">
                <form
                  onSubmit={handleCreateAccount}
                  className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end"
                >
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.18em] text-d-fg3 font-medium block mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={createForm.email}
                      onChange={(e) =>
                        setCreateForm((form) => ({ ...form, email: e.target.value }))
                      }
                      placeholder="prenom.nom@coinhouse.com"
                      className="w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-line2 bg-d-panel2 text-d-fg placeholder:text-d-fg4 transition-colors"
                      disabled={creating}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.18em] text-d-fg3 font-medium block mb-2">
                      Nom
                    </label>
                    <input
                      type="text"
                      value={createForm.fullName}
                      onChange={(e) =>
                        setCreateForm((form) => ({ ...form, fullName: e.target.value }))
                      }
                      placeholder="Nom affiché"
                      className="w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-line2 bg-d-panel2 text-d-fg placeholder:text-d-fg4 transition-colors"
                      disabled={creating}
                    />
                  </div>
                  <div className="flex items-center gap-3 px-2 py-2.5 whitespace-nowrap">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={createForm.isAdmin}
                      disabled={creating}
                      onClick={() => setCreateForm((form) => ({ ...form, isAdmin: !form.isAdmin }))}
                      className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50"
                      style={{ background: createForm.isAdmin ? "#03FFCF" : "#3a3a3a" }}
                    >
                      <span
                        className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform"
                        style={{ transform: createForm.isAdmin ? "translateX(18px)" : "translateX(3px)" }}
                      />
                    </button>
                    <span className="text-xs text-d-fg2">Admin</span>
                  </div>
                  <button
                    type="submit"
                    disabled={creating || !createForm.email.trim()}
                    className={`flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] transition-all duration-200 ${
                      creating || !createForm.email.trim()
                        ? "bg-d-panel2 text-d-fg4 border border-line cursor-not-allowed opacity-40"
                        : "bg-[#FF00AA] text-white shadow-md shadow-pink-950/10 hover:bg-[#E60098] hover:shadow-pink-950/25 active:scale-[0.98]"
                    }`}
                  >
                    {creating ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <UserPlus size={12} />
                    )}
                    Créer un compte
                  </button>
                </form>

                {createdAccount && (
                  <div
                    className="mt-4 rounded-xl p-4"
                    style={{ background: "rgba(3,255,207,0.08)", border: "1px solid rgba(3,255,207,0.20)" }}
                  >
                    <div className="text-sm font-semibold mb-2" style={{ color: "#03FFCF" }}>
                      Compte créé
                    </div>
                    <div className="grid gap-1 text-xs text-d-fg2 font-mono">
                      <div>Email : {createdAccount.email}</div>
                      <div>Mot de passe temporaire : {createdAccount.password}</div>
                    </div>
                    <button
                      type="button"
                      onClick={copyCreatedAccount}
                      className="mt-3 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-medium text-d-fg3 hover:text-d-fg border border-line hover:border-line2 px-3 py-1.5 rounded-full transition-colors"
                    >
                      <Copy size={11} />
                      Copier les identifiants
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* Recherche & Tri */}
            <section className="bg-d-panel border border-line rounded-2xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-d-fg4" />
                <input
                  type="text"
                  placeholder="Rechercher un compte..."
                  value={accountsSearch}
                  onChange={(e) => setAccountsSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 border border-line rounded-xl text-xs focus:outline-none focus:border-line2 bg-d-panel2 text-d-fg placeholder:text-d-fg4 transition-colors"
                />
                {accountsSearch && (
                  <button
                    type="button"
                    onClick={() => setAccountsSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-d-fg4 hover:text-d-fg transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-3">
                <span className="text-[10px] uppercase tracking-[0.18em] text-d-fg4 font-semibold whitespace-nowrap">
                  Trier par :
                </span>
                <div className="flex items-center rounded-full border border-line bg-d-panel2 p-0.5">
                  <button
                    type="button"
                    onClick={() => setAccountsSort("name")}
                    className={`rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] font-semibold transition-colors ${
                      accountsSort === "name"
                        ? "bg-white text-[#15151A]"
                        : "text-d-fg3 hover:text-d-fg2"
                    }`}
                  >
                    Nom
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountsSort("last_login")}
                    className={`rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] font-semibold transition-colors ${
                      accountsSort === "last_login"
                        ? "bg-white text-[#15151A]"
                        : "text-d-fg3 hover:text-d-fg2"
                    }`}
                  >
                    Connexion
                  </button>
                </div>
              </div>
            </section>

            {/* En attente d'approbation */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-[10px] uppercase tracking-[0.18em] text-d-fg3 font-medium">
                  Comptes en attente d'approbation
                </h2>
                <span className="text-[10px] bg-d-panel2 text-d-fg3 px-2 py-0.5 rounded-full font-medium border border-line">
                  {pending.length}
                </span>
              </div>
              <div className="bg-d-panel border border-line rounded-2xl divide-y" style={{ borderColor: "var(--d-line)" }}>
                {pending.length === 0 ? (
                  <div className="flex items-center gap-2 p-4 text-xs text-d-fg4">
                    Aucun compte en attente.
                  </div>
                ) : (
                  pending.map((p) => (
                    <div key={p.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="text-sm text-d-fg">{p.full_name || p.email}</span>
                          {p.auth_provider === 'google' && (
                            <span
                              className="inline-flex items-center text-[10px] uppercase tracking-[0.14em] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: "rgba(66,133,244,0.15)", color: "#4285F4" }}
                            >
                              Google
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-d-fg4">{p.email}</div>
                        <div className="mt-0.5 text-[11px] text-d-fg4">
                          Dernière connexion : {formatLastLogin(p.last_login_at)}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 sm:justify-end">
                        <button
                          onClick={() => updateProfile(p.id, { approved: true })}
                          className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold px-3 py-1.5 rounded-full transition-colors"
                          style={{ background: "#03FFCF", color: "#15151A" }}
                        >
                          Approuver
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Approuvés */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-[10px] uppercase tracking-[0.18em] text-d-fg3 font-medium">
                  Comptes approuvés
                </h2>
                <span className="text-[10px] bg-d-panel2 text-d-fg3 px-2 py-0.5 rounded-full font-medium border border-line">
                  {approved.length}
                </span>
              </div>
              <div className="bg-d-panel border border-line rounded-2xl divide-y" style={{ borderColor: "var(--d-line)" }}>
                {approved.map((p) => {
                  const isSelf = p.id === currentProfile?.id;
                  return (
                    <div key={p.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="text-sm text-d-fg">{p.full_name || p.email}</span>
                          {p.is_admin && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: "rgba(65,65,255,0.18)", color: "#8888FF" }}
                            >
                              <ShieldCheck size={10} />
                              Admin
                            </span>
                          )}
                          {isSelf && (
                            <span className="text-[10px] uppercase tracking-[0.14em] font-medium text-d-fg4">
                              (toi)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-d-fg4">{p.email}</div>
                        <div className="mt-0.5 text-[11px] text-d-fg4">
                          Dernière connexion : {formatLastLogin(p.last_login_at)}
                        </div>
                      </div>
                      {!isSelf && (
                        <div className="flex flex-wrap items-center gap-1 sm:justify-end">
                          <button
                            onClick={() => updateProfile(p.id, { is_admin: !p.is_admin })}
                            className="text-[10px] uppercase tracking-[0.18em] font-medium text-d-fg3 hover:text-d-fg px-3 py-1.5 border border-line hover:border-line2 rounded-full transition-colors"
                          >
                            {p.is_admin ? "Retirer admin" : "Promouvoir admin"}
                          </button>
                          <button
                            onClick={async () => {
                              if (await confirm(`Révoquer l'accès de ${p.email} ?`, { danger: true, confirmLabel: "Révoquer" }))
                                updateProfile(p.id, { approved: false, is_admin: false });
                            }}
                            className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-medium px-3 py-1.5 border rounded-full transition-colors"
                            style={{ color: "#FF8466", borderColor: "rgba(255,75,40,0.25)" }}
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

            {/* Verrous actifs */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-[10px] uppercase tracking-[0.18em] text-d-fg3 font-medium">
                  Verrous actifs
                </h2>
                {locks.length > 0 && (
                  <span className="text-[10px] bg-d-panel2 text-d-fg3 px-2 py-0.5 rounded-full font-medium border border-line">
                    {locks.length}
                  </span>
                )}
                <button
                  type="button"
                  onClick={loadLocks}
                  disabled={locksLoading}
                  className="ml-auto flex items-center gap-1 text-[10px] text-d-fg4 hover:text-d-fg transition-colors"
                >
                  <RefreshCw size={11} className={locksLoading ? "animate-spin" : ""} />
                  Rafraîchir
                </button>
                {locks.length > 0 && (
                  <button
                    type="button"
                    onClick={releaseAllLocks}
                    disabled={locksLoading}
                    className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ color: "#FF8466", borderColor: "rgba(255,75,40,0.28)" }}
                  >
                    <LockOpen size={11} />
                    Tout déverrouiller
                  </button>
                )}
              </div>
              <div className="bg-d-panel border border-line rounded-2xl overflow-hidden">
                {locksLoading ? (
                  <div className="flex items-center justify-center gap-2 p-6 text-xs text-d-fg4">
                    <Loader2 size={13} className="animate-spin" />
                    Chargement…
                  </div>
                ) : locks.length === 0 ? (
                  <div className="flex items-center gap-2 p-4 text-xs text-d-fg4">
                    <LockOpen size={13} />
                    Aucun verrou actif.
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: "var(--d-line)" }}>
                    {locks.map((lock) => {
                      const isExpired = new Date(lock.expires_at) < new Date();
                      return (
                        <div key={lock.newsletter_id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <Lock size={12} className="shrink-0 text-d-fg4" />
                              <span className="text-sm text-d-fg truncate">
                                {lock.newsletters?.title || lock.newsletter_id}
                              </span>
                              {isExpired && (
                                <span
                                  className="text-[10px] uppercase tracking-[0.12em] font-semibold px-2 py-0.5 rounded-full"
                                  style={{ background: "rgba(255,75,40,0.12)", color: "#FF8466" }}
                                >
                                  Expiré
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-d-fg4 mt-0.5">
                              {lock.user_full_name || lock.user_email}
                              {lock.user_full_name && lock.user_email && ` · ${lock.user_email}`}
                              {" · "}
                              Expire {new Date(lock.expires_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              if (await confirm(`Forcer la libération du verrou sur "${lock.newsletters?.title || lock.newsletter_id}" ?`, { danger: true, confirmLabel: "Libérer" }))
                                releaseLock(lock.newsletter_id);
                            }}
                            className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-medium px-3 py-1.5 border rounded-full transition-colors shrink-0"
                            style={{ color: "#FF8466", borderColor: "rgba(255,75,40,0.25)" }}
                          >
                            <LockOpen size={11} />
                            Déverrouiller
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
        </div>

        {/* ── Onglet Template newsletter ── */}
        <div className={tab !== "template" ? "hidden" : ""}>
          <DefaultSectionsEditor currentProfile={currentProfile} active={tab === "template"} />
        </div>

        {/* ── Onglet Labels ── */}
        <div className={tab !== "labels" ? "hidden" : ""}>
          <LabelsEditor />
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DefaultSectionsEditor
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_ICON_MAP = {
  hero: Megaphone,
  index: List,
  edito: Newspaper,
  chart: TrendingUp,
  fear_greed: Gauge,
  signals: Activity,
  macro: Quote,
  macro_bars: BarChart2,
  commented_number: Hash,
  feature_grid: Grid2X2,
  editorial_list: List,
  event: Calendar,
  text_block: Type,
  focus: ImageIcon,
  image_block: ImageIcon,
  divider: Minus,
};

const SECTION_TYPE_DESCRIPTIONS = {
  hero: "En-tête complet avec titre, intro et indicateurs clés.",
  index: "Sommaire cliquable vers les sections de la newsletter.",
  edito: "Texte éditorial accompagné de KPI marché.",
  chart: "Graphique crypto manuel ou synchronisé CoinGecko.",
  fear_greed: "Jauge Fear & Greed avec commentaire.",
  signals: "Signaux haussiers et baissiers en grille.",
  macro: "Analyse macro avec citation mise en avant.",
  macro_bars: "Barres de données pour comparer des indicateurs.",
  commented_number: "Chiffre fort accompagné d'un commentaire éditorial.",
  feature_grid: "Grille 1 carte vedette + 4 cartes secondaires.",
  editorial_list: "Liste éditoriale numérotée avec tags de lecture.",
  event: "Annonce d'évènement avec informations et CTA.",
  text_block: "Bloc texte simple avec bouton optionnel.",
  focus: "Texte long, image et boutons optionnels.",
  image_block: "Image seule avec lien de redirection optionnel.",
  divider: "Séparateur visuel entre deux blocs.",
};

function SortableActiveItem({ entry, index, total, onMoveUp, onMoveDown, onToggleNumbering, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id });
  const type = entry.type;
  const Icon = SECTION_ICON_MAP[type] ?? Newspaper;
  const countsForNumbering = entry.counts_for_numbering ?? !UNNUMBERED_TYPES.has(type);
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
      }}
      className="grid grid-cols-[auto_38px_38px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-line bg-d-panel px-3 py-3 transition-all hover:border-line2"
    >
      <button
        type="button"
        {...listeners}
        {...attributes}
        style={{ touchAction: "none" }}
        className="cursor-grab active:cursor-grabbing text-d-fg4 hover:text-d-fg2 transition-colors p-2 sm:p-0 -m-2 sm:m-0 rounded"
      >
        <GripVertical size={15} />
      </button>
      <span className="font-mono text-xs font-semibold text-d-cyan">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-d-panel2 text-d-fg3">
        <Icon size={17} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-d-fg" style={{ fontFamily: "'Sora', sans-serif" }}>
          {SECTION_TYPES[type].label}
        </span>
        <span className="mt-0.5 block truncate text-xs text-d-fg4">
          {SECTION_TYPE_DESCRIPTIONS[type]}
        </span>
        <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-full border border-line bg-d-panel2 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-d-fg3 transition-colors hover:border-line2">
          <span className="relative inline-flex h-4 w-7 flex-shrink-0 items-center">
            <input
              type="checkbox"
              checked={countsForNumbering}
              onChange={(event) => onToggleNumbering(event.target.checked)}
              className="peer sr-only"
            />
            <span className="absolute inset-0 rounded-full border border-line bg-d-panel transition-colors peer-checked:border-d-pink peer-checked:bg-d-pink/25" />
            <span className="relative ml-0.5 h-3 w-3 rounded-full bg-d-fg4 transition-transform peer-checked:translate-x-3 peer-checked:bg-d-pink" />
          </span>
          {countsForNumbering ? "Numéroté" : "Non numéroté"}
        </label>
      </span>
      <span className="flex items-center gap-1">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          className="rounded-md border border-line p-1 text-d-pink transition-colors hover:bg-d-pink/10 disabled:opacity-20"
          title="Monter"
        >
          <ChevronUp size={13} />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="rounded-md border border-line p-1 text-d-pink transition-colors hover:bg-d-pink/10 disabled:opacity-20"
          title="Descendre"
        >
          <ChevronDown size={13} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md border border-line p-1 text-d-fg4 transition-colors hover:bg-red-950/20 hover:text-red-300"
          title="Retirer"
        >
          <X size={13} />
        </button>
      </span>
    </div>
  );
}

function DefaultSectionsEditor({ currentProfile, active: editorVisible = true }) {
  const confirm = useConfirm();
  const prompt = usePrompt();
  const allTypes = Object.keys(SECTION_TYPES);
  const [blockSearch, setBlockSearch] = useState("");
  const [active, setActive] = useState(() => getDefaultNewsletterTemplate().sections);
  const [includeDefaultContent, setIncludeDefaultContent] = useState(
    () => getDefaultNewsletterTemplate().includeDefaultContent
  );
  const [showSectionNumbers, setShowSectionNumbers] = useState(
    () => getDefaultNewsletterTemplate().showSectionNumbers
  );
  const [showBlockSeparators, setShowBlockSeparators] = useState(
    () => getDefaultNewsletterTemplate().showBlockSeparators
  );
  const [themeVariant, setThemeVariant] = useState(
    () => getDefaultNewsletterTemplate().themeVariant
  );
  const [includeIssueDate, setIncludeIssueDate] = useState(
    () => getDefaultNewsletterTemplate().includeIssueDate
  );
  const [saved, setSaved] = useState(false);
  const [defaultContentOpen, setDefaultContentOpen] = useState(false);
  const [presets, setPresets] = useState([]);
  const [presetsLoading, setPresetsLoading] = useState(true);
  const [presetsError, setPresetsError] = useState(null);
  const [presetSaving, setPresetSaving] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState(null);
  const [presetSearch, setPresetSearch] = useState("");
  const [presetSort, setPresetSort] = useState("updated_desc");
  const [activeDragId, setActiveDragId] = useState(null);
  const [accessRequest, setAccessRequest] = useState(null);
  const [accessRequestVisible, setAccessRequestVisible] = useState(false);
  const activeListRef = useRef(null);
  const accessRequestTimer = useRef(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );
  const editingPreset = presets.find((preset) => preset.id === editingPresetId) || null;
  const editingTemplateKey = editingPresetId ? `preset:${editingPresetId}` : "default";
  const editingTemplateName = editingPreset?.name || "Template par défaut";
  const filteredTypes = allTypes.filter((type) =>
    SECTION_TYPES[type].label.toLowerCase().includes(blockSearch.trim().toLowerCase())
  );
  const filteredPresets = useMemo(() => {
    const query = presetSearch.trim().toLowerCase();
    const matches = presets.filter((preset) => {
      if (!query) return true;
      const haystack = [
        preset.name,
        preset.themeVariant === "light" ? "clair fond blanc light" : "sombre dark",
        preset.showBlockSeparators ? "filets séparateurs" : "sans filets sans séparateurs",
        preset.includeIssueDate ? "date daté" : "sans date",
        preset.showSectionNumbers ? "numérotation numéroté" : "sans numérotation",
      ].join(" ").toLowerCase();
      return haystack.includes(query);
    });
    return [...matches].sort((a, b) => {
      if (presetSort === "name_asc") return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
      if (presetSort === "name_desc") return b.name.localeCompare(a.name, "fr", { sensitivity: "base" });
      if (presetSort === "blocks_desc") return b.sections.length - a.sections.length || a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
      if (presetSort === "blocks_asc") return a.sections.length - b.sections.length || a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime() || 0;
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime() || 0;
      return dateB - dateA || a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
    });
  }, [presetSearch, presetSort, presets]);

  useEffect(() => {
    if (!editorVisible || !currentProfile?.id) return undefined;
    const channel = supabase.channel(`template-edit-intent:${editingTemplateKey}`, {
      config: { broadcast: { self: false } },
    });

    channel.on("broadcast", { event: "template-edit-intent" }, ({ payload }) => {
      if (!payload || payload.userId === currentProfile.id) return;
      setAccessRequest(payload);
      setAccessRequestVisible(true);
      if (accessRequestTimer.current) clearTimeout(accessRequestTimer.current);
      accessRequestTimer.current = setTimeout(() => {
        setAccessRequestVisible(false);
        setTimeout(() => setAccessRequest(null), 220);
      }, 5200);
    });

    channel.subscribe((status) => {
      if (status !== "SUBSCRIBED") return;
      void channel.send({
        type: "broadcast",
        event: "template-edit-intent",
        payload: {
          userId: currentProfile.id,
          name: currentProfile.full_name || currentProfile.email || "Un autre utilisateur",
          email: currentProfile.email || "",
          templateName: editingTemplateName,
          templateKey: editingTemplateKey,
          at: new Date().toISOString(),
        },
      });
    });

    return () => {
      if (accessRequestTimer.current) clearTimeout(accessRequestTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [currentProfile?.email, currentProfile?.full_name, currentProfile?.id, editingTemplateKey, editingTemplateName, editorVisible]);

  const loadPresets = useCallback(async () => {
    setPresetsLoading(true);
    setPresetsError(null);
    try {
      setPresets(await listTemplatePresets());
    } catch (error) {
      setPresets([]);
      setPresetsError(error.message || String(error));
    } finally {
      setPresetsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  const addBlock = (type) => {
    setActive((prev) => [...prev, createDefaultSectionTemplateEntry(type)]);
    setSaved(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const list = activeListRef.current;
        if (list) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
      });
    });
  };

  const clearBlocks = async () => {
    if (active.length && !await confirm("Vider tous les blocs de cette disposition ?", { danger: true, confirmLabel: "Vider" })) return;
    setActive([]);
    setSaved(false);
  };

  const removeBlock = (id) => {
    setActive((prev) => prev.filter((entry) => entry.id !== id));
    setSaved(false);
  };

  const updateBlockNumbering = (id, countsForNumbering) => {
    setActive((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, counts_for_numbering: countsForNumbering } : entry
      )
    );
    setSaved(false);
  };

  const moveBlock = (id, dir) => {
    setActive((prev) => {
      const index = prev.findIndex((entry) => entry.id === id);
      const nextIndex = index + dir;
      if (index === -1 || nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
    setSaved(false);
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveDragId(null);
    if (over && active.id !== over.id) {
      setActive((prev) => {
        const oldIdx = prev.findIndex((e) => e.id === active.id);
        const newIdx = prev.findIndex((e) => e.id === over.id);
        setSaved(false);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  const handleSaveDefault = () => {
    saveDefaultSectionTypes(active, includeDefaultContent, showSectionNumbers, showBlockSeparators, themeVariant, includeIssueDate);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSavePreset = async () => {
    if (!editingPreset) return;
    setPresetSaving(true);
    setPresetsError(null);
    try {
      const updated = await updateTemplatePreset(editingPreset.id, {
        sections: active,
        includeDefaultContent,
        showSectionNumbers,
        showBlockSeparators,
        themeVariant,
        includeIssueDate,
      });
      setPresets((items) =>
        items.map((item) => (item.id === updated.id ? updated : item))
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      setPresetsError(error.message || String(error));
    } finally {
      setPresetSaving(false);
    }
  };

  const handleCreatePreset = async () => {
    const name = await prompt("Nom du preset :", { title: "Créer un preset de template", confirmLabel: "Créer" });
    if (name === null) return;
    const cleanName = name.trim();
    if (!cleanName) return;
    setPresetSaving(true);
    setPresetsError(null);
    try {
      const preset = await createTemplatePreset({
        name: cleanName,
        sections: active,
        includeDefaultContent,
        showSectionNumbers,
        showBlockSeparators,
        themeVariant,
        includeIssueDate,
      });
      setPresets((items) =>
        [...items, preset].sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingPresetId(preset.id);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      setPresetsError(error.message || String(error));
    } finally {
      setPresetSaving(false);
    }
  };

  const handleLoadPreset = (preset) => {
    setActive(preset.sections);
    setIncludeDefaultContent(preset.includeDefaultContent);
    setShowSectionNumbers(preset.showSectionNumbers);
    setShowBlockSeparators(preset.showBlockSeparators);
    setThemeVariant(preset.themeVariant);
    setIncludeIssueDate(preset.includeIssueDate);
    setEditingPresetId(preset.id);
    setSaved(false);
  };

  const handleDeletePreset = async (preset) => {
    if (!await confirm(`Supprimer le preset « ${preset.name} » ?`, { danger: true, confirmLabel: "Supprimer" })) return;
    setPresetsError(null);
    try {
      await deleteTemplatePreset(preset.id);
      setPresets((items) => items.filter((item) => item.id !== preset.id));
      if (editingPresetId === preset.id) setEditingPresetId(null);
    } catch (error) {
      setPresetsError(error.message || String(error));
    }
  };

  const handleReset = () => {
    setActive(INITIAL_SECTION_TEMPLATE.map((entry) => ({ ...entry })));
    setIncludeDefaultContent(true);
    setShowSectionNumbers(true);
    setShowBlockSeparators(true);
    setThemeVariant("dark");
    setIncludeIssueDate(true);
    setEditingPresetId(null);
    setSaved(false);
  };

  return (
    <section>
      {accessRequest && (
        <div
          className={`fixed left-1/2 top-4 z-[80] w-[calc(100vw-32px)] max-w-xl -translate-x-1/2 rounded-2xl border border-d-pink/30 bg-[#221525]/95 px-4 py-3 shadow-2xl backdrop-blur transition-all duration-200 ${
            accessRequestVisible ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
          }`}
          style={{ animation: accessRequestVisible ? "adminAccessBannerIn 180ms ease-out" : undefined }}
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-d-pink/15 text-d-pink">
              <Megaphone size={15} />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-d-fg" style={{ fontFamily: "'Sora', sans-serif" }}>
                {accessRequest.name} souhaite éditer ce template
              </div>
              <div className="mt-0.5 text-xs leading-relaxed text-d-fg3">
                Accès demandé sur <span className="font-semibold text-d-fg2">{accessRequest.templateName}</span>
                {accessRequest.email ? ` · ${accessRequest.email}` : ""}
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="mb-5 space-y-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-d-fg mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>
            Template newsletter
          </h2>
          <p className="text-xs text-d-fg4 leading-relaxed">
            Configure la disposition proposée lors de la création.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-medium text-d-fg3 hover:text-d-fg border border-line hover:border-line2 px-3 py-1.5 rounded-full transition-colors"
          >
            <RotateCcw size={11} />
            Réinitialiser
          </button>
          <button
            onClick={clearBlocks}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-medium text-d-fg3 hover:text-red-300 border border-line hover:border-red-500/30 px-3 py-1.5 rounded-full transition-colors"
          >
            <X size={11} />
            Vider les blocs
          </button>
          <button
            onClick={() => setDefaultContentOpen(true)}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-medium text-d-fg3 hover:text-d-fg border border-line hover:border-line2 px-3 py-1.5 rounded-full transition-colors"
          >
            <FileEdit size={11} />
            Contenus par défaut
          </button>
          <button
            onClick={handleSaveDefault}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold px-3 py-1.5 rounded-full transition-colors"
            style={saved
              ? { background: "rgba(3,255,207,0.15)", color: "#03FFCF", border: "1px solid rgba(3,255,207,0.25)" }
              : { background: "#FFFFFF", color: "#15151A" }}
          >
            {saved ? <Check size={11} /> : <Save size={11} />}
            {saved ? "Sauvegardé" : "Sauvegarder version par défaut"}
          </button>
          {editingPreset && (
            <button
              onClick={handleSavePreset}
              disabled={presetSaving}
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
              style={{ background: "#FF00AA", color: "#FFFFFF" }}
            >
              {presetSaving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
              Sauvegarder le preset
            </button>
          )}
          <button
            onClick={handleCreatePreset}
            disabled={presetSaving}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
            style={{ background: "#FF00AA", color: "#FFFFFF" }}
          >
            {presetSaving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
            Créer un preset
          </button>
        </div>
      </div>

      {editingPreset && (
        <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-d-pink/30 bg-d-pink/10 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-xs text-d-fg2">
            Preset en édition : <span className="font-semibold text-d-fg">{editingPreset.name}</span>
          </div>
          <button
            type="button"
            onClick={() => setEditingPresetId(null)}
            className="self-start rounded-full border border-line px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-d-fg3 transition-colors hover:border-line2 hover:text-d-fg sm:self-auto"
          >
            Revenir au template par défaut
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[310px_minmax(0,1fr)_360px] xl:items-start">
        <aside className="flex flex-col overflow-hidden rounded-2xl border border-line bg-d-panel xl:sticky xl:top-4">
          <div className="border-b border-line p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-d-fg3">
                Bibliothèque
              </div>
              <div className="font-mono text-[11px] text-d-fg4">{filteredTypes.length} blocs</div>
            </div>
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-d-fg4" />
              <input
                value={blockSearch}
                onChange={(event) => setBlockSearch(event.target.value)}
                placeholder="Rechercher un bloc…"
                className="h-9 w-full rounded-lg border border-line bg-d-panel2 pl-9 pr-3 text-xs text-d-fg outline-none transition-colors placeholder:text-d-fg4 focus:border-line2"
              />
            </div>
          </div>

          <div className="overflow-auto p-3">
            <div className="flex flex-col gap-1.5">
              {filteredTypes.map((type) => {
                const Icon = SECTION_ICON_MAP[type] ?? Newspaper;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addBlock(type)}
                    className="grid grid-cols-[30px_minmax(0,1fr)_18px] items-center gap-3 rounded-lg border border-line bg-d-panel2 px-2.5 py-2 text-left transition-all hover:border-line2 hover:bg-d-panel3"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-d-panel text-d-fg3">
                      <Icon size={14} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-d-fg">{SECTION_TYPES[type].label}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-d-fg4">{SECTION_TYPE_DESCRIPTIONS[type]}</span>
                    </span>
                    <Plus size={13} className="text-d-fg4" />
                  </button>
                );
              })}
            </div>
          </div>

        </aside>

        <main className="flex min-h-0 min-w-0 flex-col rounded-2xl border border-line bg-d-bg xl:max-h-[calc(100vh-220px)]">
          <div className="flex flex-col gap-2 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-d-fg3">
                Composition active
              </div>
              <div className="mt-1 text-xs text-d-fg4">
                {active.length === 0
                  ? "Aucun bloc — sélectionne des blocs dans la bibliothèque."
                  : `Glisse les blocs pour les réordonner. ${active.length}/${allTypes.length} blocs actifs.`}
              </div>
            </div>
            <div className="self-start rounded-lg border border-line bg-d-panel px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-d-fg4 sm:self-auto">
              Ordre <span className="text-d-cyan">top → bottom</span>
            </div>
          </div>

          <div ref={activeListRef} className="min-h-[280px] flex-1 overflow-auto p-5 max-xl:max-h-[70vh]">
            {active.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line p-10 text-center">
                <LayoutTemplate size={28} className="mx-auto mb-3 text-d-fg4" />
                <div className="text-sm font-semibold text-d-fg">Aucun bloc dans le template</div>
                <div className="mt-1 text-xs text-d-fg4">Sélectionne des blocs dans la bibliothèque, ou charge un preset existant.</div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-d-fg3 transition-colors hover:border-line2 hover:text-d-fg"
                >
                  <RotateCcw size={11} />
                  Restaurer les blocs par défaut
                </button>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={({ active }) => setActiveDragId(active.id)}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={active.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-2">
                    {active.map((entry, index) => (
                      <SortableActiveItem
                        key={entry.id}
                        entry={entry}
                        index={index}
                        total={active.length}
                        onMoveUp={() => { moveBlock(entry.id, -1); }}
                        onMoveDown={() => { moveBlock(entry.id, 1); }}
                        onToggleNumbering={(checked) => updateBlockNumbering(entry.id, checked)}
                        onRemove={() => removeBlock(entry.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
                <DragOverlay dropAnimation={null}>
                  {activeDragId ? (() => {
                    const entry = active.find((e) => e.id === activeDragId);
                    if (!entry) return null;
                    const Icon = SECTION_ICON_MAP[entry.type] ?? Newspaper;
                    const idx = active.findIndex((e) => e.id === activeDragId);
                    return (
                      <div style={{ background: "rgb(var(--d-panel))", border: "2px solid #FF00AA", boxShadow: "0 0 0 4px rgba(255,0,170,0.15), 0 8px 32px rgba(0,0,0,0.5)", borderRadius: 12, cursor: "grabbing" }}
                        className="grid grid-cols-[20px_38px_38px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3"
                      >
                        <GripVertical size={15} style={{ color: "#FF00AA" }} />
                        <span className="font-mono text-xs font-semibold text-d-cyan">{String(idx + 1).padStart(2, "0")}</span>
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-d-panel2 text-d-fg3">
                          <Icon size={17} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-d-fg" style={{ fontFamily: "'Sora', sans-serif" }}>{SECTION_TYPES[entry.type]?.label || entry.type}</span>
                        </span>
                      </div>
                    );
                  })() : null}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        </main>

        <aside className="overflow-hidden rounded-2xl border border-line bg-d-panel">
          <div className="border-b border-line p-4">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-d-fg3">
              Réglages par défaut
            </div>
            <div className="divide-y divide-line">
              <PresetSettingRow
                icon={Type}
                title="Contenu d'exemple"
                hint="Blocs préremplis avec du dummy text."
                checked={includeDefaultContent}
                onChange={(checked) => {
                  setIncludeDefaultContent(checked);
                  setSaved(false);
                }}
              />
              <PresetSettingRow
                icon={List}
                title="Numérotation des blocs"
                hint="Affiche 01, 02, 03… en marge."
                checked={showSectionNumbers}
                onChange={(checked) => {
                  setShowSectionNumbers(checked);
                  setSaved(false);
                }}
              />
              <PresetSettingRow
                icon={Palette}
                title="Fond clair"
                hint="Email clair avec logo sombre."
                checked={themeVariant === "light"}
                onChange={(checked) => {
                  setThemeVariant(checked ? "light" : "dark");
                  setSaved(false);
                }}
              />
              <PresetSettingRow
                icon={Minus}
                title="Filets entre blocs"
                hint="Affiche ou masque le liseret entre chaque bloc du mail."
                checked={showBlockSeparators}
                onChange={(checked) => {
                  setShowBlockSeparators(checked);
                  setSaved(false);
                }}
              />
              <PresetSettingRow
                icon={Calendar}
                title="Date d'en-tête"
                hint="Date préremplie à la création."
                checked={includeIssueDate}
                onChange={(checked) => {
                  setIncludeIssueDate(checked);
                  setSaved(false);
                }}
              />
            </div>
          </div>

          <div className="border-t border-line p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-d-fg3">
                Presets partagés
              </div>
              <button
                type="button"
                onClick={loadPresets}
                disabled={presetsLoading}
                className="rounded-md p-1 text-d-fg4 transition-colors hover:bg-d-panel3 hover:text-d-fg2 disabled:opacity-50"
                title="Rafraîchir"
              >
                <RefreshCw size={12} className={presetsLoading ? "animate-spin" : ""} />
              </button>
            </div>
            {presets.length > 0 && (
              <div className="mb-3 grid gap-2">
                <div className="relative">
                  <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-d-fg4" />
                  <input
                    value={presetSearch}
                    onChange={(event) => setPresetSearch(event.target.value)}
                    placeholder="Rechercher un preset…"
                    className="h-9 w-full rounded-lg border border-line bg-d-panel2 pl-9 pr-3 text-xs text-d-fg outline-none transition-colors placeholder:text-d-fg4 focus:border-line2"
                  />
                </div>
                <select
                  value={presetSort}
                  onChange={(event) => setPresetSort(event.target.value)}
                  className="h-9 w-full rounded-lg border border-line bg-d-panel2 px-3 text-xs text-d-fg outline-none transition-colors focus:border-line2"
                >
                  <option value="updated_desc">Tri : plus récents</option>
                  <option value="name_asc">Tri : nom A → Z</option>
                  <option value="name_desc">Tri : nom Z → A</option>
                  <option value="blocks_desc">Tri : plus de blocs</option>
                  <option value="blocks_asc">Tri : moins de blocs</option>
                </select>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-d-fg4">
                  {filteredPresets.length} / {presets.length} preset{presets.length > 1 ? "s" : ""}
                </div>
              </div>
            )}

            {presetsError && (
              <div className="mb-3 rounded-lg border border-red-500/20 bg-red-950/20 p-3 text-[11px] leading-relaxed text-red-300">
                Presets indisponibles : {presetsError}. Exécute `supabase/template-presets.sql` si la table n'existe pas encore.
              </div>
            )}

            {presetsLoading ? (
              <div className="flex items-center gap-2 py-4 text-[11px] uppercase tracking-[0.18em] text-d-fg3">
                <Loader2 size={13} className="animate-spin" />
                Chargement…
              </div>
            ) : presets.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line p-4 text-center text-xs text-d-fg4">
                Aucun preset partagé.
              </div>
            ) : filteredPresets.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line p-4 text-center text-xs text-d-fg4">
                Aucun preset ne correspond à cette recherche.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {filteredPresets.map((preset) => {
                  const isActivePreset = editingPresetId === preset.id;
                  const canDeletePreset = currentProfile?.is_admin || preset.createdBy === currentProfile?.id;
                  return (
                    <div
                      key={preset.id}
                      className={`grid grid-cols-[minmax(0,1fr)_26px] items-center gap-2 rounded-lg border px-2.5 py-2 ${
                        isActivePreset
                          ? "border-d-pink/40 bg-d-pink/10"
                          : "border-transparent bg-transparent hover:bg-d-panel3"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleLoadPreset(preset)}
                        className="min-w-0 text-left"
                      >
                        <span className={`block truncate text-xs font-semibold ${isActivePreset ? "text-d-pink" : "text-d-fg2"}`}>
                          {preset.name}
                        </span>
                        <span className="mt-0.5 block truncate font-mono text-[10px] text-d-fg4">
                          {preset.sections.length} blocs · {preset.themeVariant === "light" ? "clair" : "sombre"} · {preset.showBlockSeparators ? "séparateurs" : "sans séparateurs"} · {preset.includeIssueDate ? "daté" : "sans date"}
                        </span>
                      </button>
                      {canDeletePreset ? (
                        <button
                          type="button"
                          onClick={() => handleDeletePreset(preset)}
                          className="rounded-md p-1 text-d-fg4 transition-colors hover:bg-red-950/20 hover:text-red-300"
                          title="Supprimer"
                        >
                          <X size={13} />
                        </button>
                      ) : (
                        <span
                          className="rounded-md p-1 text-d-fg4/40"
                          title="Seul le créateur ou un admin peut supprimer ce preset"
                        >
                          <Lock size={13} />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
      {defaultContentOpen && (
        <DefaultContentEditorModal onClose={() => setDefaultContentOpen(false)} />
      )}
    </section>
  );
}

function PresetSettingRow({ icon: Icon, title, hint, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-3">
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-line bg-d-panel2 text-d-fg3">
        <Icon size={14} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-d-fg">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-d-fg4">{hint}</span>
      </span>
      <span className="relative inline-flex h-6 w-11 flex-shrink-0 items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-full border border-line bg-d-panel2 transition-colors peer-checked:border-d-pink peer-checked:bg-d-pink/25" />
        <span className="relative ml-1 h-4 w-4 rounded-full bg-d-fg4 transition-transform peer-checked:translate-x-5 peer-checked:bg-d-pink" />
      </span>
    </label>
  );
}

function DefaultContentEditorModal({ onClose }) {
  const allTypes = Object.keys(SECTION_TYPES);
  const [selectedType, setSelectedType] = useState(allTypes[0]);
  const [overrides, setOverrides] = useState(() => getAllDefaultSectionOverrides());
  const [localData, setLocalData] = useState(() => getDefaultSectionData(allTypes[0]));
  const [savedType, setSavedType] = useState(null);

  const selectType = (type) => {
    setSelectedType(type);
    setLocalData(getDefaultSectionData(type));
  };

  const handleSave = () => {
    saveDefaultSectionOverride(selectedType, localData);
    setOverrides(getAllDefaultSectionOverrides());
    setSavedType(selectedType);
    setTimeout(() => setSavedType(null), 2000);
  };

  const handleReset = () => {
    resetDefaultSectionOverride(selectedType);
    setOverrides(getAllDefaultSectionOverrides());
    setLocalData(SECTION_TYPES[selectedType].factory());
  };

  const hasOverride = (type) => Object.prototype.hasOwnProperty.call(overrides, type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-5xl h-[80vh] flex-col rounded-2xl border border-line bg-d-panel shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-d-fg" style={{ fontFamily: "'Sora', sans-serif" }}>
              Contenus par défaut
            </h2>
            <p className="text-[11px] text-d-fg4 mt-0.5">
              Ces textes sont utilisés à la création d'une newsletter (option "avec contenu").
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 inline-flex items-center justify-center text-d-fg4 hover:text-d-fg2 hover:bg-d-panel2 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Left — type list */}
          <div className="w-56 flex-shrink-0 overflow-y-auto border-r border-line bg-d-panel2 py-2">
            {allTypes.map((type) => {
              const Icon = SECTION_ICON_MAP[type] ?? Newspaper;
              const isSelected = selectedType === type;
              const modified = hasOverride(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => selectType(type)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors ${
                    isSelected
                      ? "bg-d-panel3 text-d-fg"
                      : "text-d-fg3 hover:text-d-fg hover:bg-d-panel3/50"
                  }`}
                >
                  <Icon size={13} className={isSelected ? "text-d-pink" : "text-d-fg4"} />
                  <span className="flex-1 min-w-0 text-xs font-medium truncate">
                    {SECTION_TYPES[type].label}
                  </span>
                  {modified && (
                    <span className="h-1.5 w-1.5 rounded-full bg-d-cyan flex-shrink-0" title="Contenu modifié" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right — editor */}
          <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4">
              <SectionEditor
                type={selectedType}
                data={localData}
                onChange={setLocalData}
                sections={[]}
              />
            </div>
            {/* Footer */}
            <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-line px-4 py-3">
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-medium text-d-fg3 hover:text-d-fg border border-line hover:border-line2 px-3 py-1.5 rounded-full transition-colors"
              >
                <RotateCcw size={11} />
                Réinitialiser
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold px-4 py-1.5 rounded-full transition-colors"
                style={
                  savedType === selectedType
                    ? { background: "rgba(3,255,207,0.15)", color: "#03FFCF", border: "1px solid rgba(3,255,207,0.25)" }
                    : { background: "#FFFFFF", color: "#15151A" }
                }
              >
                {savedType === selectedType ? <Check size={11} /> : <Save size={11} />}
                {savedType === selectedType ? "Sauvegardé" : "Sauvegarder"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LabelsEditor
// ─────────────────────────────────────────────────────────────────────────────

function LabelsEditor() {
  const { profile } = useAuth();
  const addToast = useToast();
  const confirm = useConfirm();
  const { labels, loading, reload } = useLabels();
  const [form, setForm] = useState({ name: "", color: LABEL_COLORS[0] });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", color: "" });
  const [colorPicker, setColorPicker] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !profile?.id) return;
    setSaving(true);
    try {
      await createLabel({ name: form.name.trim(), color: form.color, userId: profile.id });
      setForm({ name: "", color: LABEL_COLORS[0] });
      await reload();
    } catch (err) {
      addToast("Erreur : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (label) => {
    setEditingId(label.id);
    setEditForm({ name: label.name, color: label.color });
  };

  const handleUpdate = async (id) => {
    if (!editForm.name.trim() || !profile?.id) return;
    setSaving(true);
    try {
      await updateLabel(id, { name: editForm.name.trim(), color: editForm.color, userId: profile.id });
      setEditingId(null);
      await reload();
    } catch (err) {
      addToast("Erreur : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (label) => {
    if (!await confirm(`Supprimer le label « ${label.name} » ? Il sera retiré de toutes les newsletters.`, { danger: true, confirmLabel: "Supprimer" })) return;
    try {
      await deleteLabel(label.id);
      await reload();
    } catch (err) {
      addToast("Erreur : " + err.message);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-d-fg mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>
          Labels
        </h2>
        <p className="text-xs text-d-fg4 leading-relaxed">
          Les labels permettent de catégoriser les newsletters. Seuls les admins peuvent les créer ou les modifier.
        </p>
      </div>

      {/* Création */}
      <div className="bg-d-panel border border-line rounded-2xl p-4">
        <div className="text-[10px] uppercase tracking-[0.18em] text-d-fg3 font-medium mb-3">Nouveau label</div>
        <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="text-[10px] uppercase tracking-[0.18em] text-d-fg3 font-medium block mb-2">Nom</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex. : Marché, Macro, Régulation…"
              className="w-full px-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-line2 bg-d-panel2 text-d-fg placeholder:text-d-fg4 transition-colors"
              disabled={saving}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.18em] text-d-fg3 font-medium block mb-2">Couleur</label>
            <button
              type="button"
              onClick={() => setColorPicker({ mode: "create", value: form.color })}
              className="flex h-[42px] min-w-[150px] items-center justify-between gap-3 rounded-xl border border-line bg-d-panel2 px-3 text-xs font-semibold text-d-fg transition-colors hover:border-line2 hover:bg-d-panel3"
              disabled={saving}
            >
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border border-white/40" style={{ background: form.color }} />
                Choisir
              </span>
              <span className="font-mono text-[10px] text-d-fg4">{form.color}</span>
            </button>
          </div>
          <button
            type="submit"
            disabled={saving || !form.name.trim()}
            className={`flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] transition-all duration-200 ${
              saving || !form.name.trim()
                ? "bg-d-panel2 text-d-fg4 border border-line cursor-not-allowed opacity-40"
                : "bg-[#FF00AA] text-white shadow-md shadow-pink-950/10 hover:bg-[#E60098] hover:shadow-pink-950/25 active:scale-[0.98]"
            }`}
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Créer un label
          </button>
        </form>
      </div>

      {/* Liste */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-[10px] uppercase tracking-[0.18em] text-d-fg3 font-medium">Labels existants</h3>
          <span className="text-[10px] bg-d-panel2 text-d-fg3 px-2 py-0.5 rounded-full font-medium border border-line">
            {labels.length}
          </span>
        </div>

        {loading ? (
          <div className="text-xs text-d-fg4 flex items-center gap-2 p-4">
            <Loader2 size={14} className="animate-spin" />Chargement…
          </div>
        ) : labels.length === 0 ? (
          <div className="border border-dashed border-line rounded-2xl p-8 text-center text-xs text-d-fg4">
            Aucun label créé pour le moment.
          </div>
        ) : (
          <div className="bg-d-panel border border-line rounded-2xl divide-y" style={{ borderColor: "var(--d-line)" }}>
            {labels.map((label) => (
              <div key={label.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                {editingId === label.id ? (
                  <>
                    <div className="flex-1 flex flex-col gap-3 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:border-line2 bg-d-panel2 text-d-fg transition-colors"
                        disabled={saving}
                      />
                      <button
                        type="button"
                        onClick={() => setColorPicker({ mode: "edit", value: editForm.color })}
                        className="flex h-[38px] min-w-[140px] items-center justify-between gap-3 rounded-xl border border-line bg-d-panel2 px-3 text-xs font-semibold text-d-fg transition-colors hover:border-line2 hover:bg-d-panel3"
                        disabled={saving}
                      >
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 rounded-full border border-white/40" style={{ background: editForm.color }} />
                          Couleur
                        </span>
                        <span className="font-mono text-[10px] text-d-fg4">{editForm.color}</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdate(label.id)}
                        disabled={saving || !editForm.name.trim()}
                        className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold px-3 py-1.5 rounded-full disabled:opacity-50 transition-colors"
                        style={{ background: "#FFFFFF", color: "#15151A" }}
                      >
                        {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                        Sauver
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-[10px] uppercase tracking-[0.18em] font-medium text-d-fg3 hover:text-d-fg px-3 py-1.5 border border-line hover:border-line2 rounded-full transition-colors"
                      >
                        Annuler
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-1 min-w-0 items-center gap-3">
                      <span className="h-4 w-4 flex-shrink-0 rounded-full" style={{ background: label.color }} />
                      <span className="text-sm text-d-fg font-medium">{label.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(label)}
                        className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-medium text-d-fg3 hover:text-d-fg px-3 py-1.5 border border-line hover:border-line2 rounded-full transition-colors"
                      >
                        <Pencil size={11} />
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(label)}
                        className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-medium px-3 py-1.5 border rounded-full transition-colors"
                        style={{ color: "#FF8466", borderColor: "rgba(255,75,40,0.25)" }}
                      >
                        <X size={11} />
                        Supprimer
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {colorPicker && (
        <LabelColorModal
          value={colorPicker.mode === "edit" ? editForm.color : form.color}
          onClose={() => setColorPicker(null)}
          onSelect={(color) => {
            if (colorPicker.mode === "edit") {
              setEditForm((f) => ({ ...f, color }));
            } else {
              setForm((f) => ({ ...f, color }));
            }
            setColorPicker(null);
          }}
        />
      )}
    </section>
  );
}

function LabelColorModal({ value, onSelect, onClose }) {
  const normalizedValue = /^#[0-9A-F]{6}$/i.test(String(value || "")) ? value : LABEL_COLORS[0];
  const [customColor, setCustomColor] = useState(normalizedValue);
  const isValidCustomColor = /^#[0-9A-F]{6}$/i.test(customColor);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-line bg-d-panel p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-d-fg" style={{ fontFamily: "'Sora', sans-serif" }}>
              Choisir une couleur
            </h3>
            <p className="mt-1 text-xs text-d-fg4">Couleur utilisée pour les labels newsletters et images.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-d-fg4 transition-colors hover:bg-d-panel2 hover:text-d-fg"
          >
            <X size={16} />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {LABEL_COLORS.map((color) => {
            const active = String(value || "").toUpperCase() === color.toUpperCase();
            return (
              <button
                key={color}
                type="button"
                onClick={() => onSelect(color)}
                className="group flex aspect-square items-center justify-center rounded-xl border transition-all hover:scale-105"
                style={{
                  background: color,
                  borderColor: active ? "#FFFFFF" : "rgba(255,255,255,0.18)",
                  boxShadow: active ? `0 0 0 2px ${color}, 0 8px 24px rgba(0,0,0,0.24)` : "none",
                }}
              >
                {active && <Check size={15} className="text-white drop-shadow" strokeWidth={3} />}
              </button>
            );
          })}
        </div>
        <div className="mt-5 rounded-2xl border border-line bg-d-panel2 p-3">
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-d-fg4">
            Couleur personnalisée
          </div>
          <div className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2">
            <input
              type="color"
              value={isValidCustomColor ? customColor : normalizedValue}
              onChange={(event) => setCustomColor(event.target.value.toUpperCase())}
              className="h-10 w-11 cursor-pointer rounded-xl border border-line bg-transparent p-1"
              aria-label="Sélecteur de couleur personnalisée"
            />
            <input
              type="text"
              value={customColor}
              onChange={(event) => {
                const next = event.target.value.trim();
                setCustomColor(next.startsWith("#") ? next.toUpperCase() : `#${next.toUpperCase()}`);
              }}
              placeholder="#FF00AA"
              className="h-10 min-w-0 rounded-xl border border-line bg-d-panel px-3 font-mono text-xs text-d-fg outline-none transition-colors placeholder:text-d-fg4 focus:border-line2"
            />
            <button
              type="button"
              onClick={() => isValidCustomColor && onSelect(customColor.toUpperCase())}
              disabled={!isValidCustomColor}
              className="h-10 rounded-full bg-[#FF00AA] px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#E60098] disabled:cursor-not-allowed disabled:border disabled:border-line disabled:bg-d-panel disabled:text-d-fg4"
            >
              Appliquer
            </button>
          </div>
          {!isValidCustomColor && (
            <div className="mt-2 text-[11px] text-[#FF8466]">Format attendu : #RRGGBB</div>
          )}
        </div>
      </div>
    </div>
  );
}
