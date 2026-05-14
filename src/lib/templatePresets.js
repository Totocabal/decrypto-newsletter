import { supabase } from "./supabase.js";

const TABLE = "template_presets";
const SELECT_WITH_NUMBERING =
  "id, name, sections, include_default_content, show_section_numbers, created_at, updated_at";
const SELECT_LEGACY =
  "id, name, sections, include_default_content, created_at, updated_at";

function isMissingNumberingColumn(error) {
  const message = error?.message || "";
  return /show_section_numbers|schema cache|column .* does not exist/i.test(message);
}

function normalizePreset(row) {
  return {
    id: row.id,
    name: row.name || "Preset sans nom",
    sections: Array.isArray(row.sections) ? row.sections : [],
    includeDefaultContent: row.include_default_content !== false,
    showSectionNumbers: row.show_section_numbers !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listTemplatePresets() {
  const { data, error } = await supabase
    .from(TABLE)
    .select(SELECT_WITH_NUMBERING)
    .order("name", { ascending: true });

  if (isMissingNumberingColumn(error)) {
    const legacy = await supabase
      .from(TABLE)
      .select(SELECT_LEGACY)
      .order("name", { ascending: true });
    if (legacy.error) throw legacy.error;
    return (legacy.data || []).map(normalizePreset);
  }

  if (error) throw error;
  return (data || []).map(normalizePreset);
}

export async function createTemplatePreset({
  name,
  sections,
  includeDefaultContent,
  showSectionNumbers,
}) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      name,
      sections,
      include_default_content: includeDefaultContent !== false,
      show_section_numbers: showSectionNumbers !== false,
    })
    .select(SELECT_WITH_NUMBERING)
    .single();

  if (isMissingNumberingColumn(error)) {
    const legacy = await supabase
      .from(TABLE)
      .insert({
        name,
        sections,
        include_default_content: includeDefaultContent !== false,
      })
      .select(SELECT_LEGACY)
      .single();
    if (legacy.error) throw legacy.error;
    return normalizePreset({
      ...legacy.data,
      show_section_numbers: showSectionNumbers !== false,
    });
  }

  if (error) throw error;
  return normalizePreset(data);
}

export async function deleteTemplatePreset(id) {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}
