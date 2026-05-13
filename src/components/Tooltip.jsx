export function Tooltip({ label, children, side = "top", align = "center", className = "" }) {
  if (!label) return children;

  const sideClass =
    side === "bottom"
      ? "top-[calc(100%+10px)]"
      : "bottom-[calc(100%+10px)]";
  const alignClass =
    align === "left"
      ? "left-0"
      : align === "right"
        ? "right-0"
        : "left-1/2 -translate-x-1/2";

  return (
    <span className={`relative inline-flex group/tooltip ${className}`}>
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute ${sideClass} ${alignClass} z-50 max-w-72 rounded-xl border border-line2 px-3 py-2 text-left text-[11px] font-medium normal-case leading-relaxed tracking-normal text-d-fg2 opacity-0 shadow-2xl transition-all duration-150 ${
          side === "bottom" ? "translate-y-1" : "-translate-y-1"
        } group-hover/tooltip:translate-y-0 group-hover/tooltip:opacity-100 group-focus-within/tooltip:translate-y-0 group-focus-within/tooltip:opacity-100`}
        style={{ background: "#2E2E34" }}
      >
        {label}
      </span>
    </span>
  );
}
