import { statSync } from "node:fs";
import { BOOK_DIR, ARTICLE_MANIFEST, RAW_DIR, RAW_MANIFEST, isSha256, readJson, sha256File } from "./lib/sources.mjs";

const raw = readJson(RAW_MANIFEST);
const articles = readJson(ARTICLE_MANIFEST);
const fail = [];
let checked = 0;

for (const item of raw) {
  if (!isSha256(item.sha256)) {
    fail.push(`${item.name}: invalid sha256 in manifest`);
    continue;
  }
  const path = new URL(item.name, RAW_DIR);
  try {
    const size = statSync(path).size;
    if (size !== item.bytes) fail.push(`${item.name}: ${size} bytes, expected ${item.bytes}`);
    const hash = await sha256File(path);
    if (hash !== item.sha256) fail.push(`${item.name}: sha256 ${hash}`);
    checked++;
  } catch (err) {
    fail.push(`${item.name}: ${err.code === "ENOENT" ? "missing" : err.message}`);
  }
}

const seenGids = new Set();
for (const item of articles) {
  if (!Number.isInteger(item.gid) || item.gid <= 0) {
    fail.push(`article ${item.title}: invalid gid`);
    continue;
  }
  if (seenGids.has(item.gid)) continue;
  seenGids.add(item.gid);
  if (!isSha256(item.sha256)) {
    fail.push(`article ${item.title}: invalid sha256 in manifest`);
    continue;
  }
  const path = new URL(`pg${item.gid}.txt`, BOOK_DIR);
  try {
    const size = statSync(path).size;
    if (size !== item.bytes) fail.push(`pg${item.gid}.txt: ${size} bytes, expected ${item.bytes}`);
    const hash = await sha256File(path);
    if (hash !== item.sha256) fail.push(`pg${item.gid}.txt: sha256 ${hash}`);
    checked++;
  } catch (err) {
    fail.push(`pg${item.gid}.txt: ${err.code === "ENOENT" ? "missing" : err.message}`);
  }
}

if (fail.length) {
  console.error(`source verification failed (${fail.length}):\n- ${fail.join("\n- ")}`);
  console.error("Run `npm run data:fetch` to restore the isolated sandbox.");
  process.exit(1);
}
console.log(`sources verified: ${checked} files (${raw.length} raw, ${seenGids.size} books)`);
