const TRANSLATION_CALL_URL = "https://api.openai.com/v1/realtime/translations/calls";
const MAX_EVENT_LINES = 80;
const MAX_HISTORY_ITEMS = 18;
const LOCAL_APP_URL = "http://127.0.0.1:5173/";
const FALLBACK_LANGUAGES = Object.freeze([
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
const QUALITY_PRESETS = Object.freeze([
  {
    id: "natural",
    label: "Natural",
    description: "Everyday interpretation with faithful, natural wording."
  },
  {
    id: "business",
    label: "Business Meeting",
    description: "Polished business language for meetings and client calls."
  },
  {
    id: "technical",
    label: "Technical",
    description: "Preserve product names, acronyms, APIs, and technical terms."
  },
  {
    id: "executive",
    label: "Executive Brief",
    description: "Concise, formal wording for executive conversations."
  },
  {
    id: "casual",
    label: "Casual",
    description: "Natural conversation with a relaxed tone."
  }
]);
const HIGHLIGHT_RULES = Object.freeze([
  { id: "decision", label: "Decision", pattern: /(decide|decided|approved|agree|agreed|decision|決定|承認|合意|採用)/i },
  { id: "action", label: "Action", pattern: /(action item|follow up|please|send|share|担当|対応|送って|お願いします|確認します)/i },
  { id: "question", label: "Question", pattern: /\?|？|(can you|could you|how|what|why|when|どの|どう|なぜ|いつ)/i },
  { id: "risk", label: "Risk", pattern: /(risk|issue|blocked|blocker|concern|delay|problem|リスク|懸念|課題|問題|遅延)/i }
]);
const FALLBACK_CONFIG = Object.freeze({
  hasApiKey: false,
  translationModel: "demo-only",
  inputTranscriptionModel: "demo-only",
  minutesModel: "demo-only",
  languages: FALLBACK_LANGUAGES,
  qualityPresets: QUALITY_PRESETS
});

const elements = {
  apiCheckLabel: document.querySelector("#apiCheckLabel"),
  apiKeyBadge: document.querySelector("#apiKeyBadge"),
  audioMeter: document.querySelector(".audio-meter"),
  audioState: document.querySelector("#audioState"),
  clearButton: document.querySelector("#clearButton"),
  connectionStatus: document.querySelector("#connectionStatus"),
  copyMinutesButton: document.querySelector("#copyMinutesButton"),
  copyButton: document.querySelector("#copyButton"),
  demoButton: document.querySelector("#demoButton"),
  downloadButton: document.querySelector("#downloadButton"),
  downloadMinutesButton: document.querySelector("#downloadMinutesButton"),
  eventCount: document.querySelector("#eventCount"),
  eventLog: document.querySelector("#eventLog"),
  exportFormat: document.querySelector("#exportFormat"),
  glossary: document.querySelector("#glossary"),
  generateMinutesButton: document.querySelector("#generateMinutesButton"),
  highlightCount: document.querySelector("#highlightCount"),
  inputCheckLabel: document.querySelector("#inputCheckLabel"),
  inputTranscription: document.querySelector("#inputTranscription"),
  languageStrip: document.querySelector("#languageStrip"),
  latencyEstimate: document.querySelector("#latencyEstimate"),
  meetingFeed: document.querySelector("#meetingFeed"),
  meetingSummary: document.querySelector("#meetingSummary"),
  meetingTitle: document.querySelector("#meetingTitle"),
  meetingTitleBadge: document.querySelector("#meetingTitleBadge"),
  modeBadge: document.querySelector("#modeBadge"),
  minutesOutput: document.querySelector("#minutesOutput"),
  minutesStatus: document.querySelector("#minutesStatus"),
  modelBadge: document.querySelector("#modelBadge"),
  noiseReduction: document.querySelector("#noiseReduction"),
  originalAudio: document.querySelector("#originalAudio"),
  originalVolume: document.querySelector("#originalVolume"),
  originalVolumeValue: document.querySelector("#originalVolumeValue"),
  outputRate: document.querySelector("#outputRate"),
  presetBadge: document.querySelector("#presetBadge"),
  qualityPreset: document.querySelector("#qualityPreset"),
  permissionCheckLabel: document.querySelector("#permissionCheckLabel"),
  runtimeBanner: document.querySelector("#runtimeBanner"),
  readyApi: document.querySelector("#readyApi"),
  readyInput: document.querySelector("#readyInput"),
  readyMinutes: document.querySelector("#readyMinutes"),
  readyPermission: document.querySelector("#readyPermission"),
  readyTranscript: document.querySelector("#readyTranscript"),
  runtimeCheckLabel: document.querySelector("#runtimeCheckLabel"),
  segmentCount: document.querySelector("#segmentCount"),
  sessionClock: document.querySelector("#sessionClock"),
  showFinalOnly: document.querySelector("#showFinalOnly"),
  signalCanvas: document.querySelector("#signalCanvas"),
  signalLabel: document.querySelector("#signalLabel"),
  sourceChars: document.querySelector("#sourceChars"),
  sourceHistory: document.querySelector("#sourceHistory"),
  sourceKind: document.querySelector("#sourceKind"),
  sourceSpeaker: document.querySelector("#sourceSpeaker"),
  sourceLive: document.querySelector("#sourceLive"),
  sourcePlaceholder: document.querySelector("#sourcePlaceholder"),
  sourceVideo: document.querySelector("#sourceVideo"),
  startButton: document.querySelector("#startButton"),
  statusLabel: document.querySelector("#statusLabel"),
  stopButton: document.querySelector("#stopButton"),
  systemNote: document.querySelector("#systemNote"),
  targetBadge: document.querySelector("#targetBadge"),
  targetLanguage: document.querySelector("#targetLanguage"),
  translatedAudio: document.querySelector("#translatedAudio"),
  translatedChars: document.querySelector("#translatedChars"),
  translatedHistory: document.querySelector("#translatedHistory"),
  translatedLive: document.querySelector("#translatedLive"),
  translatedSpeaker: document.querySelector("#translatedSpeaker"),
  translatedVolume: document.querySelector("#translatedVolume"),
  translatedVolumeValue: document.querySelector("#translatedVolumeValue"),
  visualMode: document.querySelector("#visualMode"),
  webrtcState: document.querySelector("#webrtcState")
};

const state = {
  config: null,
  configLoadError: "",
  isFileMode: window.location.protocol === "file:",
  permissionState: { label: "On Start", tone: "warn" },
  pc: null,
  dataChannel: null,
  sourceStream: null,
  startedAt: null,
  elapsedSeconds: 0,
  clockTimer: null,
  demoTimers: [],
  analyser: null,
  audioContext: null,
  animationFrame: null,
  isRunning: false,
  isDemo: false,
  demoVoice: null,
  sessionMode: "dashboard",
  visualMode: "wave",
  qualityPresets: QUALITY_PRESETS,
  minutesModel: "",
  minutes: null,
  isGeneratingMinutes: false,
  nextSegmentId: 1,
  currentSource: "",
  currentTranslated: "",
  fullSource: [],
  fullTranslated: [],
  segments: [],
  metrics: {
    events: 0,
    inputChars: 0,
    outputChars: 0,
    firstInputAt: null,
    firstOutputAt: null,
    connectionAt: null
  }
};

const demoScript = [
  ["Welcome everyone. Today we are testing a continuous interpretation workflow.", "皆さん、ようこそ。今日は継続的な通訳ワークフローをテストしています。"],
  ["We need to decide the launch schedule by Friday.", "金曜日までにローンチ日程を決定する必要があります。"],
  ["Please send the updated deck after the call as an action item.", "アクション項目として、通話後に更新版の資料を送ってください。"],
  ["The main risk is latency during larger webinars.", "主なリスクは、大規模なウェビナー中の遅延です。"],
  ["Can you confirm the product names in the glossary before we share the recording?", "録画を共有する前に、用語集の製品名を確認してもらえますか。"]
];

init().catch((error) => {
  const message = getErrorMessage(error);
  setStatus("error", "Error");
  writeNote(message);
  logEvent("startup.error", message, "error");
});

async function init() {
  bindControls();
  restorePreferences();
  updateVolumes();
  updateRuntimeChecks();
  startSignalLoop();
  await loadConfig();
  resetTranscripts();
  setRunningUi(false);
  setStatus("idle", "Idle");
  writeNote(initialSystemNote());
}

function bindControls() {
  elements.startButton.addEventListener("click", () => startSession().catch(handleFatalError));
  elements.demoButton.addEventListener("click", startDemo);
  elements.stopButton.addEventListener("click", stopSession);
  elements.clearButton.addEventListener("click", resetTranscripts);
  elements.copyButton.addEventListener("click", copyTranscripts);
  elements.downloadButton.addEventListener("click", downloadTranscripts);
  elements.generateMinutesButton.addEventListener("click", () => generateMinutes().catch(handleMinutesError));
  elements.copyMinutesButton.addEventListener("click", copyMinutes);
  elements.downloadMinutesButton.addEventListener("click", downloadMinutes);
  elements.exportFormat.addEventListener("change", updateMeetingReadiness);
  elements.meetingTitle.addEventListener("input", () => {
    localStorage.setItem("translation.meetingTitle", currentMeetingTitle());
    updateMeetingMeta();
  });
  elements.qualityPreset.addEventListener("change", () => updateTranslationProfile({ persist: true, announce: true }));
  elements.glossary.addEventListener("input", () => {
    localStorage.setItem("translation.glossary", currentGlossary());
  });
  elements.sourceSpeaker.addEventListener("input", () => updateSpeakerLabels({ persist: true }));
  elements.translatedSpeaker.addEventListener("input", () => updateSpeakerLabels({ persist: true }));
  elements.showFinalOnly.addEventListener("change", renderLiveCaptions);
  elements.inputTranscription.addEventListener("change", updateMeetingReadiness);
  elements.targetLanguage.addEventListener("change", () => {
    const code = elements.targetLanguage.value;
    localStorage.setItem("translation.targetLanguage", code);
    elements.targetBadge.textContent = code.toUpperCase();
    highlightLanguageChip(code);
    updateMeetingReadiness();
  });
  elements.translatedVolume.addEventListener("input", updateVolumes);
  elements.originalVolume.addEventListener("input", updateVolumes);
  elements.visualMode.addEventListener("change", () => updateVisualMode({ persist: true, announce: true }));
  window.speechSynthesis?.addEventListener("voiceschanged", selectDemoVoice);
  document.querySelectorAll("input[name='sessionMode']").forEach((input) => {
    input.addEventListener("change", () => updateSessionMode({ persist: true, announce: true }));
  });
  document.querySelectorAll("input[name='sourceMode']").forEach((input) => {
    input.addEventListener("change", () => {
      elements.sourceKind.textContent = selectedSourceMode() === "tab" ? "Tab" : "Mic";
      markPermissionState("On Start", "warn");
      updateRuntimeChecks();
      updateMeetingReadiness();
    });
  });
}

function restorePreferences() {
  const savedMode = localStorage.getItem("translation.sessionMode") || "dashboard";
  const modeInput = document.querySelector(`input[name='sessionMode'][value='${savedMode}']`);
  if (modeInput) {
    modeInput.checked = true;
  }

  elements.meetingTitle.value = localStorage.getItem("translation.meetingTitle") || "Realtime Meeting";
  elements.glossary.value = localStorage.getItem("translation.glossary") || "";
  elements.sourceSpeaker.value = localStorage.getItem("translation.sourceSpeaker") || "Speaker";
  elements.translatedSpeaker.value = localStorage.getItem("translation.translatedSpeaker") || "Interpreter";
  const savedVisual = localStorage.getItem("translation.visualMode") || "wave";
  if (["wave", "spectrum", "flow"].includes(savedVisual)) {
    elements.visualMode.value = savedVisual;
  }
  updateVisualMode({ persist: false, announce: false });
  updateSpeakerLabels({ persist: false });
  updateSessionMode({ persist: false, announce: false });
  updateMeetingMeta();
  updateMeetingReadiness();
}

function updateSessionMode({ persist = true, announce = false } = {}) {
  state.sessionMode = selectedSessionMode();
  document.body.dataset.mode = state.sessionMode;
  elements.modeBadge.textContent = state.sessionMode === "meeting" ? "Meeting" : "Dashboard";

  if (persist) {
    localStorage.setItem("translation.sessionMode", state.sessionMode);
  }

  if (state.sessionMode === "meeting" && !state.isRunning) {
    setSourceMode("mic");
    if (elements.exportFormat.value === "txt") {
      elements.exportFormat.value = "md";
    }
  }

  renderMeetingFeed();
  updateMeetingMeta();

  if (announce) {
    writeNote(
      state.sessionMode === "meeting"
        ? "会議モードです。Mic入力を優先し、字幕を会議ログとしてペア表示・エクスポートできます。"
        : "Dashboardモードです。タブ音声やマイク翻訳を俯瞰しながら確認できます。"
    );
  }
}

function selectedSessionMode() {
  return document.querySelector("input[name='sessionMode']:checked")?.value || "dashboard";
}

function setSourceMode(value) {
  const input = document.querySelector(`input[name='sourceMode'][value='${value}']`);
  if (!input) {
    return;
  }
  input.checked = true;
  elements.sourceKind.textContent = value === "tab" ? "Tab" : "Mic";
}

function currentMeetingTitle() {
  return elements.meetingTitle.value.trim() || "Realtime Meeting";
}

function updateMeetingMeta() {
  elements.meetingTitleBadge.textContent = currentMeetingTitle();
  elements.segmentCount.textContent = String(state.segments.length);
  elements.presetBadge.textContent = currentQualityPreset().label;
  elements.highlightCount.textContent = String(countHighlightedPairs());
}

function updateVisualMode({ persist = true, announce = false } = {}) {
  state.visualMode = elements.visualMode.value || "wave";
  document.body.dataset.visual = state.visualMode;

  if (persist) {
    localStorage.setItem("translation.visualMode", state.visualMode);
  }

  if (announce) {
    writeNote(`Visualを${visualModeLabel(state.visualMode)}に切り替えました。`);
  }
}

function visualModeLabel(value) {
  return {
    wave: "Wave",
    spectrum: "Spectrum",
    flow: "Flow"
  }[value] || "Wave";
}

async function loadConfig() {
  if (state.isFileMode) {
    state.configLoadError = "";
    state.config = { ...FALLBACK_CONFIG };
    applyPublicConfig(state.config, { fileMode: true });
    showRuntimeBanner(
      `ファイルを直接開いています。画面確認とDemoは使えますが、実接続は ${LOCAL_APP_URL} または公開URLで開いてください。`,
      "warn"
    );
    return;
  }

  try {
    hideRuntimeBanner();
    const response = await fetch("/api/config", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(describeConfigHttpError(response.status));
    }

    state.configLoadError = "";
    state.config = await response.json();
    applyPublicConfig(state.config);
  } catch (error) {
    state.configLoadError = describeConfigLoadError(error);
    state.config = { ...FALLBACK_CONFIG };
    applyPublicConfig(state.config, { configError: true });
    showRuntimeBanner(`${state.configLoadError} Demoは利用できます。`, "error");
  }
}

function applyPublicConfig(config, { fileMode = false, configError = false } = {}) {
  const languages = Array.isArray(config.languages) && config.languages.length ? config.languages : FALLBACK_LANGUAGES;
  let label = "No API Key";
  let borderColor = "rgba(200,117,8,.45)";

  if (fileMode) {
    label = "Demo Only";
  } else if (configError) {
    label = "API Error";
    borderColor = "rgba(180,35,85,.35)";
  } else if (config.hasApiKey) {
    label = "API Ready";
    borderColor = "rgba(21,128,61,.35)";
  }

  elements.apiKeyBadge.textContent = label;
  elements.apiKeyBadge.style.borderColor = borderColor;
  elements.modelBadge.textContent = config.translationModel || "demo-only";
  state.minutesModel = config.minutesModel || "demo-only";
  populateLanguages(languages);
  populateQualityPresets(config.qualityPresets || QUALITY_PRESETS);
  updateRuntimeChecks();
  updateMeetingReadiness();
}

function describeConfigHttpError(status) {
  if (status === 404) {
    return "/api/config が見つかりません。Cloudflare Pagesでは Build output directory が public、Functions フォルダが functions としてデプロイされているか確認してください。";
  }
  if (status === 401 || status === 403) {
    return "設定APIへのアクセスが拒否されました。Cloudflare Pages の環境変数とデプロイ設定を確認してください。";
  }
  if (status >= 500) {
    return "設定APIでサーバーエラーが発生しました。Cloudflare Pages の Functions ログを確認してください。";
  }
  return `設定APIの読み込みに失敗しました。HTTP ${status}`;
}

function describeConfigLoadError(error) {
  const message = getErrorMessage(error);
  if (/^\/api\/config|^設定API/.test(message)) {
    return message;
  }
  return `設定APIに接続できません。ローカルでは npm start で起動した ${LOCAL_APP_URL} を開いてください。`;
}

function showRuntimeBanner(message, tone = "warn") {
  if (!elements.runtimeBanner) {
    return;
  }
  elements.runtimeBanner.hidden = false;
  elements.runtimeBanner.dataset.tone = tone;
  elements.runtimeBanner.textContent = message;
}

function hideRuntimeBanner() {
  if (!elements.runtimeBanner) {
    return;
  }
  elements.runtimeBanner.hidden = true;
  elements.runtimeBanner.textContent = "";
}

function initialSystemNote() {
  if (state.isFileMode) {
    return `ファイルを直接開いているためDemoのみ利用できます。実接続は ${LOCAL_APP_URL} または公開URLで開いてください。`;
  }
  if (state.configLoadError) {
    return `${state.configLoadError} Demoは利用できます。`;
  }
  if (!state.config?.hasApiKey) {
    return "サーバー側のOPENAI_API_KEYが未設定です。Demoで確認するか、Cloudflare Pagesの環境変数を設定してください。";
  }
  return "API Readyです。TabまたはMicを選んでStartできます。";
}

function updateRuntimeChecks() {
  if (!elements.runtimeCheckLabel) {
    return;
  }

  if (state.isFileMode) {
    elements.runtimeCheckLabel.textContent = "Local file";
    setStartupCheckState("runtime", "warn");
  } else if (window.isSecureContext) {
    elements.runtimeCheckLabel.textContent = "Web URL";
    setStartupCheckState("runtime", "good");
  } else {
    elements.runtimeCheckLabel.textContent = "Not secure";
    setStartupCheckState("runtime", "error");
  }

  if (state.configLoadError) {
    elements.apiCheckLabel.textContent = "API Error";
    setStartupCheckState("api", "error");
  } else if (state.config?.hasApiKey) {
    elements.apiCheckLabel.textContent = "Ready";
    setStartupCheckState("api", "good");
  } else {
    elements.apiCheckLabel.textContent = "Demo only";
    setStartupCheckState("api", "warn");
  }

  elements.inputCheckLabel.textContent = selectedSourceMode() === "mic" ? "Microphone" : "Tab audio";
  setStartupCheckState("input", "good");
  elements.permissionCheckLabel.textContent = state.permissionState.label;
  setStartupCheckState("permission", state.permissionState.tone);
  updateMeetingReadiness();
}

function setStartupCheckState(key, tone) {
  const node = document.querySelector(`.startup-check[data-check='${key}']`);
  if (node) {
    node.dataset.state = tone;
  }
}

function markPermissionState(label, tone = "warn") {
  state.permissionState = { label, tone };
  updateRuntimeChecks();
}

function updateMeetingReadiness() {
  setReadiness("api", state.config?.hasApiKey && !state.configLoadError ? "Ready" : state.configLoadError ? "Error" : "Demo", state.config?.hasApiKey && !state.configLoadError ? "good" : state.configLoadError ? "error" : "warn");
  setReadiness("input", selectedSourceMode() === "mic" ? "Mic" : "Tab", "good");
  setReadiness("permission", state.permissionState.label, state.permissionState.tone);
  setReadiness("transcript", elements.inputTranscription.checked ? "On" : "Off", elements.inputTranscription.checked ? "good" : "warn");
  const minutesReady = state.config?.hasApiKey && !state.configLoadError;
  setReadiness("minutes", minutesReady ? state.minutesModel || "Ready" : "Local draft", minutesReady ? "good" : "warn");
}

function setReadiness(key, label, tone) {
  const labelNode = elements[`ready${key.charAt(0).toUpperCase()}${key.slice(1)}`];
  const container = document.querySelector(`[data-ready='${key}']`);
  if (labelNode) {
    labelNode.textContent = label;
  }
  if (container) {
    container.dataset.state = tone;
  }
}

function populateLanguages(languages) {
  const saved = localStorage.getItem("translation.targetLanguage") || "ja";
  elements.targetLanguage.replaceChildren();
  elements.languageStrip.replaceChildren();

  for (const language of languages) {
    const option = document.createElement("option");
    option.value = language.code;
    option.textContent = `${language.label} (${language.native})`;
    elements.targetLanguage.append(option);

    const chip = document.createElement("span");
    chip.className = "language-chip";
    chip.dataset.language = language.code;
    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.backgroundColor = language.accent;
    const label = document.createElement("span");
    label.textContent = language.code.toUpperCase();
    chip.append(swatch, label);
    elements.languageStrip.append(chip);
  }

  const hasSaved = languages.some((language) => language.code === saved);
  elements.targetLanguage.value = hasSaved ? saved : "ja";
  elements.targetBadge.textContent = elements.targetLanguage.value.toUpperCase();
  highlightLanguageChip(elements.targetLanguage.value);
}

function populateQualityPresets(presets) {
  const normalized = Array.isArray(presets) && presets.length ? presets : QUALITY_PRESETS;
  const saved = localStorage.getItem("translation.qualityPreset") || "business";
  state.qualityPresets = normalized;
  elements.qualityPreset.replaceChildren();

  for (const preset of normalized) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.label;
    option.title = preset.description || preset.label;
    elements.qualityPreset.append(option);
  }

  const hasSaved = normalized.some((preset) => preset.id === saved);
  elements.qualityPreset.value = hasSaved ? saved : normalized[0]?.id || "natural";
  updateTranslationProfile({ persist: false, announce: false });
}

function updateTranslationProfile({ persist = true, announce = false } = {}) {
  const preset = currentQualityPreset();
  if (persist) {
    localStorage.setItem("translation.qualityPreset", preset.id);
  }
  elements.presetBadge.textContent = preset.label;
  updateMeetingMeta();

  if (announce) {
    writeNote(`会議ログ用プロファイルを${preset.label}に切り替えました。`);
  }
}

function updateSpeakerLabels({ persist = true } = {}) {
  if (persist) {
    localStorage.setItem("translation.sourceSpeaker", currentSourceSpeaker());
    localStorage.setItem("translation.translatedSpeaker", currentTranslatedSpeaker());
  }
  renderMeetingFeed();
  updateMeetingMeta();
  updateMeetingReadiness();
}

function currentQualityPreset() {
  const id = elements.qualityPreset.value || localStorage.getItem("translation.qualityPreset") || "business";
  return state.qualityPresets.find((preset) => preset.id === id) || state.qualityPresets[0] || QUALITY_PRESETS[0];
}

function currentGlossary() {
  return elements.glossary.value.trim();
}

function currentSourceSpeaker() {
  return elements.sourceSpeaker.value.trim() || "Speaker";
}

function currentTranslatedSpeaker() {
  return elements.translatedSpeaker.value.trim() || "Interpreter";
}

function currentTranslationProfile() {
  const preset = currentQualityPreset();
  return {
    preset: {
      id: preset.id,
      label: preset.label,
      description: preset.description || ""
    },
    glossary: currentGlossary(),
    speakers: {
      source: currentSourceSpeaker(),
      translated: currentTranslatedSpeaker()
    }
  };
}

async function startSession() {
  if (state.isRunning) {
    return;
  }

  runStartPreflight();

  stopSession();
  resetRuntime();
  setRunningUi(true);
  setStatus("connecting", "Connecting");
  updateMeetingMeta();
  markPermissionState("Waiting", "warn");
  writeNote(permissionPromptMessage(selectedSourceMode()));
  logEvent(
    "session.start",
    `${state.sessionMode} / ${selectedSourceMode()} -> ${elements.targetLanguage.value}`,
    "good"
  );

  try {
    let sourceStream;
    try {
      sourceStream = await captureSourceStream();
    } catch (error) {
      markPermissionState("Blocked", "error");
      throw new Error(describeMediaCaptureError(error, selectedSourceMode()));
    }
    markPermissionState("Granted", "good");
    state.sourceStream = sourceStream;
    attachSourcePreview(sourceStream);
    attachOriginalMonitor(sourceStream);
    attachAnalyser(sourceStream);

    writeNote("短命なRealtime Translation client secretを作成しています。");
    const session = await createTranslationSession();
    const clientSecret = extractClientSecret(session);
    if (!clientSecret) {
      throw new Error("The session response did not include a client secret.");
    }

    await openWebRtcCall({ sourceStream, clientSecret });
    state.isRunning = true;
    state.elapsedSeconds = 0;
    state.startedAt = Date.now();
    state.metrics.connectionAt = Date.now();
    state.clockTimer = setInterval(updateClockAndRates, 1000);
    updateClockAndRates();
    setStatus("live", "Live");
    writeNote("接続中。翻訳音声と字幕はストリームに合わせて更新されます。");
  } catch (error) {
    stopSession({ preservePermissionState: true });
    throw error;
  }
}

function runStartPreflight() {
  if (state.isFileMode) {
    throw new Error(`ファイルを直接開いているため実接続は使えません。npm start 後の ${LOCAL_APP_URL} または公開URLを開いてください。`);
  }
  if (!window.isSecureContext) {
    throw new Error(`音声キャプチャには安全なブラウザコンテキストが必要です。ローカルでは ${LOCAL_APP_URL}、共有時は https の公開URLで開いてください。`);
  }
  if (!navigator.mediaDevices) {
    throw new Error(`このブラウザでは音声キャプチャAPIが使えません。Google Chromeで ${LOCAL_APP_URL} または公開URLを開いてください。`);
  }
  if (selectedSourceMode() === "tab" && typeof navigator.mediaDevices.getDisplayMedia !== "function") {
    throw new Error("このブラウザではタブ音声共有が使えません。Google Chromeで開き、Tab入力を使ってください。");
  }
  if (selectedSourceMode() === "mic" && typeof navigator.mediaDevices.getUserMedia !== "function") {
    throw new Error("このブラウザではマイク入力が使えません。Google Chromeで開き、Mic入力を使ってください。");
  }
  if (typeof RTCPeerConnection === "undefined") {
    throw new Error("このブラウザではWebRTCが使えません。Google Chromeの最新版で開いてください。");
  }
  if (state.configLoadError) {
    throw new Error(`${state.configLoadError} Startには /api/config と /api/session が必要です。`);
  }
  if (!state.config?.hasApiKey) {
    throw new Error("サーバー側のOPENAI_API_KEYが未設定です。Cloudflare Pagesでは Settings > Environment variables に OPENAI_API_KEY を設定し、再デプロイしてください。");
  }
  if (!elements.targetLanguage.value) {
    throw new Error("Target Languageを選択してください。");
  }
}

function permissionPromptMessage(mode) {
  if (mode === "mic") {
    return "マイクの許可を待っています。ChromeとmacOSの両方でマイクアクセスを許可してください。";
  }
  return "タブ共有の許可を待っています。共有ダイアログで翻訳したいChromeタブを選び、タブの音声共有を有効にしてください。";
}

async function createTranslationSession() {
  const response = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      targetLanguage: elements.targetLanguage.value,
      inputTranscription: elements.inputTranscription.checked,
      noiseReduction: elements.noiseReduction.value,
      qualityPreset: currentQualityPreset().id,
      glossary: currentGlossary()
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = payload?.details?.error?.message || payload?.error || `Session failed: ${response.status}`;
    throw new Error(describeSessionError(response.status, details));
  }
  return payload;
}

async function openWebRtcCall({ sourceStream, clientSecret }) {
  const pc = new RTCPeerConnection();
  state.pc = pc;

  pc.onconnectionstatechange = () => {
    elements.webrtcState.textContent = pc.connectionState;
    if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
      logEvent("webrtc.state", pc.connectionState, "error");
    } else {
      logEvent("webrtc.state", pc.connectionState);
    }
  };

  pc.oniceconnectionstatechange = () => {
    elements.signalLabel.textContent = `ICE ${pc.iceConnectionState}`;
  };

  pc.ontrack = ({ streams }) => {
    elements.translatedAudio.srcObject = streams[0];
    elements.translatedAudio.muted = false;
    elements.audioState.textContent = "Receiving";
    elements.audioMeter.classList.add("is-live");
    elements.translatedAudio.play().catch(() => {});
    logEvent("audio.remote_track", "translated speech");
  };

  state.dataChannel = pc.createDataChannel("oai-events");
  state.dataChannel.onopen = () => logEvent("datachannel.open", "oai-events", "good");
  state.dataChannel.onclose = () => logEvent("datachannel.close", "oai-events");
  state.dataChannel.onerror = () => logEvent("datachannel.error", "oai-events", "error");
  state.dataChannel.onmessage = ({ data }) => handleRealtimeEvent(data);

  for (const track of sourceStream.getAudioTracks()) {
    pc.addTrack(track, sourceStream);
  }

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  const sdpResponse = await fetch(TRANSLATION_CALL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${clientSecret}`,
      "Content-Type": "application/sdp"
    },
    body: offer.sdp
  });

  if (!sdpResponse.ok) {
    const details = await sdpResponse.text().catch(() => "");
    throw new Error(describeRealtimeCallError(sdpResponse.status, details));
  }

  await pc.setRemoteDescription({
    type: "answer",
    sdp: await sdpResponse.text()
  });
}

async function captureSourceStream() {
  if (!navigator.mediaDevices) {
    throw new Error("Media capture is not available in this browser.");
  }

  if (!window.isSecureContext) {
    throw new Error("Media capture requires a secure browser context. Use http://127.0.0.1 or https.");
  }

  if (selectedSourceMode() === "mic") {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    ensureAudioTrack(stream, "Microphone audio was not found.");
    return stream;
  }

  const audio = {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false
  };

  const supported = navigator.mediaDevices.getSupportedConstraints?.() || {};
  if (supported.suppressLocalAudioPlayback) {
    audio.suppressLocalAudioPlayback = true;
  }

  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio
  });
  ensureAudioTrack(stream, "Select a browser tab and enable tab audio.");
  return stream;
}

function describeMediaCaptureError(error, mode) {
  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "";
  const permissionNames = new Set(["NotAllowedError", "PermissionDeniedError", "SecurityError"]);

  if (name === "NotFoundError" || /not found|no.*device/i.test(message)) {
    return mode === "mic"
      ? "利用できるマイクが見つかりません。OSの入力デバイス設定を確認し、必要なら外部マイクを接続してください。"
      : "共有できるタブ音声が見つかりません。Chromeタブを選び、「タブの音声も共有」を有効にしてください。";
  }

  if (name === "NotReadableError" || /could not start|in use|busy/i.test(message)) {
    return "音声デバイスを開始できませんでした。別のアプリがマイクを使用していないか確認し、ブラウザを再読み込みしてから再試行してください。";
  }

  if (name === "AbortError") {
    return "音声入力の選択がキャンセルされました。Startを押して、共有するタブまたはマイクをもう一度選んでください。";
  }

  if (permissionNames.has(name) || /permission|denied|not allowed/i.test(message)) {
    const source = mode === "mic" ? "マイク" : "タブ音声";
    return `${source}の許可が拒否されました。Chromeで開いている場合はアドレスバー左のサイト設定から許可し、macOSの「システム設定 > プライバシーとセキュリティ > マイク」でChromeまたはCodexを許可してください。Codexのin-app browserで失敗する場合は、Google Chromeで http://127.0.0.1:5173/ を開いて試してください。`;
  }

  if (/media capture is not available/i.test(message)) {
    return "このブラウザでは音声キャプチャAPIが使えません。Google Chromeで http://127.0.0.1:5173/ を開いてください。";
  }

  if (/secure browser context/i.test(message)) {
    return "音声キャプチャには安全なブラウザコンテキストが必要です。http://127.0.0.1:5173/ で開いてください。";
  }

  if (/audio was not found|enable tab audio/i.test(message)) {
    return mode === "mic"
      ? "マイク音声トラックを取得できませんでした。別のマイクを選ぶか、OS側の入力デバイス設定を確認してください。"
      : "タブ音声が取得できませんでした。共有ダイアログでChromeタブを選び、「タブの音声も共有」を有効にしてください。";
  }

  return message;
}


function describeSessionError(status, details = "") {
  const clean = cleanServerDetail(details);
  if (/OPENAI_API_KEY/i.test(clean)) {
    return "サーバー側のOPENAI_API_KEYが未設定です。Cloudflare Pagesの環境変数に OPENAI_API_KEY を設定し、再デプロイしてください。";
  }
  if (status === 400) {
    return `セッション設定が不正です。Target Languageや入力設定を確認してください。${clean ? ` 詳細: ${clean}` : ""}`;
  }
  if (status === 401) {
    return "OpenAI APIキーが無効、または期限切れです。Cloudflare Pagesの OPENAI_API_KEY を確認してください。";
  }
  if (status === 403) {
    return "OpenAI APIキーにRealtime Translationを使う権限がありません。プロジェクト権限と課金状態を確認してください。";
  }
  if (status === 429) {
    return "OpenAI APIのレート制限または使用量上限に達しています。少し待つか、OpenAI側の利用上限を確認してください。";
  }
  if (status >= 500) {
    return `セッション作成APIでサーバーエラーが発生しました。${clean ? ` 詳細: ${clean}` : "Cloudflare PagesのFunctionsログを確認してください。"}`;
  }
  return clean || `セッション作成に失敗しました。HTTP ${status}`;
}

function describeRealtimeCallError(status, details = "") {
  const clean = cleanServerDetail(details);
  if (status === 401) {
    return "Realtime接続の認証に失敗しました。短命なclient secretが作成できているか、OPENAI_API_KEYを確認してください。";
  }
  if (status === 403) {
    return "Realtime Translation APIへのアクセスが拒否されました。OpenAIプロジェクトの権限と課金状態を確認してください。";
  }
  if (status === 429) {
    return "Realtime Translation APIのレート制限または使用量上限に達しています。少し待ってから再試行してください。";
  }
  return clean || `Realtime接続に失敗しました。HTTP ${status}`;
}

function cleanServerDetail(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 260);
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error || "Unknown error");
}

function ensureAudioTrack(stream, message) {
  if (!stream.getAudioTracks().length) {
    stream.getTracks().forEach((track) => track.stop());
    throw new Error(message);
  }
}

function handleRealtimeEvent(rawData) {
  let event;
  try {
    event = JSON.parse(rawData);
  } catch {
    logEvent("event.parse_error", String(rawData).slice(0, 140), "error");
    return;
  }

  state.metrics.events += 1;
  elements.eventCount.textContent = String(state.metrics.events);

  if (event.type === "error") {
    logEvent(event.type, event.error?.message || "Realtime error", "error");
    return;
  }

  if (event.type === "session.input_transcript.delta") {
    markInputEvent();
    appendTranscript("source", event.delta || "");
  } else if (event.type === "session.output_transcript.delta") {
    markOutputEvent();
    appendTranscript("translated", event.delta || "");
  } else if (event.type === "session.input_transcript.done") {
    finalizeTranscript("source", event.transcript || "");
  } else if (event.type === "session.output_transcript.done") {
    finalizeTranscript("translated", event.transcript || "");
  }

  if (event.type?.includes("transcript") || event.type?.includes("session")) {
    logEvent(event.type, summarizeEvent(event), event.type.includes("error") ? "error" : undefined);
  }
}

function markInputEvent() {
  if (!state.metrics.firstInputAt) {
    state.metrics.firstInputAt = Date.now();
  }
}

function markOutputEvent() {
  if (!state.metrics.firstOutputAt) {
    state.metrics.firstOutputAt = Date.now();
  }
  updateLatency();
}

function appendTranscript(kind, delta) {
  if (!delta) {
    return;
  }

  if (kind === "source") {
    state.currentSource += delta;
    state.metrics.inputChars += delta.length;
  } else {
    state.currentTranslated += delta;
    state.metrics.outputChars += delta.length;
  }

  renderLiveCaptions();
  updateTranscriptStats();

  const text = kind === "source" ? state.currentSource : state.currentTranslated;
  if (shouldFlush(text)) {
    finalizeTranscript(kind);
  }
}

function finalizeTranscript(kind, overrideText = "") {
  const text = (overrideText || (kind === "source" ? state.currentSource : state.currentTranslated)).trim();
  if (!text) {
    return;
  }

  const segment = createTranscriptSegment(kind, text);

  if (kind === "source") {
    state.fullSource.unshift(segment);
    state.currentSource = "";
  } else {
    state.fullTranslated.unshift(segment);
    state.currentTranslated = "";
  }

  state.segments.push(segment);
  trimHistory();
  renderLiveCaptions();
  renderHistory();
  renderMeetingFeed();
  updateMeetingMeta();
  updateMeetingReadiness();
}

function createTranscriptSegment(kind, text) {
  const endSeconds = Math.max(currentElapsedSeconds(), lastSegmentEnd(kind) + 0.1);
  const estimatedDuration = estimateSubtitleDuration(text);
  const startSeconds = Math.max(0, Math.max(lastSegmentEnd(kind) + 0.1, endSeconds - estimatedDuration));

  return {
    id: state.nextSegmentId++,
    kind,
    speaker: kind === "source" ? currentSourceSpeaker() : currentTranslatedSpeaker(),
    qualityPreset: currentQualityPreset().id,
    text,
    at: new Date(),
    startSeconds,
    endSeconds: Math.max(endSeconds, startSeconds + 1.2)
  };
}

function lastSegmentEnd(kind) {
  const segments = state.segments.filter((segment) => segment.kind === kind);
  return segments.length ? segments[segments.length - 1].endSeconds : 0;
}

function estimateSubtitleDuration(text) {
  const words = Math.max(1, countWords(text));
  return Math.min(12, Math.max(1.8, words / 2.7));
}

function currentElapsedSeconds() {
  if (!state.startedAt) {
    return state.elapsedSeconds || 0;
  }
  return Math.max(state.elapsedSeconds || 0, (Date.now() - state.startedAt) / 1000);
}

function shouldFlush(text) {
  if (text.length > 180) {
    return true;
  }
  return /[.!?。！？]\s*$/.test(text) && text.length > 18;
}

function renderLiveCaptions() {
  const finalOnly = elements.showFinalOnly.checked;
  elements.sourceLive.textContent = finalOnly ? "" : state.currentSource;
  elements.translatedLive.textContent = finalOnly ? "" : state.currentTranslated;
}

function renderHistory() {
  renderHistoryList(elements.sourceHistory, state.fullSource);
  renderHistoryList(elements.translatedHistory, state.fullTranslated);
  renderMeetingFeed();
}

function renderHistoryList(container, items) {
  container.replaceChildren();
  for (const item of items) {
    const node = document.createElement("div");
    node.className = "history-item";
    const time = document.createElement("time");
    time.dateTime = item.at.toISOString();
    time.textContent = item.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const text = document.createElement("span");
    text.textContent = item.text;
    node.append(time, text);
    container.append(node);
  }
}

function trimHistory() {
  state.fullSource = state.fullSource.slice(0, MAX_HISTORY_ITEMS);
  state.fullTranslated = state.fullTranslated.slice(0, MAX_HISTORY_ITEMS);
}

function renderMeetingFeed() {
  const pairs = buildTranscriptPairs().slice(-10).reverse();
  elements.meetingFeed.replaceChildren();

  for (const pair of pairs) {
    const tags = classifyMeetingPair(pair);
    const node = document.createElement("article");
    node.className = `meeting-item${tags.length ? " is-highlighted" : ""}`;

    const heading = document.createElement("div");
    heading.className = "meeting-item-heading";
    const time = document.createElement("time");
    time.dateTime = pair.at.toISOString();
    time.textContent = formatTimelineTime(pair.startSeconds);
    const label = document.createElement("span");
    label.textContent = `Segment ${pair.index}`;
    heading.append(time, label);

    const tagRow = document.createElement("div");
    tagRow.className = "meeting-tags";
    for (const tag of tags) {
      const tagNode = document.createElement("span");
      tagNode.className = "meeting-tag";
      tagNode.textContent = tag.label;
      tagRow.append(tagNode);
    }

    const source = document.createElement("p");
    source.className = "meeting-source";
    appendSpeakerText(source, pair.source?.speaker || currentSourceSpeaker(), pair.source?.text || "");

    const translated = document.createElement("p");
    translated.className = "meeting-translated";
    appendSpeakerText(translated, pair.translated?.speaker || currentTranslatedSpeaker(), pair.translated?.text || "");

    node.append(heading);
    if (tags.length) {
      node.append(tagRow);
    }
    node.append(source, translated);
    elements.meetingFeed.append(node);
  }
}

function appendSpeakerText(container, speaker, text) {
  const speakerNode = document.createElement("span");
  speakerNode.className = "speaker-name";
  speakerNode.textContent = `${speaker}: `;
  const textNode = document.createElement("span");
  textNode.textContent = text;
  container.append(speakerNode, textNode);
}

function classifyMeetingPair(pair) {
  const text = `${pair.source?.text || ""} ${pair.translated?.text || ""}`;
  return HIGHLIGHT_RULES.filter((rule) => rule.pattern.test(text));
}

function countHighlightedPairs() {
  return buildTranscriptPairs().filter((pair) => classifyMeetingPair(pair).length > 0).length;
}

function formatPairTags(pair) {
  const tags = classifyMeetingPair(pair).map((tag) => tag.label);
  return tags.length ? tags.join(", ") : "-";
}

function buildTranscriptPairs() {
  const sourceSegments = chronologicalSegments("source");
  const translatedSegments = chronologicalSegments("translated");
  const total = Math.max(sourceSegments.length, translatedSegments.length);
  const pairs = [];

  for (let index = 0; index < total; index += 1) {
    const source = sourceSegments[index] || null;
    const translated = translatedSegments[index] || null;
    const startSeconds = Math.min(
      source?.startSeconds ?? translated?.startSeconds ?? 0,
      translated?.startSeconds ?? source?.startSeconds ?? 0
    );
    const endSeconds = Math.max(
      source?.endSeconds ?? translated?.endSeconds ?? startSeconds + 1.2,
      translated?.endSeconds ?? source?.endSeconds ?? startSeconds + 1.2
    );
    pairs.push({
      index: index + 1,
      source,
      translated,
      startSeconds,
      endSeconds,
      at: source?.at || translated?.at || new Date(),
      sourceSpeaker: source?.speaker || currentSourceSpeaker(),
      translatedSpeaker: translated?.speaker || currentTranslatedSpeaker()
    });
  }

  return pairs;
}

function chronologicalSegments(kind) {
  return state.segments
    .filter((segment) => segment.kind === kind)
    .slice()
    .sort((a, b) => a.startSeconds - b.startSeconds || a.id - b.id);
}

function stopSession(options = {}) {
  const { preservePermissionState = false } = options || {};
  const wasRunning = state.isRunning;
  window.speechSynthesis?.cancel();
  finalizeTranscript("source");
  finalizeTranscript("translated");
  clearInterval(state.clockTimer);
  state.clockTimer = null;

  for (const timer of state.demoTimers) {
    clearInterval(timer);
    clearTimeout(timer);
  }
  state.demoTimers = [];

  if (state.dataChannel) {
    state.dataChannel.close();
  }
  if (state.pc) {
    state.pc.close();
  }
  if (state.sourceStream) {
    state.sourceStream.getTracks().forEach((track) => track.stop());
  }
  if (state.audioContext) {
    state.audioContext.close().catch(() => {});
  }

  elements.translatedAudio.srcObject = null;
  elements.originalAudio.srcObject = null;
  elements.sourceVideo.srcObject = null;
  elements.sourceVideo.style.display = "none";
  elements.sourcePlaceholder.style.display = "grid";
  elements.audioMeter.classList.remove("is-live");
  elements.audioState.textContent = "Muted";

  state.pc = null;
  state.dataChannel = null;
  state.sourceStream = null;
  state.audioContext = null;
  state.analyser = null;
  state.elapsedSeconds = currentElapsedSeconds();
  state.startedAt = null;
  state.isRunning = false;
  state.isDemo = false;
  state.metrics.firstInputAt = null;
  state.metrics.firstOutputAt = null;

  setRunningUi(false);
  setStatus("idle", "Idle");
  if (!preservePermissionState) {
    markPermissionState("On Start", "warn");
  } else {
    updateRuntimeChecks();
  }
  elements.webrtcState.textContent = "closed";
  elements.sessionClock.textContent = "00:00";
  elements.signalLabel.textContent = "Waiting for stream";
  if (wasRunning) {
    writeNote("停止しました。StartまたはDemoで再開できます。");
  }
}

function startDemo() {
  stopSession();
  resetRuntime();
  setRunningUi(true);
  state.isRunning = true;
  state.isDemo = true;
  state.elapsedSeconds = 0;
  state.startedAt = Date.now();
  state.clockTimer = setInterval(updateClockAndRates, 1000);
  setStatus("live", "Demo");
  markPermissionState("Demo", "good");
  elements.webrtcState.textContent = "simulated";
  elements.audioMeter.classList.add("is-live");
  elements.audioState.textContent = "Simulated";
  elements.signalLabel.textContent = "Demo signal";
  selectDemoVoice();
  writeNote("Demoモードで字幕、計測、ブラウザ音声合成による読み上げを再生しています。");
  logEvent("demo.start", "simulated realtime translation", "good");

  let index = 0;
  const tick = () => {
    const [source, translated] = demoScript[index % demoScript.length];
    simulateSentence("source", source);
    setTimeout(() => simulateSentence("translated", translated), 420);
    index += 1;
  };

  tick();
  state.demoTimers.push(setInterval(tick, 4100));
  state.demoTimers.push(setInterval(() => {
    state.metrics.events += 1;
    elements.eventCount.textContent = String(state.metrics.events);
    updateLatency();
    logEvent("session.output_transcript.delta", "demo text");
  }, 1800));
}

function simulateSentence(kind, sentence) {
  if (kind === "translated") {
    speakDemoSentence(sentence);
  }

  const words = sentence.split(/(\s+)/).filter(Boolean);
  let offset = 0;
  for (const word of words) {
    const timer = setTimeout(() => appendTranscript(kind, word), offset);
    state.demoTimers.push(timer);
    offset += Math.max(110, Math.min(360, word.length * 42));
  }
  const finalizer = setTimeout(() => finalizeTranscript(kind), offset + 80);
  state.demoTimers.push(finalizer);
}

function selectDemoVoice() {
  if (!window.speechSynthesis) {
    return;
  }

  const target = elements.targetLanguage.value || "ja";
  const voices = window.speechSynthesis.getVoices();
  state.demoVoice =
    voices.find((voice) => voice.lang.toLowerCase().startsWith(target)) ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith("ja")) ||
    voices[0] ||
    null;
}

function speakDemoSentence(sentence) {
  if (!window.speechSynthesis || !sentence) {
    return;
  }

  const utterance = new SpeechSynthesisUtterance(sentence);
  if (state.demoVoice) {
    utterance.voice = state.demoVoice;
    utterance.lang = state.demoVoice.lang;
  } else {
    utterance.lang = elements.targetLanguage.value === "ja" ? "ja-JP" : elements.targetLanguage.value;
  }
  utterance.volume = Number(elements.translatedVolume.value) / 100;
  utterance.rate = 1.02;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function resetRuntime() {
  state.metrics = {
    events: 0,
    inputChars: 0,
    outputChars: 0,
    firstInputAt: null,
    firstOutputAt: null,
    connectionAt: null
  };
  state.elapsedSeconds = 0;
  elements.eventCount.textContent = "0";
  elements.latencyEstimate.textContent = "--";
  elements.outputRate.textContent = "0 wpm";
  elements.eventLog.replaceChildren();
}

function resetTranscripts() {
  state.currentSource = "";
  state.currentTranslated = "";
  state.fullSource = [];
  state.fullTranslated = [];
  state.segments = [];
  state.nextSegmentId = 1;
  state.metrics.inputChars = 0;
  state.metrics.outputChars = 0;
  clearMinutes();
  renderLiveCaptions();
  renderHistory();
  updateTranscriptStats();
  updateMeetingMeta();
}

function setRunningUi(isRunning) {
  elements.startButton.disabled = isRunning || state.isFileMode;
  elements.startButton.title = state.isFileMode
    ? `実接続は ${LOCAL_APP_URL} または公開URLで開いてください。`
    : "";
  elements.demoButton.disabled = isRunning;
  elements.stopButton.disabled = !isRunning;
}

function setStatus(stateName, label) {
  elements.connectionStatus.dataset.state = stateName;
  elements.statusLabel.textContent = label;
}

function writeNote(message) {
  elements.systemNote.textContent = message;
}

function handleFatalError(error) {
  const message = getErrorMessage(error);
  setStatus("error", "Error");
  setRunningUi(false);
  writeNote(message);
  logEvent("fatal", message, "error");
}

function logEvent(type, detail = "", tone) {
  const line = document.createElement("div");
  line.className = `event-line${tone ? ` ${tone}` : ""}`;
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  line.textContent = `${time} ${type}${detail ? `: ${detail}` : ""}`;
  elements.eventLog.prepend(line);

  while (elements.eventLog.children.length > MAX_EVENT_LINES) {
    elements.eventLog.lastElementChild.remove();
  }
}

function summarizeEvent(event) {
  if (event.delta) {
    return String(event.delta).slice(0, 80);
  }
  if (event.transcript) {
    return String(event.transcript).slice(0, 80);
  }
  if (event.error?.message) {
    return event.error.message;
  }
  return event.event_id || "";
}

function updateVolumes() {
  const translated = Number(elements.translatedVolume.value) / 100;
  const original = Number(elements.originalVolume.value) / 100;
  elements.translatedAudio.volume = translated;
  elements.originalAudio.volume = original;
  elements.originalAudio.muted = original === 0;
  elements.translatedVolumeValue.textContent = `${Math.round(translated * 100)}%`;
  elements.originalVolumeValue.textContent = `${Math.round(original * 100)}%`;
}

function updateTranscriptStats() {
  elements.sourceChars.textContent = `${state.metrics.inputChars} chars`;
  elements.translatedChars.textContent = `${state.metrics.outputChars} chars`;
}

function updateClockAndRates() {
  if (!state.startedAt) {
    return;
  }

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000));
  elements.sessionClock.textContent = formatDuration(elapsedSeconds);
  const words = countWords(
    `${state.currentTranslated} ${state.fullTranslated.map((item) => item.text).join(" ")}`
  );
  const minutes = Math.max(elapsedSeconds / 60, 1 / 60);
  elements.outputRate.textContent = `${Math.round(words / minutes)} wpm`;
}

function updateLatency() {
  if (state.metrics.firstInputAt && state.metrics.firstOutputAt) {
    const latency = Math.max(0, state.metrics.firstOutputAt - state.metrics.firstInputAt);
    elements.latencyEstimate.textContent = `${latency} ms`;
  } else if (state.isDemo) {
    elements.latencyEstimate.textContent = `${420 + (state.metrics.events % 5) * 35} ms`;
  }
}

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function countWords(text) {
  const latinWords = text.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g) || [];
  const cjkChars = text.match(/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/g) || [];
  return latinWords.length + Math.ceil(cjkChars.length / 2);
}

function extractClientSecret(session) {
  if (typeof session?.value === "string") {
    return session.value;
  }
  if (typeof session?.client_secret?.value === "string") {
    return session.client_secret.value;
  }
  if (typeof session?.client_secret === "string") {
    return session.client_secret;
  }
  if (typeof session?.secret === "string") {
    return session.secret;
  }
  return "";
}

function attachSourcePreview(stream) {
  const videoTracks = stream.getVideoTracks();
  if (videoTracks.length) {
    elements.sourceVideo.srcObject = stream;
    elements.sourceVideo.style.display = "block";
    elements.sourcePlaceholder.style.display = "none";
    elements.sourceVideo.play().catch(() => {});
  } else {
    elements.sourceVideo.style.display = "none";
    elements.sourcePlaceholder.style.display = "grid";
  }
}

function attachOriginalMonitor(stream) {
  const audioStream = new MediaStream(stream.getAudioTracks());
  elements.originalAudio.srcObject = audioStream;
  elements.originalAudio.play().catch(() => {});
}

function attachAnalyser(stream) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    return;
  }

  const context = new AudioContext();
  const analyser = context.createAnalyser();
  analyser.fftSize = 512;
  const source = context.createMediaStreamSource(new MediaStream(stream.getAudioTracks()));
  source.connect(analyser);
  state.audioContext = context;
  state.analyser = analyser;
}

function startSignalLoop() {
  const canvas = elements.signalCanvas;
  const context = canvas.getContext("2d");
  const buffer = new Uint8Array(256);

  const render = () => {
    const now = performance.now();
    const { width, height } = resizeSignalCanvas(canvas, context);
    context.clearRect(0, 0, width, height);

    if (state.analyser) {
      state.analyser.getByteFrequencyData(buffer);
    }

    drawSignalBackground(context, width, height, state.visualMode);

    if (state.visualMode === "spectrum") {
      drawSpectrumVisual(context, buffer, width, height, now);
    } else if (state.visualMode === "flow") {
      drawFlowVisual(context, buffer, width, height, now);
    } else {
      drawWaveVisual(context, buffer, width, height, now);
    }

    state.animationFrame = requestAnimationFrame(render);
  };

  render();
}

function resizeSignalCanvas(canvas, context) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, rect.width || canvas.clientWidth || 1);
  const height = Math.max(1, rect.height || canvas.clientHeight || 1);
  const nextWidth = Math.round(width * dpr);
  const nextHeight = Math.round(height * dpr);

  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width, height };
}

function drawSignalBackground(context, width, height, mode) {
  context.fillStyle = mode === "flow" ? "#0f1518" : "#111418";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = mode === "spectrum" ? "rgba(255,255,255,0.075)" : "rgba(255,255,255,0.055)";
  context.lineWidth = 1;
  const columnStep = Math.max(36, Math.min(58, width / 12));
  const rowStep = Math.max(32, Math.min(46, height / 5));

  for (let x = 0; x < width; x += columnStep) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = 0; y < height; y += rowStep) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
}

function drawWaveVisual(context, buffer, width, height, now) {
  if (state.analyser) {
    drawFrequencyBars(context, buffer, width, height, { baseY: height - 34, heightScale: 0.42, alpha: 0.48 });
  }
  drawAmbientSignal(context, width, height, now);
  drawTranslationPath(context, width, height, now);
}

function drawSpectrumVisual(context, buffer, width, height, now) {
  const centerY = height * 0.56;
  const count = Math.max(36, Math.min(92, Math.floor(width / 8)));
  const gap = 3;
  const barWidth = Math.max(2, (width - gap * (count - 1)) / count);

  for (let index = 0; index < count; index += 1) {
    const value = sampleSignalValue(buffer, index, count, now);
    const barHeight = Math.max(8, value * height * 0.42);
    const hue = index % 3 === 0 ? "#2dd4bf" : index % 3 === 1 ? "#60a5fa" : "#f59e0b";
    const x = index * (barWidth + gap);
    context.fillStyle = hue;
    context.globalAlpha = 0.24 + value * 0.62;
    context.fillRect(x, centerY - barHeight, barWidth, barHeight);
    context.globalAlpha = 0.12 + value * 0.42;
    context.fillRect(x, centerY + 4, barWidth, barHeight * 0.48);
  }

  context.globalAlpha = 1;
  context.strokeStyle = "rgba(255,255,255,0.24)";
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(0, centerY);
  context.lineTo(width, centerY);
  context.stroke();
}

function drawFlowVisual(context, buffer, width, height, now) {
  const centerX = width * 0.5;
  const centerY = height * 0.52;
  const radiusX = width * 0.35;
  const radiusY = height * 0.26;
  const nodes = 7;

  context.strokeStyle = "rgba(255,255,255,0.18)";
  context.lineWidth = 2;
  context.beginPath();
  context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
  context.stroke();

  for (let index = 0; index < nodes; index += 1) {
    const t = (now / 4200 + index / nodes) % 1;
    const angle = t * Math.PI * 2;
    const value = sampleSignalValue(buffer, index, nodes, now);
    const x = centerX + Math.cos(angle) * radiusX;
    const y = centerY + Math.sin(angle) * radiusY;
    const size = 5 + value * 8;

    context.strokeStyle = index % 2 ? "rgba(45, 212, 191, 0.22)" : "rgba(245, 158, 11, 0.18)";
    context.beginPath();
    context.moveTo(centerX, centerY);
    context.lineTo(x, y);
    context.stroke();

    context.fillStyle = index % 2 ? "#2dd4bf" : "#f59e0b";
    context.globalAlpha = state.isRunning ? 0.92 : 0.58;
    context.beginPath();
    context.arc(x, y, size, 0, Math.PI * 2);
    context.fill();
  }

  context.globalAlpha = 1;
  context.fillStyle = "rgba(255,255,255,0.78)";
  context.beginPath();
  context.arc(centerX, centerY, 6, 0, Math.PI * 2);
  context.fill();
}

function drawFrequencyBars(context, buffer, width, height, { baseY, heightScale, alpha }) {
  const barCount = Math.max(38, Math.min(96, Math.floor(width / 8)));
  const gap = 3;
  const barWidth = Math.max(2, (width - gap * (barCount - 1)) / barCount);
  for (let index = 0; index < barCount; index += 1) {
    const value = sampleSignalValue(buffer, index, barCount, performance.now());
    const barHeight = Math.max(6, value * height * heightScale);
    const hue = index < barCount / 2 ? "#2dd4bf" : "#f59e0b";
    context.fillStyle = hue;
    context.globalAlpha = alpha * (0.36 + value * 0.64);
    context.fillRect(index * (barWidth + gap), baseY - barHeight, barWidth, barHeight);
  }
  context.globalAlpha = 1;
}

function drawAmbientSignal(context, width, height, now) {
  const amplitude = Math.max(12, height * 0.12);
  context.strokeStyle = "rgba(45, 212, 191, 0.78)";
  context.lineWidth = 3;
  context.beginPath();
  for (let x = 0; x <= width; x += 5) {
    const y =
      height * 0.58 +
      Math.sin(x / 38 + now / 640) * amplitude +
      Math.sin(x / 17 + now / 980) * amplitude * 0.32;
    if (x === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }
  context.stroke();
}

function drawTranslationPath(context, width, height, now) {
  const y = height * 0.23;
  const margin = Math.min(78, width * 0.12);
  context.strokeStyle = "rgba(255,255,255,0.22)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(margin, y);
  context.bezierCurveTo(width * 0.32, y - height * 0.13, width * 0.68, y + height * 0.13, width - margin, y);
  context.stroke();

  for (let i = 0; i < 5; i += 1) {
    const t = (now / 1400 + i * 0.2) % 1;
    const x = margin + (width - margin * 2) * t;
    const pulse = 0.55 + Math.sin(now / 240 + i) * 0.25;
    context.fillStyle = i % 2 ? "rgba(245, 158, 11, 0.9)" : "rgba(45, 212, 191, 0.9)";
    context.globalAlpha = state.isRunning ? 0.9 : 0.42;
    context.beginPath();
    context.arc(x, y + Math.sin(t * Math.PI * 2) * height * 0.07, 5 + pulse * 3, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
}

function sampleSignalValue(buffer, index, count, now) {
  if (state.analyser) {
    return buffer[Math.floor((index / count) * buffer.length)] / 255;
  }

  const wave =
    Math.sin(now / 520 + index * 0.72) * 0.34 +
    Math.sin(now / 910 + index * 1.7) * 0.2;
  return Math.max(0.08, Math.min(1, 0.42 + wave));
}

function selectedSourceMode() {
  return document.querySelector("input[name='sourceMode']:checked")?.value || "tab";
}

function highlightLanguageChip(code) {
  document.querySelectorAll(".language-chip").forEach((chip) => {
    const isSelected = chip.dataset.language === code;
    chip.style.borderColor = isSelected ? "rgba(15,118,110,.75)" : "";
    chip.style.background = isSelected ? "#eefbf8" : "";
    chip.style.color = isSelected ? "#115e59" : "";
  });
}

async function copyTranscripts() {
  const payload = buildExportPayload();
  try {
    await navigator.clipboard.writeText(payload.content);
    writeNote(`${payload.label}をクリップボードにコピーしました。`);
  } catch {
    writeNote("クリップボードへコピーできませんでした。Exportを使ってください。");
  }
}

function downloadTranscripts() {
  const payload = buildExportPayload();
  const blob = new Blob([payload.content], { type: payload.type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFilename(currentMeetingTitle())}-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.${payload.extension}`;
  link.click();
  URL.revokeObjectURL(url);
  writeNote(`${payload.label}を書き出しました。`);
}

async function generateMinutes() {
  if (state.isGeneratingMinutes) {
    return;
  }

  finalizeTranscript("source");
  finalizeTranscript("translated");
  const meeting = buildSessionJson({ includeMinutes: false });
  if (!meeting.pairs.length) {
    renderMinutes(buildLocalMinutes({ reason: "empty" }), { model: "local" });
    writeNote("議事録用の字幕がまだありません。DemoまたはStartで字幕を作成してください。");
    return;
  }

  setMinutesBusy(true);
  renderMinutesPlaceholder("Generating");
  try {
    let result;
    if (state.config?.hasApiKey && !state.configLoadError && !state.isFileMode) {
      const response = await fetch("/api/minutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const details = payload?.details?.error?.message || payload?.error || `Minutes failed: ${response.status}`;
        throw new Error(details);
      }
      result = payload;
    } else {
      result = { model: "local", minutes: buildLocalMinutes() };
    }

    renderMinutes(result.minutes, { model: result.model || state.minutesModel || "minutes" });
    writeNote("AI議事録を生成しました。Copy MinutesまたはExport Minutesで共有できます。");
    logEvent("minutes.generated", result.model || "minutes", "good");
  } catch (error) {
    const localMinutes = buildLocalMinutes({ reason: "fallback" });
    renderMinutes(localMinutes, { model: "local fallback" });
    throw error;
  } finally {
    setMinutesBusy(false);
  }
}

function handleMinutesError(error) {
  const message = getErrorMessage(error);
  elements.minutesStatus.textContent = "Local Draft";
  writeNote(`AI議事録APIでエラーが発生したためローカル下書きを表示しました。詳細: ${message}`);
  logEvent("minutes.error", message, "error");
}

function setMinutesBusy(isBusy) {
  state.isGeneratingMinutes = isBusy;
  elements.generateMinutesButton.disabled = isBusy;
  elements.minutesStatus.textContent = isBusy ? "Generating" : state.minutes ? "Ready" : "Ready";
}

function renderMinutesPlaceholder(label) {
  elements.minutesOutput.replaceChildren(label);
  elements.minutesOutput.classList.add("is-empty");
  elements.copyMinutesButton.disabled = true;
  elements.downloadMinutesButton.disabled = true;
}

function renderMinutes(minutes, { model = "" } = {}) {
  state.minutes = normalizeClientMinutes(minutes, model);
  elements.minutesStatus.textContent = model;
  elements.minutesOutput.classList.remove("is-empty");
  elements.minutesOutput.replaceChildren();

  appendMinutesSection("Summary", state.minutes.summary || "-");
  appendMinutesList("Decisions", state.minutes.decisions);
  appendActionItems(state.minutes.actionItems);
  appendMinutesList("Questions", state.minutes.questions);
  appendMinutesList("Risks", state.minutes.risks);
  appendMinutesSection("Meeting Health", state.minutes.meetingHealth || "-");
  appendMinutesSection("Follow-up Email", state.minutes.followUpEmail || "-", { pre: true });

  elements.copyMinutesButton.disabled = false;
  elements.downloadMinutesButton.disabled = false;
  updateMeetingReadiness();
}

function appendMinutesSection(title, text, { pre = false } = {}) {
  const section = document.createElement("section");
  section.className = "minutes-section";
  const heading = document.createElement("h3");
  heading.textContent = title;
  const body = document.createElement(pre ? "pre" : "p");
  body.textContent = text;
  section.append(heading, body);
  elements.minutesOutput.append(section);
}

function appendMinutesList(title, items) {
  const section = document.createElement("section");
  section.className = "minutes-section";
  const heading = document.createElement("h3");
  heading.textContent = title;
  const list = document.createElement("ul");
  const normalized = items.length ? items : ["-"];
  for (const item of normalized) {
    const li = document.createElement("li");
    li.textContent = item;
    list.append(li);
  }
  section.append(heading, list);
  elements.minutesOutput.append(section);
}

function appendActionItems(items) {
  const section = document.createElement("section");
  section.className = "minutes-section";
  const heading = document.createElement("h3");
  heading.textContent = "Action Items";
  section.append(heading);

  if (!items.length) {
    const empty = document.createElement("p");
    empty.textContent = "-";
    section.append(empty);
  }

  for (const item of items) {
    const card = document.createElement("div");
    card.className = "action-card";
    const task = document.createElement("strong");
    task.textContent = item.task || "-";
    const meta = document.createElement("p");
    meta.className = "action-meta";
    meta.textContent = `Owner: ${item.owner || "-"} / Due: ${item.due || "-"}`;
    const evidence = document.createElement("p");
    evidence.textContent = item.evidence || "";
    card.append(task, meta, evidence);
    section.append(card);
  }

  elements.minutesOutput.append(section);
}

function normalizeClientMinutes(minutes = {}, model = "") {
  return {
    model,
    summary: String(minutes.summary || ""),
    decisions: normalizeTextList(minutes.decisions),
    actionItems: Array.isArray(minutes.actionItems)
      ? minutes.actionItems.map((item) => ({
          task: String(item?.task || ""),
          owner: String(item?.owner || ""),
          due: String(item?.due || ""),
          evidence: String(item?.evidence || "")
        }))
      : [],
    questions: normalizeTextList(minutes.questions),
    risks: normalizeTextList(minutes.risks),
    followUpEmail: String(minutes.followUpEmail || ""),
    meetingHealth: String(minutes.meetingHealth || "")
  };
}

function normalizeTextList(value) {
  return Array.isArray(value) ? value.map((item) => String(item || "")).filter(Boolean) : [];
}

function buildLocalMinutes({ reason = "" } = {}) {
  const pairs = buildTranscriptPairs();
  const highlightedPairs = pairs.filter((pair) => classifyMeetingPair(pair).length > 0);
  const textFor = (pair) => pair.translated?.text || pair.source?.text || "";
  const withTag = (tag) => highlightedPairs
    .filter((pair) => classifyMeetingPair(pair).some((item) => item.id === tag))
    .map((pair) => `${formatTimelineTime(pair.startSeconds)} ${textFor(pair)}`)
    .filter(Boolean)
    .slice(0, 8);

  return {
    summary: reason === "empty"
      ? "字幕がまだないため、議事録を生成できません。"
      : pairs.slice(-5).map(textFor).filter(Boolean).join(" ") || "会議ログからローカル下書きを作成しました。",
    decisions: withTag("decision"),
    actionItems: withTag("action").map((text) => ({ task: text, owner: "", due: "", evidence: text })),
    questions: withTag("question"),
    risks: withTag("risk"),
    followUpEmail: "",
    meetingHealth: `${pairs.length} segments / ${highlightedPairs.length} highlights`
  };
}

function copyMinutes() {
  if (!state.minutes) {
    return;
  }
  navigator.clipboard.writeText(buildMinutesMarkdown(state.minutes))
    .then(() => writeNote("AI議事録をクリップボードにコピーしました。"))
    .catch(() => writeNote("議事録をコピーできませんでした。Export Minutesを使ってください。"));
}

function downloadMinutes() {
  if (!state.minutes) {
    return;
  }
  const content = buildMinutesMarkdown(state.minutes);
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFilename(currentMeetingTitle())}-minutes-${new Date().toISOString().replace(/[:.]/g, "-")}.md`;
  link.click();
  URL.revokeObjectURL(url);
  writeNote("AI議事録を書き出しました。");
}

function clearMinutes() {
  state.minutes = null;
  if (!elements.minutesOutput) {
    return;
  }
  elements.minutesStatus.textContent = "Ready";
  elements.minutesOutput.replaceChildren("No minutes yet");
  elements.minutesOutput.classList.add("is-empty");
  elements.copyMinutesButton.disabled = true;
  elements.downloadMinutesButton.disabled = true;
}

function buildMinutesMarkdown(minutes = state.minutes) {
  if (!minutes) {
    return "";
  }

  const lines = [
    `# ${currentMeetingTitle()} - AI Minutes`,
    "",
    `- Model: ${minutes.model || state.minutesModel || "minutes"}`,
    `- Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    minutes.summary || "-",
    "",
    "## Decisions",
    "",
    ...markdownList(minutes.decisions),
    "",
    "## Action Items",
    ""
  ];

  if (minutes.actionItems.length) {
    for (const item of minutes.actionItems) {
      lines.push(`- ${item.task || "-"}`);
      lines.push(`  Owner: ${item.owner || "-"} / Due: ${item.due || "-"}`);
      if (item.evidence) {
        lines.push(`  Evidence: ${item.evidence}`);
      }
    }
  } else {
    lines.push("-");
  }

  lines.push(
    "",
    "## Questions",
    "",
    ...markdownList(minutes.questions),
    "",
    "## Risks",
    "",
    ...markdownList(minutes.risks),
    "",
    "## Meeting Health",
    "",
    minutes.meetingHealth || "-",
    "",
    "## Follow-up Email",
    "",
    minutes.followUpEmail || "-",
    ""
  );

  return lines.join("\n");
}

function markdownList(items) {
  return items.length ? items.map((item) => `- ${item}`) : ["-"];
}

function buildExportPayload() {
  const format = elements.exportFormat.value || "txt";
  const builders = {
    txt: () => ({
      content: buildTranscriptText(),
      extension: "txt",
      label: "Transcript TXT",
      type: "text/plain;charset=utf-8"
    }),
    md: () => ({
      content: buildMeetingMarkdown(),
      extension: "md",
      label: "Meeting Markdown",
      type: "text/markdown;charset=utf-8"
    }),
    srt: () => ({
      content: buildSrtSubtitles(),
      extension: "srt",
      label: "SubRip SRT",
      type: "application/x-subrip;charset=utf-8"
    }),
    vtt: () => ({
      content: buildWebVttSubtitles(),
      extension: "vtt",
      label: "WebVTT",
      type: "text/vtt;charset=utf-8"
    }),
    json: () => ({
      content: JSON.stringify(buildSessionJson(), null, 2),
      extension: "json",
      label: "Session JSON",
      type: "application/json;charset=utf-8"
    })
  };
  return (builders[format] || builders.txt)();
}

function buildTranscriptText() {
  const pairs = buildTranscriptPairs();
  const profile = currentTranslationProfile();
  const highlightedPairs = pairs.filter((pair) => classifyMeetingPair(pair).length > 0);
  const lines = [
    currentMeetingTitle(),
    "Realtime Translation Dashboard",
    `Mode: ${state.sessionMode}`,
    `Source: ${selectedSourceMode()}`,
    `Target: ${elements.targetLanguage.value}`,
    `Quality preset: ${profile.preset.label}`,
    `Speakers: ${profile.speakers.source} / ${profile.speakers.translated}`,
    `Generated: ${new Date().toISOString()}`,
    `Duration: ${formatDuration(Math.floor(currentElapsedSeconds()))}`,
    ""
  ];

  if (profile.glossary) {
    lines.push("[Glossary]", profile.glossary, "");
  }

  if (highlightedPairs.length) {
    lines.push("[Highlights]");
    for (const pair of highlightedPairs) {
      lines.push(`${formatTimelineTime(pair.startSeconds)} ${formatPairTags(pair)}: ${pair.source?.text || pair.translated?.text || ""}`);
    }
    lines.push("");
  }

  lines.push("[Meeting Pairs]");
  for (const pair of pairs) {
    lines.push(
      `${formatTimelineTime(pair.startSeconds)} Tags: ${formatPairTags(pair)}`,
      `${pair.sourceSpeaker}: ${pair.source?.text || ""}`,
      `${pair.translatedSpeaker}: ${pair.translated?.text || ""}`,
      ""
    );
  }

  if (state.currentSource || state.currentTranslated) {
    lines.push("[Live]", `${profile.speakers.source}: ${state.currentSource}`, `${profile.speakers.translated}: ${state.currentTranslated}`);
  }

  return lines.filter((line) => line !== undefined).join("\n").trim() + "\n";
}

function buildMeetingMarkdown() {
  const pairs = buildTranscriptPairs();
  const profile = currentTranslationProfile();
  const highlightedPairs = pairs.filter((pair) => classifyMeetingPair(pair).length > 0);
  const lines = [
    `# ${currentMeetingTitle()}`,
    "",
    `- Mode: ${state.sessionMode}`,
    `- Source: ${selectedSourceMode()}`,
    `- Target: ${elements.targetLanguage.value}`,
    `- Quality preset: ${profile.preset.label}`,
    `- Speakers: ${profile.speakers.source} / ${profile.speakers.translated}`,
    `- Generated: ${new Date().toISOString()}`,
    `- Duration: ${formatDuration(Math.floor(currentElapsedSeconds()))}`
  ];

  if (profile.glossary) {
    lines.push("", "## Glossary", "", "```text", profile.glossary, "```");
  }

  if (highlightedPairs.length) {
    lines.push("", "## Highlights", "", "| Time | Tags | Note |", "| --- | --- | --- |");
    for (const pair of highlightedPairs) {
      lines.push(
        `| ${formatTimelineTime(pair.startSeconds)} | ${escapeMarkdownTable(formatPairTags(pair))} | ${escapeMarkdownTable(pair.source?.text || pair.translated?.text || "")} |`
      );
    }
  }

  if (state.minutes) {
    lines.push("", buildMinutesMarkdown(state.minutes).trim());
  }

  lines.push(
    "",
    "## Transcript",
    "",
    "| Time | Tags | Source | Translated |",
    "| --- | --- | --- | --- |"
  );

  for (const pair of pairs) {
    const sourceText = `${pair.sourceSpeaker}: ${pair.source?.text || ""}`;
    const translatedText = `${pair.translatedSpeaker}: ${pair.translated?.text || ""}`;
    lines.push(
      `| ${formatTimelineTime(pair.startSeconds)} | ${escapeMarkdownTable(formatPairTags(pair))} | ${escapeMarkdownTable(sourceText)} | ${escapeMarkdownTable(translatedText)} |`
    );
  }

  if (state.currentSource || state.currentTranslated) {
    lines.push(
      `| live | - | ${escapeMarkdownTable(`${profile.speakers.source}: ${state.currentSource}`)} | ${escapeMarkdownTable(`${profile.speakers.translated}: ${state.currentTranslated}`)} |`
    );
  }

  return lines.join("\n") + "\n";
}

function buildSrtSubtitles() {
  return exportSubtitleSegments()
    .map((segment, index) =>
      [
        String(index + 1),
        `${formatSubtitleTime(segment.startSeconds, ",")} --> ${formatSubtitleTime(segment.endSeconds, ",")}`,
        segment.text
      ].join("\n")
    )
    .join("\n\n") + "\n";
}

function buildWebVttSubtitles() {
  const cues = exportSubtitleSegments()
    .map((segment) =>
      `${formatSubtitleTime(segment.startSeconds, ".")} --> ${formatSubtitleTime(segment.endSeconds, ".")}\n${segment.text}`
    )
    .join("\n\n");
  return `WEBVTT\n\n${cues}\n`;
}

function exportSubtitleSegments() {
  const translated = chronologicalSegments("translated");
  if (state.currentTranslated.trim()) {
    const startSeconds = Math.max(0, currentElapsedSeconds() - estimateSubtitleDuration(state.currentTranslated));
    translated.push({
      id: 0,
      kind: "translated",
      text: state.currentTranslated.trim(),
      at: new Date(),
      startSeconds,
      endSeconds: Math.max(startSeconds + 1.2, currentElapsedSeconds())
    });
  }
  return translated.length ? translated : chronologicalSegments("source");
}

function buildSessionJson({ includeMinutes = true } = {}) {
  const profile = currentTranslationProfile();
  return {
    title: currentMeetingTitle(),
    mode: state.sessionMode,
    source: selectedSourceMode(),
    targetLanguage: elements.targetLanguage.value,
    translationProfile: profile,
    generatedAt: new Date().toISOString(),
    durationSeconds: Math.round(currentElapsedSeconds()),
    pairs: buildTranscriptPairs().map((pair) => ({
      index: pair.index,
      startSeconds: roundSeconds(pair.startSeconds),
      endSeconds: roundSeconds(pair.endSeconds),
      tags: classifyMeetingPair(pair).map((tag) => tag.label),
      sourceSpeaker: pair.sourceSpeaker,
      translatedSpeaker: pair.translatedSpeaker,
      source: pair.source?.text || "",
      translated: pair.translated?.text || ""
    })),
    segments: state.segments.map((segment) => ({
      id: segment.id,
      kind: segment.kind,
      speaker: segment.speaker,
      qualityPreset: segment.qualityPreset,
      text: segment.text,
      at: segment.at.toISOString(),
      startSeconds: roundSeconds(segment.startSeconds),
      endSeconds: roundSeconds(segment.endSeconds)
    })),
    live: {
      sourceSpeaker: profile.speakers.source,
      translatedSpeaker: profile.speakers.translated,
      source: state.currentSource,
      translated: state.currentTranslated
    },
    minutes: includeMinutes ? state.minutes : null
  };
}

function formatSubtitleTime(seconds, separator) {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const wholeSeconds = Math.floor(safeSeconds % 60);
  const milliseconds = Math.floor((safeSeconds % 1) * 1000);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")}${separator}${String(milliseconds).padStart(3, "0")}`;
}

function formatTimelineTime(seconds) {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function escapeMarkdownTable(value) {
  return value.replace(/\|/g, "\\|").replace(/\n/g, "<br>");
}

function safeFilename(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]+/gi, "-")
    .replace(/^-+|-+$/g, "") || "realtime-meeting";
}

function roundSeconds(seconds) {
  return Math.round(seconds * 100) / 100;
}
