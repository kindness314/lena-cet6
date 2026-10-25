import { describe, expect, it } from "vitest";
import { buildDay, cleanZh, makeMsg } from "../src/core/messages";
import type { Word, WordState } from "../src/core/types";

const w = (word: string, freq: number, zh = `释义-${word}`, pos = "n"): Word => ({
  id: word,
  w: word,
  ph: "",
  pos,
  zh,
  freq,
});

const words: Word[] = [
  w("alpha", 10),
  w("beta", 20),
  w("gamma", 30),
  w("delta", 40),
  w("epsilon", 50),
];

const sentences = { alpha: [["Alpha is first.", "阿尔法第一。"]] as [string, string][] };

describe("buildDay", () => {
  const base = {
    words,
    sentences,
    quota: 3,
    newCap: 2,
    seed: "2026-10-24",
    themeWords: ["alpha", "beta", "gamma", "delta", "epsilon"],
  };

  it("prefers due reviews over new words", () => {
    const wordsState: Record<string, WordState> = {
      delta: { box: 1, due: 0, seen: 1, wrong: 0 },
      beta: { box: 1, due: 150, seen: 1, wrong: 0 },
    };
    const msgs = buildDay({ ...base, now: 100, wordsState });
    expect(msgs.map((m) => m.w)).toEqual(["delta", "alpha", "gamma"]);
  });

  it("caps new words and keeps the queue at quota", () => {
    const msgs = buildDay({ ...base, now: 0, wordsState: {}, quota: 2, newCap: 1 });
    expect(msgs).toHaveLength(1);
    expect(msgs[0].w).toBe("alpha");
  });

  it("never exceeds quota when reviews pile up", () => {
    const wordsState: Record<string, WordState> = Object.fromEntries(
      words.map((word) => [word.w, { box: 1, due: 0, seen: 1, wrong: 0 }]),
    );
    const msgs = buildDay({ ...base, now: 10, wordsState, quota: 3, newCap: 2 });
    expect(msgs).toHaveLength(3);
  });

  it("is stable for the same day seed", () => {
    const a = buildDay({ ...base, now: 0, wordsState: {} });
    const b = buildDay({ ...base, now: 999, wordsState: {} });
    expect(a).toEqual(b);
  });

  it("fills every fresh slot from the theme pool ahead of freq order", () => {
    const msgs = buildDay({ ...base, now: 0, wordsState: {}, themeWords: ["delta", "epsilon", "alpha"] });
    // newCap=2：pool 前两个词占满新词名额，freq 更高的 alpha/beta/gamma 让位
    expect(msgs.map((m) => m.w)).toEqual(["delta", "epsilon"]);
  });

  it("adds no new words once the pool is exhausted instead of borrowing unthemed words", () => {
    const msgs = buildDay({ ...base, now: 0, wordsState: {}, themeWords: ["delta"] });
    // delta 是池里最后一个词：freq 更高的 alpha/beta 属于小游戏，不进剧情队列
    expect(msgs.map((m) => m.w)).toEqual(["delta"]);
    expect(buildDay({ ...base, now: 0, wordsState: {}, themeWords: [] })).toEqual([]);
  });

  it("ignores theme words that are already learned or unknown", () => {
    const wordsState: Record<string, WordState> = {
      gamma: { box: 1, due: 99, seen: 1, wrong: 0 },
    };
    const msgs = buildDay({ ...base, now: 10, wordsState, themeWords: ["gamma", "delta", "no-such-word"] });
    // gamma 已学（未到期，不进 due）→ 跳过；未知词忽略；只剩 delta
    expect(msgs.map((m) => m.w)).toEqual(["delta"]);
  });

  it("keeps due reviews unaffected by theme words", () => {
    const wordsState: Record<string, WordState> = {
      epsilon: { box: 1, due: 5, seen: 1, wrong: 0 },
      delta: { box: 1, due: 8, seen: 1, wrong: 0 },
    };
    const msgs = buildDay({ ...base, now: 10, wordsState, themeWords: ["epsilon", "delta", "alpha"] });
    // 到期词按 due 排序在队首；alpha 是唯一的池内新词，排在后面
    expect(msgs.map((m) => m.w)).toEqual(["epsilon", "delta", "alpha"]);
  });

  it("reserves the new-word quota so reviews cannot starve it", () => {
    // 8 个池词：3 个到期（alpha/beta/gamma），5 个未学
    const pool: Word[] = [
      w("alpha", 10),
      w("beta", 20),
      w("gamma", 30),
      w("delta", 40),
      w("epsilon", 50),
      w("zeta", 60),
      w("eta", 70),
      w("theta", 80),
    ];
    const wordsState: Record<string, WordState> = {
      alpha: { box: 1, due: 0, seen: 1, wrong: 0 },
      beta: { box: 1, due: 1, seen: 1, wrong: 0 },
      gamma: { box: 1, due: 2, seen: 1, wrong: 0 },
    };
    const msgs = buildDay({
      now: 100,
      words: pool,
      sentences,
      wordsState,
      quota: 5,
      newCap: 3,
      seed: "2026-10-25",
      themeWords: pool.map((x) => x.w),
    });
    // 新词先占 3 个名额，到期词只用剩下的 2 个；第 3 个到期词留给复习页连刷
    expect(msgs.map((m) => m.w)).toEqual(["alpha", "beta", "delta", "epsilon", "zeta"]);
    expect(msgs.filter((m) => wordsState[m.w])).toHaveLength(2);
  });

  it("never exceeds quota when the new-word cap is larger than the quota", () => {
    const msgs = buildDay({ ...base, now: 0, wordsState: {}, quota: 5, newCap: 20 });
    expect(msgs).toHaveLength(5);
    expect(new Set(msgs.map((m) => m.w)).size).toBe(5);
  });

  it("degrades to the bare word when no sentence exists", () => {
    const msg = makeMsg(words[1], words, {}, "seed");
    expect(msg.en).toBe("");
    expect(msg.opts[msg.correct]).toBe("释义-beta");
  });

  it("always includes exactly one correct option", () => {
    const msg = makeMsg(words[2], words, sentences, "seed");
    expect(msg.opts).toHaveLength(4);
    expect(msg.opts.filter((o) => o === "释义-gamma")).toHaveLength(1);
    expect(msg.opts[msg.correct]).toBe("释义-gamma");
  });
});

describe("cleanZh", () => {
  it("keeps the first sense and drops the part-of-speech prefix", () => {
    expect(cleanZh("n. 学习；学问\nv. 学习")).toBe("学习");
  });
});
