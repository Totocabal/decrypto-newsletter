const STORAGE_BUCKET = "newsletter-previews";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function getSupabaseUrl() {
  return (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
}

function isSafePreviewPath(path) {
  return (
    typeof path === "string" &&
    path.endsWith(".html") &&
    !path.startsWith("/") &&
    !path.includes("..") &&
    /^[a-zA-Z0-9/_.,-]+$/.test(path)
  );
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildReviewPage({ html, path }) {
  const htmlJson = JSON.stringify(html).replace(/</g, "\\u003c");
  const pathJson = JSON.stringify(path).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Preview commentée</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0b0b0f;
      --panel: #1a1a22;
      --panel-2: #23232b;
      --line: rgba(255,255,255,0.12);
      --text: #f5f5f7;
      --muted: #a4a6b1;
      --faint: #777986;
      --pink: #ff00aa;
      --cyan: #03ffcf;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .layout {
      min-height: 100vh;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 380px;
    }
    .preview {
      min-width: 0;
      padding: 24px;
      overflow: auto;
    }
    .preview-frame {
      display: block;
      width: 100%;
      min-height: calc(100vh - 48px);
      border: 0;
      border-radius: 12px;
      background: #fff;
    }
    .comments {
      position: sticky;
      top: 0;
      height: 100vh;
      border-left: 1px solid var(--line);
      background: var(--panel);
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .comments-header {
      padding: 18px 18px 14px;
      border-bottom: 1px solid var(--line);
    }
    h1 {
      margin: 0;
      font-size: 15px;
      letter-spacing: 0.01em;
    }
    .subtitle {
      margin-top: 6px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }
    .comments-list {
      flex: 1;
      overflow: auto;
      padding: 14px;
    }
    .comment {
      border: 1px solid var(--line);
      background: var(--panel-2);
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 10px;
    }
    .comment-meta {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 7px;
      color: var(--faint);
      font-size: 11px;
    }
    .comment-author {
      color: var(--cyan);
      font-weight: 700;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .comment-body {
      margin: 0;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      font-size: 13px;
      line-height: 1.5;
      color: var(--text);
    }
    .empty {
      border: 1px dashed var(--line);
      border-radius: 12px;
      padding: 18px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.5;
      text-align: center;
    }
    .composer {
      border-top: 1px solid var(--line);
      padding: 14px;
      background: rgba(0,0,0,0.18);
    }
    label {
      display: block;
      margin: 0 0 6px;
      color: var(--muted);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    input, textarea {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--panel-2);
      color: var(--text);
      font: inherit;
      outline: none;
      padding: 10px 11px;
    }
    textarea {
      min-height: 92px;
      resize: vertical;
      line-height: 1.45;
    }
    input:focus, textarea:focus { border-color: rgba(255,0,170,0.7); }
    .field + .field { margin-top: 10px; }
    .actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-top: 12px;
    }
    .status {
      min-width: 0;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.35;
    }
    button {
      border: 0;
      border-radius: 999px;
      background: var(--pink);
      color: #fff;
      cursor: pointer;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.12em;
      padding: 10px 14px;
      text-transform: uppercase;
      white-space: nowrap;
    }
    button:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
    @media (max-width: 900px) {
      .layout {
        display: flex;
        flex-direction: column;
      }
      .preview {
        padding: 12px;
      }
      .preview-frame {
        min-height: 70vh;
      }
      .comments {
        position: relative;
        height: auto;
        min-height: 50vh;
        border-left: 0;
        border-top: 1px solid var(--line);
      }
    }
  </style>
</head>
<body>
  <main class="layout">
    <section class="preview" aria-label="Preview newsletter">
      <iframe id="preview-frame" class="preview-frame" title="Newsletter"></iframe>
    </section>
    <aside class="comments" aria-label="Commentaires">
      <div class="comments-header">
        <h1>Commentaires</h1>
        <div class="subtitle">Commentaires publics, visibles par toute personne disposant de ce lien de preview.</div>
      </div>
      <div id="comments-list" class="comments-list">
        <div class="empty">Chargement des commentaires...</div>
      </div>
      <form id="comment-form" class="composer">
        <div class="field">
          <label for="author-name">Nom</label>
          <input id="author-name" name="authorName" maxlength="80" autocomplete="name" placeholder="Votre nom" />
        </div>
        <div class="field">
          <label for="comment-body">Commentaire</label>
          <textarea id="comment-body" name="body" maxlength="2000" placeholder="Ajouter un commentaire..."></textarea>
        </div>
        <div class="actions">
          <div id="status" class="status"></div>
          <button id="submit-button" type="submit">Publier</button>
        </div>
      </form>
    </aside>
  </main>
  <script>
    const PREVIEW_HTML = ${htmlJson};
    const PREVIEW_PATH = ${pathJson};
    const commentsList = document.getElementById("comments-list");
    const form = document.getElementById("comment-form");
    const statusEl = document.getElementById("status");
    const submitButton = document.getElementById("submit-button");
    const authorInput = document.getElementById("author-name");
    const bodyInput = document.getElementById("comment-body");

    document.getElementById("preview-frame").srcdoc = PREVIEW_HTML;
    authorInput.value = localStorage.getItem("decrypto-preview-comment-author") || "";

    function setStatus(message, isError = false) {
      statusEl.textContent = message || "";
      statusEl.style.color = isError ? "#ff8466" : "var(--muted)";
    }

    function formatDate(value) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "";
      return date.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    }

    function escapeText(value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function renderComments(comments) {
      if (!comments.length) {
        commentsList.innerHTML = '<div class="empty">Aucun commentaire pour le moment. Soyez le premier à annoter cette preview.</div>';
        return;
      }
      commentsList.innerHTML = comments.map((comment) => \`
        <article class="comment">
          <div class="comment-meta">
            <span class="comment-author">\${escapeText(comment.author_name || "Anonyme")}</span>
            <span>\${escapeText(formatDate(comment.created_at))}</span>
          </div>
          <p class="comment-body">\${escapeText(comment.body || "")}</p>
        </article>
      \`).join("");
      commentsList.scrollTop = commentsList.scrollHeight;
    }

    async function loadComments() {
      const response = await fetch("/api/preview-comments?path=" + encodeURIComponent(PREVIEW_PATH));
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Chargement impossible");
      renderComments(payload.comments || []);
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const authorName = authorInput.value.trim() || "Anonyme";
      const body = bodyInput.value.trim();
      if (!body) {
        setStatus("Ajoutez un commentaire.", true);
        return;
      }
      submitButton.disabled = true;
      setStatus("Publication...");
      try {
        localStorage.setItem("decrypto-preview-comment-author", authorName);
        const response = await fetch("/api/preview-comments?path=" + encodeURIComponent(PREVIEW_PATH), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authorName, body }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Publication impossible");
        bodyInput.value = "";
        setStatus("Commentaire publié.");
        await loadComments();
      } catch (error) {
        setStatus(error.message || "Publication impossible", true);
      } finally {
        submitButton.disabled = false;
      }
    });

    loadComments().catch((error) => {
      commentsList.innerHTML = '<div class="empty">' + escapeText(error.message || "Commentaires indisponibles") + '</div>';
    });
  </script>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { error: "Méthode non autorisée" });
  }

  const path = String(req.query.path || "");
  if (!isSafePreviewPath(path)) {
    return json(res, 400, { error: "Chemin de preview invalide" });
  }

  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) {
    return json(res, 500, { error: "SUPABASE_URL manquant" });
  }

  const storageUrl = `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
  const response = await fetch(storageUrl);

  if (!response.ok) {
    return json(res, response.status, { error: "Preview introuvable" });
  }

  const html = await response.text();
  const page = buildReviewPage({ html, path });
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(page);
}
