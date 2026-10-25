import type { Ctx } from "../app";
import { makeMsg } from "./messages";
import { wordHome } from "./game";
import { sceneForState } from "./scenes";
import { answerBox } from "./srs";
import type { Msg, Word } from "./types";

export function currentMsg(ctx: Ctx): Msg | undefined {
  return ctx.state.chat.msgs[ctx.state.chat.idx];
}

/** 两次作答之间的最短间隔；答完会立刻重渲染，下一题的选项常落在同一坐标，连点会替下一题作答。 */
const TAP_GUARD_MS = 400;
let lastAnswerTap = 0;

export function answerTapAllowed(now = Date.now()): boolean {
  if (now - lastAnswerTap < TAP_GUARD_MS) return false;
  lastAnswerTap = now;
  return true;
}

export function answerCurrent(
  ctx: Ctx,
  pick: number,
  expectId?: string,
): { msg: Msg; correct: boolean } | null {
  const st = ctx.state;
  const msg = currentMsg(ctx);
  if (!msg) return null;
  // 闭包里的题已经被答掉时不再作答，避免陈旧点击落到下一题
  if (expectId !== undefined && msg.id !== expectId) return null;

  const now = Date.now();
  const correct = pick === msg.correct;
  const prev = st.words[msg.w] ?? { box: 0, due: now, seen: 0, wrong: 0 };
  st.words[msg.w] = answerBox(prev, correct, now);

  msg.picked = pick;

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
  const usable = ctx.words.filter((w) => !st.words[w.w] && !seen.has(w.w));
  // 只追加当日剧情场景的词池；池外的词归小游戏，不混进剧情
  const pool = new Set(sceneForState(st, st.chat.day).theme);
  const picks = usable.filter((w) => pool.has(w.w)).slice(0, count);
  for (const w of picks) {
    st.chat.msgs.push(makeMsg(w, ctx.words, ctx.sentences, `${st.chat.day}:more:${w.w}`));
  }
  if (picks.length > 0) ctx.save();
  return picks.length;
}

export function enqueueWord(ctx: Ctx, word: Word): boolean {
  const st = ctx.state;
  // 剧情队列只收剧情池词；池外词走小游戏的优先队列
  if (wordHome(word.w) !== "story") return false;
  if (st.chat.msgs.some((m) => m.w === word.w)) return false;
  st.chat.msgs.push(makeMsg(word, ctx.words, ctx.sentences, `${st.chat.day}:read:${word.w}`));
  ctx.save();
  return true;
}

export function enqueueGame(ctx: Ctx, word: Word): boolean {
  const st = ctx.state;
  if (wordHome(word.w) !== "game") return false;
  if (st.gameQueue.includes(word.w)) return false;
  st.gameQueue.push(word.w);
  if (st.gameQueue.length > 200) st.gameQueue.splice(0, st.gameQueue.length - 200);
  ctx.save();
  return true;
}
