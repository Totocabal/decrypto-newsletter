// ─────────────────────────────────────────────────────────────────────────────
// Contrôles de formulaire réutilisables
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link,
  List,
  ListOrdered,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

export function Field({ label, children, hint }) {
  return (
    <div className="block mb-4">
      <div className="min-h-[30px] flex items-end text-[10px] uppercase tracking-[0.18em] font-medium text-stone-500 mb-1.5 leading-tight">
        {label}
      </div>
      {children}
      {hint && (
        <div className="text-[11px] text-stone-400 mt-1 italic">{hint}</div>
      )}
    </div>
  );
}

export function Input({ readOnly, ...props }) {
  return (
    <input
      readOnly={readOnly}
      {...props}
      className={`w-full px-3 py-2 border rounded-sm text-sm focus:outline-none transition-colors ${
        readOnly
          ? "bg-stone-50 border-stone-200 text-stone-400 cursor-default"
          : "bg-white border-stone-200 text-stone-800 focus:border-stone-400"
      }`}
    />
  );
}

function HtmlButton({ title, onClick, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="h-7 w-7 inline-flex items-center justify-center border border-stone-200 bg-white text-stone-500 hover:text-stone-900 hover:border-stone-400 rounded-sm transition-colors"
      title={title}
    >
      {children}
    </button>
  );
}

export function TextArea({ showCount, onChange, value = "", ...props }) {
  const editorRef = useRef(null);
  const htmlValue = String(value ?? "");
  const { rows = 3, ...editorProps } = props;

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;
    if (editor.innerHTML !== htmlValue) editor.innerHTML = htmlValue;
  }, [htmlValue]);

  const emitChange = () => {
    const nextValue = editorRef.current?.innerHTML || "";
    onChange?.({ target: { value: nextValue } });
  };

  const runCommand = (command, commandValue = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitChange();
  };

  const insertLink = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const url = window.prompt("URL du lien", "https://");
    if (!url) return;
    const safeUrl = url.replace(/"/g, "&quot;");
    editor.focus();
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      document.execCommand("insertHTML", false, `<a href="${safeUrl}">texte du lien</a>`);
    } else {
      document.execCommand("createLink", false, safeUrl);
    }
    emitChange();
  };

  const el = (
    <div className="border border-stone-200 rounded-sm bg-white focus-within:border-stone-400 transition-colors overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-stone-100 bg-stone-50/70">
        <HtmlButton
          title="Gras"
          onClick={() => runCommand("bold")}
        >
          <Bold size={13} />
        </HtmlButton>
        <HtmlButton
          title="Italique"
          onClick={() => runCommand("italic")}
        >
          <Italic size={13} />
        </HtmlButton>
        <HtmlButton
          title="Souligné"
          onClick={() => runCommand("underline")}
        >
          <Underline size={13} />
        </HtmlButton>
        <HtmlButton
          title="Rayé"
          onClick={() => runCommand("strikeThrough")}
        >
          <Strikethrough size={13} />
        </HtmlButton>
        <HtmlButton
          title="Lien hypertexte"
          onClick={insertLink}
        >
          <Link size={13} />
        </HtmlButton>
        <HtmlButton title="Liste à puces" onClick={() => runCommand("insertUnorderedList")}>
          <List size={13} />
        </HtmlButton>
        <HtmlButton title="Liste numérotée" onClick={() => runCommand("insertOrderedList")}>
          <ListOrdered size={13} />
        </HtmlButton>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        onBlur={emitChange}
        dangerouslySetInnerHTML={{ __html: htmlValue }}
        {...editorProps}
        className="w-full px-3 py-2 bg-white text-sm text-stone-800 focus:outline-none leading-relaxed overflow-auto"
        style={{ minHeight: `${Math.max(Number(rows) || 3, 2) * 1.6}rem` }}
      />
    </div>
  );
  if (!showCount) return el;
  const count = editorRef.current?.textContent?.length ?? htmlValue.replace(/<[^>]*>/g, "").length;
  return (
    <div>
      {el}
      <div className="text-right text-[10px] text-stone-400 mt-0.5 tabular-nums">{count} car.</div>
    </div>
  );
}

export function Section({ title, children, defaultOpen = true, action }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-6 bg-stone-50/50 border border-stone-200 rounded-sm overflow-hidden">
      <div className="w-full flex items-center justify-between bg-white border-b border-stone-200">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex-1 flex items-center justify-between px-4 py-3 hover:bg-stone-50 transition-colors"
        >
          <span className="text-xs uppercase tracking-[0.22em] font-medium text-stone-700">
            {title}
          </span>
          {open ? (
            <ChevronUp size={14} className="text-stone-400" />
          ) : (
            <ChevronDown size={14} className="text-stone-400" />
          )}
        </button>
        {action && open && <div className="pr-3">{action}</div>}
      </div>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}
