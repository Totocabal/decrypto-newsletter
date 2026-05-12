// ─────────────────────────────────────────────────────────────────────────────
// App — routeur racine + gestion d'état global
// ─────────────────────────────────────────────────────────────────────────────
// Pages :
//   - SetupErrorPage         (config absente / invalide / init en erreur)
//   - LoginPage              (non connecté)
//   - SetPasswordPage        (connecté, pas encore défini de mot de passe)
//   - PendingApprovalPage    (connecté, pas encore approuvé)
//   - NewslettersListPage    (par défaut, connecté + approuvé)
//   - EditorPage             (édition d'une newsletter)
//   - AdminPage              (admin uniquement)

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { SetPasswordPage } from "./pages/SetPasswordPage.jsx";
import { PendingApprovalPage } from "./pages/PendingApprovalPage.jsx";
import { NewslettersListPage } from "./pages/NewslettersListPage.jsx";
import { EditorPage } from "./pages/EditorPage.jsx";
import { AdminPage } from "./pages/AdminPage.jsx";
import { SetupErrorPage } from "./pages/SetupErrorPage.jsx";
import { isSupabaseConfigured } from "./lib/supabase.js";

export default function App() {
  // Garde-fou config — affiché AVANT même de monter le provider, comme ça
  // pas de tentative de connexion silencieuse vers une URL bidon.
  if (!isSupabaseConfigured) {
    return <SetupErrorPage initError={null} />;
  }
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}

function Router() {
  const { user, profile, loading, initError, refreshProfile } = useAuth();
  const [route, setRoute] = useState({ name: "list" });
  const [longWait, setLongWait] = useState(false);

  // Si `loading` persiste plus de 6s, on affiche un message rassurant et
  // un bouton "voir le diagnostic". Évite l'angoisse du "Chargement…" qui
  // tourne dans le vide.
  useEffect(() => {
    if (!loading) {
      setLongWait(false);
      return;
    }
    const t = setTimeout(() => setLongWait(true), 6000);
    return () => clearTimeout(t);
  }, [loading]);

  // Erreur d'init → page de diag détaillée
  if (initError) {
    return <SetupErrorPage initError={initError} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="text-xs uppercase tracking-[0.18em] text-stone-500 flex items-center gap-2">
            <Loader2 className="animate-spin" size={14} />
            Chargement…
          </div>
          {longWait && (
            <div className="bg-white border border-amber-200 rounded-sm p-4 max-w-md text-center">
              <div className="text-xs text-stone-600 mb-3">
                Ça prend plus longtemps que prévu. Possible problème de réseau
                ou de configuration.
              </div>
              <button
                onClick={() => window.location.reload()}
                className="text-[10px] uppercase tracking-[0.18em] text-stone-700 border border-stone-300 hover:border-stone-500 px-3 py-1.5 rounded-sm"
              >
                Recharger
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  // Connecté mais pas encore de profil (le trigger côté Supabase met parfois
  // 1-2s). On affiche un loader avec un bouton de relance.
  if (!profile) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
        <div className="bg-white border border-stone-200 rounded-sm p-6 max-w-md text-center">
          <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.18em] text-stone-500 mb-3">
            <Loader2 className="animate-spin" size={14} />
            Création du profil…
          </div>
          <div className="text-[11px] text-stone-400 mb-4">
            Si ça persiste, vérifie que tu as bien exécuté{" "}
            <code className="bg-stone-100 px-1">supabase/schema.sql</code>.
          </div>
          <button
            onClick={refreshProfile}
            className="text-[10px] uppercase tracking-[0.18em] text-stone-700 border border-stone-300 hover:border-stone-500 px-3 py-1.5 rounded-sm"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!profile.approved) return <PendingApprovalPage />;

  // Approuvé mais sans mot de passe défini → on l'invite à en créer un.
  // Ça concerne tous les nouveaux comptes (qui se sont logués en magic link)
  // et tous les anciens (avant cette feature). L'utilisateur peut skip — dans
  // ce cas le flag est marqué à true et la page n'apparaîtra plus.
  if (profile.password_set === false) {
    return <SetPasswordPage onDone={refreshProfile} />;
  }

  // Approuvé → routes internes
  if (route.name === "editor") {
    return (
      <EditorPage
        newsletterId={route.id}
        onBack={() => setRoute({ name: "list" })}
      />
    );
  }
  if (route.name === "admin") {
    return <AdminPage onBack={() => setRoute({ name: "list" })} />;
  }
  return (
    <NewslettersListPage
      onOpen={(id) => setRoute({ name: "editor", id })}
      onOpenAdmin={() => setRoute({ name: "admin" })}
    />
  );
}
