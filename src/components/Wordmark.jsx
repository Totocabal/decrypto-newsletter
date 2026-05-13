// Wordmark "Decrypto Builder" avec icône hexagonale — basé sur le design system Decrypto

function HexIcon({ size = 28, fill = "#FFFFFF" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <path
        d="M32 2 L58 16 L58 48 L32 62 L6 48 L6 16 Z M22 18 L22 30 L32 36 L42 30 L42 18 L36 18 L36 26.5 L32 28.8 L28 26.5 L28 18 Z M22 46 L22 34 L32 28 L42 34 L42 46 L36 46 L36 37.5 L32 35.2 L28 37.5 L28 46 Z"
        fill={fill}
        fillRule="evenodd"
      />
    </svg>
  );
}

export function Wordmark({ size = 18 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <HexIcon size={size + 8} fill="#FFFFFF" />
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 6,
          fontFamily: "'Sora', sans-serif",
          fontWeight: 700,
          fontSize: size,
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        <span style={{ color: "#FFFFFF" }}>Decrypto</span>
        <span
          style={{
            background:
              "linear-gradient(90deg, #00FFFF 0%, #4141FF 35%, #FF00AA 65%, #FF4B28 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Builder
        </span>
      </div>
    </div>
  );
}
