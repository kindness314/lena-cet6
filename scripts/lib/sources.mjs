import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFileSync } from "node:fs";

export const ROOT = new URL("../../", import.meta.url);
export const RAW_DIR = new URL(".data-sandbox/raw/", ROOT);
export const WORK_DIR = new URL(".data-sandbox/work/", ROOT);
export const BOOK_DIR = new URL(".data-sandbox/gutenberg/", ROOT);

export const RAW_MANIFEST = new URL("scripts/sources/raw.json", ROOT);
export const ARTICLE_MANIFEST = new URL("scripts/sources/articles.json", ROOT);

export function readJson(url) {
  return JSON.parse(readFileSync(url, "utf8"));
}

export function sha256File(url) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(url);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

export function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

export function sourceUrl(value, kind) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`invalid URL: ${value}`);
  }
  if (url.protocol !== "https:") throw new Error(`HTTPS required: ${value}`);
  const path = decodeURIComponent(url.pathname);
  if (kind === "gutenberg") {
    if (url.hostname !== "www.gutenberg.org") throw new Error(`unexpected host: ${url.hostname}`);
    const m = /^\/cache\/epub\/(\d+)\/pg\1\.txt$/.exec(path);
    if (!m) throw new Error(`unexpected Gutenberg path: ${path}`);
    return { url, gid: Number(m[1]) };
  }
  if (url.hostname === "raw.githubusercontent.com") {
    if (path !== "/skywind3000/ECDICT/master/ecdict.csv") throw new Error(`unexpected ECDICT path: ${path}`);
    return { url };
  }
  if (url.hostname === "downloads.tatoeba.org") {
    const allowed = new Set([
      "/exports/per_language/cmn/cmn-eng_links.tsv.bz2",
      "/exports/per_language/cmn/cmn_sentences.tsv.bz2",
      "/exports/per_language/eng/eng_sentences.tsv.bz2",
    ]);
    if (!allowed.has(path)) throw new Error(`unexpected Tatoeba path: ${path}`);
    return { url };
  }
  if (url.hostname === "object.pouta.csc.fi") {
    const allowed = new Set([
      "/OPUS-WikiMatrix/v1/moses/en-zh.txt.zip",
      "/OPUS-UNPC/v1.0/moses/en-zh.txt.zip",
      "/OPUS-OpenSubtitles/v2024/moses/en-zh_CN.txt.zip",
    ]);
    if (!allowed.has(path)) throw new Error(`unexpected OPUS path: ${path}`);
    return { url };
  }
  throw new Error(`unexpected host: ${url.hostname}`);
}
