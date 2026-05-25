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
  return String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function truncate(str, max) {
  const s = String(str || "").trim();
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function buildContext(state) {
  const lines = [];

  const hero = (state.sections || []).find((s) => s.type === "hero");
  if (hero) {
    const d = hero.data || {};
    const title = [d.title_part1, d.title_part2, d.title_highlight].filter(Boolean).join(" ");
    if (d.kicker) lines.push(`Kicker : ${d.kicker}`);
    if (title) lines.push(`Titre : ${title}`);
  }

  const contentTypes = ["focus", "edito", "text_block", "macro", "editorial_list", "event", "signals"];
  let count = 0;
  for (const sec of state.sections || []) {
    if (count >= 5) break;
    if (!contentTypes.includes(sec.type)) continue;
    const d = sec.data || {};
    const title = d.title || d.kicker || "";
    const body = stripHtml(
      d.body ||
      (d.items || []).find((i) => i.type === "text")?.body ||
      (d.items || []).map((i) => [i.title, i.body].filter(Boolean).join(" — ")).join("; ") ||
      ""
    );
    if (title) lines.push(`Section : ${truncate(title, 80)}${body ? " — " + truncate(body, 120) : ""}`);
    else if (body) lines.push(`Contenu : ${truncate(body, 120)}`);
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
    if (!apiKey) return json(res, 500, { error: "Clé Gemini non configurée." });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { state } = body || {};
    if (!state) return json(res, 400, { error: "Champ 'state' manquant." });

    const context = buildContext(state);
    if (!context.trim()) return json(res, 400, { error: "La newsletter ne contient pas encore assez de contenu." });

    const prompt = `Tu es rédacteur pour la newsletter crypto Décrypto de Coinhouse.
À partir du contenu ci-dessous, génère un sous-titre d'accroche pour le hero de la newsletter.

Règles :
- Entre 80 et 140 caractères
- Une ou deux phrases maximum
- Synthèse du thème principal, donne envie de lire
- Ton professionnel mais accessible, adapté à une audience crypto
- Pas de guillemets, pas d'emoji
- Réponds UNIQUEMENT avec le sous-titre, rien d'autre

Contenu :
${context}`;

    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 100, temperature: 0.7 },
      }),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      return json(res, 502, { error: `Erreur Gemini (${geminiRes.status}) : ${err.slice(0, 200)}` });
    }

    const data = await geminiRes.json();
    const subtitle = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
    if (!subtitle) return json(res, 502, { error: "Gemini n'a pas retourné de sous-titre." });

    return json(res, 200, { subtitle });
  } catch (err) {
    return json(res, err.status || 500, { error: err.message || "Erreur interne" });
  }
}
