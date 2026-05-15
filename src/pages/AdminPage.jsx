// ─────────────────────────────────────────────────────────────────────────────
// AdminPage — gestion des comptes (approbation, droits admin)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  Loader2,
  Megaphone,
  Newspaper,
  List,
  TrendingUp,
  Gauge,
  Activity,
  Quote,
  BarChart2,
  Calendar,
  Type,
  ImageIcon,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Users,
  LayoutTemplate,
  UserPlus,
  X,
} from "lucide-react";
import { useRef } from "react";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import {
  createTemplatePreset,
  deleteTemplatePreset,
  listTemplatePresets,
  updateTemplatePreset,
} from "../lib/templatePresets.js";
import { Wordmark } from "../components/Wordmark.jsx";
import {
  SECTION_TYPES,
  INITIAL_SECTION_TEMPLATE,
  createDefaultSectionTemplateEntry,
  getDefaultNewsletterTemplate,
  saveDefaultSectionTypes,
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

export function AdminPage({ onBack }) {
  const { profile: currentProfile } = useAuth();
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
      alert("Erreur : " + getAdminCreateErrorMessage(error));
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

  const approved = profiles.filter((p) => p.approved);

  const tabs = [
    { id: "accounts", label: "Gestion des comptes", icon: Users },
    { id: "template", label: "Template newsletter", icon: LayoutTemplate },
  ];

  return (
    <div className="min-h-screen bg-d-bg">
      <header
        className="border-b border-line px-4 py-3 sm:px-6"
        style={{ background: "#1E1E22" }}
      >
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-3 sm:gap-4">
          <Wordmark size={17} />
          <div className="hidden h-6 w-px sm:block" style={{ background: "var(--d-line2)", flexShrink: 0 }} />
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-medium text-d-fg3 hover:text-d-fg px-3 py-1.5 border border-line hover:border-line2 rounded-full transition-colors"
          >
            <ArrowLeft size={12} />
            Retour
          </button>
          <div className="hidden text-[10px] uppercase tracking-[0.18em] text-d-fg4 font-medium sm:block">
            Administration
          </div>

          {/* Onglets */}
          <div className="order-last flex max-w-full items-center overflow-x-auto rounded-full border border-line bg-d-panel2 p-1 sm:order-none sm:ml-auto">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] font-semibold transition-colors ${
                  tab === id
                    ? "bg-white text-[#15151A]"
                    : "text-d-fg3 hover:text-d-fg2"
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-4 sm:p-6">
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
                  <label className="flex items-center gap-2 px-2 py-2.5 text-xs text-d-fg2 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={createForm.isAdmin}
                      onChange={(e) =>
                        setCreateForm((form) => ({ ...form, isAdmin: e.target.checked }))
                      }
                      className="h-4 w-4"
                      style={{ accentColor: "#03FFCF" }}
                      disabled={creating}
                    />
                    Admin
                  </label>
                  <button
                    type="submit"
                    disabled={creating || !createForm.email.trim()}
                    className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.18em] font-semibold text-[#15151A] bg-white hover:bg-d-fg2 px-4 py-2.5 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {creating ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <UserPlus size={12} />
                    )}
                    Créer
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
                            onClick={() =>
                              confirm(`Révoquer l'accès de ${p.email} ?`) &&
                              updateProfile(p.id, { approved: false, is_admin: false })
                            }
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
        </div>

        {/* ── Onglet Template newsletter ── */}
        <div className={tab !== "template" ? "hidden" : ""}>
          <DefaultSectionsEditor />
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
  event: Calendar,
  text_block: Type,
  focus: ImageIcon,
  image_block: ImageIcon,
  divider: Minus,
};

function DefaultSectionsEditor() {
  const allTypes = Object.keys(SECTION_TYPES);
  const [active, setActive] = useState(() => getDefaultNewsletterTemplate().sections);
  const [includeDefaultContent, setIncludeDefaultContent] = useState(
    () => getDefaultNewsletterTemplate().includeDefaultContent
  );
  const [showSectionNumbers, setShowSectionNumbers] = useState(
    () => getDefaultNewsletterTemplate().showSectionNumbers
  );
  const [saved, setSaved] = useState(false);
  const [presets, setPresets] = useState([]);
  const [presetsLoading, setPresetsLoading] = useState(true);
  const [presetsError, setPresetsError] = useState(null);
  const [presetSaving, setPresetSaving] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState(null);
  const draggedRef = useRef(null);
  const [dragOverId, setDragOverId] = useState(null);
  const editingPreset = presets.find((preset) => preset.id === editingPresetId) || null;

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
  };

  const clearBlocks = () => {
    if (active.length && !confirm("Vider tous les blocs de cette disposition ?")) return;
    setActive([]);
    setSaved(false);
  };

  const removeBlock = (id) => {
    setActive((prev) => prev.filter((entry) => entry.id !== id));
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

  const handleDragStart = (id) => { draggedRef.current = id; };
  const handleDragOver = (e, id) => { e.preventDefault(); setDragOverId(id); };
  const handleDragLeave = () => setDragOverId(null);
  const handleDrop = (e, targetId) => {
    e.preventDefault();
    const from = draggedRef.current;
    if (!from || from === targetId) { setDragOverId(null); return; }
    setActive((prev) => {
      const arr = [...prev];
      const fi = arr.findIndex((entry) => entry.id === from);
      const ti = arr.findIndex((entry) => entry.id === targetId);
      if (fi === -1 || ti === -1) return prev;
      const [removed] = arr.splice(fi, 1);
      arr.splice(ti, 0, removed);
      return arr;
    });
    draggedRef.current = null;
    setDragOverId(null);
    setSaved(false);
  };
  const handleDragEnd = () => { draggedRef.current = null; setDragOverId(null); };

  const handleSaveDefault = () => {
    saveDefaultSectionTypes(active, includeDefaultContent, showSectionNumbers);
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
    const name = window.prompt("Nom du preset de template :", "");
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
    setEditingPresetId(preset.id);
    setSaved(false);
  };

  const handleDeletePreset = async (preset) => {
    if (!confirm(`Supprimer le preset « ${preset.name} » ?`)) return;
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
    setEditingPresetId(null);
    setSaved(false);
  };

  return (
    <section>
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

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-d-panel p-4 cursor-pointer">
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-d-fg mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>
              Contenu par défaut
            </span>
            <span className="block text-[11px] leading-relaxed text-d-fg4">
              {includeDefaultContent ? "Blocs avec contenu d'exemple." : "Blocs sans contenu prérempli."}
            </span>
          </span>
          <span className="relative inline-flex h-6 w-11 flex-shrink-0 items-center">
            <input
              type="checkbox"
              checked={includeDefaultContent}
              onChange={(event) => {
                setIncludeDefaultContent(event.target.checked);
                setSaved(false);
              }}
              className="peer sr-only"
            />
            <span className="absolute inset-0 rounded-full border border-line bg-d-panel2 transition-colors peer-checked:border-d-pink peer-checked:bg-d-pink/25" />
            <span className="relative ml-1 h-4 w-4 rounded-full bg-d-fg4 transition-transform peer-checked:translate-x-5 peer-checked:bg-d-pink" />
          </span>
        </label>

        <label className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-d-panel p-4 cursor-pointer">
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-d-fg mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>
              Numérotation des blocs
            </span>
            <span className="block text-[11px] leading-relaxed text-d-fg4">
              {showSectionNumbers ? "Affiche 01, 02, 03…" : "Crée sans numéros."}
            </span>
          </span>
          <span className="relative inline-flex h-6 w-11 flex-shrink-0 items-center">
            <input
              type="checkbox"
              checked={showSectionNumbers}
              onChange={(event) => {
                setShowSectionNumbers(event.target.checked);
                setSaved(false);
              }}
              className="peer sr-only"
            />
            <span className="absolute inset-0 rounded-full border border-line bg-d-panel2 transition-colors peer-checked:border-d-pink peer-checked:bg-d-pink/25" />
            <span className="relative ml-1 h-4 w-4 rounded-full bg-d-fg4 transition-transform peer-checked:translate-x-5 peer-checked:bg-d-pink" />
          </span>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Colonne gauche — blocs actifs */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-d-fg3 font-medium mb-3 flex items-center gap-2">
            Inclus
            <span className="bg-d-panel2 border border-line px-1.5 py-0.5 rounded-full text-d-fg4">
              {active.length}
            </span>
          </div>
          <div className="flex flex-col gap-1.5 min-h-16">
            {active.length === 0 && (
              <div className="text-[11px] text-d-fg4 italic py-3 px-1">Aucun bloc actif</div>
            )}
            {active.map((entry, index) => {
              const type = entry.type;
              const Icon = SECTION_ICON_MAP[type] ?? Newspaper;
              const isDragOver = dragOverId === entry.id;
              return (
                <div
                  key={entry.id}
                  draggable
                  onDragStart={() => handleDragStart(entry.id)}
                  onDragOver={(e) => handleDragOver(e, entry.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, entry.id)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
                    isDragOver
                      ? "border-line2 bg-d-panel3 scale-[1.01]"
                      : "border-line bg-d-panel2 hover:border-line2"
                  }`}
                >
                  <GripVertical size={13} className="text-d-fg4 flex-shrink-0" />
                  <Icon size={13} className="text-d-fg3 flex-shrink-0" />
                  <span className="text-xs font-medium text-d-fg flex-1 leading-none">
                    {SECTION_TYPES[type].label}
                  </span>
                  <span className="text-[10px] text-d-fg5 tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <button
                    type="button"
                    onClick={() => moveBlock(entry.id, -1)}
                    disabled={index === 0}
                    className="rounded p-0.5 text-d-pink transition-colors hover:bg-d-pink/10 hover:text-d-pink disabled:opacity-20"
                    title="Monter"
                  >
                    <ChevronUp size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBlock(entry.id, 1)}
                    disabled={index === active.length - 1}
                    className="rounded p-0.5 text-d-pink transition-colors hover:bg-d-pink/10 hover:text-d-pink disabled:opacity-20"
                    title="Descendre"
                  >
                    <ChevronDown size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeBlock(entry.id)}
                    className="text-d-fg4 hover:text-d-fg2 transition-colors p-0.5 rounded flex-shrink-0"
                    title="Retirer"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Colonne droite — catalogue de blocs */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-d-fg3 font-medium mb-3 flex items-center gap-2">
            Ajouter un bloc
            <span className="bg-d-panel2 border border-line px-1.5 py-0.5 rounded-full text-d-fg4">
              {allTypes.length}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {allTypes.map((type) => {
              const Icon = SECTION_ICON_MAP[type] ?? Newspaper;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => addBlock(type)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-line bg-d-panel hover:bg-d-panel2 hover:border-line2 transition-all cursor-pointer text-left group"
                >
                  <Icon size={13} className="text-d-fg4 flex-shrink-0 group-hover:text-d-fg3 transition-colors" />
                  <span className="text-xs text-d-fg3 flex-1 leading-none group-hover:text-d-fg transition-colors">
                    {SECTION_TYPES[type].label}
                  </span>
                  <Plus size={12} className="text-d-fg4 flex-shrink-0 group-hover:text-d-fg2 transition-colors" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-d-panel p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xs font-semibold text-d-fg" style={{ fontFamily: "'Sora', sans-serif" }}>
              Presets partagés
            </h3>
            <p className="mt-1 text-[11px] leading-relaxed text-d-fg4">
              Ces dispositions seront proposées aux utilisateurs dans “Nouveau Template”.
            </p>
          </div>
          <button
            type="button"
            onClick={loadPresets}
            disabled={presetsLoading}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-d-fg3 transition-colors hover:border-line2 hover:text-d-fg disabled:opacity-50"
          >
            <RefreshCw size={11} className={presetsLoading ? "animate-spin" : ""} />
            Rafraîchir
          </button>
        </div>

        {presetsError && (
          <div className="mb-3 rounded-xl border border-red-500/20 bg-red-950/20 p-3 text-[11px] leading-relaxed text-red-300">
            Presets indisponibles : {presetsError}. Exécute `supabase/template-presets.sql` si la table n'existe pas encore.
          </div>
        )}

        {presetsLoading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-xs uppercase tracking-[0.18em] text-d-fg3">
            <Loader2 size={14} className="animate-spin" />
            Chargement…
          </div>
        ) : presets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-5 text-center text-xs text-d-fg4">
            Aucun preset partagé pour le moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="flex flex-col gap-3 rounded-xl border border-line bg-d-panel2 p-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-d-fg2">
                    {preset.name}
                  </div>
                  <div className="mt-1 text-[11px] text-d-fg4">
                    {preset.sections.length} bloc{preset.sections.length > 1 ? "s" : ""} · {preset.includeDefaultContent ? "avec contenu d'exemple" : "structure vide"} · {preset.showSectionNumbers ? "numéroté" : "sans numérotation"}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleLoadPreset(preset)}
                    className="rounded-full border border-line px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-d-fg3 transition-colors hover:border-line2 hover:text-d-fg"
                  >
                    Charger
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePreset(preset)}
                    className="rounded-full border border-red-500/30 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-red-300 transition-colors hover:bg-red-950/20"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
