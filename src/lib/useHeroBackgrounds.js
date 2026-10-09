import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase.js";
import { HERO_BACKGROUNDS } from "./heroRenderer.js";
import { HERO_BACKGROUNDS_FOLDER, deleteImage, uploadImage } from "./imageUpload.js";

// Fonds ajoutés depuis l'admin (table hero_backgrounds), partagés entre le créateur de hero
// et l'onglet admin. Tant que la table n'existe pas, seuls les fonds intégrés sont proposés.
let cache = [];
let loaded = false;
let inflight = null;
const listeners = new Set();

function publish(rows) {
  cache = rows;
  loaded = true;
  listeners.forEach((fn) => fn(rows));
}

function toBackground(row) {
  return {
    id: `custom-${row.id}`,
    dbId: row.id,
    label: row.label,
    url: row.url,
    path: row.path,
    inset: 0,
    textColor: row.text_color === "light" ? "light" : "dark",
    custom: true,
  };
}

async function fetchCustomBackgrounds() {
  const { data, error } = await supabase
    .from("hero_backgrounds")
    .select("id, label, url, path, text_color, sort_order, created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return cache;
  return (data || []).map(toBackground);
}

export async function refreshHeroBackgrounds() {
  publish(await fetchCustomBackgrounds());
}

export function useHeroBackgrounds() {
  const [custom, setCustom] = useState(cache);

  useEffect(() => {
    listeners.add(setCustom);
    if (!loaded) {
      inflight ||= fetchCustomBackgrounds().then(publish).finally(() => { inflight = null; });
    } else {
      setCustom(cache);
    }
    return () => { listeners.delete(setCustom); };
  }, []);

  return { builtIn: HERO_BACKGROUNDS, custom, backgrounds: [...HERO_BACKGROUNDS, ...custom] };
}

export async function addHeroBackground({ file, label, textColor, userId }) {
  const uploaded = await uploadImage(file, userId, { folder: HERO_BACKGROUNDS_FOLDER });
  const { error } = await supabase.from("hero_backgrounds").insert({
    label: label.trim(),
    url: uploaded.url,
    path: uploaded.path,
    text_color: textColor === "light" ? "light" : "dark",
    sort_order: cache.length,
    created_by: userId,
  });
  if (error) {
    await deleteImage(uploaded.path);
    throw new Error(error.message);
  }
  await refreshHeroBackgrounds();
}

export async function updateHeroBackground(background, { label, textColor }) {
  const { error } = await supabase
    .from("hero_backgrounds")
    .update({ label: label.trim(), text_color: textColor === "light" ? "light" : "dark" })
    .eq("id", background.dbId);
  if (error) throw new Error(error.message);
  await refreshHeroBackgrounds();
}

export async function deleteHeroBackground(background) {
  const { error } = await supabase.from("hero_backgrounds").delete().eq("id", background.dbId);
  if (error) throw new Error(error.message);
  await deleteImage(background.path);
  await refreshHeroBackgrounds();
}
