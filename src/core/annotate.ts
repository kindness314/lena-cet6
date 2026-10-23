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

export function resolveWord(raw: string, forms: Record<string, string>, lookup: Record<string, Lookup>): string | undefined {
  const lower = normalizeForm(raw);
  if (lookup[lower]) return lower;
  const lemma = forms[lower];
  if (lemma && lookup[lemma]) return lemma;
  if (lower.endsWith("s") && lookup[lower.slice(0, -1)]) return lower.slice(0, -1);
  return undefined;
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
