import type { Word, WordState } from "./types";

/**
 * 「词的进度」只有一个口径：
 * new（没有任何答题记录）→ learning（box 0-1）→ familiar（2-3）→ mastered（4-5）。
 * 队列里出现但还没答过的词不算进度，state.words 里也不留空壳记录。
 */
export type Stage = "new" | "learning" | "familiar" | "mastered";

export const STAGE_LABEL: Record<Stage, string> = {
  new: "新词",
  learning: "学习中",
  familiar: "熟悉",
  mastered: "已掌握",
};

/** 答过题才算碰过这个词；排进队列不算。 */
export function isTouched(state: WordState | undefined): state is WordState {
  return state !== undefined && state.seen + state.wrong > 0;
}

export function stageOf(state: WordState | undefined): Stage {
  if (!isTouched(state)) return "new";
  if (state.box <= 1) return "learning";
  if (state.box <= 3) return "familiar";
  return "mastered";
}

export interface ProgressStats {
  /** 答过题的词数 */
  touched: number;
  learning: number;
  familiar: number;
  mastered: number;
  /** 当前到期、可以复习的词数 */
  due: number;
  correct: number;
  wrong: number;
  /** 没答过题时是 null，避免除零 */
  accuracy: number | null;
}

export function progressStats(
  words: Word[],
  wordsState: Record<string, WordState>,
  now = Date.now(),
): ProgressStats {
  const stats: ProgressStats = {
    touched: 0,
    learning: 0,
    familiar: 0,
    mastered: 0,
    due: 0,
    correct: 0,
    wrong: 0,
    accuracy: null,
  };
  for (const word of words) {
    const state = wordsState[word.w];
    if (!isTouched(state)) continue;
    stats.touched += 1;
    const stage = stageOf(state);
    if (stage === "learning") stats.learning += 1;
    else if (stage === "familiar") stats.familiar += 1;
    else if (stage === "mastered") stats.mastered += 1;
    if (state.due <= now) stats.due += 1;
    stats.correct += state.seen;
    stats.wrong += state.wrong;
  }
  const attempts = stats.correct + stats.wrong;
  stats.accuracy = attempts > 0 ? stats.correct / attempts : null;
  return stats;
}

/** 一个词进度的短句，用在词卡和复习卡上。 */
export function describeProgress(state: WordState | undefined, now = Date.now()): string {
  if (!isTouched(state)) return "还没答过这个词。";
  const bits = [STAGE_LABEL[stageOf(state)], `对 ${state.seen} 次 / 错 ${state.wrong} 次`];
  if (state.due <= now) bits.push("现在到期");
  else {
    const days = Math.ceil((state.due - now) / 86_400_000);
    bits.push(days <= 1 ? "明天再复习" : `${days} 天后再复习`);
  }
  return bits.join(" · ");
}
