import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase.js";

export const LABEL_COLORS = [
  "#FF00AA", // Magenta (Brand Primary)
  "#4141FF", // Bleu électrique (Brand Secondary)
  "#8701FF", // Violet (Brand Tertiary)
  "#03FFCF", // Menthe / Cyan (Brand Positive)
  "#FF4B28", // Orange / Rouge (Brand Warm)
  "#FF8B28", // Orange chaud (Brand Warning)
  "#B36BFF", // Violet callout
  "#FFE600", // Jaune callout
  "#00FFFF", // Cyan callout
  "#10B981", // Émeraude soft
  "#38BDF8", // Bleu ciel
  "#F472B6", // Rose pastel
  "#FB923C", // Abricot
  "#A7F3D0", // Menthe clair
  "#E2E8F0", // Gris ardoise clair
  "#F43F5E", // Rose corail intense
];

export function useLabels() {
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("labels").select("*").order("name");
    setLabels(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { labels, loading, reload: load };
}

export async function createLabel({ name, color, userId }) {
  const { data, error } = await supabase
    .from("labels")
    .insert({ name, color, created_by: userId, updated_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateLabel(id, { name, color, userId }) {
  const { error } = await supabase
    .from("labels")
    .update({ name, color, updated_at: new Date().toISOString(), updated_by: userId })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteLabel(id) {
  const { error } = await supabase.from("labels").delete().eq("id", id);
  if (error) throw error;
}

export async function assignLabel(newsletterId, labelId, userId) {
  const { error } = await supabase
    .from("newsletter_labels")
    .insert({ newsletter_id: newsletterId, label_id: labelId, assigned_by: userId });
  if (error && error.code !== "23505") throw error; // ignore duplicate
}

export async function removeLabel(newsletterId, labelId) {
  const { error } = await supabase
    .from("newsletter_labels")
    .delete()
    .eq("newsletter_id", newsletterId)
    .eq("label_id", labelId);
  if (error) throw error;
}

// ── Image labels ──────────────────────────────────────────────────────────────

export async function assignImageLabel(imagePath, labelId, userId) {
  const { error } = await supabase
    .from("image_labels")
    .insert({ image_path: imagePath, label_id: labelId, assigned_by: userId });
  if (error && error.code !== "23505") throw error; // ignore duplicate
}

export async function removeImageLabel(imagePath, labelId) {
  const { error } = await supabase
    .from("image_labels")
    .delete()
    .eq("image_path", imagePath)
    .eq("label_id", labelId);
  if (error) throw error;
}

/**
 * Retourne un objet { [imagePath]: labelId[] } pour une liste de chemins.
 */
export async function fetchImageLabelMap(imagePaths) {
  if (!imagePaths || imagePaths.length === 0) return {};
  const { data, error } = await supabase
    .from("image_labels")
    .select("image_path, label_id")
    .in("image_path", imagePaths);
  if (error) throw error;
  const map = {};
  for (const row of data || []) {
    if (!map[row.image_path]) map[row.image_path] = [];
    map[row.image_path].push(row.label_id);
  }
  return map;
}

export function useNewsletterLabels(newsletterId) {
  const [labelIds, setLabelIds] = useState([]);

  const load = useCallback(async () => {
    if (!newsletterId) return;
    const { data } = await supabase
      .from("newsletter_labels")
      .select("label_id")
      .eq("newsletter_id", newsletterId);
    setLabelIds((data || []).map((r) => r.label_id));
  }, [newsletterId]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (labelId, userId) => {
    if (labelIds.includes(labelId)) {
      await removeLabel(newsletterId, labelId);
      setLabelIds((ids) => ids.filter((id) => id !== labelId));
    } else {
      await assignLabel(newsletterId, labelId, userId);
      setLabelIds((ids) => [...ids, labelId]);
    }
  };

  return { labelIds, setLabelIds, toggle, reload: load };
}
