import { createClient } from "@supabase/supabase-js";

const RESEND_API_URL = "https://api.resend.com/emails";
const MAX_RECIPIENTS = 10;
const MAX_HTML_BYTES = 2_000_000;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  try {
    return typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  } catch {
    const err = new Error("Corps JSON invalide");
    err.status = 400;
    throw err;
  }
}

function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function getSupabaseServerClient(accessToken) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Configuration Supabase serveur manquante");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}

async function requireApprovedUser(req) {
  const token = getBearerToken(req);
  if (!token) {
    const err = new Error("Authentification requise");
    err.status = 401;
    throw err;
  }

  const supabase = getSupabaseServerClient(token);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    const err = new Error("Session invalide");
    err.status = 401;
    throw err;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("approved, email")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile?.approved) {
    const err = new Error("Accès non autorisé");
    err.status = 403;
    throw err;
  }

  return { user, profile };
}

function normalizeRecipients(value) {
  const raw = Array.isArray(value) ? value.join(",") : String(value || "");
  const recipients = raw
    .split(/[,\n;]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const uniqueRecipients = [...new Set(recipients)];
  if (!uniqueRecipients.length) {
    const err = new Error("Ajoute au moins un destinataire.");
    err.status = 400;
    throw err;
  }
  if (uniqueRecipients.length > MAX_RECIPIENTS) {
    const err = new Error(`Maximum ${MAX_RECIPIENTS} destinataires par preview.`);
    err.status = 400;
    throw err;
  }
  const invalid = uniqueRecipients.find((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  if (invalid) {
    const err = new Error(`Adresse email invalide : ${invalid}`);
    err.status = 400;
    throw err;
  }
  return uniqueRecipients;
}

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM;
  if (!apiKey || !from) {
    throw new Error("Configuration Resend manquante : RESEND_API_KEY et RESEND_FROM_EMAIL sont requis.");
  }
  return { apiKey, from };
}

function plainTextFromHtml(html = "") {
  return String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return json(res, 405, { error: "Méthode non autorisée" });

  try {
    const { user, profile } = await requireApprovedUser(req);
    const body = parseBody(req);
    const to = normalizeRecipients(body.to);
    const subject = String(body.subject || "").trim();
    const html = String(body.html || "");
    const previewText = String(body.previewText || "").trim();
    const replyTo = String(body.replyTo || profile?.email || user.email || "").trim();

    if (!subject) return json(res, 400, { error: "Sujet manquant." });
    if (!html.trim()) return json(res, 400, { error: "HTML manquant." });
    if (Buffer.byteLength(html, "utf8") > MAX_HTML_BYTES) {
      return json(res, 413, { error: "HTML trop volumineux pour une preview." });
    }

    const resend = getResendConfig();
    const payload = {
      from: resend.from,
      to,
      subject,
      html,
      text: [previewText, plainTextFromHtml(html)]
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 20_000),
      headers: {
        "X-Decrypto-Preview": "true",
      },
    };
    if (replyTo && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo)) payload.reply_to = replyTo;

    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resend.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(async () => ({
      message: await response.text().catch(() => ""),
    }));

    if (!response.ok) {
      return json(res, response.status, {
        error: result?.message || result?.error || "Resend a refusé l'envoi.",
        details: result,
      });
    }

    return json(res, 200, {
      id: result?.id,
      to,
    });
  } catch (error) {
    return json(res, error.status || 500, {
      error: error.message || "Envoi preview impossible",
    });
  }
}
