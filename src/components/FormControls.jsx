// ─────────────────────────────────────────────────────────────────────────────
// Contrôles de formulaire réutilisables — rich text avec Quill
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, ChevronUp, ChevronDown } from "lucide-react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { supabase } from "../lib/supabase.js";
import { Tooltip } from "./Tooltip.jsx";

const EmbedBlot = Quill.import("blots/embed");

class SoftBreakBlot extends EmbedBlot {
  static blotName = "softbreak";
  static tagName = "BR";
}

Quill.register(SoftBreakBlot, true);

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
      color: #E4E4EC;
      font-family: 'DM Sans', sans-serif;
      font-size: 15px;
      line-height: 1.65;
      padding: 10px 12px;
      min-height: var(--ql-min-height, 72px);
    }
    .ql-wrapper .ql-editor.ql-blank::before {
      color: #555;
      font-style: normal;
      font-family: 'DM Sans', sans-serif;
    }
    .ql-wrapper .ql-editor p { margin: 0; }
    .ql-wrapper .ql-editor p + p { margin-top: 6px; }

    /* Listes */
    .ql-wrapper .ql-editor ul,
    .ql-wrapper .ql-editor ol { padding-left: 1.4em; margin: 4px 0; }
    .ql-wrapper .ql-editor li { color: #E4E4EC; padding: 1px 0; line-height: 1.65; white-space: pre-wrap; }
    .ql-wrapper .ql-editor li::before { color: #888; }

    /* Toolbar */
    .ql-wrapper .ql-toolbar.ql-snow {
      border: none;
      border-bottom: 1px solid #2E2E36;
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
      background: rgba(255,255,255,0.08) !important;
    }
    .ql-wrapper .ql-toolbar.ql-snow button.ql-active {
      background: rgba(65,65,255,0.28) !important;
    }

    /* Icônes SVG */
    .ql-wrapper .ql-toolbar.ql-snow .ql-stroke { stroke: #777; transition: stroke 0.15s; }
    .ql-wrapper .ql-toolbar.ql-snow .ql-fill  { fill:   #777; transition: fill  0.15s; }
    .ql-wrapper .ql-toolbar.ql-snow .ql-thin  { stroke: #777; }
    .ql-wrapper .ql-toolbar.ql-snow button:hover .ql-stroke,
    .ql-wrapper .ql-toolbar.ql-snow button.ql-active .ql-stroke { stroke: #E4E4EC; }
    .ql-wrapper .ql-toolbar.ql-snow button:hover .ql-fill,
    .ql-wrapper .ql-toolbar.ql-snow button.ql-active .ql-fill  { fill:   #E4E4EC; }

    /* Séparateur de groupes */
    .ql-wrapper .ql-toolbar.ql-snow .ql-formats + .ql-formats::before {
      content: '';
      display: inline-block;
      width: 1px;
      height: 16px;
      background: #2E2E36;
      margin-right: 8px;
      vertical-align: middle;
    }

    /* Tooltip lien */
    .ql-tooltip {
      background: rgb(var(--d-panel)) !important;
      border: 1px solid var(--d-line2) !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.6) !important;
      color: rgb(var(--d-fg2)) !important;
    }
    .ql-tooltip input[type=text] {
      background: rgb(var(--d-panel2)) !important;
      border-color: var(--d-line2) !important;
      color: rgb(var(--d-fg)) !important;
      border-radius: 4px !important;
      outline: none !important;
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
  const html = quill.getSemanticHTML().trim();
  if (!html || html === "<p><br></p>" || html === "<p></p>") return "";
  return html;
}

function countPlainText(html = "") {
  return String(html || "").replace(/<[^>]*>/g, "").replace(/&[a-z#0-9]+;/gi, " ").trim().length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback texte brut + Error Boundary
// ─────────────────────────────────────────────────────────────────────────────

function PlainTextFallback({ showCount, onChange, value = "", rows = 3, onRetry, ...props }) {
  const textValue = String(value ?? "");
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
        <textarea
          {...props}
          rows={rows}
          value={textValue}
          onChange={onChange}
          className="w-full px-3 py-2 bg-d-panel2 text-sm text-d-fg focus:outline-none leading-relaxed resize-y"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        />
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
  [{ list: "ordered" }, { list: "bullet" }],
  ["link"],
  ["clean"],
];

function RichTextEditor({ showCount, onChange, value = "", rows = 3, placeholder, ...props }) {
  const holderRef = useRef(null);
  const quillRef = useRef(null);
  const lastEmittedRef = useRef(String(value ?? ""));
  const [plainTextCount, setPlainTextCount] = useState(() => countPlainText(value));
  const [correcting, setCorrecting] = useState(false);
  const [correctError, setCorrectError] = useState(null);

  useEffect(() => {
    injectQuillCss();

    const quill = new Quill(holderRef.current, {
      theme: "snow",
      modules: {
        toolbar: TOOLBAR_OPTIONS,
        keyboard: {
          bindings: {
            shiftEnter: {
              key: "Enter",
              shiftKey: true,
              handler(range) {
                const formats = this.quill.getFormat(range);
                if (!formats.list) return true;
                this.quill.insertEmbed(range.index, "softbreak", true, "user");
                this.quill.setSelection(range.index + 1, 0, "silent");
                return false;
              },
            },
          },
        },
      },
      formats: ["bold", "italic", "underline", "strike", "link", "list", "indent"],
      placeholder: placeholder || "",
    });

    // Charger le HTML initial
    const initialHtml = String(value ?? "");
    if (initialHtml) {
      quill.clipboard.dangerouslyPasteHTML(initialHtml);
    }

    quill.on("text-change", () => {
      const html = getCleanHtml(quill);
      lastEmittedRef.current = html;
      setPlainTextCount(countPlainText(html));
      onChange?.({ target: { value: html } });
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
      quillRef.current.clipboard.dangerouslyPasteHTML(v || "");
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
      const res = await fetch("/api/correct-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ html }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur serveur");

      const corrected = data.html;
      quillRef.current.clipboard.dangerouslyPasteHTML(corrected || "");
      lastEmittedRef.current = corrected;
      setPlainTextCount(countPlainText(corrected));
      onChange?.({ target: { value: corrected } });
    } catch (err) {
      setCorrectError(err.message);
    } finally {
      setCorrecting(false);
    }
  };

  const minHeight = `${Math.max(Number(rows) || 3, 2) * 1.65}rem`;

  return (
    <div>
      <div
        className="ql-wrapper border border-line rounded-xl bg-d-panel2 focus-within:border-line2 transition-colors overflow-hidden"
        style={{ "--ql-min-height": minHeight }}
      >
        {/* Toolbar Quill sera insérée ici par Quill avant holderRef */}
        <div className="flex items-center justify-end border-b border-line bg-d-panel2 px-2 py-1.5">
          <Tooltip label="Corriger l'orthographe et la grammaire avec l'IA">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleCorrect(); }}
              disabled={correcting}
              className="h-7 inline-flex items-center gap-1 px-2 rounded-lg border transition-colors disabled:opacity-40 text-[10px] font-semibold tracking-[0.1em] uppercase"
              style={{ color: "#03FFCF", borderColor: "rgba(3,255,207,0.25)", background: "rgba(3,255,207,0.06)" }}
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

export function Input({ readOnly, ...props }) {
  return (
    <input
      readOnly={readOnly}
      {...props}
      className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none transition-colors ${
        readOnly
          ? "bg-d-panel3 border-line text-d-fg4 cursor-default"
          : "bg-d-panel2 border-line text-d-fg focus:border-line2 hover:border-line2"
      }`}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    />
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
