import test from "node:test";
import assert from "node:assert/strict";
import { minifyEmailHtml } from "./minifyEmailHtml.js";
import { buildEmailHtml } from "../render/buildEmail.js";
import { INITIAL_STATE } from "../config/schema.js";

test("minify keeps Liquid, MSO conditionals and visible text intact", () => {
  const src = `<html><head><style>
    .used { color: #FFFFFF; }
    .unused { color: red; }
    @media only screen and (max-width: 640px) {
      .used { padding: 0 !important; }
      .unused { padding: 1px !important; }
    }
  </style></head><body>
  {% assign pf_url = {{preference_center.\${Preference_Center}}} %}
  <!-- commentaire -->
  <!--[if mso]><table><tr><td><![endif]-->
  <table>
    <tr>
      <td class="used" style="font-family: 'Sora', Arial; color: #00FFFF;">Bonjour  {{ contact.firstname }}</td>
    </tr>
  </table>
  </body></html>`;
  const out = minifyEmailHtml(src);
  assert.ok(out.includes("{% assign pf_url = {{preference_center.${Preference_Center}}} %}"));
  assert.ok(out.includes("{{ contact.firstname }}"));
  assert.ok(out.includes("<!--[if mso]>"));
  assert.ok(out.includes("<![endif]-->"));
  assert.ok(!out.includes("commentaire"));
  assert.ok(!out.includes(".unused"));
  assert.ok(out.includes('style="font-family:Sora,Arial;color:#0ff"'));
});

test("minify shrinks a full newsletter without losing content", () => {
  const html = buildEmailHtml(INITIAL_STATE, { assetMode: "external" });
  const out = minifyEmailHtml(html);
  assert.ok(out.length < html.length * 0.85);
  const text = (h) => h.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  assert.equal(text(out), text(html));
});
