import { writeFileSync } from "node:fs";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { RAW_DIR, RAW_MANIFEST, readJson, sha256File } from "./lib/sources.mjs";
import { cleanZh, lookupZh, parseCsvLine, posKey } from "./lib/ecdict.mjs";

const SRC = new URL("ecdict.csv", RAW_DIR);
const OUT = new URL("../public/data/", import.meta.url);
const CORE_TARGET = 1500;
const ADVANCED_TARGET = 500;
const PHONETIC_FIXES = {
  surprisingly: "səˈpraɪzɪŋli",
  positively: "ˈpɒzətɪvli",
  ironically: "aɪˈrɒnɪkli",
  consistently: "kənˈsɪstəntli",
  predominantly: "prɪˈdɒmɪnəntli",
  consultancy: "kənˈsʌltənsi",
  videotape: "ˈvɪdioʊteɪp",
  waggon: "ˈwæɡən",
  "living-room": "ˈlɪvɪŋ ruːm",
  "so-called": "ˌsoʊ ˈkɔːld",
  "well-known": "ˌwel ˈnoʊn",
  "world-wide": "ˌwɜːrld ˈwaɪd",
};
// ECDICT carries these as CET4 headwords, but they are misspellings of entries
// already in the list (reservoir, up-to-date). Do not teach them as new words.
const BAD_WORDS = new Set(["reservior", "uptodate"]);

function rank(row) {
  const bnc = Number(row.bnc) || 0;
  const frq = Number(row.frq) || 0;
  const vals = [bnc, frq].filter((n) => n > 0);
  return vals.length ? Math.min(...vals) : 0;
}

function exchangeForms(row) {
  const forms = [];
  for (const part of (row.exchange || "").split("/")) {
    const [k, v] = part.split(":");
    if (!k || !v || k === "0" || k === "1") continue;
    for (const form of v.split(",")) {
      const f = form.trim().toLowerCase();
      if (f && f !== row.word.toLowerCase() && !forms.includes(f)) forms.push(f);
    }
  }
  return forms.slice(0, 10);
}

const rawManifest = readJson(RAW_MANIFEST).find((x) => x.name === "ecdict.csv");
if (!rawManifest) throw new Error("ecdict.csv missing from scripts/sources/raw.json");
if ((await sha256File(SRC)) !== rawManifest.sha256) throw new Error("ecdict.csv hash mismatch; run npm run data:fetch -- --force");

const all = [];
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
    exchange: cells[10],
  };
  if (!row.word || !row.translation) continue;
  row.r = rank(row);
  all.push(row);
}

const tagsOf = (row) => ` ${row.tag} `;
const eligible = all.filter((r) => {
  const tag = tagsOf(r);
  return (
    tag.includes(" cet6 ") &&
    // ECDICT treats zk/gk as junior-high/high-school vocabulary. The app is
    // for CET6 learners, so keeping those words would spend daily slots on
    // words such as "system", "court" and "effect".
    !tag.includes(" zk ") &&
    !tag.includes(" gk ") &&
    /^[A-Za-z][A-Za-z'-]*$/.test(r.word)
  );
});
const byRank = (a, b) => (a.r || 1e9) - (b.r || 1e9) || a.word.localeCompare(b.word);
eligible.sort(byRank);

const core = eligible.slice(0, CORE_TARGET);
const coreWords = new Set(core.map((r) => r.word));
const advancedPool = eligible.filter((r) => {
  if (coreWords.has(r.word)) return false;
  const tag = tagsOf(r);
  // True CET6 extension: neither a junior-high nor a CET4 tag.
  return !tag.includes(" cet4 ") && !tag.includes(" gk ");
});
const advanced = advancedPool.slice(0, ADVANCED_TARGET);

// CET4 words that were missing from the original 2000. The 638 candidates are
// all tagged cet4 and not gk/zk, but 94 of them carry only the cet4 tag; the
// other 542 are also cet6. Two ECDICT spelling variants are excluded. Keep them
// separate so the app can prioritise them before the old core tail.
const selectedWords = new Set([...core, ...advanced].map((r) => r.word));
const foundation = all
  .filter((r) => {
    const tag = tagsOf(r);
    return (
      tag.includes(" cet4 ") &&
      !tag.includes(" zk ") &&
      !tag.includes(" gk ") &&
      /^[A-Za-z][A-Za-z'-]*$/.test(r.word) &&
      !BAD_WORDS.has(r.word) &&
      !selectedWords.has(r.word)
    );
  })
  .sort(byRank);

const picked = [];
let fi = 0;
let ai = 0;
// First pass: three CET4 gap words, then one advanced word. This puts the
// missing foundation early without dropping CET6 extension words entirely.
while (fi < foundation.length) {
  for (let k = 0; k < 3 && fi < foundation.length; k++) {
    picked.push({ tier: "foundation", row: foundation[fi++] });
  }
  if (ai < advanced.length) picked.push({ tier: "advanced", row: advanced[ai++] });
}
let ci = 0;
// After the foundation pass, keep the original 3 core + 1 advanced rhythm.
while (ci < core.length || ai < advanced.length) {
  for (let k = 0; k < 3 && ci < core.length; k++) {
    picked.push({ tier: "core", row: core[ci++] });
  }
  if (ai < advanced.length) picked.push({ tier: "advanced", row: advanced[ai++] });
  if (ci >= core.length && ai >= advanced.length) break;
}

const words = picked.map(({ tier, row }, i) => ({
  id: row.word,
  w: row.word,
  ph: PHONETIC_FIXES[row.word] ?? row.phonetic,
  pos: posKey(row.pos, row.translation),
  zh: cleanZh(row.translation),
  freq: i + 1,
  tier,
  sourceRank: row.r || 0,
  forms: exchangeForms(row),
}));

const lookupRows = all.filter((r) => {
  const tag = tagsOf(r);
  const basic = tag.includes(" zk ") || tag.includes(" gk ");
  const copula = /^(?:be|do|have)的/.test(r.translation);
  const contraction = /^[A-Za-z]+(?:n't|'re|'ve|'ll|'d|'m)$/.test(r.word) && /[\u4e00-\u9fa5]/.test(r.translation);
  const extra = /^(?:cannot|gonna|gotta|wanna)$/i.test(r.word);
  return (
    basic ||
    copula ||
    contraction ||
    extra ||
    tag.includes(" cet4 ") ||
    tag.includes(" cet6 ") ||
    tag.includes(" ky ") ||
    (r.r > 0 && r.r <= 20000)
  );
});

const lookup = {};
for (const r of lookupRows) {
  lookup[r.word] = {
    ph: r.phonetic,
    pos: posKey(r.pos, r.translation),
    zh: lookupZh(r.translation) || cleanZh(r.translation),
  };
}
for (const w of words) lookup[w.w] ??= { ph: w.ph, pos: w.pos, zh: w.zh };

const forms = {};
const lookupKeys = new Set(Object.keys(lookup));
for (const r of lookupRows) {
  if (!lookupKeys.has(r.word)) continue;
  for (const f of exchangeForms(r)) {
    if (!lookup[f] && !forms[f]) forms[f] = r.word;
  }
}

writeFileSync(new URL("words.json", OUT), JSON.stringify(words));
writeFileSync(new URL("lookup.json", OUT), JSON.stringify(lookup));
writeFileSync(new URL("forms.json", OUT), JSON.stringify(forms));
console.log(
  `words=${words.length} foundation=${foundation.length} core=${core.length} advanced=${advanced.length} ` +
    `lookup=${Object.keys(lookup).length} forms=${Object.keys(forms).length} ` +
    `firstTierMix=${picked.slice(0, 16).map((x) => x.tier[0]).join("")}`,
);
