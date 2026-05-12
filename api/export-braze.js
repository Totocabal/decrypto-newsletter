import { createClient } from "@supabase/supabase-js";

const MAX_ASSETS = 30;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function getSupabaseServerClient(accessToken) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Configuration Supabase serveur manquante");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
}

async function requireAdmin(req) {
  const token = getBearerToken(req);
  if (!token) {
    const err = new Error("Authentification requise");
    err.status = 401;
    throw err;
  }

  const supabase = getSupabaseServerClient(token);
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user?.id) {
    const err = new Error("Session invalide");
    err.status = 401;
    throw err;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin, approved")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile?.approved || !profile?.is_admin) {
    const err = new Error("Accès réservé aux administrateurs");
    err.status = 403;
    throw err;
  }

  return userData.user;
}

function getBrazeConfig() {
  const apiKey = process.env.BRAZE_API_KEY;
  const baseUrl = process.env.BRAZE_BASE_URL || process.env.BRAZE_REST_ENDPOINT;
  if (!apiKey || !baseUrl) {
    throw new Error("Configuration Braze manquante: BRAZE_API_KEY et BRAZE_BASE_URL sont requis");
  }
  return {
    apiKey,
    baseUrl: baseUrl.replace(/\/+$/, ""),
  };
}

function parseBrazeAssetUrl(payload) {
  const candidates = [
    payload?.url,
    payload?.asset_url,
    payload?.media_url,
    payload?.image_url,
    payload?.data?.url,
    payload?.data?.asset_url,
    payload?.data?.media_url,
    payload?.data?.image_url,
    payload?.data?.asset?.url,
    payload?.data?.asset?.asset_url,
  ];
  return candidates.find((value) => typeof value === "string" && /^https?:\/\//i.test(value));
}

async function uploadAssetToBraze(asset, braze) {
  if (!asset.name || (!asset.base64 && !asset.assetUrl)) {
    throw new Error("Asset invalide: nom ou contenu manquant");
  }
  if (asset.base64 && Buffer.byteLength(asset.base64, "base64") > MAX_IMAGE_BYTES) {
    throw new Error(`${asset.name} dépasse la limite Braze de 5 Mo`);
  }

  const resp = await fetch(`${braze.baseUrl}/media_library/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${braze.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: asset.name,
      file_name: asset.name,
      ...(asset.assetUrl
        ? { asset_url: asset.assetUrl }
        : {
            content_type: asset.contentType || "image/png",
            asset_file: asset.base64,
          }),
    }),
  });

  const payload = await resp.json().catch(async () => ({
    message: await resp.text().catch(() => ""),
  }));
  if (!resp.ok) {
    throw new Error(
      `Braze a refusé ${asset.name} (HTTP ${resp.status})${
        payload?.message ? `: ${payload.message}` : ""
      }`
    );
  }

  const url = parseBrazeAssetUrl(payload);
  if (!url) {
    throw new Error(`Réponse Braze sans URL publique pour ${asset.name}`);
  }
  return url;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Méthode non autorisée" });
  }

  try {
    await requireAdmin(req);
    const braze = getBrazeConfig();
    const assets = Array.isArray(req.body?.assets) ? req.body.assets : [];

    if (!assets.length) {
      return json(res, 400, { error: "Aucune image à uploader" });
    }
    if (assets.length > MAX_ASSETS) {
      return json(res, 400, { error: `Trop d'images à uploader (${MAX_ASSETS} max)` });
    }

    const uploaded = {};
    for (const asset of assets) {
      uploaded[asset.name] = await uploadAssetToBraze(asset, braze);
    }

    return json(res, 200, { assets: uploaded });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[export-braze]", e);
    return json(res, e.status || 500, {
      error: e.message || "Export Braze impossible",
    });
  }
}
