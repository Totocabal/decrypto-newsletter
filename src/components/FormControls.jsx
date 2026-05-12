// ─────────────────────────────────────────────────────────────────────────────
// Contrôles de formulaire réutilisables
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState } from "react";
import { Bold, Italic, Link, List, ChevronUp, ChevronDown } from "lucide-react";

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

function MarkdownButton({ title, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-7 w-7 inline-flex items-center justify-center border border-stone-200 bg-white text-stone-500 hover:text-stone-900 hover:border-stone-400 rounded-sm transition-colors"
      title={title}
    >
      {children}
    </button>
  );
}

function applyMarkdown(value, selectionStart, selectionEnd, before, after = before, fallback = "") {
  const selected = value.slice(selectionStart, selectionEnd) || fallback;
  const nextValue =
    value.slice(0, selectionStart) +
    before +
    selected +
    after +
    value.slice(selectionEnd);
  return {
    value: nextValue,
    selectionStart: selectionStart + before.length,
    selectionEnd: selectionStart + before.length + selected.length,
  };
}

export function TextArea({ showCount, onChange, value = "", ...props }) {
  const textareaRef = useRef(null);
  const textValue = String(value ?? "");

  const emitChange = (nextValue, selectionStart, selectionEnd) => {
    onChange?.({ target: { value: nextValue } });
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  const wrapSelection = (before, after, fallback) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const result = applyMarkdown(
      textValue,
      textarea.selectionStart,
      textarea.selectionEnd,
      before,
      after,
      fallback
    );
    emitChange(result.value, result.selectionStart, result.selectionEnd);
  };

  const insertList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textValue.slice(start, end);
    const listText = selected
      ? selected
          .split("\n")
          .map((line) => (line.startsWith("- ") ? line : `- ${line}`))
          .join("\n")
      : "- Élément de liste";
    const nextValue = textValue.slice(0, start) + listText + textValue.slice(end);
    emitChange(nextValue, start, start + listText.length);
  };

  const el = (
    <div className="border border-stone-200 rounded-sm bg-white focus-within:border-stone-400 transition-colors overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-stone-100 bg-stone-50/70">
        <MarkdownButton
          title="Gras Markdown"
          onClick={() => wrapSelection("**", "**", "texte")}
        >
          <Bold size={13} />
        </MarkdownButton>
        <MarkdownButton
          title="Italique Markdown"
          onClick={() => wrapSelection("*", "*", "texte")}
        >
          <Italic size={13} />
        </MarkdownButton>
        <MarkdownButton
          title="Lien Markdown"
          onClick={() => wrapSelection("[", "](https://)", "texte du lien")}
        >
          <Link size={13} />
        </MarkdownButton>
        <MarkdownButton title="Liste Markdown" onClick={insertList}>
          <List size={13} />
        </MarkdownButton>
      </div>
      <textarea
        ref={textareaRef}
        value={textValue}
        onChange={onChange}
        {...props}
        className="w-full px-3 py-2 bg-white text-sm text-stone-800 focus:outline-none leading-relaxed resize-y font-mono"
      />
    </div>
  );
  if (!showCount) return el;
  const count = textValue.length;
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
