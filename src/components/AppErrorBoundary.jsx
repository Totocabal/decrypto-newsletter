import React from "react";

const DRAFT_KEY = "decrypto-newsletter-draft-v1";

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
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("[app] crash rendu:", error, info);
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

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
        <div className="bg-white border border-red-200 rounded-sm p-6 max-w-md">
          <div className="text-red-700 text-sm font-medium mb-2">
            L'application a rencontré une erreur
          </div>
          <div className="text-xs text-stone-600 mb-4">
            Recharge la page. Si le problème revient après un refresh, vide le
            cache local pour repartir sur une session propre.
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={this.reload}
              className="text-[10px] uppercase tracking-[0.18em] text-stone-700 border border-stone-300 hover:border-stone-500 px-3 py-2 rounded-sm"
            >
              Recharger
            </button>
            <button
              onClick={this.clearCacheAndReload}
              className="text-[10px] uppercase tracking-[0.18em] text-white bg-stone-900 hover:bg-stone-700 px-3 py-2 rounded-sm"
            >
              Vider le cache local
            </button>
          </div>
        </div>
      </div>
    );
  }
}
