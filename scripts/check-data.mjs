import { readFileSync } from "node:fs";

const OUT = new URL("../public/data/", import.meta.url);
const read = (f) => JSON.parse(readFileSync(new URL(f, OUT), "utf8"));

const words = read("words.json");
const lookup = read("lookup.json");
const forms = read("forms.json");
const sentences = read("sentences.json");
const articles = read("articles.json");

const covered = words.filter((w) => sentences[w.w]?.length).length;
const withPhonetic = words.filter((w) => w.ph).length;
const withPos = words.filter((w) => w.pos).length;
const badZh = words.filter((w) => !/[\u4e00-\u9fa5]/.test(w.zh)).length;

console.log(`words        ${words.length} (phonetic ${withPhonetic}, pos ${withPos}, zh-fail ${badZh})`);
console.log(`lookup       ${Object.keys(lookup).length}`);
console.log(`forms        ${Object.keys(forms).length}`);
console.log(`sentences    ${Object.keys(sentences).length} / ${words.length} (${Math.round((covered / words.length) * 100)}%)`);
console.log(`articles     ${articles.length}, paragraphs ${articles.reduce((n, a) => n + a.paragraphs.length, 0)}`);

const fail = [];
if (words.length < 700) fail.push("words < 700");
if (withPos < words.length * 0.9) fail.push("pos coverage < 90%");
if (badZh > 0) fail.push(`${badZh} words without Chinese`);
if (Object.keys(lookup).length < 15000) fail.push("lookup < 15000");
if (covered / words.length < 0.6) fail.push("sentence coverage < 60%");
if (articles.length < 8) fail.push("articles < 8");

if (fail.length) {
  console.error("CHECK FAILED: " + fail.join("; "));
  process.exit(1);
}
console.log("data check ok");
