import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { uploadImage, MAX_IMAGE_FILE_SIZE_BYTES, MAX_IMAGE_FILE_SIZE_LABEL } from "../lib/imageUpload.js";
import {
  DEFAULT_HERO_BACKGROUND_ID,
  DEFAULT_HERO_OPTIONS,
  HERO_BACKGROUNDS,
  HERO_HEIGHT,
  HERO_POSITIONS,
  HERO_WIDTH,
  ensureHeroFonts,
  getHeroBackground,
  loadHeroBackground,
  renderHero,
  stripHeroMarkup,
} from "../lib/heroRenderer.js";
import { Tooltip } from "./Tooltip.jsx";

const POSITION_LABELS = {
  "top-left": "Haut gauche",
  "top-center": "Haut centre",
  "top-right": "Haut droite",
  "middle-left": "Milieu gauche",
  "middle-center": "Centre",
  "middle-right": "Milieu droite",
  "bottom-left": "Bas gauche",
  "bottom-center": "Bas centre",
  "bottom-right": "Bas droite",
};

const LABEL_CLASS = "mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-d-fg4";

function SliderField({ label, value, min, max, step = 1, unit = "", onChange }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-d-fg4">{label}</span>
        <span className="font-mono text-[11px] text-d-fg3">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-d-pink"
      />
    </div>
  );
}

export function HeroEditorModal({ userId, onClose, onCreated }) {
  const canvasRef = useRef(null);
  const textareaRef = useRef(null);
  const [options, setOptions] = useState(DEFAULT_HERO_OPTIONS);
  const [backgroundId, setBackgroundId] = useState(DEFAULT_HERO_BACKGROUND_ID);
  const [bgImage, setBgImage] = useState(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [overflow, setOverflow] = useState(false);

  const set = (patch) => setOptions((current) => ({ ...current, ...patch }));

  const background = getHeroBackground(backgroundId);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    Promise.all([ensureHeroFonts(), loadHeroBackground(background.url)])
      .then(([, image]) => {
        if (cancelled) return;
        setBgImage(image);
        setReady(true);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [background.url]);

  const chooseBackground = (id) => {
    if (id === backgroundId) return;
    // La couleur de texte suit le fond (clair sur fond sombre et inversement) ; on la
    // laisse ensuite modifiable.
    set({ textColor: getHeroBackground(id).textColor });
    setBackgroundId(id);
  };

  useEffect(() => {
    if (!ready || !canvasRef.current) return;
    const layout = renderHero(canvasRef.current.getContext("2d"), { bgImage, bgInset: background.inset, options });
    setOverflow(layout.blockHeight > HERO_HEIGHT - layout.options.margin * 2 + 1);
  }, [ready, bgImage, background.inset, options]);

  const toggleHighlight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const text = options.text;
    let start = textarea.selectionStart;
    let end = textarea.selectionEnd;
    if (start === end) return;

    // On ne garde pas les espaces de bord dans la zone surlignée
    const selected = text.slice(start, end);
    start += selected.length - selected.trimStart().length;
    end -= selected.length - selected.trimEnd().length;
    const inner = text.slice(start, end);
    if (!inner) return;

    let next;
    let selection;
    if (text.slice(start - 2, start) === "[[" && text.slice(end, end + 2) === "]]") {
      next = `${text.slice(0, start - 2)}${inner}${text.slice(end + 2)}`;
      selection = [start - 2, end - 2];
    } else if (inner.startsWith("[[") && inner.endsWith("]]")) {
      next = `${text.slice(0, start)}${inner.slice(2, -2)}${text.slice(end)}`;
      selection = [start, end - 4];
    } else {
      next = `${text.slice(0, start)}[[${inner}]]${text.slice(end)}`;
      selection = [start + 2, end + 2];
    }
    set({ text: next });
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(selection[0], selection[1]);
    });
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !ready || saving) return;
    setSaving(true);
    setError(null);
    try {
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => (result ? resolve(result) : reject(new Error("Export du visuel impossible."))), "image/png");
      });
      if (blob.size > MAX_IMAGE_FILE_SIZE_BYTES) {
        throw new Error(`Visuel trop lourd (${(blob.size / 1024 / 1024).toFixed(1)} Mo). Max ${MAX_IMAGE_FILE_SIZE_LABEL}.`);
      }
      const slug = stripHeroMarkup(options.text).normalize("NFD").replace(/[̀-ͯ]/g, "").trim() || "visuel";
      const file = new File([blob], `hero-${slug}.png`, { type: "image/png" });
      const uploaded = await uploadImage(file, userId);
      await onCreated?.(uploaded);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-d-bg text-d-fg">
      <header className="flex items-center gap-3 border-b border-line bg-d-panel px-4 py-3 sm:px-6">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-d-pink">Gestionnaire d'images</div>
          <div className="truncate text-base font-semibold tracking-tight sm:text-lg" style={{ fontFamily: "'Sora', sans-serif" }}>
            Créer un hero
          </div>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!ready || saving}
          className="inline-flex items-center gap-2 rounded-full border border-d-pink bg-d-pink px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-d-pink/90 disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {saving ? "Enregistrement…" : "Créer le hero"}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          aria-label="Fermer"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-d-fg3 transition-colors hover:border-line2 hover:text-d-fg disabled:opacity-50"
        >
          <X size={16} />
        </button>
      </header>

      <main className="grid flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(300px,380px)_1fr] lg:overflow-hidden">
        <aside className="space-y-5 border-b border-line bg-d-panel p-4 sm:p-5 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div>
            <div className={LABEL_CLASS}>Fond</div>
            <div className="grid grid-cols-3 gap-2">
              {HERO_BACKGROUNDS.map((item) => {
                const active = item.id === backgroundId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => chooseBackground(item.id)}
                    aria-pressed={active}
                    title={item.label}
                    className={`group overflow-hidden rounded-lg border text-left transition-colors ${
                      active ? "border-d-pink ring-2 ring-d-pink/40" : "border-line hover:border-line2"
                    }`}
                  >
                    <img src={item.url} alt={item.label} loading="lazy" className="block aspect-video w-full object-cover" />
                    <span className="block truncate bg-d-panel2 px-1.5 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-d-fg3">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className={LABEL_CLASS}>Texte</div>
            <textarea
              ref={textareaRef}
              value={options.text}
              onChange={(event) => set({ text: event.target.value })}
              rows={4}
              className="w-full resize-y rounded-xl border border-line bg-d-panel2 px-3 py-2 text-sm leading-relaxed text-d-fg focus:border-line2 focus:outline-none"
              style={{ fontFamily: "'Sora', sans-serif" }}
            />
            <div className="mt-2 flex items-start gap-3">
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={toggleHighlight}
                className="inline-flex flex-shrink-0 items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-d-fg2 transition-colors hover:border-line2"
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ background: "linear-gradient(90deg, #8701FF, #FF00AA, #FF4B28)" }}
                />
                Dégradé
              </button>
              <p className="text-[11px] leading-relaxed text-d-fg4">
                Sélectionne des mots puis clique sur « Dégradé » (ou entoure-les de [[ ]]). Un retour à la ligne force une nouvelle ligne.
              </p>
            </div>
          </div>

          <SliderField label="Taille du texte" value={options.fontSize} min={24} max={120} unit=" px" onChange={(fontSize) => set({ fontSize })} />
          <SliderField label="Interligne" value={options.lineHeight} min={0.9} max={1.5} step={0.01} onChange={(lineHeight) => set({ lineHeight })} />
          <SliderField label="Largeur du texte" value={options.maxWidth} min={30} max={100} unit=" %" onChange={(maxWidth) => set({ maxWidth })} />
          <SliderField label="Marge" value={options.margin} min={0} max={200} unit=" px" onChange={(margin) => set({ margin })} />

          <div>
            <div className={LABEL_CLASS}>Position</div>
            <div className="grid w-40 grid-cols-3 gap-1.5">
              {HERO_POSITIONS.map((position) => {
                const active = options.position === position;
                return (
                  <Tooltip key={position} label={POSITION_LABELS[position]}>
                    <button
                      type="button"
                      onClick={() => set({ position })}
                      aria-label={POSITION_LABELS[position]}
                      aria-pressed={active}
                      className={`flex h-11 w-full items-center justify-center rounded-lg border transition-colors ${
                        active ? "border-d-pink bg-d-pink/15" : "border-line bg-d-panel2 hover:border-line2"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${active ? "bg-d-pink" : "bg-d-fg4"}`} />
                    </button>
                  </Tooltip>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-d-fg4">L'alignement du texte suit la colonne choisie.</p>
          </div>

          <div>
            <div className={LABEL_CLASS}>Couleur du texte</div>
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-d-panel p-1">
              {[
                ["dark", "Sombre"],
                ["light", "Clair"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set({ textColor: value })}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    options.textColor === value
                      ? "bg-d-fg text-d-bg shadow-sm"
                      : "text-d-fg3 hover:bg-d-panel2 hover:text-d-fg"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-3 text-[11px] leading-relaxed text-red-300">
              {error}
            </div>
          )}
        </aside>

        <section className="flex min-h-[320px] flex-col items-center justify-center gap-3 p-4 sm:p-8 lg:overflow-y-auto">
          <div className="relative w-full max-w-[1000px] overflow-hidden rounded-2xl border border-line bg-d-panel2 shadow-xl" style={{ aspectRatio: `${HERO_WIDTH} / ${HERO_HEIGHT}` }}>
            <canvas ref={canvasRef} width={HERO_WIDTH} height={HERO_HEIGHT} className="h-full w-full" />
            {!ready && !error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 size={22} className="animate-spin text-d-pink" />
              </div>
            )}
          </div>
          {overflow && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-300">
              Le texte dépasse du visuel : réduis la taille, la marge ou élargis la zone de texte.
            </div>
          )}
          <div className="text-[11px] text-d-fg4">
            {HERO_WIDTH} × {HERO_HEIGHT} px · PNG · police Sora
          </div>
        </section>
      </main>
    </div>
  );
}
