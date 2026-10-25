import { describe, expect, it, vi } from "vitest";
import type { Ctx } from "../src/app";
import {
  answerReview,
  dueCount,
  dueWords,
  formatDue,
  nextDueAt,
  pendingChatWords,
  REVIEW_BATCH,
  reviewQueue,
} from "../src/core/review";
import { defaultState } from "../src/core/state";
import type { Msg, Word } from "../src/core/types";

const words: Word[] = [
  { id: "alpha", w: "alpha", ph: "ˈælfə", pos: "n", zh: "甲", freq: 1, forms: [] },
  { id: "beta", w: "beta", ph: "ˈbiːtə", pos: "n", zh: "乙", freq: 2, forms: [] },
  { id: "gamma", w: "gamma", ph: "ˈɡæmə", pos: "n", zh: "丙", freq: 3, forms: [] },
  { id: "delta", w: "delta", ph: "ˈdeltə", pos: "n", zh: "丁", freq: 4, forms: [] },
];

function msg(word: string, index: number): Msg {
  return {
    id: `chat:${word}:${index}`,
    w: word,
    en: `${word} is here.`,
    zh: words.find((w) => w.w === word)?.zh ?? word,
    opts: ["甲", "乙", "丙", "丁"],
    correct: 0,
  };
}

function context(): Ctx {
  const state = defaultState();
  state.chat = {
    day: "2026-10-24",
    msgs: [msg("alpha", 0), msg("beta", 1), msg("gamma", 2)],
    idx: 1,
  };
  state.words = {
    beta: { box: 1, due: 500, seen: 1, wrong: 0 },
    alpha: { box: 2, due: 1_000, seen: 2, wrong: 0 },
    gamma: { box: 3, due: 5_000, seen: 3, wrong: 0 },
  };
  return {
    state,
    words,
    lookup: {},
    forms: {},
    sentences: {},
    articles: [],
    targets: new Set(words.map((w) => w.w)),
    save: vi.fn(),
    regen: vi.fn(),
  };
}

describe("review queue", () => {
  it("sorts due words by due time and ignores future or unseen words", () => {
    const ctx = context();
    expect(dueWords(ctx.words, ctx.state.words, 2_000).map((w) => w.w)).toEqual(["beta", "alpha"]);
    expect(dueWords(ctx.words, ctx.state.words, 400).map((w) => w.w)).toEqual([]);
  });

  it("builds messages for all due words, including ones pending in chat", () => {
    const ctx = context();
    expect(pendingChatWords(ctx).has("beta")).toBe(true);
    const queue = reviewQueue(ctx, 2_000, 1);
    expect(queue).toHaveLength(1);
    expect(queue[0].w).toBe("beta");
    expect(queue[0].opts).toHaveLength(4);
    expect(queue[0].opts[queue[0].correct]).toBe("乙");
  });

  it("removes the reviewed word from the remaining chat queue", () => {
    const ctx = context();
    ctx.state.chat.idx = 0;
    const queue = reviewQueue(ctx, 2_000);
    const alpha = queue.find((m) => m.w === "alpha");
    expect(alpha).toBeDefined();
    const result = answerReview(ctx, alpha!, alpha!.correct, 2_000);
    expect(result.correct).toBe(true);
    expect(result.state.box).toBe(3);
    expect(result.state.due).toBe(2_000 + 7 * 86_400_000);
    expect(ctx.state.chat.msgs.map((m) => m.w)).toEqual(["beta", "gamma"]);
    expect(ctx.state.chat.idx).toBe(0);
    expect(ctx.save).toHaveBeenCalledTimes(1);
  });

  it("resets a wrong word to tomorrow instead of ten minutes", () => {
    const ctx = context();
    const queue = reviewQueue(ctx, 2_000);
    const beta = queue[0];
    const result = answerReview(ctx, beta, (beta.correct + 1) % beta.opts.length, 2_000);
    expect(result.correct).toBe(false);
    expect(result.state.box).toBe(0);
    expect(result.state.due).toBe(2_000 + 86_400_000);
    expect(result.state.wrong).toBe(1);
    expect(ctx.state.chat.msgs.some((m) => m.w === "beta")).toBe(false);
  });

  it("splits a big backlog into batches of REVIEW_BATCH", () => {
    const ctx = context();
    const backlog: Word[] = Array.from({ length: 25 }, (_x, i) => ({
      id: `w${i}`,
      w: `w${i}`,
      ph: "",
      pos: "n",
      zh: `释${i}`,
      freq: i + 1,
      forms: [],
    }));
    ctx.words = backlog;
    ctx.state.words = Object.fromEntries(backlog.map((word, i) => [word.w, { box: 1, due: i, seen: 1, wrong: 0 }]));
    expect(REVIEW_BATCH).toBe(20);
    expect(dueCount(ctx, 1_000)).toBe(25);
    const queue = reviewQueue(ctx, 1_000);
    expect(queue).toHaveLength(20);
    expect(queue[0].w).toBe("w0");
    expect(queue[19].w).toBe("w19");
  });

  it("does not remove words already answered earlier in chat", () => {
    const ctx = context();
    ctx.state.chat.idx = 2;
    const queue = reviewQueue(ctx, 2_000);
    const beta = queue[0];
    answerReview(ctx, beta, beta.correct, 2_000);
    expect(ctx.state.chat.msgs.map((m) => m.w)).toEqual(["alpha", "beta", "gamma"]);
    expect(ctx.state.chat.idx).toBe(2);
  });
});

describe("review timing", () => {
  it("finds the nearest future due time", () => {
    const ctx = context();
    expect(nextDueAt(ctx.words, ctx.state.words, 2_000)).toBe(5_000);
    expect(nextDueAt(ctx.words, ctx.state.words, 6_000)).toBeNull();
    expect(nextDueAt(ctx.words, {}, 0)).toBeNull();
  });

  it("formats due times for the review card", () => {
    const now = 1_000_000;
    expect(formatDue(now - 1, now)).toBe("现在");
    expect(formatDue(now + 30_000, now)).toBe("1 分钟后");
    expect(formatDue(now + 2 * 3_600_000, now)).toBe("2 小时后");
    expect(formatDue(now + 2 * 86_400_000, now)).toBe("2 天后");
    expect(formatDue(now + 40 * 86_400_000, now)).toMatch(/\d/);
  });
});
