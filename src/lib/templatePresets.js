import { supabase } from "./supabase.js";

const TABLE = "template_presets";
const SELECT_FULL =
  "id, name, sections, include_default_content, show_section_numbers, theme_variant, created_at, updated_at";
const SELECT_WITH_NUMBERING =
  "id, name, sections, include_default_content, show_section_numbers, created_at, updated_at";
const SELECT_LEGACY =
  "id, name, sections, include_default_content, created_at, updated_at";

function isMissingColumn(error, columnName) {
  const message = error?.message || "";
  return new RegExp(`${columnName}|schema cache|column .* does not exist`, "i").test(message);
}

function isMissingNumberingColumn(error) {
  return isMissingColumn(error, "show_section_numbers");
}

function isMissingThemeColumn(error) {
  return isMissingColumn(error, "theme_variant");
}

function normalizePreset(row) {
  return {
    id: row.id,
    name: row.name || "Preset sans nom",
    sections: Array.isArray(row.sections) ? row.sections : [],
    includeDefaultContent: row.include_default_content !== false,
    showSectionNumbers: row.show_section_numbers !== false,
    themeVariant: row.theme_variant === "light" ? "light" : "dark",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listTemplatePresets() {
  const { data, error } = await supabase
    .from(TABLE)
    .select(SELECT_FULL)
    .order("name", { ascending: true });

  if (isMissingThemeColumn(error)) {
    const withoutTheme = await supabase
      .from(TABLE)
      .select(SELECT_WITH_NUMBERING)
      .order("name", { ascending: true });
    if (isMissingNumberingColumn(withoutTheme.error)) {
      const legacy = await supabase
        .from(TABLE)
        .select(SELECT_LEGACY)
        .order("name", { ascending: true });
      if (legacy.error) throw legacy.error;
      return (legacy.data || []).map(normalizePreset);
    }
    if (withoutTheme.error) throw withoutTheme.error;
    return (withoutTheme.data || []).map(normalizePreset);
  }

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
  themeVariant,
}) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      name,
      sections,
      include_default_content: includeDefaultContent !== false,
      show_section_numbers: showSectionNumbers !== false,
      theme_variant: themeVariant === "light" ? "light" : "dark",
    })
    .select(SELECT_FULL)
    .single();

  if (isMissingThemeColumn(error)) {
    const withoutTheme = await supabase
      .from(TABLE)
      .insert({
        name,
        sections,
        include_default_content: includeDefaultContent !== false,
        show_section_numbers: showSectionNumbers !== false,
      })
      .select(SELECT_WITH_NUMBERING)
      .single();
    if (isMissingNumberingColumn(withoutTheme.error)) {
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
        theme_variant: themeVariant,
      });
    }
    if (withoutTheme.error) throw withoutTheme.error;
    return normalizePreset({ ...withoutTheme.data, theme_variant: themeVariant });
  }

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
      theme_variant: themeVariant,
    });
  }

  if (error) throw error;
  return normalizePreset(data);
}

export async function updateTemplatePreset(id, {
  name,
  sections,
  includeDefaultContent,
  showSectionNumbers,
  themeVariant,
}) {
  const patch = {
    sections,
    include_default_content: includeDefaultContent !== false,
    show_section_numbers: showSectionNumbers !== false,
    theme_variant: themeVariant === "light" ? "light" : "dark",
  };
  if (typeof name === "string") patch.name = name;

  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select(SELECT_FULL)
    .single();

  if (isMissingThemeColumn(error)) {
    const withoutThemePatch = {
      sections,
      include_default_content: includeDefaultContent !== false,
      show_section_numbers: showSectionNumbers !== false,
    };
    if (typeof name === "string") withoutThemePatch.name = name;
    const withoutTheme = await supabase
      .from(TABLE)
      .update(withoutThemePatch)
      .eq("id", id)
      .select(SELECT_WITH_NUMBERING)
      .single();
    if (isMissingNumberingColumn(withoutTheme.error)) {
      const legacyPatch = {
        sections,
        include_default_content: includeDefaultContent !== false,
      };
      if (typeof name === "string") legacyPatch.name = name;
      const legacy = await supabase
        .from(TABLE)
        .update(legacyPatch)
        .eq("id", id)
        .select(SELECT_LEGACY)
        .single();
      if (legacy.error) throw legacy.error;
      return normalizePreset({
        ...legacy.data,
        show_section_numbers: showSectionNumbers !== false,
        theme_variant: themeVariant,
      });
    }
    if (withoutTheme.error) throw withoutTheme.error;
    return normalizePreset({ ...withoutTheme.data, theme_variant: themeVariant });
  }

  if (isMissingNumberingColumn(error)) {
    const legacyPatch = {
      sections,
      include_default_content: includeDefaultContent !== false,
    };
    if (typeof name === "string") legacyPatch.name = name;
    const legacy = await supabase
      .from(TABLE)
      .update(legacyPatch)
      .eq("id", id)
      .select(SELECT_LEGACY)
      .single();
    if (legacy.error) throw legacy.error;
    return normalizePreset({
      ...legacy.data,
      show_section_numbers: showSectionNumbers !== false,
      theme_variant: themeVariant,
    });
  }

  if (error) throw error;
  return normalizePreset(data);
}

export async function deleteTemplatePreset(id) {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}
