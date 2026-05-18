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
import { Loader2, Monitor, Moon, Sun } from "lucide-react";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import { DialogProvider } from "./components/Dialog.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { SetPasswordPage } from "./pages/SetPasswordPage.jsx";
import { PendingApprovalPage } from "./pages/PendingApprovalPage.jsx";
import { NewslettersListPage } from "./pages/NewslettersListPage.jsx";
import { EditorPage } from "./pages/EditorPage.jsx";
import { AdminPage } from "./pages/AdminPage.jsx";
import { SetupErrorPage } from "./pages/SetupErrorPage.jsx";
import { isSupabaseConfigured } from "./lib/supabase.js";
import { Wordmark } from "./components/Wordmark.jsx";

function readRouteFromHash() {
  if (typeof window === "undefined") return { name: "list" };
  const hash = window.location.hash.replace(/^#\/?/, "");
  const [name, id] = hash.split("/");
  if (name === "editor" && id) {
    return { name: "editor", id: decodeURIComponent(id) };
  }
  if (name === "admin") return { name: "admin" };
  return { name: "list" };
}

function writeRouteToHash(route) {
  if (typeof window === "undefined") return;
  const nextHash =
    route.name === "editor" && route.id
      ? `#/editor/${encodeURIComponent(route.id)}`
      : route.name === "admin"
        ? "#/admin"
        : "#/list";

  if (window.location.hash !== nextHash) {
    window.history.replaceState(null, "", nextHash);
  }
}

export default function App() {
  // Garde-fou config — affiché AVANT même de monter le provider, comme ça
  // pas de tentative de connexion silencieuse vers une URL bidon.
  if (!isSupabaseConfigured) {
    return <SetupErrorPage initError={null} />;
  }
  return (
    <AuthProvider>
      <DialogProvider>
        <Router />
      </DialogProvider>
    </AuthProvider>
  );
}

function Router() {
  const { user, profile, loading, profileLoading, initError, refreshProfile, resetLocalSession } = useAuth();
  const [route, setRoute] = useState(readRouteFromHash);
  const [longWait, setLongWait] = useState(false);
  const [uiTheme, setUiTheme] = useState(() => {
    if (typeof window === "undefined") return "system";
    const storedTheme = window.localStorage.getItem("decrypto-ui-theme");
    return ["system", "light", "dark"].includes(storedTheme) ? storedTheme : "system";
  });

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const applyTheme = () => {
      const resolvedTheme = uiTheme === "system"
        ? (media.matches ? "light" : "dark")
        : uiTheme;
      document.documentElement.classList.toggle("ui-light", resolvedTheme === "light");
      document.documentElement.dataset.uiTheme = uiTheme;
    };

    applyTheme();
    window.localStorage.setItem("decrypto-ui-theme", uiTheme);
    media.addEventListener?.("change", applyTheme);
    return () => media.removeEventListener?.("change", applyTheme);
  }, [uiTheme]);

  useEffect(() => {
    writeRouteToHash(route);
  }, [route]);

  useEffect(() => {
    const syncRouteFromHash = () => setRoute(readRouteFromHash());
    window.addEventListener("hashchange", syncRouteFromHash);
    return () => window.removeEventListener("hashchange", syncRouteFromHash);
  }, []);

  // Si `loading` persiste plus de 6s, on affiche un message rassurant et
  // un bouton "voir le diagnostic". Évite l'angoisse du "Chargement…" qui
  // tourne dans le vide.
  useEffect(() => {
    if (!loading && !profileLoading) {
      setLongWait(false);
      return;
    }
    const t = setTimeout(() => setLongWait(true), 6000);
    return () => clearTimeout(t);
  }, [loading, profileLoading]);

  // Erreur d'init → page de diag détaillée
  if (initError) {
    return <SetupErrorPage initError={initError} />;
  }

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-d-bg flex flex-col items-center justify-center p-6 gap-8">
        <Wordmark size={18} />
        <div className="flex flex-col items-center gap-4">
          <div className="text-xs uppercase tracking-[0.18em] text-d-fg3 flex items-center gap-2">
            <Loader2 className="animate-spin" size={14} />
            Chargement…
          </div>
          {longWait && (
            <div
              className="rounded-2xl p-5 max-w-md text-center border border-line"
              style={{ background: "rgb(var(--d-panel))" }}
            >
              <div className="text-xs text-d-fg3 mb-4 leading-relaxed">
                Ça prend plus longtemps que prévu. Possible problème de réseau
                ou de configuration.
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => window.location.reload()}
                  className="text-[10px] uppercase tracking-[0.18em] text-d-fg3 hover:text-d-fg border border-line hover:border-line2 px-3 py-1.5 rounded-full transition-colors"
                >
                  Recharger
                </button>
                <button
                  onClick={resetLocalSession}
                  className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#15151A] bg-white hover:bg-d-fg2 px-3 py-1.5 rounded-full transition-colors"
                >
                  Réinitialiser la session
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Connecté mais pas encore de profil (le trigger côté Supabase met parfois
  // 1-2s). On affiche un loader avec un bouton de relance.
  if (!profile) {
    return (
      <div className="min-h-screen bg-d-bg flex flex-col items-center justify-center p-6 gap-8">
        <Wordmark size={18} />
        <div
          className="rounded-2xl p-6 w-full max-w-md text-center border border-line"
          style={{ background: "rgb(var(--d-panel))" }}
        >
          <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.18em] text-d-fg3 mb-3">
            <Loader2 className="animate-spin" size={14} />
            Création du profil…
          </div>
          <div className="text-[11px] text-d-fg4 mb-4 leading-relaxed">
            Si ça persiste, vérifie que tu as bien exécuté{" "}
            <code
              className="px-1 rounded"
              style={{ background: "var(--d-line2)", color: "#03FFCF" }}
            >
              supabase/schema.sql
            </code>
            .
          </div>
          <button
            onClick={refreshProfile}
            className="text-[10px] uppercase tracking-[0.18em] text-d-fg3 hover:text-d-fg border border-line hover:border-line2 px-3 py-1.5 rounded-full transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!profile.approved) {
    return <PendingApprovalPage />;
  }

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
    <>
      <UiThemeToggle uiTheme={uiTheme} setUiTheme={setUiTheme} />
      <NewslettersListPage
        onOpen={(id) => setRoute({ name: "editor", id })}
        onOpenAdmin={() => setRoute({ name: "admin" })}
      />
    </>
  );
}

function UiThemeToggle({ uiTheme, setUiTheme, compact = false }) {
  const options = [
    { id: "system", label: "Système", icon: Monitor },
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
  ];

  return (
    <div
      className={`fixed right-4 z-[90] inline-flex items-center rounded-full border border-line bg-d-panel shadow-xl ${
        compact ? "bottom-3 p-0.5" : "bottom-4 p-1"
      }`}
      role="group"
      aria-label="Mode d'affichage de l'interface"
    >
      {options.map((option) => {
        const Icon = option.icon;
        const active = uiTheme === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setUiTheme(option.id)}
            aria-label={`Mode ${option.label}`}
            title={option.label}
            className={`inline-flex items-center justify-center rounded-full transition-colors ${
              compact ? "h-6 w-6" : "h-8 w-8"
            } ${
              active
                ? "bg-d-fg text-d-bg"
                : "text-d-fg3 hover:bg-d-panel2 hover:text-d-fg"
            }`}
          >
            <Icon size={compact ? 12 : 15} />
          </button>
        );
      })}
    </div>
  );
}
