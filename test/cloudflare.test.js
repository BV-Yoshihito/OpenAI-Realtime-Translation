import assert from "node:assert/strict";
import test from "node:test";
import { onRequest as configHandler } from "../functions/api/config.js";
import { onRequest as sessionHandler } from "../functions/api/session.js";
import { onRequest as minutesHandler } from "../functions/api/minutes.js";

test("Cloudflare config function does not leak the API key", async () => {
  const response = await configHandler({
    request: new Request("https://example.com/api/config"),
    env: { OPENAI_API_KEY: "sk-secret" }
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.hasApiKey, true);
  assert.equal("OPENAI_API_KEY" in body, false);
  assert.ok(body.languages.length >= 13);
  assert.ok(body.qualityPresets.length >= 5);
  assert.equal(body.minutesModel, "gpt-5.4-mini");
});

test("Cloudflare session function validates JSON and target language", async () => {
  const invalidJson = await sessionHandler({
    request: new Request("https://example.com/api/session", {
      method: "POST",
      body: "{"
    }),
    env: {}
  });
  assert.equal(invalidJson.status, 400);

  const invalidLanguage = await sessionHandler({
    request: new Request("https://example.com/api/session", {
      method: "POST",
      body: JSON.stringify({ targetLanguage: "klingon" })
    }),
    env: {}
  });
  assert.equal(invalidLanguage.status, 400);
});

test("Cloudflare session function requires a server-side API key", async () => {
  const response = await sessionHandler({
    request: new Request("https://example.com/api/session", {
      method: "POST",
      body: JSON.stringify({ targetLanguage: "ja" })
    }),
    env: {}
  });
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.match(body.error, /OPENAI_API_KEY/);
});


test("Cloudflare minutes function validates JSON and requires a key", async () => {
  const invalidJson = await minutesHandler({
    request: new Request("https://example.com/api/minutes", {
      method: "POST",
      body: "{"
    }),
    env: {}
  });
  assert.equal(invalidJson.status, 400);

  const noKey = await minutesHandler({
    request: new Request("https://example.com/api/minutes", {
      method: "POST",
      body: JSON.stringify({ meeting: { title: "Demo", pairs: [] } })
    }),
    env: {}
  });
  const body = await noKey.json();

  assert.equal(noKey.status, 500);
  assert.match(body.error, /OPENAI_API_KEY/);
});
