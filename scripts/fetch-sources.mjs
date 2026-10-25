import { createHash } from "node:crypto";
import { createWriteStream, existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { basename } from "node:path";
import { BOOK_DIR, RAW_DIR, RAW_MANIFEST, ARTICLE_MANIFEST, isSha256, readJson, sha256File, sourceUrl } from "./lib/sources.mjs";

const args = new Set(process.argv.slice(2));
const force = args.has("--force");
const only = [...args].find((a) => a.startsWith("--only="))?.split("=")[1];
if (only && !["raw", "articles"].includes(only)) throw new Error("--only must be raw or articles");

function target(name, kind) {
  mkdirSync(kind === "raw" ? RAW_DIR : BOOK_DIR, { recursive: true });
  return new URL(name, kind === "raw" ? RAW_DIR : BOOK_DIR);
}

async function download(url, dest, expected, maxBytes) {
  if (!force && existsSync(dest)) {
    const size = (await import("node:fs")).statSync(dest).size;
    if (size === expected.bytes && (await sha256File(dest)) === expected.sha256) {
      console.log(`ok    ${basename(dest.pathname)} (cached)`);
      return;
    }
  }
  const part = new URL(`${basename(dest.pathname)}.part`, dest);
  const timeoutMs = Number.isInteger(expected.timeoutMs) && expected.timeoutMs > 0 ? expected.timeoutMs : 45_000;
  const res = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "user-agent": "lena-cet6-data-fetch/1.0 (+local study app)" },
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  if (new URL(res.url).protocol !== "https:") throw new Error(`redirected to non-HTTPS: ${res.url}`);
  sourceUrl(res.url, expected.kind);
  const declared = Number(res.headers.get("content-length") || 0);
  if (declared > maxBytes) throw new Error(`${url}: content-length ${declared} > ${maxBytes}`);
  if (!res.body) throw new Error(`${url}: empty body`);

  const hash = createHash("sha256");
  const out = createWriteStream(part, { flags: "w" });
  let bytes = 0;
  try {
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) throw new Error(`${url}: exceeds ${maxBytes} bytes`);
      hash.update(value);
      if (!out.write(Buffer.from(value))) await new Promise((r) => out.once("drain", r));
    }
    await new Promise((resolve, reject) => {
      out.end(resolve);
      out.on("error", reject);
    });
    const digest = hash.digest("hex");
    if (bytes !== expected.bytes) throw new Error(`${basename(dest.pathname)}: ${bytes} bytes, expected ${expected.bytes}`);
    if (digest !== expected.sha256) throw new Error(`${basename(dest.pathname)}: sha256 ${digest}, expected ${expected.sha256}`);
    renameSync(part, dest);
    console.log(`fetch ${basename(dest.pathname)} ${bytes} bytes`);
  } catch (err) {
    out.destroy();
    rmSync(part, { force: true });
    throw err;
  }
}

async function fetchRaw() {
  const items = readJson(RAW_MANIFEST);
  for (const item of items) {
    if (!isSha256(item.sha256) || !Number.isInteger(item.bytes) || item.bytes <= 0) {
      throw new Error(`${item.name}: invalid manifest entry`);
    }
    const parsed = sourceUrl(item.url, "raw");
    const dest = target(item.name, "raw");
    await download(parsed.url, dest, { ...item, kind: "raw" }, Math.max(item.bytes * 1.05, 1024 * 1024));
  }
}

async function fetchArticles() {
  const items = readJson(ARTICLE_MANIFEST);
  const seen = new Set();
  for (const item of items) {
    if (!isSha256(item.sha256) || !Number.isInteger(item.bytes)) {
      throw new Error(`article ${item.title}: invalid manifest entry`);
    }
    const parsed = sourceUrl(item.textUrl, "gutenberg");
    if (parsed.gid !== item.gid) throw new Error(`article ${item.title}: gid mismatch`);
    if (seen.has(item.gid)) continue;
    seen.add(item.gid);
    const dest = target(`pg${item.gid}.txt`, "gutenberg");
    await download(parsed.url, dest, { ...item, kind: "gutenberg" }, Math.max(item.bytes * 1.1, 6 * 1024 * 1024));
  }
}

if (!only || only === "raw") await fetchRaw();
if (!only || only === "articles") await fetchArticles();
console.log("sources fetched into .data-sandbox/ (ignored)");
