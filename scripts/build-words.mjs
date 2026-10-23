import { createReadStream, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

const SRC = new URL("../data/ecdict.csv", import.meta.url);
const OUT = new URL("../public/data/", import.meta.url);

function parseCsvLine(line) {
  const out = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      out.push(field);
      field = "";
    } else field += c;
  }
  out.push(field);
  return out;
}

function cleanZh(translation) {
  const lines = translation
    .replace(/\\n/g, "\n")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const first = lines.find((l) => !l.startsWith("[")) ?? lines[0] ?? "";
  const noPos = first.replace(/^(?:[a-z]{1,5}\.\s*)+/i, "");
  const senses = noPos
    .split(/[，,；;]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 2);
  return (senses.join("，") || noPos).replace(/\s+/g, " ").slice(0, 28);
}

function posKey(pos, translation) {
  let raw = (pos || "").split(":")[0].trim();
  if (!raw) {
    const m = /^([a-z]{1,5})\./i.exec(translation.replace(/\\n/g, "\n"));
    raw = m ? m[1].toLowerCase() : "";
  }
  if (raw.startsWith("v")) return "v";
  if (raw === "n") return "n";
  if (raw === "a" || raw === "adj") return "a";
  if (raw === "ad" || raw === "adv") return "r";
  return raw || "?";
}

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
      if (f && f !== row.word.toLowerCase()) forms.push(f);
    }
  }
  return forms;
}

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
const cet6 = all
  .filter((r) => tagsOf(r).includes(" cet6 "))
  .sort((a, b) => (a.r || 1e9) - (b.r || 1e9) || a.word.localeCompare(b.word))
  .slice(0, 800);

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

const words = cet6.map((r) => ({
  id: r.word,
  w: r.word,
  ph: r.phonetic,
  pos: posKey(r.pos, r.translation),
  zh: cleanZh(r.translation),
  freq: r.r || 1e9,
}));

const lookup = {};
for (const r of lookupRows) {
  lookup[r.word] = { ph: r.phonetic, pos: posKey(r.pos, r.translation), zh: cleanZh(r.translation) };
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
  `words=${words.length} lookup=${Object.keys(lookup).length} forms=${Object.keys(forms).length}`,
);
