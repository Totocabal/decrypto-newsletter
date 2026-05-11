// ─────────────────────────────────────────────────────────────────────────────
// LoginPage — connexion par magic link
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | sent | error
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setError(null);
    const { error } = await signIn(email.trim());
    if (error) {
      setStatus("error");
      setError(error.message);
    } else {
      setStatus("sent");
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
      <div className="bg-white border border-stone-200 rounded-sm w-full max-w-md p-8">
        <div className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-medium mb-1">
          Coinhouse
        </div>
        <h1 className="text-2xl font-semibold text-stone-900 mb-1">
          Éditeur de newsletter
        </h1>
        <p className="text-sm text-stone-500 mb-8">
          Connecte-toi avec ton email — un lien de connexion sera envoyé dans ta
          boîte.
        </p>

        {status === "sent" ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-sm p-4 flex gap-3">
            <CheckCircle2 className="text-emerald-600 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <div className="text-sm font-medium text-emerald-900 mb-1">
                Lien envoyé
              </div>
              <div className="text-xs text-emerald-700 leading-relaxed">
                Ouvre l'email envoyé à <strong>{email}</strong> et clique sur le
                lien pour te connecter. Tu peux fermer cette page.
              </div>
            </div>
          </div>
        ) : (
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

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-sm p-3 text-xs text-red-800">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={status === "loading" || !email.trim()}
              className="w-full bg-stone-900 hover:bg-stone-700 text-white text-xs uppercase tracking-[0.18em] font-medium py-3 rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {status === "loading" ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Envoi…
                </>
              ) : (
                "Recevoir le lien"
              )}
            </button>
          </form>
        )}

        <p className="text-[11px] text-stone-400 mt-6 leading-relaxed">
          Pas encore de compte ? Connecte-toi une première fois — un admin
          validera ton accès dans la foulée.
        </p>
      </div>
    </div>
  );
}
