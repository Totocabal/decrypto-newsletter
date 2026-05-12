// ─────────────────────────────────────────────────────────────────────────────
// SetPasswordPage — affichée après un magic-link login si l'utilisateur
// n'a pas encore défini de mot de passe. L'incite à en définir un pour les
// connexions futures, avec option de skip.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { Lock, Loader2, CheckCircle2, ArrowRight, SkipForward } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";

const MIN_LENGTH = 8;

export function SetPasswordPage({ onDone }) {
  const { updatePassword, profile, refreshProfile } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < MIN_LENGTH) {
      setError(`Mot de passe trop court (${MIN_LENGTH} caractères minimum).`);
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setError(null);
    setStatus("loading");

    const { error: pwError } = await updatePassword(password);
    if (pwError) {
      setStatus("error");
      setError(pwError.message);
      return;
    }

    // Marque le profil comme ayant un mot de passe défini
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ password_set: true })
      .eq("id", profile.id);
    if (profileError) {
      // eslint-disable-next-line no-console
      console.error("[set-password] flag update:", profileError);
      // On continue quand même — le password a été défini, c'est l'essentiel
    }

    await refreshProfile();
    onDone();
  };

  const handleSkip = async () => {
    // Pour ne plus afficher cette page à chaque login, on marque quand même
    // password_set = true côté profil. L'utilisateur garde l'option du magic
    // link comme moyen de connexion principal.
    await supabase
      .from("profiles")
      .update({ password_set: true })
      .eq("id", profile.id);
    await refreshProfile();
    onDone();
  };

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
      <div className="bg-white border border-stone-200 rounded-sm w-full max-w-md p-8">
        <div className="bg-emerald-50 border border-emerald-200 rounded-sm p-3 mb-6 flex gap-3">
          <CheckCircle2 className="text-emerald-600 flex-shrink-0 mt-0.5" size={16} />
          <div className="text-xs text-emerald-900 leading-relaxed">
            Connecté avec succès. Avant de continuer, tu peux définir un mot de
            passe pour te connecter plus rapidement la prochaine fois.
          </div>
        </div>

        <div className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-medium mb-1">
          Coinhouse
        </div>
        <h1 className="text-xl font-semibold text-stone-900 mb-2">
          Définir un mot de passe
        </h1>
        <p className="text-xs text-stone-500 mb-6 leading-relaxed">
          Optionnel. Le lien magique restera toujours disponible comme moyen de
          récupération.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-medium block mb-2">
              Mot de passe ({MIN_LENGTH} caractères min.)
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
              />
              <input
                type="password"
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border border-stone-300 rounded-sm text-sm focus:outline-none focus:border-stone-900"
                disabled={status === "loading"}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-medium block mb-2">
              Confirmer
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
              />
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border border-stone-300 rounded-sm text-sm focus:outline-none focus:border-stone-900"
                disabled={status === "loading"}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-sm p-3 text-xs text-red-800 leading-relaxed">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "loading" || !password || !confirm}
            className="w-full bg-stone-900 hover:bg-stone-700 text-white text-xs uppercase tracking-[0.18em] font-medium py-3 rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {status === "loading" ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Enregistrement…
              </>
            ) : (
              <>
                Enregistrer le mot de passe
                <ArrowRight size={12} />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSkip}
            disabled={status === "loading"}
            className="w-full flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.18em] text-stone-500 hover:text-stone-900 py-2 transition-colors"
          >
            <SkipForward size={12} />
            Passer cette étape
          </button>
        </form>
      </div>
    </div>
  );
}
