import { createMeetingMinutes } from "../../src/minutes.js";
import { OpenAIRequestError } from "../../src/session.js";

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

  if (!env.OPENAI_API_KEY) {
    return json(500, { error: "OPENAI_API_KEY is not configured." });
  }

  try {
    const result = await createMeetingMinutes({
      apiKey: env.OPENAI_API_KEY,
      meeting: body.meeting || body,
      model: env.OPENAI_MINUTES_MODEL,
      safetyIdentifier: env.OPENAI_SAFETY_IDENTIFIER || "cloudflare-pages-translation-minutes"
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
