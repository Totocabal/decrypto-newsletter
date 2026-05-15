// ─────────────────────────────────────────────────────────────────────────────
// Pictogrammes pour les blocs encadré (callout)
// ─────────────────────────────────────────────────────────────────────────────

export const CALLOUT_PICTOS = [
  {
    id: "info",
    num: "01",
    label: "À noter",
    color: "#00FFFF",
    bgRgb: "0,255,255",
    svgInner: `<circle cx="12" cy="12" r="9"/><line x1="12" y1="10.5" x2="12" y2="17"/><circle cx="12" cy="7.5" r="0.6" fill="currentColor" stroke="none"/>`,
  },
  {
    id: "decode",
    num: "02",
    label: "On décrypte",
    color: "#00FFFF",
    bgRgb: "0,255,255",
    svgInner: `<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/><path d="M8 10.5h5"/>`,
  },
  {
    id: "insight",
    num: "03",
    label: "L'intuition",
    color: "#00FFFF",
    bgRgb: "0,255,255",
    svgInner: `<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.6V16h5.4v-.5c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3Z"/>`,
  },
  {
    id: "pin",
    num: "04",
    label: "L'épingle",
    color: "#00FFFF",
    bgRgb: "0,255,255",
    svgInner: `<path d="M15 4l5 5"/><path d="M16.5 5.5l-5.4 3a2 2 0 0 0-1 1.4l-.6 3.8 5.8 5.8 3.8-.6a2 2 0 0 0 1.4-1l3-5.4"/><line x1="9" y1="15" x2="4" y2="20"/>`,
  },
  {
    id: "warning",
    num: "05",
    label: "Prudence",
    color: "#FF4B28",
    bgRgb: "255,75,40",
    svgInner: `<path d="M12 4 3 19h18Z"/><line x1="12" y1="10.5" x2="12" y2="14.5"/><circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none"/>`,
  },
  {
    id: "signal",
    num: "06",
    label: "Signal faible",
    color: "#03FFCF",
    bgRgb: "3,255,207",
    svgInner: `<path d="M3 12h3l3-7 4 14 3-7h5"/>`,
  },
  {
    id: "context",
    num: "07",
    label: "Mise en contexte",
    color: "#00FFFF",
    bgRgb: "0,255,255",
    svgInner: `<polyline points="8 6 3 12 8 18"/><polyline points="16 6 21 12 16 18"/><line x1="13.5" y1="5" x2="10.5" y2="19"/>`,
  },
  {
    id: "read",
    num: "08",
    label: "Pour aller plus loin",
    color: "#00FFFF",
    bgRgb: "0,255,255",
    svgInner: `<path d="M3 5a2 2 0 0 1 2-2h5.5v15H5a2 2 0 0 0-2 2Z"/><path d="M21 5a2 2 0 0 0-2-2h-5.5v15H19a2 2 0 0 1 2 2Z"/>`,
  },
  {
    id: "timing",
    num: "09",
    label: "Le bon moment",
    color: "#00FFFF",
    bgRgb: "0,255,255",
    svgInner: `<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>`,
  },
  {
    id: "target",
    num: "10",
    label: "L'essentiel",
    color: "#FF00AA",
    bgRgb: "255,0,170",
    svgInner: `<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>`,
  },
  {
    id: "dollar",
    num: "11",
    label: "Marché US",
    color: "#03FFCF",
    bgRgb: "3,255,207",
    svgInner: `<line x1="12" y1="2.5" x2="12" y2="21.5"/><path d="M17 6.5H9.5a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6H6.5"/>`,
  },
  {
    id: "euro",
    num: "12",
    label: "Zone euro",
    color: "#00FFFF",
    bgRgb: "0,255,255",
    svgInner: `<path d="M19 6.3A8 8 0 1 0 19 17.7"/><line x1="4" y1="10.5" x2="13" y2="10.5"/><line x1="4" y1="13.5" x2="13" y2="13.5"/>`,
  },
  {
    id: "btc",
    num: "13",
    label: "Bitcoin",
    color: "#FF8B28",
    bgRgb: "255,139,40",
    svgInner: `<circle cx="12" cy="12" r="9"/><path d="M9 7v10"/><path d="M9 8.5h5a2 2 0 0 1 0 4H9"/><path d="M9 12.5h5.5a2 2 0 0 1 0 4H9"/><line x1="10.5" y1="5.5" x2="10.5" y2="7"/><line x1="10.5" y1="17" x2="10.5" y2="18.5"/><line x1="13" y1="5.5" x2="13" y2="7"/><line x1="13" y1="17" x2="13" y2="18.5"/>`,
  },
  {
    id: "eth",
    num: "14",
    label: "Ethereum",
    color: "#B36BFF",
    bgRgb: "135,1,255",
    svgInner: `<path d="M12 2.5 5.5 13 12 16.5 18.5 13 12 2.5Z"/><path d="M5.5 14.5 12 21.5 18.5 14.5"/><line x1="12" y1="2.5" x2="12" y2="16.5"/>`,
  },
  {
    id: "question",
    num: "15",
    label: "Vous nous demandez",
    color: "#00FFFF",
    bgRgb: "0,255,255",
    svgInner: `<circle cx="12" cy="12" r="9"/><path d="M9.3 9.2a2.8 2.8 0 0 1 5.4.8c0 1.7-2.7 2-2.7 4"/><circle cx="12" cy="17.5" r="0.6" fill="currentColor" stroke="none"/>`,
  },
];

export const CALLOUT_PICTOS_MAP = Object.fromEntries(CALLOUT_PICTOS.map((p) => [p.id, p]));
export const DEFAULT_PICTO_ID = "info";

export function buildPictoSvgHtml(svgInner, color, size = 16) {
  const inner = svgInner.replace(/currentColor/g, color);
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}
