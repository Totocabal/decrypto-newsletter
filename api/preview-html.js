const STORAGE_BUCKET = "newsletter-previews";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function getSupabaseUrl() {
  return (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
}

function getSupabaseAnonKey() {
  return process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
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

function cleanInlineText(value, maxLength) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function cleanMultilineText(value, maxLength) {
  return String(value || "").replace(/\r\n/g, "\n").trim().slice(0, maxLength);
}

function normalizeArea(value) {
  if (!value || typeof value !== "object") return null;
  const area = {
    x: Number(value.x),
    y: Number(value.y),
    width: Number(value.width),
    height: Number(value.height),
  };
  const isValid = Object.values(area).every(Number.isFinite) &&
    area.x >= 0 &&
    area.y >= 0 &&
    area.width > 0 &&
    area.height > 0 &&
    area.x + area.width <= 100 &&
    area.y + area.height <= 100;
  if (!isValid) return null;
  return Object.fromEntries(
    Object.entries(area).map(([key, number]) => [key, Math.round(number * 100) / 100])
  );
}

async function supabaseRest(path, options = {}) {
  const supabaseUrl = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!supabaseUrl || !anonKey) {
    throw new Error("Configuration Supabase serveur manquante.");
  }

  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      ...(options.headers || {}),
    },
  });
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function handleComments(req, res, previewPath) {
  if (req.method === "GET") {
    const query = new URLSearchParams({
      select: "id,author_name,body,area,created_at",
      preview_path: `eq.${previewPath}`,
      order: "created_at.asc",
    });
    const response = await supabaseRest(`preview_comments?${query.toString()}`);
    const payload = await response.json().catch(() => []);
    if (!response.ok) {
      return json(res, response.status, { error: payload?.message || "Commentaires indisponibles" });
    }
    return json(res, 200, { comments: payload });
  }

  if (req.method === "POST") {
    const body = await readJsonBody(req);
    const authorName = cleanInlineText(body.authorName || "Anonyme", 80) || "Anonyme";
    const commentBody = cleanMultilineText(body.body, 2000);
    const area = normalizeArea(body.area);
    if (!commentBody) {
      return json(res, 400, { error: "Commentaire vide" });
    }

    const response = await supabaseRest("preview_comments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        preview_path: previewPath,
        author_name: authorName,
        body: commentBody,
        area,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return json(res, response.status, { error: payload?.message || "Commentaire impossible" });
    }
    return json(res, 201, { comment: Array.isArray(payload) ? payload[0] : payload });
  }

  res.setHeader("Allow", "GET, POST");
  return json(res, 405, { error: "Méthode non autorisée" });
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
    .preview-shell {
      position: relative;
      min-height: calc(100vh - 48px);
    }
    .preview-frame {
      display: block;
      width: 100%;
      min-height: calc(100vh - 48px);
      border: 0;
      border-radius: 12px;
      background: #fff;
    }
    .area-layer {
      position: absolute;
      inset: 0;
      border-radius: 12px;
      pointer-events: none;
      overflow: hidden;
    }
    .area-layer.selecting {
      cursor: crosshair;
      pointer-events: auto;
      background: rgba(3,255,207,0.03);
    }
    .area-box {
      position: absolute;
      border: 2px solid var(--pink);
      background: rgba(255,0,170,0.10);
      border-radius: 8px;
      box-shadow: 0 0 0 9999px rgba(0,0,0,0.02);
      pointer-events: auto;
    }
    .area-box.pending {
      border-color: var(--cyan);
      background: rgba(3,255,207,0.10);
    }
    .area-box.highlight {
      border-color: var(--cyan);
      background: rgba(3,255,207,0.16);
      box-shadow: 0 0 0 3px rgba(3,255,207,0.22);
    }
    .area-badge {
      position: absolute;
      top: -10px;
      left: -10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 22px;
      height: 22px;
      padding: 0 6px;
      border-radius: 999px;
      background: var(--pink);
      color: #fff;
      font-size: 11px;
      font-weight: 900;
      line-height: 1;
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
    .comment.has-area {
      cursor: pointer;
    }
    .comment.is-active {
      border-color: rgba(3,255,207,0.7);
      box-shadow: 0 0 0 2px rgba(3,255,207,0.12);
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
    .area-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 9px;
      border: 1px solid rgba(255,0,170,0.32);
      border-radius: 999px;
      padding: 5px 8px;
      color: #ffd5f0;
      font-size: 11px;
      font-weight: 700;
      background: rgba(255,0,170,0.10);
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
    .secondary-button {
      border: 1px solid var(--line);
      background: transparent;
      color: var(--text);
    }
    .secondary-button.active {
      border-color: rgba(3,255,207,0.6);
      color: var(--cyan);
      background: rgba(3,255,207,0.08);
    }
    .area-summary {
      display: none;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-top: 10px;
      border: 1px solid rgba(3,255,207,0.28);
      border-radius: 10px;
      padding: 9px 10px;
      color: #d9fff7;
      background: rgba(3,255,207,0.08);
      font-size: 12px;
      line-height: 1.35;
    }
    .area-summary.visible { display: flex; }
    .area-summary button {
      padding: 0;
      background: transparent;
      color: var(--cyan);
      font-size: 12px;
      letter-spacing: 0;
      text-transform: none;
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
      <div id="preview-shell" class="preview-shell">
        <iframe id="preview-frame" class="preview-frame" title="Newsletter"></iframe>
        <div id="area-layer" class="area-layer" aria-label="Zones commentées"></div>
      </div>
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
        <button id="select-area-button" class="secondary-button" type="button">Sélectionner une zone</button>
        <div id="area-summary" class="area-summary">
          <span>Zone liée au commentaire.</span>
          <button id="clear-area-button" type="button">Retirer</button>
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
    const previewFrame = document.getElementById("preview-frame");
    const previewShell = document.getElementById("preview-shell");
    const areaLayer = document.getElementById("area-layer");
    const selectAreaButton = document.getElementById("select-area-button");
    const clearAreaButton = document.getElementById("clear-area-button");
    const areaSummary = document.getElementById("area-summary");
    let commentsCache = [];
    let selectedArea = null;
    let activeAreaId = null;
    let selectingArea = false;
    let dragStart = null;
    let draftAreaEl = null;

    previewFrame.srcdoc = PREVIEW_HTML;
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

    function resizeFrameToContent() {
      try {
        const doc = previewFrame.contentDocument;
        if (!doc) return;
        const height = Math.max(
          doc.documentElement.scrollHeight,
          doc.body ? doc.body.scrollHeight : 0,
          window.innerHeight - 48
        );
        previewFrame.style.height = height + "px";
        previewShell.style.minHeight = height + "px";
      } catch {
        // srcdoc is same-origin, but keep the preview usable if browser blocks measurement.
      }
    }

    previewFrame.addEventListener("load", () => {
      resizeFrameToContent();
      renderAreas();
    });
    window.addEventListener("resize", () => {
      resizeFrameToContent();
      renderAreas();
    });

    function areaStyle(area) {
      return "left:" + area.x + "%;top:" + area.y + "%;width:" + area.width + "%;height:" + area.height + "%;";
    }

    function setSelectedArea(area) {
      selectedArea = area;
      areaSummary.classList.toggle("visible", Boolean(area));
      renderAreas();
    }

    function setSelectingArea(next) {
      selectingArea = next;
      selectAreaButton.classList.toggle("active", next);
      selectAreaButton.textContent = next ? "Tracez la zone" : "Sélectionner une zone";
      areaLayer.classList.toggle("selecting", next);
      if (next) setStatus("Tracez une zone sur la preview.");
    }

    function renderAreas() {
      const annotated = commentsCache
        .map((comment, index) => ({ comment, index }))
        .filter(({ comment }) => comment.area);
      const existingMarkup = annotated.map(({ comment, index }) => \`
        <button
          type="button"
          class="area-box \${activeAreaId === comment.id ? "highlight" : ""}"
          style="\${areaStyle(comment.area)}"
          data-comment-id="\${escapeText(comment.id)}"
          aria-label="Zone du commentaire \${index + 1}"
        >
          <span class="area-badge">\${index + 1}</span>
        </button>
      \`).join("");
      const pendingMarkup = selectedArea
        ? '<div class="area-box pending" style="' + areaStyle(selectedArea) + '"><span class="area-badge">+</span></div>'
        : "";
      areaLayer.innerHTML = existingMarkup + pendingMarkup;
      areaLayer.querySelectorAll("[data-comment-id]").forEach((button) => {
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          focusComment(button.dataset.commentId);
        });
      });
    }

    function focusComment(commentId) {
      activeAreaId = commentId;
      renderAreas();
      commentsList.querySelectorAll(".comment").forEach((el) => {
        el.classList.toggle("is-active", el.dataset.commentId === commentId);
      });
      const commentEl = commentsList.querySelector('[data-comment-id="' + CSS.escape(commentId) + '"]');
      commentEl?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function pointToAreaPercent(event) {
      const rect = areaLayer.getBoundingClientRect();
      const x = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
      const y = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));
      return { x, y };
    }

    function areaFromPoints(a, b) {
      const x = Math.min(a.x, b.x);
      const y = Math.min(a.y, b.y);
      return {
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
        width: Math.round(Math.abs(a.x - b.x) * 100) / 100,
        height: Math.round(Math.abs(a.y - b.y) * 100) / 100,
      };
    }

    areaLayer.addEventListener("pointerdown", (event) => {
      if (!selectingArea) return;
      event.preventDefault();
      dragStart = pointToAreaPercent(event);
      draftAreaEl = document.createElement("div");
      draftAreaEl.className = "area-box pending";
      areaLayer.appendChild(draftAreaEl);
      areaLayer.setPointerCapture(event.pointerId);
    });

    areaLayer.addEventListener("pointermove", (event) => {
      if (!selectingArea || !dragStart || !draftAreaEl) return;
      const area = areaFromPoints(dragStart, pointToAreaPercent(event));
      draftAreaEl.style.cssText = areaStyle(area);
    });

    areaLayer.addEventListener("pointerup", (event) => {
      if (!selectingArea || !dragStart) return;
      const area = areaFromPoints(dragStart, pointToAreaPercent(event));
      dragStart = null;
      draftAreaEl = null;
      setSelectingArea(false);
      if (area.width < 1 || area.height < 1) {
        setStatus("Zone trop petite, recommencez.", true);
        renderAreas();
        return;
      }
      setSelectedArea(area);
      setStatus("Zone prête à être liée au commentaire.");
    });

    selectAreaButton.addEventListener("click", () => setSelectingArea(!selectingArea));
    clearAreaButton.addEventListener("click", () => {
      setSelectedArea(null);
      setStatus("Zone retirée.");
    });

    function renderComments(comments) {
      commentsCache = comments;
      renderAreas();
      if (!comments.length) {
        commentsList.innerHTML = '<div class="empty">Aucun commentaire pour le moment. Soyez le premier à annoter cette preview.</div>';
        return;
      }
      commentsList.innerHTML = comments.map((comment) => \`
        <article class="comment \${comment.area ? "has-area" : ""} \${activeAreaId === comment.id ? "is-active" : ""}" data-comment-id="\${escapeText(comment.id)}">
          <div class="comment-meta">
            <span class="comment-author">\${escapeText(comment.author_name || "Anonyme")}</span>
            <span>\${escapeText(formatDate(comment.created_at))}</span>
          </div>
          <p class="comment-body">\${escapeText(comment.body || "")}</p>
          \${comment.area ? '<span class="area-link">Zone liée #' + (comments.indexOf(comment) + 1) + '</span>' : ""}
        </article>
      \`).join("");
      commentsList.querySelectorAll(".comment.has-area").forEach((item) => {
        item.addEventListener("click", () => focusComment(item.dataset.commentId));
      });
      commentsList.scrollTop = commentsList.scrollHeight;
    }

    async function loadComments() {
      const response = await fetch("/api/preview-html?comments=1&path=" + encodeURIComponent(PREVIEW_PATH));
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
        const response = await fetch("/api/preview-html?comments=1&path=" + encodeURIComponent(PREVIEW_PATH), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authorName, body, area: selectedArea }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Publication impossible");
        bodyInput.value = "";
        setSelectedArea(null);
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
  const path = String(req.query.path || "");
  if (!isSafePreviewPath(path)) {
    return json(res, 400, { error: "Chemin de preview invalide" });
  }

  if (req.query.comments === "1") {
    try {
      return await handleComments(req, res, path);
    } catch (error) {
      return json(res, 500, { error: error.message || "Erreur serveur" });
    }
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { error: "Méthode non autorisée" });
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
