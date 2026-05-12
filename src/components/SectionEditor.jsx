// ─────────────────────────────────────────────────────────────────────────────
// SectionEditor — formulaire d'édition spécifique à un type de section
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, CopyPlus, Upload, Loader2, X, RefreshCw } from "lucide-react";
import { useCoinGecko } from "../lib/useCoinGecko.js";
import { Field, Input, TextArea } from "./FormControls.jsx";
import { uploadImage, deleteImage } from "../lib/imageUpload.js";
import { useAuth } from "../contexts/AuthContext.jsx";

export function SectionEditor({ type, data, onChange }) {
  const set = (patch) => onChange({ ...data, ...patch });

  switch (type) {
    case "hero":       return <HeroEditor data={data} set={set} />;
    case "index":      return <IndexEditor data={data} set={set} />;
    case "edito":      return <EditoEditor data={data} set={set} />;
    case "chart":      return <ChartEditor data={data} set={set} />;
    case "fear_greed": return <FearGreedEditor data={data} set={set} />;
    case "signals":    return <SignalsEditor data={data} set={set} />;
    case "macro":      return <MacroEditor data={data} set={set} />;
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

function HeroEditor({ data, set }) {
  const chips = data.chips || [];
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
          rows={2}
          value={data.subtitle}
          onChange={(e) => set({ subtitle: e.target.value })}
        />
      </Field>

      <div className="text-[10px] uppercase tracking-[0.18em] font-medium text-stone-500 mb-2 mt-2">
        Pastilles (chips)
      </div>
      {chips.map((c, i) => (
        <div key={i} className="flex items-center gap-2 mb-2">
          <div style={{ flex: 1 }}>
            <Input
              value={c.label}
              onChange={(e) =>
                set({
                  chips: chips.map((x, idx) =>
                    idx === i ? { label: e.target.value } : x
                  ),
                })
              }
              placeholder="Texte de la pastille"
            />
          </div>
          <button
            type="button"
            onClick={() => set({ chips: chips.filter((_, idx) => idx !== i) })}
            className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-sm flex-shrink-0"
            title="Supprimer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => set({ chips: [...chips, { label: "Nouvelle" }] })}
        className="w-full mt-1 flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-stone-300 text-stone-600 hover:border-stone-500 rounded-sm text-[10px] uppercase tracking-[0.18em] transition-colors"
      >
        <Plus size={12} /> Ajouter une pastille
      </button>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INDEX (Sommaire)
// ─────────────────────────────────────────────────────────────────────────────

function IndexEditor({ data, set }) {
  const items = data.items || [];

  return (
    <>
      <Field label="Libellé du bloc">
        <Input value={data.label} onChange={(e) => set({ label: e.target.value })} />
      </Field>
      {items.map((it, i) => (
        <div
          key={i}
          className="grid grid-cols-[60px_1fr_70px_auto] gap-2 mb-2 items-center"
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
          <Input
            value={it.duration}
            onChange={(e) =>
              set({
                items: items.map((x, idx) =>
                  idx === i ? { ...x, duration: e.target.value } : x
                ),
              })
            }
            placeholder="03 min"
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
            items: [...items, { number: "00", title: "Nouvelle entrée", duration: "01 min" }],
          })
        }
        className="w-full mt-1 flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-stone-300 text-stone-600 hover:border-stone-500 rounded-sm text-[10px] uppercase tracking-[0.18em] transition-colors"
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
        hint="HTML simple : <strong>, <em>, <br />"
      >
        <TextArea
          rows={4}
          value={data.body}
          onChange={(e) => set({ body: e.target.value })}
        />
      </Field>

      <div className="text-[10px] uppercase tracking-[0.18em] font-medium text-stone-500 mb-2 mt-2">
        Grille KPI
      </div>
      {kpis.map((k, i) => (
        <div key={i} className="mb-2 bg-white border border-stone-200 rounded-sm p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-stone-400 font-medium">
              KPI {String(i + 1).padStart(2, "0")}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveKpi(i, -1)}
                disabled={i === 0}
                className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-sm disabled:opacity-20"
              >
                <ChevronUp size={12} />
              </button>
              <button
                type="button"
                onClick={() => moveKpi(i, 1)}
                disabled={i === kpis.length - 1}
                className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-sm disabled:opacity-20"
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
                className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-sm"
                title="Dupliquer"
              >
                <CopyPlus size={12} />
              </button>
              <button
                type="button"
                onClick={() =>
                  set({ kpis: kpis.filter((_, idx) => idx !== i) })
                }
                className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-sm"
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
              className="w-full px-3 py-2 border border-stone-300 rounded-sm text-sm bg-white"
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
        className="w-full mt-1 flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-stone-300 text-stone-600 hover:border-stone-500 rounded-sm text-[10px] uppercase tracking-[0.18em] transition-colors"
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
          className={`flex-1 py-2 text-xs font-medium rounded-sm border transition-colors ${
            mode === "manual"
              ? "bg-stone-800 text-white border-stone-800"
              : "bg-white text-stone-500 border-stone-300 hover:border-stone-400"
          }`}
        >
          Manuel
        </button>
        <button
          type="button"
          onClick={() => set({ chart_mode: "auto" })}
          className={`flex-1 py-2 text-xs font-medium rounded-sm border transition-colors ${
            mode === "auto"
              ? "bg-stone-800 text-white border-stone-800"
              : "bg-white text-stone-500 border-stone-300 hover:border-stone-400"
          }`}
        >
          Auto CoinGecko
        </button>
      </div>

      {/* Sélecteur crypto + bouton refresh (mode auto) */}
      {mode === "auto" && (
        <div className="flex gap-2 mb-4 items-end">
          <Field label="Crypto" className="flex-1">
            <select
              value={crypto}
              onChange={(e) => set({ chart_crypto: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-sm text-sm bg-white"
            >
              <option value="bitcoin">Bitcoin (BTC)</option>
              <option value="ethereum">Ethereum (ETH)</option>
            </select>
          </Field>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-pink-600 text-white rounded-sm hover:bg-pink-700 disabled:opacity-50 transition-colors mb-[1px]"
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
        <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2 mb-3">
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
            className="w-full px-3 py-2 border border-stone-300 rounded-sm text-sm bg-white disabled:bg-stone-50 disabled:text-stone-400"
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
          <div className="text-[10px] uppercase tracking-[0.18em] font-medium text-stone-500 mb-2 mt-3">
            Courbe — déplace les curseurs pour dessiner
          </div>
          <div className="text-[11px] text-stone-400 mb-3 italic">
            100% = haut du graphique (prix élevé) · 0% = bas (prix bas)
          </div>

          <div className="bg-white border border-stone-200 rounded-sm p-4 mb-3">
            {points.map((p, i) => (
              <div key={i} className="flex items-center gap-3 mb-2 last:mb-0">
                <div className="w-12 text-[11px] uppercase tracking-[0.1em] text-stone-500 font-medium flex-shrink-0">
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
                <div className="w-12 text-right text-[11px] text-stone-700 tabular-nums flex-shrink-0">
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
        <div className="mt-3 bg-stone-50 border border-stone-200 rounded-sm p-3">
          <div className="text-[10px] uppercase tracking-[0.18em] font-medium text-stone-500 mb-2">
            Courbe importée — {points.length} points
          </div>
          <div className="flex gap-1 items-end h-8">
            {points.map((p, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-pink-500 rounded-sm"
                  style={{ height: `${Math.max(2, (p / 100) * 28)}px` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {labels.map((l, i) => (
              <span key={i} className="text-[9px] text-stone-400 uppercase tracking-wider">
                {l}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FEAR & GREED
// ─────────────────────────────────────────────────────────────────────────────

function FearGreedEditor({ data, set }) {
  return (
    <>
      <Field label="Kicker">
        <Input value={data.kicker} onChange={(e) => set({ kicker: e.target.value })} />
      </Field>
      <Field label="Titre">
        <Input value={data.title} onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valeur (0–100)">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="100"
              value={data.value}
              onChange={(e) => set({ value: e.target.value })}
              className="flex-1 accent-pink-600"
            />
            <Input
              type="number"
              value={data.value}
              onChange={(e) => set({ value: e.target.value })}
            />
          </div>
        </Field>
        <Field label="Classification">
          <select
            value={data.classification}
            onChange={(e) => set({ classification: e.target.value })}
            className="w-full px-3 py-2 border border-stone-300 rounded-sm text-sm bg-white"
          >
            <option value="EXTREME FEAR">Extreme Fear</option>
            <option value="FEAR">Fear</option>
            <option value="NEUTRAL">Neutral</option>
            <option value="GREED">Greed</option>
            <option value="EXTREME GREED">Extreme Greed</option>
          </select>
        </Field>
      </div>
      <Field label="Commentaire" hint="HTML simple : <strong>, <em>, <br />">
        <TextArea
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
      <div className="text-[11px] text-stone-400 italic mb-2 mt-1">
        Affichage en grille 2×2. Idéal : 4 signaux.
      </div>

      {signals.map((sig, i) => (
        <div
          key={i}
          className="mb-3 bg-white border border-stone-200 rounded-sm overflow-hidden"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-stone-100">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-base font-semibold text-stone-400">
                {sig.direction === "up" ? "↗" : "↘"}
              </span>
              <div className="text-sm font-medium text-stone-800 truncate">
                {sig.title || (
                  <span className="italic text-stone-400">Sans titre</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => moveSignal(i, -1)}
                disabled={i === 0}
                className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-sm disabled:opacity-20"
              >
                <ChevronUp size={12} />
              </button>
              <button
                type="button"
                onClick={() => moveSignal(i, 1)}
                disabled={i === signals.length - 1}
                className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-sm disabled:opacity-20"
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
                className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-sm"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
          <div className="p-3 bg-stone-50/40">
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
                className="w-full px-3 py-2 border border-stone-300 rounded-sm text-sm bg-white"
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
        className="w-full mt-1 flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-stone-300 text-stone-600 hover:border-stone-500 rounded-sm text-[10px] uppercase tracking-[0.18em] transition-colors"
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
  const bars = data.bars || [];
  return (
    <>
      <Field label="Kicker">
        <Input value={data.kicker} onChange={(e) => set({ kicker: e.target.value })} />
      </Field>
      <Field label="Titre">
        <Input value={data.title} onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <Field label="Corps" hint="HTML simple autorisé">
        <TextArea
          rows={3}
          value={data.body}
          onChange={(e) => set({ body: e.target.value })}
        />
      </Field>
      <Field label="Citation">
        <TextArea
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

      <div className="text-[10px] uppercase tracking-[0.18em] font-medium text-stone-500 mb-2 mt-2">
        Barres macro
      </div>
      {bars.map((bar, i) => (
        <div
          key={i}
          className="bg-white border border-stone-200 rounded-sm p-3 mb-2"
        >
          <div className="grid grid-cols-2 gap-2 mb-2">
            <Input
              value={bar.label}
              onChange={(e) =>
                set({
                  bars: bars.map((x, idx) =>
                    idx === i ? { ...x, label: e.target.value } : x
                  ),
                })
              }
              placeholder="Libellé"
            />
            <Input
              value={bar.value}
              onChange={(e) =>
                set({
                  bars: bars.map((x, idx) =>
                    idx === i ? { ...x, value: e.target.value } : x
                  ),
                })
              }
              placeholder="Valeur"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <Input
              value={bar.percent}
              onChange={(e) =>
                set({
                  bars: bars.map((x, idx) =>
                    idx === i ? { ...x, percent: e.target.value } : x
                  ),
                })
              }
              placeholder="% remplissage"
            />
            <Input
              value={bar.caption}
              onChange={(e) =>
                set({
                  bars: bars.map((x, idx) =>
                    idx === i ? { ...x, caption: e.target.value } : x
                  ),
                })
              }
              placeholder="Commentaire"
            />
          </div>
          <button
            type="button"
            onClick={() => set({ bars: bars.filter((_, idx) => idx !== i) })}
            className="text-[10px] uppercase tracking-[0.18em] text-stone-500 hover:text-red-600"
          >
            Supprimer
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          set({
            bars: [
              ...bars,
              { label: "Indicateur", value: "0", percent: "0", caption: "—" },
            ],
          })
        }
        className="w-full mt-1 flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-stone-300 text-stone-600 hover:border-stone-500 rounded-sm text-[10px] uppercase tracking-[0.18em] transition-colors"
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
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const handleFile = async (file) => {
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      // Si une image était déjà uploadée, on tente de la supprimer du bucket
      if (data.image_path) {
        try {
          await deleteImage(data.image_path);
        } catch {
          // best-effort, on continue
        }
      }
      const { url, path } = await uploadImage(file, profile.id);
      set({ ...data, image_url: url, image_path: path });
    } catch (e) {
      setUploadError(e.message || String(e));
    } finally {
      setUploading(false);
    }
  };

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

  return (
    <>
      <Field label="Kicker">
        <Input value={data.kicker} onChange={(e) => set({ ...data, kicker: e.target.value })} />
      </Field>
      <Field label="Titre">
        <Input value={data.title} onChange={(e) => set({ ...data, title: e.target.value })} />
      </Field>

      <div className="text-[10px] uppercase tracking-[0.18em] font-medium text-stone-500 mb-1.5">
        Image (568×280 conseillé, max 5 Mo)
      </div>
      {data.image_url ? (
        <div className="mb-4 bg-white border border-stone-200 rounded-sm p-3">
          <div className="relative mb-2">
            <img
              src={data.image_url}
              alt={data.image_alt || ""}
              className="w-full h-auto rounded-sm border border-stone-200"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 p-1.5 bg-white border border-stone-300 rounded-sm hover:bg-red-50 hover:border-red-300 text-stone-600 hover:text-red-600 shadow-sm"
              title="Supprimer l'image"
            >
              <X size={14} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-stone-300 text-stone-700 rounded-sm text-[10px] uppercase tracking-[0.18em] hover:bg-stone-50 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Upload…
              </>
            ) : (
              <>
                <Upload size={12} />
                Remplacer
              </>
            )}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-6 border border-dashed border-stone-300 text-stone-600 hover:border-stone-500 hover:bg-stone-50 rounded-sm text-[10px] uppercase tracking-[0.18em] transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Upload en cours…
            </>
          ) : (
            <>
              <Upload size={14} />
              Cliquer pour uploader une image
            </>
          )}
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
        onChange={(e) => {
          if (e.target.files?.[0]) handleFile(e.target.files[0]);
          e.target.value = "";
        }}
        className="hidden"
      />
      {uploadError && (
        <div className="bg-red-50 border border-red-200 rounded-sm p-2 mb-3 text-[11px] text-red-700">
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
        hint="HTML simple : <strong>, <em>, <br />"
      >
        <TextArea
          rows={8}
          value={data.body}
          onChange={(e) => set({ ...data, body: e.target.value })}
        />
      </Field>

      <div className="text-[10px] uppercase tracking-[0.18em] font-medium text-stone-500 mb-2 mt-2">
        Bouton principal (gradient)
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

      <div className="text-[10px] uppercase tracking-[0.18em] font-medium text-stone-500 mb-2">
        Bouton secondaire (outline) — laisse vide pour ne pas l'afficher
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
      <Field label="Corps" hint="HTML simple : <strong>, <em>, <br />">
        <TextArea
          rows={5}
          value={data.body}
          onChange={(e) => set({ body: e.target.value })}
        />
      </Field>
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
        className="w-full px-3 py-2 border border-stone-300 rounded-sm text-sm bg-white"
      >
        <option value="thin">Fin (1px)</option>
        <option value="thick">Épais (4px)</option>
        <option value="gradient">Dégradé Coinhouse</option>
      </select>
    </Field>
  );
}
