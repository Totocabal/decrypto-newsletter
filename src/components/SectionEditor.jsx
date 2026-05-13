// ─────────────────────────────────────────────────────────────────────────────
// SectionEditor — formulaire d'édition spécifique à un type de section
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, CopyPlus, Upload, Loader2, X, RefreshCw } from "lucide-react";
import { useCoinGecko } from "../lib/useCoinGecko.js";
import { UNNUMBERED_TYPES } from "../config/schema.js";
import { Field, Input, TextArea } from "./FormControls.jsx";
import { deleteImage, MAX_IMAGE_FILE_SIZE_LABEL } from "../lib/imageUpload.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { ImageManagerModal } from "./ImageManagerModal.jsx";

export function SectionEditor({ type, data, onChange, sections = [] }) {
  const set = (patch) => onChange({ ...data, ...patch });

  switch (type) {
    case "hero":       return <HeroEditor data={data} set={set} sections={sections} />;
    case "index":      return <IndexEditor data={data} set={set} sections={sections} />;
    case "edito":      return <EditoEditor data={data} set={set} />;
    case "chart":      return <ChartEditor data={data} set={set} />;
    case "fear_greed": return <FearGreedEditor data={data} set={set} />;
    case "signals":    return <SignalsEditor data={data} set={set} />;
    case "macro":      return <MacroEditor data={data} set={set} />;
    case "macro_bars": return <MacroBarsEditor data={data} set={set} />;
    case "event":      return <EventEditor data={data} set={set} />;
    case "focus":      return <FocusEditor data={data} set={set} />;
    case "text_block": return <TextBlockEditor data={data} set={set} />;
    case "divider":    return <DividerEditor data={data} set={set} />;
    default:
      return (
        <div className="text-xs text-red-600">Type inconnu : {type}</div>
      );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers réutilisables — gestion de listes
// ─────────────────────────────────────────────────────────────────────────────

function listHelpers(list, set, factory) {
  return {
    add: () => set({ items: [...list, factory()] }),
    set: (i, next) => set({ items: list.map((x, idx) => (idx === i ? next : x)) }),
    remove: (i) => set({ items: list.filter((_, idx) => idx !== i) }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HERO
// ─────────────────────────────────────────────────────────────────────────────

const CHIP_TYPES = [
  { value: "manual", label: "Manuel" },
  { value: "btc", label: "BTC auto" },
  { value: "eth", label: "ETH auto" },
  { value: "fear_greed", label: "F&G auto" },
];

function ChipEditor({ chip, onChange, onDelete, sections }) {
  const { fetch7d, loading } = useCoinGecko();
  const type = chip.type ?? "manual";

  const handleRefreshCrypto = async (cryptoId) => {
    const result = await fetch7d(cryptoId);
    if (!result) return;
    const symbol = cryptoId === "bitcoin" ? "BTC" : "ETH";
    const sign = result.delta_tone === "positive" ? "▲" : "▼";
    const pct = result.delta.replace(/^[▲▼]\s*/, "");
    onChange({ ...chip, label: `${symbol} ${sign} ${pct}` });
  };

  const handleTypeChange = (newType) => {
    if (newType === "btc") {
      handleRefreshCrypto("bitcoin");
      onChange({ ...chip, type: "btc" });
    } else if (newType === "eth") {
      handleRefreshCrypto("ethereum");
      onChange({ ...chip, type: "eth" });
    } else if (newType === "fear_greed") {
      const fg = sections.find((s) => s.type === "fear_greed");
      const label = fg
        ? `F&G ${fg.data.value} · ${fg.data.classification}`
        : chip.label;
      onChange({ ...chip, type: "fear_greed", label });
    } else {
      onChange({ ...chip, type: "manual" });
    }
  };

  const handleSync = () => {
    if (type === "btc") handleRefreshCrypto("bitcoin");
    else if (type === "eth") handleRefreshCrypto("ethereum");
    else if (type === "fear_greed") {
      const fg = sections.find((s) => s.type === "fear_greed");
      if (fg) onChange({ ...chip, label: `F&G ${fg.data.value} · ${fg.data.classification}` });
    }
  };

  return (
    <div className="flex items-center gap-2 mb-2">
      <select
        value={type}
        onChange={(e) => handleTypeChange(e.target.value)}
        className="px-2 py-2 border border-line rounded-xl text-[11px] bg-d-panel2 text-d-fg flex-shrink-0"
      >
        {CHIP_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      <div className="flex-1">
        <Input
          value={chip.label}
          onChange={(e) => onChange({ ...chip, label: e.target.value })}
          placeholder="Texte de la pastille"
          readOnly={type !== "manual"}
        />
      </div>
      {type !== "manual" && (
        <button
          type="button"
          onClick={handleSync}
          disabled={loading}
          className="p-2 text-d-fg4 hover:text-d-pink hover:bg-d-panel3 rounded-lg flex-shrink-0"
          title="Rafraîchir"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        </button>
      )}
      <button
        type="button"
        onClick={onDelete}
        className="p-2 text-d-fg4 hover:text-red-400 hover:bg-red-900/20 rounded-lg flex-shrink-0"
        title="Supprimer"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function HeroEditor({ data, set, sections }) {
  const chips = data.chips || [];

  const updateChip = (i, next) =>
    set({ chips: chips.map((x, idx) => (idx === i ? next : x)) });

  return (
    <>
      <Field label="Kicker (au-dessus du titre)">
        <Input value={data.kicker} onChange={(e) => set({ kicker: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Titre — ligne 1">
          <Input value={data.title_part1} onChange={(e) => set({ title_part1: e.target.value })} />
        </Field>
        <Field label="Titre — ligne 2 (avant accent)">
          <Input value={data.title_part2} onChange={(e) => set({ title_part2: e.target.value })} />
        </Field>
      </div>
      <Field label="Mot d'accent (couleur magenta)">
        <Input
          value={data.title_highlight}
          onChange={(e) => set({ title_highlight: e.target.value })}
        />
      </Field>
      <Field label="Sous-titre">
        <TextArea
          showCount
          rows={2}
          value={data.subtitle}
          onChange={(e) => set({ subtitle: e.target.value })}
        />
      </Field>

      <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-d-fg3 mb-2 mt-2">
        Pastilles (chips)
      </div>
      {chips.map((c, i) => (
        <ChipEditor
          key={i}
          chip={c}
          onChange={(next) => updateChip(i, next)}
          onDelete={() => set({ chips: chips.filter((_, idx) => idx !== i) })}
          sections={sections}
        />
      ))}
      <button
        type="button"
        onClick={() => set({ chips: [...chips, { label: "Nouvelle", type: "manual" }] })}
        className="w-full mt-1 flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-line text-d-fg3 hover:border-line2 hover:text-d-fg2 rounded-xl text-[10px] uppercase tracking-[0.18em] transition-colors"
      >
        <Plus size={12} /> Ajouter une pastille
      </button>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INDEX (Sommaire)
// ─────────────────────────────────────────────────────────────────────────────

function sectionTitle(sec) {
  const d = sec.data || {};
  return d.title || d.label || d.kicker || sec.type;
}

function IndexEditor({ data, set, sections }) {
  const items = data.items || [];

  const syncFromSections = () => {
    let counter = 0;
    const generated = sections
      .filter((s) => !UNNUMBERED_TYPES.has(s.type))
      .map((s) => {
        counter++;
        return {
          section_id: s.id,
          number: String(counter).padStart(2, "0"),
          title: sectionTitle(s),
        };
      });
    set({ items: generated });
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <Field label="Libellé du bloc" className="flex-1 mb-0">
          <Input value={data.label} onChange={(e) => set({ label: e.target.value })} />
        </Field>
        <button
          type="button"
          onClick={syncFromSections}
          className="ml-3 flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium border border-line text-d-fg3 rounded-xl hover:border-line2 hover:bg-d-panel2 transition-colors flex-shrink-0"
          title="Regénérer depuis les blocs présents"
        >
          <RefreshCw size={12} /> Sync blocs
        </button>
      </div>
      {items.map((it, i) => (
        <div
          key={i}
          className="grid grid-cols-[60px_1fr_auto] gap-2 mb-2 items-center"
        >
          <Input
            value={it.number}
            onChange={(e) =>
              set({
                items: items.map((x, idx) =>
                  idx === i ? { ...x, number: e.target.value } : x
                ),
              })
            }
            placeholder="01"
          />
          <Input
            value={it.title}
            onChange={(e) =>
              set({
                items: items.map((x, idx) =>
                  idx === i ? { ...x, title: e.target.value } : x
                ),
              })
            }
            placeholder="Titre"
          />
          <button
            type="button"
            onClick={() => set({ items: items.filter((_, idx) => idx !== i) })}
            className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-sm"
            title="Supprimer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          set({
            items: [...items, { number: String(items.length + 1).padStart(2, "0"), title: "Nouvelle entrée" }],
          })
        }
        className="w-full mt-1 flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-line text-d-fg3 hover:border-line2 hover:text-d-fg2 rounded-xl text-[10px] uppercase tracking-[0.18em] transition-colors"
      >
        <Plus size={12} /> Ajouter une entrée
      </button>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉDITO + KPI
// ─────────────────────────────────────────────────────────────────────────────

function EditoEditor({ data, set }) {
  const kpis = data.kpis || [];

  const moveKpi = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= kpis.length) return;
    const arr = [...kpis];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    set({ kpis: arr });
  };

  return (
    <>
      <Field label="Kicker">
        <Input value={data.kicker} onChange={(e) => set({ kicker: e.target.value })} />
      </Field>
      <Field label="Titre">
        <Input value={data.title} onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <Field
        label="Corps"
        hint="Éditeur riche : gras, italique, souligné, rayé, lien et listes"
      >
        <TextArea
          showCount
          rows={4}
          value={data.body}
          onChange={(e) => set({ body: e.target.value })}
        />
      </Field>

      <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-d-fg3 mb-2 mt-2">
        Grille KPI
      </div>
      {kpis.map((k, i) => (
        <div key={i} className="mb-2 bg-d-panel2 border border-line rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-d-fg4 font-semibold">
              KPI {String(i + 1).padStart(2, "0")}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveKpi(i, -1)}
                disabled={i === 0}
                className="p-1 text-d-fg4 hover:text-d-fg2 hover:bg-d-panel3 rounded-lg disabled:opacity-20"
              >
                <ChevronUp size={12} />
              </button>
              <button
                type="button"
                onClick={() => moveKpi(i, 1)}
                disabled={i === kpis.length - 1}
                className="p-1 text-d-fg4 hover:text-d-fg2 hover:bg-d-panel3 rounded-lg disabled:opacity-20"
              >
                <ChevronDown size={12} />
              </button>
              <button
                type="button"
                onClick={() =>
                  set({
                    kpis: [
                      ...kpis.slice(0, i + 1),
                      JSON.parse(JSON.stringify(k)),
                      ...kpis.slice(i + 1),
                    ],
                  })
                }
                className="p-1 text-d-fg4 hover:text-d-fg2 hover:bg-d-panel3 rounded-lg"
                title="Dupliquer"
              >
                <CopyPlus size={12} />
              </button>
              <button
                type="button"
                onClick={() =>
                  set({ kpis: kpis.filter((_, idx) => idx !== i) })
                }
                className="p-1 text-d-fg4 hover:text-red-400 hover:bg-red-900/20 rounded-lg"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <Input
              value={k.label}
              onChange={(e) =>
                set({
                  kpis: kpis.map((x, idx) =>
                    idx === i ? { ...x, label: e.target.value } : x
                  ),
                })
              }
              placeholder="Label"
            />
            <Input
              value={k.value}
              onChange={(e) =>
                set({
                  kpis: kpis.map((x, idx) =>
                    idx === i ? { ...x, value: e.target.value } : x
                  ),
                })
              }
              placeholder="Valeur"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={k.delta}
              onChange={(e) =>
                set({
                  kpis: kpis.map((x, idx) =>
                    idx === i ? { ...x, delta: e.target.value } : x
                  ),
                })
              }
              placeholder="Variation"
            />
            <select
              value={k.tone}
              onChange={(e) =>
                set({
                  kpis: kpis.map((x, idx) =>
                    idx === i ? { ...x, tone: e.target.value } : x
                  ),
                })
              }
              className="w-full px-3 py-2 border border-line rounded-xl text-sm bg-d-panel2 text-d-fg"
            >
              <option value="positive">Positif (cyan)</option>
              <option value="negative">Négatif (rouge)</option>
              <option value="warning">Attention (orange)</option>
              <option value="muted">Neutre</option>
            </select>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          set({
            kpis: [
              ...kpis,
              { label: "LABEL", value: "0", delta: "+0,0 %", tone: "muted" },
            ],
          })
        }
        className="w-full mt-1 flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-line text-d-fg3 hover:border-line2 hover:text-d-fg2 rounded-xl text-[10px] uppercase tracking-[0.18em] transition-colors"
      >
        <Plus size={12} /> Ajouter un KPI
      </button>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHART — sliders pour les 7 points ou import auto CoinGecko
// ─────────────────────────────────────────────────────────────────────────────

function ChartEditor({ data, set }) {
  const points = data.points || [];
  const labels = data.x_labels || [];
  const mode = data.chart_mode ?? "manual";
  const crypto = data.chart_crypto ?? "bitcoin";
  const { fetch7d, loading, error } = useCoinGecko();

  const updatePoint = (i, value) => {
    const arr = [...points];
    arr[i] = parseFloat(value);
    set({ points: arr });
  };

  const handleRefresh = async () => {
    const result = await fetch7d(crypto);
    if (result) set(result);
  };

  return (
    <>
      {/* Toggle mode */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => set({ chart_mode: "manual" })}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-colors ${
            mode === "manual"
              ? "bg-white text-[#15151A] border-white"
              : "bg-d-panel2 text-d-fg3 border-line hover:border-line2"
          }`}
        >
          Manuel
        </button>
        <button
          type="button"
          onClick={() => set({ chart_mode: "auto" })}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-colors ${
            mode === "auto"
              ? "bg-white text-[#15151A] border-white"
              : "bg-d-panel2 text-d-fg3 border-line hover:border-line2"
          }`}
        >
          Auto CoinGecko
        </button>
      </div>

      {/* Sélecteur crypto + bouton refresh (mode auto) */}
      {mode === "auto" && (
        <div className="flex gap-2 items-end mb-4">
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-d-fg3 mb-1.5">
              Crypto
            </div>
            <select
              value={crypto}
              onChange={(e) => set({ chart_crypto: e.target.value })}
              className="w-full px-3 py-2 border border-line rounded-xl text-sm bg-d-panel2 text-d-fg"
            >
              <option value="bitcoin">Bitcoin (BTC)</option>
              <option value="ethereum">Ethereum (ETH)</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-xl disabled:opacity-50 transition-colors"
            style={{ background: "#FF00AA" }}
          >
            {loading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RefreshCw size={13} />
            )}
            {loading ? "Chargement…" : "Rafraîchir"}
          </button>
        </div>
      )}

      {error && (
        <div className="text-[11px] rounded-xl px-3 py-2 mb-3" style={{ color: "#FF8466", background: "rgba(255,75,40,0.10)", border: "1px solid rgba(255,75,40,0.20)" }}>
          Erreur CoinGecko : {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Libellé (paire)">
          <Input
            value={data.label}
            onChange={(e) => set({ label: e.target.value })}
            placeholder="BTC / EUR"
            readOnly={mode === "auto"}
          />
        </Field>
        <Field label="Valeur principale">
          <Input
            value={data.value}
            onChange={(e) => set({ value: e.target.value })}
            readOnly={mode === "auto"}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Variation (avec flèche)">
          <Input
            value={data.delta}
            onChange={(e) => set({ delta: e.target.value })}
            placeholder="▲ +2,93 %"
            readOnly={mode === "auto"}
          />
        </Field>
        <Field label="Ton">
          <select
            value={data.delta_tone}
            onChange={(e) => set({ delta_tone: e.target.value })}
            disabled={mode === "auto"}
            className="w-full px-3 py-2 border border-line rounded-xl text-sm bg-d-panel2 text-d-fg disabled:opacity-50"
          >
            <option value="positive">Positif (cyan)</option>
            <option value="negative">Négatif (rouge)</option>
            <option value="warning">Attention (orange)</option>
            <option value="muted">Neutre</option>
          </select>
        </Field>
      </div>
      <Field label="Sous-variation">
        <Input
          value={data.subdelta}
          onChange={(e) => set({ subdelta: e.target.value })}
          placeholder="+1 838 € sur 7j"
          readOnly={mode === "auto"}
        />
      </Field>

      {mode === "manual" && (
        <>
          <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-d-fg3 mb-2 mt-3">
            Courbe — déplace les curseurs pour dessiner
          </div>
          <div className="text-[11px] text-d-fg4 mb-3 italic">
            100% = haut du graphique (prix élevé) · 0% = bas (prix bas)
          </div>

          <div className="bg-d-panel2 border border-line rounded-xl p-4 mb-3">
            {points.map((p, i) => (
              <div key={i} className="flex items-center gap-3 mb-2 last:mb-0">
                <div className="w-12 text-[11px] uppercase tracking-[0.1em] text-d-fg3 font-semibold flex-shrink-0">
                  {labels[i] || `P${i + 1}`}
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={p}
                  onChange={(e) => updatePoint(i, e.target.value)}
                  className="flex-1 accent-pink-600"
                />
                <div className="w-12 text-right text-[11px] text-d-fg2 tabular-nums flex-shrink-0">
                  {Number(p).toFixed(1)}
                </div>
              </div>
            ))}
          </div>

          <Field
            label="Étiquettes axe X"
            hint="Séparées par virgule. Pour une newsletter hebdo : Lun,Mar,Mer,Jeu,Ven,Sam,Dim"
          >
            <Input
              value={labels.join(",")}
              onChange={(e) =>
                set({
                  x_labels: e.target.value
                    .split(",")
                    .map((v) => v.trim())
                    .filter(Boolean),
                })
              }
            />
          </Field>
        </>
      )}

      {mode === "auto" && points.length > 0 && (
        <div className="mt-3 bg-d-panel2 border border-line rounded-xl overflow-hidden">
          <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-d-fg3 px-3 pt-3 pb-2">
            Données importées — {points.length} jours
          </div>
          <table className="w-full text-[11px]">
            <tbody>
              {points.map((p, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--d-line)" }}>
                  <td className="px-3 py-1.5 text-d-fg3 font-semibold w-12">{labels[i] || `J${i + 1}`}</td>
                  <td className="px-3 py-1.5 text-d-fg4 tabular-nums w-24">
                    {data.raw_prices?.[i]?.date ?? ""}
                  </td>
                  <td className="px-3 py-1.5 text-d-fg2 tabular-nums font-medium text-right">
                    {data.raw_prices?.[i]?.price ?? "—"}
                  </td>
                  <td className="pr-3 py-1.5 w-24">
                    <div className="h-1.5 bg-d-panel3 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-d-pink rounded-full"
                        style={{ width: `${p}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FEAR & GREED
// ─────────────────────────────────────────────────────────────────────────────

function fgClassification(v) {
  const n = Math.max(0, Math.min(100, parseInt(v, 10) || 0));
  if (n <= 24) return "EXTREME FEAR";
  if (n <= 44) return "FEAR";
  if (n <= 54) return "NEUTRAL";
  if (n <= 74) return "GREED";
  return "EXTREME GREED";
}

const FG_COLORS = {
  "EXTREME FEAR":  "text-red-400 border",
  "FEAR":          "text-orange-400 border",
  "NEUTRAL":       "text-d-fg3 border",
  "GREED":         "text-teal-400 border",
  "EXTREME GREED": "text-d-cyan border",
};

function FearGreedEditor({ data, set }) {
  const classification = fgClassification(data.value);

  const handleValue = (v) => set({ value: v, classification: fgClassification(v) });

  return (
    <>
      <Field label="Kicker">
        <Input value={data.kicker} onChange={(e) => set({ kicker: e.target.value })} />
      </Field>
      <Field label="Titre">
        <Input value={data.title} onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <Field label="Valeur (0–100)">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0"
            max="100"
            value={data.value}
            onChange={(e) => handleValue(e.target.value)}
            className="flex-1 accent-pink-600"
          />
          <Input
            type="number"
            value={data.value}
            onChange={(e) => handleValue(e.target.value)}
            className="w-16"
          />
          <span className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-wider border rounded-sm flex-shrink-0 ${FG_COLORS[classification] ?? ""}`}>
            {classification.replace("EXTREME ", "Ext. ")}
          </span>
        </div>
      </Field>
      <Field label="Commentaire" hint="Éditeur riche : gras, italique, souligné, rayé, lien et listes">
        <TextArea
          showCount
          rows={3}
          value={data.commentary}
          onChange={(e) => set({ commentary: e.target.value })}
        />
      </Field>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGNAUX
// ─────────────────────────────────────────────────────────────────────────────

function SignalsEditor({ data, set }) {
  const signals = data.signals || [];

  const moveSignal = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= signals.length) return;
    const arr = [...signals];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    set({ signals: arr });
  };

  return (
    <>
      <Field label="Kicker">
        <Input value={data.kicker} onChange={(e) => set({ kicker: e.target.value })} />
      </Field>
      <Field label="Titre">
        <Input value={data.title} onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <div className="text-[11px] text-d-fg4 italic mb-2 mt-1">
        Affichage en grille 2×2. Idéal : 4 signaux.
      </div>

      {signals.map((sig, i) => (
        <div
          key={i}
          className="mb-3 bg-d-panel2 border border-line rounded-xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: "1px solid var(--d-line)" }}>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-base font-semibold text-d-fg3">
                {sig.direction === "up" ? "↗" : "↘"}
              </span>
              <div className="text-sm font-medium text-d-fg truncate">
                {sig.title || (
                  <span className="italic text-d-fg4">Sans titre</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => moveSignal(i, -1)}
                disabled={i === 0}
                className="p-1 text-d-fg4 hover:text-d-fg2 hover:bg-d-panel3 rounded-lg disabled:opacity-20"
              >
                <ChevronUp size={12} />
              </button>
              <button
                type="button"
                onClick={() => moveSignal(i, 1)}
                disabled={i === signals.length - 1}
                className="p-1 text-d-fg4 hover:text-d-fg2 hover:bg-d-panel3 rounded-lg disabled:opacity-20"
              >
                <ChevronDown size={12} />
              </button>
              <button
                type="button"
                onClick={() =>
                  set({
                    signals: [
                      ...signals.slice(0, i + 1),
                      JSON.parse(JSON.stringify(sig)),
                      ...signals.slice(i + 1),
                    ],
                  })
                }
                className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-sm"
              >
                <CopyPlus size={12} />
              </button>
              <button
                type="button"
                onClick={() =>
                  set({
                    signals: signals.filter((_, idx) => idx !== i),
                  })
                }
                className="p-1 text-d-fg4 hover:text-red-400 hover:bg-red-900/20 rounded-lg"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
          <div className="p-3 bg-d-panel3">
            <Field label="Direction">
              <select
                value={sig.direction}
                onChange={(e) =>
                  set({
                    signals: signals.map((x, idx) =>
                      idx === i ? { ...x, direction: e.target.value } : x
                    ),
                  })
                }
                className="w-full px-3 py-2 border border-line rounded-xl text-sm bg-d-panel2 text-d-fg"
              >
                <option value="up">Positif (↗ cyan)</option>
                <option value="down">Négatif (↘ orange)</option>
              </select>
            </Field>
            <Field label="Titre">
              <Input
                value={sig.title}
                onChange={(e) =>
                  set({
                    signals: signals.map((x, idx) =>
                      idx === i ? { ...x, title: e.target.value } : x
                    ),
                  })
                }
              />
            </Field>
            <Field label="Description">
              <TextArea
                showCount
                rows={2}
                value={sig.description}
                onChange={(e) =>
                  set({
                    signals: signals.map((x, idx) =>
                      idx === i ? { ...x, description: e.target.value } : x
                    ),
                  })
                }
              />
            </Field>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          set({
            signals: [
              ...signals,
              {
                direction: "up",
                title: "Nouveau signal",
                description: "Description.",
              },
            ],
          })
        }
        className="w-full mt-1 flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-line text-d-fg3 hover:border-line2 hover:text-d-fg2 rounded-xl text-[10px] uppercase tracking-[0.18em] transition-colors"
      >
        <Plus size={12} /> Ajouter un signal
      </button>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MACRO / Quote
// ─────────────────────────────────────────────────────────────────────────────

function MacroEditor({ data, set }) {
  return (
    <>
      <Field label="Kicker">
        <Input value={data.kicker} onChange={(e) => set({ kicker: e.target.value })} />
      </Field>
      <Field label="Titre">
        <Input value={data.title} onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <Field label="Corps" hint="Éditeur riche">
        <TextArea
          showCount
          rows={3}
          value={data.body}
          onChange={(e) => set({ body: e.target.value })}
        />
      </Field>
      <Field label="Citation">
        <TextArea
          showCount
          rows={3}
          value={data.quote}
          onChange={(e) => set({ quote: e.target.value })}
        />
      </Field>
      <Field label="Auteur de la citation">
        <Input
          value={data.quote_author}
          onChange={(e) => set({ quote_author: e.target.value })}
        />
      </Field>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BARRES MACRO (bloc séparé, non numéroté)
// ─────────────────────────────────────────────────────────────────────────────

function MacroBarsEditor({ data, set }) {
  const bars = data.bars || [];
  return (
    <>
      {bars.map((bar, i) => (
        <div
          key={i}
          className="bg-d-panel2 border border-line rounded-xl p-3 mb-2"
        >
          <div className="grid grid-cols-2 gap-2 mb-2">
            <Input
              value={bar.label}
              onChange={(e) =>
                set({ bars: bars.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x) })
              }
              placeholder="Libellé"
            />
            <Input
              value={bar.value}
              onChange={(e) =>
                set({ bars: bars.map((x, idx) => idx === i ? { ...x, value: e.target.value } : x) })
              }
              placeholder="Valeur"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <Input
              value={bar.percent}
              onChange={(e) =>
                set({ bars: bars.map((x, idx) => idx === i ? { ...x, percent: e.target.value } : x) })
              }
              placeholder="% remplissage (0–100)"
            />
            <Input
              value={bar.caption}
              onChange={(e) =>
                set({ bars: bars.map((x, idx) => idx === i ? { ...x, caption: e.target.value } : x) })
              }
              placeholder="Commentaire"
            />
          </div>
          <button
            type="button"
            onClick={() => set({ bars: bars.filter((_, idx) => idx !== i) })}
            className="text-[10px] uppercase tracking-[0.18em] text-d-fg4 hover:text-red-400 transition-colors"
          >
            Supprimer
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          set({ bars: [...bars, { label: "", value: "", percent: "0", caption: "" }] })
        }
        className="w-full mt-1 flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-line text-d-fg3 hover:border-line2 hover:text-d-fg2 rounded-xl text-[10px] uppercase tracking-[0.18em] transition-colors"
      >
        <Plus size={12} /> Ajouter une barre
      </button>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉVÈNEMENT
// ─────────────────────────────────────────────────────────────────────────────

function EventEditor({ data, set }) {
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Jour">
          <Input value={data.day} onChange={(e) => set({ day: e.target.value })} />
        </Field>
        <Field label="Mois">
          <Input value={data.month} onChange={(e) => set({ month: e.target.value })} />
        </Field>
        <Field label="Année">
          <Input value={data.year} onChange={(e) => set({ year: e.target.value })} />
        </Field>
      </div>
      <Field label="Kicker">
        <Input value={data.kicker} onChange={(e) => set({ kicker: e.target.value })} />
      </Field>
      <Field label="Titre">
        <Input value={data.title} onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <Field label="Description">
        <TextArea
          showCount
          rows={3}
          value={data.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Texte du bouton">
          <Input
            value={data.cta_label}
            onChange={(e) => set({ cta_label: e.target.value })}
          />
        </Field>
        <Field label="Lien du bouton">
          <Input
            value={data.cta_url}
            onChange={(e) => set({ cta_url: e.target.value })}
          />
        </Field>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FOCUS — image uploadable + texte long + 2 CTA
// ─────────────────────────────────────────────────────────────────────────────

function FocusEditor({ data, set }) {
  const { profile } = useAuth();
  const [uploadError, setUploadError] = useState(null);
  const [imageManagerOpen, setImageManagerOpen] = useState(false);

  const handleRemoveImage = async () => {
    if (data.image_path) {
      try {
        await deleteImage(data.image_path);
      } catch {
        // best-effort
      }
    }
    set({ ...data, image_url: "", image_path: "" });
  };

  const handleSelectImage = ({ url, path }) => {
    set({ ...data, image_url: url, image_path: path });
    setImageManagerOpen(false);
    setUploadError(null);
  };

  return (
    <>
      <Field label="Kicker">
        <Input value={data.kicker} onChange={(e) => set({ ...data, kicker: e.target.value })} />
      </Field>
      <Field label="Titre">
        <Input value={data.title} onChange={(e) => set({ ...data, title: e.target.value })} />
      </Field>

      <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-d-fg3 mb-1.5">
        Image (568×280 conseillé, max {MAX_IMAGE_FILE_SIZE_LABEL})
      </div>
      {data.image_url ? (
        <div className="mb-4 bg-d-panel2 border border-line rounded-xl p-3">
          <div className="relative mb-2">
            <img
              src={data.image_url}
              alt={data.image_alt || ""}
              className="w-full h-auto rounded-xl border border-line"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 p-1.5 bg-d-panel2 border border-line rounded-lg hover:bg-red-900/20 hover:border-red-500/30 text-d-fg3 hover:text-red-400 shadow-sm"
              title="Supprimer l'image"
            >
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setImageManagerOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-line text-d-fg3 rounded-xl text-[10px] uppercase tracking-[0.18em] hover:bg-d-panel3 transition-colors"
            >
              <Upload size={12} />
              Gestionnaire
            </button>
            <button
              type="button"
              onClick={handleRemoveImage}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-line text-d-fg3 rounded-xl text-[10px] uppercase tracking-[0.18em] hover:bg-red-900/20 hover:border-red-500/30 hover:text-red-400 transition-colors"
            >
              <X size={12} />
              Retirer
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setImageManagerOpen(true)}
          className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-6 border border-dashed border-line text-d-fg3 hover:border-line2 hover:bg-d-panel2 rounded-xl text-[10px] uppercase tracking-[0.18em] transition-colors disabled:opacity-50"
        >
          <Upload size={14} />
          Ouvrir le gestionnaire d'images
        </button>
      )}
      {uploadError && (
        <div className="rounded-xl p-2 mb-3 text-[11px]" style={{ background: "rgba(255,75,40,0.10)", border: "1px solid rgba(255,75,40,0.20)", color: "#FF8466" }}>
          {uploadError}
        </div>
      )}

      <Field label="Texte alternatif (alt)" hint="Pour les lecteurs d'écran et si l'image ne charge pas">
        <Input
          value={data.image_alt}
          onChange={(e) => set({ ...data, image_alt: e.target.value })}
        />
      </Field>

      <Field
        label="Texte du focus"
        hint="Éditeur riche : gras, italique, souligné, rayé, lien et listes"
      >
        <TextArea
          showCount
          rows={8}
          value={data.body}
          onChange={(e) => set({ ...data, body: e.target.value })}
        />
      </Field>

      <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-d-fg3 mb-2 mt-2">
        Bouton principal (gradient) — <span className="normal-case font-normal text-d-fg4">laisse vide pour ne pas l'afficher</span>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-2">
        <Field label="Texte">
          <Input
            value={data.cta_primary_label}
            onChange={(e) => set({ ...data, cta_primary_label: e.target.value })}
          />
        </Field>
        <Field label="Lien">
          <Input
            value={data.cta_primary_url}
            onChange={(e) => set({ ...data, cta_primary_url: e.target.value })}
          />
        </Field>
      </div>

      <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-d-fg3 mb-2">
        Bouton secondaire (outline) — <span className="normal-case font-normal text-d-fg4">laisse vide pour ne pas l'afficher</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Texte">
          <Input
            value={data.cta_secondary_label}
            onChange={(e) => set({ ...data, cta_secondary_label: e.target.value })}
          />
        </Field>
        <Field label="Lien">
          <Input
            value={data.cta_secondary_url}
            onChange={(e) => set({ ...data, cta_secondary_url: e.target.value })}
          />
        </Field>
      </div>
      {imageManagerOpen && (
        <ImageManagerModal
          currentPath={data.image_path}
          onClose={() => setImageManagerOpen(false)}
          onSelect={handleSelectImage}
          userId={profile?.id}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEXT BLOCK (libre)
// ─────────────────────────────────────────────────────────────────────────────

function TextBlockEditor({ data, set }) {
  return (
    <>
      <Field label="Kicker">
        <Input value={data.kicker} onChange={(e) => set({ kicker: e.target.value })} />
      </Field>
      <Field label="Titre">
        <Input value={data.title} onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <Field label="Corps" hint="Éditeur riche : gras, italique, souligné, rayé, lien et listes">
        <TextArea
          showCount
          rows={5}
          value={data.body}
          onChange={(e) => set({ body: e.target.value })}
        />
      </Field>
      <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-d-fg3 mb-2 mt-2">
        Bouton (gradient) — <span className="normal-case font-normal text-d-fg4">laisse vide pour ne pas l'afficher</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Texte">
          <Input
            value={data.cta_label ?? ""}
            onChange={(e) => set({ cta_label: e.target.value })}
          />
        </Field>
        <Field label="Lien">
          <Input
            value={data.cta_url ?? ""}
            onChange={(e) => set({ cta_url: e.target.value })}
          />
        </Field>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DIVIDER
// ─────────────────────────────────────────────────────────────────────────────

function DividerEditor({ data, set }) {
  return (
    <Field label="Style">
      <select
        value={data.style}
        onChange={(e) => set({ style: e.target.value })}
        className="w-full px-3 py-2 border border-line rounded-xl text-sm bg-d-panel2 text-d-fg"
      >
        <option value="thin">Fin (1px)</option>
        <option value="thick">Épais (4px)</option>
        <option value="gradient">Dégradé Coinhouse</option>
      </select>
    </Field>
  );
}
