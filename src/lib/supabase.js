// ─────────────────────────────────────────────────────────────────────────────
// Client Supabase — instance unique partagée
// ─────────────────────────────────────────────────────────────────────────────
// Les clés viennent des variables d'environnement Vite (VITE_*).
// En local : copier .env.example en .env et remplir.
// Sur Vercel : ajouter les variables dans Settings → Environment Variables.

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

// Détecte les valeurs manquantes ou les placeholders du .env.example pour éviter
// de tenter une connexion qui va timeout ou renvoyer des erreurs cryptiques.
function looksLikePlaceholder(v) {
  if (!v) return true;
  if (v.includes("xxxxxxxxxxxx")) return true;
  if (v.includes("placeholder")) return true;
  if (v.startsWith("eyJhbGciOiJIUzI1NiIsInR5cCI6...")) return true;
  return false;
}

function looksLikeUrl(v) {
  if (!v) return false;
  return /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$/i.test(v);
}

function looksLikeAnonKey(v) {
  if (!v) return false;
  // Les clés anon sont des JWT longs (>100 caractères) commençant par "eyJ"
  return v.startsWith("eyJ") && v.length > 100;
}

export const configStatus = {
  url,
  anonKey: anonKey ? `${anonKey.slice(0, 10)}…(${anonKey.length} car.)` : "(vide)",
  urlPresent: Boolean(url),
  keyPresent: Boolean(anonKey),
  urlIsPlaceholder: looksLikePlaceholder(url),
  keyIsPlaceholder: looksLikePlaceholder(anonKey),
  urlValid: looksLikeUrl(url),
  keyValid: looksLikeAnonKey(anonKey),
};

export const isSupabaseConfigured =
  configStatus.urlPresent &&
  configStatus.keyPresent &&
  !configStatus.urlIsPlaceholder &&
  !configStatus.keyIsPlaceholder &&
  configStatus.urlValid &&
  configStatus.keyValid;

// On crée toujours un client (même avec des valeurs bidon), comme ça les imports
// ne plantent pas. La vérification `isSupabaseConfigured` est faite côté UI.
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anonKey || "placeholder.placeholder.placeholder",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // gère le retour du magic link
    },
  }
);
