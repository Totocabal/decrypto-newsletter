import test from "node:test";
import assert from "node:assert/strict";

import { buildEmailHtml } from "./buildEmail.js";
import { INITIAL_STATE, SECTION_TYPES } from "../config/schema.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function compatSection(type, index) {
  const data = clone(SECTION_TYPES[type].factory());

  if ("cta_label" in data) data.cta_label ||= `CTA ${index}`;
  if ("cta_url" in data) data.cta_url ||= "#";
  if ("url" in data) data.url ||= "#";
  if (type === "cta") {
    data.label = "CTA standalone";
    data.url = "#";
  }
  if (type === "text_block") {
    data.cta_label = "Lire la suite";
    data.cta_url = "#";
  }
  if (type === "comparison") {
    data.cta_label = "Comparer les offres";
    data.cta_url = "#";
  }
  if (type === "feature_grid") {
    data.cta_label = "Activer";
    data.cta_url = "#";
  }
  if (type === "image_block") {
    data.image_url = "https://example.com/image.png";
  }
  if (type === "focus") {
    data.items = [
      { type: "text", body: "Texte riche avec <strong>mise en avant</strong>." },
      {
        type: "callout",
        label: "A retenir",
        body: "Un encart doit rester lisible même sans CSS avancé.",
        picto: "check",
        callout_color: "#03FFCF",
      },
      {
        type: "cta",
        label: "Action principale",
        url: "#",
        arrow: true,
        secondary_label: "Action secondaire",
        secondary_url: "#",
      },
    ];
  }

  return {
    id: `compat_${type}`,
    type,
    data,
  };
}

function buildCompatState(themeVariant = "dark") {
  return {
    ...clone(INITIAL_STATE),
    issue_date: "23.07.2026",
    preview_text: "Audit compatibilite email",
    theme_variant: themeVariant,
    sections: Object.keys(SECTION_TYPES).map(compatSection),
  };
}

test("email renderer keeps core webmail compatibility invariants", () => {
  const html = buildEmailHtml(buildCompatState("dark"));

  assert.match(html, /<!doctype html>/i);
  assert.match(html, /<table role="presentation"/i);
  assert.match(html, /<meta name="x-apple-disable-message-reformatting"/i);
  assert.match(html, /<meta name="format-detection" content="telephone=no, date=no, address=no, email=no"/i);
  assert.match(html, /mso-table-lspace:\s*0pt/i);
  assert.match(html, /-webkit-text-size-adjust:\s*100%/i);
  assert.match(html, /<v:roundrect[\s\S]*href="#"/i);

  assert.doesNotMatch(html, /display\s*:\s*flex/i);
  assert.doesNotMatch(html, /position\s*:\s*(absolute|fixed|sticky)/i);
  assert.doesNotMatch(html, /float\s*:/i);
  assert.doesNotMatch(html, /<button[\s>]/i);
  assert.doesNotMatch(html, /<form[\s>]/i);
  assert.doesNotMatch(html, /<script[\s>]/i);
});

test("external export mode replaces fragile inline visuals with image assets", () => {
  const html = buildEmailHtml(buildCompatState("dark"), {
    assetMode: "external",
    ctaGradientUrl: "assets/gradient-cta.png",
  });

  assert.doesNotMatch(html, /<svg[\s>]/i);
  assert.match(html, /src="assets\/chart\.png"/i);
  assert.match(html, /src="assets\/gauge\.png"/i);
  assert.match(html, /src="assets\/signal-arrow-up\.png"/i);
  assert.match(html, /background="assets\/macro-quote-bg\.png"/i);
  assert.match(html, /background-image:url\('assets\/gradient-cta\.png'\)/i);
});

test("light theme keeps the same compatibility scaffolding", () => {
  const html = buildEmailHtml(buildCompatState("light"), {
    assetMode: "external",
    ctaGradientUrl: "assets/gradient-cta.png",
  });

  assert.match(html, /<meta name="color-scheme" content="light"/i);
  assert.match(html, /<v:roundrect[\s\S]*href="#"/i);
  assert.doesNotMatch(html, /<svg[\s>]/i);
  assert.doesNotMatch(html, /display\s*:\s*flex/i);
});

test("referral block includes Outlook-safe VML background and button fallbacks", () => {
  const state = {
    ...clone(INITIAL_STATE),
    issue_date: "23.07.2026",
    theme_variant: "dark",
    sections: [compatSection("referral", 1)],
  };
  const html = buildEmailHtml(state, {
    assetMode: "external",
    ctaGradientUrl: "assets/gradient-cta.png",
  });
  const referralStart = html.indexOf("em-referral-bg");
  const referralEnd = html.indexOf("<!--[if mso]></v:textbox></v:roundrect><![endif]-->", referralStart);
  const referralHtml = html.slice(referralStart, referralEnd);

  assert.match(html, /<v:roundrect[^>]+strokecolor="#2D243A"[^>]+style="width:568px;"/i);
  assert.match(html, /<v:fill type="frame" src="assets\/referral-bg-dark\.png" color="#1a0c2e"/i);
  assert.match(html, /<v:textbox inset="0,0,0,0" style="mso-fit-shape-to-text:true"/i);
  assert.match(referralHtml, /<td class="em-referral-cta"[\s\S]*<v:roundrect[\s\S]*fillcolor="#FFFFFF"/i);
  assert.match(referralHtml, /bgcolor="#12081F"/i);
  assert.match(referralHtml, /border:1px dashed #5F526D/i);
  assert.doesNotMatch(referralHtml, /rgba\(/i);
});
