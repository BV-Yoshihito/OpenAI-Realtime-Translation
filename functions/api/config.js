import {
  DEFAULT_TRANSCRIPTION_MODEL,
  DEFAULT_TRANSLATION_MODEL,
  SUPPORTED_OUTPUT_LANGUAGES
} from "../../src/session.js";

export async function onRequest({ request, env }) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return json(405, { error: "Method not allowed." });
  }

  return json(200, {
    hasApiKey: Boolean(env.OPENAI_API_KEY),
    translationModel: env.OPENAI_TRANSLATION_MODEL || DEFAULT_TRANSLATION_MODEL,
    inputTranscriptionModel:
      env.OPENAI_INPUT_TRANSCRIPTION_MODEL || DEFAULT_TRANSCRIPTION_MODEL,
    languages: SUPPORTED_OUTPUT_LANGUAGES
  });
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
