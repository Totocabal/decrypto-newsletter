// ─────────────────────────────────────────────────────────────────────────────
// NewslettersListPage — page d'accueil avec liste de toutes les newsletters
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
  BookOpen,
  HelpCircle,
  Hash,
  Minus,
  Palette,
  AlertTriangle,
  Maximize2,
  MessageSquare,
  Archive,
  RotateCcw,
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
title: "Le marché reprend son souffle."
title_accent: "souffle"
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

const NEWSLETTER_SELECT_WITH_ARCHIVE =
  "id, title, current_state, updated_at, updated_by, archived, archived_at, archive_expires_at, created_by, creator:profiles!newsletters_created_by_fkey(full_name, email), archiver:profiles!newsletters_archived_by_fkey(full_name, email)";
const NEWSLETTER_SELECT_LEGACY =
  "id, title, current_state, updated_at, updated_by, archived, created_by, creator:profiles!newsletters_created_by_fkey(full_name, email)";

function isMissingArchiveColumn(error) {
  return /archived_at|archive_expires_at|archived_by|schema cache|column .* does not exist/i.test(error?.message || "");
}

const MARKDOWN_HELP_EXAMPLES = [
  {
    id: "minimal",
    label: "Email simple",
    description: "Un objet, un pré-header et un bloc texte.",
    markdown: `---
title: "Votre compte est prêt"
preview_text: "Découvrez les prochaines étapes."
brand_name: "COINHOUSE"
theme_variant: light
show_section_numbers: false
show_block_separators: false
---

:::text_block
:::

Bonjour {{\${first_name} | default: ""}},

Votre compte Coinhouse est prêt. Vous pouvez maintenant acheter, vendre et échanger vos crypto-actifs depuis votre espace sécurisé.
`,
  },
  {
    id: "list-cta",
    label: "Liste + CTA",
    description: "Idéal pour étapes, bénéfices ou arguments produit.",
    markdown: `---
title: "Activez votre compte euro"
preview_text: "Trois bénéfices pour piloter vos achats crypto."
brand_name: "COINHOUSE"
theme_variant: light
show_section_numbers: false
show_block_separators: false
---

:::editorial_list
kicker: "EN 3 POINTS"
:::

- 01 | Un compte à votre nom | Un IBAN français pour alimenter votre compte Coinhouse. | #03FFCF
- 02 | Moins de frais | Les virements coûtent moins cher que les achats par carte de paiement. | #FF8B28
- 03 | Achats récurrents | Programmez vos achats crypto-actifs sans y penser. | #B36BFF

:::cta
label: "Activer mon compte"
url: "https://www.coinhouse.com/"
arrow: true
centered: false
:::
`,
  },
  {
    id: "focus",
    label: "Encadré + CTA",
    description: "Pour regrouper une recommandation et une action.",
    markdown: `---
title: "Une action à ne pas manquer"
preview_text: "Un rappel clair pour passer à l'action."
brand_name: "COINHOUSE"
theme_variant: dark
show_section_numbers: true
show_block_separators: true
---

:::focus
kicker: "À RETENIR"
title: "Passez à l'action en quelques minutes"
:::

:::focus_text
:::

Votre espace Coinhouse vous permet de gérer vos achats et vos échanges depuis un environnement simple et accompagné.

:::focus_cta
label: "Découvrir mon espace"
url: "https://www.coinhouse.com/"
arrow: true
centered: false
:::
`,
  },
  {
    id: "feature-grid",
    label: "Grille bénéfices",
    description: "Pour 3 ou 4 fonctionnalités comparables.",
    markdown: `---
title: "Pourquoi activer votre compte euro"
preview_text: "Trois bénéfices concrets pour vos achats crypto."
brand_name: "COINHOUSE"
theme_variant: light
show_section_numbers: false
show_block_separators: false
---

:::feature_grid
kicker: "BÉNÉFICES"
:::

- IBAN français | Alimentez votre compte Coinhouse par virement. | shield | #03FFCF
- Frais réduits | Limitez les frais liés aux paiements par carte. | euro | #FF8B28
- Achat récurrent | Programmez vos achats crypto-actifs dans le temps. | target | #B36BFF
`,
  },
];

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

function useDropdownDismiss(open, onClose) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onClose();
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  return ref;
}

function LabelDropdown({ labels, value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useDropdownDismiss(open, () => setOpen(false));
  const selected = labels.find((label) => label.id === value);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-d-panel2 px-3 py-2.5 text-left transition-colors hover:border-line2"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
            style={{ background: selected?.color || "#FF00AA" }}
          />
          <span
            className="truncate text-[11px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: selected?.color || "rgb(var(--d-fg3))" }}
          >
            {selected?.name || "Aucun label"}
          </span>
        </span>
        <ChevronRight size={14} className={`flex-shrink-0 text-d-fg4 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-[220px] rounded-xl border border-line bg-d-panel shadow-2xl">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="flex w-full items-center gap-3 rounded-t-xl px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-d-fg3 transition-colors hover:bg-d-panel2"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-d-fg4" />
            Aucun label
          </button>
          {labels.map((label, index) => {
            const color = label.color || "#FF00AA";
            const selected = value === label.id;
            return (
              <button
                key={label.id}
                type="button"
                onClick={() => {
                  onChange(label.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors hover:bg-d-panel2 ${
                  index === labels.length - 1 ? "rounded-b-xl" : ""
                }`}
                style={{ color }}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full border-2"
                  style={{
                    borderColor: color,
                    background: selected ? color : "transparent",
                  }}
                />
                {label.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LabelFilterDropdown({ labels, value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useDropdownDismiss(open, () => setOpen(false));
  const selectedLabels = labels.filter((label) => value.includes(label.id));
  const firstSelected = selectedLabels[0];
  const labelText =
    selectedLabels.length === 0
      ? "Tous labels"
      : selectedLabels.length === 1
        ? firstSelected.name
        : `${selectedLabels.length} labels`;

  const toggleLabel = (labelId) => {
    onChange(
      value.includes(labelId)
        ? value.filter((id) => id !== labelId)
        : [...value, labelId]
    );
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-d-panel px-3 py-2.5 text-left text-sm text-d-fg transition-colors hover:border-line2 focus:border-line2 focus:outline-none sm:min-w-[180px]"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Tag size={13} className="flex-shrink-0 text-d-fg4" />
          <span
            className="truncate text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: firstSelected?.color || "rgb(var(--d-fg3))" }}
          >
            {labelText}
          </span>
        </span>
        <ChevronRight size={14} className={`flex-shrink-0 text-d-fg4 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-[220px] rounded-xl border border-line bg-d-panel shadow-2xl">
          <button
            type="button"
            onClick={() => onChange([])}
            className="flex w-full items-center gap-3 rounded-t-xl px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-d-fg3 transition-colors hover:bg-d-panel2"
          >
            <span className={`h-2.5 w-2.5 rounded-full ${value.length === 0 ? "bg-d-pink" : "bg-d-fg4"}`} />
            Tous labels
          </button>
          {labels.map((label, index) => {
            const selected = value.includes(label.id);
            const color = label.color || "#FF00AA";
            return (
              <button
                key={label.id}
                type="button"
                onClick={() => toggleLabel(label.id)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors hover:bg-d-panel2 ${
                  index === labels.length - 1 ? "rounded-b-xl" : ""
                }`}
                style={{ color }}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full border-2"
                  style={{
                    borderColor: color,
                    background: selected ? color : "transparent",
                  }}
                />
                {label.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
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
  const [showArchived, setShowArchived] = useState(false);
  const [selectedNewsletterIds, setSelectedNewsletterIds] = useState([]);
  const [bulkArchiving, setBulkArchiving] = useState(false);
  const [importingMarkdown, setImportingMarkdown] = useState(false);
  const [markdownImportSourceOpen, setMarkdownImportSourceOpen] = useState(false);
  const [markdownHelpOpen, setMarkdownHelpOpen] = useState(false);
  const [markdownImportMode, setMarkdownImportMode] = useState("markdown");
  const [pastedMarkdown, setPastedMarkdown] = useState("");
  const [markdownBrief, setMarkdownBrief] = useState("");
  const [markdownBriefTheme, setMarkdownBriefTheme] = useState("light");
  const [markdownBriefShowNumbers, setMarkdownBriefShowNumbers] = useState(false);
  const [markdownBriefShowSeparators, setMarkdownBriefShowSeparators] = useState(false);
  const [crmBatchEnabled, setCrmBatchEnabled] = useState(false);
  const [crmBatchCount, setCrmBatchCount] = useState(3);
  const [markdownAssistantLabelId, setMarkdownAssistantLabelId] = useState("");
  const [generatingCrmBrief, setGeneratingCrmBrief] = useState(false);
  const [crmBriefVariants, setCrmBriefVariants] = useState(null);
  const [expandedCrmVariant, setExpandedCrmVariant] = useState(null);
  const [crmVariantRefineDraft, setCrmVariantRefineDraft] = useState(null);
  const [crmVariantRefineComments, setCrmVariantRefineComments] = useState("");
  const [refiningCrmVariant, setRefiningCrmVariant] = useState(false);
  const [generatingMarkdownBrief, setGeneratingMarkdownBrief] = useState(false);
  const [generatingBatchMails, setGeneratingBatchMails] = useState(false);
  const [markdownGenerationLog, setMarkdownGenerationLog] = useState(null);
  const [markdownImportDraft, setMarkdownImportDraft] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const archivedFilter = Boolean(profile?.is_admin && showArchived);
      const [{ data: nls, error: nlsError }, { data: lks, error: locksError }, { data: nlbs }] =
        await Promise.all([
          supabase
            .from("newsletters")
            .select(NEWSLETTER_SELECT_WITH_ARCHIVE)
            .eq("archived", archivedFilter)
            .order("updated_at", { ascending: false }),
          supabase
            .from("locks")
            .select("*")
            .gt("expires_at", new Date().toISOString()),
          supabase.from("newsletter_labels").select("newsletter_id, label_id"),
        ]);

      let newsletterRows = nls;
      let newsletterError = nlsError;
      if (isMissingArchiveColumn(newsletterError)) {
        const legacy = await supabase
          .from("newsletters")
          .select(NEWSLETTER_SELECT_LEGACY)
          .eq("archived", archivedFilter)
          .order("updated_at", { ascending: false });
        newsletterRows = legacy.data;
        newsletterError = legacy.error;
      }
      if (newsletterError) throw newsletterError;
      if (locksError) {
        // eslint-disable-next-line no-console
        console.warn("[newsletters] locks indisponibles:", locksError);
      }

      setNewsletters(Array.isArray(newsletterRows) ? newsletterRows : []);
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
  }, [profile?.is_admin, showArchived]);

  useEffect(() => {
    setSelectedNewsletterIds([]);
  }, [showArchived]);

  useEffect(() => {
    if (!profile?.is_admin && showArchived) {
      setShowArchived(false);
    }
  }, [profile?.is_admin, showArchived]);

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
    const previewTextPatch = newPreviewText.trim() ? { preview_text: newPreviewText } : {};
    const initialState =
      mode === "blank"
        ? { ...INITIAL_STATE, sections: [], ...previewTextPatch }
        : mode === "preset" && preset
          ? { ...buildInitialStateFromTypes(preset.sections, {
              includeDefaultContent: preset.includeDefaultContent,
              showSectionNumbers: preset.showSectionNumbers,
              showBlockSeparators: preset.showBlockSeparators,
              themeVariant: preset.themeVariant,
              includeIssueDate: preset.includeIssueDate,
            }), ...previewTextPatch }
        : (() => {
            const template = getDefaultNewsletterTemplate();
            return { ...buildInitialStateFromTypes(template.sections, {
              includeDefaultContent: template.includeDefaultContent,
              showSectionNumbers: template.showSectionNumbers,
              showBlockSeparators: template.showBlockSeparators,
              themeVariant: template.themeVariant,
              includeIssueDate: template.includeIssueDate,
            }), ...previewTextPatch };
          })();
    const { data, error } = await supabase
      .from("newsletters")
      .insert({
        title: newTitle.trim(),
        issue_number: initialState.issue_number || INITIAL_STATE.issue_number,
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

  const parseMarkdownImport = (markdown, sourceLabel, options = {}) => {
    if (!profile?.id) return;
    setImportingMarkdown(true);
    try {
      const imported = importNewsletterMarkdown(markdown);
      setMarkdownImportDraft({
        imported,
        fileName: sourceLabel,
        sourceMode: options.sourceMode || markdownImportMode,
        labelId: options.labelId || "",
      });
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

  const insertMarkdownHelpExample = (markdown) => {
    setPastedMarkdown(markdown);
    setMarkdownHelpOpen(false);
    setMarkdownImportMode("markdown");
    setMarkdownImportSourceOpen(true);
    addToast("Exemple Markdown inséré. Tu peux l'adapter puis le valider.", "success");
  };

  const copyMarkdownHelpExample = async (markdown) => {
    try {
      await navigator.clipboard.writeText(markdown);
      addToast("Exemple Markdown copié.", "success");
    } catch {
      addToast("Copie impossible depuis ce navigateur.", "error");
    }
  };

  const resetMarkdownSourceModal = () => {
    setMarkdownImportSourceOpen(false);
    setMarkdownHelpOpen(false);
    setPastedMarkdown("");
    setMarkdownBrief("");
    setCrmBriefVariants(null);
    setExpandedCrmVariant(null);
    setCrmVariantRefineDraft(null);
    setCrmVariantRefineComments("");
    setMarkdownGenerationLog(null);
    setMarkdownAssistantLabelId("");
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

  const applyLabelToNewsletters = async (newsletterIds, labelId) => {
    const ids = Array.isArray(newsletterIds) ? newsletterIds.filter(Boolean) : [newsletterIds].filter(Boolean);
    if (!ids.length || !labelId || !profile?.id) return null;
    const { error } = await supabase.from("newsletter_labels").insert(
      ids.map((newsletterId) => ({
        newsletter_id: newsletterId,
        label_id: labelId,
        assigned_by: profile.id,
      }))
    );
    return error;
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
        body: JSON.stringify({ input, count: crmBatchEnabled ? crmBatchCount : 1 }),
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

  const createBatchFromVariants = async (variants) => {
    if (!profile?.id) return;
    setGeneratingBatchMails(true);
    setMarkdownGenerationLog(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Session expirée. Reconnecte-toi pour utiliser Gemini.");

      const importedItems = [];
      for (const [index, variant] of variants.entries()) {
        const markdownResponse = await fetch("/api/generate-markdown-import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            brief: variant.content || "",
            options: {
              theme_variant: markdownBriefTheme,
              show_section_numbers: markdownBriefShowNumbers,
              show_block_separators: markdownBriefShowSeparators,
            },
          }),
        });
        const markdownPayload = await markdownResponse.json().catch(() => ({}));
        if (!markdownResponse.ok || !markdownPayload.markdown) {
          throw new Error(`Mail ${index + 1} : ${markdownPayload.error || "Markdown impossible."}`);
        }
        const imported = importNewsletterMarkdown(markdownPayload.markdown);
        importedItems.push({ imported, variant });
      }

      const rows = importedItems.map(({ imported }) => ({
        title: imported.title,
        issue_number: imported.state.issue_number,
        current_state: imported.state,
        created_by: profile.id,
        updated_by: profile.id,
      }));
      const { data, error } = await supabase
        .from("newsletters")
        .insert(rows)
        .select("id");
      if (error) throw error;
      const labelError = await applyLabelToNewsletters(
        (data || []).map((row) => row.id),
        markdownAssistantLabelId
      );

      addToast(
        labelError
          ? `${rows.length} mail${rows.length > 1 ? "s" : ""} créé${rows.length > 1 ? "s" : ""}, mais le label n'a pas pu être appliqué.`
          : `${rows.length} mail${rows.length > 1 ? "s" : ""} créé${rows.length > 1 ? "s" : ""} depuis Gemini.`,
        labelError ? "error" : "success"
      );
      resetMarkdownSourceModal();
      await load();
    } catch (error) {
      addToast("Batch Gemini impossible : " + (error.message || error), "error");
    } finally {
      setGeneratingBatchMails(false);
    }
  };

  const handleGenerateBatchMails = async () => {
    const input = markdownBrief.trim();
    if (!crmBatchEnabled) {
      addToast("Active le mode multi-mails avant de créer un batch.", "info");
      return;
    }
    if (!input) {
      addToast("Indique un prompt avant de créer le batch.", "error");
      return;
    }
    if (!profile?.id) return;

    setGeneratingBatchMails(true);
    setMarkdownGenerationLog(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Session expirée. Reconnecte-toi pour utiliser Gemini.");

      const contentResponse = await fetch("/api/generate-crm-brief", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ input, count: crmBatchCount }),
      });
      const contentPayload = await contentResponse.json().catch(() => ({}));
      if (!contentResponse.ok) throw new Error(contentPayload.error || "Génération du batch impossible.");

      const variants = Array.isArray(contentPayload.variants) && contentPayload.variants.length
        ? contentPayload.variants.slice(0, crmBatchCount)
        : [{ id: "full", title: "Contenu généré", content: contentPayload.content || "" }];
      if (!variants.length) throw new Error("Gemini n'a pas retourné de mails exploitables.");

      await createBatchFromVariants(variants);
    } catch (error) {
      addToast("Batch Gemini impossible : " + (error.message || error), "error");
      setGeneratingBatchMails(false);
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
      parseMarkdownImport(payload.markdown, "Brief généré avec Gemini", {
        sourceMode: "gemini",
        labelId: markdownAssistantLabelId,
      });
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

  const formatMarkdownGenerationLog = (log) => {
    if (!log) return "";
    return [
      "Logs d'erreur du Markdown généré",
      "",
      `Erreur: ${log.error || ""}`,
      log.validationError ? `Validation: ${log.validationError}` : "",
      log.traceId || log.model
        ? `Trace: ${[
            log.traceId ? `trace_id=${log.traceId}` : "",
            log.model ? `model=${log.model}` : "",
          ].filter(Boolean).join(" | ")}`
        : "",
      log.markdown ? "\n--- Markdown généré ---\n" + log.markdown : "",
      log.rawOutput && log.rawOutput !== log.markdown ? "\n--- Sortie brute Gemini ---\n" + log.rawOutput : "",
    ].filter(Boolean).join("\n");
  };

  const handleCopyMarkdownGenerationLog = async () => {
    const text = formatMarkdownGenerationLog(markdownGenerationLog);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      addToast("Logs d'erreur copiés.", "success");
    } catch {
      addToast("Copie impossible depuis ce navigateur.", "error");
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
      const labelError = await applyLabelToNewsletters(data.id, markdownImportDraft.labelId);

      const warningSuffix = imported.warnings.length
        ? ` ${imported.warnings.length} avertissement(s) à relire.`
        : "";
      const labelSuffix = labelError ? " Label non appliqué." : "";
      addToast(`Newsletter Markdown importée.${warningSuffix}${labelSuffix}`, labelError || imported.warnings.length ? "info" : "success");
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

  const canArchiveNewsletter = (nl) =>
    Boolean(nl?.id && !nl?.archived && (profile?.is_admin || nl.created_by === profile?.id));

  const handleArchive = async (nl) => {
    if (!canArchiveNewsletter(nl)) {
      addToast("Tu peux archiver uniquement les templates que tu as créés.", "info");
      return;
    }
    if (!nl?.id) return;
    if (!await confirm(`Archiver « ${nl.title || "cette newsletter"} » pendant 30 jours ?`, { danger: true, confirmLabel: "Archiver" })) return;
    const archivedAt = new Date();
    const archiveExpiresAt = new Date(archivedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    const { error } = await supabase
      .from("newsletters")
      .update({
        archived: true,
        archived_at: archivedAt.toISOString(),
        archive_expires_at: archiveExpiresAt.toISOString(),
        archived_by: profile?.id || null,
      })
      .eq("id", nl.id);
    if (error) {
      addToast(isMissingArchiveColumn(error)
        ? "Archivage indisponible : applique la migration supabase/newsletter-archive-retention.sql."
        : "Erreur : " + error.message);
      return;
    }
    addToast("Newsletter archivée pendant 30 jours.", "success");
    load();
  };

  const handleBulkArchive = async () => {
    const selected = newsletters.filter((nl) => selectedNewsletterIds.includes(nl.id));
    const archivable = selected.filter(canArchiveNewsletter);
    if (archivable.length === 0) {
      addToast("Aucune campagne sélectionnée ne peut être archivée.", "info");
      return;
    }
    const skippedCount = selected.length - archivable.length;
    const message = skippedCount > 0
      ? `Archiver ${archivable.length} campagne${archivable.length > 1 ? "s" : ""} pendant 30 jours ? ${skippedCount} sélection non autorisée sera ignorée.`
      : `Archiver ${archivable.length} campagne${archivable.length > 1 ? "s" : ""} pendant 30 jours ?`;
    if (!await confirm(message, { title: "Archiver la sélection ?", danger: true, confirmLabel: "Archiver" })) return;

    try {
      setBulkArchiving(true);
      const archivedAt = new Date();
      const archiveExpiresAt = new Date(archivedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
      const { error } = await supabase
        .from("newsletters")
        .update({
          archived: true,
          archived_at: archivedAt.toISOString(),
          archive_expires_at: archiveExpiresAt.toISOString(),
          archived_by: profile?.id || null,
        })
        .in("id", archivable.map((nl) => nl.id));
      if (error) {
        addToast(isMissingArchiveColumn(error)
          ? "Archivage indisponible : applique la migration supabase/newsletter-archive-retention.sql."
          : "Erreur : " + error.message);
        return;
      }
      setSelectedNewsletterIds([]);
      addToast(`${archivable.length} campagne${archivable.length > 1 ? "s archivées" : " archivée"} pendant 30 jours.`, "success");
      load();
    } finally {
      setBulkArchiving(false);
    }
  };

  const handleRestore = async (nl) => {
    if (!profile?.is_admin) return;
    if (!nl?.id) return;
    if (!await confirm(`Désarchiver « ${nl.title || "cette newsletter"} » ?`, { confirmLabel: "Désarchiver" })) return;
    const { error } = await supabase
      .from("newsletters")
      .update({
        archived: false,
        archived_at: null,
        archive_expires_at: null,
        archived_by: null,
      })
      .eq("id", nl.id);
    if (error) {
      addToast(isMissingArchiveColumn(error)
        ? "Désarchivage indisponible : applique la migration supabase/newsletter-archive-retention.sql."
        : "Erreur : " + error.message);
      return;
    }
    addToast("Newsletter désarchivée.", "success");
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

  const getArchiveRetentionLabel = (nl) => {
    if (!nl?.archive_expires_at) return "Suppression automatique dans 30 jours";
    const diffMs = new Date(nl.archive_expires_at).getTime() - Date.now();
    const days = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
    if (days === 0) return "Suppression automatique aujourd'hui";
    return `Suppression automatique dans ${days} jour${days > 1 ? "s" : ""}`;
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

  const selectableNewsletters = useMemo(
    () => filteredNewsletters.filter(canArchiveNewsletter),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredNewsletters, profile?.id, profile?.is_admin]
  );

  const selectedNewsletters = useMemo(
    () => newsletters.filter((nl) => selectedNewsletterIds.includes(nl.id)),
    [newsletters, selectedNewsletterIds]
  );

  const selectedArchivableCount = selectedNewsletters.filter(canArchiveNewsletter).length;
  const selectableIds = selectableNewsletters.map((nl) => nl.id);
  const allVisibleSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedNewsletterIds.includes(id));

  const toggleNewsletterSelection = (id) => {
    setSelectedNewsletterIds((ids) =>
      ids.includes(id) ? ids.filter((selectedId) => selectedId !== id) : [...ids, id]
    );
  };

  const toggleVisibleSelection = () => {
    setSelectedNewsletterIds((ids) => {
      if (allVisibleSelected) return ids.filter((id) => !selectableIds.includes(id));
      return Array.from(new Set([...ids, ...selectableIds]));
    });
  };

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
              {showArchived ? "Newsletters archivées" : "Mes newsletters"}
            </h1>
            <p className="text-sm text-d-fg3">
              {loading
                ? "Chargement…"
                : filteredNewsletters.length === newsletters.length
                  ? `${newsletters.length} newsletter${newsletters.length > 1 ? "s" : ""}`
                  : `${filteredNewsletters.length} / ${newsletters.length} newsletter${newsletters.length > 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex w-full flex-wrap justify-start gap-2 sm:w-auto sm:justify-end">
            {profile?.is_admin && (
              <Tooltip label={showArchived ? "Voir les campagnes actives" : "Voir les campagnes archivées"}>
                <button
                  type="button"
                  onClick={() => {
                    setLabelPickerOpen(null);
                    setShowArchived((value) => !value);
                  }}
                  disabled={loading}
                  aria-label={showArchived ? "Voir les campagnes actives" : "Voir les campagnes archivées"}
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    showArchived
                      ? "border-d-green/60 text-d-green hover:bg-d-green/10"
                      : "border-line2 text-d-fg2 hover:bg-d-panel2"
                  }`}
                >
                  {showArchived ? <FileText size={17} /> : <Archive size={17} />}
                </button>
              </Tooltip>
            )}
            <Tooltip label="Importer Markdown">
              <button
                type="button"
                onClick={() => openMarkdownImportSource("markdown")}
                disabled={showArchived || importingMarkdown || creating || generatingCrmBrief || generatingMarkdownBrief || generatingBatchMails}
                aria-label="Importer Markdown"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line2 text-d-fg2 transition-colors hover:bg-d-panel2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {importingMarkdown ? <Loader2 size={17} className="animate-spin" /> : <FileUp size={17} />}
              </button>
            </Tooltip>
            <Tooltip label="Assistant Gemini">
              <button
                type="button"
                onClick={() => openMarkdownImportSource("gemini")}
                disabled={showArchived || importingMarkdown || creating || generatingCrmBrief || generatingMarkdownBrief || generatingBatchMails}
                aria-label="Assistant Gemini"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-d-pink/60 text-d-pink transition-colors hover:bg-d-pink/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generatingCrmBrief || generatingMarkdownBrief || generatingBatchMails ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
              </button>
            </Tooltip>
            <button
              onClick={() => setCreateChoiceOpen(true)}
              disabled={showArchived || creating || importingMarkdown}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors disabled:opacity-50 sm:px-5"
              style={{ background: "#FFFFFF", color: "#15151A" }}
            >
              <Plus size={16} />
              <span>Nouveau Template</span>
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
              <div className={`grid gap-3 sm:flex sm:flex-shrink-0 ${labels.length > 0 ? "grid-cols-2" : "grid-cols-1"}`}>
                {labels.length > 0 && (
                  <LabelFilterDropdown
                    labels={labels}
                    value={labelFilter}
                    onChange={setLabelFilter}
                  />
                )}
                <div className="relative">
                  <ArrowUpDown size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-d-fg4 pointer-events-none" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full rounded-xl border border-line bg-d-panel py-2.5 pl-8 pr-4 text-sm text-d-fg transition-colors cursor-pointer appearance-none focus:border-line2 focus:outline-none sm:w-auto"
                  >
                    <option value="updated_desc">Plus récent</option>
                    <option value="updated_asc">Plus ancien</option>
                    <option value="title_asc">Titre A → Z</option>
                    <option value="title_desc">Titre Z → A</option>
                  </select>
                </div>
              </div>
            </div>
            {!showArchived && selectableNewsletters.length > 0 && (
              <div className="flex flex-col gap-2 rounded-xl border border-line bg-d-panel px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-d-fg3">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleVisibleSelection}
                    className="h-4 w-4 rounded border-line bg-d-panel2 accent-d-pink"
                  />
                  Sélectionner les campagnes visibles
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-d-fg4">
                    {selectedArchivableCount} campagne{selectedArchivableCount > 1 ? "s" : ""} sélectionnée{selectedArchivableCount > 1 ? "s" : ""}
                  </span>
                  {selectedNewsletterIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedNewsletterIds([])}
                      className="rounded-full border border-line px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-d-fg3 transition-colors hover:border-line2 hover:text-d-fg"
                    >
                      Annuler
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleBulkArchive}
                    disabled={selectedArchivableCount === 0 || bulkArchiving}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-red-500/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-red-200 transition-colors hover:border-red-400/70 hover:bg-red-900/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {bulkArchiving ? <Loader2 size={12} className="animate-spin" /> : <Archive size={12} />}
                    Archiver la sélection
                  </button>
                </div>
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
              {showArchived ? "Aucune newsletter archivée" : "Aucune newsletter pour l'instant"}
            </div>
            <div className="text-xs text-d-fg3">
              {showArchived
                ? "Les campagnes archivées restent disponibles ici pendant 30 jours."
                : "Clique sur « Nouveau Template » pour démarrer."}
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
              Aucune newsletter {showArchived ? "archivée " : ""}ne correspond à « {search} ».
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
              const canDeleteNewsletter = canArchiveNewsletter(nl);
              const isArchived = nl.archived === true;
              const isSelected = selectedNewsletterIds.includes(nl.id);
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
                    onClick={() => {
                      if (!isArchived) onOpen(nl.id);
                    }}
                    onKeyDown={(event) => {
                      if (!isArchived && (event.key === "Enter" || event.key === " ")) {
                        event.preventDefault();
                        onOpen(nl.id);
                      }
                    }}
                    className={`group flex items-start gap-3 px-4 py-4 transition-colors focus:outline-none sm:items-center sm:gap-4 sm:px-5 ${isArchived ? "cursor-default opacity-85" : "cursor-pointer hover:bg-d-panel2 focus:bg-d-panel2"} ${isFirst ? "rounded-t-2xl" : ""} ${isLast ? "rounded-b-2xl" : ""}`}
                  >
                    {!isArchived && canDeleteNewsletter && (
                      <label
                        className="mt-3 flex flex-shrink-0 cursor-pointer items-center sm:mt-0"
                        onClick={(event) => event.stopPropagation()}
                        aria-label={`Sélectionner ${nl.title || "cette newsletter"}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleNewsletterSelection(nl.id)}
                          className="h-4 w-4 rounded border-line bg-d-panel2 accent-d-pink"
                        />
                      </label>
                    )}
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
                        {isArchived && (
                          <span
                            className="inline-flex flex-shrink-0 items-center gap-1 text-[10px] uppercase tracking-[0.14em] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(255,139,40,0.12)", color: "#FFB266" }}
                          >
                            <Archive size={10} />
                            Archivée
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
                      {isArchived && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-d-fg4">
                          <span>
                            Archivée {nl.archived_at ? formatDate(nl.archived_at) : ""}
                            {nl.archiver ? ` par ${nl.archiver.full_name || nl.archiver.email}` : ""}
                          </span>
                          <span>{getArchiveRetentionLabel(nl)}</span>
                        </div>
                      )}
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
                      {!isArchived && labels.length > 0 && (
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
                      {!isArchived && (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDuplicate(nl);
                          }}
                          className="p-2 text-d-fg4 hover:text-d-fg2 hover:bg-d-panel3 rounded-lg transition-colors"
                        >
                          <Copy size={14} />
                        </button>
                      )}
                      {isArchived && profile?.is_admin ? (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRestore(nl);
                          }}
                          className="p-2 text-d-fg4 hover:text-d-green hover:bg-d-green/10 rounded-lg transition-colors"
                          title="Désarchiver"
                        >
                          <RotateCcw size={14} />
                        </button>
                      ) : canDeleteNewsletter ? (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleArchive(nl);
                          }}
                          className="p-2 text-d-fg4 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Archiver"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : null}
                    </div>

                    {!isArchived && (
                      <div className="hidden p-2 text-d-fg4 transition-colors group-hover:text-d-fg2 sm:block">
                        <ChevronRight size={16} />
                      </div>
                    )}
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
              {markdownImportDraft.sourceMode === "gemini" && labels.length > 0 && (
                <div className="rounded-xl border border-line bg-d-panel2 px-4 py-3">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-d-fg4">
                    Label
                  </div>
                  <LabelDropdown
                    labels={labels}
                    value={markdownImportDraft.labelId || ""}
                    onChange={(labelId) =>
                      setMarkdownImportDraft((draft) =>
                        draft ? { ...draft, labelId } : draft
                      )
                    }
                  />
                </div>
              )}
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
                {markdownImportMode === "markdown" && (
                  <button
                    type="button"
                    onClick={() => setMarkdownHelpOpen(true)}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-line bg-d-panel2 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-d-fg2 transition-colors hover:border-line2 hover:text-d-fg"
                  >
                    <HelpCircle size={13} />
                    Guide syntaxe
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  resetMarkdownSourceModal();
                }}
                disabled={importingMarkdown || generatingCrmBrief || generatingMarkdownBrief || generatingBatchMails}
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
                {labels.length > 0 && (
                  <div className="mt-3 rounded-lg border border-line bg-d-panel px-3 py-3">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-d-fg4">
                      Label
                    </div>
                    <LabelDropdown
                      labels={labels}
                      value={markdownAssistantLabelId}
                      onChange={setMarkdownAssistantLabelId}
                    />
                  </div>
                )}
                <label className="mt-3 grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-line bg-d-panel px-3 py-3">
                  <span>
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-d-fg4">Mode</span>
                    <span className="block text-sm font-medium text-d-fg2">Créer plusieurs mails</span>
                  </span>
                  <span className="relative inline-flex h-6 w-11 flex-shrink-0 items-center">
                    <input
                      type="checkbox"
                      checked={crmBatchEnabled}
                      onChange={(event) => setCrmBatchEnabled(event.target.checked)}
                      className="peer sr-only"
                    />
                    <span className="absolute inset-0 rounded-full border border-line bg-d-panel2 transition-colors peer-checked:border-d-pink peer-checked:bg-d-pink/25" />
                    <span className="relative ml-1 h-4 w-4 rounded-full bg-d-fg4 transition-transform peer-checked:translate-x-5 peer-checked:bg-d-pink" />
                  </span>
                </label>
                {crmBatchEnabled && (
                  <div className="mt-3 rounded-lg border border-line bg-d-panel px-3 py-3">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-d-fg4">
                      Batch mails
                    </div>
                    <div className="grid grid-cols-4 gap-1 rounded-lg border border-line bg-d-panel2 p-0.5">
                      {[2, 3, 4, 5].map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setCrmBatchCount(count)}
                          aria-pressed={crmBatchCount === count}
                          className={`min-h-8 rounded-md px-2 text-[11px] font-semibold transition-colors ${
                            crmBatchCount === count
                              ? "bg-d-pink text-white"
                              : "text-d-fg3 hover:text-d-fg"
                          }`}
                        >
                          {count} mails
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-d-fg4">
                      Utilisé par “Créer le contenu” et “Créer le batch”.
                    </p>
                  </div>
                )}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleGenerateCrmBrief}
                    disabled={generatingCrmBrief || generatingMarkdownBrief || generatingBatchMails || importingMarkdown}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-d-panel px-4 py-2 text-xs font-semibold text-d-fg2 transition-colors hover:border-line2 hover:text-d-fg disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {generatingCrmBrief ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    Créer le contenu avec Gemini
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateMarkdownFromBrief}
                    disabled={generatingCrmBrief || generatingMarkdownBrief || generatingBatchMails || importingMarkdown}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-d-pink px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {generatingMarkdownBrief ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    Générer et valider
                  </button>
                  {crmBatchEnabled && (
                    <button
                      type="button"
                      onClick={handleGenerateBatchMails}
                      disabled={generatingCrmBrief || generatingMarkdownBrief || generatingBatchMails || importingMarkdown}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-[#15151A] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {generatingBatchMails ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      Créer le batch
                    </button>
                  )}
                </div>
                {markdownGenerationLog && (
                  <div className="mt-4 rounded-xl border border-[#FF4B28]/40 bg-[#FFF3EE] p-4 text-[#3A1A12]">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={14} className="text-[#D93B19]" />
                        <div className="text-sm font-semibold">Logs d'erreur du Markdown généré</div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyMarkdownGenerationLog}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#FFB29D] bg-white px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A5482D] transition-colors hover:border-[#FF8A6D] hover:text-[#7A3A28]"
                      >
                        <Copy size={12} />
                        Copier les logs
                      </button>
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
                    disabled={importingMarkdown || creating || generatingCrmBrief || generatingMarkdownBrief || generatingBatchMails}
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
                    <div className="text-sm font-semibold text-d-fg">Besoin d'aide sur la syntaxe ?</div>
                    <div className="mt-1 text-xs leading-relaxed text-d-fg4">
                      Commence par un exemple, ou ouvre le guide complet avec les blocs les plus utiles.
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setPastedMarkdown(MARKDOWN_IMPORT_TEMPLATE)}
                      className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-d-fg2 transition-colors hover:border-line2 hover:text-d-fg"
                    >
                      <Copy size={12} />
                      Exemple complet
                    </button>
                    <button
                      type="button"
                      onClick={() => setMarkdownHelpOpen(true)}
                      className="inline-flex items-center gap-2 rounded-lg bg-d-pink px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-90"
                    >
                      <BookOpen size={12} />
                      Ouvrir le guide
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 text-xs leading-relaxed text-d-fg3 sm:grid-cols-3">
                  {[
                    ["1", "Front matter", "Le fichier commence par --- avec title et preview_text."],
                    ["2", "Blocs", "Ajoute des directives comme text_block, editorial_list, cta ou focus."],
                    ["3", "Validation", "Colle le Markdown, valide, puis ajuste la mise en forme avant création."],
                  ].map(([step, title, body]) => (
                    <div key={step} className="rounded-lg border border-line bg-d-panel px-3 py-3">
                      <div className="mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-d-pink text-[11px] font-bold text-white">
                        {step}
                      </div>
                      <div className="font-semibold text-d-fg2">{title}</div>
                      <div className="mt-1 text-d-fg4">{body}</div>
                    </div>
                  ))}
                </div>
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
                disabled={importingMarkdown || generatingCrmBrief || generatingMarkdownBrief || generatingBatchMails}
                className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-d-fg3 transition-colors hover:border-line2 hover:text-d-fg disabled:opacity-50"
              >
                Annuler
              </button>
              {markdownImportMode === "markdown" && (
              <button
                type="button"
                onClick={handlePasteMarkdownImport}
                disabled={importingMarkdown || generatingCrmBrief || generatingMarkdownBrief || generatingBatchMails}
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
      {markdownHelpOpen && (
        <div className="fixed inset-0 z-[70] flex items-stretch justify-center bg-black/70 p-2 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line bg-d-panel shadow-2xl sm:max-h-[calc(100vh-32px)]">
            <div className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-line px-4 py-4 sm:px-6 sm:py-5">
              <div className="min-w-0">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-d-pink">
                  Guide Markdown
                </div>
                <h2 className="text-lg font-semibold tracking-tight text-d-fg sm:text-xl" style={{ fontFamily: "'Sora', sans-serif" }}>
                  Construire un fichier importable
                </h2>
                <p className="mt-2 max-w-2xl text-xs leading-relaxed text-d-fg4 sm:text-sm">
                  Choisis une recette, insère un exemple, puis remplace le contenu. Les champs restent simples : une directive s'ouvre avec <code>:::nom_du_bloc</code>, ses options sont en dessous, puis <code>:::</code> ferme le bloc.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMarkdownHelpOpen(false)}
                className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-d-fg4 transition-colors hover:bg-d-panel2 hover:text-d-fg2"
              >
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-4">
                  <section className="rounded-xl border border-line bg-d-panel2 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <FileText size={15} className="text-d-pink" />
                      <div className="text-sm font-semibold text-d-fg">Le minimum obligatoire</div>
                    </div>
                    <div className="space-y-3 text-xs leading-relaxed text-d-fg3">
                      <div className="rounded-lg border border-line bg-d-panel px-3 py-3">
                        <div className="mb-1 font-semibold text-d-fg2">Front matter</div>
                        <p>Le fichier commence par <code>---</code>. Mets au minimum <code>title</code> et <code>preview_text</code>.</p>
                      </div>
                      <div className="rounded-lg border border-line bg-d-panel px-3 py-3">
                        <div className="mb-1 font-semibold text-d-fg2">URLs</div>
                        <p>Les liens de CTA et d'image doivent commencer par <code>https://</code> ou <code>http://</code>.</p>
                      </div>
                      <div className="rounded-lg border border-line bg-d-panel px-3 py-3">
                        <div className="mb-1 font-semibold text-d-fg2">Listes à colonnes</div>
                        <p>Utilise <code>|</code> seulement pour séparer les colonnes : <code>- tag | titre | texte | couleur</code>.</p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-xl border border-line bg-d-panel2 p-4">
                    <div className="mb-3 text-sm font-semibold text-d-fg">Quel bloc choisir ?</div>
                    <div className="space-y-2 text-xs leading-relaxed text-d-fg3">
                      {[
                        ["Texte simple", "text_block"],
                        ["Bouton seul", "cta"],
                        ["Espace vertical", "spacer"],
                        ["2 à 4 bénéfices ou étapes", "editorial_list"],
                        ["Recommandation + action", "focus + focus_cta"],
                        ["Séparateur dans texte & média", "focus_divider"],
                        ["3 ou 4 fonctionnalités", "feature_grid"],
                        ["Citation attribuée", "macro"],
                        ["Date ou rendez-vous", "event"],
                      ].map(([label, block]) => (
                        <div key={label} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-d-panel px-3 py-2">
                          <span>{label}</span>
                          <code className="rounded-md bg-d-panel2 px-2 py-1 text-[11px] text-d-fg2">{block}</code>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-xl border border-line bg-d-panel2 p-4">
                    <div className="mb-3 text-sm font-semibold text-d-fg">Erreurs fréquentes</div>
                    <ul className="space-y-2 text-xs leading-relaxed text-d-fg3">
                      <li className="flex gap-2"><AlertTriangle size={13} className="mt-0.5 flex-shrink-0 text-[#FF8B28]" /> Ne mets pas <code>:::text_block:</code> avec deux-points final.</li>
                      <li className="flex gap-2"><AlertTriangle size={13} className="mt-0.5 flex-shrink-0 text-[#FF8B28]" /> Ferme chaque directive avec une ligne <code>:::</code>.</li>
                      <li className="flex gap-2"><AlertTriangle size={13} className="mt-0.5 flex-shrink-0 text-[#FF8B28]" /> Dans <code>editorial_list</code>, le corps est obligatoire.</li>
                      <li className="flex gap-2"><AlertTriangle size={13} className="mt-0.5 flex-shrink-0 text-[#FF8B28]" /> Une couleur hex doit être en dernière colonne, jamais dans le texte.</li>
                    </ul>
                  </section>
                </div>

                <div className="space-y-4">
                  <section className="rounded-xl border border-line bg-d-panel2 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-d-fg">Exemples prêts à utiliser</div>
                        <div className="mt-0.5 text-xs text-d-fg4">Insère un exemple dans le champ Markdown, ou copie-le.</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {MARKDOWN_HELP_EXAMPLES.map((example) => (
                        <div key={example.id} className="rounded-xl border border-line bg-d-panel p-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="text-sm font-semibold text-d-fg">{example.label}</div>
                              <div className="mt-1 text-xs leading-relaxed text-d-fg4">{example.description}</div>
                            </div>
                            <div className="flex flex-shrink-0 gap-2">
                              <button
                                type="button"
                                onClick={() => copyMarkdownHelpExample(example.markdown)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-d-fg2 transition-colors hover:border-line2 hover:text-d-fg"
                              >
                                <Copy size={12} />
                                Copier
                              </button>
                              <button
                                type="button"
                                onClick={() => insertMarkdownHelpExample(example.markdown)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-d-pink px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-90"
                              >
                                Insérer
                              </button>
                            </div>
                          </div>
                          <pre className="mt-3 max-h-48 overflow-auto rounded-lg border border-line bg-d-panel2 px-3 py-3 font-mono text-[11px] leading-relaxed text-d-fg3">
                            {example.markdown}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-xl border border-line bg-d-panel2 p-4">
                    <div className="mb-3 text-sm font-semibold text-d-fg">Référence rapide</div>
                    <div className="grid grid-cols-1 gap-3 text-xs leading-relaxed text-d-fg3 sm:grid-cols-2">
                      <div className="rounded-lg border border-line bg-d-panel px-3 py-3">
                        <div className="mb-2 font-semibold uppercase tracking-[0.14em] text-d-fg4">Sections</div>
                        <p><code>hero</code>, <code>text_block</code>, <code>cta</code>, <code>spacer</code>, <code>editorial_list</code>, <code>focus</code>, <code>feature_grid</code>, <code>macro</code>, <code>event</code>, <code>divider</code>, <code>image_block</code>.</p>
                      </div>
                      <div className="rounded-lg border border-line bg-d-panel px-3 py-3">
                        <div className="mb-2 font-semibold uppercase tracking-[0.14em] text-d-fg4">Sous-blocs</div>
                        <p><code>focus_text</code>, <code>focus_cta</code>, <code>focus_callout</code>, <code>focus_image</code>, <code>focus_spacer</code>, <code>focus_divider</code>, <code>feature_grid_featured</code>.</p>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-line px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={() => setMarkdownHelpOpen(false)}
                className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-d-fg3 transition-colors hover:border-line2 hover:text-d-fg"
              >
                Fermer
              </button>
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
              {crmBatchEnabled && crmBriefVariants.variants.length > 1 && (
                <button
                  type="button"
                  disabled={generatingBatchMails}
                  onClick={() => createBatchFromVariants(crmBriefVariants.variants)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-[#15151A] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
                >
                  {generatingBatchMails ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Créer le batch ({crmBriefVariants.variants.length} mails)
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
