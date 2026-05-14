import {
  OpenAIRequestError,
  createClientSecret,
  normalizeTargetLanguage
} from "../../src/session.js";

const MAX_JSON_BYTES = 1_000_000;

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  let body;
  try {
    body = parseBody(event);
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

  if (!process.env.OPENAI_API_KEY) {
    return json(500, { error: "OPENAI_API_KEY is not configured." });
  }

  try {
    const result = await createClientSecret({
      apiKey: process.env.OPENAI_API_KEY,
      targetLanguage,
      model: process.env.OPENAI_TRANSLATION_MODEL,
      inputTranscriptionModel: process.env.OPENAI_INPUT_TRANSCRIPTION_MODEL,
      inputTranscription: body.inputTranscription !== false,
      noiseReduction: body.noiseReduction || "near_field",
      qualityPreset: body.qualityPreset,
      glossary: body.glossary,
      safetyIdentifier: process.env.OPENAI_SAFETY_IDENTIFIER || "netlify-translation-dashboard"
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

function parseBody(event) {
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64").toString("utf8")
    : event.body || "";

  if (Buffer.byteLength(rawBody, "utf8") > MAX_JSON_BYTES) {
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

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify(body)
  };
}
