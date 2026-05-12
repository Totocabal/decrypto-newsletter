import { useState, useCallback } from "react";

const CRYPTO_CONFIG = {
  bitcoin: { label: "BTC / EUR", symbol: "BTC" },
  ethereum: { label: "ETH / EUR", symbol: "ETH" },
};

const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function formatPrice(price) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: price >= 1000 ? 0 : 2,
  }).format(price);
}

function normalizePrices(prices) {
  const values = prices.map((p) => p[1]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 50);
  return values.map((v) => +((((v - min) / (max - min)) * 100).toFixed(1)));
}

export function useCoinGecko() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch7d = useCallback(async (cryptoId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/${cryptoId}/market_chart?vs_currency=eur&days=7&interval=daily`
      );
      if (!res.ok) throw new Error(`CoinGecko error ${res.status}`);
      const json = await res.json();

      // L'API renvoie 8 entrées (j-7 à aujourd'hui), on garde les 7 dernières
      const prices = json.prices.slice(-7);

      const points = normalizePrices(prices);
      const x_labels = prices.map(([ts]) => {
        const d = new Date(ts);
        return DAY_LABELS[d.getDay()];
      });

      const currentPrice = prices[prices.length - 1][1];
      const firstPrice = prices[0][1];
      const diffEur = currentPrice - firstPrice;
      const diffPct = (diffEur / firstPrice) * 100;
      const isPositive = diffPct >= 0;

      const cfg = CRYPTO_CONFIG[cryptoId] ?? CRYPTO_CONFIG.bitcoin;

      return {
        label: cfg.label,
        value: formatPrice(currentPrice),
        delta: `${isPositive ? "▲" : "▼"} ${isPositive ? "+" : ""}${diffPct.toFixed(2)} %`,
        delta_tone: isPositive ? "positive" : "negative",
        subdelta: `${isPositive ? "+" : ""}${formatPrice(diffEur)} sur 7j`,
        points,
        x_labels,
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
