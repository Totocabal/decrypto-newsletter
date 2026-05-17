// ─────────────────────────────────────────────────────────────────────────────
// EditorPanel — éditeur modulaire (header fixe, sections, footer fixe)
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useConfirm } from "./Dialog.jsx";
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  CopyPlus,
  Plus,
  GripVertical,
  ChevronRight,
  RefreshCw,
  Loader2,
  Activity,
  BarChart2,
  Calendar,
  Gauge,
  Hash,
  ImageIcon,
  List,
  Megaphone,
  Minus,
  Newspaper,
  Palette,
  Quote,
  Sparkles,
  Square,
  TrendingUp,
  Type,
} from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { Field, Input, TextArea, Section } from "./FormControls.jsx";
import { Tooltip } from "./Tooltip.jsx";
import {
  SECTION_TYPES,
  UNNUMBERED_TYPES,
  createSection,
  computeSectionNumber,
} from "../config/schema.js";
import { SectionEditor } from "./SectionEditor.jsx";
import { useCoinGecko } from "../lib/useCoinGecko.js";

function sectionTitle(sec) {
  const d = sec.data || {};
  return d.title || d.label || d.kicker || sec.type;
}

function buildIndexItems(sections) {
  let counter = 0;
  return sections
    .filter((s) => s.counts_for_numbering ?? !UNNUMBERED_TYPES.has(s.type))
    .map((s) => {
      counter++;
      return {
        section_id: s.id,
        number: String(counter).padStart(2, "0"),
        title: sectionTitle(s),
      };
    });
}

function chipLabelFromCoinGecko(cryptoId, result) {
  const symbol = cryptoId === "bitcoin" ? "BTC" : "ETH";
  const sign = result.delta_tone === "positive" ? "▲" : "▼";
  const pct = result.delta.replace(/^[▲▼]\s*/, "");
  return `${symbol} ${sign} ${pct}`;
}

async function generatePreviewText(state) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch("/api/generate-preview-text", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ state }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur serveur");
  return data.text;
}

export function EditorPanel({ state, setState }) {
  const { fetch7d, error: syncError } = useCoinGecko();
  const [globalSyncing, setGlobalSyncing] = useState(false);
  const [previewGenerating, setPreviewGenerating] = useState(false);
  const [previewGenError, setPreviewGenError] = useState(null);
  const update = (patch) => setState((s) => ({ ...s, ...patch }));

  const handleGeneratePreviewText = async () => {
    setPreviewGenerating(true);
    setPreviewGenError(null);
    try {
      const text = await generatePreviewText(state);
      update({ preview_text: text });
    } catch (err) {
      setPreviewGenError(err.message);
    } finally {
      setPreviewGenerating(false);
    }
  };
  const updateFooter = (patch) =>
    setState((s) => ({ ...s, footer: { ...s.footer, ...patch } }));

  // ── Drag & drop ──
  const [activeId, setActiveId] = useState(null);
  const [selectedMobileSectionId, setSelectedMobileSectionId] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (over && active.id !== over.id) {
      setState((s) => {
        const oldIdx = s.sections.findIndex((x) => x.id === active.id);
        const newIdx = s.sections.findIndex((x) => x.id === over.id);
        return { ...s, sections: arrayMove(s.sections, oldIdx, newIdx) };
      });
    }
  };

  // ── Mutations sur la liste de sections ──
  const setSection = (id, nextData) =>
    setState((s) => ({
      ...s,
      sections: s.sections.map((sec) =>
        sec.id === id ? { ...sec, data: nextData } : sec
      ),
    }));

  const updateSectionMeta = (id, patch) =>
    setState((s) => ({
      ...s,
      sections: s.sections.map((sec) =>
        sec.id === id ? { ...sec, ...patch } : sec
      ),
    }));

  const moveSection = (id, dir) =>
    setState((s) => {
      const idx = s.sections.findIndex((x) => x.id === id);
      const newIdx = idx + dir;
      if (idx === -1 || newIdx < 0 || newIdx >= s.sections.length) return s;
      const sections = [...s.sections];
      [sections[idx], sections[newIdx]] = [sections[newIdx], sections[idx]];
      return { ...s, sections };
    });

  const duplicateSection = (id) =>
    setState((s) => {
      const idx = s.sections.findIndex((x) => x.id === id);
      if (idx === -1) return s;
      const copy = JSON.parse(JSON.stringify(s.sections[idx]));
      copy.id = `s${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const sections = [...s.sections];
      sections.splice(idx + 1, 0, copy);
      return { ...s, sections };
    });

  const removeSection = (id) =>
    setState((s) => ({ ...s, sections: s.sections.filter((x) => x.id !== id) }));

  const addSection = (type, atIndex) =>
    setState((s) => {
      const newSec = createSection(type);
      const sections = [...s.sections];
      const insertAt = atIndex !== undefined ? atIndex : sections.length;
      sections.splice(insertAt, 0, newSec);
      return { ...s, sections };
    });

  const handleGlobalSync = async () => {
    setGlobalSyncing(true);
    try {
      const cryptoCache = {};
      const getCrypto = async (cryptoId) => {
        if (!cryptoCache[cryptoId]) {
          cryptoCache[cryptoId] = await fetch7d(cryptoId);
        }
        return cryptoCache[cryptoId];
      };

      const needsBitcoin = state.sections.some(
        (sec) =>
          (sec.type === "hero" &&
            (sec.data.chips || []).some((chip) => chip.type === "btc")) ||
          (sec.type === "chart" &&
            sec.data.chart_mode === "auto" &&
            (sec.data.chart_crypto || "bitcoin") === "bitcoin")
      );
      const needsEthereum = state.sections.some(
        (sec) =>
          (sec.type === "hero" &&
            (sec.data.chips || []).some((chip) => chip.type === "eth")) ||
          (sec.type === "chart" &&
            sec.data.chart_mode === "auto" &&
            sec.data.chart_crypto === "ethereum")
      );

      if (needsBitcoin) await getCrypto("bitcoin");
      if (needsEthereum) await getCrypto("ethereum");

      setState((s) => {
        const fg = s.sections.find((sec) => sec.type === "fear_greed");
        const indexItems = buildIndexItems(s.sections);

        return {
          ...s,
          sections: s.sections.map((sec) => {
            if (sec.type === "index") {
              return { ...sec, data: { ...sec.data, items: indexItems } };
            }

            if (sec.type === "hero") {
              return {
                ...sec,
                data: {
                  ...sec.data,
                  chips: (sec.data.chips || []).map((chip) => {
                    if (chip.type === "btc" && cryptoCache.bitcoin) {
                      return {
                        ...chip,
                        label: chipLabelFromCoinGecko("bitcoin", cryptoCache.bitcoin),
                      };
                    }
                    if (chip.type === "eth" && cryptoCache.ethereum) {
                      return {
                        ...chip,
                        label: chipLabelFromCoinGecko("ethereum", cryptoCache.ethereum),
                      };
                    }
                    if (chip.type === "fear_greed" && fg) {
                      return {
                        ...chip,
                        label: `F&G ${fg.data.value} · ${fg.data.classification}`,
                      };
                    }
                    return chip;
                  }),
                },
              };
            }

            if (sec.type === "chart" && sec.data.chart_mode === "auto") {
              const crypto = sec.data.chart_crypto || "bitcoin";
              const result = cryptoCache[crypto];
              if (result) return { ...sec, data: { ...sec.data, ...result } };
            }

            return sec;
          }),
        };
      });
    } finally {
      setGlobalSyncing(false);
    }
  };

  const links = {
    add: () =>
      updateFooter({
        links: [...(state.footer.links || []), { label: "Lien", url: "#" }],
      }),
    set: (i, next) =>
      updateFooter({
        links: state.footer.links.map((x, idx) => (idx === i ? next : x)),
      }),
    remove: (i) =>
      updateFooter({ links: state.footer.links.filter((_, idx) => idx !== i) }),
  };

  return (
    <>
      <div className="mb-6 px-1 grid grid-cols-2 gap-2">
        <label className="flex items-center justify-between gap-3 rounded-xl border border-line bg-d-panel px-3 py-2.5 cursor-pointer">
          <span className="flex items-center gap-2 text-xs font-semibold text-d-fg">
            <Palette size={13} />
            Fond blanc
          </span>
          <span className="relative inline-flex h-6 w-11 flex-shrink-0 items-center">
            <input
              type="checkbox"
              checked={state.theme_variant === "light"}
              onChange={(event) => update({ theme_variant: event.target.checked ? "light" : "dark" })}
              className="peer sr-only"
            />
            <span className="absolute inset-0 rounded-full border border-line bg-d-panel2 transition-colors peer-checked:border-d-pink peer-checked:bg-d-pink/25" />
            <span className="relative ml-1 h-4 w-4 rounded-full bg-d-fg4 transition-transform peer-checked:translate-x-5 peer-checked:bg-d-pink" />
          </span>
        </label>
        <label className="flex items-center justify-between gap-3 rounded-xl border border-line bg-d-panel px-3 py-2.5 cursor-pointer">
          <span className="flex items-center gap-2 text-xs font-semibold text-d-fg">
            <Hash size={13} />
            Numérotation
          </span>
          <span className="relative inline-flex h-6 w-11 flex-shrink-0 items-center">
            <input
              type="checkbox"
              checked={state.show_section_numbers !== false}
              onChange={(event) => update({ show_section_numbers: event.target.checked })}
              className="peer sr-only"
            />
            <span className="absolute inset-0 rounded-full border border-line bg-d-panel2 transition-colors peer-checked:border-d-pink peer-checked:bg-d-pink/25" />
            <span className="relative ml-1 h-4 w-4 rounded-full bg-d-fg4 transition-transform peer-checked:translate-x-5 peer-checked:bg-d-pink" />
          </span>
        </label>
      </div>

      {/* ── EN-TÊTE FIXE ────────────────────────────────────────────────── */}
      <Section title="En-tête" defaultOpen={false}>
        <Field label="Nom de la marque">
          <Input
            value={state.brand_name}
            onChange={(e) => update({ brand_name: e.target.value })}
          />
        </Field>
        <Field label="Date">
          <Input
            value={state.issue_date}
            onChange={(e) => update({ issue_date: e.target.value })}
          />
        </Field>
        <Field
          label="Texte de prévisualisation"
          hint="Affiché dans la boîte mail avant ouverture"
          action={
            <button
              type="button"
              onClick={handleGeneratePreviewText}
              disabled={previewGenerating}
              className="flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] font-semibold px-2 py-1 rounded-full border transition-colors disabled:opacity-50"
              style={{ color: "#03FFCF", borderColor: "rgba(3,255,207,0.25)", background: "rgba(3,255,207,0.06)" }}
            >
              {previewGenerating
                ? <Loader2 size={10} className="animate-spin" />
                : <Sparkles size={10} />}
              Générer
            </button>
          }
        >
          <TextArea
            rows={2}
            value={state.preview_text}
            onChange={(e) => update({ preview_text: e.target.value })}
          />
          {previewGenError && (
            <div className="mt-1.5 text-[11px] leading-relaxed" style={{ color: "#FF8466" }}>
              {previewGenError}
            </div>
          )}
        </Field>
      </Section>

      {/* ── SECTIONS MODULAIRES ─────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex flex-col gap-3 mb-3 px-1 sm:flex-row sm:items-center sm:justify-between">
          <div
            className="text-[10px] uppercase tracking-[0.18em] font-semibold text-d-fg2"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Sections de la newsletter
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tooltip
              side="bottom"
              align="right"
              label="Synchroniser le sommaire, les pastilles auto et les graphiques auto CoinGecko."
            >
              <button
                type="button"
                onClick={handleGlobalSync}
                disabled={globalSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] font-semibold rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{
                  background: globalSyncing
                    ? "#2E2E34"
                    : "linear-gradient(90deg, #4141FF 0%, #FF00AA 60%, #FF4B28 100%)",
                }}
              >
                {globalSyncing ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RefreshCw size={12} />
                )}
                {globalSyncing ? "Sync…" : "Synchroniser"}
              </button>
            </Tooltip>
            <div className="text-[10px] uppercase tracking-[0.18em] text-d-fg4">
              {state.sections.length} bloc{state.sections.length > 1 ? "s" : ""}
            </div>
          </div>
        </div>
        {syncError && (
          <div
            className="mb-3 text-[11px] rounded-xl px-3 py-2"
            style={{
              color: "#FF8466",
              background: "rgba(255,75,40,0.10)",
              border: "1px solid rgba(255,75,40,0.20)",
            }}
          >
            Erreur CoinGecko : {syncError}
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={({ active }) => setActiveId(active.id)}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={state.sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {state.sections.map((sec, i) => (
                <SectionCard
                  key={sec.id}
                  section={sec}
                  index={i}
                  total={state.sections.length}
                  number={state.show_section_numbers === false ? null : computeSectionNumber(state.sections, sec.id)}
                  allSections={state.sections}
                  onUpdate={(data) => setSection(sec.id, data)}
                  onUpdateMeta={(patch) => updateSectionMeta(sec.id, patch)}
                  onMoveUp={() => moveSection(sec.id, -1)}
                  onMoveDown={() => moveSection(sec.id, 1)}
                  onDuplicate={() => duplicateSection(sec.id)}
                  onDelete={() => removeSection(sec.id)}
                  selectedMobile={selectedMobileSectionId === sec.id}
                  onSelectMobile={() => setSelectedMobileSectionId(sec.id)}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {activeId ? (() => {
              const sec = state.sections.find((s) => s.id === activeId);
              if (!sec) return null;
              const type = SECTION_TYPES[sec.type];
              const label = type?.label || sec.type;
              const preview = (() => { const d = sec.data || {}; return d.title || d.label || d.kicker || ""; })();
              return (
                <div style={{ background: "#1E1E22", border: "1px solid #444", borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", cursor: "grabbing", opacity: 0.95 }}>
                  <GripVertical size={14} style={{ color: "#555", flexShrink: 0 }} />
                  <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 600, color: "#888", flexShrink: 0 }}>{label}</span>
                  {preview && <span style={{ fontSize: 11, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{preview}</span>}
                </div>
              );
            })() : null}
          </DragOverlay>
        </DndContext>

        <AddSectionButton onAdd={(type) => addSection(type)} />
      </div>

      {/* ── PIED DE PAGE FIXE ───────────────────────────────────────────── */}
      <Section title="Pied de page" defaultOpen={false}>
        <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-d-fg3 mb-2 mt-2">
          Liens du footer
        </div>
        {(state.footer.links || []).map((l, i) => (
          <div key={i} className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,35%)_1fr_auto] sm:items-center">
            <div className="min-w-0">
              <Input
                value={l.label}
                onChange={(e) =>
                  links.set(i, { ...l, label: e.target.value })
                }
                placeholder="Libellé"
              />
            </div>
            <div className="min-w-0">
              <Input
                value={l.url}
                onChange={(e) => links.set(i, { ...l, url: e.target.value })}
                placeholder="https://…"
              />
            </div>
            <Tooltip label="Supprimer">
              <button
                type="button"
                onClick={() => links.remove(i)}
                className="justify-self-start rounded-lg p-2 text-d-fg4 transition-colors hover:bg-red-900/20 hover:text-red-400 sm:justify-self-auto"
              >
                <Trash2 size={14} />
              </button>
            </Tooltip>
          </div>
        ))}
        <button
          type="button"
          onClick={links.add}
          className="w-full mt-1 mb-4 flex items-center justify-center gap-2 px-4 py-2 border-dashed border text-d-fg3 hover:text-d-fg2 hover:border-line2 rounded-xl text-[10px] uppercase tracking-[0.18em] transition-colors border-line"
        >
          <Plus size={12} /> Ajouter un lien
        </button>

        <Field label="Adresse / mentions PSAN">
          <Input
            value={state.footer.address}
            onChange={(e) => updateFooter({ address: e.target.value })}
          />
        </Field>
        <Field label="Disclaimer légal">
          <TextArea
            rows={2}
            value={state.footer.legal}
            onChange={(e) => updateFooter({ legal: e.target.value })}
          />
        </Field>
        <Field label="Lien désinscription">
          <Input
            value={state.footer.unsub_url}
            onChange={(e) => updateFooter({ unsub_url: e.target.value })}
          />
        </Field>
      </Section>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionCard — un bloc rétractable représentant une section
// ─────────────────────────────────────────────────────────────────────────────

function SectionCard({
  section,
  index,
  total,
  number,
  allSections,
  onUpdate,
  onUpdateMeta,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  selectedMobile,
  onSelectMobile,
}) {
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const type = SECTION_TYPES[section.type];
  const label = type?.label || section.type;
  const countsForNumbering = section.counts_for_numbering ?? !UNNUMBERED_TYPES.has(section.type);

  const preview = (() => {
    const d = section.data || {};
    if (d.title) return d.title;
    if (d.label) return d.label;
    if (d.kicker) return d.kicker;
    return "";
  })();

  return (
    <div
      ref={setNodeRef}
      onClick={onSelectMobile}
      style={{
        position: "relative",
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
        zIndex: isDragging ? 1 : undefined,
      }}
    >
      <div
        className={`overflow-hidden rounded-xl transition-all ${
          selectedMobile ? "mobile-section-card-selected" : ""
        }`}
        style={{
          background: "#1E1E22",
          border: "1px solid var(--d-line2)",
        }}
      >
      {/* Barre de titre */}
      <div data-drag-header className="flex items-center gap-2 px-2 py-2">
        <Tooltip label="Glisser pour déplacer" className="hidden sm:inline-flex">
          <button
            type="button"
            {...listeners}
            {...attributes}
            className="flex-shrink-0 rounded-lg p-1 text-d-fg4 cursor-grab transition-colors hover:text-d-fg2 active:cursor-grabbing"
          >
            <GripVertical size={14} />
          </button>
        </Tooltip>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex-1 flex items-center gap-2 min-w-0 text-left hover:bg-d-panel2 -mx-1 px-2 py-1 rounded-lg transition-colors"
        >
          <ChevronRight
            size={14}
            className={`text-d-fg4 flex-shrink-0 transition-transform ${
              open ? "rotate-90" : ""
            }`}
          />
          {number && (
            <span className="text-[10px] font-bold text-d-pink flex-shrink-0">
              {number}
            </span>
          )}
          <span
            className="text-[10px] uppercase tracking-[0.18em] font-semibold text-d-fg3 flex-shrink-0"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {label}
          </span>
          {preview && (
            <span className="text-[12px] text-d-fg4 truncate">
              · {preview}
            </span>
          )}
        </button>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Tooltip label="Monter">
            <button
              onClick={(event) => {
                event.stopPropagation();
                onSelectMobile();
                onMoveUp();
              }}
              disabled={index === 0}
              className="rounded-lg bg-d-pink/10 p-1.5 text-d-pink transition-colors hover:bg-d-pink/15 hover:text-d-pink disabled:cursor-not-allowed disabled:opacity-20"
            >
              <ChevronUp size={14} />
            </button>
          </Tooltip>
          <Tooltip label="Descendre">
            <button
              onClick={(event) => {
                event.stopPropagation();
                onSelectMobile();
                onMoveDown();
              }}
              disabled={index === total - 1}
              className="rounded-lg bg-d-pink/10 p-1.5 text-d-pink transition-colors hover:bg-d-pink/15 hover:text-d-pink disabled:cursor-not-allowed disabled:opacity-20"
            >
              <ChevronDown size={14} />
            </button>
          </Tooltip>
          <Tooltip label="Dupliquer">
            <button
              onClick={onDuplicate}
              className="p-1.5 text-d-fg4 hover:text-d-fg2 hover:bg-d-panel2 rounded-lg transition-colors"
            >
              <CopyPlus size={14} />
            </button>
          </Tooltip>
          <Tooltip label="Supprimer">
            <button
              onClick={async () => {
                if (await confirm(`Supprimer la section « ${label} » ?`, { danger: true, confirmLabel: "Supprimer" })) onDelete();
              }}
              className="p-1.5 text-d-fg4 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Corps éditable */}
      {open && (
        <div
          className="p-4"
          style={{
            borderTop: "1px solid var(--d-line)",
            background: "#26262B",
          }}
        >
          <SectionEditor
            type={section.type}
            data={section.data}
            onChange={onUpdate}
            sections={allSections}
          />
          <div className="mt-4 border-t border-line pt-4">
            <label className="flex items-center justify-between gap-4 rounded-xl border border-line bg-d-panel2 px-3 py-2.5 text-xs text-d-fg3 cursor-pointer">
              <span className="min-w-0">
                <span className="block font-semibold text-d-fg2">Compte pour la numérotation</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-d-fg4">
                  {countsForNumbering ? "Ce bloc reçoit un numéro et apparaît dans le sommaire auto." : "Ce bloc reste sans numéro et hors sommaire auto."}
                </span>
              </span>
              <span className="relative inline-flex h-6 w-11 flex-shrink-0 items-center">
                <input
                  type="checkbox"
                  checked={countsForNumbering}
                  onChange={(event) => onUpdateMeta({ counts_for_numbering: event.target.checked })}
                  className="peer sr-only"
                />
                <span className="absolute inset-0 rounded-full border border-line bg-d-panel transition-colors peer-checked:border-d-pink peer-checked:bg-d-pink/25" />
                <span className="relative ml-1 h-4 w-4 rounded-full bg-d-fg4 transition-transform peer-checked:translate-x-5 peer-checked:bg-d-pink" />
              </span>
            </label>
          </div>
        </div>
      )}
      </div> {/* end inner overflow-hidden card */}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AddSectionButton — bouton "+" avec palette des types
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_TYPE_DESCRIPTIONS = {
  hero: "En-tête complet avec titre, intro et indicateurs clés.",
  index: "Sommaire cliquable vers les sections de la newsletter.",
  edito: "Texte éditorial accompagné de KPI marché.",
  chart: "Graphique crypto manuel ou synchronisé CoinGecko.",
  fear_greed: "Jauge Fear & Greed avec commentaire.",
  signals: "Signaux haussiers et baissiers en grille.",
  macro: "Analyse macro avec citation mise en avant.",
  macro_bars: "Barres de données pour comparer des indicateurs.",
  commented_number: "Chiffre fort accompagné d'un commentaire éditorial.",
  event: "Annonce d'évènement avec informations et CTA.",
  text_block: "Bloc texte simple avec bouton optionnel.",
  focus: "Texte long, image et boutons optionnels.",
  image_block: "Image seule avec lien de redirection optionnel.",
  divider: "Séparateur visuel entre deux blocs.",
};

const SECTION_TYPE_ICONS = {
  Activity,
  BarChart2,
  Calendar,
  Gauge,
  Hash,
  ImageIcon,
  List,
  Megaphone,
  Minus,
  Newspaper,
  Quote,
  TrendingUp,
  Type,
};

function AddSectionButton({ onAdd }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          className="group w-full flex items-center justify-center gap-3 px-4 py-4 border-dashed border text-d-fg3 hover:text-d-fg2 hover:border-line2 rounded-2xl text-[10px] uppercase tracking-[0.18em] font-medium transition-colors border-line bg-d-panel/30 hover:bg-d-panel2"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-line bg-d-panel2 text-d-fg3 transition-colors group-hover:border-line2 group-hover:text-d-pink">
            <Plus size={15} />
          </span>
          Ajouter un bloc
        </button>
      ) : (
        <div
          className="rounded-3xl p-4 border border-line shadow-2xl"
          style={{ background: "#1E1E22" }}
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div
                className="text-[10px] uppercase tracking-[0.18em] font-semibold text-d-fg2"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Ajouter un bloc
              </div>
              <p className="mt-1 text-xs leading-relaxed text-d-fg4">
                Choisis le format qui correspond au contenu à insérer.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="shrink-0 rounded-full border border-line px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-d-fg4 hover:text-d-fg2 hover:border-line2 transition-colors"
            >
              Annuler
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(SECTION_TYPES).map(([type, def]) => {
              const Icon = SECTION_TYPE_ICONS[def.icon] || Square;
              return (
                <button
                  type="button"
                  key={type}
                  onClick={() => {
                    onAdd(type);
                    setOpen(false);
                  }}
                  className="group/item text-left rounded-2xl border border-line bg-d-panel2 p-3 text-d-fg2 transition-colors hover:border-line2 hover:bg-d-panel3"
                >
                  <span className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-line bg-d-panel text-d-fg3 transition-colors group-hover/item:border-d-pink/50 group-hover/item:text-d-pink">
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className="block text-sm font-semibold text-d-fg"
                        style={{ fontFamily: "'Sora', sans-serif" }}
                      >
                        {def.label}
                      </span>
                      <span className="mt-1 block text-[11px] leading-relaxed text-d-fg4">
                        {SECTION_TYPE_DESCRIPTIONS[type] || "Ajouter ce bloc à la newsletter."}
                      </span>
                    </span>
                    <ChevronRight
                      size={15}
                      className="mt-1 shrink-0 text-d-fg5 transition-colors group-hover/item:text-d-fg3"
                    />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
