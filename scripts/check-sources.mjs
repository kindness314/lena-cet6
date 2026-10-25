import { existsSync } from "node:fs";
import { BOOK_DIR, RAW_DIR, ARTICLE_MANIFEST, RAW_MANIFEST, isSha256, readJson, sourceUrl } from "./lib/sources.mjs";

const raw = readJson(RAW_MANIFEST);
const articles = readJson(ARTICLE_MANIFEST);
const fail = [];
const names = new Set();
const ids = new Set();
const categories = new Map();

for (const item of raw) {
  if (!/^[a-z0-9._-]+$/i.test(item.name)) fail.push(`raw: unsafe name ${item.name}`);
  if (names.has(item.name)) fail.push(`raw: duplicate ${item.name}`);
  names.add(item.name);
  if (!isSha256(item.sha256)) fail.push(`${item.name}: bad sha256`);
  if (!Number.isInteger(item.bytes) || item.bytes <= 0) fail.push(`${item.name}: bad bytes`);
  try { sourceUrl(item.url, "raw"); } catch (err) { fail.push(`${item.name}: ${err.message}`); }
  if (!existsSync(new URL(item.name, RAW_DIR))) fail.push(`${item.name}: not downloaded`);
}

for (const item of articles) {
  if (!Number.isInteger(item.gid) || item.gid <= 0) fail.push(`${item.title}: bad gid`);
  const id = typeof item.id === "string" && item.id ? item.id : String(item.gid);
  if (ids.has(id)) fail.push(`${item.title}: duplicate id ${id}`);
  ids.add(id);
  if (!isSha256(item.sha256)) fail.push(`${item.title}: bad sha256`);
  if (!Number.isInteger(item.bytes) || item.bytes <= 0) fail.push(`${item.title}: bad bytes`);
  if (!Number.isInteger(item.start) || !Number.isInteger(item.end) || item.start < 0 || item.end < item.start) {
    fail.push(`${item.title}: bad paragraph range ${item.start}-${item.end}`);
  }
  if (!item.category || !item.level) fail.push(`${item.title}: category/level missing`);
  if (!item.title || !item.author) fail.push(`${item.title}: title/author missing`);
  try {
    const parsed = sourceUrl(item.textUrl, "gutenberg");
    if (parsed.gid !== item.gid) fail.push(`${item.title}: url gid mismatch`);
    if (!item.sourceUrl.startsWith(`https://www.gutenberg.org/ebooks/${item.gid}`)) fail.push(`${item.title}: sourceUrl mismatch`);
  } catch (err) { fail.push(`${item.title}: ${err.message}`); }
  if (!existsSync(new URL(`pg${item.gid}.txt`, BOOK_DIR))) fail.push(`pg${item.gid}.txt: not downloaded`);
  categories.set(item.category, (categories.get(item.category) ?? 0) + 1);
}

if (articles.length < 160) fail.push(`only ${articles.length} articles, need 160+`);
for (const [cat, n] of categories) if (n < 2) fail.push(`category ${cat}: only ${n} article(s)`);
for (const cat of ["童话", "成长", "冒险", "侦探", "文学", "科幻", "历史", "思想", "科学", "社会"]) {
  if (!categories.has(cat)) fail.push(`missing category ${cat}`);
}

if (fail.length) {
  console.error(`source check failed:\n- ${fail.join("\n- ")}`);
  process.exit(1);
}
console.log(`source manifests ok: ${raw.length} raw, ${articles.length} articles, ${categories.size} categories`);
