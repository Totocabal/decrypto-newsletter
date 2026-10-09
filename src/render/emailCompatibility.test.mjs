import test from "node:test";
import assert from "node:assert/strict";

import { buildEmailHtml, sanitizeRichText } from "./buildEmail.js";
import { INITIAL_STATE, SECTION_TYPES, getAddableSectionTypes } from "../config/schema.js";

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
      { type: "subtitle", text: "Un sous-titre interne" },
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

function buildCompatState(themeVariant = "dark", audience = "b2c") {
  return {
    ...clone(INITIAL_STATE),
    issue_date: "23.07.2026",
    preview_text: "Audit compatibilite email",
    theme_variant: themeVariant,
    audience,
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

test("heading line-heights are explicit for Outlook desktop", () => {
  const html = buildEmailHtml(buildCompatState("dark"));
  const exactLineHeightCount = (html.match(/mso-line-height-rule:exactly/g) || []).length;

  assert.match(html, /<h1 class="em-h1"[^>]*line-height:59px; mso-line-height-rule:exactly/i);
  assert.match(html, /<h2 class="em-h2"[^>]*line-height:33px; mso-line-height-rule:exactly/i);
  assert.match(html, /<h3 style="[^"]*line-height:30px; mso-line-height-rule:exactly/i);
  assert.match(html, /Programme de parrainage[\s\S]*line-height:32px; mso-line-height-rule:exactly|line-height:32px; mso-line-height-rule:exactly[\s\S]*Invitez vos proches/i);
  assert.match(html, /line-height:21px; mso-line-height-rule:exactly[\s\S]*Ouvrez votre compte euro/i);
  assert.ok(exactLineHeightCount >= 10);
});

test("focus subtitle uses smaller title typography with Outlook-safe line-height", () => {
  const html = buildEmailHtml(buildCompatState("dark"));

  assert.match(html, /<h3 style="[^"]*font-family:[^;]+;[^"]*font-weight:600; font-size:22px; line-height:26px; mso-line-height-rule:exactly;[^"]*">Un sous-titre interne<\/h3>/i);
});

test("commented number CTA renders with bulletproof Outlook fallback", () => {
  const section = compatSection("commented_number", 1);
  section.data.cta_label = "Lire l'analyse";
  section.data.cta_url = "https://example.com/analyse";
  section.data.cta_arrow = true;
  section.data.cta_centered = true;
  const state = {
    ...clone(INITIAL_STATE),
    issue_date: "23.07.2026",
    theme_variant: "dark",
    sections: [section],
  };
  const html = buildEmailHtml(state);

  assert.match(html, /Lire l&#39;analyse&nbsp;→/i);
  assert.match(html, /<v:roundrect[\s\S]*href="https:\/\/example\.com\/analyse"/i);
  assert.match(html, /align="center"[\s\S]*Lire l&#39;analyse&nbsp;→/i);
});

test("hidden preheader is padded enough to stop mobile previews before visible content", () => {
  const state = {
    ...buildCompatState("dark"),
    preview_text: "La fin des cloches de cloture",
    issue_date: "23.07.2026",
  };
  const html = buildEmailHtml(state);
  const preheaderEnd = html.indexOf("</div>", html.indexOf("La fin des cloches"));
  const spacerEnd = html.indexOf("</div>", preheaderEnd + 1);
  const preheaderHtml = html.slice(html.indexOf("<body"), spacerEnd);
  const mainTableIndex = html.indexOf("<table role=\"presentation\" width=\"100%\"", spacerEnd);
  const spacerMatches = preheaderHtml.match(/&nbsp;&zwnj;&#847;&shy;/g) || [];

  assert.ok(preheaderEnd > -1);
  assert.ok(spacerEnd > preheaderEnd);
  assert.ok(mainTableIndex > spacerEnd);
  assert.match(preheaderHtml, /display:none !important/i);
  assert.match(preheaderHtml, /visibility:hidden/i);
  assert.match(preheaderHtml, /mso-hide:all/i);
  assert.equal(spacerMatches.length, 220);
  assert.doesNotMatch(preheaderHtml, /23\.07\.2026|DÉCRYPTO|L'HEBDO COINHOUSE/i);
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

test("timeline connector is a cell border spanning the whole step, whatever the text length", () => {
  const state = {
    ...clone(INITIAL_STATE),
    issue_date: "28.07.2026",
    sections: [{
      id: "timeline_variable_connectors",
      type: "timeline",
      data: {
        kicker: "Compte euro",
        body: "Trois étapes suffisent.",
        items: [
          {
            title: "Court",
            body: "Une ligne.",
          },
          {
            title: "Etape avec un texte plus long",
            body: "Ce texte volontairement plus long doit forcer le liseré de gauche à descendre davantage pour accompagner la hauteur réelle du contenu sur plusieurs lignes.",
          },
          {
            title: "Terminé",
            body: "Dernière étape sans connecteur.",
          },
        ],
      },
    }],
  };
  const html = buildEmailHtml(state);
  // Un liseré par étape sauf la dernière, porté par la bordure d'une cellule sous le badge
  // et non par une hauteur estimée : la ligne suit la hauteur réelle du texte (rowspan).
  assert.equal([...html.matchAll(/border-right:2px solid/g)].length, 2);
  assert.equal([...html.matchAll(/rowspan="2"/g)].length, 2);
  assert.doesNotMatch(html, /<td width="2" height=/);
});

test("timeline renders kicker and title like other blocks and adds no gap without heading", () => {
  const build = (data) => buildEmailHtml({
    ...clone(INITIAL_STATE),
    issue_date: "28.07.2026",
    show_section_numbers: false,
    sections: [{
      id: "timeline_heading",
      type: "timeline",
      data: { body: "", items: [{ title: "Étape", body: "Texte." }], ...data },
    }],
  });

  const full = build({ kicker: "Pas à pas", title: "Mon titre" });
  assert.match(full, /letter-spacing:0\.2em; text-transform:uppercase; color:[^;]+; font-weight:500;">Pas à pas/);
  assert.match(full, /<h2 class="em-h2"[^>]*>\s*Mon titre/);
  assert.match(full, /margin-top:22px;"/);

  const bare = build({});
  assert.doesNotMatch(bare, /<h2 class="em-h2"[^>]*>\s*Mon titre/);
  assert.match(bare, /margin-top:0;"/);
  assert.doesNotMatch(bare, /margin-top:22px;"/);
  // Sans en-tête, le haut du bloc est réduit comme pour le bloc texte.
  assert.match(bare, /class="em-px" style="padding:28px 36px 44px;/);
  assert.match(full, /class="em-px" style="padding:44px 36px;/);
});

test("non-breaking spaces typed in the editor survive as &nbsp; while Quill's own &nbsp; stay plain spaces", () => {
  // Quill écrit ses espaces normales en &nbsp; ; l'espace insécable volontaire est stockée en &#160;.
  const out = sanitizeRichText("<p>Un&nbsp;texte 10&#160;000 € et 5\u00a0%</p>");
  assert.match(out, /Un texte 10&nbsp;000 € et 5&nbsp;%/);
  assert.doesNotMatch(out, /Un&nbsp;texte/);
});

test("kpis block renders bulletproof cards laid out in rows", () => {
  const build = (count) => {
    const data = clone(SECTION_TYPES.kpis.factory());
    data.items = Array.from({ length: count }, (_, i) => ({
      label: `KPI ${i + 1}`, value: `+${i + 1} %`, caption: "2024", tone: "positive",
    }));
    return buildEmailHtml({ ...clone(INITIAL_STATE), sections: [{ id: "kpis-1", type: "kpis", data }] });
  };

  const three = build(3);
  assert.equal((three.match(/class="em-kpi-col"/g) || []).length, 3);
  assert.equal((three.match(/<tr><td class="em-kpi-col"/g) || []).length, 1);
  assert.match(three, /border-collapse:separate !important/);
  assert.match(three, /\+1&nbsp;%/);

  const four = build(4);
  assert.equal((four.match(/class="em-kpi-col"/g) || []).length, 4);
  assert.equal((four.match(/<tr><td class="em-kpi-col"/g) || []).length, 2);
});

test("rich text highlights become inline email-safe spans", () => {
  const html = sanitizeRichText('<p>Un <mark data-hl="cyan">mot clé</mark> et <mark data-hl="inconnu">autre</mark></p>');

  assert.doesNotMatch(html, /<mark|&lt;mark/);
  assert.match(html, /<span style="background-color:#03FFCF; color:#111318;[^"]*">mot clé<\/span>/);
  assert.match(html, /<span style="background-color:#FFE45C;[^"]*">autre<\/span>/);
});

test("rich text colors become inline spans adapted to the theme", () => {
  const withColor = (theme) => {
    const state = clone(INITIAL_STATE);
    state.theme_variant = theme;
    state.sections = [{
      id: "edito-1",
      type: "edito",
      data: { ...clone(SECTION_TYPES.edito.factory()), body: 'Un <span data-tc="cyan">mot cyan</span>.' },
    }];
    return buildEmailHtml(state);
  };

  assert.match(withColor("dark"), /<span style="color:#03FFCF;">mot cyan<\/span>/);
  assert.match(withColor("light"), /<span style="color:#00967A;">mot cyan<\/span>/);
});

test("fonds block renders one card per fund with rate, asterisk and disclaimer", () => {
  const data = clone(SECTION_TYPES.fonds.factory());
  data.disclaimer = "Les performances passées ne préjugent pas des performances futures.";
  const html = buildEmailHtml({ ...clone(INITIAL_STATE), sections: [{ id: "fonds-1", type: "fonds", data }] });

  assert.equal((html.match(/class="em-fonds-txt"/g) || []).length, 3);
  assert.match(html, /Spiko Euro/);
  assert.match(html, /2,84&nbsp;%<span[^>]*>\*<\/span>/);
  assert.match(html, /taux net annualisé<br \/>indicatif au 22\/09\/2026/);
  assert.match(html, /Les performances passées ne préjugent pas des performances futures\./);

  const noAsterisk = clone(data);
  noAsterisk.items[0].show_asterisk = false;
  const htmlNoAsterisk = buildEmailHtml({ ...clone(INITIAL_STATE), sections: [{ id: "fonds-2", type: "fonds", data: noAsterisk }] });
  assert.doesNotMatch(htmlNoAsterisk.split("Spiko EU")[0], /\*<\/span>/);
});

test("bon_a_savoir block renders label/value rows with dividers except the last", () => {
  const data = clone(SECTION_TYPES.bon_a_savoir.factory());
  const html = buildEmailHtml({ ...clone(INITIAL_STATE), sections: [{ id: "bas-1", type: "bon_a_savoir", data }] });

  assert.equal((html.match(/class="em-bas-l"/g) || []).length, 3);
  assert.match(html, /Bon à savoir/);
  assert.match(html, /Montant minimum de souscription/);
  assert.match(html, /1(?:&nbsp;| )€/);
  assert.equal((html.match(/class="em-bas-l"[^>]*border-bottom:1px solid/g) || []).length, 2);

  const empty = { ...clone(data), items: [], title: "" };
  const emptyHtml = buildEmailHtml({ ...clone(INITIAL_STATE), sections: [{ id: "bas-2", type: "bon_a_savoir", data: empty }] });
  assert.doesNotMatch(emptyHtml, /class="em-bas-l"/);
  assert.doesNotMatch(emptyHtml, /Bon à savoir/);
});

test("bon_a_savoir block renders an optional italic disclaimer under the rows", () => {
  const withDisclaimer = { ...clone(SECTION_TYPES.bon_a_savoir.factory()), disclaimer: "Les conditions sont susceptibles d'évoluer." };
  const html = buildEmailHtml({ ...clone(INITIAL_STATE), sections: [{ id: "bas-5", type: "bon_a_savoir", data: withDisclaimer }] });
  assert.match(html, /font-style:italic;[^>]*>Les conditions sont susceptibles d&#39;évoluer\./);

  const withoutDisclaimer = buildEmailHtml({
    ...clone(INITIAL_STATE),
    sections: [{ id: "bas-6", type: "bon_a_savoir", data: clone(SECTION_TYPES.bon_a_savoir.factory()) }],
  });
  assert.doesNotMatch(withoutDisclaimer, /font-style:italic/);
});

test("bon_a_savoir block tints its background and title from the chosen accent color", () => {
  const data = { ...clone(SECTION_TYPES.bon_a_savoir.factory()), bg_color: "#FF8B28" };
  const html = buildEmailHtml({ ...clone(INITIAL_STATE), sections: [{ id: "bas-3", type: "bon_a_savoir", data }] });

  assert.match(html, /color:#FF8B28;">Bon à savoir/);
  assert.doesNotMatch(html, /background-color:#141418;/);

  const neutralHtml = buildEmailHtml({
    ...clone(INITIAL_STATE),
    sections: [{ id: "bas-4", type: "bon_a_savoir", data: clone(SECTION_TYPES.bon_a_savoir.factory()) }],
  });
  assert.match(neutralHtml, /background-color:#141418;/);
});

test("CTA subtext follows the button alignment and keeps links", () => {
  const focusData = {
    ...clone(SECTION_TYPES.focus.factory()),
    items: [
      { id: "cta-left", type: "cta", label: "Voir l'offre", url: "#", centered: false, subtext: 'Voir <a href="https://example.com">les modalités</a>.' },
      { id: "cta-center", type: "cta", label: "Découvrir", url: "#", centered: true, subtext: "Offre limitée." },
    ],
  };
  const html = buildEmailHtml({ ...clone(INITIAL_STATE), sections: [{ id: "focus-1", type: "focus", data: focusData }] });

  assert.match(html, /align="left"[^>]*>Voir <a href="https:\/\/example\.com"/);
  assert.match(html, /align="center"[^>]*>Offre limitée\./);

  const noSubtextData = { ...clone(focusData), items: [{ ...focusData.items[0], subtext: "" }] };
  const noSubtextHtml = buildEmailHtml({ ...clone(INITIAL_STATE), sections: [{ id: "focus-2", type: "focus", data: noSubtextData }] });
  assert.doesNotMatch(noSubtextHtml, /Voir <a/);
});

test("offer block uses a bitmap background for its gradient in both render modes", () => {
  const data = clone(SECTION_TYPES.offer.factory());
  const inline = buildEmailHtml({ ...clone(INITIAL_STATE), sections: [{ id: "offer-1", type: "offer", data }] }, { assetMode: "inline" });
  const external = buildEmailHtml({ ...clone(INITIAL_STATE), sections: [{ id: "offer-2", type: "offer", data }] }, { assetMode: "external" });

  assert.doesNotMatch(inline, /linear-gradient|radial-gradient/);
  assert.match(inline, /background-image:url\('https:\/\/decrypto-newsletter\.vercel\.app\/offer-bg\.png'\)/);
  assert.match(external, /background-image:url\('assets\/offer-bg\.png'\)/);
  assert.match(external, /v:fill type="frame" src="assets\/offer-bg\.png"/);
  assert.match(external, /Offre transfert/);
  assert.match(external, /10&nbsp;000&nbsp;€/);

  const withCustomBg = { ...clone(data), bg_image_url: "https://example.com/custom.png" };
  const customHtml = buildEmailHtml({ ...clone(INITIAL_STATE), sections: [{ id: "offer-3", type: "offer", data: withCustomBg }] }, { assetMode: "external" });
  assert.match(customHtml, /background-image:url\('https:\/\/example\.com\/custom\.png'\)/);
});

test("offer block's card style renders like the legacy commercial_offer block, which stays addable only for existing sections", () => {
  const addableTypes = getAddableSectionTypes().map(([type]) => type);
  assert.ok(addableTypes.includes("offer"));
  assert.ok(!addableTypes.includes("commercial_offer"));

  const legacyData = clone(SECTION_TYPES.commercial_offer.factory());
  const legacyHtml = buildEmailHtml({ ...clone(INITIAL_STATE), sections: [{ id: "co-1", type: "commercial_offer", data: legacyData }] });

  const cardData = { ...clone(SECTION_TYPES.offer.factory()), style: "card" };
  const cardHtml = buildEmailHtml({ ...clone(INITIAL_STATE), sections: [{ id: "offer-4", type: "offer", data: cardData }] });

  assert.match(legacyHtml, /linear-gradient\(135deg/);
  assert.match(cardHtml, /linear-gradient\(135deg/);
  assert.doesNotMatch(cardHtml, /offer-bg\.png/);

  const bannerHtml = buildEmailHtml({ ...clone(INITIAL_STATE), sections: [{ id: "offer-5", type: "offer", data: clone(SECTION_TYPES.offer.factory()) }] });
  assert.match(bannerHtml, /offer-bg\.png/);
  assert.doesNotMatch(bannerHtml, /linear-gradient\(135deg/);
});

test("b2b template renders every block with the Coinhouse Entreprises palette and no B2C leftovers", () => {
  // Couleurs / images propres à la charte B2C (magenta, violet sombre, crème, dégradés bitmap).
  const b2cOnly = [
    /#FF00AA/i, /#C0008A/i, /#1a0c2e/i, /#12081F/i, /#2D243A/i, /#2D203B/i, /#5F526D/i, /#5A2363/i,
    /#FAF7F1/i, /#FBF8F2/i, /#E5E1D8/i, /#D7C4F5/i, /#E7D8EE/i, /#101018/i, /#141418/i,
    /rgba\(\s*255,\s*0,\s*170/i, /rgba\(\s*135,\s*1,\s*255/i, /rgba\(\s*255,\s*75,\s*40/i,
    /gradient-header\.png/, /offer-bg\.png/, /event-bg\.png/, /macro-quote-bg\.png/, /referral-bg-(dark|light)\.png/,
  ];
  for (const theme of ["dark", "light"]) {
    for (const assetMode of ["inline", "external"]) {
      const html = buildEmailHtml(buildCompatState(theme, "b2b"), { assetMode });
      for (const pattern of b2cOnly) {
        assert.doesNotMatch(html, pattern, `${theme}/${assetMode}: ${pattern}`);
      }
      assert.doesNotMatch(html, /background=""/);
      assert.doesNotMatch(html, /url\(''\)/);
      assert.match(html, /#4141FF/i);
    }
  }

  // Le même état repasse en B2C sans rien perdre : le switch est purement visuel.
  const b2c = buildEmailHtml(buildCompatState("dark", "b2c"));
  assert.match(b2c, /#FF00AA/i);
  assert.match(b2c, /gradient-header\.png/);
});

test("b2b buttons use the site's blue-cyan-mint gradient with black text", () => {
  const html = buildEmailHtml(buildCompatState("dark", "b2b"));
  assert.match(html, /linear-gradient\(90deg, #4141FF 0%, #5FA0FF 22%, #7DFFFF 45%, #7FFFD4 70%, #55B896 100%\)/i);
  assert.match(html, /class="em-cta-link"[^>]*color:#000000/i);
  assert.match(html, /<v:roundrect[^>]*fillcolor="#7FFFD4"/i);
  // Le liseré du haut reprend le même dégradé.
  assert.match(html, /<td bgcolor="#4141FF" style="height:4px;[^"]*background-image:linear-gradient\(90deg, #4141FF 0%/i);
  const b2c = buildEmailHtml(buildCompatState("dark", "b2c"));
  assert.doesNotMatch(b2c, /#7DFFFF 45%/i);
  assert.match(b2c, /class="em-cta-link"[^>]*color:#ffffff/i);
});

test("b2b template swaps palette tokens while keeping the same structure", () => {
  const dark = buildEmailHtml(buildCompatState("dark", "b2b"));
  assert.match(dark, /background-color:#000000/i);
  const light = buildEmailHtml(buildCompatState("light", "b2b"));
  assert.match(light, /background-color:#E9EEF2/i);
  assert.match(light, /color:#000000/i);
});

