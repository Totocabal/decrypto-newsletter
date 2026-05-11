// ─────────────────────────────────────────────────────────────────────────────
// AuthContext — état d'authentification global
// ─────────────────────────────────────────────────────────────────────────────
// Expose :
//   user        : l'objet auth.users de Supabase (ou null)
//   profile     : la ligne public.profiles correspondante (ou null)
//   loading     : true tant qu'on n'a pas vérifié la session
//   initError   : message d'erreur visible si init échoue (timeout, réseau, RLS…)
//   signIn      : (email) → envoie un magic link
//   signOut     : déconnexion
//   refreshProfile : re-fetch du profil (après approbation)

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase.js";

const AuthContext = createContext(null);

const INIT_TIMEOUT_MS = 10000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState(null);

  // Récupère le profil correspondant au user courant. Si la ligne n'existe pas
  // encore (cas rare au tout premier login : le trigger côté Supabase peut
  // mettre 1-2s à insérer), on réessaie.
  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) {
        // eslint-disable-next-line no-console
        console.error("[auth] fetchProfile error:", error);
        // On ne setInitError ici que sur la dernière tentative
        if (attempt === 2) {
          setInitError({
            kind: "profile",
            message: error.message,
            hint: "Impossible de lire la table 'profiles'. Vérifie que tu as bien exécuté supabase/schema.sql dans le SQL Editor.",
          });
        }
        await new Promise((r) => setTimeout(r, 600));
        continue;
      }
      if (data) {
        setProfile(data);
        return;
      }
      // Pas d'erreur mais pas de profil → on attend que le trigger crée la ligne
      await new Promise((r) => setTimeout(r, 600));
    }
    // Toujours pas de profil après 3 essais → on continue sans (l'UI affichera
    // "Création du profil…" et l'utilisateur peut rafraîchir)
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        // Race entre la session et un timeout — sinon on peut rester bloqué
        // indéfiniment si Supabase est injoignable (mauvaise URL, blocage CORS…)
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(new Error(`Supabase ne répond pas (>${INIT_TIMEOUT_MS / 1000}s)`)),
            INIT_TIMEOUT_MS
          )
        );

        const result = await Promise.race([sessionPromise, timeoutPromise]);
        if (!mounted) return;

        const session = result?.data?.session;
        const u = session?.user ?? null;
        setUser(u);

        if (u) {
          await fetchProfile(u.id);
        }
        setLoading(false);
      } catch (err) {
        if (!mounted) return;
        // eslint-disable-next-line no-console
        console.error("[auth] init error:", err);
        setInitError({
          kind: "init",
          message: err?.message || String(err),
          hint:
            "Vérifie que :\n" +
            "  1. Le fichier .env existe à la racine du projet\n" +
            "  2. VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY y sont remplies\n" +
            "  3. Tu as redémarré `npm run dev` après modification du .env",
        });
        setLoading(false);
      }
    }
    init();

    // Réagit aux changements (login, logout, refresh)
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      setUser(u);
      if (u) await fetchProfile(u.id);
      else setProfile(null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = useCallback(async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        initError,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return ctx;
}
