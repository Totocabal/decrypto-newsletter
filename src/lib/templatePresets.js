import { supabase } from "./supabase.js";

const TABLE = "template_presets";

function normalizePreset(row) {
  return {
    id: row.id,
    name: row.name || "Preset sans nom",
    sections: Array.isArray(row.sections) ? row.sections : [],
    includeDefaultContent: row.include_default_content !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listTemplatePresets() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, name, sections, include_default_content, created_at, updated_at")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []).map(normalizePreset);
}

export async function createTemplatePreset({ name, sections, includeDefaultContent }) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      name,
      sections,
      include_default_content: includeDefaultContent !== false,
    })
    .select("id, name, sections, include_default_content, created_at, updated_at")
    .single();

  if (error) throw error;
  return normalizePreset(data);
}

export async function deleteTemplatePreset(id) {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}
