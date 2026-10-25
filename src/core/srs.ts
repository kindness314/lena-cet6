import type { WordState } from "./types";

/** 0 号位留给答错的词：当天不再出现，明天再来。 */
export const INTERVALS = [
  86_400_000,
  2 * 86_400_000,
  4 * 86_400_000,
  7 * 86_400_000,
  15 * 86_400_000,
  30 * 86_400_000,
];

export function answerBox(s: WordState, correct: boolean, now: number): WordState {
  const box = correct ? Math.min(s.box + 1, INTERVALS.length - 1) : 0;
  return {
    box,
    due: now + INTERVALS[box],
    seen: s.seen + (correct ? 1 : 0),
    wrong: s.wrong + (correct ? 0 : 1),
  };
}
