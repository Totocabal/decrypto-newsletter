import { useState, useCallback } from "react";

export const CRYPTO_CONFIG = {
  bitcoin:                   { name: "Bitcoin",               symbol: "BTC"    },
  ethereum:                  { name: "Ethereum",              symbol: "ETH"    },
  "usd-coin":                { name: "USDC",                  symbol: "USDC"   },
  solana:                    { name: "Solana",                symbol: "SOL"    },
  ripple:                    { name: "Ripple",                symbol: "XRP"    },
  dogecoin:                  { name: "Dogecoin",              symbol: "DOGE"   },
  cardano:                   { name: "Cardano",               symbol: "ADA"    },
  "avalanche-2":             { name: "Avalanche",             symbol: "AVAX"   },
  "the-open-network":        { name: "Toncoin",               symbol: "TON"    },
  chainlink:                 { name: "Chainlink",             symbol: "LINK"   },
  polkadot:                  { name: "Polkadot",              symbol: "DOT"    },
  litecoin:                  { name: "Litecoin",              symbol: "LTC"    },
  "bitcoin-cash":            { name: "Bitcoin Cash",          symbol: "BCH"    },
  "shiba-inu":               { name: "Shiba Inu",             symbol: "SHIB"   },
  uniswap:                   { name: "Uniswap",               symbol: "UNI"    },
  stellar:                   { name: "Stellar Lumens",        symbol: "XLM"    },
  aave:                      { name: "Aave",                  symbol: "AAVE"   },
  tezos:                     { name: "Tezos",                 symbol: "XTZ"    },
  cosmos:                    { name: "Cosmos",                symbol: "ATOM"   },
  filecoin:                  { name: "Filecoin",              symbol: "FIL"    },
  arbitrum:                  { name: "Arbitrum",              symbol: "ARB"    },
  optimism:                  { name: "Optimism",              symbol: "OP"     },
  pepe:                      { name: "Pepe",                  symbol: "PEPE"   },
  hyperliquid:               { name: "Hyperliquid",           symbol: "HYPE"   },
  bittensor:                 { name: "Bittensor",             symbol: "TAO"    },
  "injective-protocol":      { name: "Injective",             symbol: "INJ"    },
  sui:                       { name: "Sui",                   symbol: "SUI"    },
  aptos:                     { name: "Aptos",                 symbol: "APT"    },
  "render-token":            { name: "Render",                symbol: "RENDER" },
  "fetch-ai":                { name: "Fetch.ai",              symbol: "FET"    },
  near:                      { name: "Near Protocol",         symbol: "NEAR"   },
  kaspa:                     { name: "Kaspa",                 symbol: "KAS"    },
  "matic-network":           { name: "Polygon",               symbol: "POL"    },
  "lido-dao":                { name: "Lido DAO",              symbol: "LDO"    },
  raydium:                   { name: "Raydium",               symbol: "RAY"    },
  "elrond-erd-2":            { name: "MultiversX",            symbol: "EGLD"   },
  bonk:                      { name: "Bonk",                  symbol: "BONK"   },
  dogwifcoin:                { name: "Dogwifhat",             symbol: "WIF"    },
  "axie-infinity":           { name: "Axie Infinity",         symbol: "AXS"    },
  floki:                     { name: "Floki",                 symbol: "FLOKI"  },
  "the-graph":               { name: "The Graph",             symbol: "GRT"    },
  arweave:                   { name: "Arweave",               symbol: "AR"     },
  "jupiter-exchange-solana": { name: "Jupiter",               symbol: "JUP"    },
  starknet:                  { name: "Starknet",              symbol: "STRK"   },
  gnosis:                    { name: "Gnosis",                symbol: "GNO"    },
  gmx:                       { name: "GMX",                   symbol: "GMX"    },
  "curve-dao-token":         { name: "Curve DAO",             symbol: "CRV"    },
  dydx:                      { name: "dYdX",                  symbol: "DYDX"   },
  havven:                    { name: "Synthetix",             symbol: "SNX"    },
  decentraland:              { name: "Decentraland",          symbol: "MANA"   },
  algorand:                  { name: "Algorand",              symbol: "ALGO"   },
  apecoin:                   { name: "ApeCoin",               symbol: "APE"    },
  gala:                      { name: "Gala",                  symbol: "GALA"   },
  "the-sandbox":             { name: "Sandbox",               symbol: "SAND"   },
  loopring:                  { name: "Loopring",              symbol: "LRC"    },
  "sonic-3":                 { name: "Sonic",                 symbol: "S"      },
  "pyth-network":            { name: "Pyth Network",          symbol: "PYTH"   },
  "ondo-finance":            { name: "Ondo",                  symbol: "ONDO"   },
  sky:                       { name: "Sky",                   symbol: "SKY"    },
  "basic-attention-token":   { name: "Basic Attention Token", symbol: "BAT"    },
  sushi:                     { name: "SushiSwap",             symbol: "SUSHI"  },
  "ethereum-name-service":   { name: "Ethereum Name Service", symbol: "ENS"    },
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

      // Step "agréable" multiple de 100 donnant 3–6 ticks dans la plage
      const range = maxPrice - minPrice;
      const rawStep = range / 4;
      const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
      let step = rawStep >= 5 * mag ? 5 * mag : rawStep >= 2 * mag ? 2 * mag : mag;
      step = Math.max(100, Math.ceil(step / 100) * 100);

      const tickMin = Math.ceil(minPrice / step) * step;
      const tickMax = Math.floor(maxPrice / step) * step;
      let rawTicks = [];
      for (let t = tickMin; t <= tickMax + 0.01; t += step) rawTicks.push(Math.round(t));

      // Supprimer le tick le plus bas/haut s'il correspond au start ou au end
      rawTicks = rawTicks.filter((t, i) => {
        const isExtreme = i === 0 || i === rawTicks.length - 1;
        if (!isExtreme) return true;
        return Math.abs(t - firstPrice) > 0.5 && Math.abs(t - currentPrice) > 0.5;
      });

      // Stocker label formaté + position normalisée (0=min, 100=max → SVG y inversé)
      const y_axis_ticks = rawTicks.map((t) => ({
        label: formatPrice(t, currency),
        pos: ((t - minPrice) / (maxPrice - minPrice)) * 100,
      }));

      return {
        label: `${cfg.symbol} / ${currency.toUpperCase()}`,
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
        y_axis_ticks,
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
