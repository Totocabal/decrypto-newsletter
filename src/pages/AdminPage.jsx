// ─────────────────────────────────────────────────────────────────────────────
// AdminPage — gestion des comptes (approbation, droits admin)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Loader2,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../contexts/AuthContext.jsx";

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
    <div className="min-h-screen bg-stone-100">
      <header className="bg-white border-b border-stone-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-medium text-stone-600 hover:text-stone-900 px-3 py-2 border border-stone-300 hover:border-stone-500 rounded-sm"
          >
            <ArrowLeft size={12} />
            Retour
          </button>
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-medium">
              Administration
            </div>
            <h1 className="text-lg font-semibold text-stone-900">
              Comptes utilisateurs
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {loading && (
          <div className="text-xs text-stone-400 text-center p-8">
            Chargement…
          </div>
        )}

        {/* Création */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-medium">
              Créer un compte
            </h2>
          </div>
          <div className="bg-white border border-stone-200 rounded-sm p-4">
            <form
              onSubmit={handleCreateAccount}
              className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end"
            >
              <div>
                <label className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-medium block mb-2">
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
                  className="w-full px-3 py-2 border border-stone-300 rounded-sm text-sm focus:outline-none focus:border-stone-900"
                  disabled={creating}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-medium block mb-2">
                  Nom
                </label>
                <input
                  type="text"
                  value={createForm.fullName}
                  onChange={(e) =>
                    setCreateForm((form) => ({ ...form, fullName: e.target.value }))
                  }
                  placeholder="Nom affiché"
                  className="w-full px-3 py-2 border border-stone-300 rounded-sm text-sm focus:outline-none focus:border-stone-900"
                  disabled={creating}
                />
              </div>
              <label className="flex items-center gap-2 px-2 py-2 text-xs text-stone-600 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={createForm.isAdmin}
                  onChange={(e) =>
                    setCreateForm((form) => ({ ...form, isAdmin: e.target.checked }))
                  }
                  className="h-4 w-4 accent-stone-900"
                  disabled={creating}
                />
                Admin
              </label>
              <button
                type="submit"
                disabled={creating || !createForm.email.trim()}
                className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.18em] font-medium text-white bg-stone-900 hover:bg-stone-700 px-4 py-2.5 rounded-sm disabled:opacity-50"
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
              <div className="mt-4 border border-emerald-200 bg-emerald-50 rounded-sm p-4">
                <div className="text-sm font-medium text-emerald-900 mb-2">
                  Compte créé
                </div>
                <div className="grid gap-1 text-xs text-emerald-800 font-mono">
                  <div>Email : {createdAccount.email}</div>
                  <div>Mot de passe temporaire : {createdAccount.password}</div>
                </div>
                <button
                  type="button"
                  onClick={copyCreatedAccount}
                  className="mt-3 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-medium text-emerald-900 border border-emerald-300 hover:border-emerald-600 px-3 py-1.5 rounded-sm"
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
            <h2 className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-medium">
              En attente d'approbation
            </h2>
            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-sm font-medium">
              {pending.length}
            </span>
          </div>
          {pending.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-sm p-6 text-xs text-stone-400 text-center">
              Aucun compte en attente.
            </div>
          ) : (
            <div className="bg-white border border-stone-200 rounded-sm divide-y divide-stone-100">
              {pending.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-4 px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-stone-900">
                      {p.full_name || p.email}
                    </div>
                    <div className="text-[11px] text-stone-500">
                      {p.email} · inscrit le {formatDate(p.created_at)}
                    </div>
                  </div>
                  <button
                    onClick={() => updateProfile(p.id, { approved: true })}
                    className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-medium text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-sm"
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
            <h2 className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-medium">
              Comptes approuvés
            </h2>
            <span className="text-[10px] bg-stone-200 text-stone-700 px-2 py-0.5 rounded-sm font-medium">
              {approved.length}
            </span>
          </div>
          <div className="bg-white border border-stone-200 rounded-sm divide-y divide-stone-100">
            {approved.map((p) => {
              const isSelf = p.id === currentProfile?.id;
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-4 px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-stone-900">
                        {p.full_name || p.email}
                      </span>
                      {p.is_admin && (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] font-medium bg-stone-900 text-white px-2 py-0.5 rounded-sm">
                          <ShieldCheck size={10} />
                          Admin
                        </span>
                      )}
                      {isSelf && (
                        <span className="text-[10px] uppercase tracking-[0.14em] font-medium text-stone-400">
                          (toi)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-stone-500">{p.email}</div>
                  </div>
                  {!isSelf && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          updateProfile(p.id, { is_admin: !p.is_admin })
                        }
                        className="text-[10px] uppercase tracking-[0.18em] font-medium text-stone-600 hover:text-stone-900 px-3 py-1.5 border border-stone-200 hover:border-stone-500 rounded-sm"
                      >
                        {p.is_admin ? "Retirer admin" : "Promouvoir admin"}
                      </button>
                      <button
                        onClick={() =>
                          confirm(`Révoquer l'accès de ${p.email} ?`) &&
                          updateProfile(p.id, { approved: false, is_admin: false })
                        }
                        className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-medium text-red-700 hover:bg-red-50 px-3 py-1.5 border border-red-200 hover:border-red-500 rounded-sm"
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
      </main>
    </div>
  );
}
