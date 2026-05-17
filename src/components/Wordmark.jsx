export function Wordmark({ size = 18 }) {
  return (
    <div
      style={{
        fontFamily: "'Sora', sans-serif",
        fontWeight: 700,
        fontSize: size,
        letterSpacing: "-0.02em",
        lineHeight: 1,
        display: "flex",
        alignItems: "baseline",
        gap: 0,
      }}
    >
      <span style={{ color: "#FFFFFF" }}>decrypto</span>
      <span
        style={{
          background:
            "linear-gradient(90deg, #00FFFF 0%, #4141FF 35%, #FF00AA 65%, #FF4B28 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          color: "transparent",
        }}
      >
        builder
      </span>
    </div>
  );
}
