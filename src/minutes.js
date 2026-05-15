import { OpenAIRequestError } from "./session.js";

export const DEFAULT_MINUTES_MODEL = "gpt-5.4-mini";

const MAX_PAIRS = 160;
const MAX_TEXT_LENGTH = 900;

export const MEETING_MINUTES_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    decisions: {
      type: "array",
      items: { type: "string" }
    },
    actionItems: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          task: { type: "string" },
          owner: { type: "string" },
          due: { type: "string" },
          evidence: { type: "string" }
        },
        required: ["task", "owner", "due", "evidence"]
      }
    },
    questions: {
      type: "array",
      items: { type: "string" }
    },
    risks: {
      type: "array",
      items: { type: "string" }
    },
    followUpEmail: { type: "string" },
    meetingHealth: { type: "string" }
  },
  required: [
    "summary",
    "decisions",
    "actionItems",
    "questions",
    "risks",
    "followUpEmail",
    "meetingHealth"
  ]
});

const MINUTES_INSTRUCTIONS = [
  "You create concise, faithful Japanese meeting minutes from bilingual realtime translation logs.",
  "Use only the provided transcript. Do not invent names, commitments, dates, prices, or decisions.",
  "Prefer the translated text when it is available, but use the source text to preserve names and evidence.",
  "Return Japanese unless a proper noun or quoted phrase should remain in its source language.",
  "If an item is unknown, use an empty string or an empty array instead of guessing. Return JSON only."
].join("\n");

export function buildMinutesRequestPayload({
  meeting,
  model = DEFAULT_MINUTES_MODEL
} = {}) {
  const normalizedMeeting = normalizeMeetingForMinutes(meeting);
  return {
    model: model || DEFAULT_MINUTES_MODEL,
    instructions: MINUTES_INSTRUCTIONS,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify(normalizedMeeting)
          }
        ]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "meeting_minutes",
        strict: true,
        schema: MEETING_MINUTES_SCHEMA
      }
    },
    max_output_tokens: 2600
  };
}

export function normalizeMeetingForMinutes(meeting = {}) {
  const pairs = extractMeetingPairs(meeting);
  const normalizedPairs = pairs.slice(-MAX_PAIRS).map((pair, index) => ({
    index: Number(pair.index) || index + 1,
    time: safeText(pair.time || pair.startSeconds || "", 32),
    tags: Array.isArray(pair.tags) ? pair.tags.map((tag) => safeText(tag, 32)).slice(0, 6) : [],
    sourceSpeaker: safeText(pair.sourceSpeaker || meeting.translationProfile?.speakers?.source || "Speaker", 80),
    translatedSpeaker: safeText(pair.translatedSpeaker || meeting.translationProfile?.speakers?.translated || "Interpreter", 80),
    source: safeText(extractText(pair.source) || pair.sourceText || "", MAX_TEXT_LENGTH),
    translated: safeText(extractText(pair.translated) || pair.translatedText || "", MAX_TEXT_LENGTH)
  }));

  return {
    title: safeText(meeting.title || "Realtime Meeting", 160),
    targetLanguage: safeText(meeting.targetLanguage || "", 32),
    mode: safeText(meeting.mode || "meeting", 32),
    generatedAt: safeText(meeting.generatedAt || new Date().toISOString(), 80),
    durationSeconds: Number(meeting.durationSeconds) || 0,
    translationProfile: {
      preset: {
        id: safeText(meeting.translationProfile?.preset?.id || "", 48),
        label: safeText(meeting.translationProfile?.preset?.label || "", 80)
      },
      glossary: safeText(meeting.translationProfile?.glossary || "", 1600),
      speakers: {
        source: safeText(meeting.translationProfile?.speakers?.source || "Speaker", 80),
        translated: safeText(meeting.translationProfile?.speakers?.translated || "Interpreter", 80)
      }
    },
    pairs: normalizedPairs
  };
}

function extractMeetingPairs(meeting = {}) {
  if (Array.isArray(meeting.pairs) && meeting.pairs.length) {
    return meeting.pairs;
  }

  const segmentPairs = buildPairsFromSegments(meeting);
  if (segmentPairs.length) {
    return segmentPairs;
  }

  const source = meeting.sourceTranscript || meeting.sourceText || meeting.transcript?.source || "";
  const translated = meeting.translatedTranscript || meeting.translatedText || meeting.transcript?.translated || "";
  if (source || translated) {
    return [{
      index: 1,
      sourceSpeaker: meeting.translationProfile?.speakers?.source || "Speaker",
      translatedSpeaker: meeting.translationProfile?.speakers?.translated || "Interpreter",
      source,
      translated
    }];
  }

  return [];
}

function buildPairsFromSegments(meeting = {}) {
  const segments = Array.isArray(meeting.segments) ? meeting.segments : [];
  if (!segments.length) {
    return [];
  }

  const sourceSegments = sortSegments(segments.filter((segment) => segment.kind === "source"));
  const translatedSegments = sortSegments(segments.filter((segment) => segment.kind === "translated"));
  const total = Math.max(sourceSegments.length, translatedSegments.length);

  return Array.from({ length: total }, (_, index) => {
    const source = sourceSegments[index] || null;
    const translated = translatedSegments[index] || null;
    return {
      index: index + 1,
      startSeconds: source?.startSeconds ?? translated?.startSeconds ?? "",
      sourceSpeaker: source?.speaker || meeting.translationProfile?.speakers?.source || "Speaker",
      translatedSpeaker: translated?.speaker || meeting.translationProfile?.speakers?.translated || "Interpreter",
      source: source?.text || "",
      translated: translated?.text || ""
    };
  });
}

function sortSegments(segments) {
  return segments.slice().sort((a, b) => (Number(a.startSeconds) || 0) - (Number(b.startSeconds) || 0));
}

export async function createMeetingMinutes({
  apiKey,
  meeting,
  model = DEFAULT_MINUTES_MODEL,
  safetyIdentifier,
  fetchImpl = fetch
} = {}) {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: buildHeaders({ apiKey, safetyIdentifier }),
    body: JSON.stringify(buildMinutesRequestPayload({ meeting, model }))
  });

  const body = await response.text();
  let data;
  try {
    data = body ? JSON.parse(body) : {};
  } catch {
    data = body;
  }

  if (!response.ok) {
    throw new OpenAIRequestError({
      message: extractErrorMessage(data, response.status),
      status: response.status,
      body: data
    });
  }

  const text = extractResponseText(data);
  let minutes;
  try {
    minutes = JSON.parse(text);
  } catch {
    throw new Error("Minutes response was not valid JSON.");
  }

  return {
    model: data.model || model || DEFAULT_MINUTES_MODEL,
    minutes: normalizeMinutes(minutes)
  };
}

function buildHeaders({ apiKey, safetyIdentifier }) {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };
  if (safetyIdentifier) {
    headers["OpenAI-Safety-Identifier"] = safetyIdentifier;
  }
  return headers;
}

export function extractResponseText(data) {
  if (typeof data?.output_text === "string") {
    return data.output_text;
  }

  const chunks = [];
  for (const item of data?.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string") {
        chunks.push(content.text);
      }
    }
  }

  const text = chunks.join("\n").trim();
  if (!text) {
    throw new Error("Minutes response did not include output text.");
  }
  return text;
}

export function normalizeMinutes(minutes = {}) {
  return {
    summary: safeText(minutes.summary || "", 2400),
    decisions: normalizeStringArray(minutes.decisions, 12, 500),
    actionItems: Array.isArray(minutes.actionItems)
      ? minutes.actionItems.slice(0, 20).map((item) => ({
          task: safeText(item?.task || "", 500),
          owner: safeText(item?.owner || "", 120),
          due: safeText(item?.due || "", 120),
          evidence: safeText(item?.evidence || "", 500)
        }))
      : [],
    questions: normalizeStringArray(minutes.questions, 12, 500),
    risks: normalizeStringArray(minutes.risks, 12, 500),
    followUpEmail: safeText(minutes.followUpEmail || "", 2400),
    meetingHealth: safeText(minutes.meetingHealth || "", 500)
  };
}

function normalizeStringArray(value, limit, maxLength) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.slice(0, limit).map((item) => safeText(item, maxLength)).filter(Boolean);
}

function extractText(value) {
  if (typeof value === "string") {
    return value;
  }
  return value?.text || "";
}

function safeText(value, maxLength) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .trim()
    .slice(0, maxLength);
}

function extractErrorMessage(data, status) {
  if (data?.error?.message) {
    return data.error.message;
  }
  if (typeof data === "string" && data.trim()) {
    return data;
  }
  return `OpenAI request failed with status ${status}.`;
}
