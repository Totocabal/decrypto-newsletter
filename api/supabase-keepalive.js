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

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Configuration Supabase keepalive manquante");
  }

  return {
    key,
    url: url.replace(/\/+$/, ""),
  };
}

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    return json(res, 405, { error: "Méthode non autorisée" });
  }

  try {
    requireCronSecret(req);
    const supabase = getSupabaseConfig();

    const response = await fetch(`${supabase.url}/rest/v1/rpc/keepalive`, {
      method: "POST",
      headers: {
        apikey: supabase.key,
        Authorization: `Bearer ${supabase.key}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.message || `Supabase keepalive HTTP ${response.status}`);
    }

    return json(res, 200, { ok: true, supabase: payload });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[supabase-keepalive]", e);
    return json(res, e.status || 500, {
      error: e.message || "Keepalive Supabase impossible",
    });
  }
}
