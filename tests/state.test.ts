import { describe, expect, it } from "vitest";
import { defaultState, ensureDay, exportJson, importJson } from "../src/core/state";

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
