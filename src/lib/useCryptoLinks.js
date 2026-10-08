import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase.js";
import { CRYPTO_LINKS as DEFAULT_CRYPTO_LINKS } from "../config/cryptoLinks.js";

// Cache partagé : la liste est chargée une fois puis réutilisée par tous les sélecteurs de CTA.
// Tant que la table n'est pas disponible, la liste par défaut du code sert de repli.
let cache = null;
let inflight = null;
const listeners = new Set();

function publish(rows) {
  cache = rows;
  listeners.forEach((fn) => fn(rows));
}

async function fetchLinks() {
  const { data, error } = await supabase.from("crypto_links").select("symbol, url").order("symbol");
  if (error || !data?.length) return cache || DEFAULT_CRYPTO_LINKS;
  return data;
}

export function useCryptoLinks() {
  const [links, setLinks] = useState(cache || DEFAULT_CRYPTO_LINKS);

  useEffect(() => {
    listeners.add(setLinks);
    if (!cache) {
      inflight ||= fetchLinks().then(publish).finally(() => { inflight = null; });
    } else {
      setLinks(cache);
    }
    return () => { listeners.delete(setLinks); };
  }, []);

  const reload = useCallback(async () => publish(await fetchLinks()), []);
  return { links, reload };
}

export async function saveCryptoLink({ symbol, url, userId }) {
  const { error } = await supabase
    .from("crypto_links")
    .upsert({ symbol: symbol.trim().toUpperCase(), url: url.trim(), updated_by: userId }, { onConflict: "symbol" });
  if (error) throw error;
}

export async function deleteCryptoLink(symbol) {
  const { error } = await supabase.from("crypto_links").delete().eq("symbol", symbol);
  if (error) throw error;
}

export async function refreshCryptoLinks() {
  publish(await fetchLinks());
}
