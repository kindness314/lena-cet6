import type { Ctx } from "../app";
import { makeMsg } from "./messages";
import { answerBox } from "./srs";
import type { Msg, Word } from "./types";

export function currentMsg(ctx: Ctx): Msg | undefined {
  return ctx.state.chat.msgs[ctx.state.chat.idx];
}

export function answerCurrent(ctx: Ctx, pick: number): { msg: Msg; correct: boolean } | null {
  const st = ctx.state;
  const msg = currentMsg(ctx);
  if (!msg) return null;

  const now = Date.now();
  const correct = pick === msg.correct;
  const prev = st.words[msg.w] ?? { box: 0, due: now, seen: 0, wrong: 0 };
  st.words[msg.w] = answerBox(prev, correct, now);

  const clone = correct ? null : { ...msg, id: `${msg.id}:${st.chat.idx}:r`, picked: undefined };
  msg.picked = pick;
  if (clone) {
    const at = st.chat.idx + 3;
    if (at < st.chat.msgs.length) st.chat.msgs.splice(at, 0, clone);
    else st.chat.msgs.push(clone);
  }

  st.chat.idx++;
  if (st.chat.idx >= st.chat.msgs.length) st.tasks[st.chat.day] = true;
  ctx.save();
  return { msg, correct };
}

export function feedbackText(msg: Msg): string {
  const answer = `「${msg.zh}」`;
  if (msg.picked === undefined) return `是${answer}。`;
  if (msg.picked === msg.correct) return `对，就是${answer}。`;
  return `这个词是${answer}。你选的「${msg.opts[msg.picked] ?? "?"}」是别的意思。`;
}

export function addMore(ctx: Ctx, count = 5): number {
  const st = ctx.state;
  const seen = new Set(st.chat.msgs.map((m) => m.w));
  const picks = ctx.words.filter((w) => !st.words[w.w] && !seen.has(w.w)).slice(0, count);
  for (const w of picks) {
    st.chat.msgs.push(makeMsg(w, ctx.words, ctx.sentences, `${st.chat.day}:more:${w.w}`));
  }
  if (picks.length > 0) ctx.save();
  return picks.length;
}

export function enqueueWord(ctx: Ctx, word: Word): boolean {
  const st = ctx.state;
  if (st.chat.msgs.some((m) => m.w === word.w)) return false;
  st.chat.msgs.push(makeMsg(word, ctx.words, ctx.sentences, `${st.chat.day}:read:${word.w}`));
  ctx.save();
  return true;
}
