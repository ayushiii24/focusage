import assert from "node:assert/strict";
import test from "node:test";
import planner from "../dist/services/aiPlannerService.js";
import studyPlanController from "../dist/controllers/studyPlanController.js";
import plannerService from "../dist/services/aiPlannerService.js";

const {
  callGemini,
  applyPlanEnhancement,
  parseBreakdownResponse,
} = planner;

const deterministicItems = [
  { title: "Read chapter", plannedMinutes: 25, notes: "Original note", priority: "high" },
  { title: "Solve problems", plannedMinutes: 30, notes: "Second note", priority: "medium" },
];

async function withGeminiKeyAndFetch(fetchMock, action) {
  const previousKey = process.env.GEMINI_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "test-key";
  globalThis.fetch = fetchMock;
  try {
    return await action();
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  }
}

test("Gemini success uses supported model and API key header", async () => {
  let request;
  const result = await withGeminiKeyAndFetch(async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }),
    };
  }, () => callGemini("prompt", "instruction"));

  assert.equal(result, "{\"ok\":true}");
  assert.match(request.url, /models\/gemini-3\.8-flash:generateContent$/);
  assert.equal(new URL(request.url).search, "");
  assert.equal(request.options.headers["x-goog-api-key"], "test-key");
  assert.ok(request.options.signal instanceof AbortSignal);
  assert.equal(request.options.signal.aborted, false);
});

test("provider errors return null for deterministic fallback", async () => {
  const previousWarn = console.warn;
  console.warn = () => {};
  try {
    const result = await withGeminiKeyAndFetch(async () => ({ ok: false, status: 503 }), () => callGemini("p", "s"));
    assert.equal(result, null);
  } finally {
    console.warn = previousWarn;
  }
});

test("timeout aborts the request and returns null", async () => {
  const previousWarn = console.warn;
  console.warn = () => {};
  const keepAlive = setTimeout(() => {}, 50);
  try {
    const result = await withGeminiKeyAndFetch((_url, { signal }) => new Promise((_, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    }), () => callGemini("p", "s", 5));
    assert.equal(result, null);
  } finally {
    clearTimeout(keepAlive);
    console.warn = previousWarn;
  }
});

test("planner enhancement is validated and malformed output applies nothing", () => {
  const fallback = { summary: "base", aiRecommendation: "base recommendation" };
  const malformed = JSON.stringify({
    summary: "partial AI summary",
    aiRecommendation: "AI recommendation",
    items: [
      { title: "Read chapter", plannedMinutes: 25, notes: "AI note" },
      { title: "Wrong task", plannedMinutes: 30, notes: "Bad mapping" },
    ],
  });
  assert.deepEqual(
    applyPlanEnhancement(malformed, deterministicItems, fallback.summary, fallback.aiRecommendation),
    { items: deterministicItems, ...fallback }
  );

  const valid = JSON.stringify({
    summary: "AI summary",
    aiRecommendation: "AI recommendation",
    items: [
      { title: "Read chapter", plannedMinutes: 25, notes: "First note" },
      { title: "Solve problems", plannedMinutes: 30, notes: "Second note" },
    ],
  });
  const enhanced = applyPlanEnhancement(valid, deterministicItems, fallback.summary, fallback.aiRecommendation);
  assert.equal(enhanced.summary, "AI summary");
  assert.deepEqual(enhanced.items.map((item) => item.notes), ["First note", "Second note"]);
  assert.deepEqual(deterministicItems.map((item) => item.notes), ["Original note", "Second note"]);
});

test("breakdown validation accepts only 3-4 bounded, well-typed subtasks", () => {
  const good = [
    { title: "Review notes", estimatedMinutes: 20, priority: "low" },
    { title: "Practice questions", estimatedMinutes: 35, priority: "high" },
    { title: "Self test", estimatedMinutes: 25, priority: "medium" },
  ];
  assert.deepEqual(parseBreakdownResponse(JSON.stringify({ subtasks: good })), good);
  assert.equal(parseBreakdownResponse(JSON.stringify({ subtasks: good.slice(0, 2) })), null);
  assert.equal(parseBreakdownResponse(JSON.stringify({ subtasks: [...good, ...good] })), null);
  assert.equal(parseBreakdownResponse(JSON.stringify({ subtasks: [{ ...good[0], title: "  " }, ...good.slice(1)] })), null);
  assert.equal(parseBreakdownResponse(JSON.stringify({ subtasks: [{ ...good[0], estimatedMinutes: 20.5 }, ...good.slice(1)] })), null);
  assert.equal(parseBreakdownResponse(JSON.stringify({ subtasks: [{ ...good[0], estimatedMinutes: 46 }, ...good.slice(1)] })), null);
  assert.equal(parseBreakdownResponse(JSON.stringify({ subtasks: [{ ...good[0], priority: "urgent" }, ...good.slice(1)] })), null);
  assert.equal(parseBreakdownResponse("not json"), null);
});

test("available minutes must be an integer in the inclusive 15-960 range", async () => {
  const previousGenerate = plannerService.generateDailyStudyPlan;
  plannerService.generateDailyStudyPlan = async (options) => options;
  const invoke = async (availableMinutes) => {
    let statusCode;
    let body;
    await studyPlanController.generatePlan(
      { body: { availableMinutes }, user: { userId: "user-1" } },
      { status(code) { statusCode = code; return this; }, json(value) { body = value; return this; } }
    );
    return { statusCode, body };
  };
  try {
    for (const value of [15, 960]) assert.equal((await invoke(value)).statusCode, 200);
    for (const value of [1, 14, 961, 15.5, "120", null]) {
      await assert.rejects(() => invoke(value), (error) => error.statusCode === 400);
    }
  } finally {
    plannerService.generateDailyStudyPlan = previousGenerate;
  }
});
