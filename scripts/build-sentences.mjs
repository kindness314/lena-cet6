import { createReadStream, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import * as OpenCC from "opencc-js";
import { WORK_DIR } from "./lib/sources.mjs";

const t2s = OpenCC.Converter({ from: "t", to: "cn" });
const OUT = new URL("../public/data/", import.meta.url);
const words = JSON.parse(readFileSync(new URL("words.json", OUT), "utf8"));
const forms = JSON.parse(readFileSync(new URL("forms.json", OUT), "utf8"));
const lookup = JSON.parse(readFileSync(new URL("lookup.json", OUT), "utf8"));
const targets = new Set(words.map((w) => w.w));
const targetByLower = new Map(words.map((w) => [w.w.toLowerCase(), w.w]));
const TOKEN = /[\p{L}]+(?:['’-][\p{L}]+)*/gu;

const files = {
  links: new URL("cmn-eng_links.tsv", WORK_DIR),
  cmn: new URL("cmn_sentences.tsv", WORK_DIR),
  eng: new URL("eng_sentences.tsv", WORK_DIR),
};
for (const [name, path] of Object.entries(files)) {
  if (!existsSync(path)) throw new Error(`missing ${name} TSV; run npm run data:extract`);
}

function lemmaOf(raw) {
  const lower = raw.toLowerCase().replace(/’/g, "'");
  const base = lower.endsWith("'s") ? lower.slice(0, -2) : lower;
  return forms[base] ?? base;
}
const sentenceWords = (text) => text.match(TOKEN) ?? [];

function stripNumbering(text) {
  return text.replace(/^\s*\d{1,4}[.)]?\s+/, "").trim();
}

function stripEntities(text) {
  return text
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&nbsp;/gi, " ");
}

function acceptableEnglish(text, tokens, strict = false) {
  if (tokens.length < 4 || tokens.length > 20) return false;
  if (text.length < 12 || text.length > 240) return false;
  if (!/[.!?]["'”’)]?$/.test(text.trim())) return false;
  if (/[<>\[\]{}|\\]|https?:\/\/|www\.|@/i.test(text)) return false;
  if (/\b[A-Z]{4,}\b/.test(text)) return false;
  if ((text.match(/[!?]/g) ?? []).length > 2) return false;
  if (/\d/.test(text) && tokens.length < 7) return false;
  if (!strict) return true;
  if (/[\u4e00-\u9fa5]/.test(text)) return false;
  if (/&[a-z]+;|&#\d+;/i.test(text)) return false;
  if (/[#*{}|<>~`]/.test(text)) return false;
  if (/^\s*[-–—:;]/.test(text)) return false;
  if (/^(?:\(?[ivxlcdm]+\)|\(?[a-z]\)|\d+(?:\.\d+)+[.)]?)\s+/i.test(text)) return false;
  if (/^[A-Z][a-z]+:\s/.test(text)) return false;
  if (!/[a-z]/.test(text)) return false;
  if (/\b[A-Z]{3,}\b/.test(text)) return false;
  if (/\.{3,}/.test(text)) return false;
  if (/[\u202a-\u202e\u200e\u200f]/.test(text)) return false;
  return true;
}

const CANTONESE = /[嘅係唔咗啲佢哋呢嗰咁咩喺嚟睇噉冇]/;

function acceptableChinese(text, strict = false) {
  if (!/[\u4e00-\u9fa5]/.test(text)) return false;
  if (text.length < 4 || text.length > 80) return false;
  if (/https?:\/\/|www\./i.test(text)) return false;
  if (!strict) return true;
  if (CANTONESE.test(text)) return false;
  if (/[�\\]|&[a-z]+;|&#\d+;/i.test(text)) return false;
  if (/^\s*[-–—]/.test(text)) return false;
  if (/\.{3,}/.test(text)) return false;
  if (/[\u202a-\u202e\u200e\u200f]/.test(text)) return false;
  if (/^\s*[」』】”’）)]/.test(text)) return false;
  if (/^\s*(?:[（(]?[ivxlcdm]+[）)]|[㈠-㈩]|[①-⑳]|\d{1,4}[．.]|\d+(?:\.\d+)+[.)]?|[*•·])\s*/i.test(text)) return false;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  if (latin > Math.max(8, text.length * 0.25)) return false;
  return true;
}

// ECDICT glosses are a compact Chinese definition such as "n. 阀, 阀门". Turn
// them into matchable terms so a candidate sentence must actually translate
// the target sense instead of merely containing an English homograph.
const GLOSS_STOP = new Set([
  "的", "地", "得", "了", "是", "在", "有", "和", "与", "或", "等", "及",
  "把", "被", "给", "对", "为", "以", "于", "从", "到", "使", "让", "令",
  "做", "进行", "表示", "某人", "某物", "事物", "东西", "一个", "一种",
  "上", "下", "中", "里", "外", "这", "那", "他", "她", "它", "我", "你",
  "以及", "等等", "什么", "怎么", "我们", "他们", "她们", "它们",
]);
function glossTerms(zh) {
  const cleaned = String(zh)
    .replace(/[a-zA-Z]+\./g, " ")
    .replace(/[（(][^）)]*[）)]/g, " ");
  const out = [];
  for (const part of cleaned.split(/[\s,，;；、/|]+/)) {
    let term = part.replace(/[^\u4e00-\u9fa5]/g, "");
    if (term.length > 2 && /[的地得]$/.test(term)) term = term.slice(0, -1);
    if (!term || term.length > 8 || GLOSS_STOP.has(term) || out.includes(term)) continue;
    out.push(term);
  }
  return out;
}
const glossByWord = new Map();
for (const word of words) {
  const entry = lookup[word.w] ?? lookup[word.w.toLowerCase()];
  const terms = glossTerms(entry?.zh ?? word.zh);
  if (terms.length) glossByWord.set(word.w, terms);
}
function matchGloss(zh, terms) {
  let best = null;
  for (const term of terms ?? []) {
    if (!zh.includes(term)) continue;
    if (!best || term.length > best.length) best = term;
  }
  return best;
}

async function eachLine(file, fn) {
  const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) {
    if (line) fn(line.split("\t"));
  }
}

const pairs = [];
await eachLine(files.links, (cells) => {
  if (cells.length < 2) return;
  const a = cells[0].trim();
  const b = cells[1].trim();
  if (a && b) pairs.push([a, b]);
});

const engIds = new Set();
const cmnIds = new Set();
for (const [a, b] of pairs) {
  engIds.add(a);
  engIds.add(b);
  cmnIds.add(a);
  cmnIds.add(b);
}

const eng = new Map();
const cmn = new Map();
await eachLine(files.eng, (cells) => {
  if (cells.length >= 3 && engIds.has(cells[0])) eng.set(cells[0], cells.slice(2).join("\t"));
});
await eachLine(files.cmn, (cells) => {
  if (cells.length >= 3 && cmnIds.has(cells[0])) cmn.set(cells[0], cells.slice(2).join("\t"));
});

const resolved = [];
for (const [a, b] of pairs) {
  if (eng.has(a) && cmn.has(b)) resolved.push([a, b]);
  else if (eng.has(b) && cmn.has(a)) resolved.push([b, a]);
}
// Tatoeba links are many-to-many. Prefer pairs where both sides have only one
// counterpart, but fall back to the other links when a word has no 1:1 pair.
// The fallback is what raises coverage without inventing sentences.
const engDegree = new Map();
const cmnDegree = new Map();
for (const [enId, cmnId] of resolved) {
  engDegree.set(enId, (engDegree.get(enId) ?? 0) + 1);
  cmnDegree.set(cmnId, (cmnDegree.get(cmnId) ?? 0) + 1);
}

const buckets = new Map();
let seenPairs = 0;
let rejected = 0;

function translationScore(candidate) {
  const unique = (candidate.ed === 1 ? 3 : 0) + (candidate.cd === 1 ? 3 : 0);
  return unique - Math.abs(candidate.zh.length - 10) * 0.05;
}

for (const [enId, cmnId] of resolved) {
  const en = eng.get(enId);
  const zh = cmn.get(cmnId);
  if (!en || !zh) continue;
  const tokens = sentenceWords(en);
  if (!acceptableEnglish(en, tokens)) {
    rejected++;
    continue;
  }
  const translated = t2s(zh).trim();
  if (!acceptableChinese(translated)) {
    rejected++;
    continue;
  }
  seenPairs++;
  const candidate = {
    zh: translated,
    ed: engDegree.get(enId) ?? 1,
    cd: cmnDegree.get(cmnId) ?? 1,
  };
  const lemmas = new Set(tokens.map(lemmaOf));
  for (const lemma of lemmas) {
    const target = targetByLower.get(lemma);
    if (!target) continue;
    const map = buckets.get(target) ?? new Map();
    const current = map.get(en);
    if (!current || translationScore(candidate) > translationScore(current)) map.set(en, candidate);
    buckets.set(target, map);
  }
}

function score(sentence, target, candidate) {
  const tokens = sentenceWords(sentence);
  const raw = tokens.map((t) => t.toLowerCase().replace(/’/g, "'"));
  const lemma = target.toLowerCase();
  const exact = raw.includes(lemma);
  const count = raw.filter((t) => lemmaOf(t) === lemma).length;
  let s = 0;
  if (exact) s += 6;
  if (tokens.length >= 6 && tokens.length <= 12) s += 2;
  if (count === 1) s += 1;
  if (!/\d/.test(sentence)) s += 1;
  // A 1:1 pair is the corpus's strongest signal; many-to-many pairs are kept
  // only when no unique translation exists for the target.
  if (candidate.ed === 1 && candidate.cd === 1) s += 5;
  else if (candidate.ed === 1 || candidate.cd === 1) s += 2;
  s -= Math.abs(tokens.length - 9) * 0.15;
  return s;
}

const out = {};
for (const [target, map] of buckets) {
  const list = [...map.entries()]
    .map(([en, candidate]) => ({ en, ...candidate, score: score(en, target, candidate) }))
    .sort((a, b) => b.score - a.score || a.en.length - b.en.length || a.zh.localeCompare(b.zh))
    .slice(0, 2)
    .map(({ en, zh }) => [en, zh, "tatoeba"]);
  if (list.length) out[target] = list;
}

// OpenSubtitles is useful for colloquial coverage but its translations are
// noisy. Keep only words whose examples were manually spot-checked; the rest
// stay as bare cards rather than teaching a wrong sense.
const OPENSUBTITLES_OK = new Set([
  "stun", "nuisance", "vigorous", "agony", "complicate", "detector", "orient",
  "cloak", "intriguing", "bleak", "tramp", "cripple", "vanity", "torrent",
  "unkind", "stony", "peep", "brood", "turnip", "waken", "tug", "living-room",
  "fuss", "plausible", "hiss", "scarlet", "provocative", "highlight",
  "surprisingly", "soften", "intake", "haunt", "majesty", "sticky",
  "marvellous", "precede", "scramble",
]);

const newSources = [
  {
    id: "unpc",
    en: new URL("UNPC.en-zh.en", WORK_DIR),
    zh: new URL("UNPC.en-zh.zh", WORK_DIR),
    bonus: 5,
    strict: true,
    convert: false,
  },
  {
    id: "wikimatrix",
    en: new URL("WikiMatrix.en-zh.en", WORK_DIR),
    zh: new URL("WikiMatrix.en-zh.zh", WORK_DIR),
    bonus: 4,
    strict: true,
    convert: true,
  },
  {
    id: "opensubtitles",
    en: new URL("OpenSubtitles.en-zh_CN.en", WORK_DIR),
    zh: new URL("OpenSubtitles.en-zh_CN.zh_CN", WORK_DIR),
    bonus: 1,
    strict: true,
    convert: true,
  },
];
for (const source of newSources) {
  if (!existsSync(source.en) || !existsSync(source.zh)) {
    throw new Error(`missing ${source.id} corpus; run npm run data:extract`);
  }
}

async function* linePairs(enFile, zhFile) {
  const a = createInterface({ input: createReadStream(enFile), crlfDelay: Infinity });
  const b = createInterface({ input: createReadStream(zhFile), crlfDelay: Infinity });
  const ai = a[Symbol.asyncIterator]();
  const bi = b[Symbol.asyncIterator]();
  try {
    for (;;) {
      const [x, y] = await Promise.all([ai.next(), bi.next()]);
      if (x.done || y.done) break;
      yield [x.value, y.value];
    }
  } finally {
    a.close();
    b.close();
  }
}

const missing = new Set([...targets].filter((target) => !out[target]));
const candidates = new Map();
function addCandidate(target, candidate) {
  let list = candidates.get(target);
  if (!list) candidates.set(target, (list = []));
  list.push(candidate);
  if (list.length > 24) {
    list.sort((a, b) => b.score - a.score);
    list.length = 16;
  }
}

function candidateScore(candidate) {
  let s = candidate.gloss.length * 1.5 + candidate.bonus;
  if (candidate.exact) s += 2;
  if (candidate.tokens >= 6 && candidate.tokens <= 14) s += 2;
  if (candidate.zh.length >= 8 && candidate.zh.length <= 50) s += 1;
  if (!/\d/.test(candidate.en)) s += 1;
  if (candidate.source === "opensubtitles") s -= 4;
  s -= Math.abs(candidate.tokens - 9) * 0.2;
  return s;
}

for (const source of newSources) {
  let lines = 0;
  let kept = 0;
  for await (const [rawEn, rawZh] of linePairs(source.en, source.zh)) {
    lines++;
    let en = stripNumbering(stripEntities(rawEn.trim()));
    let zh = stripNumbering(source.convert ? t2s(rawZh).trim() : rawZh.trim());
    if (!en || !zh) continue;
    en = en.replace(/\s+/g, " ").replace(/\s+([.!?,;:])/g, "$1");
    zh = zh.replace(/\s+/g, " ").replace(/\s+([。！？；：])/g, "$1");
    const tokens = sentenceWords(en);
    if (!acceptableEnglish(en, tokens, source.strict)) continue;
    if (!acceptableChinese(zh, source.strict)) continue;

    const lemmas = new Set(tokens.map(lemmaOf));
    for (const lemma of lemmas) {
      const target = targetByLower.get(lemma);
      if (!target || !missing.has(target)) continue;
      const terms = glossByWord.get(target);
      if (!terms) continue;
      const allowCapitalized = /^[A-Z]/.test(target);
      const hasLower = tokens.some((token) => {
        const lower = token.toLowerCase().replace(/’/g, "'");
        return lemmaOf(lower) === lemma && (allowCapitalized || !/^[A-Z]/.test(token));
      });
      if (!hasLower) continue;
      if (source.id === "opensubtitles" && !OPENSUBTITLES_OK.has(target.toLowerCase())) continue;
      const gloss = matchGloss(zh, terms);
      if (!gloss) continue;
      const exact = tokens.some((token) => token.toLowerCase().replace(/’/g, "'") === lemma);
      if (gloss.length < 2 && !exact) continue;
      if (source.id === "opensubtitles" && (gloss.length < 2 || tokens.length < 6)) continue;
      const candidate = {
        en,
        zh,
        source: source.id,
        gloss,
        exact,
        tokens: tokens.length,
        bonus: source.bonus,
      };
      candidate.score = candidateScore(candidate);
      addCandidate(target, candidate);
      kept++;
    }
  }
  console.log(`source=${source.id} lines=${lines} kept=${kept}`);
}

const sourceRank = { unpc: 3, wikimatrix: 2, opensubtitles: 1 };
function byCandidate(a, b) {
  return (
    b.score - a.score ||
    sourceRank[b.source] - sourceRank[a.source] ||
    b.gloss.length - a.gloss.length ||
    a.en.length - b.en.length ||
    a.en.localeCompare(b.en)
  );
}

function similarity(a, b) {
  if (a === b) return 1;
  const m = a.length;
  const n = b.length;
  if (!m || !n) return 0;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return 1 - prev[n] / Math.max(m, n);
}

for (const target of targets) {
  if (out[target]) continue;
  const list = (candidates.get(target) ?? []).sort(byCandidate);
  const preferred = newSources.map((source) => source.id).find((source) =>
    list.some((candidate) => candidate.source === source),
  );
  if (!preferred) continue;
  const chosen = [];
  for (const candidate of list.filter((item) => item.source === preferred)) {
    if (chosen.length >= 2) break;
    if (chosen.some((item) => item.en === candidate.en || similarity(item.zh, candidate.zh) >= 0.9)) continue;
    chosen.push(candidate);
  }
  if (chosen.length) {
    out[target] = chosen.map(({ en, zh, source }) => [en, zh, source]);
  }
}

writeFileSync(new URL("sentences.json", OUT), JSON.stringify(out));
const covered = Object.keys(out).length;
const sourceCounts = {};
for (const list of Object.values(out)) {
  for (const pair of list) sourceCounts[pair[2] ?? "tatoeba"] = (sourceCounts[pair[2] ?? "tatoeba"] ?? 0) + 1;
}
console.log(
  `pairs=${seenPairs} rejected=${rejected} targets=${targets.size} covered=${covered} ` +
    `(${Math.round((covered / targets.size) * 100)}%) examples=${Object.values(out).reduce((n, x) => n + x.length, 0)} ` +
    `sources=${JSON.stringify(sourceCounts)} missing=${targets.size - covered}`,
);
