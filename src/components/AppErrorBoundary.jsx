import React from "react";

const DRAFT_KEY = "decrypto-newsletter-draft-v1";
const DRAFT_RECOVERY_KEY = "decrypto-newsletter-draft-recovery-v1";
const AUTO_RELOAD_KEY = "decrypto-auto-reload-after-crash-v1";
const AUTO_RELOAD_MAX_ATTEMPTS = 3;
const AUTO_RELOAD_DELAYS_MS = [250, 750, 1250];
const AUTO_RELOAD_STABLE_RESET_MS = 15000;

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
    this.state = { error: null, autoReloading: false, reloadAttempt: 0 };
    this.clearAutoReloadTimer = null;
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidMount() {
    this.clearAutoReloadTimer = setTimeout(() => {
      try {
        sessionStorage.removeItem(AUTO_RELOAD_KEY);
      } catch {
        // Session storage may be blocked.
      }
    }, AUTO_RELOAD_STABLE_RESET_MS);
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("[app] crash rendu:", error, info);

    let recovery = { attempts: 0, startedAt: Date.now() };
    try {
      const stored = sessionStorage.getItem(AUTO_RELOAD_KEY);
      if (stored === "1") {
        recovery = { attempts: 1, startedAt: Date.now() };
      } else if (stored) {
        recovery = { ...recovery, ...JSON.parse(stored) };
      }
    } catch {
      recovery = { attempts: AUTO_RELOAD_MAX_ATTEMPTS, startedAt: Date.now() };
    }

    if (recovery.attempts >= AUTO_RELOAD_MAX_ATTEMPTS) {
      return;
    }

    const nextAttempt = recovery.attempts + 1;
    try {
      sessionStorage.setItem(
        AUTO_RELOAD_KEY,
        JSON.stringify({ attempts: nextAttempt, startedAt: recovery.startedAt })
      );
    } catch {
      // If storage fails, fall back to the manual recovery UI.
      return;
    }

    this.setState({ autoReloading: true, reloadAttempt: nextAttempt });
    const delay =
      AUTO_RELOAD_DELAYS_MS[nextAttempt - 1] ??
      AUTO_RELOAD_DELAYS_MS[AUTO_RELOAD_DELAYS_MS.length - 1];
    setTimeout(() => window.location.reload(), delay);
  }

  componentWillUnmount() {
    if (this.clearAutoReloadTimer) clearTimeout(this.clearAutoReloadTimer);
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

    if (this.state.autoReloading) {
      return (
        <div className="min-h-screen bg-[#141416] flex items-center justify-center p-6 text-[#F1F2F5]">
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-stone-400">
            <span className="h-2 w-2 rounded-full bg-[#ff00aa] animate-pulse" />
            Récupération de l'éditeur {this.state.reloadAttempt}/{AUTO_RELOAD_MAX_ATTEMPTS}…
          </div>
        </div>
      );
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
              J'ai tenté plusieurs rechargements automatiques. Si l'erreur revient,
              ouvre la page sans le brouillon local : ton brouillon est mis de
              côté dans le navigateur, et tu gardes ta session.
            </p>
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
