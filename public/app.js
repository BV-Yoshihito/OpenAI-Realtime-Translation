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
  inputTranscription: document.querySelector("#inputTranscription"),
  languageStrip: document.querySelector("#languageStrip"),
  latencyEstimate: document.querySelector("#latencyEstimate"),
  modelBadge: document.querySelector("#modelBadge"),
  noiseReduction: document.querySelector("#noiseReduction"),
  originalAudio: document.querySelector("#originalAudio"),
  originalVolume: document.querySelector("#originalVolume"),
  originalVolumeValue: document.querySelector("#originalVolumeValue"),
  outputRate: document.querySelector("#outputRate"),
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
  webrtcState: document.querySelector("#webrtcState")
};

const state = {
  config: null,
  pc: null,
  dataChannel: null,
  sourceStream: null,
  startedAt: null,
  clockTimer: null,
  demoTimers: [],
  analyser: null,
  audioContext: null,
  animationFrame: null,
  isRunning: false,
  isDemo: false,
  demoVoice: null,
  currentSource: "",
  currentTranslated: "",
  fullSource: [],
  fullTranslated: [],
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
  elements.showFinalOnly.addEventListener("change", renderLiveCaptions);
  elements.targetLanguage.addEventListener("change", () => {
    const code = elements.targetLanguage.value;
    localStorage.setItem("translation.targetLanguage", code);
    elements.targetBadge.textContent = code.toUpperCase();
    highlightLanguageChip(code);
  });
  elements.translatedVolume.addEventListener("input", updateVolumes);
  elements.originalVolume.addEventListener("input", updateVolumes);
  window.speechSynthesis?.addEventListener("voiceschanged", selectDemoVoice);
  document.querySelectorAll("input[name='sourceMode']").forEach((input) => {
    input.addEventListener("change", () => {
      elements.sourceKind.textContent = selectedSourceMode() === "tab" ? "Tab" : "Mic";
    });
  });
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
  writeNote("音声入力の許可を待っています。");
  logEvent("session.start", `${selectedSourceMode()} -> ${elements.targetLanguage.value}`, "good");

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

  if (kind === "source") {
    state.fullSource.unshift({ text, at: new Date() });
    state.currentSource = "";
  } else {
    state.fullTranslated.unshift({ text, at: new Date() });
    state.currentTranslated = "";
  }

  trimHistory();
  renderLiveCaptions();
  renderHistory();
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
  state.metrics.inputChars = 0;
  state.metrics.outputChars = 0;
  renderLiveCaptions();
  renderHistory();
  updateTranscriptStats();
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
    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);
    drawSignalBackground(context, width, height);

    if (state.analyser) {
      state.analyser.getByteFrequencyData(buffer);
      drawFrequencyBars(context, buffer, width, height);
    } else {
      drawAmbientSignal(context, width, height, performance.now());
    }

    drawTranslationPath(context, width, height, performance.now());
    state.animationFrame = requestAnimationFrame(render);
  };

  render();
}

function drawSignalBackground(context, width, height) {
  context.fillStyle = "#111418";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "rgba(255,255,255,0.055)";
  context.lineWidth = 1;
  for (let x = 0; x < width; x += 52) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = 0; y < height; y += 42) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
}

function drawFrequencyBars(context, buffer, width, height) {
  const barCount = 96;
  const gap = 3;
  const barWidth = (width - gap * (barCount - 1)) / barCount;
  for (let index = 0; index < barCount; index += 1) {
    const value = buffer[Math.floor((index / barCount) * buffer.length)] / 255;
    const barHeight = Math.max(8, value * height * 0.62);
    const hue = index < barCount / 2 ? "#2dd4bf" : "#f59e0b";
    context.fillStyle = hue;
    context.globalAlpha = 0.28 + value * 0.65;
    context.fillRect(index * (barWidth + gap), height - barHeight - 38, barWidth, barHeight);
  }
  context.globalAlpha = 1;
}

function drawAmbientSignal(context, width, height, now) {
  context.strokeStyle = "rgba(45, 212, 191, 0.72)";
  context.lineWidth = 3;
  context.beginPath();
  for (let x = 0; x < width; x += 6) {
    const y =
      height * 0.55 +
      Math.sin(x / 38 + now / 640) * 28 +
      Math.sin(x / 17 + now / 980) * 9;
    if (x === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }
  context.stroke();
}

function drawTranslationPath(context, width, height, now) {
  const y = height * 0.22;
  context.strokeStyle = "rgba(255,255,255,0.22)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(78, y);
  context.bezierCurveTo(width * 0.32, y - 45, width * 0.68, y + 45, width - 78, y);
  context.stroke();

  for (let i = 0; i < 5; i += 1) {
    const t = ((now / 1400 + i * 0.2) % 1);
    const x = 78 + (width - 156) * t;
    const pulse = 0.55 + Math.sin(now / 240 + i) * 0.25;
    context.fillStyle = i % 2 ? "rgba(245, 158, 11, 0.9)" : "rgba(45, 212, 191, 0.9)";
    context.globalAlpha = state.isRunning ? 0.9 : 0.42;
    context.beginPath();
    context.arc(x, y + Math.sin(t * Math.PI * 2) * 22, 5 + pulse * 3, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
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
  const text = buildTranscriptText();
  try {
    await navigator.clipboard.writeText(text);
    writeNote("字幕をクリップボードにコピーしました。");
  } catch {
    writeNote("クリップボードへコピーできませんでした。Exportを使ってください。");
  }
}

function downloadTranscripts() {
  const blob = new Blob([buildTranscriptText()], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `realtime-translation-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

function buildTranscriptText() {
  const lines = [
    "Realtime Translation Dashboard",
    `Target: ${elements.targetLanguage.value}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    "[Source]",
    ...state.fullSource
      .slice()
      .reverse()
      .map((item) => `${item.at.toISOString()} ${item.text}`),
    state.currentSource ? `live ${state.currentSource}` : "",
    "",
    "[Translated]",
    ...state.fullTranslated
      .slice()
      .reverse()
      .map((item) => `${item.at.toISOString()} ${item.text}`),
    state.currentTranslated ? `live ${state.currentTranslated}` : ""
  ];
  return lines.filter((line) => line !== "").join("\n");
}
