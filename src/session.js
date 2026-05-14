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

export const TRANSLATION_QUALITY_PRESETS = Object.freeze([
  {
    id: "natural",
    label: "Natural",
    description: "Everyday interpretation with faithful, natural wording.",
    instructions:
      "Use natural, faithful wording. Preserve the speaker's intent and avoid adding explanations that were not spoken."
  },
  {
    id: "business",
    label: "Business Meeting",
    description: "Polished business language for meetings and client calls.",
    instructions:
      "Use polished business language suitable for meetings. Keep sentences concise, professional, and easy to follow in real time."
  },
  {
    id: "technical",
    label: "Technical",
    description: "Preserve product names, acronyms, APIs, and technical terms.",
    instructions:
      "Prioritize technical accuracy. Preserve product names, acronyms, API names, URLs, model names, version numbers, and code-like terms unless a glossary says otherwise."
  },
  {
    id: "executive",
    label: "Executive Brief",
    description: "Concise, formal wording for executive conversations.",
    instructions:
      "Use concise, formal language for executive communication. Remove filler where possible while preserving decisions, risks, numbers, and commitments."
  },
  {
    id: "casual",
    label: "Casual",
    description: "Natural conversation with a relaxed tone.",
    instructions:
      "Use a relaxed conversational tone. Keep the translation natural and friendly while preserving meaning."
  }
]);

const QUALITY_PRESET_BY_ID = new Map(
  TRANSLATION_QUALITY_PRESETS.map((preset) => [preset.id, preset])
);

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

export function normalizeQualityPreset(value) {
  const raw = String(value ?? "natural").trim().toLowerCase();
  return QUALITY_PRESET_BY_ID.get(raw) ?? QUALITY_PRESET_BY_ID.get("natural");
}

export function buildTranslationInstructions({
  targetLanguage = "ja",
  qualityPreset = "natural",
  glossary = ""
} = {}) {
  const targetCode = normalizeTargetLanguage(targetLanguage);
  const language = SUPPORTED_OUTPUT_LANGUAGES.find((item) => item.code === targetCode);
  const preset = normalizeQualityPreset(qualityPreset);
  const cleanedGlossary = cleanInstructionText(glossary, 1200);
  const lines = [
    `Translate incoming speech into ${language.label} (${language.native}).`,
    preset.instructions,
    "Keep the translation faithful to the speaker. Do not invent details, commitments, or names.",
    "If the speaker pauses, keep output brief enough for real-time listening."
  ];

  if (cleanedGlossary) {
    lines.push(
      "Priority glossary and naming rules. Follow these mappings when they appear in the audio:",
      cleanedGlossary
    );
  }

  return lines.join("\n");
}

function cleanInstructionText(value, maxLength) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, maxLength);
}

export function buildClientSecretPayload({
  targetLanguage,
  model = DEFAULT_TRANSLATION_MODEL,
  inputTranscriptionModel = DEFAULT_TRANSCRIPTION_MODEL,
  inputTranscription = true,
  noiseReduction = "near_field",
  qualityPreset = "natural",
  glossary = ""
}) {
  const inputAudio = {};
  if (inputTranscription) {
    inputAudio.transcription = { model: inputTranscriptionModel || DEFAULT_TRANSCRIPTION_MODEL };
  }
  if (noiseReduction && noiseReduction !== "off") {
    inputAudio.noise_reduction = { type: noiseReduction };
  }

  const outputLanguage = normalizeTargetLanguage(targetLanguage);
  const audio = {
    output: { language: outputLanguage }
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
  qualityPreset,
  glossary,
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
          noiseReduction,
          qualityPreset,
          glossary
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
