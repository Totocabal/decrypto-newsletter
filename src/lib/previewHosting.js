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
 * @returns {Promise<{ url: string, storageUrl: string, path: string }>}
 */
export async function publishHtmlPreview({ html, userId, newsletterId, title }) {
  if (!html) throw new Error("Aucun HTML à publier.");
  if (!userId) throw new Error("Session utilisateur introuvable.");

  const file = new File([html], "preview.html", {
    type: "text/html;charset=utf-8",
  });
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
      contentType: "text/html;charset=utf-8",
      upsert: false,
    });

  if (error) {
    const message = /bucket/i.test(error.message || "")
      ? `${error.message}. Vérifie que le bucket Supabase "newsletter-previews" existe via supabase/storage.sql.`
      : error.message;
    throw new Error(message);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const viewerUrl = `${window.location.origin}/api/preview-html?path=${encodeURIComponent(path)}`;
  return { url: viewerUrl, storageUrl: data.publicUrl, path };
}

function previewDateFromName(name = "") {
  const match = String(name).match(/^(\d{12,})-/);
  if (!match) return null;
  const date = new Date(Number(match[1]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function previewLabelFromName(name = "") {
  return String(name)
    .replace(/^\d{12,}-/, "")
    .replace(/\.html$/, "")
    .replace(/-/g, " ")
    .trim() || "Preview HTML";
}

export async function listHtmlPreviews({ newsletterId }) {
  const issueId = safeSlug(newsletterId || "draft");
  const { data: roots, error: rootError } = await supabase.storage
    .from(BUCKET)
    .list("", {
      limit: 200,
      sortBy: { column: "name", order: "asc" },
    });

  if (rootError) throw new Error(rootError.message);

  const folderNames = (roots || [])
    .filter((item) => item?.name && !item.metadata)
    .map((item) => item.name);

  const nestedLists = await Promise.all(
    folderNames.map(async (folder) => {
      const prefix = `${folder}/${issueId}`;
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(prefix, {
          limit: 100,
          sortBy: { column: "created_at", order: "desc" },
        });
      if (error) return [];
      return (data || [])
        .filter((item) => item?.name?.endsWith(".html"))
        .map((item) => {
          const path = `${prefix}/${item.name}`;
          const createdAt = previewDateFromName(item.name) || new Date(item.created_at || item.updated_at || 0);
          const expiresAt = new Date(createdAt);
          expiresAt.setMonth(expiresAt.getMonth() + 3);
          return {
            path,
            label: previewLabelFromName(item.name),
            createdAt,
            expiresAt,
            url: `${window.location.origin}/api/preview-html?path=${encodeURIComponent(path)}`,
          };
        });
    })
  );

  return nestedLists
    .flat()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
