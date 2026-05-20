import { supabase } from "./supabase.js";

const TABLE = "template_presets";
const SELECT_FULL =
  "id, name, sections, include_default_content, show_section_numbers, show_block_separators, theme_variant, show_issue_date, created_by, updated_by, created_at, updated_at";
const SELECT_FULL_WITHOUT_SEPARATORS =
  "id, name, sections, include_default_content, show_section_numbers, theme_variant, show_issue_date, created_by, updated_by, created_at, updated_at";
const SELECT_WITH_AUTHORS =
  "id, name, sections, include_default_content, show_section_numbers, show_block_separators, theme_variant, show_issue_date, created_at, updated_at";
const SELECT_WITH_THEME =
  "id, name, sections, include_default_content, show_section_numbers, show_block_separators, theme_variant, created_at, updated_at";
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

function isMissingBlockSeparatorsColumn(error) {
  return isMissingColumn(error, "show_block_separators");
}

function isMissingThemeColumn(error) {
  return isMissingColumn(error, "theme_variant");
}

function isMissingIssueDateColumn(error) {
  return isMissingColumn(error, "show_issue_date");
}

function isMissingAuthorsColumn(error) {
  return isMissingColumn(error, "created_by|updated_by");
}

function normalizeThemeVariant(value) {
  return value === "light" ? "light" : "dark";
}

function getSectionsValue(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.sections)) return value.sections;
  return [];
}

function getThemeVariantValue(row) {
  return normalizeThemeVariant(row.sections?.themeVariant || row.theme_variant);
}

function getIncludeIssueDateValue(row) {
  if (typeof row.sections?.includeIssueDate === "boolean") {
    return row.sections.includeIssueDate;
  }
  return row.show_issue_date !== false;
}

function getShowBlockSeparatorsValue(row) {
  if (typeof row.sections?.showBlockSeparators === "boolean") {
    return row.sections.showBlockSeparators;
  }
  return row.show_block_separators !== false;
}

function sectionsWithOptionsFallback(sections, themeVariant, includeIssueDate, showBlockSeparators = true) {
  return {
    sections,
    themeVariant: normalizeThemeVariant(themeVariant),
    includeIssueDate: includeIssueDate !== false,
    showBlockSeparators: showBlockSeparators !== false,
  };
}

function normalizePreset(row) {
  return {
    id: row.id,
    name: row.name || "Preset sans nom",
    sections: getSectionsValue(row.sections),
    includeDefaultContent: row.include_default_content !== false,
    showSectionNumbers: row.show_section_numbers !== false,
    showBlockSeparators: getShowBlockSeparatorsValue(row),
    themeVariant: getThemeVariantValue(row),
    includeIssueDate: getIncludeIssueDateValue(row),
    createdBy: row.created_by || null,
    updatedBy: row.updated_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listTemplatePresets() {
  const { data, error } = await supabase
    .from(TABLE)
    .select(SELECT_FULL)
    .order("name", { ascending: true });

  if (isMissingBlockSeparatorsColumn(error)) {
    const withoutSeparators = await supabase
      .from(TABLE)
      .select(SELECT_FULL_WITHOUT_SEPARATORS)
      .order("name", { ascending: true });
    if (withoutSeparators.error) throw withoutSeparators.error;
    return (withoutSeparators.data || []).map(normalizePreset);
  }

  if (isMissingAuthorsColumn(error)) {
    const withoutAuthors = await supabase
      .from(TABLE)
      .select(SELECT_WITH_AUTHORS)
      .order("name", { ascending: true });
    if (withoutAuthors.error) throw withoutAuthors.error;
    return (withoutAuthors.data || []).map(normalizePreset);
  }

  if (isMissingIssueDateColumn(error)) {
    const withoutIssueDate = await supabase
      .from(TABLE)
      .select(SELECT_WITH_THEME)
      .order("name", { ascending: true });
    if (isMissingThemeColumn(withoutIssueDate.error)) {
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
    if (withoutIssueDate.error) throw withoutIssueDate.error;
    return (withoutIssueDate.data || []).map(normalizePreset);
  }

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
  showBlockSeparators,
  themeVariant,
  includeIssueDate,
}) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      name,
      sections,
      include_default_content: includeDefaultContent !== false,
      show_section_numbers: showSectionNumbers !== false,
      show_block_separators: showBlockSeparators !== false,
      theme_variant: themeVariant === "light" ? "light" : "dark",
      show_issue_date: includeIssueDate !== false,
    })
    .select(SELECT_FULL)
    .single();

  if (isMissingBlockSeparatorsColumn(error)) {
    const fallbackSections = sectionsWithOptionsFallback(sections, themeVariant, includeIssueDate, showBlockSeparators);
    const withoutSeparators = await supabase
      .from(TABLE)
      .insert({
        name,
        sections: fallbackSections,
        include_default_content: includeDefaultContent !== false,
        show_section_numbers: showSectionNumbers !== false,
        theme_variant: themeVariant === "light" ? "light" : "dark",
        show_issue_date: includeIssueDate !== false,
      })
      .select(SELECT_FULL_WITHOUT_SEPARATORS)
      .single();
    if (withoutSeparators.error) throw withoutSeparators.error;
    return normalizePreset(withoutSeparators.data);
  }

  if (isMissingAuthorsColumn(error)) {
    const withoutAuthors = await supabase
      .from(TABLE)
      .insert({
        name,
        sections,
        include_default_content: includeDefaultContent !== false,
        show_section_numbers: showSectionNumbers !== false,
        show_block_separators: showBlockSeparators !== false,
        theme_variant: themeVariant === "light" ? "light" : "dark",
        show_issue_date: includeIssueDate !== false,
      })
      .select(SELECT_WITH_AUTHORS)
      .single();
    if (withoutAuthors.error) throw withoutAuthors.error;
    return normalizePreset(withoutAuthors.data);
  }

  if (isMissingIssueDateColumn(error)) {
    const fallbackSections = sectionsWithOptionsFallback(sections, themeVariant, includeIssueDate, showBlockSeparators);
    const withoutIssueDate = await supabase
      .from(TABLE)
      .insert({
        name,
        sections: fallbackSections,
        include_default_content: includeDefaultContent !== false,
        show_section_numbers: showSectionNumbers !== false,
        theme_variant: themeVariant === "light" ? "light" : "dark",
      })
      .select(SELECT_WITH_THEME)
      .single();
    if (isMissingThemeColumn(withoutIssueDate.error)) {
      const withoutTheme = await supabase
        .from(TABLE)
        .insert({
          name,
          sections: fallbackSections,
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
            sections: fallbackSections,
            include_default_content: includeDefaultContent !== false,
          })
          .select(SELECT_LEGACY)
          .single();
        if (legacy.error) throw legacy.error;
        return normalizePreset({
          ...legacy.data,
          show_section_numbers: showSectionNumbers !== false,
          theme_variant: themeVariant,
          show_issue_date: includeIssueDate !== false,
        });
      }
      if (withoutTheme.error) throw withoutTheme.error;
      return normalizePreset({
        ...withoutTheme.data,
        theme_variant: themeVariant,
        show_issue_date: includeIssueDate !== false,
      });
    }
    if (withoutIssueDate.error) throw withoutIssueDate.error;
    return normalizePreset({ ...withoutIssueDate.data, show_issue_date: includeIssueDate !== false });
  }

  if (isMissingThemeColumn(error)) {
    const fallbackSections = sectionsWithOptionsFallback(sections, themeVariant, includeIssueDate, showBlockSeparators);
    const withoutTheme = await supabase
      .from(TABLE)
      .insert({
        name,
        sections: fallbackSections,
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
          sections: fallbackSections,
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
    const fallbackSections = sectionsWithOptionsFallback(sections, themeVariant, includeIssueDate, showBlockSeparators);
    const legacy = await supabase
      .from(TABLE)
      .insert({
        name,
        sections: fallbackSections,
        include_default_content: includeDefaultContent !== false,
      })
      .select(SELECT_LEGACY)
      .single();
    if (legacy.error) throw legacy.error;
    return normalizePreset({
      ...legacy.data,
      show_section_numbers: showSectionNumbers !== false,
      theme_variant: themeVariant,
      show_issue_date: includeIssueDate !== false,
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
  showBlockSeparators,
  themeVariant,
  includeIssueDate,
}) {
  const patch = {
    sections,
    include_default_content: includeDefaultContent !== false,
    show_section_numbers: showSectionNumbers !== false,
    show_block_separators: showBlockSeparators !== false,
    theme_variant: themeVariant === "light" ? "light" : "dark",
    show_issue_date: includeIssueDate !== false,
  };
  if (typeof name === "string") patch.name = name;

  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select(SELECT_FULL)
    .single();

  if (isMissingBlockSeparatorsColumn(error)) {
    const fallbackSections = sectionsWithOptionsFallback(sections, themeVariant, includeIssueDate, showBlockSeparators);
    const withoutSeparatorsPatch = {
      sections: fallbackSections,
      include_default_content: includeDefaultContent !== false,
      show_section_numbers: showSectionNumbers !== false,
      theme_variant: themeVariant === "light" ? "light" : "dark",
      show_issue_date: includeIssueDate !== false,
    };
    if (typeof name === "string") withoutSeparatorsPatch.name = name;
    const withoutSeparators = await supabase
      .from(TABLE)
      .update(withoutSeparatorsPatch)
      .eq("id", id)
      .select(SELECT_FULL_WITHOUT_SEPARATORS)
      .single();
    if (withoutSeparators.error) throw withoutSeparators.error;
    return normalizePreset(withoutSeparators.data);
  }

  if (isMissingAuthorsColumn(error)) {
    const withoutAuthors = await supabase
      .from(TABLE)
      .update(patch)
      .eq("id", id)
      .select(SELECT_WITH_AUTHORS)
      .single();
    if (withoutAuthors.error) throw withoutAuthors.error;
    return normalizePreset(withoutAuthors.data);
  }

  if (isMissingIssueDateColumn(error)) {
    const fallbackSections = sectionsWithOptionsFallback(sections, themeVariant, includeIssueDate, showBlockSeparators);
    const withoutIssueDatePatch = {
      sections: fallbackSections,
      include_default_content: includeDefaultContent !== false,
      show_section_numbers: showSectionNumbers !== false,
      theme_variant: themeVariant === "light" ? "light" : "dark",
    };
    if (typeof name === "string") withoutIssueDatePatch.name = name;
    const withoutIssueDate = await supabase
      .from(TABLE)
      .update(withoutIssueDatePatch)
      .eq("id", id)
      .select(SELECT_WITH_THEME)
      .single();
    if (isMissingThemeColumn(withoutIssueDate.error)) {
      const withoutThemePatch = {
        sections: fallbackSections,
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
          sections: fallbackSections,
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
          show_issue_date: includeIssueDate !== false,
        });
      }
      if (withoutTheme.error) throw withoutTheme.error;
      return normalizePreset({
        ...withoutTheme.data,
        theme_variant: themeVariant,
        show_issue_date: includeIssueDate !== false,
      });
    }
    if (withoutIssueDate.error) throw withoutIssueDate.error;
    return normalizePreset({ ...withoutIssueDate.data, show_issue_date: includeIssueDate !== false });
  }

  if (isMissingThemeColumn(error)) {
    const fallbackSections = sectionsWithOptionsFallback(sections, themeVariant, includeIssueDate, showBlockSeparators);
    const withoutThemePatch = {
      sections: fallbackSections,
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
        sections: fallbackSections,
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
    const fallbackSections = sectionsWithOptionsFallback(sections, themeVariant, includeIssueDate, showBlockSeparators);
    const legacyPatch = {
      sections: fallbackSections,
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
