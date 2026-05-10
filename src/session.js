export const DEFAULT_TRANSLATION_MODEL = "gpt-realtime-translate";
export const DEFAULT_TRANSCRIPTION_MODEL = "gpt-realtime-whisper";

export const SUPPORTED_OUTPUT_LANGUAGES = Object.freeze([
  { code: "ar", label: "Arabic", native: "العربية", accent: "#d97706" },
  { code: "de", label: "German", native: "Deutsch", accent: "#2563eb" },
  { code: "en", label: "English", native: "English", accent: "#111827" },
  { code: "es", label: "Spanish", native: "Español", accent: "#dc2626" },
  { code: "fr", label: "French", native: "Français", accent: "#7c3aed" },
  { code: "hi", label: "Hindi", native: "हिन्दी", accent: "#ea580c" },
  { code: "it", label: "Italian", native: "Italiano", accent: "#16a34a" },
  { code: "ja", label: "Japanese", native: "日本語", accent: "#0891b2" },
  { code: "ko", label: "Korean", native: "한국어", accent: "#db2777" },
  { code: "pt", label: "Portuguese", native: "Português", accent: "#059669" },
  { code: "ru", label: "Russian", native: "Русский", accent: "#4f46e5" },
  { code: "tr", label: "Turkish", native: "Türkçe", accent: "#be123c" },
  { code: "zh", label: "Chinese", native: "中文", accent: "#ca8a04" }
]);

const LANGUAGE_ALIASES = new Map([
  ["arabic", "ar"],
  ["deutsch", "de"],
  ["german", "de"],
  ["english", "en"],
  ["spanish", "es"],
  ["español", "es"],
  ["french", "fr"],
  ["français", "fr"],
  ["hindi", "hi"],
  ["italian", "it"],
  ["italiano", "it"],
  ["japanese", "ja"],
  ["日本語", "ja"],
  ["korean", "ko"],
  ["한국어", "ko"],
  ["portuguese", "pt"],
  ["português", "pt"],
  ["pt-br", "pt"],
  ["pt_br", "pt"],
  ["russian", "ru"],
  ["русский", "ru"],
  ["turkish", "tr"],
  ["türkçe", "tr"],
  ["chinese", "zh"],
  ["mandarin", "zh"],
  ["zh-cn", "zh"],
  ["zh_cn", "zh"],
  ["zh-hans", "zh"],
  ["中文", "zh"]
]);

export function normalizeTargetLanguage(value) {
  const raw = String(value ?? "ja").trim().toLowerCase();
  const normalized = LANGUAGE_ALIASES.get(raw) ?? raw;
  const language = SUPPORTED_OUTPUT_LANGUAGES.find((item) => item.code === normalized);
  if (!language) {
    const supported = SUPPORTED_OUTPUT_LANGUAGES.map((item) => item.code).join(", ");
    throw new Error(`Unsupported target language "${value}". Supported output languages: ${supported}.`);
  }
  return language.code;
}

export function buildClientSecretPayload({
  targetLanguage,
  model = DEFAULT_TRANSLATION_MODEL,
  inputTranscriptionModel = DEFAULT_TRANSCRIPTION_MODEL,
  inputTranscription = true,
  noiseReduction = "near_field"
}) {
  const inputAudio = {};
  if (inputTranscription) {
    inputAudio.transcription = { model: inputTranscriptionModel || DEFAULT_TRANSCRIPTION_MODEL };
  }
  if (noiseReduction && noiseReduction !== "off") {
    inputAudio.noise_reduction = { type: noiseReduction };
  }

  const audio = {
    output: { language: normalizeTargetLanguage(targetLanguage) }
  };

  if (Object.keys(inputAudio).length > 0) {
    audio.input = inputAudio;
  }

  return {
    session: {
      model: model || DEFAULT_TRANSLATION_MODEL,
      audio
    }
  };
}

export async function createClientSecret({
  apiKey,
  targetLanguage,
  model,
  inputTranscriptionModel,
  inputTranscription,
  noiseReduction,
  safetyIdentifier,
  fetchImpl = fetch
}) {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };

  if (safetyIdentifier) {
    headers["OpenAI-Safety-Identifier"] = safetyIdentifier;
  }

  const response = await fetchImpl(
    "https://api.openai.com/v1/realtime/translations/client_secrets",
    {
      method: "POST",
      headers,
      body: JSON.stringify(
        buildClientSecretPayload({
          targetLanguage,
          model,
          inputTranscriptionModel,
          inputTranscription,
          noiseReduction
        })
      )
    }
  );

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

  return data;
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

export class OpenAIRequestError extends Error {
  constructor({ message, status, body }) {
    super(message);
    this.name = "OpenAIRequestError";
    this.status = status;
    this.body = body;
  }
}
