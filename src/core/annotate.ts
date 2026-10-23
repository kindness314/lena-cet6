import type { Lookup } from "./types";

export interface Token {
  text: string;
  word?: string;
  target?: boolean;
}

const WORD_RE = /[\p{L}]+(?:['’\-][\p{L}]+)*/gu;

export function normalizeForm(raw: string): string {
  const lower = raw.toLowerCase().replace(/’/g, "'");
  return lower.endsWith("'s") ? lower.slice(0, -2) : lower;
}

function lookupKey(word: string, lookup: Record<string, Lookup>): string | undefined {
  if (lookup[word]) return word;
  const cap = word.charAt(0).toUpperCase() + word.slice(1);
  if (lookup[cap]) return cap;
  if (word.length <= 3) {
    const upper = word.toUpperCase();
    if (lookup[upper]) return upper;
  }
  return undefined;
}

const CONTRACTIONS: Record<string, string> = {
  "can't": "can",
  "won't": "will",
  "shan't": "shall",
  "ain't": "be",
};

export function resolveWord(raw: string, forms: Record<string, string>, lookup: Record<string, Lookup>): string | undefined {
  const lower = normalizeForm(raw);
  const direct = lookupKey(lower, lookup);
  if (direct) return direct;

  const lemma = forms[lower];
  if (lemma) {
    const key = lookupKey(lemma, lookup);
    if (key) return key;
  }

  const contraction = CONTRACTIONS[lower];
  if (contraction && lookup[contraction]) return contraction;

  const nope = /^(.+)n't$/.exec(lower);
  if (nope) {
    const stem = forms[nope[1]] ?? nope[1];
    const key = lookupKey(stem, lookup);
    if (key) return key;
  }

  const clitic = /^(.+?)'(?:re|ve|ll|d|m)$/.exec(lower);
  if (clitic) {
    const stem = forms[clitic[1]] ?? clitic[1];
    const key = lookupKey(stem, lookup);
    if (key) return key;
  }

  if (lower.endsWith("s")) {
    const singular = lower.slice(0, -1);
    const key = lookupKey(singular, lookup);
    if (key) return key;
  }
  return undefined;
}

export interface LemmaHit {
  index: number;
  length: number;
  text: string;
}

export function findLemmaMatch(
  text: string,
  lemma: string,
  forms: Record<string, string>,
  lookup: Record<string, Lookup>,
): LemmaHit | null {
  const exact = new RegExp(`\\b(${lemma.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\b`, "i");
  const hit = exact.exec(text);
  if (hit) return { index: hit.index, length: hit[1].length, text: hit[1] };

  for (const m of text.matchAll(WORD_RE)) {
    const raw = m[0];
    const resolved = resolveWord(raw, forms, lookup);
    if (resolved?.toLowerCase() === lemma.toLowerCase()) {
      return { index: m.index ?? 0, length: raw.length, text: raw };
    }
  }
  return null;
}

export function annotate(
  text: string,
  forms: Record<string, string>,
  lookup: Record<string, Lookup>,
  targets: Set<string>,
): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  for (const m of text.matchAll(WORD_RE)) {
    const start = m.index ?? 0;
    if (start > last) tokens.push({ text: text.slice(last, start) });
    const word = resolveWord(m[0], forms, lookup);
    const lemma = word ?? normalizeForm(m[0]);
    tokens.push({ text: m[0], word, target: targets.has(lemma) || targets.has(word ?? "") });
    last = start + m[0].length;
  }
  if (last < text.length) tokens.push({ text: text.slice(last) });
  return tokens;
}
