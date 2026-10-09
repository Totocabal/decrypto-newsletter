// ─────────────────────────────────────────────────────────────────────────────
// Contrôles de formulaire réutilisables — rich text avec Quill
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, ChevronUp, ChevronDown, X } from "lucide-react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { supabase } from "../lib/supabase.js";
import { Tooltip } from "./Tooltip.jsx";
import { useCryptoLinks } from "../lib/useCryptoLinks.js";
import { HIGHLIGHTS, DEFAULT_HIGHLIGHT } from "../config/highlights.js";

const EmbedBlot = Quill.import("blots/embed");
const Delta = Quill.import("delta");

class SoftBreakBlot extends EmbedBlot {
  static blotName = "softbreak";
  static tagName = "BR";
}

Quill.register(SoftBreakBlot, true);

const InlineBlot = Quill.import("blots/inline");

class HighlightBlot extends InlineBlot {
  static blotName = "highlight";
  static tagName = "mark";
  static create(value) {
    const node = super.create();
    node.setAttribute("data-hl", HIGHLIGHTS[value] ? value : DEFAULT_HIGHLIGHT);
    return node;
  }
  // Ne renvoie une valeur que si l'attribut est déjà posé par ce blot : un <mark>
  // collé depuis une autre app (Word, Gmail…) ne doit pas hériter d'un surlignage
  // par défaut — le tag "mark" seul ne suffit pas à identifier notre format.
  static formats(node) {
    const value = node.getAttribute("data-hl");
    return HIGHLIGHTS[value] ? value : undefined;
  }
}

Quill.register(HighlightBlot, true);

class TextColorBlot extends InlineBlot {
  static blotName = "textcolor";
  static tagName = "span";
  static create(value) {
    const node = super.create();
    node.setAttribute("data-tc", HIGHLIGHTS[value] ? value : DEFAULT_HIGHLIGHT);
    return node;
  }
  // Idem : un <span> collé depuis l'extérieur (Word, Google Docs, Gmail…) est
  // presque toujours un simple conteneur de style — il ne doit pas hériter
  // d'une couleur de texte par défaut. Le texte collé reste donc noir/défaut.
  static formats(node) {
    const value = node.getAttribute("data-tc");
    return HIGHLIGHTS[value] ? value : undefined;
  }
}

Quill.register(TextColorBlot, true);

const HIGHLIGHT_CSS = Object.entries(HIGHLIGHTS)
  .map(([key, { bg, fg, textDark }]) => `
    .ql-wrapper .ql-editor mark[data-hl="${key}"] { background-color: ${bg}; color: ${fg}; border-radius: 3px; padding: 0 2px; }
    .ql-wrapper .ql-editor span[data-tc="${key}"] { color: ${textDark}; }
    .ql-wrapper .ql-toolbar.ql-snow button.ql-highlight[value="${key}"]::before {
      content: ""; display: block; width: 14px; height: 14px; border-radius: 4px;
      background: ${bg}; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.25);
    }
    .ql-wrapper .ql-toolbar.ql-snow button.ql-highlight[value="${key}"].ql-active { box-shadow: 0 0 0 2px rgb(var(--d-fg3)); }
    .ql-wrapper .ql-toolbar.ql-snow button.ql-textcolor[value="${key}"]::before {
      content: "A"; display: block; width: 14px; height: 14px; line-height: 14px;
      font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 700; text-align: center;
      color: ${textDark};
    }
    .ql-wrapper .ql-toolbar.ql-snow button.ql-textcolor[value="${key}"].ql-active { box-shadow: 0 0 0 2px rgb(var(--d-fg3)); border-radius: 5px; }`)
  .join("\n");

// ─────────────────────────────────────────────────────────────────────────────
// CSS dark-theme pour Quill (injecté une seule fois)
// ─────────────────────────────────────────────────────────────────────────────

let cssInjected = false;
function injectQuillCss() {
  if (cssInjected || typeof document === "undefined") return;
  cssInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    /* Conteneur */
    .ql-wrapper .ql-container.ql-snow {
      border: none;
      font-family: 'DM Sans', sans-serif;
      font-size: 15px;
    }

    /* Zone de saisie */
    .ql-wrapper .ql-editor {
      color: rgb(var(--d-fg));
      font-family: 'DM Sans', sans-serif;
      font-size: 15px;
      line-height: 1.65;
      padding: 10px 12px;
      min-height: var(--ql-min-height, 72px);
    }
    .ql-wrapper .ql-editor.ql-blank::before {
      color: rgb(var(--d-fg4));
      font-style: normal;
      font-family: 'DM Sans', sans-serif;
    }
    .ql-wrapper .ql-editor p { margin: 0; }
    .ql-wrapper .ql-editor p + p { margin-top: 6px; }

    /* Listes */
    .ql-wrapper .ql-editor ul,
    .ql-wrapper .ql-editor ol { padding-left: 1.4em; margin: 4px 0; list-style: none; }
    .ql-wrapper .ql-editor li {
      color: rgb(var(--d-fg));
      padding-top: 0;
      padding-bottom: 0;
      line-height: 1.65;
      list-style-type: none;
      white-space: pre-wrap;
    }
    .ql-wrapper .ql-editor li::marker { content: ''; }
    .ql-wrapper .ql-editor li::before { color: rgb(var(--d-fg3)); }

    /* Toolbar */
    .ql-wrapper .ql-toolbar.ql-snow {
      border: none;
      border-bottom: 1px solid var(--d-line2);
      background: transparent;
      padding: 5px 8px;
      display: flex;
      align-items: center;
      gap: 2px;
      flex-wrap: wrap;
    }
    .ql-wrapper .ql-toolbar.ql-snow .ql-formats { margin-right: 6px; }
    .ql-wrapper .ql-toolbar.ql-snow button {
      border-radius: 5px;
      width: 26px;
      height: 26px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
    }
    .ql-wrapper .ql-toolbar.ql-snow button:hover {
      background: rgb(var(--d-panel3) / 0.72) !important;
    }
    .ql-wrapper .ql-toolbar.ql-snow button.ql-active {
      background: rgba(65,65,255,0.28) !important;
    }

    /* Icônes SVG */
    .ql-wrapper .ql-toolbar.ql-snow .ql-stroke { stroke: rgb(var(--d-fg3)); transition: stroke 0.15s; }
    .ql-wrapper .ql-toolbar.ql-snow .ql-fill  { fill:   rgb(var(--d-fg3)); transition: fill  0.15s; }
    .ql-wrapper .ql-toolbar.ql-snow .ql-thin  { stroke: rgb(var(--d-fg3)); }
    .ql-wrapper .ql-toolbar.ql-snow button:hover .ql-stroke,
    .ql-wrapper .ql-toolbar.ql-snow button.ql-active .ql-stroke { stroke: rgb(var(--d-fg)); }
    .ql-wrapper .ql-toolbar.ql-snow button:hover .ql-fill,
    .ql-wrapper .ql-toolbar.ql-snow button.ql-active .ql-fill  { fill:   rgb(var(--d-fg)); }

    /* Surlignages */
    ${HIGHLIGHT_CSS}
    .ql-wrapper .ql-toolbar.ql-snow button.ql-highlight,
    .ql-wrapper .ql-toolbar.ql-snow button.ql-textcolor { margin-right: 2px; }

    /* Séparateur de groupes */
    .ql-wrapper .ql-toolbar.ql-snow .ql-formats + .ql-formats::before {
      content: '';
      display: inline-block;
      width: 1px;
      height: 16px;
      background: var(--d-line2);
      margin-right: 8px;
      vertical-align: middle;
    }

    /* Tooltip lien */
    .ql-wrapper .ql-container.ql-snow {
      overflow: visible !important;
    }
    .ql-tooltip {
      position: fixed !important;
      background: rgb(var(--d-panel)) !important;
      border: 1px solid var(--d-line2) !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.6) !important;
      color: rgb(var(--d-fg2)) !important;
      z-index: 1000 !important;
      max-width: min(460px, calc(100vw - 40px)) !important;
      white-space: nowrap !important;
      margin: 0 !important;
      transform: none !important;
    }
    .ql-tooltip.ql-hidden { display: none !important; }
    .ql-wrapper .ql-toolbar.ql-snow button.ql-nbsp::before {
      content: "\\2423"; font-size: 15px; line-height: 1; font-weight: 700; color: rgb(var(--d-fg3));
    }
    .ql-wrapper .ql-toolbar.ql-snow button.ql-nbsp:hover::before { color: rgb(var(--d-fg)); }
    .ql-tooltip input[type=text] {
      background: rgb(var(--d-panel2)) !important;
      border-color: var(--d-line2) !important;
      color: rgb(var(--d-fg)) !important;
      border-radius: 4px !important;
      outline: none !important;
      max-width: min(280px, calc(100vw - 170px)) !important;
    }
    .ql-tooltip a.ql-action::after { color: #aaa !important; border-right-color: #3A3A44 !important; }
    .ql-tooltip a.ql-remove::before { color: #aaa !important; }
    .ql-tooltip a:hover { color: #fff !important; }
    .ql-tooltip::before { color: #666 !important; }
  `;
  document.head.appendChild(style);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Récupère le HTML sémantique depuis une instance Quill v2.
 * getSemanticHTML() produit du HTML standard avec <ol>/<ul>/<li> corrects,
 * contrairement à quill.root.innerHTML qui utilise data-list et ql-ui spans.
 * Retourne "" si le contenu est vide.
 */
function getCleanHtml(quill) {
  // Quill écrit chacune de ses espaces en &nbsp; ; on les ramène à de simples espaces et on
  // réserve &#160; aux espaces insécables insérées volontairement (voir toEditorHtml).
  const html = quill.getSemanticHTML().replace(/&nbsp;/g, " ").replace(/\u00a0/g, "&#160;").trim();
  if (!html || html === "<p><br></p>" || html === "<p></p>") return "";
  return html;
}

// Quill normalise les espaces insécables en espaces au chargement : on les remplace par un
// repère le temps du collage, puis on les réinjecte telles quelles (voir restoreNbsp).
const NBSP_MARK = "\uE000";

function toEditorHtml(html = "") {
  return String(html || "").replace(/&#160;|&#xa0;|\u00a0/gi, NBSP_MARK);
}

function restoreNbsp(quill) {
  const text = quill.getText();
  for (let i = text.length - 1; i >= 0; i -= 1) {
    if (text[i] !== NBSP_MARK) continue;
    const formats = quill.getFormat(i, 1);
    quill.updateContents(new Delta().retain(i).delete(1).insert("\u00A0", formats), "silent");
  }
}

function loadHtml(quill, html) {
  quill.clipboard.dangerouslyPasteHTML(toEditorHtml(html), "silent");
  restoreNbsp(quill);
}

function countPlainText(html = "") {
  return String(html || "").replace(/<[^>]*>/g, "").replace(/&[a-z#0-9]+;/gi, " ").trim().length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback texte brut + Error Boundary
// ─────────────────────────────────────────────────────────────────────────────

function PlainTextFallback({ showCount, onChange, value = "", rows = 3, onRetry, ...props }) {
  const textValue = String(value ?? "");
  const canClear = !props.readOnly && !props.disabled && Boolean(textValue) && typeof onChange === "function";
  const handleClear = () => {
    onChange?.({ target: { value: "" }, currentTarget: { value: "" } });
  };
  return (
    <div>
      <div className="border border-d-orange/40 rounded-xl bg-d-panel2 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-line bg-d-panel">
          <div className="text-[10px] uppercase tracking-[0.18em] text-d-orange">Mode texte</div>
          <button
            type="button"
            onClick={onRetry}
            className="text-[10px] uppercase tracking-[0.18em] text-d-fg2 border border-line hover:border-line2 px-2 py-1 rounded-lg transition-colors"
          >
            Réessayer l'éditeur
          </button>
        </div>
        <div className="relative">
          <textarea
            {...props}
            rows={rows}
            value={textValue}
            onChange={onChange}
            className={`w-full px-3 py-2 ${canClear ? "pr-10" : ""} bg-d-panel2 text-sm text-d-fg focus:outline-none leading-relaxed resize-y`}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          />
          {canClear && (
            <Tooltip label="Vider le champ">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleClear}
                className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-d-panel text-d-fg4 transition-colors hover:border-line2 hover:text-d-fg"
                aria-label="Vider le champ"
              >
                <X size={12} />
              </button>
            </Tooltip>
          )}
        </div>
      </div>
      {showCount && (
        <div className="text-right text-[10px] text-d-fg4 mt-0.5 tabular-nums">
          {textValue.replace(/<[^>]*>/g, "").length} car.
        </div>
      )}
    </div>
  );
}

class RichTextErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, retryKey: 0 };
  }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { console.warn("[quill] indisponible:", error); }
  retry = () => { this.setState((s) => ({ error: null, retryKey: s.retryKey + 1 })); };
  render() {
    if (this.state.error) return <PlainTextFallback {...this.props.editorProps} onRetry={this.retry} />;
    return React.cloneElement(this.props.children, { key: this.state.retryKey });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RichTextEditor — Quill wrapper
// ─────────────────────────────────────────────────────────────────────────────

const TOOLBAR_OPTIONS = [
  ["bold", "italic", "underline", "strike"],
  Object.keys(HIGHLIGHTS).map((key) => ({ highlight: key })),
  Object.keys(HIGHLIGHTS).map((key) => ({ textcolor: key })),
  [{ list: "ordered" }, { list: "bullet" }],
  ["link", "nbsp"],
  ["clean"],
];

const NBSP = "\u00A0";

function insertNbsp(quill) {
  const range = quill.getSelection(true);
  if (!range) return;
  quill.updateContents(
    new Delta().retain(range.index).delete(range.length || 0).insert(NBSP),
    "user",
  );
  quill.setSelection(range.index + 1, 0, "silent");
}

// Le champ de lien de Quill est positionné en absolu dans l'éditeur : il était rogné par la
// carte du bloc (overflow caché) et masqué par la colonne d'aperçu. On le place en `fixed`,
// calé sur la sélection et borné à la fenêtre, pour qu'il passe toujours au-dessus de tout.
function placeTooltipOnTop(quill) {
  const tooltip = quill.theme?.tooltip;
  if (!tooltip) return;
  tooltip.position = (reference) => {
    const root = tooltip.root;
    const container = quill.container.getBoundingClientRect();
    const margin = 8;
    const width = root.offsetWidth;
    const height = root.offsetHeight;
    let left = container.left + reference.left + reference.width / 2 - width / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
    const below = container.top + reference.bottom + 10;
    const above = container.top + reference.top - height - 10;
    const top = below + height + margin > window.innerHeight && above > margin ? above : below;
    root.style.left = `${Math.round(left)}px`;
    root.style.top = `${Math.round(Math.max(margin, top))}px`;
    return 0;
  };
}

function insertSoftBreak(quill, range) {
  if (!range) return false;
  quill.updateContents(
    new Delta().retain(range.index).delete(range.length || 0).insert({ softbreak: true }),
    "user",
  );
  quill.setSelection(range.index + 1, 0, "silent");
  return false;
}

function RichTextEditor({ showCount, onChange, value = "", rows = 3, placeholder, ...props }) {
  const holderRef = useRef(null);
  const quillRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const lastEmittedRef = useRef(String(value ?? ""));
  const [plainTextCount, setPlainTextCount] = useState(() => countPlainText(value));
  const [correcting, setCorrecting] = useState(false);
  const [correctError, setCorrectError] = useState(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    injectQuillCss();

    const quill = new Quill(holderRef.current, {
      theme: "snow",
      modules: {
        toolbar: {
          container: TOOLBAR_OPTIONS,
          handlers: { nbsp() { insertNbsp(this.quill); } },
        },
        keyboard: {
          bindings: {
            nbsp: {
              key: " ",
              shortKey: true,
              shiftKey: true,
              handler() {
                insertNbsp(this.quill);
                return false;
              },
            },
            nbspCtrl: {
              key: " ",
              ctrlKey: true,
              shiftKey: true,
              handler() {
                insertNbsp(this.quill);
                return false;
              },
            },
            shiftEnterInList: {
              key: "Enter",
              shiftKey: true,
              collapsed: true,
              format: ["list"],
              handler(range) {
                return insertSoftBreak(this.quill, range);
              },
            },
            shiftEnterSelectionInList: {
              key: "Enter",
              shiftKey: true,
              collapsed: false,
              format: ["list"],
              handler(range) {
                return insertSoftBreak(this.quill, range);
              },
            },
          },
        },
      },
      formats: ["bold", "italic", "underline", "strike", "highlight", "textcolor", "link", "list", "indent", "softbreak"],
      placeholder: placeholder || "",
    });

    placeTooltipOnTop(quill);

    // Charger le HTML initial
    const initialHtml = String(value ?? "");
    if (initialHtml) {
      loadHtml(quill, initialHtml);
    }

    quill.on("text-change", () => {
      const html = getCleanHtml(quill);
      lastEmittedRef.current = html;
      setPlainTextCount(countPlainText(html));
      onChangeRef.current?.({ target: { value: html } });
    });

    quillRef.current = quill;

    return () => {
      quillRef.current = null;
      // Quill v2 n'a pas de destroy(), on nettoie le DOM manuellement
      if (holderRef.current) {
        const toolbar = holderRef.current.previousSibling;
        if (toolbar?.classList?.contains("ql-toolbar")) toolbar.remove();
        holderRef.current.className = "";
        holderRef.current.removeAttribute("contenteditable");
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync valeur externe (undo/redo, chargement preset)
  useEffect(() => {
    const v = String(value ?? "");
    if (v === lastEmittedRef.current) return;
    lastEmittedRef.current = v;
    if (quillRef.current) {
      loadHtml(quillRef.current, v);
      setPlainTextCount(countPlainText(v));
    }
  }, [value]);

  const handleCorrect = async () => {
    if (correcting || !quillRef.current) return;
    setCorrecting(true);
    setCorrectError(null);
    try {
      const html = getCleanHtml(quillRef.current);
      if (!html.trim()) return;

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ action: "correct-text", html }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur serveur");

      const corrected = data.html;
      loadHtml(quillRef.current, corrected);
      lastEmittedRef.current = corrected;
      setPlainTextCount(countPlainText(corrected));
      onChangeRef.current?.({ target: { value: corrected } });
    } catch (err) {
      setCorrectError(err.message);
    } finally {
      setCorrecting(false);
    }
  };

  const handleClear = () => {
    const quill = quillRef.current;
    if (quill) {
      quill.setText("", "silent");
      quill.setSelection(0, 0, "silent");
    }
    lastEmittedRef.current = "";
    setPlainTextCount(0);
    onChangeRef.current?.({ target: { value: "" }, currentTarget: { value: "" } });
  };

  const minHeight = `${Math.max(Number(rows) || 3, 2) * 1.65}rem`;
  const canClear = !props.readOnly && !props.disabled && Boolean(String(value ?? "")) && typeof onChange === "function";

  return (
    <div>
      <div
        className="ql-wrapper border border-line rounded-xl bg-d-panel2 focus-within:border-line2 transition-colors"
        style={{ "--ql-min-height": minHeight }}
      >
        {/* Toolbar Quill sera insérée ici par Quill avant holderRef */}
        <div className="flex items-center justify-end gap-1.5 border-b border-line bg-d-panel2 px-2 py-1.5">
          {canClear && (
            <Tooltip label="Vider le champ">
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleClear(); }}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-d-fg4 transition-colors hover:border-line2 hover:text-d-fg"
                aria-label="Vider le champ"
              >
                <X size={12} />
              </button>
            </Tooltip>
          )}
          <Tooltip label="Corriger l'orthographe et la grammaire avec l'IA">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleCorrect(); }}
              disabled={correcting}
              className="ai-action-button h-7 inline-flex items-center gap-1 px-2 rounded-lg border transition-colors disabled:opacity-40 text-[10px] font-semibold tracking-[0.1em] uppercase"
            >
              {correcting ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
              Corriger
            </button>
          </Tooltip>
        </div>
        <div ref={holderRef} style={{ fontFamily: "'DM Sans', sans-serif" }} />
      </div>
      {showCount && (
        <div className="text-right text-[10px] text-d-fg4 mt-0.5 tabular-nums">{plainTextCount} car.</div>
      )}
      {correctError && (
        <div className="mt-1 text-[11px] leading-relaxed" style={{ color: "#FF8466" }}>{correctError}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports publics
// ─────────────────────────────────────────────────────────────────────────────

export function Field({ label, children, hint, action, noMargin = false }) {
  return (
    <div className={noMargin ? "block" : "block mb-4"}>
      <div className="min-h-[28px] flex items-center justify-between text-[10px] uppercase tracking-[0.18em] font-medium text-d-fg3 mb-1.5 leading-tight">
        <span>{label}</span>
        {action && <span>{action}</span>}
      </div>
      {children}
      {hint && <div className="text-[11px] text-d-fg4 mt-1 italic">{hint}</div>}
    </div>
  );
}

export function CtaUrlInput({ value, onChange, placeholder = "https://..." }) {
  const current = value || "";
  const { links } = useCryptoLinks();
  const crypto = links.find((c) => c.url === current) || null;
  const [forceManual, setForceManual] = useState(false);
  const selected = crypto && !forceManual ? crypto.symbol : "";
  return (
    <div className="space-y-1.5">
      <select
        value={selected}
        onChange={(e) => {
          const sym = e.target.value;
          if (!sym) {
            setForceManual(true);
            return;
          }
          setForceManual(false);
          onChange(links.find((c) => c.symbol === sym).url);
        }}
        className="w-full rounded-xl border border-line bg-d-panel px-3 py-2 text-sm text-d-fg"
      >
        <option value="">Lien manuel</option>
        {links.map((c) => (
          <option key={c.symbol} value={c.symbol}>{c.symbol} (achat)</option>
        ))}
      </select>
      {selected ? (
        <div className="truncate text-[11px] italic text-d-fg4">{current}</div>
      ) : (
        <Input nbsp={false} value={current} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );
}

const URL_LIKE_VALUE = /^(https?:\/\/|mailto:|tel:|#|\{\{)/i;
const URL_LIKE_PLACEHOLDER = /^https?:|\burl\b/i;

export function Input({ readOnly, ...props }) {
  const {
    clearable = true,
    nbsp = true,
    className = "",
    disabled,
    onChange,
    type = "text",
    value,
    ...inputProps
  } = props;
  const textLikeTypes = new Set(["text", "search", "url", "email", "tel", "password", "date", "month", "week", "time", "datetime-local", "number"]);
  const canClear = clearable !== false
    && !readOnly
    && !disabled
    && textLikeTypes.has(type)
    && value !== undefined
    && value !== null
    && String(value) !== ""
    && typeof onChange === "function";
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);
  // Espace insécable : proposée sur les champs de texte, pas sur les champs de lien.
  const canNbsp = nbsp !== false
    && !readOnly
    && !disabled
    && (type === "text" || type === "search")
    && typeof onChange === "function"
    && !URL_LIKE_VALUE.test(String(value ?? ""))
    && !URL_LIKE_PLACEHOLDER.test(String(inputProps.placeholder ?? ""));
  const insertNbspInInput = () => {
    const el = inputRef.current;
    if (!el) return;
    const start = el.selectionStart ?? String(value ?? "").length;
    const end = el.selectionEnd ?? start;
    const current = String(value ?? "");
    const next = `${current.slice(0, start)}\u00A0${current.slice(end)}`;
    onChange({ target: { value: next, name: inputProps.name, type }, currentTarget: { value: next, name: inputProps.name, type } });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + 1, start + 1);
    });
  };
  const handleKeyDown = (e) => {
    if (canNbsp && e.code === "Space" && e.shiftKey && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      insertNbspInInput();
    }
    inputProps.onKeyDown?.(e);
  };
  const handleClear = () => {
    const event = {
      target: { value: "", name: inputProps.name, type },
      currentTarget: { value: "", name: inputProps.name, type },
    };
    onChange?.(event);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        readOnly={readOnly}
        disabled={disabled}
        type={type}
        value={value}
        onChange={onChange}
        {...inputProps}
        onKeyDown={handleKeyDown}
        onFocus={(e) => { setFocused(true); inputProps.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); inputProps.onBlur?.(e); }}
        className={`w-full px-3 py-2 ${canClear && canNbsp ? "pr-16" : canClear || canNbsp ? "pr-9" : ""} border rounded-xl text-sm focus:outline-none transition-colors ${
          readOnly
            ? "bg-d-panel3 border-line text-d-fg4 cursor-default"
            : "bg-d-panel2 border-line text-d-fg focus:border-line2 hover:border-line2"
        } ${className}`}
        style={{ fontFamily: "'DM Sans', sans-serif", ...inputProps.style }}
      />
      {canNbsp && focused && (
        <Tooltip label="Insérer une espace insécable (Ctrl/Cmd + Maj + Espace)">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={insertNbspInInput}
            className={`absolute ${canClear ? "right-9" : "right-2"} top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-d-panel text-[13px] font-bold leading-none text-d-fg4 transition-colors hover:border-line2 hover:text-d-fg`}
            aria-label="Insérer une espace insécable"
          >
            ␣
          </button>
        </Tooltip>
      )}
      {canClear && (
        <Tooltip label="Vider le champ">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClear}
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-d-panel text-d-fg4 transition-colors hover:border-line2 hover:text-d-fg"
            aria-label="Vider le champ"
          >
            <X size={12} />
          </button>
        </Tooltip>
      )}
    </div>
  );
}

export function TextArea(props) {
  return (
    <RichTextErrorBoundary editorProps={props}>
      <RichTextEditor {...props} />
    </RichTextErrorBoundary>
  );
}

export function Section({ title, children, defaultOpen = true, action }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-5 overflow-hidden rounded-2xl border border-line bg-d-panel">
      <div className="flex w-full items-center justify-between border-b border-line">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-d-panel2"
        >
          <span
            className="min-w-0 text-left text-xs font-semibold uppercase tracking-[0.22em] text-d-fg2"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {title}
          </span>
          {open ? <ChevronUp size={14} className="text-d-fg4" /> : <ChevronDown size={14} className="text-d-fg4" />}
        </button>
        {action && open && <div className="pr-3">{action}</div>}
      </div>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Compat export (utilisé dans certains modules pour parser l'HTML stocké)
// ─────────────────────────────────────────────────────────────────────────────

/** Convertit un HTML stocké en blocs Editor.js (rétrocompat). */
export function htmlToEditorJsBlocks(html = "") {
  return [{ type: "paragraph", data: { text: String(html || "") } }];
}

/** Convertit des blocs Editor.js en HTML (rétrocompat). */
export function editorJsBlocksToHtml(blocks = []) {
  return blocks.map((b) => b.data?.text || "").filter(Boolean).join("<br />");
}
