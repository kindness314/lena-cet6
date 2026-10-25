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
    ph: word.ph,
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
  /** 当日剧情场景的词池；新词只从这里取，池里没有就当天不给新词（其余词进小游戏）。 */
  themeWords?: string[];
}

export function buildDay(input: BuildInput): Msg[] {
  const { now, words, sentences, wordsState, quota, newCap, seed } = input;
  const due = words
    .filter((w) => {
      const s = wordsState[w.w];
      return s !== undefined && s.due <= now;
    })
    .sort((a, b) => wordsState[a.w].due - wordsState[b.w].due || a.w.localeCompare(b.w));

  // 新词只从当日场景词池里取：搭不进剧情的词交给小游戏，不在这里补
  const wordMap = new Map(words.map((w) => [w.w, w]));
  const fresh: Word[] = [];
  for (const t of input.themeWords ?? []) {
    if (fresh.length >= newCap) break;
    const w = wordMap.get(t);
    if (w && wordsState[w.w] === undefined && !fresh.includes(w)) fresh.push(w);
  }

  // 新词先占住自己的名额，到期词只填剩下的位置；装不下的到期词交给复习页连刷。
  // 新词名额可能大于当日总条数（设置里 newCap 只受 1..20 约束），所以这里再按 quota 收口。
  const freshPick = fresh.slice(0, quota);
  const dueLimit = quota - freshPick.length;
  const picked: Word[] = [];
  for (const w of due) {
    if (picked.length >= dueLimit) break;
    picked.push(w);
  }
  picked.push(...freshPick);
  return picked.map((w) => makeMsg(w, words, sentences, seed));
}
