import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase.js";

export const LABEL_COLORS = [
  "#EF4444", "#F97316", "#EAB308", "#22C55E",
  "#06B6D4", "#3B82F6", "#8B5CF6", "#EC4899",
  "#64748B", "#D97706",
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
