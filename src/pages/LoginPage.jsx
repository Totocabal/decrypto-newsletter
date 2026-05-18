// ─────────────────────────────────────────────────────────────────────────────
// LoginPage — connexion par mot de passe (principal) ou magic link (fallback)
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { Mail, Lock, Loader2, CheckCircle2, ArrowRight, KeyRound } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { Wordmark } from "../components/Wordmark.jsx";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#4285F4" d="M47.5 24.5c0-1.6-.1-3.2-.4-4.7H24.5v9h13.1c-.6 3-2.3 5.5-4.8 7.2v6h7.8c4.5-4.2 7.1-10.3 7.1-17.5z"/><path fill="#34A853" d="M24.5 48c6.5 0 12-2.2 16-5.9l-7.8-6c-2.2 1.5-5 2.3-8.2 2.3-6.3 0-11.6-4.2-13.5-9.9H3v6.2C7 42.8 15.2 48 24.5 48z"/><path fill="#FBBC04" d="M11 28.5c-.5-1.5-.8-3-.8-4.5s.3-3 .8-4.5V13.3H3C1.1 17 0 20.6 0 24.5s1.1 7.5 3 11.2L11 28.5z"/><path fill="#EA4335" d="M24.5 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C36.5 2.2 31 0 24.5 0 15.2 0 7 5.2 3 13.3l8 6.2c1.9-5.7 7.2-10 13.5-10z"/></svg>
);

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
  const { signInWithPassword, signInWithMagicLink, requestPasswordRecovery, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [sentKind, setSentKind] = useState("magic");
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    const { error } = await signInWithGoogle();
    if (error) {
      setGoogleLoading(false);
      setError(getAuthErrorMessage(error));
    }
    // On success the browser redirects, so no need to reset loading
  };

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
        if (/invalid login credentials/i.test(error.message)) {
          setError(
            "Email ou mot de passe incorrect. Si tu n'as jamais défini de mot de passe, utilise le lien magique pour ta première connexion."
          );
        } else {
          setError(getAuthErrorMessage(error));
        }
      } else {
        setStatus("idle");
      }
    } else {
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
    <div className="min-h-screen bg-d-bg flex items-center justify-center p-6">
      <div
        className="w-full max-w-md p-8 rounded-2xl border border-line"
        style={{ background: "#1E1E22" }}
      >
        {/* Logo */}
        <div className="mb-8">
          <Wordmark size={18} />
        </div>

        {status === "sent" ? (
          <div
            className="rounded-xl p-4 flex gap-3"
            style={{ background: "rgba(3,255,207,0.08)", border: "1px solid rgba(3,255,207,0.20)" }}
          >
            <CheckCircle2 style={{ color: "#03FFCF", flexShrink: 0, marginTop: 2 }} size={18} />
            <div>
              <div className="text-sm font-semibold mb-1" style={{ color: "#03FFCF" }}>
                {sentKind === "recovery" ? "Lien de récupération envoyé" : "Lien envoyé"}
              </div>
              <div className="text-xs text-d-fg3 leading-relaxed">
                {sentKind === "recovery"
                  ? "Ouvre l'email envoyé à "
                  : "Ouvre l'email envoyé à "}
                <strong className="text-d-fg">{email}</strong>
                {sentKind === "recovery"
                  ? " et clique sur le lien pour réinitialiser ton mot de passe."
                  : " et clique sur le lien pour te connecter. Tu peux fermer cette page."}
              </div>
              <button
                onClick={() => {
                  setStatus("idle");
                  setError(null);
                }}
                className="mt-3 text-[10px] uppercase tracking-[0.18em] text-d-fg3 hover:text-d-fg underline transition-colors"
              >
                Revenir
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Onglets Connexion / Lien magique */}
            <div className="flex items-center bg-d-panel2 rounded-full p-1 mb-6 border border-line">
              <button
                type="button"
                onClick={() => {
                  setMode("password");
                  setError(null);
                  setStatus("idle");
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] uppercase tracking-[0.14em] rounded-full transition-colors font-semibold ${
                  mode === "password"
                    ? "bg-white text-[#15151A]"
                    : "text-d-fg3 hover:text-d-fg2"
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
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] uppercase tracking-[0.14em] rounded-full transition-colors font-semibold ${
                  mode === "magic"
                    ? "bg-white text-[#15151A]"
                    : "text-d-fg3 hover:text-d-fg2"
                }`}
              >
                <Mail size={12} />
                Lien magique
              </button>
            </div>

            <p className="text-xs text-d-fg3 mb-5 leading-relaxed">
              {mode === "password"
                ? "Saisis ton email et ton mot de passe."
                : "Reçois un lien de connexion par email pour un compte déjà créé."}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-[0.18em] text-d-fg3 font-semibold block mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-d-fg4 pointer-events-none"
                  />
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="prenom.nom@coinhouse.com"
                    className="w-full pl-10 pr-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-line2 bg-d-panel2 text-d-fg placeholder:text-d-fg4 transition-colors"
                    disabled={status === "loading"}
                  />
                </div>
              </div>

              {mode === "password" && (
                <div>
                  <label className="text-[10px] uppercase tracking-[0.18em] text-d-fg3 font-semibold block mb-2">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-d-fg4 pointer-events-none"
                    />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:border-line2 bg-d-panel2 text-d-fg placeholder:text-d-fg4 transition-colors"
                      disabled={status === "loading"}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div
                  className="rounded-xl p-3 text-xs leading-relaxed"
                  style={{
                    background: "rgba(255,75,40,0.10)",
                    border: "1px solid rgba(255,75,40,0.20)",
                    color: "#FF8466",
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={status === "loading" || !email.trim() || (mode === "password" && !password)}
                className="w-full text-[#15151A] text-xs uppercase tracking-[0.18em] font-semibold py-3 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: "#FFFFFF" }}
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
                className="mt-4 text-[11px] text-d-fg4 hover:text-d-fg2 underline w-full text-center transition-colors"
              >
                Mot de passe oublié ? Recevoir un lien de récupération.
              </button>
            )}

            <p className="text-[11px] text-d-fg4 mt-6 leading-relaxed">
              Pas encore de compte ? Demande à un admin de t'inviter ou de
              créer ton accès dans Supabase.
            </p>

            {/* Google OAuth */}
            <div className="flex items-center gap-3 mt-5">
              <div className="flex-1 h-px" style={{ background: "var(--d-line)" }} />
              <span className="text-[10px] text-d-fg4 uppercase tracking-[0.14em] shrink-0">ou</span>
              <div className="flex-1 h-px" style={{ background: "var(--d-line)" }} />
            </div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || status === "loading"}
              className="mt-3 w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "#2a2a2e", border: "1px solid #3a3a3a" }}
            >
              {googleLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              Continuer avec Google
            </button>
          </>
        )}
      </div>
    </div>
  );
}
