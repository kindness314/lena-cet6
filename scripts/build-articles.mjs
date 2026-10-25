import { readFileSync, statSync, writeFileSync } from "node:fs";
import { BOOK_DIR, ARTICLE_MANIFEST, readJson, sha256File } from "./lib/sources.mjs";

const OUT = new URL("../public/data/", import.meta.url);
const sources = readJson(ARTICLE_MANIFEST);
const words = JSON.parse(readFileSync(new URL("words.json", OUT), "utf8"));
const forms = JSON.parse(readFileSync(new URL("forms.json", OUT), "utf8"));
const sentences = JSON.parse(readFileSync(new URL("sentences.json", OUT), "utf8"));
const targets = new Set(words.map((w) => w.w));
const byWord = new Map(words.map((w) => [w.w, w]));
const TOKEN = /[\p{L}]+(?:['’-][\p{L}]+)*/gu;
const KEY_MIN = 6;
const KEY_MAX = 18;
// Article length drives the number of highlighted words: a short 380-word
// excerpt gets six, a full 980-word excerpt gets sixteen. The cap keeps the
// page from becoming a wall of dashes.
const keyTarget = (wordCount) => Math.min(KEY_MAX, Math.max(KEY_MIN, Math.round(wordCount / 60)));
const KEY_CANDIDATE = /^[a-z][a-z'-]*$/;
const HEADER = /\*\*\* ?START OF (THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i;
const FOOTER = /\*\*\* ?END OF (THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i;

function body(text) {
  const start = text.search(HEADER);
  const end = text.search(FOOTER);
  let slice = start >= 0 ? text.slice(start) : text;
  if (end >= 0) slice = slice.slice(0, slice.search(FOOTER));
  return slice.replace(/\r\n/g, "\n");
}

function paragraphs(text) {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .map((p) => p.replace(/_([^_]+)_/g, "$1"))
    .filter((p) => p.length >= 100 && p.length <= 2800)
    .filter((p) => !/^(CHAPTER|Chapter|BOOK|Book|PART|Part|SECTION|Section)\b/.test(p))
    .filter((p) => !/^\d+$/.test(p))
    .filter((p) => !/^\[\d+\]/.test(p))
    .filter((p) => (p.match(/[.!?](?:\s|$)/g) ?? []).length >= 1)
    .filter((p) => !/\[Illustration|\[Footnote|Project Gutenberg|Transcriber|www\.gutenberg/i.test(p))
    .filter((p) => {
      const letters = [...p].filter((c) => /[A-Za-z]/.test(c)).length;
      const nonSpace = [...p].filter((c) => !/\s/.test(c)).length;
      return nonSpace > 0 && letters / nonSpace >= 0.58;
    })
    .filter((p) => !/^[A-Z\s.,;:'"()-]+$/.test(p));
}

function tokens(p) {
  const out = [];
  for (const raw of p.match(TOKEN) ?? []) {
    let t = raw.toLowerCase().replace(/’/g, "'");
    if (t.endsWith("'s")) t = t.slice(0, -2);
    out.push(forms[t] ?? t);
  }
  return out;
}

// Dated/offensive terms stay readable but are not promoted as study targets.
const KEY_EXCLUDE = new Set(["negro", "oriental"]);

function keyWords(picked, found, limit) {
  const occurrences = new Map();
  const firstSeen = new Map();
  let index = 0;
  for (const p of picked) {
    for (const word of tokens(p)) {
      if (!found.has(word) || !KEY_CANDIDATE.test(word)) continue;
      occurrences.set(word, (occurrences.get(word) ?? 0) + 1);
      if (!firstSeen.has(word)) firstSeen.set(word, index);
      index += 1;
    }
  }
  const ranked = [...occurrences]
    .filter(([word]) => !KEY_EXCLUDE.has(word))
    .map(([word, count]) => {
      const meta = byWord.get(word);
      // Advanced words first; within a tier, rarer sourceRank wins.
      // Occurrences and a real example only act as tie-breakers.
      const score =
        (meta?.tier === "advanced" ? 1000 : 0) +
        Math.min(meta?.sourceRank ?? 0, 9000) +
        Math.min(count, 4) * 20 +
        (sentences[word]?.length ? 10 : 0);
      return { word, score, count };
    });
  ranked.sort(
    (a, b) =>
      b.score - a.score ||
      b.count - a.count ||
      (firstSeen.get(a.word) ?? 0) - (firstSeen.get(b.word) ?? 0),
  );
  return ranked
    .slice(0, limit)
    .sort((a, b) => (firstSeen.get(a.word) ?? 0) - (firstSeen.get(b.word) ?? 0))
    .map((x) => x.word);
}

const articles = [];
const fail = [];
let previousById = new Map();
try {
  const previous = JSON.parse(readFileSync(new URL("articles.json", OUT), "utf8"));
  if (Array.isArray(previous)) previousById = new Map(previous.map((a) => [a.id, a]));
} catch {
  // First build: no previous output to preserve translations from.
}
for (const src of sources) {
  const path = new URL(`pg${src.gid}.txt`, BOOK_DIR);
  try {
    if (statSync(path).size !== src.bytes) throw new Error("byte length mismatch");
    if ((await sha256File(path)) !== src.sha256) throw new Error("sha256 mismatch");
  } catch (err) {
    fail.push(`${src.title}: ${err.message}; run npm run data:fetch -- --force`);
    continue;
  }

  const text = readFileSync(path, "utf8");
  const all = paragraphs(body(text));
  if (src.end >= all.length) {
    fail.push(`${src.title}: end=${src.end} but only ${all.length} paragraphs`);
    continue;
  }
  const picked = all.slice(src.start, src.end + 1);
  const wordCount = picked.reduce((n, p) => n + tokens(p).length, 0);
  if (picked.length < 3) fail.push(`${src.title}: only ${picked.length} paragraphs`);
  if (wordCount < 380 || wordCount > 980) fail.push(`${src.title}: ${wordCount} words outside 380-980`);
  if (picked.some((p) => tokens(p).length > 320)) fail.push(`${src.title}: paragraph over 320 words`);
  const found = new Set(picked.flatMap((p) => tokens(p)).filter((w) => targets.has(w)));
  const keyLimit = keyTarget(wordCount);
  const keys = keyWords(picked, found, keyLimit);
  // Every selection must expose at least 7 current target words. A few legacy
  // short works stay available after the gk filter and are intentionally kept
  // for reading continuity.
  if (found.size < 7) fail.push(`${src.title}: only ${found.size} target words`);
  if (keys.length < Math.min(keyLimit, found.size)) fail.push(`${src.title}: only ${keys.length}/${keyLimit} key words`);
  if (!src.category || !src.level) fail.push(`${src.title}: category/level missing`);

  const id = src.id ?? String(src.gid);
  const previous = previousById.get(id);
  const preserved =
    previous?.paragraphsZh &&
    previous.translation &&
    previous.paragraphs?.length === picked.length &&
    previous.paragraphs.every((p, i) => p === picked[i])
      ? { paragraphsZh: previous.paragraphsZh, translation: previous.translation }
      : {};
  articles.push({
    id,
    title: src.title,
    author: src.author,
    source: `Project Gutenberg · ${src.author}`,
    url: src.sourceUrl,
    license: src.license,
    retrieved: src.retrieved,
    category: src.category,
    level: src.level,
    wordCount,
    targetWords: found.size,
    keyWords: keys,
    paragraphs: picked,
    ...preserved,
  });
  console.log(`${src.category}/${src.level} ${src.title}: ${picked.length} paragraphs, ${wordCount} words, ${found.size} targets, ${keys.length} key words`);
}

if (fail.length) {
  console.error(`article build failed:\n- ${fail.join("\n- ")}`);
  process.exit(1);
}
writeFileSync(new URL("articles.json", OUT), JSON.stringify(articles));
console.log(`articles=${articles.length}`);
