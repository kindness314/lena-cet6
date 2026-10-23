import type { Msg, Sentences, Word, WordState } from "./types";
import { shuffled } from "./random";

export function cleanZh(zh: string): string {
  const first = zh.split(/[\n;；]/)[0].trim();
  return first.replace(/^[a-z]+\.\s*/i, "").trim() || zh.trim();
}

function posKey(w: Word): string {
  return (w.pos || "").split(":")[0].trim() || "?";
}

export function pickDistractors(word: Word, pool: Word[], count: number, seed: string): string[] {
  const answer = cleanZh(word.zh);
  const key = posKey(word);
  const same = pool.filter((w) => w.w !== word.w && posKey(w) === key && cleanZh(w.zh) !== answer);
  const others = pool.filter(
    (w) => w.w !== word.w && posKey(w) !== key && cleanZh(w.zh) !== answer,
  );
  const ordered = shuffled(same, seed + ":same").concat(shuffled(others, seed + ":other"));
  const seen = new Set<string>([answer]);
  const out: string[] = [];
  for (const w of ordered) {
    const zh = cleanZh(w.zh);
    if (seen.has(zh)) continue;
    seen.add(zh);
    out.push(zh);
    if (out.length === count) break;
  }
  return out;
}

export function makeMsg(
  word: Word,
  pool: Word[],
  sentences: Sentences,
  seed: string,
): Msg {
  const pair = sentences[word.w]?.[0];
  const correct = cleanZh(word.zh);
  const opts = shuffled([correct, ...pickDistractors(word, pool, 3, seed)], seed + ":" + word.w);
  return {
    id: `${word.w}:${seed}`,
    w: word.w,
    en: pair?.[0] ?? "",
    zh: correct,
    opts,
    correct: opts.indexOf(correct),
  };
}

export interface BuildInput {
  now: number;
  words: Word[];
  sentences: Sentences;
  wordsState: Record<string, WordState>;
  quota: number;
  newCap: number;
  seed: string;
}

export function buildDay(input: BuildInput): Msg[] {
  const { now, words, sentences, wordsState, quota, newCap, seed } = input;
  const due = words
    .filter((w) => {
      const s = wordsState[w.w];
      return s !== undefined && s.due <= now;
    })
    .sort((a, b) => wordsState[a.w].due - wordsState[b.w].due || a.w.localeCompare(b.w));
  const fresh = words
    .filter((w) => wordsState[w.w] === undefined)
    .sort((a, b) => a.freq - b.freq || a.w.localeCompare(b.w))
    .slice(0, newCap);

  const picked: Word[] = [];
  for (const w of due) {
    if (picked.length >= quota) break;
    picked.push(w);
  }
  for (const w of fresh) {
    if (picked.length >= quota) break;
    picked.push(w);
  }
  return picked.map((w) => makeMsg(w, words, sentences, seed));
}
