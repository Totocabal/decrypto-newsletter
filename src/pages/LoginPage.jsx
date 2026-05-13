// ─────────────────────────────────────────────────────────────────────────────
// LoginPage — connexion par mot de passe (principal) ou magic link (fallback)
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { Mail, Lock, Loader2, CheckCircle2, ArrowRight, KeyRound } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { Wordmark } from "../components/Wordmark.jsx";

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
  const [mode, setMode] = useState("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [sentKind, setSentKind] = useState("magic");

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
          </>
        )}
      </div>
    </div>
  );
}
