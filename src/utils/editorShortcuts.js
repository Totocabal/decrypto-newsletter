import { useEffect, useRef } from "react";

export const COLLAPSE_SECTIONS_EVENT = "editor:collapse-sections";
export const COLLAPSE_FOCUS_ITEMS_EVENT = "editor:collapse-focus-items";

const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || "");

const SHORTCUTS = [
  { code: "KeyC", event: COLLAPSE_SECTIONS_EVENT, key: "C" },
  { code: "KeyT", event: COLLAPSE_FOCUS_ITEMS_EVENT, key: "T" },
];

export function shortcutLabel(event) {
  const shortcut = SHORTCUTS.find((s) => s.event === event);
  return IS_MAC ? `⌥⇧${shortcut.key}` : `Alt+Maj+${shortcut.key}`;
}

// Raccourcis : Alt+Maj+C replie tous les blocs, Alt+Maj+T replie les éléments
// des blocs « Texte & Media » ouverts. On utilise event.code car Alt modifie
// le caractère saisi sur macOS.
export function useEditorShortcuts() {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey) return;
      const shortcut = SHORTCUTS.find((s) => s.code === e.code);
      if (!shortcut) return;
      e.preventDefault();
      window.dispatchEvent(new CustomEvent(shortcut.event));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

export function useEditorEvent(eventName, handler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    const listener = () => handlerRef.current();
    window.addEventListener(eventName, listener);
    return () => window.removeEventListener(eventName, listener);
  }, [eventName]);
}
