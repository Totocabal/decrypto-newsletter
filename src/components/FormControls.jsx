// ─────────────────────────────────────────────────────────────────────────────
// Contrôles de formulaire réutilisables — rich text avec Editor.js
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useId, useRef, useState } from "react";
import { Loader2, Sparkles, ChevronUp, ChevronDown } from "lucide-react";
import EditorJS from "@editorjs/editorjs";
import EditorList from "@editorjs/list";
import Underline from "@editorjs/underline";
import { supabase } from "../lib/supabase.js";
import { Tooltip } from "./Tooltip.jsx";

// ─────────────────────────────────────────────────────────────────────────────
// CSS dark-theme overrides for Editor.js (injected once)
// ─────────────────────────────────────────────────────────────────────────────

let cssInjected = false;
function injectEditorCss() {
  if (cssInjected || typeof document === "undefined") return;
  cssInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    .ejs-wrapper .codex-editor { font-family: 'DM Sans', sans-serif; color: #E4E4EC; }
    .ejs-wrapper .codex-editor__redactor { padding-bottom: 4px !important; }
    .ejs-wrapper .ce-block__content { max-width: none !important; margin: 0 !important; }
    .ejs-wrapper .ce-paragraph { font-size: 15px; line-height: 1.65; color: #E4E4EC; padding: 2px 0; }
    .ejs-wrapper .ce-paragraph[data-placeholder]:empty::before { color: #888; }
    .ejs-wrapper .ce-toolbar__plus { color: #888; }
    .ejs-wrapper .ce-toolbar__plus:hover { color: #ccc; background: rgba(255,255,255,0.06); }
    .ejs-wrapper .ce-toolbar__settings-btn { color: #888; }
    .ejs-wrapper .ce-toolbar__settings-btn:hover { color: #ccc; background: rgba(255,255,255,0.06); }
    .ejs-wrapper .ce-toolbox { background: #1E1E22; border: 1px solid #2E2E36; border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,0.5); }
    .ejs-wrapper .ce-toolbox__button { color: #ccc; }
    .ejs-wrapper .ce-toolbox__button:hover,
    .ejs-wrapper .ce-toolbox__button--active { background: rgba(255,255,255,0.08); color: #fff; }
    .ejs-wrapper .ce-settings { background: #1E1E22; border: 1px solid #2E2E36; border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,0.5); }
    .ejs-wrapper .ce-settings__button { color: #ccc; }
    .ejs-wrapper .ce-settings__button:hover { background: rgba(255,255,255,0.08); color: #fff; }
    .ejs-wrapper .ce-inline-toolbar { background: #1E1E22; border: 1px solid #2E2E36; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.5); }
    .ejs-wrapper .ce-inline-tool { color: #bbb; border-radius: 4px; }
    .ejs-wrapper .ce-inline-tool:hover { background: rgba(255,255,255,0.1); color: #fff; }
    .ejs-wrapper .ce-inline-tool--active { color: #fff; background: rgba(65,65,255,0.4); }
    .ejs-wrapper .ce-inline-toolbar__toggler-and-button-wrapper { padding: 2px; }
    .ejs-wrapper .ce-inline-toolbar__line { border-color: #2E2E36; }
    .ejs-wrapper .ce-inline-toolbar [contenteditable] { color: #ccc; border-color: #444; background: #111; border-radius: 4px; padding: 2px 6px; }
    .ejs-wrapper .cdx-list { padding-left: 1.2em; color: #E4E4EC; font-size: 15px; line-height: 1.65; }
    .ejs-wrapper .cdx-list__item { padding: 2px 0; }
    .ejs-wrapper .ce-block--selected .ce-block__content { background: rgba(65,65,255,0.1); border-radius: 4px; }
    .ejs-wrapper .ce-block:hover { background: transparent; }
    .ejs-wrapper .ce-conversion-toolbar { background: #1E1E22; border: 1px solid #2E2E36; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.5); }
    .ejs-wrapper .ce-conversion-tool { color: #ccc; }
    .ejs-wrapper .ce-conversion-tool:hover,
    .ejs-wrapper .ce-conversion-tool--focused { background: rgba(255,255,255,0.08); }
    .ejs-wrapper .ce-popover { background: #1E1E22; border: 1px solid #2E2E36; border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,0.5); }
    .ejs-wrapper .ce-popover-item { color: #ccc; }
    .ejs-wrapper .ce-popover-item:hover,
    .ejs-wrapper .ce-popover-item--active { background: rgba(255,255,255,0.08); color: #fff; }
    .ejs-wrapper .ce-popover__search { background: #111; border-color: #2E2E36; color: #ccc; border-radius: 6px; }
  `;
  document.head.appendChild(style);
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline tool : Strikethrough
// ─────────────────────────────────────────────────────────────────────────────

class StrikethroughTool {
  static get isInline() { return true; }
  static get title() { return "Barré"; }
  static get sanitize() { return { s: {} }; }

  constructor({ api }) {
    this.api = api;
    this.button = null;
    this._state = false;
  }

  get state() { return this._state; }
  set state(s) {
    this._state = s;
    this.button?.classList.toggle("ce-inline-tool--active", s);
  }

  render() {
    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.classList.add("ce-inline-tool");
    this.button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" y1="12" x2="20" y2="12"/></svg>`;
    return this.button;
  }

  surround(range) {
    if (this.state) {
      const s = this.api.selection.findParentTag("S");
      if (!s) return;
      const content = range.extractContents();
      s.replaceWith(content);
    } else {
      const s = document.createElement("s");
      s.appendChild(range.extractContents());
      range.insertNode(s);
      this.api.selection.expandToTag(s);
    }
  }

  checkState() {
    const s = this.api.selection.findParentTag("S");
    this.state = !!s;
    return this.state;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Serialisation HTML ↔ Editor.js blocks
// ─────────────────────────────────────────────────────────────────────────────

function normalizeInlineTags(html = "") {
  return html
    .replace(/<strong>/gi, "<b>").replace(/<\/strong>/gi, "</b>")
    .replace(/<em>/gi, "<i>").replace(/<\/em>/gi, "</i>");
}

export function htmlToEditorJsBlocks(html = "") {
  const source = String(html || "").trim();
  if (!source) return [{ type: "paragraph", data: { text: "" } }];
  if (typeof window === "undefined") {
    return [{ type: "paragraph", data: { text: source } }];
  }

  const doc = new DOMParser().parseFromString(source, "text/html");
  const blocks = [];
  let paragraphParts = [];

  const flushParagraph = () => {
    const raw = paragraphParts.join("").replace(/<br\s*\/?>\s*$/i, "").trim();
    if (raw) blocks.push({ type: "paragraph", data: { text: normalizeInlineTags(raw) } });
    paragraphParts = [];
  };

  Array.from(doc.body.childNodes).forEach((node) => {
    const name = node.nodeName;
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent) paragraphParts.push(node.textContent);
    } else if (name === "BR") {
      flushParagraph();
    } else if (name === "UL" || name === "OL") {
      flushParagraph();
      const style = name === "UL" ? "unordered" : "ordered";
      const items = Array.from(node.querySelectorAll(":scope > li")).map((li) =>
        normalizeInlineTags(li.innerHTML)
      );
      if (items.length) blocks.push({ type: "list", data: { style, items } });
    } else if (name === "P" || name === "DIV") {
      flushParagraph();
      const inner = node.innerHTML.trim();
      if (inner) blocks.push({ type: "paragraph", data: { text: normalizeInlineTags(inner) } });
    } else {
      paragraphParts.push(node.outerHTML);
    }
  });

  flushParagraph();
  return blocks.length ? blocks : [{ type: "paragraph", data: { text: "" } }];
}

export function editorJsBlocksToHtml(blocks = []) {
  const parts = [];
  for (const block of blocks) {
    if (block.type === "paragraph") {
      const text = String(block.data?.text || "");
      if (text) parts.push(text);
    } else if (block.type === "list") {
      const tag = block.data?.style === "ordered" ? "ol" : "ul";
      const items = (block.data?.items || []).map((item) => {
        const content = typeof item === "string" ? item : (item.content || "");
        return `<li>${content}</li>`;
      });
      if (items.length) parts.push(`<${tag}>${items.join("")}</${tag}>`);
    }
  }
  return parts.join("<br />");
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
  componentDidCatch(error) { console.warn("[editor.js] indisponible:", error); }
  retry = () => { this.setState((s) => ({ error: null, retryKey: s.retryKey + 1 })); };
  render() {
    if (this.state.error) return <PlainTextFallback {...this.props.editorProps} onRetry={this.retry} />;
    return React.cloneElement(this.props.children, { key: this.state.retryKey });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RichTextEditor — Editor.js wrapper
// ─────────────────────────────────────────────────────────────────────────────

function RichTextEditor({ showCount, onChange, value = "", rows = 3, placeholder, ...props }) {
  const rawId = useId();
  const editorId = `ejs${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const editorRef = useRef(null);
  const lastEmittedRef = useRef(String(value ?? ""));
  const [plainTextCount, setPlainTextCount] = useState(() => countPlainText(value));
  const [correcting, setCorrecting] = useState(false);
  const [correctError, setCorrectError] = useState(null);

  useEffect(() => {
    injectEditorCss();

    const initialHtml = String(value ?? "");
    const editor = new EditorJS({
      holder: editorId,
      tools: {
        list: { class: EditorList, inlineToolbar: true },
        underline: { class: Underline },
        strikethrough: { class: StrikethroughTool },
      },
      inlineToolbar: ["bold", "italic", "underline", "strikethrough", "link"],
      data: { blocks: htmlToEditorJsBlocks(initialHtml) },
      placeholder: placeholder || "",
      minHeight: Math.max(Number(rows) || 3, 2) * 28,
      onChange: async () => {
        try {
          const output = await editor.save();
          const html = editorJsBlocksToHtml(output.blocks);
          lastEmittedRef.current = html;
          setPlainTextCount(countPlainText(html));
          onChange?.({ target: { value: html } });
        } catch {}
      },
    });

    editorRef.current = editor;

    return () => {
      editor.isReady.then(() => editor.destroy()).catch(() => {});
      editorRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync external value changes (undo/redo, preset load)
  useEffect(() => {
    const v = String(value ?? "");
    if (v === lastEmittedRef.current) return;
    lastEmittedRef.current = v;
    editorRef.current?.isReady
      .then(() => editorRef.current?.render({ blocks: htmlToEditorJsBlocks(v) }))
      .catch(() => {});
  }, [value]);

  const handleCorrect = async () => {
    if (correcting || !editorRef.current) return;
    setCorrecting(true);
    setCorrectError(null);
    try {
      const output = await editorRef.current.save();
      const html = editorJsBlocksToHtml(output.blocks);
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
      await editorRef.current.render({ blocks: htmlToEditorJsBlocks(corrected) });
      lastEmittedRef.current = corrected;
      setPlainTextCount(countPlainText(corrected));
      onChange?.({ target: { value: corrected } });
    } catch (err) {
      setCorrectError(err.message);
    } finally {
      setCorrecting(false);
    }
  };

  return (
    <div>
      <div className="ejs-wrapper border border-line rounded-xl bg-d-panel2 focus-within:border-line2 transition-colors overflow-hidden">
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
        <div
          id={editorId}
          className="px-2"
          style={{ minHeight: `${Math.max(Number(rows) || 3, 2) * 1.6}rem`, fontFamily: "'DM Sans', sans-serif" }}
        />
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

export function Field({ label, children, hint, action }) {
  return (
    <div className="block mb-4">
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
