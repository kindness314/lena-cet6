import type { Ctx } from "../app";
import { makeMsg } from "./messages";
import { answerBox } from "./srs";
import type { Msg, Word, WordState } from "./types";

export function dueWords(
  words: Word[],
  wordsState: Record<string, WordState>,
  now: number,
): Word[] {
  const byWord = new Map<string, Word>();
  for (const word of words) {
    const state = wordsState[word.w];
    if (state && state.due <= now) byWord.set(word.w, word);
  }
  return [...byWord.values()].sort((a, b) => {
    const da = wordsState[a.w].due;
    const db = wordsState[b.w].due;
    return da - db || a.freq - b.freq || a.w.localeCompare(b.w);
  });
}

export function pendingChatWords(ctx: Ctx): Set<string> {
  return new Set(ctx.state.chat.msgs.slice(ctx.state.chat.idx).map((msg) => msg.w));
}

/** 一轮连刷的题量：到期词多的时候分批处理，不逼人一次清空。 */
export const REVIEW_BATCH = 20;

export function dueCount(ctx: Ctx, now = Date.now()): number {
  return dueWords(ctx.words, ctx.state.words, now).length;
}

export function reviewQueue(ctx: Ctx, now = Date.now(), limit = REVIEW_BATCH): Msg[] {
  return dueWords(ctx.words, ctx.state.words, now)
    .slice(0, limit)
    .map((word) =>
      makeMsg(word, ctx.words, ctx.sentences, `review:${ctx.state.chat.day}:${word.w}`),
    );
}

// Review and chat share one queue. Answering a due word in review must remove
// the same word from today's remaining chat, otherwise the user sees it twice.
export function removePendingChat(ctx: Ctx, word: string): number {
  const chat = ctx.state.chat;
  let removed = 0;
  for (let i = chat.idx; i < chat.msgs.length; i++) {
    if (chat.msgs[i].w !== word) continue;
    chat.msgs.splice(i, 1);
    removed++;
    i--;
  }
  return removed;
}

export function answerReview(
  ctx: Ctx,
  msg: Msg,
  pick: number,
  now = Date.now(),
): { correct: boolean; state: WordState } {
  const correct = pick === msg.correct;
  const prev = ctx.state.words[msg.w] ?? { box: 0, due: now, seen: 0, wrong: 0 };
  const state = answerBox(prev, correct, now);
  ctx.state.words[msg.w] = state;
  removePendingChat(ctx, msg.w);
  ctx.save();
  return { correct, state };
}

export function nextDueAt(
  words: Word[],
  wordsState: Record<string, WordState>,
  now: number,
): number | null {
  let next = Infinity;
  for (const word of words) {
    const state = wordsState[word.w];
    if (state && state.due > now) next = Math.min(next, state.due);
  }
  return Number.isFinite(next) ? next : null;
}

export function formatDue(ms: number, now = Date.now()): string {
  const diff = ms - now;
  if (diff <= 0) return "现在";
  const minutes = Math.ceil(diff / 60_000);
  if (minutes < 60) return `${minutes} 分钟后`;
  const hours = Math.ceil(diff / 3_600_000);
  if (hours < 36) return `${hours} 小时后`;
  const days = Math.ceil(diff / 86_400_000);
  if (days < 30) return `${days} 天后`;
  return new Date(ms).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}
