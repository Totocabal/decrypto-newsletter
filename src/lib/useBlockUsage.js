import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";

// Nombre d'utilisations de chaque type de bloc sur toutes les newsletters actives
// (fonction Supabase block_usage). Chargé une fois par session ; sans la fonction,
// le sélecteur garde son ordre d'origine.
let cache = null;
let inflight = null;
const listeners = new Set();

async function fetchUsage() {
  const { data, error } = await supabase.rpc("block_usage");
  if (error || !Array.isArray(data)) return {};
  return Object.fromEntries(
    data.map((row) => [row.type, { uses: Number(row.uses) || 0, newsletters: Number(row.newsletters) || 0 }]),
  );
}

export function useBlockUsage() {
  const [usage, setUsage] = useState(cache || {});

  useEffect(() => {
    listeners.add(setUsage);
    if (!cache) {
      inflight ||= fetchUsage()
        .then((result) => {
          cache = result;
          listeners.forEach((fn) => fn(result));
        })
        .finally(() => { inflight = null; });
    } else {
      setUsage(cache);
    }
    return () => { listeners.delete(setUsage); };
  }, []);

  return usage;
}
