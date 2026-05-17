import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { createClient } from "@supabase/supabase-js";

export const config = {
  maxDuration: 30,
};

const MAX_HTML_BYTES = 2 * 1024 * 1024;

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
}

function parseBody(req) {
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  return req.body || {};
}

async function getExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  return chromium.executablePath();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Méthode non autorisée" });
  }

  let browser;
  try {
    await requireApprovedUser(req);

    const { html, device } = parseBody(req);
    if (!html || typeof html !== "string") {
      return json(res, 400, { error: "HTML manquant" });
    }
    if (Buffer.byteLength(html, "utf8") > MAX_HTML_BYTES) {
      return json(res, 413, { error: "HTML trop volumineux pour l'export image" });
    }

    const viewportWidth = device === "mobile" ? 430 : 760;
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: {
        width: viewportWidth,
        height: 1200,
        deviceScaleFactor: 2,
      },
      executablePath: await getExecutablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: ["load", "networkidle0"], timeout: 20000 });
    await page.evaluate(async () => {
      await document.fonts?.ready?.catch(() => {});
      await Promise.all(Array.from(document.images || []).map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        if (img.decode) return img.decode().catch(() => {});
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });

    const metrics = await page.evaluate(() => {
      const target = document.querySelector(".em-container");
      if (!target) return null;
      const rect = target.getBoundingClientRect();
      return {
        x: Math.max(0, Math.floor(rect.left + window.scrollX)),
        y: Math.max(0, Math.floor(rect.top + window.scrollY)),
        width: Math.ceil(Math.max(rect.width, target.scrollWidth)),
        height: Math.ceil(Math.max(rect.height, target.scrollHeight)),
      };
    });
    if (!metrics) throw new Error("Conteneur de prévisualisation introuvable");

    await page.setViewport({
      width: Math.max(viewportWidth, metrics.width),
      height: Math.min(Math.max(metrics.height, 1200), 16000),
      deviceScaleFactor: 2,
    });
    await new Promise((resolve) => setTimeout(resolve, 100));

    const buffer = await page.screenshot({
      type: "jpeg",
      quality: 95,
      omitBackground: false,
      captureBeyondViewport: true,
      clip: metrics,
    });

    res.statusCode = 200;
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Content-Disposition", `attachment; filename="preview-${device === "mobile" ? "mobile" : "desktop"}.jpg"`);
    res.setHeader("Cache-Control", "no-store");
    res.end(buffer);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[export-preview-jpg]", e);
    return json(res, e.status || 500, {
      error: e.message || "Export JPG impossible",
    });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
