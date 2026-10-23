import { readFileSync, writeFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);
const OUT = new URL("public/data/", ROOT);
const sources = JSON.parse(readFileSync(new URL("scripts/sources/articles.json", ROOT), "utf8"));

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
    .filter((p) => p.length >= 120)
    .filter((p) => !/^(CHAPTER|Chapter|BOOK|Book|PART|Part)\b/.test(p))
    .filter((p) => !/^\d+$/.test(p))
    .filter((p) => (p.match(/[.!?]\s/g) ?? []).length >= 2)
    .filter((p) => !/^[A-Z\s.,;:'"()-]+$/.test(p));
}

function wordsOf(p) {
  return p.split(/\s+/).filter(Boolean).length;
}

const articles = [];
for (const src of sources) {
  const url = `https://www.gutenberg.org/cache/epub/${src.gid}/pg${src.gid}.txt`;
  let text;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    text = await res.text();
  } catch (err) {
    console.warn(`skip ${src.title}: ${err.message}`);
    continue;
  }
  const all = paragraphs(body(text));
  const picked = [];
  let total = 0;
  for (let i = src.start; i < all.length && total < src.maxWords; i++) {
    const p = all[i];
    if (wordsOf(p) > 260) continue;
    picked.push(p);
    total += wordsOf(p);
  }
  if (picked.length < 3) {
    console.warn(`skip ${src.title}: only ${picked.length} paragraphs`);
    continue;
  }
  articles.push({
    id: String(src.gid),
    title: src.title,
    source: `Project Gutenberg · ${src.author}`,
    url: `https://www.gutenberg.org/ebooks/${src.gid}`,
    license: "公有领域",
    paragraphs: picked,
  });
  console.log(`${src.title}: ${picked.length} paragraphs, ${total} words`);
}

writeFileSync(new URL("articles.json", OUT), JSON.stringify(articles));
console.log(`articles=${articles.length}`);
