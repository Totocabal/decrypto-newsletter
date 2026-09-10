import test from "node:test";
import assert from "node:assert/strict";

import {
  BRAZE_PREFERENCE_CENTER_LIQUID,
  applyBrazePreferenceCenterLiquid,
} from "./exportAssetPack.js";

test("Braze export injects preference center Liquid and uses pf_url for unsubscribe", () => {
  const html = `<html><body>
<a href="{{\${set_user_to_unsubscribed_url}}">Se désinscrire</a>
</body></html>`;

  const result = applyBrazePreferenceCenterLiquid(html);

  assert.match(result, /<body>\s*\{% assign investor = \{\{custom_attribute\.\$\{has_investor_membership\}\}\} %\}/);
  assert.match(result, /\{% assign pf_url = \{\{preference_center\.\$\{Preference_Center_Abonnement_Investisseur\}\}\} %\}/);
  assert.match(result, /href="\{\{pf_url\}\}"/);
  assert.doesNotMatch(result, /set_user_to_unsubscribed_url/);
});

test("Braze preference center Liquid injection is idempotent", () => {
  const html = `<html><body>
${BRAZE_PREFERENCE_CENTER_LIQUID}
<a href="{{pf_url}}">Se désinscrire</a>
</body></html>`;

  const result = applyBrazePreferenceCenterLiquid(html);

  assert.equal((result.match(/assign pf_url/g) || []).length, 3);
});

test("Braze export forces custom unsubscribe footer links to pf_url", () => {
  const html = `<html><body>
<a href="https://example.com/custom-preference-center" style="color:#888;">Se désinscrire</a>
</body></html>`;

  const result = applyBrazePreferenceCenterLiquid(html);

  assert.match(result, /href="\{\{pf_url\}\}" style="color:#888;">Se désinscrire<\/a>/);
  assert.doesNotMatch(result, /custom-preference-center/);
});
