# Realtime Translation Dashboard

OpenAI Realtime Translation を使った、ブラウザファーストのリアルタイム翻訳ダッシュボードです。ブラウザタブ音声またはマイク音声を取得し、WebRTC 経由で `gpt-realtime-translate` に送信します。翻訳音声の再生、原文/翻訳字幕、会議ログ、字幕エクスポート、セッション計測をひとつの画面で確認できます。

## ローカル起動

```bash
cp .env.example .env
# .env に OPENAI_API_KEY を設定
npm start
```

サーバーに表示されたURLをブラウザで開きます。`OPENAI_API_KEY` が未設定でも、`Demo` モードでUI、字幕、計測表示を確認できます。

## 実装内容

- サーバー側で短命な Realtime Translation client secret を作成
- `https://api.openai.com/v1/realtime/translations/calls` への WebRTC 接続
- `getDisplayMedia()` によるタブ音声取得
- `getUserMedia()` によるマイク音声取得
- `oai-events` データチャンネル経由の入力/出力字幕イベント処理
- 翻訳先言語の選択、ノイズ低減、入力文字起こし、音声ミックス、イベントログ、計測表示
- 会議モード、会議タイトル、原文/翻訳ペアのタイムライン、セグメント数表示
- TXT、Markdown、SRT、WebVTT、JSON 形式の字幕/会議ログエクスポート

## 会議モード

`Meeting` を選択し、会議タイトルと翻訳先言語を設定してから `Start` または `Demo` を押します。

会議モードでは、原文と翻訳をペアにしたタイムラインを表示します。`Export Format` で出力形式を選ぶと、`Copy` と `Export` の内容もその形式に切り替わります。SRT/WebVTT は翻訳字幕中心、Markdown/JSON は原文と翻訳のペアも残します。

## Netlifyでチームに共有する

このリポジトリは Netlify Functions 対応済みです。Netlify は `public/` を公開し、`netlify/functions` が短命な OpenAI Realtime Translation client secret を作成します。`OPENAI_API_KEY` はブラウザには公開されません。

1. このフォルダ全体を GitHub にpushするか、Netlify CLI でプロジェクトルートからデプロイします。
2. Netlifyサイトを作成します。
   - Publish directory: `public`
   - Functions directory: `netlify/functions`
3. Netlifyの環境変数に以下を設定します。
   - 必須: `OPENAI_API_KEY`
   - 任意: `OPENAI_TRANSLATION_MODEL`
   - 任意: `OPENAI_INPUT_TRANSCRIPTION_MODEL`
   - 任意: `OPENAI_SAFETY_IDENTIFIER`
4. デプロイ後、発行されたNetlify URLをチームに共有します。

`public/` フォルダだけをNetlify Dropにドラッグ&ドロップすると、Functionsが含まれないため `/api/config` が404になります。必ず `netlify.toml` と `netlify/functions` を含むプロジェクト全体をデプロイしてください。

注意: サイトにアクセスできる人は、あなたの OpenAI アカウント経由で翻訳セッションを作成できます。チーム内限定で共有し、必要に応じてNetlify側のアクセス制限、共有パスコード、OpenAIの使用量上限を設定してください。

## 検証

```bash
npm test
```

## 参考リンク

- OpenAI Live Translation guide: https://developers.openai.com/api/docs/guides/realtime-translation
- OpenAI Cookbook: https://developers.openai.com/cookbook/examples/voice_solutions/realtime_translation_guide
- Cookbook browser demo: https://github.com/openai/openai-cookbook/tree/main/examples/voice_solutions/realtime_translation_guide/browser-translation-demo
