import assert from "node:assert/strict";
import test from "node:test";
import { handler as configHandler } from "../netlify/functions/config.js";
import { handler as sessionHandler } from "../netlify/functions/session.js";

test("Netlify config function does not leak the API key", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "sk-secret";

  try {
    const response = await configHandler({ httpMethod: "GET" });
    const body = JSON.parse(response.body);

    assert.equal(response.statusCode, 200);
    assert.equal(body.hasApiKey, true);
    assert.equal("OPENAI_API_KEY" in body, false);
    assert.ok(body.languages.length >= 13);
  } finally {
    restoreEnv("OPENAI_API_KEY", previousKey);
  }
});

test("Netlify session function validates JSON and target language", async () => {
  const invalidJson = await sessionHandler({
    httpMethod: "POST",
    body: "{",
    isBase64Encoded: false
  });
  assert.equal(invalidJson.statusCode, 400);

  const invalidLanguage = await sessionHandler({
    httpMethod: "POST",
    body: JSON.stringify({ targetLanguage: "klingon" }),
    isBase64Encoded: false
  });
  assert.equal(invalidLanguage.statusCode, 400);
});

test("Netlify session function requires a server-side API key", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  try {
    const response = await sessionHandler({
      httpMethod: "POST",
      body: JSON.stringify({ targetLanguage: "ja" }),
      isBase64Encoded: false
    });
    const body = JSON.parse(response.body);

    assert.equal(response.statusCode, 500);
    assert.match(body.error, /OPENAI_API_KEY/);
  } finally {
    restoreEnv("OPENAI_API_KEY", previousKey);
  }
});

function restoreEnv(key, value) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
