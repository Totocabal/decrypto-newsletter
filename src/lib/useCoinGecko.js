import { useState, useCallback } from "react";

const CRYPTO_CONFIG = {
  bitcoin:  { eur: "BTC / EUR", usd: "BTC / USD", symbol: "BTC" },
  ethereum: { eur: "ETH / EUR", usd: "ETH / USD", symbol: "ETH" },
};

const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function formatPrice(price, currency) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: price >= 1000 ? 0 : 2,
  }).format(price);
}

function normalizePrices(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 50);
  return values.map((v) => +((((v - min) / (max - min)) * 100).toFixed(1)));
}

// Garde une entrée par jour calendaire (UTC), prend la dernière entrée du jour.
// Évite les doublons quand l'API renvoie le prix courant en plus des clôtures.
function deduplicateByDay(prices) {
  const byDay = new Map();
  for (const [ts, price] of prices) {
    const d = new Date(ts);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth()).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    byDay.set(key, [ts, price]);
  }
  return [...byDay.values()];
}

export function useCoinGecko() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch7d = useCallback(async (cryptoId, currency = "eur", days = 7) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/${cryptoId}/market_chart?vs_currency=${currency}&days=${days}&interval=daily`
      );
      if (!res.ok) throw new Error(`CoinGecko error ${res.status}`);
      const json = await res.json();

      const prices = deduplicateByDay(json.prices).slice(-days);

      const rawValues = prices.map(([, price]) => price);
      const points = normalizePrices(rawValues);
      const n = prices.length;

      // Pour 7j : noms de jours. Pour 30j : dates DD/MM aux positions clés uniquement.
      let x_labels;
      if (days <= 7) {
        x_labels = prices.map(([ts]) => DAY_LABELS[new Date(ts).getDay()]);
      } else {
        const keyPositions = new Set([0, Math.floor(n / 4), Math.floor(n / 2), Math.floor((3 * n) / 4), n - 1]);
        x_labels = prices.map(([ts], i) =>
          keyPositions.has(i)
            ? new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
            : ""
        );
      }

      const raw_prices = prices.map(([ts, price]) => ({
        label: new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
        price: formatPrice(price, currency),
      }));

      const currentPrice = rawValues[rawValues.length - 1];
      const firstPrice = rawValues[0];
      const diff = currentPrice - firstPrice;
      const diffPct = (diff / firstPrice) * 100;
      const isPositive = diffPct >= 0;

      const cfg = CRYPTO_CONFIG[cryptoId] ?? CRYPTO_CONFIG.bitcoin;

      const minPrice = Math.min(...rawValues);
      const maxPrice = Math.max(...rawValues);
      // 3 labels Y aux niveaux 75 %, 50 %, 25 % de la plage (haut → bas dans le SVG)
      const y_axis_labels = [0.75, 0.5, 0.25].map(
        (frac) => formatPrice(minPrice + frac * (maxPrice - minPrice), currency)
      );

      return {
        label: cfg[currency] ?? cfg.eur,
        value: formatPrice(currentPrice, currency),
        price_start: formatPrice(firstPrice, currency),
        price_high: formatPrice(maxPrice, currency),
        price_low: formatPrice(minPrice, currency),
        delta: `${isPositive ? "▲" : "▼"} ${isPositive ? "+" : ""}${diffPct.toFixed(2)} %`,
        delta_tone: isPositive ? "positive" : "negative",
        subdelta: `${isPositive ? "+" : ""}${formatPrice(diff, currency)} sur ${days}j`,
        points,
        x_labels,
        raw_prices,
        y_axis_labels,
      };
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetch7d, loading, error };
}
