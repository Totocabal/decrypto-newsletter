// Trie les entrées [type, definition] du plus au moins utilisé ; à égalité (ou sans
// statistiques) l'ordre d'origine est conservé.
export function sortByUsage(entries, usage = {}) {
  return entries
    .map((entry, index) => ({ entry, index, uses: usage[entry[0]]?.uses || 0 }))
    .sort((a, b) => b.uses - a.uses || a.index - b.index)
    .map(({ entry }) => entry);
}
