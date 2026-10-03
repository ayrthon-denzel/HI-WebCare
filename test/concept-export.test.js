import test from "node:test";
import assert from "node:assert/strict";
import { assessRedesign, conceptHtml } from "../src/concept-export.js";

const report = (overrides = {}) => ({
  url: "https://example.com",
  scores: { "Website Health": 85, "Design / UX": 82, Mobile: 88 },
  counts: { critical: 0, important: 1 },
  meta: { title: "Exemple", content: { sections: ["Service"] } },
  ...overrides,
});

test("does not recommend a redesign for a healthy site", () => {
  assert.equal(assessRedesign(report()).recommended, false);
});

test("recommends a redesign only when the audit justifies it", () => {
  assert.equal(
    assessRedesign(
      report({
        scores: { "Website Health": 54, "Design / UX": 58, Mobile: 60 },
        counts: { critical: 1, important: 4 },
      }),
    ).recommended,
    true,
  );
});

test("exports the improved site represented by the redesign", () => {
  const html = conceptHtml(report());
  assert.match(html, /Exemple/);
  assert.match(html, /Service/);
  assert.match(html, /style\.css/);
  assert.doesNotMatch(html, /Télécharger/);
});
