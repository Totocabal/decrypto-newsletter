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

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "../lib/supabase.js";

const AuthContext = createContext(null);

const INIT_TIMEOUT_MS = 10000;
const PROFILE_TIMEOUT_MS = 10000;
const DEFAULT_AUTH_REDIRECT_URL = "https://decrypto-newsletter.vercel.app/";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout (>${ms / 1000}s)`)), ms)
    ),
  ]);
}

function clearSupabaseStorage() {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith("sb-"))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage may be blocked; state reset below is still useful.
  }
}

function getAuthRedirectUrl() {
  const configuredUrl = import.meta.env.VITE_AUTH_REDIRECT_URL?.trim();
  if (configuredUrl) return configuredUrl;
  return DEFAULT_AUTH_REDIRECT_URL;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [initError, setInitError] = useState(null);
  const userIdRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    userIdRef.current = user?.id || null;
  }, [user]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Récupère le profil correspondant au user courant. Si la ligne n'existe pas
  // encore (cas rare au tout premier login : le trigger côté Supabase peut
  // mettre 1-2s à insérer), on réessaie.
  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await withTimeout(
        supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle(),
        PROFILE_TIMEOUT_MS,
        "Chargement profil"
      );
      if (error) {
        // eslint-disable-next-line no-console
        console.error("[auth] fetchProfile error:", error);
        // Ne déclenche initError que si l'erreur indique clairement que la
        // table profiles n'existe pas (schéma jamais exécuté). Sinon on retry
        // silencieusement — les erreurs RLS, timeout, réseau lent ne doivent
        // pas afficher la page d'erreur de configuration.
        const isSchemaError =
          /relation .*profiles.* does not exist/i.test(error.message) ||
          /\b42P01\b/.test(error.code || "");
        if (attempt === 2 && isSchemaError) {
          setInitError({
            kind: "profile",
            message: error.message,
            hint: "La table 'profiles' n'existe pas. Exécute supabase/schema.sql dans le SQL Editor.",
          });
        }
        await wait(600);
        continue;
      }
      if (data) {
        setProfile(data);
        setProfileLoading(false);
        return;
      }
      // Pas d'erreur mais pas de profil → on attend que le trigger crée la ligne
      await wait(600);
    }
    // Toujours pas de profil après 3 essais → on continue sans (l'UI affichera
    // "Création du profil…" et l'utilisateur peut rafraîchir)
    setProfile(null);
    setProfileLoading(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  const resetLocalSession = useCallback(async () => {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      clearSupabaseStorage();
    }
    clearSupabaseStorage();
    setUser(null);
    setProfile(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        // Race entre la session et un timeout — sinon on peut rester bloqué
        // indéfiniment si Supabase est injoignable (mauvaise URL, blocage CORS…)
        const result = await withTimeout(
          supabase.auth.getSession(),
          INIT_TIMEOUT_MS,
          "Session Supabase"
        );

        if (!mounted) return;

        if (result?.error) {
          // Une session locale corrompue ou un refresh token expiré peut bloquer
          // l'app après refresh. On nettoie seulement le stockage auth local.
          // L'utilisateur pourra se reconnecter immédiatement.
          // eslint-disable-next-line no-console
          console.warn("[auth] getSession error:", result.error);
          clearSupabaseStorage();
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        const session = result?.data?.session;
        const u = session?.user ?? null;
        setUser(u);

        if (u) {
          try {
            await fetchProfile(u.id);
          } catch (profileErr) {
            // eslint-disable-next-line no-console
            console.warn("[auth] profil indisponible:", profileErr?.message || profileErr);
            setProfile(null);
          }
        }
        setLoading(false);
      } catch (err) {
        if (!mounted) return;
        // eslint-disable-next-line no-console
        console.warn(
          "[auth] init lent ou échoué :",
          err?.message || err,
          "→ on continue sans session, l'utilisateur pourra se logger."
        );
        // On ne BLOQUE PAS l'app sur ce timeout. Si la session ne s'est pas
        // chargée en 30s, on assume qu'il n'y en a pas et on affiche le login.
        // Si l'utilisateur a en fait une session valide en localStorage,
        // onAuthStateChange la rechargera dès que Supabase répondra.
        setUser(null);
        setLoading(false);
      }
    }
    init();

    // Réagit aux changements (login, logout, refresh)
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      const sameLoadedUser = Boolean(
        u?.id && userIdRef.current === u.id && profileRef.current
      );
      setUser(u);
      setLoading(false);
      if (!u) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      // Les refreshs automatiques de Supabase peuvent arriver quand l'onglet
      // redevient actif. Si c'est le même utilisateur et que le profil est déjà
      // chargé, on ne repasse pas par le loader global: l'éditeur reste monté.
      if (
        sameLoadedUser &&
        (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION" || event === "USER_UPDATED")
      ) {
        return;
      }

      // Marquer profileLoading avant le setTimeout pour éviter un flash de
      // "Création du profil…" entre setLoading(false) et le début du fetch.
      setProfileLoading(true);
      // Ne jamais attendre une requête Supabase directement dans
      // onAuthStateChange: le client auth tient un verrou interne pendant cet
      // événement, et une requête imbriquée peut bloquer la session au refresh.
      setTimeout(() => {
        if (!mounted) return;
        fetchProfile(u.id).catch((err) => {
          // eslint-disable-next-line no-console
          console.warn("[auth] profil indisponible après changement auth:", err);
          if (mounted) {
            setProfile(null);
            setProfileLoading(false);
          }
        });
      }, 0);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // ── Login par magic link (lien magique reçu par email) ──
  // Utilisé pour : premier login d'un nouveau compte, récupération de mot de
  // passe oublié, ou comme fallback si l'utilisateur ne veut pas saisir son
  // mot de passe.
  const signInWithMagicLink = useCallback(async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
        shouldCreateUser: false,
      },
    });
    return { error };
  }, []);

  const requestPasswordRecovery = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getAuthRedirectUrl(),
    });
    return { error };
  }, []);

  // Alias rétrocompatible (utilisé par LoginPage avant refactor)
  const signIn = signInWithMagicLink;

  // ── Login par email + mot de passe ──
  // Méthode privilégiée pour les utilisateurs réguliers. Le compte doit déjà
  // exister (créé via magic link initial) et avoir un mot de passe défini.
  const signInWithPassword = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }, []);

  // ── Définir ou changer le mot de passe ──
  // Utilisé après le premier magic link (pour permettre les logins futurs en
  // mot de passe) ou après un "mot de passe oublié".
  const updatePassword = useCallback(async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
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
        profileLoading,
        initError,
        signIn, // alias rétrocompat — équivalent à signInWithMagicLink
        signInWithMagicLink,
        requestPasswordRecovery,
        signInWithPassword,
        updatePassword,
        signOut,
        refreshProfile,
        resetLocalSession,
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
