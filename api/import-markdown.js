import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import {
  MarkdownImportError,
  importNewsletterMarkdown,
} from "../src/utils/markdownImport.js";

const MAX_MARKDOWN_CHARS = 600_000;
const IMPORT_OPTIONS = new Set([
  "theme_variant",
  "show_section_numbers",
  "show_block_separators",
]);

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

function serverSupabaseUrl() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!url) throw new Error("Configuration Supabase serveur manquante");
  return url;
}

function getSupabaseServerClient(accessToken) {
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!key) throw new Error("Configuration Supabase serveur manquante");
  return createClient(serverSupabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}

function getSupabaseIntegrationClient() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    const err = new Error(
      "Mode intégration non configuré : SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY manquant."
    );
    err.status = 500;
    throw err;
  }
  return createClient(serverSupabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function tokenMatches(value, expected) {
  if (!value || !expected) return false;
  const valueBytes = Buffer.from(String(value));
  const expectedBytes = Buffer.from(String(expected));
  return valueBytes.length === expectedBytes.length && timingSafeEqual(valueBytes, expectedBytes);
}

function integrationAuthorId() {
  const id = String(process.env.MARKDOWN_IMPORT_USER_ID || "").trim();
  if (!id) {
    const err = new Error("Mode intégration non configuré : MARKDOWN_IMPORT_USER_ID manquant.");
    err.status = 500;
    throw err;
  }
  return id;
}

async function requireApprovedUser(req) {
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
    .select("approved")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile?.approved) {
    const err = new Error("Accès non autorisé");
    err.status = 403;
    throw err;
  }

  return { supabase, user: userData.user };
}

async function authorizeMarkdownImport(req) {
  const token = getBearerToken(req);
  if (!token) {
    const err = new Error("Authentification requise");
    err.status = 401;
    throw err;
  }

  if (tokenMatches(token, process.env.MARKDOWN_IMPORT_API_TOKEN)) {
    return {
      mode: "integration",
      supabase: getSupabaseIntegrationClient(),
      authorId: integrationAuthorId(),
    };
  }

  const { supabase, user } = await requireApprovedUser(req);
  return { mode: "user", supabase, authorId: user.id };
}

async function readRequestText(req) {
  const chunks = [];
  let bytes = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > MAX_MARKDOWN_CHARS * 4) {
      const err = new Error(`Corps de requête trop long (${MAX_MARKDOWN_CHARS} caractères max).`);
      err.status = 413;
      throw err;
    }
    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString("utf8");
}

export async function parseRequestBody(req) {
  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  if (contentType.includes("text/markdown") || contentType.includes("text/plain")) {
    const markdown = typeof req.body === "string" ? req.body : await readRequestText(req);
    return { markdown };
  }

  try {
    return typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch {
    const err = new Error("Corps JSON invalide");
    err.status = 400;
    throw err;
  }
}

function parseImportOptions(options) {
  if (options === undefined) return {};
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    const err = new Error("Le champ 'options' doit être un objet.");
    err.status = 400;
    throw err;
  }

  const unknownOptions = Object.keys(options).filter((key) => !IMPORT_OPTIONS.has(key));
  if (unknownOptions.length) {
    const err = new Error(`Option d'import inconnue : ${unknownOptions.join(", ")}.`);
    err.status = 400;
    throw err;
  }

  const patch = {};
  if (options.theme_variant !== undefined) {
    if (!["dark", "light"].includes(options.theme_variant)) {
      const err = new Error("options.theme_variant doit valoir dark ou light.");
      err.status = 400;
      throw err;
    }
    patch.theme_variant = options.theme_variant;
  }

  ["show_section_numbers", "show_block_separators"].forEach((field) => {
    if (options[field] === undefined) return;
    if (typeof options[field] !== "boolean") {
      const err = new Error(`options.${field} doit être un booléen.`);
      err.status = 400;
      throw err;
    }
    patch[field] = options[field];
  });

  return patch;
}

export function importFromBody(body) {
  if (typeof body.markdown !== "string" || !body.markdown.trim()) {
    const err = new Error("Champ 'markdown' vide ou manquant.");
    err.status = 400;
    throw err;
  }
  if (body.markdown.length > MAX_MARKDOWN_CHARS) {
    const err = new Error(`Champ 'markdown' trop long (${MAX_MARKDOWN_CHARS} caractères max).`);
    err.status = 413;
    throw err;
  }

  const imported = importNewsletterMarkdown(body.markdown);
  const statePatch = parseImportOptions(body.options);
  return {
    ...imported,
    state: { ...imported.state, ...statePatch },
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return json(res, 204, {});
  if (req.method !== "POST") return json(res, 405, { error: "Méthode non autorisée" });

  try {
    const { supabase, authorId } = await authorizeMarkdownImport(req);
    const imported = importFromBody(await parseRequestBody(req));
    const { data, error } = await supabase
      .from("newsletters")
      .insert({
        title: imported.title,
        issue_number: imported.state.issue_number,
        current_state: imported.state,
        created_by: authorId,
        updated_by: authorId,
      })
      .select("id, title, issue_number, current_state")
      .single();
    if (error) throw error;

    return json(res, 201, {
      newsletter: data,
      warnings: imported.warnings,
    });
  } catch (err) {
    const status = err.status || (err instanceof MarkdownImportError ? 400 : 500);
    return json(res, status, { error: err.message || "Import Markdown impossible" });
  }
}
