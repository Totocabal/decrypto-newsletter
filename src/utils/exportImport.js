// ─────────────────────────────────────────────────────────────────────────────
// Export et import — fichiers JSON (brouillon) et HTML (rendu final)
// ─────────────────────────────────────────────────────────────────────────────

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Exporte l'état complet en JSON pour archivage / partage
export function exportStateAsJson(state, filename = "newsletter-draft.json") {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  downloadBlob(blob, filename);
}

// Importe un fichier JSON et appelle le callback avec l'objet parsé
export function importStateFromJson(file, onSuccess, onError) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("Format invalide");
      }
      onSuccess(parsed);
    } catch (err) {
      if (onError) onError(err);
      else console.error("Import JSON failed:", err);
    }
  };
  reader.readAsText(file);
}

// Télécharge un HTML email
export function downloadHtmlEmail(html, filename = "newsletter.html") {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  downloadBlob(blob, filename);
}

// Copie le HTML dans le presse-papiers
export async function copyHtmlToClipboard(html) {
  try {
    await navigator.clipboard.writeText(html);
    return true;
  } catch {
    return false;
  }
}
