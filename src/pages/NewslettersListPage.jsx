// ─────────────────────────────────────────────────────────────────────────────
// NewslettersListPage — page d'accueil avec liste de toutes les newsletters
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Plus,
  FileText,
  ImageIcon,
  Copy,
  Trash2,
  Lock,
  Clock,
  User,
  LogOut,
  Settings,
  ChevronRight,
  Search,
  Tag,
  X,
  ArrowUpDown,
  Sparkles,
  Loader2,
  FileUp,
  ClipboardPaste,
  Hash,
  Minus,
  Palette,
  AlertTriangle,
  Maximize2,
  MessageSquare,
} from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useToast, useConfirm } from "../components/Dialog.jsx";
import { INITIAL_STATE, getDefaultNewsletterTemplate, buildInitialStateFromTypes } from "../config/schema.js";
import { listTemplatePresets } from "../lib/templatePresets.js";
import { Wordmark } from "../components/Wordmark.jsx";
import { ImageManagerModal } from "../components/ImageManagerModal.jsx";
import { Tooltip } from "../components/Tooltip.jsx";
import { useLabels, assignLabel, removeLabel } from "../lib/useLabels.js";
import { importNewsletterMarkdown } from "../utils/markdownImport.js";

const MARKDOWN_IMPORT_TEMPLATE = `---
title: "Ma newsletter"
preview_text: "Le texte de prévisualisation email."
brand_name: "COINHOUSE"
issue_number: "42"
issue_date: "22.05.2026"
theme_variant: dark
show_section_numbers: true
show_block_separators: true
---

:::hero
kicker: "DECRYPTO"
title_part1: "Le marché"
title_part2: "reprend son "
title_highlight: "souffle."
subtitle: "Résumé d'ouverture."
:::

:::index
label: "Au sommaire"
:::

:::text_block
kicker: "ANALYSE"
title: "Ce qu'il faut retenir"
:::

Le corps du bloc reste en Markdown riche.

- Point clé
- Autre point clé
`;

function cleanInlineMarkdown(text = "") {
  return String(text || "").replace(/\*\*/g, "").replace(/\*/g, "").trim();
}

function renderCrmLine(line, key) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const strongMeta = trimmed.match(/^\*\*(Objet|Pré-header|Pre-header)\s*:\s*(.*?)\*\*$/i);
  if (strongMeta) {
    return (
      <div key={key} className="rounded-lg border border-line bg-d-panel2 px-3 py-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-d-fg4">
          {strongMeta[1]}
        </div>
        <div className="mt-1 text-sm font-semibold text-d-fg">
          {cleanInlineMarkdown(strongMeta[2])}
        </div>
      </div>
    );
  }
  const meta = trimmed.match(/^(Objet|Pré-header|Pre-header|CTA)\s*:\s*(.*)$/i);
  if (meta) {
    return (
      <div key={key} className="rounded-lg border border-line bg-d-panel2 px-3 py-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-d-fg4">
          {meta[1]}
        </div>
        <div className="mt-1 text-sm font-semibold text-d-fg">
          {cleanInlineMarkdown(meta[2])}
        </div>
      </div>
    );
  }
  if (/^\[.+\]$/.test(trimmed)) {
    return (
      <div key={key} className="inline-flex w-fit rounded-lg bg-d-pink px-3 py-2 text-xs font-semibold text-white">
        {trimmed.slice(1, -1)}
      </div>
    );
  }
  if (/^_?Avertissement\s*:/i.test(cleanInlineMarkdown(trimmed))) {
    return (
      <div key={key} className="rounded-lg border border-[#FF8B28]/30 bg-[#FFF5E8] px-3 py-2 text-xs leading-relaxed text-[#5C3300] dark:bg-[#2A1A0A] dark:text-[#FFE3C2]">
        {cleanInlineMarkdown(trimmed)}
      </div>
    );
  }
  return (
    <p key={key} className="text-sm leading-relaxed text-d-fg2">
      {cleanInlineMarkdown(trimmed)}
    </p>
  );
}

function CrmVariantPreview({ content }) {
  const blocks = [];
  let listItems = [];
  const flushList = () => {
    if (!listItems.length) return;
    const items = listItems;
    listItems = [];
    blocks.push(
      <ul key={`list-${blocks.length}`} className="space-y-2 rounded-lg border border-line bg-d-panel2 px-4 py-3">
        {items.map((item, index) => (
          <li key={`${index}-${item}`} className="flex gap-2 text-sm leading-relaxed text-d-fg2">
            <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-d-pink" />
            <span>{cleanInlineMarkdown(item)}</span>
          </li>
        ))}
      </ul>
    );
  };

  String(content || "").split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed === "---") {
      flushList();
      return;
    }
    if (/^#{1,6}\s+/.test(trimmed)) return;
    const bullet = trimmed.match(/^(?:[-*]|·)\s+(.*)$/);
    if (bullet) {
      listItems.push(bullet[1]);
      return;
    }
    flushList();
    const rendered = renderCrmLine(trimmed, `line-${index}`);
    if (rendered) blocks.push(rendered);
  });
  flushList();

  return <div className="space-y-3">{blocks}</div>;
}

export function NewslettersListPage({ onOpen, onOpenAdmin }) {
  const { profile, signOut } = useAuth();
  const addToast = useToast();
  const confirm = useConfirm();
  const [newsletters, setNewsletters] = useState([]);
  const [locks, setLocks] = useState({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createChoiceOpen, setCreateChoiceOpen] = useState(false);
  const [createNameOpen, setCreateNameOpen] = useState(false);
  const [pendingMode, setPendingMode] = useState(null);
  const [pendingPreset, setPendingPreset] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [newPreviewText, setNewPreviewText] = useState("");
  const [templatePresets, setTemplatePresets] = useState([]);
  const [templatePresetsLoading, setTemplatePresetsLoading] = useState(false);
  const [templatePresetsError, setTemplatePresetsError] = useState(null);
  const [imageManagerOpen, setImageManagerOpen] = useState(false);
  const [previewGenerating, setPreviewGenerating] = useState(false);
  const [previewGenError, setPreviewGenError] = useState(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("updated_desc");
  const { labels } = useLabels();
  const [nlLabels, setNlLabels] = useState({});
  const [labelFilter, setLabelFilter] = useState([]);
  const [labelPickerOpen, setLabelPickerOpen] = useState(null);
  const [importingMarkdown, setImportingMarkdown] = useState(false);
  const [markdownImportSourceOpen, setMarkdownImportSourceOpen] = useState(false);
  const [markdownImportMode, setMarkdownImportMode] = useState("markdown");
  const [pastedMarkdown, setPastedMarkdown] = useState("");
  const [markdownBrief, setMarkdownBrief] = useState("");
  const [markdownBriefTheme, setMarkdownBriefTheme] = useState("light");
  const [markdownBriefShowNumbers, setMarkdownBriefShowNumbers] = useState(false);
  const [markdownBriefShowSeparators, setMarkdownBriefShowSeparators] = useState(false);
  const [generatingCrmBrief, setGeneratingCrmBrief] = useState(false);
  const [crmBriefVariants, setCrmBriefVariants] = useState(null);
  const [expandedCrmVariant, setExpandedCrmVariant] = useState(null);
  const [crmVariantRefineDraft, setCrmVariantRefineDraft] = useState(null);
  const [crmVariantRefineComments, setCrmVariantRefineComments] = useState("");
  const [refiningCrmVariant, setRefiningCrmVariant] = useState(false);
  const [generatingMarkdownBrief, setGeneratingMarkdownBrief] = useState(false);
  const [markdownGenerationLog, setMarkdownGenerationLog] = useState(null);
  const [markdownImportDraft, setMarkdownImportDraft] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: nls, error: nlsError }, { data: lks, error: locksError }, { data: nlbs }] =
        await Promise.all([
          supabase
            .from("newsletters")
            .select(
              "id, title, current_state, updated_at, updated_by, archived, created_by, creator:profiles!newsletters_created_by_fkey(full_name, email)"
            )
            .eq("archived", false)
            .order("updated_at", { ascending: false }),
          supabase
            .from("locks")
            .select("*")
            .gt("expires_at", new Date().toISOString()),
          supabase.from("newsletter_labels").select("newsletter_id, label_id"),
        ]);

      if (nlsError) throw nlsError;
      if (locksError) {
        // eslint-disable-next-line no-console
        console.warn("[newsletters] locks indisponibles:", locksError);
      }

      setNewsletters(Array.isArray(nls) ? nls : []);
      const map = {};
      (Array.isArray(lks) ? lks : []).forEach((l) => {
        if (l?.newsletter_id) map[l.newsletter_id] = l;
      });
      setLocks(map);
      const nlbsMap = {};
      (Array.isArray(nlbs) ? nlbs : []).forEach(({ newsletter_id, label_id }) => {
        if (!nlbsMap[newsletter_id]) nlbsMap[newsletter_id] = [];
        nlbsMap[newsletter_id].push(label_id);
      });
      setNlLabels(nlbsMap);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[newsletters] chargement impossible:", error);
      setNewsletters([]);
      setLocks({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const loadTemplatePresets = useCallback(async () => {
    setTemplatePresetsLoading(true);
    setTemplatePresetsError(null);
    try {
      setTemplatePresets(await listTemplatePresets());
    } catch (error) {
      setTemplatePresets([]);
      setTemplatePresetsError(error.message || String(error));
    } finally {
      setTemplatePresetsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (createChoiceOpen) loadTemplatePresets();
  }, [createChoiceOpen, loadTemplatePresets]);

  const openCreateName = (mode, preset = null) => {
    setPendingMode(mode);
    setPendingPreset(preset);
    setNewTitle("");
    setNewPreviewText("");
    setPreviewGenError(null);
    setCreateNameOpen(true);
  };

  const handleGeneratePreviewTextForCreate = async () => {
    if (!newPreviewText.trim()) return;
    setPreviewGenerating(true);
    setPreviewGenError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/generate-preview-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({ draft: newPreviewText }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur inconnue");
      setNewPreviewText(json.text || "");
    } catch (err) {
      setPreviewGenError(err.message);
    } finally {
      setPreviewGenerating(false);
    }
  };

  const handleCreate = async () => {
    const mode = pendingMode;
    const preset = pendingPreset;
    if (!profile?.id || !newTitle.trim()) return;
    setCreating(true);
    const initialState =
      mode === "blank"
        ? { ...INITIAL_STATE, sections: [], preview_text: newPreviewText }
        : mode === "preset" && preset
          ? { ...buildInitialStateFromTypes(preset.sections, {
              includeDefaultContent: preset.includeDefaultContent,
              showSectionNumbers: preset.showSectionNumbers,
              showBlockSeparators: preset.showBlockSeparators,
              themeVariant: preset.themeVariant,
              includeIssueDate: preset.includeIssueDate,
            }), preview_text: newPreviewText }
        : (() => {
            const template = getDefaultNewsletterTemplate();
            return { ...buildInitialStateFromTypes(template.sections, {
              includeDefaultContent: template.includeDefaultContent,
              showSectionNumbers: template.showSectionNumbers,
              showBlockSeparators: template.showBlockSeparators,
              themeVariant: template.themeVariant,
              includeIssueDate: template.includeIssueDate,
            }), preview_text: newPreviewText };
          })();
    const { data, error } = await supabase
      .from("newsletters")
      .insert({
        title: newTitle.trim(),
        issue_number: INITIAL_STATE.issue_number,
        current_state: initialState,
        created_by: profile.id,
        updated_by: profile.id,
      })
      .select()
      .single();
    setCreating(false);
    if (error) {
      addToast("Erreur à la création : " + error.message);
      return;
    }
    setCreateChoiceOpen(false);
    setCreateNameOpen(false);
    onOpen(data.id);
  };

  const parseMarkdownImport = (markdown, sourceLabel) => {
    if (!profile?.id) return;
    setImportingMarkdown(true);
    try {
      const imported = importNewsletterMarkdown(markdown);
      setMarkdownImportDraft({ imported, fileName: sourceLabel });
      setMarkdownImportSourceOpen(false);
      setPastedMarkdown("");
      setMarkdownBrief("");
      setCrmBriefVariants(null);
      setMarkdownGenerationLog(null);
    } catch (error) {
      addToast("Import Markdown impossible : " + (error.message || error), "error");
    } finally {
      setImportingMarkdown(false);
    }
  };

  const handleImportMarkdown = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    parseMarkdownImport(await file.text(), file.name);
  };

  const handlePasteMarkdownImport = () => {
    if (!pastedMarkdown.trim()) {
      addToast("Colle un contenu Markdown avant de continuer.", "error");
      return;
    }
    parseMarkdownImport(pastedMarkdown, "Markdown collé");
  };

  const resetMarkdownSourceModal = () => {
    setMarkdownImportSourceOpen(false);
    setPastedMarkdown("");
    setMarkdownBrief("");
    setCrmBriefVariants(null);
    setExpandedCrmVariant(null);
    setCrmVariantRefineDraft(null);
    setCrmVariantRefineComments("");
    setMarkdownGenerationLog(null);
  };

  const openMarkdownImportSource = (mode) => {
    setMarkdownImportMode(mode);
    setMarkdownImportSourceOpen(true);
  };

  const handleUseCrmVariant = (variant) => {
    setMarkdownBrief(variant.content || "");
    setCrmBriefVariants(null);
    setExpandedCrmVariant(null);
    setCrmVariantRefineDraft(null);
    setCrmVariantRefineComments("");
    addToast("Variante sélectionnée. Tu peux maintenant générer le Markdown.", "success");
  };

  const openCrmVariantRefine = (variant, index) => {
    setCrmVariantRefineDraft({ variant, index });
    setCrmVariantRefineComments("");
  };

  const handleGenerateCrmBrief = async () => {
    const input = markdownBrief.trim();
    if (!input) {
      addToast("Indique une intention, une cible ou un objectif avant de créer le contenu.", "error");
      return;
    }

    setGeneratingCrmBrief(true);
    setMarkdownGenerationLog(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Session expirée. Reconnecte-toi pour utiliser Gemini.");

      const response = await fetch("/api/generate-crm-brief", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ input }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Génération du contenu impossible.");

      const variants = Array.isArray(payload.variants) && payload.variants.length
        ? payload.variants
        : [{ id: "full", title: "Contenu généré", content: payload.content || "" }];
      setCrmBriefVariants({
        variants,
        fullContent: payload.content || "",
        appendix: payload.appendix || "",
        traceId: payload.trace_id || "",
        model: payload.model || "",
        originalInput: input,
      });
      addToast("Contenu CRM généré. Sélectionne une variante.", "success");
    } catch (error) {
      addToast("Génération du contenu impossible : " + (error.message || error), "error");
    } finally {
      setGeneratingCrmBrief(false);
    }
  };

  const handleRefineCrmVariant = async () => {
    if (!crmVariantRefineDraft) return;
    const comments = crmVariantRefineComments.trim();
    if (!comments) {
      addToast("Ajoute un commentaire pour guider Gemini.", "error");
      return;
    }

    setRefiningCrmVariant(true);
    setMarkdownGenerationLog(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Session expirée. Reconnecte-toi pour utiliser Gemini.");

      const response = await fetch("/api/generate-crm-brief", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          mode: "refine",
          input: crmBriefVariants?.originalInput || markdownBrief || "Améliorer la variante sélectionnée.",
          variant: crmVariantRefineDraft.variant.content || "",
          comments,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Amélioration de la variante impossible.");

      const refinedVariant = (Array.isArray(payload.variants) && payload.variants[0]) || {
        id: `${crmVariantRefineDraft.variant.id || "variant"}-refined`,
        title: "Variante améliorée",
        content: payload.content || "",
      };
      const nextVariant = {
        ...refinedVariant,
        id: `${crmVariantRefineDraft.variant.id || `variant-${crmVariantRefineDraft.index + 1}`}-refined-${Date.now()}`,
        title: refinedVariant.title || `${crmVariantRefineDraft.variant.title || "Variante"} · améliorée`,
      };

      setCrmBriefVariants((current) => {
        if (!current) return current;
        const variants = current.variants.map((variant, index) =>
          index === crmVariantRefineDraft.index ? nextVariant : variant
        );
        return {
          ...current,
          variants,
          appendix: payload.appendix || current.appendix || "",
          traceId: payload.trace_id || current.traceId,
          model: payload.model || current.model,
        };
      });
      setExpandedCrmVariant((current) =>
        current?.index === crmVariantRefineDraft.index ? { variant: nextVariant, index: crmVariantRefineDraft.index } : current
      );
      setCrmVariantRefineDraft(null);
      setCrmVariantRefineComments("");
      addToast("Variante améliorée avec Gemini.", "success");
    } catch (error) {
      addToast("Amélioration impossible : " + (error.message || error), "error");
    } finally {
      setRefiningCrmVariant(false);
    }
  };

  const handleGenerateMarkdownFromBrief = async () => {
    const brief = markdownBrief.trim();
    if (!brief) {
      addToast("Colle un brief ou un contenu libre avant de générer le Markdown.", "error");
      return;
    }

    setGeneratingMarkdownBrief(true);
    setMarkdownGenerationLog(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Session expirée. Reconnecte-toi pour utiliser Gemini.");

      const response = await fetch("/api/generate-markdown-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          brief,
          options: {
            theme_variant: markdownBriefTheme,
            show_section_numbers: markdownBriefShowNumbers,
            show_block_separators: markdownBriefShowSeparators,
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (payload.markdown) setPastedMarkdown(payload.markdown);
        setMarkdownGenerationLog({
          error: payload.error || "Génération Markdown impossible.",
          validationError: payload.validation_error || "",
          traceId: payload.trace_id || "",
          model: payload.model || "",
          markdown: payload.markdown || "",
          rawOutput: payload.raw_output || "",
        });
        throw new Error(payload.error || "Génération Markdown impossible.");
      }

      setMarkdownGenerationLog(null);
      setPastedMarkdown(payload.markdown);
      parseMarkdownImport(payload.markdown, "Brief généré avec Gemini");
    } catch (error) {
      setMarkdownGenerationLog((current) =>
        current || {
          error: error.message || String(error),
          validationError: "",
          traceId: "",
          model: "",
          markdown: "",
          rawOutput: "",
        }
      );
      addToast("Génération Markdown impossible : " + (error.message || error), "error");
    } finally {
      setGeneratingMarkdownBrief(false);
    }
  };

  const updateMarkdownImportState = (patch) =>
    setMarkdownImportDraft((draft) =>
      draft
        ? {
            ...draft,
            imported: {
              ...draft.imported,
              state: { ...draft.imported.state, ...patch },
            },
          }
        : draft
    );

  const handleConfirmMarkdownImport = async () => {
    const imported = markdownImportDraft?.imported;
    if (!imported || !profile?.id) return;

    setImportingMarkdown(true);
    try {
      const { data, error } = await supabase
        .from("newsletters")
        .insert({
          title: imported.title,
          issue_number: imported.state.issue_number,
          current_state: imported.state,
          created_by: profile.id,
          updated_by: profile.id,
        })
        .select()
        .single();
      if (error) throw error;

      const warningSuffix = imported.warnings.length
        ? ` ${imported.warnings.length} avertissement(s) à relire.`
        : "";
      addToast(`Newsletter Markdown importée.${warningSuffix}`, imported.warnings.length ? "info" : "success");
      setMarkdownImportDraft(null);
      onOpen(data.id);
    } catch (error) {
      addToast("Import Markdown impossible : " + (error.message || error), "error");
    } finally {
      setImportingMarkdown(false);
    }
  };

  const handleDuplicate = async (nl) => {
    if (!profile?.id || !nl?.id) return;
    const { data: full } = await supabase
      .from("newsletters")
      .select("*")
      .eq("id", nl.id)
      .single();
    if (!full) return;
    const { data, error } = await supabase
      .from("newsletters")
      .insert({
        title: full.title + " (copie)",
        issue_number: full.issue_number,
        current_state: full.current_state,
        created_by: profile.id,
        updated_by: profile.id,
      })
      .select()
      .single();
    if (error) {
      addToast("Erreur à la duplication : " + error.message);
      return;
    }
    const labelIds = nlLabels[nl.id] || [];
    if (labelIds.length > 0 && data?.id) {
      await supabase.from("newsletter_labels").insert(
        labelIds.map((lid) => ({ newsletter_id: data.id, label_id: lid, assigned_by: profile.id }))
      );
    }
    load();
  };

  const handleDelete = async (nl) => {
    if (!profile?.is_admin && nl?.created_by !== profile?.id) {
      addToast("Tu peux supprimer uniquement les templates que tu as créés.", "info");
      return;
    }
    if (!nl?.id) return;
    if (!await confirm(`Supprimer définitivement « ${nl.title || "cette newsletter"} » ?`, { danger: true, confirmLabel: "Supprimer" })) return;
    const { error } = await supabase.from("newsletters").delete().eq("id", nl.id);
    if (error) {
      addToast("Erreur : " + error.message);
      return;
    }
    load();
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Date inconnue";
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPreviewText = (nl) => {
    const text = nl?.current_state?.preview_text || "";
    // Décoder les entités HTML via un élément temporaire
    const decoded = typeof document !== "undefined"
      ? (() => { const el = document.createElement("div"); el.innerHTML = String(text); return el.textContent || el.innerText || ""; })()
      : String(text);
    const normalized = decoded
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return normalized || "Aucun texte de prévisualisation";
  };

  const getCreatorName = (nl) =>
    nl?.creator?.full_name || nl?.creator?.email || "Créateur inconnu";

  const normalize = (s) =>
    String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  const filteredNewsletters = useMemo(() => {
    const q = normalize(search);
    let list = q
      ? newsletters.filter(
          (nl) =>
            normalize(nl.title).includes(q) ||
            normalize(getPreviewText(nl)).includes(q)
        )
      : [...newsletters];

    if (labelFilter.length > 0) {
      list = list.filter((nl) =>
        labelFilter.every((lid) => (nlLabels[nl.id] || []).includes(lid))
      );
    }

    if (sortBy === "updated_asc") list.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));
    else if (sortBy === "updated_desc") list.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    else if (sortBy === "title_asc") list.sort((a, b) => normalize(a.title).localeCompare(normalize(b.title)));
    else if (sortBy === "title_desc") list.sort((a, b) => normalize(b.title).localeCompare(normalize(a.title)));

    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newsletters, search, sortBy, labelFilter, nlLabels]);

  const crmVariantGridClass = [
    "grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto overscroll-contain px-4 py-3 sm:gap-4 sm:p-6",
    (crmBriefVariants?.variants?.length || 0) === 2
      ? "lg:grid-cols-2"
      : (crmBriefVariants?.variants?.length || 0) > 2
        ? "xl:grid-cols-3"
        : "lg:grid-cols-1",
  ].join(" ");

  return (
    <div className="min-h-screen bg-d-bg">
      {/* Header */}
      <header
        className="border-b border-line px-4 sm:px-6"
        style={{ background: "rgb(var(--d-panel))", height: "52px" }}
      >
        <div className="flex h-full items-center gap-3 sm:gap-4">
          <Wordmark size={18} />

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {profile?.is_admin && (
              <button
                onClick={onOpenAdmin}
                className="flex shrink-0 items-center gap-2 rounded-full border border-line2 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-d-fg2 font-medium transition-colors hover:bg-d-panel2"
              >
                <Settings size={12} />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}
            <button
              onClick={() => setImageManagerOpen(true)}
              className="flex shrink-0 items-center gap-2 rounded-full border border-line2 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-d-fg2 font-medium transition-colors hover:bg-d-panel2"
            >
              <ImageIcon size={12} />
              <span className="hidden sm:inline">Images</span>
            </button>
            <div
              className="hidden max-w-[180px] truncate px-2 text-xs text-d-fg3 font-dm md:block"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {profile?.full_name || profile?.email}
            </div>
            <button
              onClick={signOut}
              className="flex shrink-0 items-center gap-2 rounded-full border border-line2 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-d-fg2 font-medium transition-colors hover:bg-d-panel2"
            >
              <LogOut size={12} />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="w-full min-w-0 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1
              className="text-d-fg font-bold text-3xl tracking-tight mb-1"
              style={{ fontFamily: "'Sora', sans-serif", letterSpacing: "-0.02em" }}
            >
              Mes newsletters
            </h1>
            <p className="text-sm text-d-fg3">
              {loading
                ? "Chargement…"
                : filteredNewsletters.length === newsletters.length
                  ? `${newsletters.length} newsletter${newsletters.length > 1 ? "s" : ""}`
                  : `${filteredNewsletters.length} / ${newsletters.length} newsletter${newsletters.length > 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={() => openMarkdownImportSource("gemini")}
              disabled={importingMarkdown || creating || generatingCrmBrief || generatingMarkdownBrief}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-d-pink/60 px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-d-pink transition-colors hover:bg-d-pink/10 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {generatingCrmBrief || generatingMarkdownBrief ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Assistant Gemini
            </button>
            <button
              type="button"
              onClick={() => openMarkdownImportSource("markdown")}
              disabled={importingMarkdown || creating || generatingCrmBrief || generatingMarkdownBrief}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-line2 px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-d-fg2 transition-colors hover:bg-d-panel2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {importingMarkdown ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
              Importer Markdown
            </button>
            <button
              onClick={() => setCreateChoiceOpen(true)}
              disabled={creating || importingMarkdown}
              className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[12px] uppercase tracking-[0.18em] font-semibold transition-colors disabled:opacity-50 sm:w-auto"
              style={{ background: "#FFFFFF", color: "#15151A" }}
            >
              <Plus size={14} />
              Nouveau Template
            </button>
          </div>
        </div>

        {/* Barre recherche + tri */}
        {newsletters.length > 0 && (
          <div className="mb-5 flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-d-fg4 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher par titre ou texte de prévisualisation…"
                  className="w-full pl-9 pr-8 py-2.5 bg-d-panel border border-line rounded-xl text-sm text-d-fg placeholder:text-d-fg4 focus:outline-none focus:border-line2 transition-colors"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-d-fg4 hover:text-d-fg2 transition-colors"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              <div className="relative">
                <ArrowUpDown size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-d-fg4 pointer-events-none" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="pl-8 pr-4 py-2.5 bg-d-panel border border-line rounded-xl text-sm text-d-fg focus:outline-none focus:border-line2 transition-colors appearance-none cursor-pointer"
                >
                  <option value="updated_desc">Plus récent</option>
                  <option value="updated_asc">Plus ancien</option>
                  <option value="title_asc">Titre A → Z</option>
                  <option value="title_desc">Titre Z → A</option>
                </select>
              </div>
            </div>
            {labels.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-d-fg4 font-medium flex-shrink-0">Labels :</span>
                {labels.map((label) => {
                  const active = labelFilter.includes(label.id);
                  return (
                    <button
                      key={label.id}
                      onClick={() =>
                        setLabelFilter((f) =>
                          active ? f.filter((id) => id !== label.id) : [...f, label.id]
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.12em] border transition-all"
                      style={{
                        background: active ? label.color + "33" : "transparent",
                        borderColor: active ? label.color + "88" : label.color + "44",
                        color: active ? label.color : label.color + "99",
                      }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: label.color }} />
                      {label.name}
                    </button>
                  );
                })}
                {labelFilter.length > 0 && (
                  <button
                    onClick={() => setLabelFilter([])}
                    className="text-[10px] uppercase tracking-[0.18em] text-d-fg4 hover:text-d-fg2 transition-colors"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {!loading && newsletters.length === 0 && (
          <div
            className="border rounded-2xl p-14 text-center border-line"
            style={{ background: "transparent", borderStyle: "dashed" }}
          >
            <FileText className="text-d-fg4 mx-auto mb-4" size={36} />
            <div className="text-sm text-d-fg2 mb-1 font-medium">
              Aucune newsletter pour l'instant
            </div>
            <div className="text-xs text-d-fg3">
              Clique sur « Nouveau Template » pour démarrer.
            </div>
          </div>
        )}

        {!loading && newsletters.length > 0 && filteredNewsletters.length === 0 && (
          <div
            className="border rounded-2xl p-12 text-center border-line"
            style={{ background: "transparent", borderStyle: "dashed" }}
          >
            <Search className="text-d-fg4 mx-auto mb-3" size={28} />
            <div className="text-sm text-d-fg2 mb-1 font-medium">Aucun résultat</div>
            <div className="text-xs text-d-fg3">
              Aucune newsletter ne correspond à « {search} ».
            </div>
          </div>
        )}

        {filteredNewsletters.length > 0 && (
          <div
            className="bg-d-panel rounded-2xl border border-line"
            onClick={() => setLabelPickerOpen(null)}
          >
            {filteredNewsletters.map((nl, i, arr) => {
              const lock = locks[nl.id];
              const lockedByOther = lock && lock.user_id !== profile?.id;
              const canDeleteNewsletter = profile?.is_admin || nl.created_by === profile?.id;
              const cardLabelIds = nlLabels[nl.id] || [];
              const cardLabels = labels.filter((l) => cardLabelIds.includes(l.id));
              const pickerOpen = labelPickerOpen === nl.id;
              const isFirst = i === 0;
              const isLast = i === arr.length - 1;
              return (
                <div key={nl.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpen(nl.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onOpen(nl.id);
                      }
                    }}
                    className={`group flex cursor-pointer items-start gap-3 px-4 py-4 transition-colors hover:bg-d-panel2 focus:bg-d-panel2 focus:outline-none sm:items-center sm:gap-4 sm:px-5 ${isFirst ? "rounded-t-2xl" : ""} ${isLast ? "rounded-b-2xl" : ""}`}
                  >
                    {/* Icon */}
                    <div
                      className="flex-shrink-0 w-11 h-11 rounded-xl bg-d-panel2 border border-line flex items-center justify-center"
                    >
                      <FileText size={18} className="text-d-fg3" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="mb-1 flex min-w-0 items-center gap-2">
                        <div
                          className="text-sm font-semibold text-d-fg truncate text-left"
                          style={{ fontFamily: "'Sora', sans-serif" }}
                        >
                          {nl.title || "Newsletter sans titre"}
                        </div>
                        {lockedByOther && (
                          <span
                            className="inline-flex flex-shrink-0 items-center gap-1 text-[10px] uppercase tracking-[0.14em] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(255,75,40,0.12)", color: "#FF8466" }}
                          >
                            <Lock size={10} />
                            {lock.user_full_name || lock.user_email}
                          </span>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-d-fg3">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {formatDate(nl.updated_at)}
                        </span>
                        <span className="flex items-center gap-1 min-w-0">
                          <User size={11} />
                          <span className="truncate">{getCreatorName(nl)}</span>
                        </span>
                        <span className="text-d-fg4 truncate">
                          {getPreviewText(nl)}
                        </span>
                      </div>
                      {cardLabels.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {cardLabels.map((label) => (
                            <span
                              key={label.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.12em]"
                              style={{
                                background: label.color + "22",
                                border: `1px solid ${label.color}55`,
                                color: label.color,
                              }}
                            >
                              {label.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                      {labels.length > 0 && (
                        <div className="relative">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setLabelPickerOpen((id) => (id === nl.id ? null : nl.id));
                            }}
                            className={`p-2 rounded-lg transition-colors ${pickerOpen ? "text-d-fg2 bg-d-panel3" : "text-d-fg4 hover:text-d-fg2 hover:bg-d-panel3"}`}
                          >
                            <Tag size={14} />
                          </button>
                          {pickerOpen && (
                            <div
                              className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-xl border border-line bg-d-panel shadow-xl"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {labels.map((label) => {
                                const checked = cardLabelIds.includes(label.id);
                                return (
                                  <button
                                    key={label.id}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (checked) {
                                        await removeLabel(nl.id, label.id);
                                        setNlLabels((m) => ({
                                          ...m,
                                          [nl.id]: (m[nl.id] || []).filter((id) => id !== label.id),
                                        }));
                                      } else {
                                        await assignLabel(nl.id, label.id, profile?.id);
                                        setNlLabels((m) => ({
                                          ...m,
                                          [nl.id]: [...(m[nl.id] || []), label.id],
                                        }));
                                      }
                                    }}
                                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-d-panel2"
                                  >
                                    <span
                                      className="h-3 w-3 flex-shrink-0 rounded-full border-2 transition-all"
                                      style={{
                                        background: checked ? label.color : "transparent",
                                        borderColor: label.color,
                                      }}
                                    />
                                    <span style={{ color: label.color }} className="font-semibold uppercase tracking-[0.1em] text-[10px]">
                                      {label.name}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDuplicate(nl);
                        }}
                        className="p-2 text-d-fg4 hover:text-d-fg2 hover:bg-d-panel3 rounded-lg transition-colors"
                      >
                        <Copy size={14} />
                      </button>
                      {canDeleteNewsletter && (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDelete(nl);
                          }}
                          className="p-2 text-d-fg4 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <div className="hidden p-2 text-d-fg4 transition-colors group-hover:text-d-fg2 sm:block">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="h-px mx-5 border-line" style={{ background: "var(--d-line)" }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
      {createChoiceOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="flex max-h-[calc(100vh-48px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-d-panel shadow-2xl">
            <div className="h-1 bg-gradient-to-r from-d-blue via-d-pink to-d-green" />
            <div className="p-6 border-b border-line flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-d-pink font-semibold mb-2">
                  Nouveau Template
                </div>
                <h2
                  className="text-xl font-semibold text-d-fg tracking-tight"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  Choisir un point de départ
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCreateChoiceOpen(false)}
                disabled={creating}
                className="h-8 w-8 inline-flex items-center justify-center text-d-fg4 hover:text-d-fg2 hover:bg-d-panel2 rounded-lg transition-colors disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto">
              <div className="grid grid-cols-1 gap-3 p-6 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => openCreateName("template")}
                  disabled={creating}
                  className="text-left rounded-2xl border border-line bg-d-panel2 p-5 hover:border-line2 hover:bg-d-panel3 transition-colors disabled:opacity-50"
                >
                  <FileText size={18} className="text-d-pink mb-4" />
                  <div className="text-sm font-semibold text-d-fg mb-2" style={{ fontFamily: "'Sora', sans-serif" }}>
                    Version par défaut
                  </div>
                  <div className="text-xs leading-relaxed text-d-fg4">
                    Crée la newsletter avec les blocs du template admin, selon le réglage de contenu par défaut.
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => openCreateName("blank")}
                  disabled={creating}
                  className="text-left rounded-2xl border border-line bg-d-panel2 p-5 hover:border-line2 hover:bg-d-panel3 transition-colors disabled:opacity-50"
                >
                  <Plus size={18} className="text-d-green mb-4" />
                  <div className="text-sm font-semibold text-d-fg mb-2" style={{ fontFamily: "'Sora', sans-serif" }}>
                    Version vide
                  </div>
                  <div className="text-xs leading-relaxed text-d-fg4">
                    Crée une newsletter sans blocs placés. Tu pourras composer la structure depuis l'éditeur.
                  </div>
                </button>
              </div>
              <div className="border-t border-line px-6 pb-6 pt-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-d-fg" style={{ fontFamily: "'Sora', sans-serif" }}>
                      Preset
                    </div>
                    <div className="text-[11px] text-d-fg4">
                      Dispositions créées depuis l'admin et disponibles à toute l'équipe.
                    </div>
                  </div>
                  {templatePresetsLoading && (
                    <Clock size={14} className="flex-shrink-0 animate-spin text-d-fg4" />
                  )}
                </div>
                {templatePresetsError && (
                  <div className="mb-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                    Presets indisponibles : {templatePresetsError}
                  </div>
                )}
                {!templatePresetsLoading && !templatePresetsError && templatePresets.length === 0 && (
                  <div className="rounded-xl border border-dashed border-line px-4 py-4 text-xs text-d-fg4">
                    Aucun preset partagé pour le moment.
                  </div>
                )}
                {templatePresets.length > 0 && (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {templatePresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => openCreateName("preset", preset)}
                        disabled={creating}
                        className="text-left rounded-xl border border-line bg-d-panel2 px-4 py-3 transition-colors hover:border-d-pink/70 hover:bg-d-panel3 disabled:opacity-50"
                      >
                        <div className="mb-1 text-sm font-semibold text-d-fg" style={{ fontFamily: "'Sora', sans-serif" }}>
                          {preset.name}
                        </div>
                        <div className="text-[11px] text-d-fg4">
                          {preset.sections.length} bloc{preset.sections.length > 1 ? "s" : ""} · {preset.includeDefaultContent ? "avec contenu" : "sans contenu"} · {preset.showSectionNumbers ? "numéroté" : "sans numérotation"} · {preset.showBlockSeparators ? "séparateurs" : "sans séparateurs"} · {preset.themeVariant === "light" ? "fond blanc" : "fond sombre"} · {preset.includeIssueDate ? "avec date" : "sans date"}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {creating && (
              <div className="px-6 pb-6 text-xs uppercase tracking-[0.18em] text-d-fg3 flex items-center gap-2">
                <Clock size={13} className="animate-spin" />
                Création…
              </div>
            )}
          </div>
        </div>
      )}
      {markdownImportDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[calc(100vh-32px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-line bg-d-panel shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
              <div className="min-w-0">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-d-pink">
                  Import Markdown
                </div>
                <h2 className="truncate text-xl font-semibold tracking-tight text-d-fg" style={{ fontFamily: "'Sora', sans-serif" }}>
                  {markdownImportDraft.imported.title}
                </h2>
                <p className="mt-1 truncate text-xs text-d-fg4">
                  {markdownImportDraft.fileName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMarkdownImportDraft(null)}
                disabled={importingMarkdown}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-d-fg4 transition-colors hover:bg-d-panel2 hover:text-d-fg2 disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-5 overflow-y-auto p-6">
              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-d-fg4">
                  Sections détectées
                </div>
                <div className="flex flex-wrap gap-2">
                  {markdownImportDraft.imported.state.sections.map((section, index) => (
                    <span
                      key={section.id}
                      className="rounded-full border border-line bg-d-panel2 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-d-fg2"
                    >
                      {String(index + 1).padStart(2, "0")} {section.type}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-d-panel2 px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-d-fg4">Date</div>
                  <div className="mt-1 text-sm text-d-fg2">
                    {markdownImportDraft.imported.state.issue_date || "Non renseignée"}
                  </div>
                </div>
                <div className="rounded-xl border border-line bg-d-panel2 px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-d-fg4">Prévisualisation</div>
                  <div className="mt-1 line-clamp-2 text-sm text-d-fg2">
                    {markdownImportDraft.imported.state.preview_text || "Non renseignée"}
                  </div>
                </div>
              </div>
              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-d-fg4">
                  Mise en forme
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-line bg-d-panel2 px-4 py-3">
                    <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-d-fg4">
                      <Palette size={12} />
                      Fond
                    </div>
                    <div className="grid grid-cols-2 rounded-lg border border-line bg-d-panel p-0.5">
                      {[
                        { value: "dark", label: "Sombre" },
                        { value: "light", label: "Clair" },
                      ].map((option) => {
                        const selected =
                          markdownImportDraft.imported.state.theme_variant === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => updateMarkdownImportState({ theme_variant: option.value })}
                            aria-pressed={selected}
                            className={`min-h-8 rounded-md px-2 text-[11px] font-semibold transition-colors ${
                              selected
                                ? "bg-d-pink text-white"
                                : "text-d-fg3 hover:text-d-fg"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <label className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-line bg-d-panel2 px-4 py-3">
                    <span className="min-w-0">
                      <span className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-d-fg4">
                        <Hash size={12} />
                        Sections
                      </span>
                      <span className="block text-sm font-medium text-d-fg2">Numéros</span>
                    </span>
                    <span className="relative inline-flex h-6 w-11 flex-shrink-0 items-center">
                      <input
                        type="checkbox"
                        checked={markdownImportDraft.imported.state.show_section_numbers !== false}
                        onChange={(event) =>
                          updateMarkdownImportState({ show_section_numbers: event.target.checked })
                        }
                        className="peer sr-only"
                      />
                      <span className="absolute inset-0 rounded-full border border-line bg-d-panel transition-colors peer-checked:border-d-pink peer-checked:bg-d-pink/25" />
                      <span className="relative ml-1 h-4 w-4 rounded-full bg-d-fg4 transition-transform peer-checked:translate-x-5 peer-checked:bg-d-pink" />
                    </span>
                  </label>
                  <label className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-line bg-d-panel2 px-4 py-3">
                    <span className="min-w-0">
                      <span className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-d-fg4">
                        <Minus size={12} />
                        Blocs
                      </span>
                      <span className="block text-sm font-medium text-d-fg2">Filets</span>
                    </span>
                    <span className="relative inline-flex h-6 w-11 flex-shrink-0 items-center">
                      <input
                        type="checkbox"
                        checked={markdownImportDraft.imported.state.show_block_separators !== false}
                        onChange={(event) =>
                          updateMarkdownImportState({ show_block_separators: event.target.checked })
                        }
                        className="peer sr-only"
                      />
                      <span className="absolute inset-0 rounded-full border border-line bg-d-panel transition-colors peer-checked:border-d-pink peer-checked:bg-d-pink/25" />
                      <span className="relative ml-1 h-4 w-4 rounded-full bg-d-fg4 transition-transform peer-checked:translate-x-5 peer-checked:bg-d-pink" />
                    </span>
                  </label>
                </div>
              </div>
              {markdownImportDraft.imported.warnings.length > 0 && (
                <div className="rounded-xl border border-[#FF8B28]/35 bg-[#FFF5E8] px-4 py-3 dark:bg-[#2A1A0A]">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A4F00] dark:text-[#FFD6A6]">
                    Avertissements
                  </div>
                  <div className="space-y-1 text-xs leading-relaxed text-[#5C3300] dark:text-[#FFE3C2]">
                    {markdownImportDraft.imported.warnings.map((warning, index) => (
                      <p key={`${index}-${warning}`}>{warning}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-line px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setMarkdownImportDraft(null)}
                disabled={importingMarkdown}
                className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-d-fg3 transition-colors hover:border-line2 hover:text-d-fg disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmMarkdownImport}
                disabled={importingMarkdown}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-d-pink px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {importingMarkdown && <Loader2 size={12} className="animate-spin" />}
                Créer la newsletter
              </button>
            </div>
          </div>
        </div>
      )}
      {markdownImportSourceOpen && !markdownImportDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[calc(100vh-32px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-d-panel shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-d-pink">
                  Import Markdown
                </div>
                <h2 className="text-xl font-semibold tracking-tight text-d-fg" style={{ fontFamily: "'Sora', sans-serif" }}>
                  {markdownImportMode === "gemini" ? "Assistant de génération" : "Importer un Markdown"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetMarkdownSourceModal();
                }}
                disabled={importingMarkdown || generatingCrmBrief || generatingMarkdownBrief}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-d-fg4 transition-colors hover:bg-d-panel2 hover:text-d-fg2 disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4 overflow-y-auto p-6">
              {markdownImportMode === "gemini" && (
              <div className="rounded-xl border border-d-pink/30 bg-d-panel2 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles size={14} className="text-d-pink" />
                  <div>
                    <div className="text-sm font-semibold text-d-fg">Assistant de génération Gemini</div>
                    <div className="mt-0.5 text-xs text-d-fg4">
                      Crée un contenu CRM puis transforme-le en Markdown importable.
                    </div>
                  </div>
                </div>
                <textarea
                  value={markdownBrief}
                  onChange={(event) => setMarkdownBrief(event.target.value)}
                  placeholder="Écris une intention CRM courte, colle un brief, un brouillon email, un échange ou une consigne. Gemini peut d'abord créer le contenu, puis le transformer en Markdown importable."
                  className="min-h-40 w-full resize-y rounded-xl border border-line bg-d-panel px-3 py-3 text-xs leading-relaxed text-d-fg outline-none placeholder:text-d-fg4 focus:border-d-pink/60"
                />
                <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <div className="rounded-lg border border-line bg-d-panel px-3 py-3">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-d-fg4">
                      Fond
                    </div>
                    <div className="grid grid-cols-2 rounded-lg border border-line bg-d-panel2 p-0.5">
                      {[
                        { value: "dark", label: "Noir" },
                        { value: "light", label: "Blanc" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setMarkdownBriefTheme(option.value)}
                          aria-pressed={markdownBriefTheme === option.value}
                          className={`min-h-8 rounded-md px-2 text-[11px] font-semibold transition-colors ${
                            markdownBriefTheme === option.value
                              ? "bg-d-pink text-white"
                              : "text-d-fg3 hover:text-d-fg"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-line bg-d-panel px-3 py-3">
                    <span>
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-d-fg4">Sections</span>
                      <span className="block text-sm font-medium text-d-fg2">Numérotées</span>
                    </span>
                    <span className="relative inline-flex h-6 w-11 flex-shrink-0 items-center">
                      <input
                        type="checkbox"
                        checked={markdownBriefShowNumbers}
                        onChange={(event) => setMarkdownBriefShowNumbers(event.target.checked)}
                        className="peer sr-only"
                      />
                      <span className="absolute inset-0 rounded-full border border-line bg-d-panel2 transition-colors peer-checked:border-d-pink peer-checked:bg-d-pink/25" />
                      <span className="relative ml-1 h-4 w-4 rounded-full bg-d-fg4 transition-transform peer-checked:translate-x-5 peer-checked:bg-d-pink" />
                    </span>
                  </label>
                  <label className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-line bg-d-panel px-3 py-3">
                    <span>
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-d-fg4">Blocs</span>
                      <span className="block text-sm font-medium text-d-fg2">Séparateurs</span>
                    </span>
                    <span className="relative inline-flex h-6 w-11 flex-shrink-0 items-center">
                      <input
                        type="checkbox"
                        checked={markdownBriefShowSeparators}
                        onChange={(event) => setMarkdownBriefShowSeparators(event.target.checked)}
                        className="peer sr-only"
                      />
                      <span className="absolute inset-0 rounded-full border border-line bg-d-panel2 transition-colors peer-checked:border-d-pink peer-checked:bg-d-pink/25" />
                      <span className="relative ml-1 h-4 w-4 rounded-full bg-d-fg4 transition-transform peer-checked:translate-x-5 peer-checked:bg-d-pink" />
                    </span>
                  </label>
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleGenerateCrmBrief}
                    disabled={generatingCrmBrief || generatingMarkdownBrief || importingMarkdown}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-d-panel px-4 py-2 text-xs font-semibold text-d-fg2 transition-colors hover:border-line2 hover:text-d-fg disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {generatingCrmBrief ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    Créer le contenu avec Gemini
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateMarkdownFromBrief}
                    disabled={generatingCrmBrief || generatingMarkdownBrief || importingMarkdown}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-d-pink px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {generatingMarkdownBrief ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    Générer et valider
                  </button>
                </div>
                {markdownGenerationLog && (
                  <div className="mt-4 rounded-xl border border-[#FF4B28]/40 bg-[#FFF3EE] p-4 text-[#3A1A12]">
                    <div className="mb-2 flex items-center gap-2">
                      <AlertTriangle size={14} className="text-[#D93B19]" />
                      <div className="text-sm font-semibold">Logs d'erreur du Markdown généré</div>
                    </div>
                    <div className="space-y-1 text-xs leading-relaxed">
                      <p>{markdownGenerationLog.error}</p>
                      {markdownGenerationLog.validationError && (
                        <p>
                          <span className="font-semibold">Validation :</span> {markdownGenerationLog.validationError}
                        </p>
                      )}
                      {(markdownGenerationLog.traceId || markdownGenerationLog.model) && (
                        <p className="font-mono text-[11px] text-[#7A3A28]">
                          {markdownGenerationLog.traceId && `trace_id=${markdownGenerationLog.traceId}`}
                          {markdownGenerationLog.traceId && markdownGenerationLog.model && " | "}
                          {markdownGenerationLog.model && `model=${markdownGenerationLog.model}`}
                        </p>
                      )}
                    </div>
                    {markdownGenerationLog.markdown && (
                      <div className="mt-3">
                        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A5482D]">
                          Markdown généré
                        </div>
                        <textarea
                          readOnly
                          value={markdownGenerationLog.markdown}
                          className="max-h-72 min-h-40 w-full resize-y rounded-lg border border-[#FFB29D] bg-white px-3 py-3 font-mono text-[11px] leading-relaxed text-[#24100B] outline-none"
                        />
                      </div>
                    )}
                    {markdownGenerationLog.rawOutput && markdownGenerationLog.rawOutput !== markdownGenerationLog.markdown && (
                      <details className="mt-3 rounded-lg border border-[#FFB29D] bg-white px-3 py-3">
                        <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A5482D]">
                          Sortie brute Gemini
                        </summary>
                        <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-[#24100B]">
                          {markdownGenerationLog.rawOutput}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
              )}
              {markdownImportMode === "markdown" && (
              <>
              <div className="rounded-xl border border-line bg-d-panel2 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <FileUp size={14} className="text-d-fg3" />
                  <div>
                    <div className="text-sm font-semibold text-d-fg">Importer un Markdown existant</div>
                    <div className="mt-0.5 text-xs text-d-fg4">
                      Choisis un fichier ou colle directement un contenu `.md`.
                    </div>
                  </div>
                </div>
                <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-d-panel px-4 py-4 transition-colors hover:border-line2 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-line bg-d-panel2 text-d-fg2">
                      <FileUp size={16} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-d-fg">Choisir un fichier</span>
                      <span className="block text-xs text-d-fg4">.md ou .markdown</span>
                    </span>
                  </span>
                  <span className="rounded-lg border border-line px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-d-fg2">
                    Parcourir
                  </span>
                  <input
                    type="file"
                    accept=".md,.markdown,text/markdown,text/plain"
                    disabled={importingMarkdown || creating || generatingCrmBrief || generatingMarkdownBrief}
                    onChange={handleImportMarkdown}
                    className="sr-only"
                  />
                </label>
                <div className="mb-3 mt-4 flex items-center gap-2">
                  <ClipboardPaste size={14} className="text-d-fg3" />
                  <div className="text-sm font-semibold text-d-fg">Coller un Markdown</div>
                </div>
                <textarea
                  value={pastedMarkdown}
                  onChange={(event) => setPastedMarkdown(event.target.value)}
                  placeholder={"---\ntitle: \"Ma newsletter\"\npreview_text: \"...\"\n---\n\n# Titre"}
                  className="min-h-64 w-full resize-y rounded-xl border border-line bg-d-panel px-3 py-3 font-mono text-xs leading-relaxed text-d-fg outline-none placeholder:text-d-fg4 focus:border-d-pink/60"
                />
              </div>
              <div className="rounded-xl border border-line bg-d-panel2 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-d-fg">Spécifications du fichier Markdown</div>
                    <div className="mt-1 text-xs leading-relaxed text-d-fg4">
                      Le fichier doit commencer par un front matter, puis du Markdown simple ou des directives.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPastedMarkdown(MARKDOWN_IMPORT_TEMPLATE)}
                    className="inline-flex flex-shrink-0 items-center gap-2 rounded-lg border border-line px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-d-fg2 transition-colors hover:border-line2 hover:text-d-fg"
                  >
                    <Copy size={12} />
                    Insérer exemple
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 text-xs leading-relaxed text-d-fg3 lg:grid-cols-2">
                  <div className="rounded-lg border border-line bg-d-panel px-3 py-3">
                    <div className="mb-2 font-semibold uppercase tracking-[0.14em] text-d-fg4">Front matter</div>
                    <div className="space-y-1">
                      <p><code className="text-d-fg">title</code> obligatoire</p>
                      <p><code className="text-d-fg">preview_text</code>, <code className="text-d-fg">brand_name</code>, <code className="text-d-fg">issue_number</code>, <code className="text-d-fg">issue_date</code></p>
                      <p><code className="text-d-fg">theme_variant</code> : <code>dark</code> ou <code>light</code></p>
                      <p><code className="text-d-fg">show_section_numbers</code> et <code className="text-d-fg">show_block_separators</code> : <code>true</code> ou <code>false</code></p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-line bg-d-panel px-3 py-3">
                    <div className="mb-2 font-semibold uppercase tracking-[0.14em] text-d-fg4">Markdown simple</div>
                    <div className="space-y-1">
                      <p>Premier <code className="text-d-fg"># Titre</code> : hero</p>
                      <p><code className="text-d-fg">## Titre</code> ou texte : bloc texte</p>
                      <p><code className="text-d-fg">![Alt](https://...)</code> : image</p>
                      <p><code className="text-d-fg">---</code> hors front matter : séparateur fin</p>
                    </div>
                  </div>
                </div>
                <details className="mt-3 rounded-lg border border-line bg-d-panel px-3 py-3 text-xs leading-relaxed text-d-fg3">
                  <summary className="cursor-pointer font-semibold uppercase tracking-[0.14em] text-d-fg4">
                    Directives et règles avancées
                  </summary>
                  <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <div>
                      <div className="mb-1 font-semibold text-d-fg2">Sections supportées</div>
                      <p>
                        <code>hero</code>, <code>index</code>, <code>edito</code>, <code>text_block</code>, <code>image_block</code>, <code>divider</code>, <code>chart</code>, <code>fear_greed</code>, <code>signals</code>, <code>macro</code>, <code>macro_bars</code>, <code>commented_number</code>, <code>editorial_list</code>, <code>focus</code>, <code>feature_grid</code>, <code>event</code>.
                      </p>
                    </div>
                    <div>
                      <div className="mb-1 font-semibold text-d-fg2">Sous-directives</div>
                      <p>
                        <code>hero_chips</code>, <code>edito_kpis</code>, <code>focus_text</code>, <code>focus_image</code>, <code>focus_cta</code>, <code>focus_callout</code>, <code>focus_spacer</code>, <code>feature_grid_featured</code>.
                      </p>
                    </div>
                    <div>
                      <div className="mb-1 font-semibold text-d-fg2">Listes structurées</div>
                      <p>
                        Les blocs répétés utilisent des lignes <code>- colonne 1 | colonne 2 | colonne 3</code>. Le caractère <code>|</code> sépare les colonnes et ne doit pas être utilisé dans leur texte.
                      </p>
                    </div>
                    <div>
                      <div className="mb-1 font-semibold text-d-fg2">URLs et graphiques</div>
                      <p>
                        Les images et CTA attendent des URLs <code>http</code> ou <code>https</code>. Un <code>chart</code> auto sera importé puis rafraîchi avec CoinGecko dans l'éditeur.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg bg-d-panel2 px-3 py-2 font-mono text-[11px] text-d-fg2">
                    :::text_block<br />
                    kicker: "ANALYSE"<br />
                    title: "Titre du bloc"<br />
                    :::<br /><br />
                    Corps Markdown du bloc.
                  </div>
                </details>
              </div>
              </>
              )}
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-line px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  resetMarkdownSourceModal();
                }}
                disabled={importingMarkdown || generatingCrmBrief || generatingMarkdownBrief}
                className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-d-fg3 transition-colors hover:border-line2 hover:text-d-fg disabled:opacity-50"
              >
                Annuler
              </button>
              {markdownImportMode === "markdown" && (
              <button
                type="button"
                onClick={handlePasteMarkdownImport}
                disabled={importingMarkdown || generatingCrmBrief || generatingMarkdownBrief}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-d-pink px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {importingMarkdown && <Loader2 size={12} className="animate-spin" />}
                Valider le Markdown collé
              </button>
              )}
            </div>
          </div>
        </div>
      )}
      {crmBriefVariants && (
        <div className="fixed inset-0 z-[60] flex items-stretch justify-center bg-black/70 p-2 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line bg-d-panel shadow-2xl sm:max-h-[calc(100vh-32px)]">
            <div className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-line px-4 py-4 sm:px-6 sm:py-5">
              <div className="min-w-0">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-d-pink">
                  Contenu Gemini
                </div>
                <h2 className="text-lg font-semibold tracking-tight text-d-fg sm:text-xl" style={{ fontFamily: "'Sora', sans-serif" }}>
                  Choisir une variante
                </h2>
                {(crmBriefVariants.traceId || crmBriefVariants.model) && (
                  <div className="mt-2 break-all font-mono text-[10px] text-d-fg4 sm:text-[11px]">
                    {crmBriefVariants.traceId && `trace_id=${crmBriefVariants.traceId}`}
                    {crmBriefVariants.traceId && crmBriefVariants.model && " | "}
                    {crmBriefVariants.model && `model=${crmBriefVariants.model}`}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setCrmBriefVariants(null);
                  setExpandedCrmVariant(null);
                  setCrmVariantRefineDraft(null);
                  setCrmVariantRefineComments("");
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-d-fg4 transition-colors hover:bg-d-panel2 hover:text-d-fg2"
              >
                <X size={16} />
              </button>
            </div>
            <div className={crmVariantGridClass}>
              {crmBriefVariants.variants.map((variant, index) => (
                <div
                  key={variant.id || index}
                  className="flex min-h-0 flex-col rounded-xl border border-line bg-d-panel2 p-3 sm:p-4"
                >
                  <div className="mb-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-d-fg4">
                      Variante {index + 1}
                    </div>
                    <div className="mt-1 text-sm font-semibold leading-snug text-d-fg">
                      {variant.title || `Variante ${index + 1}`}
                    </div>
                  </div>
                  <div className="max-h-72 flex-1 overflow-hidden rounded-lg border border-line bg-d-panel px-3 py-3 [mask-image:linear-gradient(to_bottom,#000_78%,transparent)] sm:max-h-[520px] sm:min-h-64 sm:overflow-auto sm:px-4 sm:py-4 sm:[mask-image:none]">
                    <CrmVariantPreview content={variant.content} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-4">
                    <button
                      type="button"
                      onClick={() => setExpandedCrmVariant({ variant, index })}
                      className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-line px-2 py-2 text-[11px] font-semibold text-d-fg2 transition-colors hover:border-line2 hover:text-d-fg sm:gap-2 sm:px-3 sm:text-xs"
                    >
                      <Maximize2 size={13} />
                      <span className="truncate">Agrandir</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openCrmVariantRefine(variant, index)}
                      className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-line px-2 py-2 text-[11px] font-semibold text-d-fg2 transition-colors hover:border-line2 hover:text-d-fg sm:gap-2 sm:px-3 sm:text-xs"
                    >
                      <MessageSquare size={13} />
                      <span className="truncate">Améliorer</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUseCrmVariant(variant)}
                      className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl bg-d-pink px-2 py-2 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 sm:gap-2 sm:px-3 sm:text-xs"
                    >
                      <span className="truncate">Utiliser</span>
                    </button>
                  </div>
                </div>
              ))}
              {crmBriefVariants.appendix && (
                <details className="rounded-xl border border-line bg-d-panel2 p-3 sm:p-4 lg:col-span-2 xl:col-span-3">
                  <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-[0.18em] text-d-fg4 transition-colors hover:text-d-fg2">
                    Informations de génération
                  </summary>
                  <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-line bg-d-panel px-3 py-3 sm:px-4 sm:py-4">
                    <CrmVariantPreview content={crmBriefVariants.appendix} />
                  </div>
                </details>
              )}
            </div>
            <div className="flex flex-shrink-0 gap-2 border-t border-line px-4 py-3 sm:flex-row sm:justify-end sm:px-6 sm:py-4">
              <button
                type="button"
                onClick={() => {
                  setCrmBriefVariants(null);
                  setExpandedCrmVariant(null);
                  setCrmVariantRefineDraft(null);
                  setCrmVariantRefineComments("");
                }}
                className="flex-1 rounded-xl border border-line px-4 py-2 text-xs font-semibold text-d-fg3 transition-colors hover:border-line2 hover:text-d-fg sm:flex-none"
              >
                Fermer
              </button>
              {crmBriefVariants.fullContent && (
                <button
                  type="button"
                  onClick={() => handleUseCrmVariant({
                    title: "Toutes les variantes",
                    content: crmBriefVariants.fullContent,
                  })}
                  className="flex-1 rounded-xl border border-line px-4 py-2 text-xs font-semibold text-d-fg2 transition-colors hover:border-line2 hover:text-d-fg sm:flex-none"
                >
                  Tout utiliser
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {expandedCrmVariant && (
        <div className="fixed inset-0 z-[70] flex items-stretch justify-center bg-black/75 p-2 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-line bg-d-panel shadow-2xl sm:max-h-[calc(100vh-32px)]">
            <div className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-line px-4 py-4 sm:px-6 sm:py-5">
              <div className="min-w-0">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-d-pink">
                  Variante {expandedCrmVariant.index + 1}
                </div>
                <h2 className="text-lg font-semibold tracking-tight text-d-fg sm:text-2xl" style={{ fontFamily: "'Sora', sans-serif" }}>
                  {expandedCrmVariant.variant.title || `Variante ${expandedCrmVariant.index + 1}`}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setExpandedCrmVariant(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-d-fg4 transition-colors hover:bg-d-panel2 hover:text-d-fg2"
              >
                <X size={16} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-8 sm:py-6">
              <div className="mx-auto max-w-3xl rounded-xl border border-line bg-d-panel2 px-4 py-4 sm:px-6 sm:py-6">
                <CrmVariantPreview content={expandedCrmVariant.variant.content} />
              </div>
            </div>
            <div className="flex flex-shrink-0 flex-col-reverse gap-2 border-t border-line px-4 py-3 sm:flex-row sm:justify-end sm:px-6 sm:py-4">
              <button
                type="button"
                onClick={() => setExpandedCrmVariant(null)}
                className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-d-fg3 transition-colors hover:border-line2 hover:text-d-fg"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => openCrmVariantRefine(expandedCrmVariant.variant, expandedCrmVariant.index)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-line px-4 py-2 text-xs font-semibold text-d-fg2 transition-colors hover:border-line2 hover:text-d-fg"
              >
                <MessageSquare size={13} />
                Améliorer
              </button>
              <button
                type="button"
                onClick={() => handleUseCrmVariant(expandedCrmVariant.variant)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-d-pink px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
              >
                Utiliser cette variante
              </button>
            </div>
          </div>
        </div>
      )}
      {crmVariantRefineDraft && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="flex max-h-[calc(100vh-32px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-d-panel shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-d-pink">
                  Amélioration Gemini
                </div>
                <h2 className="text-lg font-semibold tracking-tight text-d-fg" style={{ fontFamily: "'Sora', sans-serif" }}>
                  Comment ajuster cette variante ?
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (refiningCrmVariant) return;
                  setCrmVariantRefineDraft(null);
                  setCrmVariantRefineComments("");
                }}
                disabled={refiningCrmVariant}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-d-fg4 transition-colors hover:bg-d-panel2 hover:text-d-fg2 disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>
            <div className="min-h-0 overflow-y-auto p-5 sm:p-6">
              <div className="mb-4 rounded-xl border border-line bg-d-panel2 px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-d-fg4">
                  Variante sélectionnée
                </div>
                <div className="mt-1 text-sm font-semibold text-d-fg">
                  {crmVariantRefineDraft.variant.title || `Variante ${crmVariantRefineDraft.index + 1}`}
                </div>
              </div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.15em] text-d-fg4">
                Commentaires
              </label>
              <textarea
                value={crmVariantRefineComments}
                onChange={(event) => setCrmVariantRefineComments(event.target.value)}
                disabled={refiningCrmVariant}
                rows={7}
                className="w-full resize-none rounded-xl border border-line bg-d-panel2 px-4 py-3 text-sm leading-relaxed text-d-fg outline-none transition-colors placeholder:text-d-fg4 focus:border-d-pink disabled:opacity-50"
                placeholder="Ex. plus court, ton plus premium, renforcer la preuve MiCA, ajouter une citation, CTA plus direct..."
              />
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={() => {
                  setCrmVariantRefineDraft(null);
                  setCrmVariantRefineComments("");
                }}
                disabled={refiningCrmVariant}
                className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-d-fg3 transition-colors hover:border-line2 hover:text-d-fg disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleRefineCrmVariant}
                disabled={refiningCrmVariant || !crmVariantRefineComments.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-d-pink px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {refiningCrmVariant && <Loader2 size={13} className="animate-spin" />}
                Améliorer avec Gemini
              </button>
            </div>
          </div>
        </div>
      )}
      {createNameOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-line bg-d-panel shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="text-xl font-semibold text-d-fg tracking-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
                Nommer la newsletter
              </h2>
              <button
                type="button"
                onClick={() => setCreateNameOpen(false)}
                disabled={creating}
                className="h-8 w-8 inline-flex items-center justify-center text-d-fg4 hover:text-d-fg2 hover:bg-d-panel2 rounded-lg transition-colors disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); handleCreate(); }}
              className="flex flex-col gap-4 p-6"
            >
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] font-semibold text-d-fg4">
                  Nom <span className="text-d-pink">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Décrypto N°42"
                  className="w-full rounded-xl border border-line bg-d-panel2 px-3 py-2.5 text-sm text-d-fg placeholder:text-d-fg4 focus:outline-none focus:border-line2"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] uppercase tracking-[0.15em] font-semibold text-d-fg4">
                    Texte de prévisualisation
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePreviewTextForCreate}
                    disabled={previewGenerating || !newPreviewText.trim()}
                    title="Reformule le texte saisi en preheader optimisé"
                    className="ai-action-button flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] font-semibold px-2 py-1 rounded-full border transition-colors disabled:opacity-40"
                  >
                    {previewGenerating ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                    Améliorer
                  </button>
                </div>
                <input
                  type="text"
                  value={newPreviewText}
                  onChange={(e) => setNewPreviewText(e.target.value)}
                  placeholder="Le marché reprend son souffle…"
                  className="w-full rounded-xl border border-line bg-d-panel2 px-3 py-2.5 text-sm text-d-fg placeholder:text-d-fg4 focus:outline-none focus:border-line2"
                />
                {previewGenError && (
                  <p className="text-[10px]" style={{ color: "#FF8466" }}>{previewGenError}</p>
                )}
                <p className="text-[10px] text-d-fg4">Affiché sous l'objet dans la boîte de réception. Facultatif.</p>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCreateNameOpen(false)}
                  disabled={creating}
                  className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-d-fg3 hover:text-d-fg hover:border-line2 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating || !newTitle.trim()}
                  className="rounded-xl bg-d-pink px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {creating ? "Création…" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {imageManagerOpen && (
        <ImageManagerModal
          onClose={() => setImageManagerOpen(false)}
          userId={profile?.id}
          isAdmin={profile?.is_admin}
        />
      )}
    </div>
  );
}
