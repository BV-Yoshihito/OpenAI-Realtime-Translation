const TRANSLATION_CALL_URL = "https://api.openai.com/v1/realtime/translations/calls";
const MAX_EVENT_LINES = 80;
const MAX_HISTORY_ITEMS = 18;

const elements = {
  apiKeyBadge: document.querySelector("#apiKeyBadge"),
  audioMeter: document.querySelector(".audio-meter"),
  audioState: document.querySelector("#audioState"),
  clearButton: document.querySelector("#clearButton"),
  connectionStatus: document.querySelector("#connectionStatus"),
  copyButton: document.querySelector("#copyButton"),
  demoButton: document.querySelector("#demoButton"),
  downloadButton: document.querySelector("#downloadButton"),
  eventCount: document.querySelector("#eventCount"),
  eventLog: document.querySelector("#eventLog"),
  exportFormat: document.querySelector("#exportFormat"),
  inputTranscription: document.querySelector("#inputTranscription"),
  languageStrip: document.querySelector("#languageStrip"),
  latencyEstimate: document.querySelector("#latencyEstimate"),
  meetingFeed: document.querySelector("#meetingFeed"),
  meetingSummary: document.querySelector("#meetingSummary"),
  meetingTitle: document.querySelector("#meetingTitle"),
  meetingTitleBadge: document.querySelector("#meetingTitleBadge"),
  modeBadge: document.querySelector("#modeBadge"),
  modelBadge: document.querySelector("#modelBadge"),
  noiseReduction: document.querySelector("#noiseReduction"),
  originalAudio: document.querySelector("#originalAudio"),
  originalVolume: document.querySelector("#originalVolume"),
  originalVolumeValue: document.querySelector("#originalVolumeValue"),
  outputRate: document.querySelector("#outputRate"),
  segmentCount: document.querySelector("#segmentCount"),
  sessionClock: document.querySelector("#sessionClock"),
  showFinalOnly: document.querySelector("#showFinalOnly"),
  signalCanvas: document.querySelector("#signalCanvas"),
  signalLabel: document.querySelector("#signalLabel"),
  sourceChars: document.querySelector("#sourceChars"),
  sourceHistory: document.querySelector("#sourceHistory"),
  sourceKind: document.querySelector("#sourceKind"),
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
  translatedVolume: document.querySelector("#translatedVolume"),
  translatedVolumeValue: document.querySelector("#translatedVolumeValue"),
  visualMode: document.querySelector("#visualMode"),
  webrtcState: document.querySelector("#webrtcState")
};

const state = {
  config: null,
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
  ["The model listens while the speaker keeps talking and returns translated speech.", "モデルは話者が話し続けている間も聞き取り、翻訳音声を返します。"],
  ["Captions, audio routing, and session telemetry are visible in one dashboard.", "字幕、音声ルーティング、セッション計測をひとつのダッシュボードで確認できます。"],
  ["This makes webinars, calls, and product launches feel much more multilingual.", "これにより、ウェビナー、通話、製品発表がより多言語に感じられます。"]
];

init().catch((error) => {
  setStatus("error", "Error");
  writeNote(error.message);
  logEvent("startup.error", error.message, "error");
});

async function init() {
  bindControls();
  restorePreferences();
  updateVolumes();
  startSignalLoop();
  await loadConfig();
  resetTranscripts();
  setStatus("idle", "Idle");
  writeNote("APIキーを設定すると実接続、未設定でもDemoで確認できます。");
}

function bindControls() {
  elements.startButton.addEventListener("click", () => startSession().catch(handleFatalError));
  elements.demoButton.addEventListener("click", startDemo);
  elements.stopButton.addEventListener("click", stopSession);
  elements.clearButton.addEventListener("click", resetTranscripts);
  elements.copyButton.addEventListener("click", copyTranscripts);
  elements.downloadButton.addEventListener("click", downloadTranscripts);
  elements.meetingTitle.addEventListener("input", () => {
    localStorage.setItem("translation.meetingTitle", currentMeetingTitle());
    updateMeetingMeta();
  });
  elements.showFinalOnly.addEventListener("change", renderLiveCaptions);
  elements.targetLanguage.addEventListener("change", () => {
    const code = elements.targetLanguage.value;
    localStorage.setItem("translation.targetLanguage", code);
    elements.targetBadge.textContent = code.toUpperCase();
    highlightLanguageChip(code);
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
  const savedVisual = localStorage.getItem("translation.visualMode") || "wave";
  if (["wave", "spectrum", "flow"].includes(savedVisual)) {
    elements.visualMode.value = savedVisual;
  }
  updateVisualMode({ persist: false, announce: false });
  updateSessionMode({ persist: false, announce: false });
  updateMeetingMeta();
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
  const response = await fetch("/api/config", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Config failed: ${response.status}`);
  }

  state.config = await response.json();
  elements.apiKeyBadge.textContent = state.config.hasApiKey ? "API Ready" : "No API Key";
  elements.apiKeyBadge.style.borderColor = state.config.hasApiKey ? "rgba(21,128,61,.35)" : "rgba(200,117,8,.45)";
  elements.modelBadge.textContent = state.config.translationModel;
  populateLanguages(state.config.languages);
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

async function startSession() {
  if (state.isRunning) {
    return;
  }

  if (!state.config?.hasApiKey) {
    throw new Error("OPENAI_API_KEY is not configured. Add it to .env or use Demo mode.");
  }

  stopSession();
  resetRuntime();
  setRunningUi(true);
  setStatus("connecting", "Connecting");
  updateMeetingMeta();
  writeNote("音声入力の許可を待っています。");
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
      throw new Error(describeMediaCaptureError(error, selectedSourceMode()));
    }
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
    stopSession();
    throw error;
  }
}

async function createTranslationSession() {
  const response = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      targetLanguage: elements.targetLanguage.value,
      inputTranscription: elements.inputTranscription.checked,
      noiseReduction: elements.noiseReduction.value
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = payload?.details?.error?.message || payload?.error || `Session failed: ${response.status}`;
    throw new Error(details);
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
    throw new Error(await sdpResponse.text());
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
}

function createTranscriptSegment(kind, text) {
  const endSeconds = Math.max(currentElapsedSeconds(), lastSegmentEnd(kind) + 0.1);
  const estimatedDuration = estimateSubtitleDuration(text);
  const startSeconds = Math.max(0, Math.max(lastSegmentEnd(kind) + 0.1, endSeconds - estimatedDuration));

  return {
    id: state.nextSegmentId++,
    kind,
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
    const node = document.createElement("article");
    node.className = "meeting-item";

    const heading = document.createElement("div");
    heading.className = "meeting-item-heading";
    const time = document.createElement("time");
    time.dateTime = pair.at.toISOString();
    time.textContent = formatTimelineTime(pair.startSeconds);
    const label = document.createElement("span");
    label.textContent = `Segment ${pair.index}`;
    heading.append(time, label);

    const source = document.createElement("p");
    source.className = "meeting-source";
    source.textContent = pair.source?.text || "";

    const translated = document.createElement("p");
    translated.className = "meeting-translated";
    translated.textContent = pair.translated?.text || "";

    node.append(heading, source, translated);
    elements.meetingFeed.append(node);
  }
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
      at: source?.at || translated?.at || new Date()
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

function stopSession() {
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
  renderLiveCaptions();
  renderHistory();
  updateTranscriptStats();
  updateMeetingMeta();
}

function setRunningUi(isRunning) {
  elements.startButton.disabled = isRunning;
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
  setStatus("error", "Error");
  setRunningUi(false);
  writeNote(error.message);
  logEvent("fatal", error.message, "error");
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
  const lines = [
    currentMeetingTitle(),
    "Realtime Translation Dashboard",
    `Mode: ${state.sessionMode}`,
    `Source: ${selectedSourceMode()}`,
    `Target: ${elements.targetLanguage.value}`,
    `Generated: ${new Date().toISOString()}`,
    `Duration: ${formatDuration(Math.floor(currentElapsedSeconds()))}`,
    "",
    "[Meeting Pairs]"
  ];

  for (const pair of pairs) {
    lines.push(
      `${formatTimelineTime(pair.startSeconds)} Source: ${pair.source?.text || ""}`,
      `${formatTimelineTime(pair.startSeconds)} Translated: ${pair.translated?.text || ""}`,
      ""
    );
  }

  if (state.currentSource || state.currentTranslated) {
    lines.push("[Live]", `Source: ${state.currentSource}`, `Translated: ${state.currentTranslated}`);
  }

  return lines.filter((line) => line !== undefined).join("\n").trim() + "\n";
}

function buildMeetingMarkdown() {
  const pairs = buildTranscriptPairs();
  const lines = [
    `# ${currentMeetingTitle()}`,
    "",
    `- Mode: ${state.sessionMode}`,
    `- Source: ${selectedSourceMode()}`,
    `- Target: ${elements.targetLanguage.value}`,
    `- Generated: ${new Date().toISOString()}`,
    `- Duration: ${formatDuration(Math.floor(currentElapsedSeconds()))}`,
    "",
    "| Time | Source | Translated |",
    "| --- | --- | --- |"
  ];

  for (const pair of pairs) {
    lines.push(
      `| ${formatTimelineTime(pair.startSeconds)} | ${escapeMarkdownTable(pair.source?.text || "")} | ${escapeMarkdownTable(pair.translated?.text || "")} |`
    );
  }

  if (state.currentSource || state.currentTranslated) {
    lines.push(
      `| live | ${escapeMarkdownTable(state.currentSource)} | ${escapeMarkdownTable(state.currentTranslated)} |`
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

function buildSessionJson() {
  return {
    title: currentMeetingTitle(),
    mode: state.sessionMode,
    source: selectedSourceMode(),
    targetLanguage: elements.targetLanguage.value,
    generatedAt: new Date().toISOString(),
    durationSeconds: Math.round(currentElapsedSeconds()),
    pairs: buildTranscriptPairs().map((pair) => ({
      index: pair.index,
      startSeconds: roundSeconds(pair.startSeconds),
      endSeconds: roundSeconds(pair.endSeconds),
      source: pair.source?.text || "",
      translated: pair.translated?.text || ""
    })),
    segments: state.segments.map((segment) => ({
      id: segment.id,
      kind: segment.kind,
      text: segment.text,
      at: segment.at.toISOString(),
      startSeconds: roundSeconds(segment.startSeconds),
      endSeconds: roundSeconds(segment.endSeconds)
    })),
    live: {
      source: state.currentSource,
      translated: state.currentTranslated
    }
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
