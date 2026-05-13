// ─────────────────────────────────────────────────────────────────────────────
// imageUpload — helpers pour uploader des images vers Supabase Storage
// ─────────────────────────────────────────────────────────────────────────────
// Utilise un bucket public nommé "newsletter-images" qui doit avoir été créé
// au préalable (voir supabase/storage.sql). Les images sont accessibles via
// une URL publique stable.

import { supabase } from "./supabase.js";

const BUCKET = "newsletter-images";
export const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_FILE_SIZE_LABEL = "5 Mo";
export const MAX_IMAGE_STORAGE_BYTES = 1024 * 1024 * 1024;
export const MAX_IMAGE_STORAGE_LABEL = "1 Go";

/**
 * Upload une image vers Supabase Storage.
 * @param {File} file
 * @param {string} userId — pour préfixer le chemin (organisation)
 * @returns {Promise<{ url: string, path: string }>}
 */
export async function uploadImage(file, userId) {
  if (!file) throw new Error("Aucun fichier fourni");

  if (!file.type.startsWith("image/")) {
    throw new Error("Le fichier doit être une image (PNG, JPG, GIF, WebP).");
  }

  const sizeMb = file.size / 1024 / 1024;
  if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
    throw new Error(`Image trop lourde (${sizeMb.toFixed(1)} Mo). Max ${MAX_IMAGE_FILE_SIZE_LABEL}.`);
  }

  // Nom unique : userId/timestamp-original.ext
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeBase = (file.name.replace(/\.[^.]+$/, "") || "image")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .slice(0, 40);
  const path = `${userId}/${Date.now()}-${safeBase}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "31536000", // 1 an
      upsert: false,
      contentType: file.type,
    });

  if (error) throw new Error(error.message);

  // URL publique
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/**
 * Supprime une image du bucket. Best-effort (silencieux si déjà supprimée).
 */
export async function deleteImage(path) {
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]);
}

export async function listImages(userId) {
  if (!userId) return [];
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(userId, {
      limit: 200,
      offset: 0,
      sortBy: { column: "updated_at", order: "desc" },
    });

  if (error) throw new Error(error.message);

  return (data || [])
    .filter((item) => item?.name && item.name !== ".emptyFolderPlaceholder")
    .map((item) => {
      const path = `${userId}/${item.name}`;
      const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return {
        ...item,
        path,
        url: publicData.publicUrl,
      };
    });
}
