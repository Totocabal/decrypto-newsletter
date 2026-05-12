// ─────────────────────────────────────────────────────────────────────────────
// EditorPanel — éditeur modulaire (header fixe, sections, footer fixe)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef } from "react";
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
} from "lucide-react";
import { Field, Input, TextArea, Section } from "./FormControls.jsx";
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
    .filter((s) => !UNNUMBERED_TYPES.has(s.type))
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

export function EditorPanel({ state, setState }) {
  const { fetch7d, error: syncError } = useCoinGecko();
  const [globalSyncing, setGlobalSyncing] = useState(false);
  const update = (patch) => setState((s) => ({ ...s, ...patch }));
  const updateFooter = (patch) =>
    setState((s) => ({ ...s, footer: { ...s.footer, ...patch } }));

  // ── Drag & drop ──
  const draggedId = useRef(null);
  const [dragOverId, setDragOverId] = useState(null);

  const handleDragStart = (id) => { draggedId.current = id; };
  const handleDragOver = (e, id) => {
    e.preventDefault();
    if (id !== draggedId.current) setDragOverId(id);
  };
  const handleDrop = (e, targetId) => {
    e.preventDefault();
    const fromId = draggedId.current;
    if (fromId && fromId !== targetId) {
      setState((s) => {
        const sections = [...s.sections];
        const fromIdx = sections.findIndex((x) => x.id === fromId);
        const toIdx = sections.findIndex((x) => x.id === targetId);
        if (fromIdx === -1 || toIdx === -1) return s;
        const [removed] = sections.splice(fromIdx, 1);
        sections.splice(toIdx, 0, removed);
        return { ...s, sections };
      });
    }
    draggedId.current = null;
    setDragOverId(null);
  };
  const handleDragEnd = () => {
    draggedId.current = null;
    setDragOverId(null);
  };

  // ── Mutations sur la liste de sections ──
  const setSection = (id, nextData) =>
    setState((s) => ({
      ...s,
      sections: s.sections.map((sec) =>
        sec.id === id ? { ...sec, data: nextData } : sec
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
      {/* ── EN-TÊTE FIXE ────────────────────────────────────────────────── */}
      <Section title="En-tête">
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
        >
          <TextArea
            rows={2}
            value={state.preview_text}
            onChange={(e) => update({ preview_text: e.target.value })}
          />
        </Field>
      </Section>

      {/* ── SECTIONS MODULAIRES ─────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="text-[10px] uppercase tracking-[0.18em] font-medium text-stone-700">
            Sections de la newsletter
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGlobalSync}
              disabled={globalSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] font-medium bg-pink-600 text-white rounded-sm hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Synchroniser le sommaire, les pastilles auto et les graphiques auto CoinGecko"
            >
              {globalSyncing ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RefreshCw size={12} />
              )}
              {globalSyncing ? "Sync…" : "Synchroniser"}
            </button>
            <div className="text-[10px] uppercase tracking-[0.18em] text-stone-400">
              {state.sections.length} bloc{state.sections.length > 1 ? "s" : ""}
            </div>
          </div>
        </div>
        {syncError && (
          <div className="mb-3 text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2">
            Erreur CoinGecko : {syncError}
          </div>
        )}

        <div className="space-y-2">
          {state.sections.map((sec, i) => (
            <SectionCard
              key={sec.id}
              section={sec}
              index={i}
              total={state.sections.length}
              number={computeSectionNumber(state.sections, sec.id)}
              allSections={state.sections}
              isDragOver={dragOverId === sec.id}
              onUpdate={(data) => setSection(sec.id, data)}
              onMoveUp={() => moveSection(sec.id, -1)}
              onMoveDown={() => moveSection(sec.id, 1)}
              onDuplicate={() => duplicateSection(sec.id)}
              onDelete={() => removeSection(sec.id)}
              onDragStart={() => handleDragStart(sec.id)}
              onDragOver={(e) => handleDragOver(e, sec.id)}
              onDrop={(e) => handleDrop(e, sec.id)}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>

        <AddSectionButton onAdd={(type) => addSection(type)} />
      </div>

      {/* ── PIED DE PAGE FIXE ───────────────────────────────────────────── */}
      <Section title="Pied de page" defaultOpen={false}>
        <div className="text-[10px] uppercase tracking-[0.18em] font-medium text-stone-500 mb-2 mt-2">
          Liens du footer
        </div>
        {(state.footer.links || []).map((l, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <div style={{ flex: "0 0 35%" }}>
              <Input
                value={l.label}
                onChange={(e) =>
                  links.set(i, { ...l, label: e.target.value })
                }
                placeholder="Libellé"
              />
            </div>
            <div style={{ flex: 1 }}>
              <Input
                value={l.url}
                onChange={(e) => links.set(i, { ...l, url: e.target.value })}
                placeholder="https://…"
              />
            </div>
            <button
              type="button"
              onClick={() => links.remove(i)}
              className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-sm"
              title="Supprimer"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={links.add}
          className="w-full mt-1 mb-4 flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-stone-300 text-stone-600 hover:border-stone-500 rounded-sm text-[10px] uppercase tracking-[0.18em] transition-colors"
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
  isDragOver,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) {
  const [open, setOpen] = useState(false);
  const type = SECTION_TYPES[section.type];
  const label = type?.label || section.type;

  // Aperçu textuel : utiliser un champ représentatif selon le type
  const preview = (() => {
    const d = section.data || {};
    if (d.title) return d.title;
    if (d.label) return d.label;
    if (d.kicker) return d.kicker;
    return "";
  })();

  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`bg-white border rounded-sm overflow-hidden transition-colors ${
        isDragOver
          ? "border-pink-400 border-t-2 shadow-sm"
          : "border-stone-200"
      }`}
    >
      {/* Barre de titre */}
      <div className="flex items-center gap-2 px-2 py-2">
        <button
          type="button"
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          className="p-1 text-stone-400 cursor-grab active:cursor-grabbing hover:text-stone-700 rounded-sm flex-shrink-0"
          title="Glisser pour déplacer"
        >
          <GripVertical size={14} />
        </button>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex-1 flex items-center gap-2 min-w-0 text-left hover:bg-stone-50 -mx-1 px-2 py-1 rounded-sm"
        >
          <ChevronRight
            size={14}
            className={`text-stone-400 flex-shrink-0 transition-transform ${
              open ? "rotate-90" : ""
            }`}
          />
          {number && (
            <span className="text-[10px] font-bold text-pink-600 flex-shrink-0">
              {number}
            </span>
          )}
          <span className="text-[10px] uppercase tracking-[0.18em] font-medium text-stone-600 flex-shrink-0">
            {label}
          </span>
          {preview && (
            <span className="text-[12px] text-stone-400 truncate">
              · {preview}
            </span>
          )}
        </button>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-sm disabled:opacity-20 disabled:cursor-not-allowed"
            title="Monter"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-sm disabled:opacity-20 disabled:cursor-not-allowed"
            title="Descendre"
          >
            <ChevronDown size={14} />
          </button>
          <button
            onClick={onDuplicate}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-sm"
            title="Dupliquer"
          >
            <CopyPlus size={14} />
          </button>
          <button
            onClick={() => {
              if (confirm(`Supprimer la section « ${label} » ?`)) onDelete();
            }}
            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-sm"
            title="Supprimer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Corps éditable */}
      {open && (
        <div className="border-t border-stone-100 p-4 bg-stone-50/40">
          <SectionEditor
            type={section.type}
            data={section.data}
            onChange={onUpdate}
            sections={allSections}
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AddSectionButton — bouton "+" avec palette des types
// ─────────────────────────────────────────────────────────────────────────────

function AddSectionButton({ onAdd }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-stone-300 text-stone-600 hover:border-stone-500 hover:bg-white rounded-sm text-[10px] uppercase tracking-[0.18em] font-medium transition-colors"
        >
          <Plus size={14} /> Ajouter un bloc
        </button>
      ) : (
        <div className="bg-white border border-stone-200 rounded-sm p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-[0.18em] font-medium text-stone-500">
              Choisir un type
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-[10px] uppercase tracking-[0.18em] text-stone-400 hover:text-stone-700"
            >
              Annuler
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(SECTION_TYPES).map(([type, def]) => (
              <button
                key={type}
                onClick={() => {
                  onAdd(type);
                  setOpen(false);
                }}
                className="text-left px-3 py-2 border border-stone-200 hover:border-stone-500 hover:bg-stone-50 rounded-sm text-xs text-stone-800 transition-colors"
              >
                {def.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
