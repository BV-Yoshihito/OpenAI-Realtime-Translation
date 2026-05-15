import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMinutesRequestPayload,
  createMeetingMinutes,
  extractResponseText,
  normalizeMeetingForMinutes
} from "../src/minutes.js";

test("builds a structured Responses API minutes request", () => {
  const request = buildMinutesRequestPayload({
    meeting: sampleMeeting(),
    model: "gpt-5.4-mini"
  });

  assert.equal(request.model, "gpt-5.4-mini");
  assert.equal(request.text.format.type, "json_schema");
  assert.equal(request.text.format.name, "meeting_minutes");
  assert.equal(request.text.format.strict, true);
  assert.match(request.instructions, /Return JSON only/);
});

test("normalizes meeting input for minutes", () => {
  const normalized = normalizeMeetingForMinutes({
    title: "  Demo Meeting  ",
    translationProfile: { speakers: { source: "Alice", translated: "Interpreter" } },
    pairs: [
      { index: 1, tags: ["Decision"], source: "We approved launch.", translated: "ローンチを承認しました。" }
    ]
  });

  assert.equal(normalized.title, "Demo Meeting");
  assert.equal(normalized.pairs[0].tags[0], "Decision");
  assert.equal(normalized.pairs[0].translated, "ローンチを承認しました。");
});

test("extracts output text from Responses API shapes", () => {
  assert.equal(extractResponseText({ output_text: "{\"summary\":\"ok\"}" }), '{"summary":"ok"}');
  assert.equal(
    extractResponseText({ output: [{ content: [{ type: "output_text", text: "{}" }] }] }),
    "{}"
  );
});

test("createMeetingMinutes calls the Responses API and parses JSON", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({
      model: "gpt-5.4-mini",
      output_text: JSON.stringify({
        summary: "要約です。",
        decisions: ["決定事項"],
        actionItems: [{ task: "資料を送る", owner: "Alice", due: "Friday", evidence: "Please send" }],
        questions: [],
        risks: [],
        followUpEmail: "お疲れさまでした。",
        meetingHealth: "良好"
      })
    }), { status: 200 });
  };

  const result = await createMeetingMinutes({
    apiKey: "sk-test",
    meeting: sampleMeeting(),
    fetchImpl
  });

  assert.equal(calls[0].url, "https://api.openai.com/v1/responses");
  assert.equal(JSON.parse(calls[0].init.body).text.format.type, "json_schema");
  assert.equal(result.minutes.summary, "要約です。");
  assert.equal(result.minutes.actionItems[0].task, "資料を送る");
});

function sampleMeeting() {
  return {
    title: "Realtime Meeting",
    targetLanguage: "ja",
    translationProfile: {
      preset: { id: "business", label: "Business Meeting" },
      glossary: "Brainverse = ブレインバース",
      speakers: { source: "Speaker", translated: "Interpreter" }
    },
    pairs: [
      {
        index: 1,
        tags: ["Decision"],
        source: "We decided to launch on Friday.",
        translated: "金曜日にローンチすることを決定しました。"
      }
    ]
  };
}
