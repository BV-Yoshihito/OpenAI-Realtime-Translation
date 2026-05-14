import {
  OpenAIRequestError,
  createClientSecret,
  normalizeTargetLanguage
} from "../../src/session.js";

const MAX_JSON_BYTES = 1_000_000;

export async function onRequest({ request, env }) {
  if (request.method !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  let body;
  try {
    body = await parseBody(request);
  } catch (error) {
    return json(400, {
      error: error instanceof Error ? error.message : "Invalid JSON body."
    });
  }

  let targetLanguage;
  try {
    targetLanguage = normalizeTargetLanguage(body.targetLanguage);
  } catch (error) {
    return json(400, {
      error: error instanceof Error ? error.message : "Invalid target language."
    });
  }

  if (!env.OPENAI_API_KEY) {
    return json(500, { error: "OPENAI_API_KEY is not configured." });
  }

  try {
    const result = await createClientSecret({
      apiKey: env.OPENAI_API_KEY,
      targetLanguage,
      model: env.OPENAI_TRANSLATION_MODEL,
      inputTranscriptionModel: env.OPENAI_INPUT_TRANSCRIPTION_MODEL,
      inputTranscription: body.inputTranscription !== false,
      noiseReduction: body.noiseReduction || "near_field",
      qualityPreset: body.qualityPreset,
      glossary: body.glossary,
      safetyIdentifier: env.OPENAI_SAFETY_IDENTIFIER || "cloudflare-pages-translation-dashboard"
    });

    return json(200, result);
  } catch (error) {
    if (error instanceof OpenAIRequestError) {
      return json(502, {
        error: error.message,
        status: error.status,
        details: error.body
      });
    }

    return json(500, {
      error: error instanceof Error ? error.message : "Unexpected server error."
    });
  }
}

async function parseBody(request) {
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).length > MAX_JSON_BYTES) {
    throw new Error("JSON body is too large.");
  }

  const trimmed = rawBody.trim();
  if (!trimmed) {
    return {};
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error("Invalid JSON body.");
  }
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}
