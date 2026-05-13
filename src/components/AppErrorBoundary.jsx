import React from "react";

const DRAFT_KEY = "decrypto-newsletter-draft-v1";
const DRAFT_RECOVERY_KEY = "decrypto-newsletter-draft-recovery-v1";
const ERROR_DIAGNOSTIC_KEY = "decrypto-last-render-error-v1";
const AUTO_RELOAD_STABLE_RESET_MS = 15000;

function storeDiagnostic(payload) {
  try {
    sessionStorage.setItem(
      ERROR_DIAGNOSTIC_KEY,
      JSON.stringify({
        ...payload,
        url: window.location.href,
        visibilityState: document.visibilityState,
        at: new Date().toISOString(),
      })
    );
  } catch {
    // Diagnostic storage is best effort.
  }
}

async function clearBrowserCache() {
  try {
    localStorage.removeItem(DRAFT_KEY);
    Object.keys(localStorage)
      .filter((key) => key.startsWith("sb-"))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignore storage failures: the reload below is still useful.
  }

  try {
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    }
  } catch {
    // Cache API may be unavailable or blocked in some browsers.
  }

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch {
    // Best effort only.
  }
}

export class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.clearAutoReloadTimer = null;
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidMount() {
    this.clearAutoReloadTimer = setTimeout(() => {
      try {
        sessionStorage.removeItem(ERROR_DIAGNOSTIC_KEY);
      } catch {
        // Session storage may be blocked.
      }
    }, AUTO_RELOAD_STABLE_RESET_MS);

    this.handleWindowError = (event) => {
      storeDiagnostic({
        source: "window.error",
        message: event.error?.message || event.message || "Erreur JavaScript",
        stack: event.error?.stack || "",
        filename: event.filename || "",
        line: event.lineno || "",
        column: event.colno || "",
      });
    };
    this.handleUnhandledRejection = (event) => {
      const reason = event.reason;
      storeDiagnostic({
        source: "unhandledrejection",
        message: reason?.message || String(reason),
        stack: reason?.stack || "",
      });
    };
    window.addEventListener("error", this.handleWindowError);
    window.addEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("[app] crash rendu:", error, info);

    storeDiagnostic({
      source: "react-error-boundary",
      message: error?.message || String(error),
      stack: error?.stack || "",
      componentStack: info?.componentStack || "",
    });

  }

  componentWillUnmount() {
    if (this.clearAutoReloadTimer) clearTimeout(this.clearAutoReloadTimer);
    window.removeEventListener("error", this.handleWindowError);
    window.removeEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  reload = () => {
    window.location.reload();
  };

  clearCacheAndReload = async () => {
    await clearBrowserCache();
    const url = new URL(window.location.href);
    url.searchParams.set("refresh", Date.now().toString());
    window.location.replace(url.toString());
  };

  openWithoutDraft = () => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        localStorage.setItem(DRAFT_RECOVERY_KEY, draft);
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch {
      // If storage is unavailable, a regular reload is still the best fallback.
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    let diagnostic = null;
    try {
      diagnostic = JSON.parse(sessionStorage.getItem(ERROR_DIAGNOSTIC_KEY) || "null");
    } catch {
      diagnostic = null;
    }

    return (
      <div className="min-h-screen bg-[#141416] flex items-center justify-center p-6 text-[#F1F2F5]">
        <div className="w-full max-w-2xl border border-white/10 bg-[#1E1E22] rounded-sm overflow-hidden shadow-2xl">
          <div className="h-1 bg-gradient-to-r from-[#8701FF] via-[#ff00aa] to-[#03FFCF]" />
          <div className="p-7 sm:p-9">
            <div className="text-[10px] uppercase tracking-[0.24em] text-[#ff00aa] font-semibold mb-5">
              Éditeur interrompu
            </div>
            <h1 className="font-sora text-3xl sm:text-4xl font-semibold tracking-tight text-white mb-4">
              L'application a rencontré une erreur
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-stone-300 max-w-xl mb-7">
              Le rechargement automatique est désactivé pour afficher le
              diagnostic. Envoie le bloc ci-dessous pour identifier la cause.
            </p>
            {diagnostic?.message && (
              <div className="mb-7 rounded-sm border border-white/10 bg-black/25 p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[#03FFCF] font-semibold mb-2">
                  Diagnostic
                </div>
                <pre className="max-h-44 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-stone-300">
                  {[
                    diagnostic.source && `source: ${diagnostic.source}`,
                    diagnostic.message,
                    diagnostic.filename &&
                      `fichier: ${diagnostic.filename}:${diagnostic.line}:${diagnostic.column}`,
                    diagnostic.visibilityState && `onglet: ${diagnostic.visibilityState}`,
                    diagnostic.componentStack,
                    diagnostic.stack,
                  ].filter(Boolean).join("\n\n")}
                </pre>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={this.reload}
                className="text-[10px] uppercase tracking-[0.18em] text-stone-200 border border-white/15 hover:border-white/35 hover:bg-white/5 px-4 py-3 rounded-sm transition-colors"
              >
                Recharger
              </button>
              <button
                onClick={this.openWithoutDraft}
                className="text-[10px] uppercase tracking-[0.18em] text-white bg-[#ff00aa] hover:bg-[#d90091] px-4 py-3 rounded-sm transition-colors"
              >
                Ouvrir sans brouillon
              </button>
              <button
                onClick={this.clearCacheAndReload}
                className="text-[10px] uppercase tracking-[0.18em] text-stone-950 bg-[#03FFCF] hover:bg-[#00d9b0] px-4 py-3 rounded-sm transition-colors"
              >
                Réinitialiser local
              </button>
            </div>
            <div className="mt-6 border-t border-white/10 pt-5 text-[11px] leading-relaxed text-stone-500">
              Le bouton "Réinitialiser local" nettoie aussi la session locale.
              À utiliser seulement si l'ouverture sans brouillon ne suffit pas.
            </div>
          </div>
        </div>
      </div>
    );
  }
}
