import { createClient } from "@supabase/supabase-js";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function requireCronSecret(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return;

  const auth = req.headers.authorization || "";
  if (auth !== `Bearer ${secret}`) {
    const err = new Error("Accès non autorisé");
    err.status = 401;
    throw err;
  }
}

function getSupabaseServerClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Configuration Supabase serveur manquante");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    return json(res, 405, { error: "Méthode non autorisée" });
  }

  try {
    requireCronSecret(req);
    const supabase = getSupabaseServerClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("newsletters")
      .delete()
      .eq("archived", true)
      .lte("archive_expires_at", now)
      .select("id");

    if (error) throw error;

    return json(res, 200, {
      ok: true,
      purged: Array.isArray(data) ? data.length : 0,
      cutoff: now,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[purge-archived-newsletters]", e);
    return json(res, e.status || 500, {
      error: e.message || "Purge des newsletters archivées impossible",
    });
  }
}
