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
