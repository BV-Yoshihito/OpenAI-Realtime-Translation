import {
  DEFAULT_TRANSCRIPTION_MODEL,
  DEFAULT_TRANSLATION_MODEL,
  SUPPORTED_OUTPUT_LANGUAGES
} from "../../src/session.js";

export async function handler(event) {
  if (event.httpMethod !== "GET" && event.httpMethod !== "HEAD") {
    return json(405, { error: "Method not allowed." });
  }

  return json(200, {
    hasApiKey: Boolean(process.env.OPENAI_API_KEY),
    translationModel: process.env.OPENAI_TRANSLATION_MODEL || DEFAULT_TRANSLATION_MODEL,
    inputTranscriptionModel:
      process.env.OPENAI_INPUT_TRANSCRIPTION_MODEL || DEFAULT_TRANSCRIPTION_MODEL,
    languages: SUPPORTED_OUTPUT_LANGUAGES
  });
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
