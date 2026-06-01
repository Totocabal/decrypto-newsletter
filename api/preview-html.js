const STORAGE_BUCKET = "newsletter-previews";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
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
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(html);
}
