import { createClient } from "@supabase/supabase-js";

const GEMINI_MODEL = "gemini-2.0-flash-lite";
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
  return String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function truncate(str, max) {
  const s = String(str || "").trim();
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function buildContext(state) {
  const lines = [];

  // Hero
  const hero = (state.sections || []).find((s) => s.type === "hero");
  if (hero) {
    const d = hero.data || {};
    const title = [d.title_part1, d.title_part2].filter(Boolean).join(" ");
    if (d.kicker) lines.push(`Kicker : ${d.kicker}`);
    if (title) lines.push(`Titre : ${title}`);
    const sub = stripHtml(d.subtitle);
    if (sub) lines.push(`Sous-titre : ${truncate(sub, 200)}`);
  }

  // Other content sections (first 4)
  const contentTypes = ["focus", "edito", "text_block", "macro_quote", "event"];
  let count = 0;
  for (const sec of state.sections || []) {
    if (count >= 4) break;
    if (!contentTypes.includes(sec.type)) continue;
    const d = sec.data || {};
    const title = d.title || d.kicker || "";
    const body = stripHtml(d.body || (d.items || []).find((i) => i.type === "text")?.body || "");
    if (title) lines.push(`Section : ${truncate(title, 80)}${body ? " — " + truncate(body, 150) : ""}`);
    else if (body) lines.push(`Contenu : ${truncate(body, 150)}`);
    count++;
  }

  return lines.join("\n");
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
    const { state } = body || {};
    if (!state) return json(res, 400, { error: "Champ 'state' manquant." });

    const context = buildContext(state);
    if (!context.trim()) return json(res, 400, { error: "La newsletter ne contient pas encore assez de contenu." });

    const prompt = `Tu es rédacteur expert pour la newsletter crypto Décrypto de Coinhouse.
À partir du contenu ci-dessous, génère un texte de prévisualisation d'email (preheader) en français.

Règles :
- Entre 90 et 130 caractères
- Accrocheur et informatif, donne envie d'ouvrir l'email
- Ton professionnel mais accessible, adapté à une audience crypto institutionnelle
- Ne commence pas par "Dans ce numéro" ou "Au programme"
- Une seule phrase ou deux courtes phrases maximum
- Pas de guillemets, pas d'emoji
- Réponds UNIQUEMENT avec le texte de prévisualisation, rien d'autre

Contenu de la newsletter :
${context}`;

    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 80, temperature: 0.7 },
      }),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      return json(res, 502, { error: `Erreur Gemini (${geminiRes.status}) : ${err.slice(0, 200)}` });
    }

    const data = await geminiRes.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return json(res, 502, { error: "Gemini n'a pas retourné de texte." });

    return json(res, 200, { text });
  } catch (err) {
    return json(res, err.status || 500, { error: err.message || "Erreur interne" });
  }
}
