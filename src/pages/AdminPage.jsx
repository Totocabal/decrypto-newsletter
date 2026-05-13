// ─────────────────────────────────────────────────────────────────────────────
// AdminPage — gestion des comptes (approbation, droits admin)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Check,
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
import { Wordmark } from "../components/Wordmark.jsx";
import {
  SECTION_TYPES,
  INITIAL_SECTION_TYPES,
  getDefaultSectionTypes,
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

  const formatDate = (iso) => {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const pending = profiles.filter((p) => !p.approved);
  const approved = profiles.filter((p) => p.approved);

  const tabs = [
    { id: "accounts", label: "Gestion des comptes", icon: Users },
    { id: "template", label: "Template newsletter", icon: LayoutTemplate },
  ];

  return (
    <div className="min-h-screen bg-d-bg">
      <header
        className="border-b border-line px-6"
        style={{ background: "#1E1E22", height: 64, display: "flex", alignItems: "center" }}
      >
        <div className="max-w-4xl mx-auto w-full flex items-center gap-4">
          <Wordmark size={17} />
          <div className="w-px h-6" style={{ background: "var(--d-line2)", flexShrink: 0 }} />
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-medium text-d-fg3 hover:text-d-fg px-3 py-1.5 border border-line hover:border-line2 rounded-full transition-colors"
          >
            <ArrowLeft size={12} />
            Retour
          </button>
          <div className="text-[10px] uppercase tracking-[0.18em] text-d-fg4 font-medium">
            Administration
          </div>

          {/* Onglets */}
          <div className="flex items-center bg-d-panel2 rounded-full p-1 border border-line ml-auto">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] rounded-full font-semibold transition-colors ${
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

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* ── Onglet Gestion des comptes ── */}
        {tab === "accounts" && (
          <>
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

            {/* En attente */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-[10px] uppercase tracking-[0.18em] text-d-fg3 font-medium">
                  En attente d'approbation
                </h2>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: "rgba(255,165,0,0.15)", color: "#FFAD33" }}
                >
                  {pending.length}
                </span>
              </div>
              {pending.length === 0 ? (
                <div className="bg-d-panel border border-line rounded-2xl p-6 text-xs text-d-fg4 text-center">
                  Aucun compte en attente.
                </div>
              ) : (
                <div className="bg-d-panel border border-line rounded-2xl divide-y" style={{ borderColor: "var(--d-line)" }}>
                  {pending.map((p) => (
                    <div key={p.id} className="flex items-center gap-4 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-d-fg">{p.full_name || p.email}</div>
                        <div className="text-[11px] text-d-fg4">
                          {p.email} · inscrit le {formatDate(p.created_at)}
                        </div>
                      </div>
                      <button
                        onClick={() => updateProfile(p.id, { approved: true })}
                        className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold text-[#15151A] px-3 py-1.5 rounded-full transition-colors"
                        style={{ background: "#03FFCF" }}
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
                    <div key={p.id} className="flex items-center gap-4 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
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
                        <div className="flex items-center gap-1">
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
          </>
        )}

        {/* ── Onglet Template newsletter ── */}
        {tab === "template" && <DefaultSectionsEditor />}
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
  const [active, setActive] = useState(() => getDefaultSectionTypes());
  const [saved, setSaved] = useState(false);
  const draggedRef = useRef(null);
  const [dragOverId, setDragOverId] = useState(null);

  const inactive = allTypes.filter((t) => !active.includes(t));

  const toggle = (type) => {
    setActive((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
    setSaved(false);
  };

  const handleDragStart = (type) => { draggedRef.current = type; };
  const handleDragOver = (e, type) => { e.preventDefault(); setDragOverId(type); };
  const handleDragLeave = () => setDragOverId(null);
  const handleDrop = (e, targetType) => {
    e.preventDefault();
    const from = draggedRef.current;
    if (!from || from === targetType) { setDragOverId(null); return; }
    setActive((prev) => {
      const arr = [...prev];
      const fi = arr.indexOf(from);
      const ti = arr.indexOf(targetType);
      if (fi === -1 || ti === -1) return prev;
      arr.splice(fi, 1);
      arr.splice(ti, 0, from);
      return arr;
    });
    draggedRef.current = null;
    setDragOverId(null);
    setSaved(false);
  };
  const handleDragEnd = () => { draggedRef.current = null; setDragOverId(null); };

  const handleSave = () => {
    saveDefaultSectionTypes(active);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setActive([...INITIAL_SECTION_TYPES]);
    setSaved(false);
  };

  return (
    <section>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-d-fg mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>
            Template nouvelle newsletter
          </h2>
          <p className="text-xs text-d-fg4 leading-relaxed">
            Choisis les blocs inclus par défaut à la création. Glisse les blocs actifs pour les réordonner.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-medium text-d-fg3 hover:text-d-fg border border-line hover:border-line2 px-3 py-1.5 rounded-full transition-colors"
          >
            <RotateCcw size={11} />
            Réinitialiser
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold px-3 py-1.5 rounded-full transition-colors"
            style={saved
              ? { background: "rgba(3,255,207,0.15)", color: "#03FFCF", border: "1px solid rgba(3,255,207,0.25)" }
              : { background: "#FFFFFF", color: "#15151A" }}
          >
            {saved ? <Check size={11} /> : <Save size={11} />}
            {saved ? "Sauvegardé" : "Sauvegarder"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
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
            {active.map((type) => {
              const Icon = SECTION_ICON_MAP[type] ?? Newspaper;
              const isDragOver = dragOverId === type;
              return (
                <div
                  key={type}
                  draggable
                  onDragStart={() => handleDragStart(type)}
                  onDragOver={(e) => handleDragOver(e, type)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, type)}
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
                  <button
                    type="button"
                    onClick={() => toggle(type)}
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

        {/* Colonne droite — blocs inactifs */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-d-fg3 font-medium mb-3 flex items-center gap-2">
            Non inclus
            <span className="bg-d-panel2 border border-line px-1.5 py-0.5 rounded-full text-d-fg4">
              {inactive.length}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {inactive.length === 0 && (
              <div className="text-[11px] text-d-fg4 italic py-3 px-1">Tous les blocs sont inclus</div>
            )}
            {inactive.map((type) => {
              const Icon = SECTION_ICON_MAP[type] ?? Newspaper;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggle(type)}
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
    </section>
  );
}
