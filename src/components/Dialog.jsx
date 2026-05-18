import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, AlertTriangle, CheckCircle, Info } from "lucide-react";

const ToastCtx = createContext(null);
const ConfirmCtx = createContext(null);
const PromptCtx = createContext(null);

export function DialogProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const [promptState, setPromptState] = useState(null);
  const resolveRef = useRef(null);

  const addToast = useCallback((message, type = "error") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const confirm = useCallback((message, opts = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setConfirmState({ message, ...opts });
    });
  }, []);

  const prompt = useCallback((message, opts = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setPromptState({ message, defaultValue: "", ...opts });
    });
  }, []);

  const handleConfirm = () => { resolveRef.current?.(true); setConfirmState(null); };
  const handleCancel = () => { resolveRef.current?.(false); setConfirmState(null); };
  const handleExtra = () => { resolveRef.current?.("leave"); setConfirmState(null); };
  const handlePromptSubmit = (value) => { resolveRef.current?.(value); setPromptState(null); };
  const handlePromptCancel = (leaveValue = null) => { resolveRef.current?.(leaveValue); setPromptState(null); };

  return (
    <ToastCtx.Provider value={addToast}>
      <ConfirmCtx.Provider value={confirm}>
        <PromptCtx.Provider value={prompt}>
          {children}
          {createPortal(
            <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column-reverse", gap: 8, alignItems: "flex-end" }}>
              {toasts.map((t) => (
                <ToastItem key={t.id} toast={t} onRemove={removeToast} />
              ))}
            </div>,
            document.body
          )}
          {confirmState && createPortal(
            <ConfirmModal {...confirmState} onConfirm={handleConfirm} onCancel={handleCancel} onExtra={handleExtra} />,
            document.body
          )}
          {promptState && createPortal(
            <PromptModal {...promptState} onSubmit={handlePromptSubmit} onCancel={(v) => handlePromptCancel(v)} />,
            document.body
          )}
        </PromptCtx.Provider>
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  );
}

export function useToast() { return useContext(ToastCtx); }
export function useConfirm() { return useContext(ConfirmCtx); }
export function usePrompt() { return useContext(PromptCtx); }

function ToastItem({ toast, onRemove }) {
  const { id, message, type } = toast;
  const isError = type === "error";
  const isSuccess = type === "success";
  return (
    <div style={{
      background: isError ? "#2A1212" : isSuccess ? "#121F18" : "#1E1E28",
      border: `1px solid ${isError ? "rgba(255,80,60,0.4)" : isSuccess ? "rgba(3,255,207,0.35)" : "rgba(255,255,255,0.1)"}`,
      borderRadius: 12,
      padding: "10px 12px 10px 14px",
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      maxWidth: 380,
      minWidth: 220,
      boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
      animation: "fadeSlideIn 0.18s ease",
    }}>
      {isError
        ? <AlertTriangle size={14} style={{ color: "#FF8466", flexShrink: 0, marginTop: 1 }} />
        : isSuccess
        ? <CheckCircle size={14} style={{ color: "#03FFCF", flexShrink: 0, marginTop: 1 }} />
        : <Info size={14} style={{ color: "#aaa", flexShrink: 0, marginTop: 1 }} />}
      <span style={{ fontSize: 13, color: "#e0e0e0", flex: 1, lineHeight: 1.45 }}>{message}</span>
      <button onClick={() => onRemove(id)} style={{ color: "#555", background: "none", border: "none", cursor: "pointer", padding: "1px 0 0 4px", flexShrink: 0, lineHeight: 1 }}>
        <X size={12} />
      </button>
    </div>
  );
}

function ConfirmModal({ message, title = "Confirmation", confirmLabel = "Confirmer", cancelLabel = "Annuler", extraLabel, danger = false, onConfirm, onCancel, onExtra }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Enter") { e.preventDefault(); onConfirm(); }
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onConfirm, onCancel]);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{ background: "#1E1E22", border: "1px solid #333", borderRadius: 18, width: "100%", maxWidth: 420, padding: "28px 28px 24px", boxShadow: "0 8px 48px rgba(0,0,0,0.6)", margin: 16 }}>
        <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 600, color: "#f0f0f0", marginBottom: 10 }}>{title}</h2>
        <p style={{ fontSize: 14, color: "#999", lineHeight: 1.55, marginBottom: 24 }}>{message}</p>
        {extraLabel ? (
          /* 3 choix : Confirmer + Extra côte à côte, Annuler en dessous */
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onExtra} style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid #3a3a3a", background: "transparent", color: "#bbb", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                {extraLabel}
              </button>
              <button onClick={onConfirm} style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "none", background: danger ? "#d93025" : "#FF00AA", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {confirmLabel}
              </button>
            </div>
            <button onClick={onCancel} style={{ width: "100%", padding: "8px 14px", borderRadius: 10, border: "none", background: "transparent", color: "#555", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
              {cancelLabel}
            </button>
          </div>
        ) : (
          /* 2 choix : côte à côte */
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onCancel} style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid #3a3a3a", background: "transparent", color: "#999", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              {cancelLabel}
            </button>
            <button onClick={onConfirm} style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "none", background: danger ? "#d93025" : "#FF00AA", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {confirmLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PromptModal({ message, title = "Commentaire", defaultValue = "", confirmLabel = "Confirmer", cancelLabel = "Je quitte sans sauvegarder", cancelValue = "leave", onSubmit, onCancel }) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onCancel(cancelValue);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, cancelValue]);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(cancelValue); }}
    >
      <div style={{ background: "#1E1E22", border: "1px solid #333", borderRadius: 18, width: "100%", maxWidth: 420, padding: "28px 28px 24px", boxShadow: "0 8px 48px rgba(0,0,0,0.6)", margin: 16 }}>
        <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 600, color: "#f0f0f0", marginBottom: 10 }}>{title}</h2>
        <p style={{ fontSize: 14, color: "#999", lineHeight: 1.55, marginBottom: 14 }}>{message}</p>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(value); }}>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Optionnel…"
            style={{ width: "100%", boxSizing: "border-box", background: "#2a2a2e", border: "1px solid #3a3a3a", borderRadius: 10, padding: "9px 12px", fontSize: 13, color: "#e0e0e0", marginBottom: 16, outline: "none" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => onCancel(cancelValue)} style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid #3a3a3a", background: "transparent", color: "#999", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              {cancelLabel}
            </button>
            <button type="submit" style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "none", background: "#FF00AA", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
