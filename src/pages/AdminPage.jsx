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
  Eye,
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
} from "lucide-react";
import { useRef } from "react";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useLabels, createLabel, updateLabel, deleteLabel, LABEL_COLORS } from "../lib/useLabels.js";
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
    { id: "labels", label: "Labels", icon: Tag },
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
  event: "Annonce d'évènement avec informations et CTA.",
  text_block: "Bloc texte simple avec bouton optionnel.",
  focus: "Texte long, image et boutons optionnels.",
  image_block: "Image seule avec lien de redirection optionnel.",
  divider: "Séparateur visuel entre deux blocs.",
};

function DefaultSectionsEditor() {
  const allTypes = Object.keys(SECTION_TYPES);
  const [blockSearch, setBlockSearch] = useState("");
  const [active, setActive] = useState(() => getDefaultNewsletterTemplate().sections);
  const [includeDefaultContent, setIncludeDefaultContent] = useState(
    () => getDefaultNewsletterTemplate().includeDefaultContent
  );
  const [showSectionNumbers, setShowSectionNumbers] = useState(
    () => getDefaultNewsletterTemplate().showSectionNumbers
  );
  const [themeVariant, setThemeVariant] = useState(
    () => getDefaultNewsletterTemplate().themeVariant
  );
  const [includeIssueDate, setIncludeIssueDate] = useState(
    () => getDefaultNewsletterTemplate().includeIssueDate
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
  const filteredTypes = allTypes.filter((type) =>
    SECTION_TYPES[type].label.toLowerCase().includes(blockSearch.trim().toLowerCase())
  );

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
    saveDefaultSectionTypes(active, includeDefaultContent, showSectionNumbers, themeVariant, includeIssueDate);
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
    setThemeVariant(preset.themeVariant);
    setIncludeIssueDate(preset.includeIssueDate);
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
    setThemeVariant("dark");
    setIncludeIssueDate(true);
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[310px_minmax(0,1fr)_360px]">
        <aside className="overflow-hidden rounded-2xl border border-line bg-d-panel">
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

          <div className="max-h-[420px] overflow-auto p-3">
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

          <div className="border-t border-line bg-d-panel2 p-4">
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
            ) : (
              <div className="flex max-h-56 flex-col gap-1.5 overflow-auto">
                {presets.map((preset) => {
                  const isActivePreset = editingPresetId === preset.id;
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
                          {preset.sections.length} blocs · {preset.themeVariant === "light" ? "clair" : "sombre"} · {preset.includeIssueDate ? "daté" : "sans date"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePreset(preset)}
                        className="rounded-md p-1 text-d-fg4 transition-colors hover:bg-red-950/20 hover:text-red-300"
                        title="Supprimer"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <main className="min-w-0 rounded-2xl border border-line bg-d-bg">
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

          <div className="max-h-[640px] overflow-auto p-5">
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
              <div className="flex flex-col gap-2">
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
                      className={`grid grid-cols-[20px_38px_38px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-3 py-3 transition-all ${
                        isDragOver
                          ? "border-d-pink bg-d-panel3 shadow-[0_0_0_2px_rgba(255,0,170,0.15)]"
                          : "border-line bg-d-panel hover:border-line2"
                      }`}
                    >
                      <GripVertical size={15} className="cursor-grab text-d-fg4" />
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
                      </span>
                      <span className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveBlock(entry.id, -1)}
                          disabled={index === 0}
                          className="rounded-md border border-line p-1 text-d-pink transition-colors hover:bg-d-pink/10 disabled:opacity-20"
                          title="Monter"
                        >
                          <ChevronUp size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveBlock(entry.id, 1)}
                          disabled={index === active.length - 1}
                          className="rounded-md border border-line p-1 text-d-pink transition-colors hover:bg-d-pink/10 disabled:opacity-20"
                          title="Descendre"
                        >
                          <ChevronDown size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeBlock(entry.id)}
                          className="rounded-md border border-line p-1 text-d-fg4 transition-colors hover:bg-red-950/20 hover:text-red-300"
                          title="Retirer"
                        >
                          <X size={13} />
                        </button>
                      </span>
                    </div>
                  );
                })}
              </div>
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
                icon={Calendar}
                title="Date d'en-tête"
                hint="Date préremplie à la création."
                checked={includeIssueDate}
                onChange={(checked) => {
                  setIncludeIssueDate(checked);
                  setSaved(false);
                }}
                last
              />
            </div>
          </div>

          <div className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-d-fg3">
                  Aperçu
                </div>
                <span className="rounded border border-d-cyan/40 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-d-cyan">
                  Live
                </span>
              </div>
              <div className="flex items-center gap-1 font-mono text-[10px] text-d-fg4">
                <Eye size={12} />
                720 × auto
              </div>
            </div>
            <TemplatePresetPreview
              sections={active}
              light={themeVariant === "light"}
              showNumbers={showSectionNumbers}
              showDate={includeIssueDate}
            />
          </div>
        </aside>
      </div>
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

function TemplatePresetPreview({ sections, light, showNumbers, showDate }) {
  const previewBg = light ? "#F1F2F5" : "#1A1A1D";
  const cardBg = light ? "#FFFFFF" : "#26262B";
  const textColor = light ? "#15151A" : "#F1F2F5";
  const mutedColor = light ? "#7A8494" : "#8C8F98";
  const borderColor = light ? "rgba(21,21,26,0.10)" : "rgba(255,255,255,0.08)";

  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{ background: previewBg, borderColor }}
    >
      <div
        className="flex items-center justify-between gap-3 border-b px-3 py-2"
        style={{ borderColor }}
      >
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-gradient-to-br from-d-cyan via-d-blue to-d-pink" />
          <span className="font-sora text-[10px] font-bold" style={{ color: textColor }}>
            Decrypto
          </span>
        </div>
        {showDate && (
          <span className="font-mono text-[9px]" style={{ color: mutedColor }}>
            15 / 05 / 2026
          </span>
        )}
      </div>

      <div className="max-h-[430px] overflow-auto p-3">
        {sections.length === 0 ? (
          <div className="py-16 text-center text-[11px] italic" style={{ color: mutedColor }}>
            Aperçu vide.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sections.map((entry, index) => {
              const type = SECTION_TYPES[entry.type];
              const Icon = SECTION_ICON_MAP[entry.type] ?? Newspaper;
              return (
                <div
                  key={`${entry.id}-${index}`}
                  className="rounded-lg border p-2"
                  style={{ background: cardBg, borderColor }}
                >
                  <div className="mb-2 flex items-center gap-2">
                    {showNumbers && (
                      <span className="font-mono text-[9px] font-semibold text-d-cyan">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    )}
                    <Icon size={12} style={{ color: mutedColor }} />
                    <span className="truncate text-[10px] font-semibold" style={{ color: textColor }}>
                      {type?.label || entry.type}
                    </span>
                  </div>
                  <MiniPreviewLines type={entry.type} light={light} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniPreviewLines({ type, light }) {
  const base = light ? "#D8DDE6" : "#3D3F45";
  const strong = light ? "#15151A" : "#F1F2F5";
  const accent = light ? "#4141FF" : "#00FFFF";
  const line = (width, color = base) => (
    <span className="block h-1 rounded-full" style={{ width, background: color }} />
  );

  if (type === "chart") {
    return (
      <div className="space-y-1">
        {line("35%", strong)}
        <svg viewBox="0 0 100 24" className="h-6 w-full">
          <polyline points="0,18 18,13 35,15 53,8 72,11 100,5" fill="none" stroke={accent} strokeWidth="2" />
        </svg>
      </div>
    );
  }

  if (type === "image_block") {
    return <div className="h-10 rounded-md bg-gradient-to-br from-d-blue/30 via-d-pink/30 to-d-orange/30" />;
  }

  if (type === "focus") {
    return (
      <div className="flex gap-2">
        <div className="h-10 w-14 rounded-md bg-gradient-to-br from-d-blue/25 to-d-pink/25" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {line("85%", strong)}
          {line("95%")}
          {line("62%")}
        </div>
      </div>
    );
  }

  if (type === "divider") {
    return <div className="h-px w-full" style={{ background: base }} />;
  }

  return (
    <div className="flex flex-col gap-1">
      {line("72%", strong)}
      {line("94%")}
      {line("64%")}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LabelsEditor
// ─────────────────────────────────────────────────────────────────────────────

function LabelsEditor() {
  const { profile } = useAuth();
  const { labels, loading, reload } = useLabels();
  const [form, setForm] = useState({ name: "", color: LABEL_COLORS[0] });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", color: "" });

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !profile?.id) return;
    setSaving(true);
    try {
      await createLabel({ name: form.name.trim(), color: form.color, userId: profile.id });
      setForm({ name: "", color: LABEL_COLORS[0] });
      await reload();
    } catch (err) {
      alert("Erreur : " + err.message);
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
      alert("Erreur : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (label) => {
    if (!confirm(`Supprimer le label « ${label.name} » ? Il sera retiré de toutes les newsletters.`)) return;
    try {
      await deleteLabel(label.id);
      await reload();
    } catch (err) {
      alert("Erreur : " + err.message);
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
            <div className="flex flex-wrap gap-1.5">
              {LABEL_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    background: c,
                    borderColor: form.color === c ? "#fff" : "transparent",
                  }}
                />
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={saving || !form.name.trim()}
            className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.18em] font-semibold text-[#15151A] bg-white hover:bg-d-fg2 px-4 py-2.5 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Créer
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
                      <div className="flex flex-wrap gap-1.5">
                        {LABEL_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setEditForm((f) => ({ ...f, color: c }))}
                            className="h-5 w-5 rounded-full border-2 transition-transform hover:scale-110"
                            style={{
                              background: c,
                              borderColor: editForm.color === c ? "#fff" : "transparent",
                            }}
                          />
                        ))}
                      </div>
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
    </section>
  );
}
