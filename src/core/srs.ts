import type { WordState } from "./types";

export const INTERVALS = [
  10 * 60_000,
  86_400_000,
  2 * 86_400_000,
  4 * 86_400_000,
  7 * 86_400_000,
  15 * 86_400_000,
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
