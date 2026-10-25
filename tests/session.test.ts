import { describe, expect, it } from "vitest";
import type { Ctx } from "../src/app";
import { makeMsg } from "../src/core/messages";
import { SCENES } from "../src/core/scenes";
import { addMore, answerCurrent, enqueueGame, enqueueWord, feedbackText } from "../src/core/session";
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

function makeCtx(msgs: Msg[], idx = 0, list: Word[] = words): Ctx {
  const state = defaultState();
  state.chat = { day: "2026-10-24", msgs, idx };
  return {
    state,
    words: list,
    lookup: {},
    forms: {},
    sentences,
    articles: [],
    targets: new Set(list.map((x) => x.w)),
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

  it("does not repeat a wrong word within the same day", () => {
    const queue = words.slice(0, 5).map((x, i) => msg(x, `s${i}`));
    const ctx = makeCtx(queue);
    const first = queue[0];
    const wrong = (first.correct + 1) % first.opts.length;
    const startedAt = Date.now();

    answerCurrent(ctx, wrong);
    expect(ctx.state.chat.idx).toBe(1);
    expect(ctx.state.chat.msgs).toHaveLength(5);
    expect(ctx.state.chat.msgs.slice(1).some((m) => m.w === "alpha")).toBe(false);
    const state = ctx.state.words.alpha;
    expect(state.box).toBe(0);
    expect(state.due).toBeGreaterThanOrEqual(startedAt + 86_400_000);
  });

  it("marks the day done when the last message is answered", () => {
    const only = msg(words[0]);
    const ctx = makeCtx([only]);
    answerCurrent(ctx, only.correct);
    expect(ctx.state.tasks["2026-10-24"]).toBe(true);
  });

  it("ignores a stale click aimed at a question that is already answered", () => {
    const first = msg(words[0], "a");
    const second = msg(words[1], "b");
    const ctx = makeCtx([first, second]);

    expect(answerCurrent(ctx, first.correct, first.id)).not.toBeNull();
    // 同一个闭包再触发一次（连点/双击）：题目已经换了，不能替第二题作答
    expect(answerCurrent(ctx, first.correct, first.id)).toBeNull();
    expect(ctx.state.chat.idx).toBe(1);
    expect(ctx.state.words.beta).toBeUndefined();
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
  it("adds a freshly read pool word once", () => {
    const picked = w(SCENES[1].theme[0], 55);
    const ctx = makeCtx([msg(words[0])], 0, [...words, picked]);
    expect(enqueueWord(ctx, picked)).toBe(true);
    expect(ctx.state.chat.msgs.at(-1)?.w).toBe(picked.w);
    expect(enqueueWord(ctx, picked)).toBe(false);
    expect(ctx.state.chat.msgs.filter((m) => m.w === picked.w)).toHaveLength(1);
  });

  it("routes a non-pool word to the game queue instead of the chat queue", () => {
    const outsider = w("outside-word", 5);
    const ctx = makeCtx([msg(words[0])], 0, [...words, outsider]);
    expect(enqueueWord(ctx, outsider)).toBe(false);
    expect(ctx.state.chat.msgs.some((m) => m.w === "outside-word")).toBe(false);
    expect(enqueueGame(ctx, outsider)).toBe(true);
    expect(ctx.state.gameQueue).toEqual(["outside-word"]);
    expect(enqueueGame(ctx, outsider)).toBe(false);
    expect(ctx.state.gameQueue).toHaveLength(1);
  });

  it("keeps pool words out of the game queue", () => {
    const picked = w(SCENES[2].theme[0], 56);
    const ctx = makeCtx([], 0, [...words, picked]);
    expect(enqueueGame(ctx, picked)).toBe(false);
    expect(ctx.state.gameQueue).toEqual([]);
  });

  it("adds five unseen words from the day's scene pool only", () => {
    const poolWords = SCENES[0].theme.slice(0, 10).map((word, i) => w(word, 10 + i));
    const outsider = w("outside-word", 5);
    const ctx = makeCtx([msg(poolWords[0])], 0, [...poolWords, outsider]);
    ctx.state.storySceneId = SCENES[0].id;
    ctx.state.words[poolWords[1].w] = { box: 1, due: 0, seen: 1, wrong: 0 };

    expect(addMore(ctx)).toBe(5);
    const added = ctx.state.chat.msgs.slice(1).map((m) => m.w);
    expect(added).not.toContain(poolWords[0].w);
    expect(added).not.toContain(poolWords[1].w);
    expect(added.every((word) => SCENES[0].theme.includes(word))).toBe(true);
    expect(new Set(added).size).toBe(5);

    // 池子抽干后不再借用池外词（那些词归小游戏）
    expect(addMore(ctx, 20)).toBe(3);
    expect(addMore(ctx)).toBe(0);
    expect(ctx.state.chat.msgs.map((m) => m.w)).not.toContain("outside-word");
  });
});
