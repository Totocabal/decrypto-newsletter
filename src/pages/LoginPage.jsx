// ─────────────────────────────────────────────────────────────────────────────
// LoginPage — connexion par mot de passe (principal) ou magic link (fallback)
// ─────────────────────────────────────────────────────────────────────────────
// Deux onglets :
//   - Connexion : email + mot de passe (méthode privilégiée)
//   - Lien magique : email seul, lien envoyé par mail (fallback / récupération
//     / premier login pour un nouveau compte)

import { useState } from "react";
import { Mail, Lock, Loader2, CheckCircle2, ArrowRight, KeyRound } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";

function getAuthErrorMessage(error) {
  const message = error?.message || String(error || "");

  if (/user not found|signup disabled|invalid login credentials/i.test(message)) {
    return "Aucun compte n'existe encore pour cet email. Demande à un admin de créer/inviter ce compte, puis réessaie le lien magique.";
  }

  if (/error sending confirmation email|error sending magic link|email/i.test(message)) {
    return "Supabase n'arrive pas à envoyer l'email. Vérifie dans Supabase Authentication que l'envoi d'emails/SMTP est configuré et que l'URL de redirection est autorisée.";
  }

  return message;
}

export function LoginPage() {
  const { signInWithPassword, signInWithMagicLink, requestPasswordRecovery } = useAuth();
  // mode = "password" | "magic"
  const [mode, setMode] = useState("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | sent | error
  const [error, setError] = useState(null);
  const [sentKind, setSentKind] = useState("magic"); // magic | recovery

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setError(null);

    if (mode === "password") {
      if (!password) {
        setStatus("error");
        setError("Saisis ton mot de passe.");
        return;
      }
      const { error } = await signInWithPassword(email.trim(), password);
      if (error) {
        setStatus("error");
        // Message d'erreur clair pour le cas courant
        if (/invalid login credentials/i.test(error.message)) {
          setError(
            "Email ou mot de passe incorrect. Si tu n'as jamais défini de mot de passe, utilise le lien magique pour ta première connexion."
          );
        } else {
          setError(getAuthErrorMessage(error));
        }
      } else {
        // L'AuthContext va capter la session et rediriger automatiquement
        setStatus("idle");
      }
    } else {
      // mode "magic"
      const { error } = await signInWithMagicLink(email.trim());
      if (error) {
        setStatus("error");
        setError(getAuthErrorMessage(error));
      } else {
        setStatus("sent");
      }
    }
  };

  const handlePasswordRecovery = async () => {
    if (!email.trim()) {
      setStatus("error");
      setError("Saisis ton email avant de demander un lien de récupération.");
      return;
    }

    setStatus("loading");
    setError(null);
    const { error } = await requestPasswordRecovery(email.trim());
    if (error) {
      setStatus("error");
      setError(getAuthErrorMessage(error));
      return;
    }

    setSentKind("recovery");
    setStatus("sent");
  };

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
      <div className="bg-white border border-stone-200 rounded-sm w-full max-w-md p-8">
        <div className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-medium mb-1">
          Coinhouse
        </div>
        <h1 className="text-2xl font-semibold text-stone-900 mb-6">
          Éditeur de newsletter
        </h1>

        {status === "sent" ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-sm p-4 flex gap-3">
            <CheckCircle2 className="text-emerald-600 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <div className="text-sm font-medium text-emerald-900 mb-1">
                {sentKind === "recovery" ? "Lien de récupération envoyé" : "Lien envoyé"}
              </div>
              <div className="text-xs text-emerald-700 leading-relaxed">
                {sentKind === "recovery"
                  ? "Ouvre l'email envoyé à "
                  : "Ouvre l'email envoyé à "}
                <strong>{email}</strong>
                {sentKind === "recovery"
                  ? " et clique sur le lien pour réinitialiser ton mot de passe."
                  : " et clique sur le lien pour te connecter. Tu peux fermer cette page."}
              </div>
              <button
                onClick={() => {
                  setStatus("idle");
                  setError(null);
                }}
                className="mt-3 text-[10px] uppercase tracking-[0.18em] text-emerald-800 hover:text-emerald-950 underline"
              >
                Revenir
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Onglets Connexion / Lien magique */}
            <div className="flex items-center bg-stone-100 rounded-sm p-0.5 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode("password");
                  setError(null);
                  setStatus("idle");
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] uppercase tracking-[0.18em] rounded-sm transition-colors ${
                  mode === "password"
                    ? "bg-white text-stone-800 shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                <KeyRound size={12} />
                Connexion
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("magic");
                  setError(null);
                  setStatus("idle");
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] uppercase tracking-[0.18em] rounded-sm transition-colors ${
                  mode === "magic"
                    ? "bg-white text-stone-800 shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                <Mail size={12} />
                Lien magique
              </button>
            </div>

            <p className="text-xs text-stone-500 mb-5 leading-relaxed">
              {mode === "password"
                ? "Saisis ton email et ton mot de passe."
                : "Reçois un lien de connexion par email pour un compte déjà créé."}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-medium block mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                  />
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="prenom.nom@coinhouse.com"
                    className="w-full pl-10 pr-3 py-2.5 border border-stone-300 rounded-sm text-sm focus:outline-none focus:border-stone-900"
                    disabled={status === "loading"}
                  />
                </div>
              </div>

              {mode === "password" && (
                <div>
                  <label className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-medium block mb-2">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                    />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3 py-2.5 border border-stone-300 rounded-sm text-sm focus:outline-none focus:border-stone-900"
                      disabled={status === "loading"}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-sm p-3 text-xs text-red-800 leading-relaxed">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={status === "loading" || !email.trim() || (mode === "password" && !password)}
                className="w-full bg-stone-900 hover:bg-stone-700 text-white text-xs uppercase tracking-[0.18em] font-medium py-3 rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {mode === "password" ? "Connexion…" : "Envoi…"}
                  </>
                ) : (
                  <>
                    {mode === "password" ? "Se connecter" : "Recevoir le lien"}
                    <ArrowRight size={12} />
                  </>
                )}
              </button>
            </form>

            {mode === "password" && (
              <button
                type="button"
                onClick={handlePasswordRecovery}
                disabled={status === "loading"}
                className="mt-4 text-[11px] text-stone-500 hover:text-stone-900 underline w-full text-center"
              >
                Mot de passe oublié ? Recevoir un lien de récupération.
              </button>
            )}

            <p className="text-[11px] text-stone-400 mt-6 leading-relaxed">
              Pas encore de compte ? Demande à un admin de t'inviter ou de
              créer ton accès dans Supabase.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
