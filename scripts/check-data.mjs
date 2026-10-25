import { readFileSync } from "node:fs";

const OUT = new URL("../public/data/", import.meta.url);
const read = (f) => JSON.parse(readFileSync(new URL(f, OUT), "utf8"));
const words = read("words.json");
const lookup = read("lookup.json");
const forms = read("forms.json");
const sentences = read("sentences.json");
const articles = read("articles.json");
const fail = [];

const withPhonetic = words.filter((w) => w.ph).length;
const withPos = words.filter((w) => w.pos && w.pos !== "?").length;
const badZh = words.filter((w) => !/[\u4e00-\u9fa5]/.test(w.zh)).length;
const covered = words.filter((w) => sentences[w.w]?.length).length;
const sentenceSources = new Map();
for (const list of Object.values(sentences)) {
  for (const pair of list) {
    const source = pair[2] ?? "tatoeba";
    sentenceSources.set(source, (sentenceSources.get(source) ?? 0) + 1);
  }
}
const foundation = words.filter((w) => w.tier === "foundation").length;
const core = words.filter((w) => w.tier === "core").length;
const advanced = words.filter((w) => w.tier === "advanced").length;
const categories = new Map();
for (const a of articles) categories.set(a.category, (categories.get(a.category) ?? 0) + 1);
const wordIds = new Set(words.map((w) => w.w));
const keyTarget = (wordCount) => Math.min(18, Math.max(6, Math.round(wordCount / 60)));
const translated = articles.filter((a) => a.paragraphsZh?.length === a.paragraphs.length).length;
const TOKEN = /[\p{L}]+(?:['’\-][\p{L}]+)*/gu;
const articleWords = (article) =>
  new Set(
    article.paragraphs.flatMap((p) =>
      [...(p.match(TOKEN) ?? [])].map((raw) => {
        let t = raw.toLowerCase().replace(/’/g, "'");
        if (t.endsWith("'s")) t = t.slice(0, -2);
        return forms[t] ?? t;
      }),
    ),
  );

console.log(`words        ${words.length} (foundation ${foundation}, core ${core}, advanced ${advanced}, phonetic ${withPhonetic}, pos ${withPos}, zh-fail ${badZh})`);
console.log(`lookup       ${Object.keys(lookup).length}`);
console.log(`forms        ${Object.keys(forms).length}`);
console.log(`sentences    ${covered} / ${words.length} (${Math.round((covered / words.length) * 100)}%; ${[...sentenceSources].map(([k, v]) => `${k}:${v}`).join(" ")})`);
console.log(`articles     ${articles.length}, paragraphs ${articles.reduce((n, a) => n + a.paragraphs.length, 0)}, translated ${translated}`);
console.log(`categories   ${[...categories].map(([k, v]) => `${k}:${v}`).join(" ")}`);

if (words.length < 2580 || words.length > 2700) fail.push(`word count ${words.length} outside 2580-2700`);
if (foundation < 600 || foundation > 700) fail.push(`foundation count ${foundation}`);
if (core < 1450 || advanced < 450) fail.push(`tier counts foundation=${foundation} core=${core} advanced=${advanced}`);
if (withPos < words.length * 0.95) fail.push("pos coverage < 95%");
if (withPhonetic < words.length - 3) fail.push("too many missing phonetics");
if (badZh > 0) fail.push(`${badZh} words without Chinese`);
if (Object.keys(lookup).length < 24000) fail.push("lookup < 24000");
if (Object.keys(forms).length < 20000) fail.push("forms < 20000");
if (covered / words.length < 0.85) fail.push("sentence coverage < 85%");
if (articles.length !== 600) fail.push(`articles ${articles.length} != 600`);
if (translated !== articles.length) fail.push(`${articles.length - translated} articles lack full Chinese translation`);
if (articles.reduce((n, a) => n + a.paragraphs.length, 0) < 250) fail.push("article paragraphs < 250");

const freq = new Set();
const ids = new Set();
for (const w of words) {
  if (!w.id || ids.has(w.id) || w.id !== w.w) fail.push(`bad/duplicate word id ${w.id}`);
  ids.add(w.id);
  if (!Number.isInteger(w.freq) || freq.has(w.freq)) fail.push(`bad/duplicate freq ${w.w}`);
  freq.add(w.freq);
  if (!["foundation", "core", "advanced"].includes(w.tier)) fail.push(`bad tier ${w.w}`);
  if (!Array.isArray(w.forms)) fail.push(`bad forms ${w.w}`);
}
if (freq.size !== words.length) fail.push("freq is not a contiguous priority sequence");
if (new Set(words.slice(0, 32).map((w) => w.tier)).size < 2) fail.push("first 32 words are not tier-mixed");

for (const [word, list] of Object.entries(sentences)) {
  if (!Array.isArray(list) || list.length < 1 || list.length > 2) fail.push(`${word}: bad sentence count`);
  for (const pair of list) {
    if (!Array.isArray(pair) || pair.length < 2 || pair.length > 3) {
      fail.push(`${word}: bad sentence pair`);
      continue;
    }
    const [en, zh, source = "tatoeba"] = pair;
    if (!["tatoeba", "unpc", "wikimatrix", "opensubtitles"].includes(source)) {
      fail.push(`${word}: bad sentence source ${source}`);
    }
    if (typeof en !== "string" || en.length < 12 || en.length > 240) fail.push(`${word}: bad English example`);
    if (typeof zh !== "string" || !/[\u4e00-\u9fa5]/.test(zh)) fail.push(`${word}: missing Chinese translation`);
    if (!/[.!?]["'”’)]?$/.test(en.trim())) fail.push(`${word}: example lacks final punctuation`);
  }
}

const articleIds = new Set();
for (const a of articles) {
  if (!a.id || articleIds.has(a.id)) fail.push(`bad/duplicate article id ${a.id}`);
  articleIds.add(a.id);
  if (!a.title || !a.author || !a.category || !a.level) fail.push(`article ${a.id}: missing metadata`);
  if (!a.source?.includes("Project Gutenberg") || !a.url?.startsWith("https://www.gutenberg.org/")) fail.push(`article ${a.id}: bad source`);
  if (!a.license?.includes("公有领域") || !a.retrieved) fail.push(`article ${a.id}: bad license/retrieved`);
  if (!Array.isArray(a.paragraphs) || a.paragraphs.length < 3) fail.push(`article ${a.id}: < 3 paragraphs`);
  if (a.wordCount < 380 || a.wordCount > 980) fail.push(`article ${a.id}: wordCount ${a.wordCount}`);
  if (a.targetWords < 7) fail.push(`article ${a.id}: only ${a.targetWords} target words`);
  const wantKeys = keyTarget(a.wordCount);
  if (!Array.isArray(a.keyWords) || a.keyWords.length !== wantKeys) {
    fail.push(`article ${a.id}: keyWords ${a.keyWords?.length ?? 0} != ${wantKeys}`);
  } else {
    const seen = new Set();
    const present = articleWords(a);
    for (const key of a.keyWords) {
      if (!wordIds.has(key)) fail.push(`article ${a.id}: key word not in word list: ${key}`);
      if (!/^[a-z][a-z'-]*$/.test(key)) fail.push(`article ${a.id}: key word not lowercase: ${key}`);
      if (seen.has(key)) fail.push(`article ${a.id}: duplicate key word: ${key}`);
      if (!present.has(key)) fail.push(`article ${a.id}: key word absent from text: ${key}`);
      seen.add(key);
    }
    if (a.keyWords.length > a.targetWords) fail.push(`article ${a.id}: more key words than targets`);
  }
  if (!Array.isArray(a.paragraphsZh) || a.paragraphsZh.length !== a.paragraphs.length) {
    fail.push(`article ${a.id}: paragraphsZh does not match paragraphs`);
  } else {
    for (const zh of a.paragraphsZh) {
      if (!/[\u4e00-\u9fa5]/.test(zh)) fail.push(`article ${a.id}: Chinese translation missing`);
    }
  }
  if (a.translation?.kind !== "machine" || !a.translation.provider || !a.translation.retrieved) {
    fail.push(`article ${a.id}: missing machine-translation metadata`);
  }
}
for (const cat of ["童话", "成长", "冒险", "侦探", "文学", "科幻", "历史", "思想", "科学", "社会"]) {
  if ((categories.get(cat) ?? 0) < 2) fail.push(`category ${cat}: < 2 articles`);
}

if (fail.length) {
  console.error(`CHECK FAILED (${fail.length}):\n- ${fail.join("\n- ")}`);
  process.exit(1);
}
console.log("data check ok");
