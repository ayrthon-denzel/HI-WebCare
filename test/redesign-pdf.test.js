import test from "node:test";
import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { CONTACT, streamRedesignPdf } from "../src/redesign-pdf.js";

const report = {
  url: "https://example.com",
  createdAt: new Date().toISOString(),
  scores: { "Website Health": 48 },
  counts: { critical: 1, important: 3 },
  redesign: { message: "Une refonte est recommandée." },
  issues: [
    {
      level: "critical",
      title: "Navigation difficile",
      explanation: "Le parcours principal manque de clarté.",
      recommendation: "Simplifier le menu et les appels à l’action.",
    },
  ],
};

test("uses the validated HI MARKETING contact details", () => {
  assert.equal(CONTACT.phone, "+221 76 900 53 96");
  assert.equal(CONTACT.whatsapp, "+221 78 153 32 25");
  assert.equal(CONTACT.email, "himarketing.africa@gmail.com");
});

test("generates a valid PDF redesign proposal", async () => {
  const stream = new PassThrough();
  const chunks = [];
  stream.on("data", (chunk) => chunks.push(chunk));
  const done = new Promise((resolve, reject) => {
    stream.on("end", resolve);
    stream.on("error", reject);
  });
  streamRedesignPdf(report, stream);
  await done;
  const pdf = Buffer.concat(chunks);
  assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
  assert.ok(pdf.length > 2000);
});
