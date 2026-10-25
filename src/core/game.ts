import { isTouched } from "./progress";
import { SCENES } from "./scenes";
import type { Word, WordState } from "./types";

let sceneWords: Set<string> | null = null;

/** 所有剧情池词；小游戏只练「放不进任何一幕」的其余词。 */
export function sceneWordSet(): Set<string> {
  if (!sceneWords) {
    const set = new Set<string>();
    for (const scene of SCENES) for (const word of scene.theme) set.add(word);
    sceneWords = set;
  }
  return sceneWords;
}

/** 一个词的主入口：剧情池内的归剧情，其余归小游戏。 */
export function wordHome(word: string): "story" | "game" {
  return sceneWordSet().has(word) ? "story" : "game";
}

/** 小游戏题库：剧情池之外的词，按 freq 升序。 */
export function gamePool(words: Word[]): Word[] {
  const themed = sceneWordSet();
  return words
    .filter((w) => !themed.has(w.w))
    .sort((a, b) => a.freq - b.freq || a.w.localeCompare(b.w));
}

/** 拼写判定用：忽略大小写、首尾空格，连字符与空格可以互换（well known = well-known）。 */
export function normalizeSpelling(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[-_\s]+/g, " ");
}

/** 拼写模式判分：整词相等才算对，不做拼写近似。 */
export function spellOk(input: string, answer: string): boolean {
  const guess = normalizeSpelling(input);
  return guess !== "" && guess === normalizeSpelling(answer);
}

/** 拼写提示：首字母 + 剩余字母数（不含连字符/空格），例如 abroad -> { letter: "a", rest: 5 }。 */
export function spellHint(answer: string): { letter: string; rest: number } {
  const letters = answer.replace(/[^A-Za-z]/g, "");
  return { letter: letters.slice(0, 1).toLowerCase(), rest: Math.max(0, letters.length - 1) };
}

export interface RoundOptions {
  /** 已经在别处出现的词（例如今天的剧情队列），这一轮不再重复。 */
  exclude?: Iterable<string>;
  /** 用户从小说点进来的词，优先出题。 */
  priority?: string[];
  now?: number;
}

const TIERS = ["foundation", "core", "advanced"] as const;
type Tier = (typeof TIERS)[number];

function tierOf(word: Word): Tier {
  return word.tier === "foundation" || word.tier === "advanced" ? word.tier : "core";
}

/**
 * 按剩余词量把 slots 分给三档：最大余数法，多出来的名额回流给还有余量的档。
 * 池子 431 : 1228 : 372 时，每轮 5 个会得到 1 : 3 : 1。
 */
function tierQuotas(counts: number[], slots: number): number[] {
  const quotas = counts.map(() => 0);
  const total = counts.reduce((sum, count) => sum + count, 0);
  let left = Math.max(0, Math.min(slots, total));
  if (left === 0) return quotas;
  const ideal = counts.map((count) => (count / total) * left);
  ideal.forEach((value, index) => {
    quotas[index] = Math.min(Math.floor(value), counts[index]);
  });
  left -= quotas.reduce((sum, quota) => sum + quota, 0);
  const order = ideal
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac || a.index - b.index);
  for (let k = 0; left > 0 && k < order.length; k++) {
    const index = order[k].index;
    if (quotas[index] >= counts[index]) continue;
    quotas[index] += 1;
    left -= 1;
  }
  // 某档提前见底时，把名额让给还有词的档
  while (left > 0) {
    let best = -1;
    for (let index = 0; index < counts.length; index++) {
      if (quotas[index] >= counts[index]) continue;
      if (best < 0 || counts[index] - quotas[index] > counts[best] - quotas[best]) best = index;
    }
    if (best < 0) break;
    quotas[best] += 1;
    left -= 1;
  }
  return quotas;
}

/**
 * 下一轮：优先用户指定词 → 三档配额混出没学过的词（档内 freq 序）
 * → 已学过但还没到期的词（due 序）。到期词留给复习，同一时间只在一个入口出现。
 */
export function nextRound(
  words: Word[],
  wordsState: Record<string, WordState>,
  size = 5,
  options: RoundOptions = {},
): Word[] {
  const now = options.now ?? Date.now();
  const blocked = new Set(options.exclude ?? []);
  const pool = gamePool(words);
  const byWord = new Map(pool.map((w) => [w.w, w]));
  const free = (w: Word): boolean => {
    if (blocked.has(w.w)) return false;
    const st = wordsState[w.w];
    return st === undefined || st.due > now;
  };

  const picked: Word[] = [];
  const taken = new Set<string>();
  // 同一轮里中文释义不能撞车，否则两张牌看起来一模一样、必错一次
  const glosses = new Set<string>();
  const add = (word: Word): boolean => {
    if (taken.has(word.w) || glosses.has(word.zh)) return false;
    picked.push(word);
    taken.add(word.w);
    glosses.add(word.zh);
    return true;
  };
  for (const key of options.priority ?? []) {
    const word = byWord.get(key);
    if (!word || !free(word)) continue;
    if (add(word) && picked.length >= size) return picked;
  }

  const fresh: Record<Tier, Word[]> = { foundation: [], core: [], advanced: [] };
  for (const word of pool) {
    if (wordsState[word.w] !== undefined || taken.has(word.w) || blocked.has(word.w)) continue;
    fresh[tierOf(word)].push(word);
  }
  const quotas = tierQuotas(
    TIERS.map((tier) => fresh[tier].length),
    size - picked.length,
  );
  TIERS.forEach((tier, index) => {
    for (const word of fresh[tier].slice(0, quotas[index])) {
      if (picked.length >= size) break;
      add(word);
    }
  });
  // 释义撞车浪费了名额时，从剩下的未学词里补满
  for (const word of pool) {
    if (picked.length >= size) break;
    if (wordsState[word.w] !== undefined || !free(word)) continue;
    add(word);
  }
  if (picked.length >= size) return picked;

  const learned = pool
    .filter((w) => wordsState[w.w] !== undefined && !taken.has(w.w) && free(w))
    .sort((a, b) => wordsState[a.w].due - wordsState[b.w].due || a.freq - b.freq);
  for (const word of learned) {
    if (picked.length >= size) break;
    add(word);
  }
  return picked;
}

export interface Coverage {
  total: number;
  learned: number;
  story: { total: number; learned: number };
  game: { total: number; learned: number };
}

/** 词表覆盖：剧情池 / 小游戏池各学了多少。 */
export function coverage(words: Word[], wordsState: Record<string, WordState>): Coverage {
  const themed = sceneWordSet();
  const result: Coverage = {
    total: words.length,
    learned: 0,
    story: { total: 0, learned: 0 },
    game: { total: 0, learned: 0 },
  };
  for (const word of words) {
    // 只是排进了队列、还没答过，不算学过（口径统一在 progress.isTouched）
    const learned = isTouched(wordsState[word.w]);
    if (learned) result.learned += 1;
    if (themed.has(word.w)) {
      result.story.total += 1;
      if (learned) result.story.learned += 1;
    } else {
      result.game.total += 1;
      if (learned) result.game.learned += 1;
    }
  }
  return result;
}
