// ─────────────────────────────────────────────────────────────────────────────
// previewHosting — publication d'une preview HTML dans Supabase Storage
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from "./supabase.js";

const BUCKET = "newsletter-previews";
const MAX_HTML_SIZE_BYTES = 2 * 1024 * 1024;

function safeSlug(value = "newsletter") {
  const slug = String(value || "newsletter")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "newsletter";
}

/**
 * Publie une version HTML immutable de l'aperçu courant.
 * @returns {Promise<{ url: string, path: string }>}
 */
export async function publishHtmlPreview({ html, userId, newsletterId, title }) {
  if (!html) throw new Error("Aucun HTML à publier.");
  if (!userId) throw new Error("Session utilisateur introuvable.");

  const file = new Blob([html], { type: "text/html" });
  if (file.size > MAX_HTML_SIZE_BYTES) {
    throw new Error("HTML trop volumineux pour une preview hébergée.");
  }

  const slug = safeSlug(title);
  const issueId = safeSlug(newsletterId || "draft");
  const path = `${userId}/${issueId}/${Date.now()}-${slug}.html`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: "text/html",
      upsert: false,
    });

  if (error) {
    const message = /bucket/i.test(error.message || "")
      ? `${error.message}. Vérifie que le bucket Supabase "newsletter-previews" existe via supabase/storage.sql.`
      : error.message;
    throw new Error(message);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}
