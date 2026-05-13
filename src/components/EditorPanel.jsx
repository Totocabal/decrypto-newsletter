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

  const handleDragStart = (id, event) => {
    draggedId.current = id;
    const card = event.currentTarget.closest("[data-section-card]");
    if (card && event.dataTransfer?.setDragImage) {
      const rect = card.getBoundingClientRect();
      event.dataTransfer.setDragImage(card, 16, Math.min(32, rect.height / 2));
    }
  };
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
          <div
            className="text-[10px] uppercase tracking-[0.18em] font-semibold text-d-fg2"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Sections de la newsletter
          </div>
          <div className="flex items-center gap-2">
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
              title="Synchroniser le sommaire, les pastilles auto et les graphiques auto CoinGecko"
            >
              {globalSyncing ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RefreshCw size={12} />
              )}
              {globalSyncing ? "Sync…" : "Synchroniser"}
            </button>
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
              onDragStart={(e) => handleDragStart(sec.id, e)}
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
        <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-d-fg3 mb-2 mt-2">
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
              className="p-2 text-d-fg4 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
              title="Supprimer"
            >
              <Trash2 size={14} />
            </button>
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

  const preview = (() => {
    const d = section.data || {};
    if (d.title) return d.title;
    if (d.label) return d.label;
    if (d.kicker) return d.kicker;
    return "";
  })();

  return (
    <div
      data-section-card
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className="rounded-xl overflow-hidden transition-all"
      style={{
        background: "#1E1E22",
        border: isDragOver
          ? "1px solid #FF00AA"
          : "1px solid var(--d-line2)",
        boxShadow: isDragOver ? "0 0 0 2px rgba(255,0,170,0.15)" : "none",
      }}
    >
      {/* Barre de titre */}
      <div className="flex items-center gap-2 px-2 py-2">
        <button
          type="button"
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          className="p-1 text-d-fg4 cursor-grab active:cursor-grabbing hover:text-d-fg2 rounded-lg flex-shrink-0"
          title="Glisser pour déplacer"
        >
          <GripVertical size={14} />
        </button>
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
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-1.5 text-d-fg4 hover:text-d-fg2 hover:bg-d-panel2 rounded-lg disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            title="Monter"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="p-1.5 text-d-fg4 hover:text-d-fg2 hover:bg-d-panel2 rounded-lg disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            title="Descendre"
          >
            <ChevronDown size={14} />
          </button>
          <button
            onClick={onDuplicate}
            className="p-1.5 text-d-fg4 hover:text-d-fg2 hover:bg-d-panel2 rounded-lg transition-colors"
            title="Dupliquer"
          >
            <CopyPlus size={14} />
          </button>
          <button
            onClick={() => {
              if (confirm(`Supprimer la section « ${label} » ?`)) onDelete();
            }}
            className="p-1.5 text-d-fg4 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
            title="Supprimer"
          >
            <Trash2 size={14} />
          </button>
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
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border-dashed border text-d-fg3 hover:text-d-fg2 hover:border-line2 rounded-2xl text-[10px] uppercase tracking-[0.18em] font-medium transition-colors border-line"
        >
          <Plus size={14} /> Ajouter un bloc
        </button>
      ) : (
        <div
          className="rounded-2xl p-4 border border-line"
          style={{ background: "#1E1E22" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div
              className="text-[10px] uppercase tracking-[0.18em] font-semibold text-d-fg2"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Choisir un type
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-[10px] uppercase tracking-[0.18em] text-d-fg4 hover:text-d-fg2 transition-colors"
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
                className="text-left px-3 py-2.5 border border-line hover:border-line2 hover:bg-d-panel3 rounded-xl text-xs text-d-fg2 transition-colors font-medium"
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
