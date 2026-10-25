import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { RAW_DIR } from "./lib/sources.mjs";
import { lookupZh, parseCsvLine, posKey } from "./lib/ecdict.mjs";

// Adds ECDICT entries for words that actually occur in the reading library but
// are outside the base lookup's frequency/tag window. This keeps lookup.json
// useful for article tapping without bloating it with the whole 770k-row
// dictionary. Words absent from ECDICT are left alone: no invented glosses.
const OUT = new URL("../public/data/", import.meta.url);
const SRC = new URL("ecdict.csv", RAW_DIR);
const lookup = JSON.parse(readFileSync(new URL("lookup.json", OUT), "utf8"));
const forms = JSON.parse(readFileSync(new URL("forms.json", OUT), "utf8"));
const articles = JSON.parse(readFileSync(new URL("articles.json", OUT), "utf8"));
const TOKEN = /[\p{L}]+(?:['’-][\p{L}]+)*/gu;
const NAME = /人名|地名|女子名|男子名|姓氏|名字|（[^）]*名）/;

// Keep this resolver in sync with src/core/annotate.ts. It decides whether a
// token already has a card; adding a second key for an inflected form would
// shadow the base word's gloss in the reader.
const CONTRACTIONS = {
  "can't": "can",
  "won't": "will",
  "shan't": "shall",
  "ain't": "be",
};
const normalizeForm = (raw) => {
  const lower = raw.toLowerCase().replace(/’/g, "'");
  return lower.endsWith("'s") ? lower.slice(0, -2) : lower;
};
function lookupKey(word) {
  if (lookup[word]) return word;
  const cap = word.charAt(0).toUpperCase() + word.slice(1);
  if (lookup[cap]) return cap;
  if (word.length <= 3) {
    const upper = word.toUpperCase();
    if (lookup[upper]) return upper;
  }
  return undefined;
}
function resolve(raw) {
  const lower = normalizeForm(raw);
  const direct = lookupKey(lower);
  if (direct) return direct;
  const lemma = forms[lower];
  if (lemma) {
    const key = lookupKey(lemma);
    if (key) return key;
  }
  const contraction = CONTRACTIONS[lower];
  if (contraction && lookup[contraction]) return contraction;
  const nope = /^(.+)n't$/.exec(lower);
  if (nope) {
    const stem = forms[nope[1]] ?? nope[1];
    const key = lookupKey(stem);
    if (key) return key;
  }
  const clitic = /^(.+?)'(?:re|ve|ll|d|m)$/.exec(lower);
  if (clitic) {
    const stem = forms[clitic[1]] ?? clitic[1];
    const key = lookupKey(stem);
    if (key) return key;
  }
  if (lower.endsWith("s")) {
    const key = lookupKey(lower.slice(0, -1));
    if (key) return key;
  }
  return undefined;
}

const tokenInfo = new Map();
for (const article of articles) {
  for (const paragraph of article.paragraphs) {
    for (const match of paragraph.matchAll(TOKEN)) {
      const surface = match[0];
      const word = normalizeForm(surface);
      const info = tokenInfo.get(word) ?? { surfaces: new Set(), count: 0 };
      info.surfaces.add(surface);
      info.count++;
      tokenInfo.set(word, info);
    }
  }
}
const unresolved = [...tokenInfo].filter(([word]) => !resolve(word));
const wanted = new Set(unresolved.map(([word]) => word));
const wantedExact = new Set(unresolved.flatMap(([, info]) => [...info.surfaces]));
const exact = new Map();
const lower = new Map();

const betterLower = (a, b) => {
  if (!b) return true;
  const nameA = NAME.test(a.translation);
  const nameB = NAME.test(b.translation);
  if (nameA !== nameB) return nameA;
  const lowerA = a.word === a.word.toLowerCase();
  const lowerB = b.word === b.word.toLowerCase();
  return lowerA && !lowerB;
};

const rl = createInterface({ input: createReadStream(SRC), crlfDelay: Infinity });
let header = true;
for await (const line of rl) {
  if (header) {
    header = false;
    continue;
  }
  if (!line) continue;
  const cells = parseCsvLine(line);
  if (cells.length < 12) continue;
  const row = {
    word: cells[0],
    phonetic: cells[1],
    translation: cells[3],
    pos: cells[4],
    tag: cells[7],
    bnc: cells[8],
    frq: cells[9],
  };
  if (!row.word || !row.translation) continue;
  if (wantedExact.has(row.word) && !exact.has(row.word)) exact.set(row.word, row);
  const key = row.word.toLowerCase();
  if (!wanted.has(key)) continue;
  if (betterLower(row, lower.get(key))) lower.set(key, row);
}

let added = 0;
let skippedName = 0;
let skippedNoZh = 0;
for (const [word, info] of unresolved) {
  let row = [...info.surfaces].map((s) => exact.get(s)).find(Boolean);
  if (!row) row = lower.get(word);
  if (!row) continue;
  const allCaps = row.word.length > 1 && row.word === row.word.toUpperCase() && /[A-Z]/.test(row.word);
  if (allCaps && !NAME.test(row.translation)) {
    skippedName++;
    continue;
  }
  // A rare lowercase dictionary entry can still be a misreading of a proper
  // name (Geo/Chas). If the excerpt only uses it capitalized, leave the word
  // unresolved rather than showing a technical gloss in a novel.
  const allSurfacesCapitalized = [...info.surfaces].every((s) => /^[A-Z]/.test(s));
  const shortCapitalized = allSurfacesCapitalized && word.length <= 6;
  const rareLower = row.word === row.word.toLowerCase() && !row.tag && !(Number(row.bnc) || Number(row.frq));
  if ((shortCapitalized || rareLower) && allSurfacesCapitalized && !NAME.test(row.translation)) {
    skippedName++;
    continue;
  }
  const zh = lookupZh(row.translation);
  if (!zh || !/[\u4e00-\u9fa5]/.test(zh)) {
    skippedNoZh++;
    continue;
  }
  lookup[word] = { ph: row.phonetic, pos: posKey(row.pos, row.translation), zh };
  added++;
}

writeFileSync(new URL("lookup.json", OUT), JSON.stringify(lookup));
console.log(
  `articleTokens=${tokenInfo.size} unresolved=${unresolved.length} ` +
    `lookupAdded=${added} skippedName=${skippedName} skippedNoZh=${skippedNoZh} ` +
    `lookup=${Object.keys(lookup).length}`,
);
