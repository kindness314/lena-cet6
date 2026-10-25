import { describe, expect, it, vi } from "vitest";
import { defaultState, ensureDay, exportJson, importJson } from "../src/core/state";
import { loadState } from "../src/core/storage";

describe("state persistence", () => {
  it("round-trips through export and import", () => {
    const s = defaultState();
    s.words.alpha = { box: 2, due: 123, seen: 3, wrong: 1 };
    s.tasks["2026-10-24"] = true;
    const restored = importJson(exportJson(s));
    expect(restored.words.alpha).toEqual(s.words.alpha);
    expect(restored.tasks["2026-10-24"]).toBe(true);
  });

  it("rejects malformed input", () => {
    expect(() => importJson("{")).toThrow("不是合法的 JSON");
    expect(() => importJson('{"v":2}')).toThrow("版本不匹配");
    expect(() => importJson('{"v":1}')).toThrow("words");
  });
});

describe("story scene migration", () => {
  it("defaults to the daily rotation", () => {
    expect(defaultState().storySceneId).toBe("");
  });

  it("preserves a manual scene and drops non-strings", () => {
    const s = defaultState();
    s.storySceneId = "lighthouse";
    expect(importJson(exportJson(s)).storySceneId).toBe("lighthouse");

    const legacy = {
      v: 1,
      words: {},
      chat: { day: "", msgs: [], idx: 0 },
      goals: [],
      settings: { quota: 12, newCap: 8, sound: true },
    };
    expect(importJson(JSON.stringify(legacy)).storySceneId).toBe("");
    expect(importJson(JSON.stringify({ ...legacy, storySceneId: 7 })).storySceneId).toBe("");
  });
});

describe("game queue", () => {
  it("round-trips through export and import", () => {
    const s = defaultState();
    s.gameQueue = ["temper", "oyster"];
    expect(importJson(exportJson(s)).gameQueue).toEqual(["temper", "oyster"]);
  });

  it("fills an empty queue for older saves and drops junk", () => {
    const legacy = {
      v: 1,
      words: {},
      chat: { day: "", msgs: [], idx: 0 },
      goals: [],
      settings: { quota: 12, newCap: 8, sound: true },
    };
    expect(importJson(JSON.stringify(legacy)).gameQueue).toEqual([]);
    const mixed = { ...legacy, gameQueue: ["temper", 7, "temper", "", "council"] };
    expect(importJson(JSON.stringify(mixed)).gameQueue).toEqual(["temper", "council"]);
  });

  it("caps the queue at 200 entries", () => {
    const s = defaultState();
    s.gameQueue = Array.from({ length: 260 }, (_, i) => `w${i}`);
    expect(importJson(exportJson(s)).gameQueue).toHaveLength(200);
  });
});

describe("ensureDay", () => {
  it("generates once per day and does not backfill missed days", () => {
    const s = defaultState();
    let calls = 0;
    const gen = () => {
      calls++;
      return [
        { id: "m", w: "alpha", en: "", zh: "", opts: ["", "", "", ""], correct: 0 },
      ];
    };
    ensureDay(s, "2026-10-24", gen);
    ensureDay(s, "2026-10-24", gen);
    expect(calls).toBe(1);
    s.chat.idx = 1;
    s.storySeen = 1;
    ensureDay(s, "2026-10-27", gen);
    expect(calls).toBe(2);
    expect(s.chat.idx).toBe(0);
    expect(s.storySeen).toBe(0);
    expect(s.chat.day).toBe("2026-10-27");
  });
});

describe("state sanitizing", () => {
  it("drops malformed entries instead of breaking a view", () => {
    const bad = {
      v: 1,
      words: {
        good: { box: 99, due: 123, seen: -2, wrong: "x" },
        bad: { box: 1, due: "tomorrow", seen: 1, wrong: 1 },
      },
      chat: {
        day: 7,
        msgs: [
          null,
          {
            id: "ok",
            w: "system",
            en: "System.",
            zh: "系统",
            opts: ["系统", "政府", "点", "研究"],
            correct: 0,
            picked: 9,
          },
          { w: "oops", zh: "x", opts: ["x", "y"], correct: 5 },
        ],
        idx: 99,
      },
      storySeen: 99,
      storySceneId: 4,
      goals: [
        { id: "g", name: "六级笔试", date: "2026-12-12T15:00:00+08:00" },
        { id: "bad", name: "无日期", date: "not-a-date" },
        null,
      ],
      settings: { quota: 7, newCap: 99, sound: "yes" },
      reads: { a: -1, b: 4.6, c: "nope" },
      tasks: { done: true, no: 1 },
    };
    const restored = importJson(JSON.stringify(bad));
    expect(restored.words).toEqual({ good: { box: 5, due: 123, seen: 0, wrong: 0 } });
    expect(restored.chat.msgs).toHaveLength(1);
    expect(restored.chat.msgs[0].picked).toBeUndefined();
    expect(restored.chat.idx).toBe(1);
    expect(restored.storySeen).toBe(1);
    expect(restored.storySceneId).toBe("");
    expect(restored.goals).toHaveLength(1);
    expect(restored.settings).toEqual({ quota: 12, newCap: 20, sound: true });
    expect(restored.reads).toEqual({ b: 4 });
    expect(restored.tasks).toEqual({ done: true });
  });

  it("falls back to a clean state when localStorage is corrupt", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    });
    store.set("cet6.state.v1", "{not json");
    expect(loadState()).toEqual(defaultState());

    store.set("cet6.state.v1", JSON.stringify({ v: 1, words: {}, chat: { msgs: [null] }, goals: [], settings: { quota: 12 } }));
    expect(loadState()).toEqual(defaultState());
    vi.unstubAllGlobals();
  });
});
