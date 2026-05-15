// ─────────────────────────────────────────────────────────────────────────────
// Contrôles de formulaire réutilisables
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { createEditor, Editor, Element as SlateElement, Text, Transforms } from "slate";
import { withHistory } from "slate-history";
import { Editable, Slate, useSlate, withReact } from "slate-react";
import { Tooltip } from "./Tooltip.jsx";

export function Field({ label, children, hint }) {
  return (
    <div className="block mb-4">
      <div className="min-h-[28px] flex items-end text-[10px] uppercase tracking-[0.18em] font-medium text-d-fg3 mb-1.5 leading-tight">
        {label}
      </div>
      {children}
      {hint && (
        <div className="text-[11px] text-d-fg4 mt-1 italic">{hint}</div>
      )}
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

const LIST_TYPES = ["numbered-list", "bulleted-list"];

function createEmptySlateValue() {
  return [{ type: "paragraph", children: [{ text: "" }] }];
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(str = "") {
  return escapeHtml(str).replace(/"/g, "&quot;");
}

function escapeTextForStoredHtml(str = "") {
  return String(str)
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeSlateChildren(children) {
  return children.length ? children : [{ text: "" }];
}

function normalizeSlateValue(nodes) {
  const normalized = [];
  let paragraphChildren = [];

  const flushParagraph = () => {
    if (!paragraphChildren.length) return;
    normalized.push({ type: "paragraph", children: normalizeSlateChildren(paragraphChildren) });
    paragraphChildren = [];
  };

  nodes.forEach((node) => {
    if (SlateElement.isElement(node) && node.type !== "link") {
      flushParagraph();
      normalized.push(node);
      return;
    }
    paragraphChildren.push(node);
  });

  flushParagraph();
  return normalized.length ? normalized : createEmptySlateValue();
}

function deserializeHtml(html = "") {
  try {
    if (typeof window === "undefined" || !window.DOMParser) {
      return [{ type: "paragraph", children: [{ text: String(html || "") }] }];
    }

    const source = String(html || "").trim();
    if (!source) return createEmptySlateValue();

    const doc = new window.DOMParser().parseFromString(source, "text/html");
    const nodes = Array.from(doc.body.childNodes)
      .flatMap((node) => deserializeNode(node))
      .filter(Boolean);

    return normalizeSlateValue(nodes);
  } catch (error) {
    // Un vieux brouillon peut contenir un fragment HTML impossible à normaliser
    // pour Slate. On conserve le texte au lieu de laisser tomber l'app entière.
    console.warn("[rich-text] contenu incompatible, fallback texte:", error);
    return [{ type: "paragraph", children: [{ text: String(html || "") }] }];
  }
}

function deserializeNode(node, marks = {}) {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ? [{ text: node.textContent, ...marks }] : [];
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return [];

  const tagName = node.nodeName.toLowerCase();
  if (tagName === "br") return [{ text: "\n", ...marks }];

  const nextMarks = { ...marks };
  if (tagName === "strong" || tagName === "b") nextMarks.bold = true;
  if (tagName === "em" || tagName === "i") nextMarks.italic = true;
  if (tagName === "u") nextMarks.underline = true;
  if (tagName === "s" || tagName === "strike") nextMarks.strikethrough = true;

  const children = Array.from(node.childNodes).flatMap((child) =>
    deserializeNode(child, nextMarks)
  );

  if (tagName === "a") {
    return [{
      type: "link",
      url: node.getAttribute("href") || "",
      children: normalizeSlateChildren(children),
    }];
  }

  if (tagName === "ul" || tagName === "ol") {
    return [{
      type: tagName === "ul" ? "bulleted-list" : "numbered-list",
      children: normalizeSlateChildren(children).map((child) =>
        SlateElement.isElement(child) && child.type === "list-item"
          ? child
          : { type: "list-item", children: [child] }
      ),
    }];
  }

  if (tagName === "li") {
    return [{
      type: "list-item",
      children: normalizeSlateChildren(children),
    }];
  }

  if (tagName === "p" || tagName === "div") {
    return [{
      type: "paragraph",
      children: normalizeSlateChildren(children),
    }];
  }

  return children;
}

function serializeSlate(nodes = []) {
  return nodes.map(serializeNode).filter(Boolean).join("<br />");
}

function serializeNode(node) {
  if (Text.isText(node)) {
    let text = escapeTextForStoredHtml(node.text).replace(/\n/g, "<br />");
    if (node.bold) text = `<strong>${text}</strong>`;
    if (node.italic) text = `<em>${text}</em>`;
    if (node.underline) text = `<u>${text}</u>`;
    if (node.strikethrough) text = `<s>${text}</s>`;
    return text;
  }

  const children = node.children?.map(serializeNode).join("") || "";
  switch (node.type) {
    case "bulleted-list":
      return `<ul>${children}</ul>`;
    case "numbered-list":
      return `<ol>${children}</ol>`;
    case "list-item":
      return `<li>${children}</li>`;
    case "link":
      return `<a href="${escapeAttr(node.url || "#")}">${children}</a>`;
    case "paragraph":
    default:
      return children;
  }
}

function plainTextLength(nodes = []) {
  return nodes.reduce((count, node) => {
    if (Text.isText(node)) return count + node.text.length;
    return count + plainTextLength(node.children || []);
  }, 0);
}

function isMarkActive(editor, format) {
  const marks = Editor.marks(editor);
  return marks ? marks[format] === true : false;
}

function toggleMark(editor, format) {
  const isActive = isMarkActive(editor, format);
  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
}

function isBlockActive(editor, format) {
  const { selection } = editor;
  if (!selection) return false;

  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: (node) =>
        !Editor.isEditor(node) && SlateElement.isElement(node) && node.type === format,
    })
  );

  return Boolean(match);
}

function toggleBlock(editor, format) {
  const isActive = isBlockActive(editor, format);
  const isList = LIST_TYPES.includes(format);

  Transforms.unwrapNodes(editor, {
    match: (node) =>
      !Editor.isEditor(node) &&
      SlateElement.isElement(node) &&
      LIST_TYPES.includes(node.type),
    split: true,
  });

  const newProperties = {
    type: isActive ? "paragraph" : isList ? "list-item" : format,
  };
  Transforms.setNodes(editor, newProperties);

  if (!isActive && isList) {
    Transforms.wrapNodes(editor, { type: format, children: [] });
  }
}

function insertLink(editor) {
  const url = window.prompt("URL du lien", "https://");
  if (!url) return;

  const { selection } = editor;
  const link = {
    type: "link",
    url,
    children: selection && !Editor.string(editor, selection)
      ? [{ text: url }]
      : [],
  };

  if (selection && !Editor.string(editor, selection)) {
    Transforms.insertNodes(editor, link);
    return;
  }

  if (selection) {
    Transforms.wrapNodes(editor, { type: "link", url, children: [] }, { split: true });
    Transforms.collapse(editor, { edge: "end" });
  } else {
    Transforms.insertNodes(editor, { ...link, children: [{ text: url }] });
  }
}

function withInlines(editor) {
  const { isInline } = editor;
  editor.isInline = (element) => element.type === "link" || isInline(element);
  return editor;
}

function HtmlButton({ title, onMouseDown, active = false, children }) {
  return (
    <Tooltip label={title}>
    <button
      type="button"
      onMouseDown={onMouseDown}
      className={`h-7 w-7 inline-flex items-center justify-center border rounded-lg transition-colors ${
        active
          ? "border-d-fg3 bg-d-panel3 text-d-fg"
          : "border-line text-d-fg4 hover:text-d-fg2 hover:border-line2 bg-d-panel2"
      }`}
    >
      {children}
    </button>
    </Tooltip>
  );
}

function MarkButton({ format, title, children }) {
  const editor = useSlate();
  return (
    <HtmlButton
      title={title}
      active={isMarkActive(editor, format)}
      onMouseDown={(event) => {
        event.preventDefault();
        toggleMark(editor, format);
      }}
    >
      {children}
    </HtmlButton>
  );
}

function BlockButton({ format, title, children }) {
  const editor = useSlate();
  return (
    <HtmlButton
      title={title}
      active={isBlockActive(editor, format)}
      onMouseDown={(event) => {
        event.preventDefault();
        toggleBlock(editor, format);
      }}
    >
      {children}
    </HtmlButton>
  );
}

function LinkButton() {
  const editor = useSlate();
  return (
    <HtmlButton
      title="Lien hypertexte"
      onMouseDown={(event) => {
        event.preventDefault();
        insertLink(editor);
      }}
    >
      <Link size={13} />
    </HtmlButton>
  );
}

function RichTextElement({ attributes, children, element }) {
  switch (element.type) {
    case "bulleted-list":
      return <ul {...attributes} className="list-disc pl-5 my-1 text-inherit text-sm leading-relaxed">{children}</ul>;
    case "numbered-list":
      return <ol {...attributes} className="list-decimal pl-5 my-1 text-inherit text-sm leading-relaxed">{children}</ol>;
    case "list-item":
      return <li {...attributes} className="my-0.5 text-inherit text-sm leading-relaxed">{children}</li>;
    case "link":
      return (
        <a
          {...attributes}
          href={element.url}
          className="text-d-cyan underline decoration-d-cyan/40 underline-offset-2"
        >
          {children}
        </a>
      );
    case "paragraph":
    default:
      return <p {...attributes} className="my-0 text-sm">{children}</p>;
  }
}

function RichTextLeaf({ attributes, children, leaf }) {
  let content = children;
  if (leaf.bold) content = <strong style={{ fontWeight: 700 }}>{content}</strong>;
  if (leaf.italic) content = <em>{content}</em>;
  if (leaf.underline) content = <u>{content}</u>;
  if (leaf.strikethrough) content = <s>{content}</s>;
  return <span {...attributes}>{content}</span>;
}

function handleRichTextHotkeys(event, editor) {
  if (event.key === "Enter" && event.shiftKey) {
    event.preventDefault();
    Editor.insertText(editor, "\n");
    return;
  }

  if (!(event.metaKey || event.ctrlKey)) return;

  const key = event.key.toLowerCase();
  const shortcutMarks = {
    b: "bold",
    i: "italic",
    u: "underline",
  };
  const mark = shortcutMarks[key];
  if (!mark) return;

  event.preventDefault();
  toggleMark(editor, mark);
}

function PlainTextFallback({ showCount, onChange, value = "", rows = 3, onRetry, ...props }) {
  const textValue = String(value ?? "");
  return (
    <div>
      <div className="border border-d-orange/40 rounded-xl bg-d-panel2 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-line bg-d-panel">
          <div className="text-[10px] uppercase tracking-[0.18em] text-d-orange">
            Mode texte
          </div>
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

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.warn("[rich-text] éditeur indisponible:", error);
  }

  retry = () => {
    this.setState((state) => ({ error: null, retryKey: state.retryKey + 1 }));
  };

  render() {
    if (this.state.error) {
      return <PlainTextFallback {...this.props.editorProps} onRetry={this.retry} />;
    }

    return React.cloneElement(this.props.children, { key: this.state.retryKey });
  }
}

export function TextArea(props) {
  return (
    <RichTextErrorBoundary editorProps={props}>
      <RichTextEditor {...props} />
    </RichTextErrorBoundary>
  );
}

function RichTextEditor({ showCount, onChange, value = "", ...props }) {
  const editor = useMemo(() => withInlines(withHistory(withReact(createEditor()))), []);
  const lastEmittedRef = useRef("");
  const initialValueRef = useRef(null);
  const [plainTextCount, setPlainTextCount] = useState(() =>
    plainTextLength(deserializeHtml(value))
  );
  const htmlValue = String(value ?? "");
  const { rows = 3, ...editorProps } = props;

  useEffect(() => {
    if (htmlValue !== lastEmittedRef.current) {
      const nextValue = deserializeHtml(htmlValue);
      initialValueRef.current = nextValue;
      editor.children = nextValue;
      editor.selection = null;
      setPlainTextCount(plainTextLength(nextValue));
    }
    lastEmittedRef.current = htmlValue;
  }, [editor, htmlValue]);

  if (!initialValueRef.current) {
    initialValueRef.current = deserializeHtml(htmlValue);
    lastEmittedRef.current = htmlValue;
  }

  const renderElement = useCallback((renderProps) => <RichTextElement {...renderProps} />, []);
  const renderLeaf = useCallback((renderProps) => <RichTextLeaf {...renderProps} />, []);

  const emitChange = (nextValue) => {
    const nextValueHtml = serializeSlate(nextValue);
    lastEmittedRef.current = nextValueHtml;
    setPlainTextCount(plainTextLength(nextValue));
    onChange?.({ target: { value: nextValueHtml } });
  };

  const handleChange = (nextValue) => {
    const isDocumentChange = editor.operations.some((operation) => operation.type !== "set_selection");
    if (!isDocumentChange) return;
    emitChange(nextValue);
  };

  const el = (
    <div className="border border-line rounded-xl bg-d-panel2 focus-within:border-line2 transition-colors overflow-hidden">
      <Slate
        editor={editor}
        initialValue={initialValueRef.current}
        onChange={handleChange}
      >
        <div className="flex items-center gap-1 overflow-x-auto border-b border-line bg-d-panel2 px-2 py-1.5">
          <MarkButton format="bold" title="Gras">
            <Bold size={13} />
          </MarkButton>
          <MarkButton format="italic" title="Italique">
            <Italic size={13} />
          </MarkButton>
          <MarkButton format="underline" title="Souligné">
            <Underline size={13} />
          </MarkButton>
          <MarkButton format="strikethrough" title="Rayé">
            <Strikethrough size={13} />
          </MarkButton>
          <LinkButton />
          <BlockButton format="bulleted-list" title="Liste à puces">
            <List size={13} />
          </BlockButton>
          <BlockButton format="numbered-list" title="Liste numérotée">
            <ListOrdered size={13} />
          </BlockButton>
        </div>
        <Editable
          {...editorProps}
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          onKeyDown={(event) => {
            handleRichTextHotkeys(event, editor);
            editorProps.onKeyDown?.(event);
          }}
          spellCheck
          className="w-full px-3 py-2 bg-d-panel2 text-sm text-d-fg focus:outline-none leading-relaxed overflow-auto"
          style={{ minHeight: `${Math.max(Number(rows) || 3, 2) * 1.6}rem`, fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}
        />
      </Slate>
    </div>
  );

  if (!showCount) return el;

  return (
    <div>
      {el}
      <div className="text-right text-[10px] text-d-fg4 mt-0.5 tabular-nums">{plainTextCount} car.</div>
    </div>
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
          {open ? (
            <ChevronUp size={14} className="text-d-fg4" />
          ) : (
            <ChevronDown size={14} className="text-d-fg4" />
          )}
        </button>
        {action && open && <div className="pr-3">{action}</div>}
      </div>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}
