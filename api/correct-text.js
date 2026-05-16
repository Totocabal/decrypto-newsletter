import { createClient } from "@supabase/supabase-js";

const GEMINI_MODEL = "gemini-3.1-flash-lite";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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
  const sb = getSupabaseServerClient(token);
  const { data: { user }, error } = await sb.auth.getUser();
  if (error || !user) {
    const err = new Error("Session invalide");
    err.status = 401;
    throw err;
  }
  const { data: profile } = await sb.from("profiles").select("approved").eq("id", user.id).maybeSingle();
  if (!profile?.approved) {
    const err = new Error("Accès non autorisé");
    err.status = 403;
    throw err;
  }
}

function stripHtml(html) {
  return String(html || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return json(res, 204, {});
  if (req.method !== "POST") return json(res, 405, { error: "Méthode non autorisée" });

  try {
    await requireApprovedUser(req);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return json(res, 500, { error: "Clé Gemini non configurée (variable GEMINI_API_KEY manquante)." });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { html } = body || {};
    if (!html || !stripHtml(html).trim()) return json(res, 400, { error: "Champ 'html' vide ou manquant." });

    const prompt = `Corrige uniquement les fautes d'orthographe et de grammaire dans le texte HTML ci-dessous.

Règles strictes :
- Préserve EXACTEMENT toutes les balises HTML (<strong>, <em>, <u>, <s>, <ul>, <ol>, <li>, <a href="...">, <br />, etc.)
- Préserve EXACTEMENT tous les attributs HTML sans les modifier
- Ne modifie que le texte visible entre les balises
- Ne reformule pas les phrases, ne change pas le style ni la structure du texte
- Ne traduis pas
- Réponds UNIQUEMENT avec le HTML corrigé, sans balises de code markdown, sans commentaires, sans explications

HTML à corriger :
${html}`;

    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 },
      }),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      return json(res, 502, { error: `Erreur Gemini (${geminiRes.status}) : ${err.slice(0, 200)}` });
    }

    const data = await geminiRes.json();
    let corrected = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!corrected) return json(res, 502, { error: "Gemini n'a pas retourné de texte." });

    // Nettoyer les blocs de code markdown que Gemini peut ajouter malgré la consigne
    corrected = corrected.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

    return json(res, 200, { html: corrected });
  } catch (err) {
    return json(res, err.status || 500, { error: err.message || "Erreur interne" });
  }
}
