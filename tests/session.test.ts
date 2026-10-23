import { describe, expect, it } from "vitest";
import type { Ctx } from "../src/app";
import { makeMsg } from "../src/core/messages";
import { addMore, answerCurrent, enqueueWord, feedbackText } from "../src/core/session";
import { defaultState } from "../src/core/state";
import type { Msg, Sentences, Word } from "../src/core/types";

const w = (word: string, freq: number): Word => ({
  id: word,
  w: word,
  ph: "",
  pos: "n",
  zh: `释义-${word}`,
  freq,
});

const words: Word[] = [
  w("alpha", 10),
  w("beta", 20),
  w("gamma", 30),
  w("delta", 40),
  w("epsilon", 50),
  w("zeta", 60),
  w("eta", 70),
];
const sentences: Sentences = {};
const msg = (word: Word, seed = "seed") => makeMsg(word, words, sentences, seed);

function makeCtx(msgs: Msg[], idx = 0): Ctx {
  const state = defaultState();
  state.chat = { day: "2026-10-24", msgs, idx };
  return {
    state,
    words,
    lookup: {},
    forms: {},
    sentences,
    articles: [],
    targets: new Set(words.map((x) => x.w)),
    save: () => {},
    regen: () => {},
  };
}

describe("answerCurrent", () => {
  it("advances the shared queue and records the pick", () => {
    const first = msg(words[0]);
    const ctx = makeCtx([first, msg(words[1])]);
    const before = ctx.state.words.alpha;

    expect(answerCurrent(ctx, first.correct)).toEqual({ msg: first, correct: true });
    expect(first.picked).toBe(first.correct);
    expect(ctx.state.chat.idx).toBe(1);
    expect(ctx.state.words.alpha.seen).toBe((before?.seen ?? 0) + 1);
    expect(ctx.state.tasks["2026-10-24"]).toBeUndefined();
  });

  it("re-queues a wrong answer three cards later without a pick", () => {
    const queue = words.slice(0, 5).map((x, i) => msg(x, `s${i}`));
    const ctx = makeCtx(queue);
    const first = queue[0];
    const wrong = (first.correct + 1) % first.opts.length;

    answerCurrent(ctx, wrong);
    expect(ctx.state.chat.idx).toBe(1);
    expect(ctx.state.chat.msgs).toHaveLength(6);
    expect(ctx.state.chat.msgs[3].w).toBe("alpha");
    expect(ctx.state.chat.msgs[3].picked).toBeUndefined();
    expect(ctx.state.chat.msgs[3].id).not.toBe(first.id);
  });

  it("marks the day done when the last message is answered", () => {
    const only = msg(words[0]);
    const ctx = makeCtx([only]);
    answerCurrent(ctx, only.correct);
    expect(ctx.state.tasks["2026-10-24"]).toBe(true);
  });
});

describe("feedbackText", () => {
  it("confirms a hit and names the answer on a miss", () => {
    const m = msg(words[0]);
    m.picked = m.correct;
    expect(feedbackText(m)).toContain("对");
    m.picked = (m.correct + 1) % m.opts.length;
    expect(feedbackText(m)).toContain("这个词是");
    expect(feedbackText(m)).toContain("别的意思");
  });
});

describe("queue mapping", () => {
  it("adds a freshly read word once", () => {
    const ctx = makeCtx([msg(words[0])]);
    expect(enqueueWord(ctx, words[5])).toBe(true);
    expect(ctx.state.chat.msgs.at(-1)?.w).toBe("zeta");
    expect(enqueueWord(ctx, words[5])).toBe(false);
    expect(ctx.state.chat.msgs.filter((m) => m.w === "zeta")).toHaveLength(1);
  });

  it("adds five unseen words and respects existing words", () => {
    const ctx = makeCtx([msg(words[0])]);
    ctx.state.words.beta = { box: 1, due: 0, seen: 1, wrong: 0 };
    expect(addMore(ctx)).toBe(5);
    const added = ctx.state.chat.msgs.slice(1).map((m) => m.w);
    expect(added).not.toContain("alpha");
    expect(added).not.toContain("beta");
    expect(new Set(added).size).toBe(5);
    expect(addMore(ctx)).toBe(0);
  });
});
