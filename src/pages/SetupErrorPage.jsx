// ─────────────────────────────────────────────────────────────────────────────
// SetupErrorPage — affichée si la config Supabase est invalide ou si l'init
// échoue (timeout, RLS, …). Donne à l'utilisateur tout ce qu'il faut pour
// diagnostiquer sans aller fouiller la console.
// ─────────────────────────────────────────────────────────────────────────────

import { AlertTriangle, RefreshCw, ExternalLink } from "lucide-react";
import { configStatus } from "../lib/supabase.js";

export function SetupErrorPage({ initError }) {
  // Liste des checks pour aider à diagnostiquer
  const checks = [
    {
      label: "VITE_SUPABASE_URL définie",
      ok: configStatus.urlPresent,
      detail: configStatus.urlPresent ? configStatus.url : "(non définie)",
    },
    {
      label: "VITE_SUPABASE_URL pas un placeholder",
      ok: !configStatus.urlIsPlaceholder,
      detail: configStatus.urlIsPlaceholder
        ? "Encore la valeur d'exemple — remplace par ton vrai projet"
        : "OK",
    },
    {
      label: "VITE_SUPABASE_URL au format attendu",
      ok: configStatus.urlValid,
      detail: configStatus.urlValid
        ? "OK"
        : "Doit être https://xxx.supabase.co",
    },
    {
      label: "VITE_SUPABASE_ANON_KEY définie",
      ok: configStatus.keyPresent,
      detail: configStatus.anonKey,
    },
    {
      label: "VITE_SUPABASE_ANON_KEY pas un placeholder",
      ok: !configStatus.keyIsPlaceholder,
      detail: configStatus.keyIsPlaceholder
        ? "Encore la valeur d'exemple"
        : "OK",
    },
    {
      label: "VITE_SUPABASE_ANON_KEY au format JWT",
      ok: configStatus.keyValid,
      detail: configStatus.keyValid
        ? "OK"
        : "Doit commencer par 'eyJ' et faire >100 caractères",
    },
  ];

  const allOk = checks.every((c) => c.ok);

  return (
    <div className="min-h-screen bg-stone-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white border border-red-200 rounded-sm p-6 mb-4">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="text-red-600 flex-shrink-0 mt-1" size={20} />
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-red-600 font-medium mb-1">
                Configuration
              </div>
              <h1 className="text-lg font-semibold text-stone-900">
                {initError
                  ? "Connexion à Supabase impossible"
                  : "Configuration Supabase incomplète"}
              </h1>
            </div>
          </div>

          {initError && (
            <div className="bg-red-50 border border-red-200 rounded-sm p-4 mb-4">
              <div className="text-sm font-medium text-red-900 mb-1">
                {initError.message}
              </div>
              {initError.hint && (
                <div className="text-xs text-red-700 whitespace-pre-line">
                  {initError.hint}
                </div>
              )}
            </div>
          )}

          <div className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-medium mb-2">
            Diagnostic
          </div>
          <ul className="space-y-2 mb-6">
            {checks.map((c, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-sm"
              >
                <span
                  className={`flex-shrink-0 w-4 h-4 rounded-full mt-0.5 flex items-center justify-center text-[10px] font-bold ${
                    c.ok
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {c.ok ? "✓" : "×"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={c.ok ? "text-stone-700" : "text-stone-900 font-medium"}>
                    {c.label}
                  </div>
                  <div
                    className={`text-[11px] truncate ${
                      c.ok ? "text-stone-400" : "text-red-600"
                    }`}
                    title={c.detail}
                  >
                    {c.detail}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-700 text-white text-[10px] uppercase tracking-[0.18em] font-medium rounded-sm transition-colors"
          >
            <RefreshCw size={12} />
            Recharger
          </button>
        </div>

        {!allOk && (
          <div className="bg-white border border-stone-200 rounded-sm p-6">
            <div className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-medium mb-2">
              Comment corriger
            </div>
            <ol className="space-y-3 text-sm text-stone-700 list-decimal list-inside">
              <li>
                Crée un fichier <code className="bg-stone-100 px-1.5 py-0.5 rounded-sm text-[12px]">.env</code> à la racine du projet (à côté de <code className="bg-stone-100 px-1.5 py-0.5 rounded-sm text-[12px]">package.json</code>).
              </li>
              <li>
                Récupère tes clés dans Supabase : <em>Project Settings → API</em>.
                <a
                  href="https://supabase.com/dashboard/projects"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 ml-2 text-stone-900 underline hover:no-underline"
                >
                  Ouvrir Supabase <ExternalLink size={11} />
                </a>
              </li>
              <li>
                Colle ces deux lignes dans <code className="bg-stone-100 px-1.5 py-0.5 rounded-sm text-[12px]">.env</code> :
                <pre className="bg-stone-900 text-stone-100 mt-2 p-3 text-[12px] rounded-sm overflow-x-auto">
{`VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...`}
                </pre>
              </li>
              <li>
                <strong>Arrête puis relance</strong> <code className="bg-stone-100 px-1.5 py-0.5 rounded-sm text-[12px]">npm run dev</code> — Vite ne recharge pas le <code className="bg-stone-100 px-1.5 py-0.5 rounded-sm text-[12px]">.env</code> à chaud.
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
