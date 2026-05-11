// ─────────────────────────────────────────────────────────────────────────────
// Contrôles de formulaire réutilisables
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

export function Field({ label, children, hint }) {
  return (
    <label className="block mb-4">
      <div className="text-[10px] uppercase tracking-[0.18em] font-medium text-stone-500 mb-1.5">
        {label}
      </div>
      {children}
      {hint && (
        <div className="text-[11px] text-stone-400 mt-1 italic">{hint}</div>
      )}
    </label>
  );
}

export function Input(props) {
  return (
    <input
      {...props}
      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-sm text-sm text-stone-800 focus:outline-none focus:border-stone-400 transition-colors"
    />
  );
}

export function TextArea(props) {
  return (
    <textarea
      {...props}
      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-sm text-sm text-stone-800 focus:outline-none focus:border-stone-400 transition-colors leading-relaxed resize-y"
    />
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
