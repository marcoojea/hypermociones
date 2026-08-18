import assert from "node:assert/strict";
import test from "node:test";

import { isSameOriginMutation } from "../app/api/request-security.ts";
import { defaultPreferences, isProductPreferences } from "../domain/preferences.ts";

test("accepts account mutations from the application origin", () => {
  const request = new Request("https://hypermociones.example/api/account", { headers: { origin: "https://hypermociones.example", "sec-fetch-site": "same-origin" } });
  assert.equal(isSameOriginMutation(request), true);
});

test("rejects account mutations from a foreign origin", () => {
  const request = new Request("https://hypermociones.example/api/account", { headers: { origin: "https://attacker.example", "sec-fetch-site": "cross-site" } });
  assert.equal(isSameOriginMutation(request), false);
});

test("uses accessible product preferences and rejects incomplete values", () => {
  assert.deepEqual(defaultPreferences(), { version: 1, onboardingCompleted: false, compactMode: false, reducedMotion: false, updatedAt: "1970-01-01T00:00:00.000Z" });
  assert.equal(isProductPreferences(defaultPreferences()), true);
  assert.equal(isProductPreferences({ version: 1, compactMode: false }), false);
});
