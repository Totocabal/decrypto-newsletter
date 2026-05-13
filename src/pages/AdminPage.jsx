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
  RotateCcw,
  Save,
  ShieldCheck,
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
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-d-fg4 font-medium">
              Administration
            </div>
            <div className="text-sm font-semibold text-d-fg" style={{ fontFamily: "'Sora', sans-serif" }}>
              Comptes utilisateurs
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
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
                <div
                  key={p.id}
                  className="flex items-center gap-4 px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-d-fg">
                      {p.full_name || p.email}
                    </div>
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
                <div
                  key={p.id}
                  className="flex items-center gap-4 px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-d-fg">
                        {p.full_name || p.email}
                      </span>
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
                        onClick={() =>
                          updateProfile(p.id, { is_admin: !p.is_admin })
                        }
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
        {/* Template de nouvelle newsletter */}
        <DefaultSectionsEditor />
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
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-[10px] uppercase tracking-[0.18em] text-d-fg3 font-medium">
            Template nouvelle newsletter
          </h2>
          <p className="text-[11px] text-d-fg4 mt-0.5">
            Blocs inclus par défaut à la création. Glisse pour réordonner.
          </p>
        </div>
        <div className="flex gap-2">
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
            style={saved ? { background: "rgba(3,255,207,0.15)", color: "#03FFCF", border: "1px solid rgba(3,255,207,0.25)" } : { background: "#FFFFFF", color: "#15151A" }}
          >
            {saved ? <Check size={11} /> : <Save size={11} />}
            {saved ? "Sauvegardé" : "Sauvegarder"}
          </button>
        </div>
      </div>

      <div className="bg-d-panel border border-line rounded-2xl overflow-hidden">
        {/* Blocs actifs */}
        <div className="px-4 pt-4 pb-2">
          <div className="text-[10px] uppercase tracking-[0.18em] text-d-fg4 font-medium mb-2 px-1">
            Inclus ({active.length})
          </div>
          {active.length === 0 && (
            <div className="text-[11px] text-d-fg4 px-1 pb-2 italic">Aucun bloc actif</div>
          )}
          <div className="flex flex-col gap-1">
            {active.map((type) => {
              const Icon = SECTION_ICON_MAP[type] ?? FileTextIcon;
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors cursor-grab active:cursor-grabbing ${
                    isDragOver
                      ? "border-line2 bg-d-panel3"
                      : "border-line bg-d-panel2 hover:border-line2"
                  }`}
                >
                  <GripVertical size={14} className="text-d-fg4 flex-shrink-0" />
                  <Icon size={14} className="text-d-fg3 flex-shrink-0" />
                  <span className="text-xs font-medium text-d-fg flex-1">
                    {SECTION_TYPES[type].label}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggle(type)}
                    className="text-d-fg4 hover:text-d-fg2 transition-colors p-0.5 rounded"
                    title="Retirer"
                  >
                    <X size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Séparateur */}
        {inactive.length > 0 && (
          <div className="h-px mx-4 my-2" style={{ background: "var(--d-line)" }} />
        )}

        {/* Blocs inactifs */}
        {inactive.length > 0 && (
          <div className="px-4 pb-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-d-fg4 font-medium mb-2 px-1">
              Non inclus
            </div>
            <div className="flex flex-col gap-1">
              {inactive.map((type) => {
                const Icon = SECTION_ICON_MAP[type] ?? FileTextIcon;
                return (
                  <div
                    key={type}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-line bg-d-panel opacity-50 hover:opacity-75 transition-opacity cursor-default"
                  >
                    <GripVertical size={14} className="text-d-fg4 flex-shrink-0 opacity-30" />
                    <Icon size={14} className="text-d-fg4 flex-shrink-0" />
                    <span className="text-xs text-d-fg3 flex-1">
                      {SECTION_TYPES[type].label}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggle(type)}
                      className="text-d-fg4 hover:text-d-fg2 transition-colors p-0.5 rounded"
                      title="Ajouter"
                    >
                      <Check size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function FileTextIcon(props) {
  return <Newspaper {...props} />;
}
