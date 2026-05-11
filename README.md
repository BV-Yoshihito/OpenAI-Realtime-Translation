# Realtime Translation Dashboard

Browser-first dashboard for OpenAI Realtime Translation. It captures tab audio or microphone audio, sends it to `gpt-realtime-translate` over WebRTC, plays translated speech, and renders source/translated transcript streams with operator telemetry.

## Run

```bash
cp .env.example .env
# add OPENAI_API_KEY to .env
npm start
```

Open the URL printed by the server. If `OPENAI_API_KEY` is not set, the dashboard still works in Demo mode so you can inspect the UI and telemetry.

## What It Implements

- Server-created short-lived Realtime Translation client secrets.
- Browser WebRTC call to `https://api.openai.com/v1/realtime/translations/calls`.
- Tab audio capture via `getDisplayMedia()` and microphone capture via `getUserMedia()`.
- Input and output transcript delta handling over the `oai-events` data channel.
- Target-language selection, near-field noise reduction, input transcription, audio mix, event log, metrics, transcript export, and a local visual signal monitor.
- Meeting mode with a meeting title, Mic-first setup, paired source/translated timeline, segment counts, and export-ready meeting notes.
- Subtitle export as TXT, Markdown, SRT, WebVTT, or JSON.

## Meeting Mode

Select `Meeting`, set the meeting title, choose the target language, then press `Start` or `Demo`. Meeting mode keeps a paired timeline of source and translated text. `Export Format` controls whether `Copy` and `Export` produce TXT, Markdown, SRT, WebVTT, or JSON.

## Validation

```bash
npm test
```

## References

- OpenAI Live Translation guide: https://developers.openai.com/api/docs/guides/realtime-translation
- OpenAI Cookbook: https://developers.openai.com/cookbook/examples/voice_solutions/realtime_translation_guide
- Cookbook browser demo: https://github.com/openai/openai-cookbook/tree/main/examples/voice_solutions/realtime_translation_guide/browser-translation-demo
