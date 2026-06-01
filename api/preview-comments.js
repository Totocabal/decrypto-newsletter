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

function cleanInlineText(value, maxLength) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function cleanMultilineText(value, maxLength) {
  return String(value || "").replace(/\r\n/g, "\n").trim().slice(0, maxLength);
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

export default async function handler(req, res) {
  const previewPath = String(req.query.path || "");
  if (!isSafePreviewPath(previewPath)) {
    return json(res, 400, { error: "Chemin de preview invalide" });
  }

  try {
    if (req.method === "GET") {
      const query = new URLSearchParams({
        select: "id,author_name,body,created_at",
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
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      const authorName = cleanInlineText(body.authorName || "Anonyme", 80) || "Anonyme";
      const commentBody = cleanMultilineText(body.body, 2000);
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
  } catch (error) {
    return json(res, 500, { error: error.message || "Erreur serveur" });
  }
}
