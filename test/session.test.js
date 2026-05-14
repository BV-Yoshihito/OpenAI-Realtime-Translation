import assert from "node:assert/strict";
import test from "node:test";
import {
  OpenAIRequestError,
  buildClientSecretPayload,
  buildTranslationInstructions,
  createClientSecret,
  normalizeQualityPreset,
  normalizeTargetLanguage
} from "../src/session.js";
import { publicConfig } from "../src/server.js";

test("normalizes supported target language aliases", () => {
  assert.equal(normalizeTargetLanguage("Japanese"), "ja");
  assert.equal(normalizeTargetLanguage("pt-BR"), "pt");
  assert.equal(normalizeTargetLanguage("中文"), "zh");
});

test("rejects unsupported target languages", () => {
  assert.throws(() => normalizeTargetLanguage("klingon"), /Unsupported target language/);
});

test("normalizes translation quality presets", () => {
  assert.equal(normalizeQualityPreset("business").label, "Business Meeting");
  assert.equal(normalizeQualityPreset("unknown").id, "natural");
});

test("builds translation instructions with glossary", () => {
  const instructions = buildTranslationInstructions({
    targetLanguage: "ja",
    qualityPreset: "technical",
    glossary: "Brainverse = ブレインバース\nGPT-5 = GPT-5"
  });

  assert.match(instructions, /Japanese/);
  assert.match(instructions, /technical accuracy/i);
  assert.match(instructions, /Brainverse = ブレインバース/);
});

test("builds a realtime translation client secret payload", () => {
  const payload = buildClientSecretPayload({
    targetLanguage: "ja",
    model: "gpt-realtime-translate",
    inputTranscriptionModel: "gpt-realtime-whisper",
    inputTranscription: true,
    noiseReduction: "near_field"
  });

  assert.deepEqual(payload, {
    session: {
      model: "gpt-realtime-translate",
      audio: {
        output: { language: "ja" },
        input: {
          transcription: { model: "gpt-realtime-whisper" },
          noise_reduction: { type: "near_field" }
        }
      }
    }
  });
});

test("omits optional input audio settings when disabled", () => {
  const payload = buildClientSecretPayload({
    targetLanguage: "es",
    inputTranscription: false,
    noiseReduction: "off"
  });

  assert.deepEqual(payload.session.audio, {
    output: { language: "es" }
  });
  assert.equal("instructions" in payload.session, false);
});

test("createClientSecret calls the OpenAI client secret endpoint", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ value: "secret_123" }), { status: 200 });
  };

  const response = await createClientSecret({
    apiKey: "sk-test",
    targetLanguage: "ja",
    safetyIdentifier: "test-user",
    fetchImpl
  });

  assert.equal(response.value, "secret_123");
  assert.equal(
    calls[0].url,
    "https://api.openai.com/v1/realtime/translations/client_secrets"
  );
  assert.equal(calls[0].init.headers.Authorization, "Bearer sk-test");
  assert.equal(calls[0].init.headers["OpenAI-Safety-Identifier"], "test-user");
  const requestBody = JSON.parse(calls[0].init.body);
  assert.equal(requestBody.session.audio.output.language, "ja");
  assert.equal("instructions" in requestBody.session, false);
});

test("createClientSecret surfaces OpenAI request errors", async () => {
  const fetchImpl = async () =>
    new Response(JSON.stringify({ error: { message: "bad request" } }), { status: 400 });

  await assert.rejects(
    () => createClientSecret({ apiKey: "sk-test", targetLanguage: "ja", fetchImpl }),
    (error) => error instanceof OpenAIRequestError && error.status === 400
  );
});

test("public config does not leak the API key", () => {
  const config = publicConfig({
    OPENAI_API_KEY: "sk-secret",
    OPENAI_TRANSLATION_MODEL: "gpt-realtime-translate"
  });

  assert.equal(config.hasApiKey, true);
  assert.equal(config.translationModel, "gpt-realtime-translate");
  assert.equal("OPENAI_API_KEY" in config, false);
  assert.ok(config.languages.length >= 13);
  assert.ok(config.qualityPresets.length >= 5);
});
