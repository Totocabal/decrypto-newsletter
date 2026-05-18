// ─────────────────────────────────────────────────────────────────────────────
// LockRequestBanner — bandeau temporaire affiché au détenteur du lock quand
// un autre utilisateur souhaite accéder à l'édition
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";

const AUTO_DISMISS_MS = 8000;

export function LockRequestBanner({ lockRequest, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  // Slide-in à l'apparition
  useEffect(() => {
    if (!lockRequest) return;
    // Micro-délai pour que la transition CSS se déclenche (depuis display:none)
    requestAnimationFrame(() => setVisible(true));

    timerRef.current = setTimeout(() => {
      handleDismiss();
    }, AUTO_DISMISS_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockRequest]);

  function handleDismiss() {
    setVisible(false);
    // Laisser la transition se terminer avant de retirer du DOM
    setTimeout(() => onDismiss(), 350);
  }

  if (!lockRequest) return null;

  return (
    <>
      <style>{`
        @keyframes lock-request-slide {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
      <div
        className="border-b px-4 py-3 sm:px-6"
        style={{
          background: "rgba(255, 180, 0, 0.08)",
          borderColor: "rgba(255, 180, 0, 0.22)",
          animation: visible ? "lock-request-slide 0.35s cubic-bezier(0.22,1,0.36,1) both" : "none",
          transition: visible ? "none" : "opacity 0.3s, transform 0.3s",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(-100%)",
        }}
      >
        <div className="mx-auto flex w-full max-w-none items-center gap-3">
          <Bell size={15} style={{ color: "#F5B800", flexShrink: 0 }} />
          <p className="flex-1 text-sm" style={{ color: "#F5D060" }}>
            <strong style={{ color: "#FFE082" }}>
              {lockRequest.requesterName}
            </strong>{" "}
            souhaite accéder à l'édition de cette newsletter.
          </p>
          <button
            onClick={handleDismiss}
            className="flex items-center justify-center rounded-full p-1 transition-opacity hover:opacity-70"
            style={{ color: "#F5B800" }}
            aria-label="Fermer"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </>
  );
}
