import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import * as OpenCC from "opencc-js";

const t2s = OpenCC.Converter({ from: "t", to: "cn" });

const ROOT = new URL("../", import.meta.url);
const DATA = new URL("data/", ROOT);
const OUT = new URL("public/data/", ROOT);

const words = JSON.parse(readFileSync(new URL("words.json", OUT), "utf8"));
const forms = JSON.parse(readFileSync(new URL("forms.json", OUT), "utf8"));
const targets = new Set(words.map((w) => w.w));

const TOKEN = /[\p{L}]+(?:['’-][\p{L}]+)*/gu;

function lemmaOf(raw) {
  const lower = raw.toLowerCase().replace(/’/g, "'");
  const base = lower.endsWith("'s") ? lower.slice(0, -2) : lower;
  return forms[base] ?? base;
}

function sentenceWords(text) {
  return text.match(TOKEN) ?? [];
}

const linksFile = new URL("cmn-eng_links.tsv", DATA);
const cmnFile = new URL("cmn_sentences.tsv", DATA);
const engFile = new URL("eng_sentences.tsv", DATA);

async function eachLine(file, fn) {
  const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    fn(line.split("\t"));
  }
}

const engIds = new Set();
const cmnIds = new Set();
const pairs = [];

await eachLine(linksFile, (cells) => {
  if (cells.length < 2) return;
  const a = cells[0].trim();
  const b = cells[1].trim();
  if (!a || !b) return;
  // Per-language links pair a Chinese sentence with an English one.
  pairs.push([a, b]);
});

for (const [a, b] of pairs) {
  engIds.add(a);
  engIds.add(b);
  cmnIds.add(a);
  cmnIds.add(b);
}

const eng = new Map();
const cmn = new Map();

await eachLine(engFile, (cells) => {
  if (cells.length < 3) return;
  if (!engIds.has(cells[0])) return;
  eng.set(cells[0], cells.slice(2).join("\t"));
});

await eachLine(cmnFile, (cells) => {
  if (cells.length < 3) return;
  if (!cmnIds.has(cells[0])) return;
  cmn.set(cells[0], cells.slice(2).join("\t"));
});

const buckets = new Map();
let seenPairs = 0;

for (const [a, b] of pairs) {
  let en = null;
  let zh = null;
  if (eng.has(a) && cmn.has(b)) {
    en = eng.get(a);
    zh = cmn.get(b);
  } else if (eng.has(b) && cmn.has(a)) {
    en = eng.get(b);
    zh = cmn.get(a);
  }
  if (!en || !zh) continue;
  const tokens = sentenceWords(en);
  if (tokens.length < 4 || tokens.length > 16) continue;
  seenPairs++;
  const lemmas = new Set(tokens.map(lemmaOf));
  for (const lemma of lemmas) {
    if (!targets.has(lemma)) continue;
    const map = buckets.get(lemma) ?? new Map();
    if (!map.has(en)) map.set(en, t2s(zh));
    buckets.set(lemma, map);
  }
}

const out = {};
for (const [lemma, map] of buckets) {
  const list = [...map.entries()];
  const exact = ([sentence]) =>
    sentenceWords(sentence).some(
      (token) => token.toLowerCase().replace(/’/g, "'") === lemma.toLowerCase(),
    );
  list.sort((a, b) => Number(exact(b)) - Number(exact(a)));
  out[lemma] = list.slice(0, 2);
}
writeFileSync(new URL("sentences.json", OUT), JSON.stringify(out));
console.log(
  `pairs=${seenPairs} targets=${targets.size} covered=${Object.keys(out).length} ` +
    `(${Math.round((Object.keys(out).length / targets.size) * 100)}%)`,
);
