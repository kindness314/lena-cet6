import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

// Adds a paragraph-aligned Chinese translation to every reading article.
//
// This is deliberately a build-time, cached step: the reading app never calls
// a translation service at runtime. Machine translation is labelled as such in
// the reader and is not presented as a published translation.
//
// The Microsoft Translator endpoint accepts a POST form. Each article is sent
// with [[[0]]], [[[1]]], ... markers so the response can be split back into
// paragraphs. Marker parsing is verified before anything is written; on a
// mismatch the article falls back to one request per paragraph.
//
// Google Translate is still used for entries created before the switch; the
// provider is stored per article so the reader can show the real source.

const OUT = new URL("../public/data/", import.meta.url);
const CACHE = new URL("../.data-sandbox/work/article-translations.json", import.meta.url);
const BING_PAGE = "https://www.bing.com/translator";
const BING_ENDPOINT = "https://www.bing.com/ttranslatev3?isVertical=1";
const BING_PROVIDER = "Microsoft Translator";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0";
const KIND = "machine";
const RETRIEVED = new Date().toISOString().slice(0, 10);
const LIMIT = 850;
const CONCURRENCY = 1;
const MIN_INTERVAL = 800;
let nextRequestAt = 0;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pace = async () => {
  const wait = nextRequestAt - Date.now();
  if (wait > 0) await sleep(wait);
  nextRequestAt = Date.now() + MIN_INTERVAL;
};
const sha = (text) => createHash("sha256").update(text).digest("hex");

const allArticles = JSON.parse(readFileSync(new URL("articles.json", OUT), "utf8"));
const only = process.env.TRANSLATE_ONLY;
const articles = only ? allArticles.filter((a) => a.id === only) : allArticles;
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};

function sourceHash(article) {
  return sha(article.paragraphs.join("\u0000"));
}

function marker(index) {
  return `[[[${index}]]]`;
}

let bingAuth = null;

async function refreshBingAuth() {
  const res = await fetch(BING_PAGE, {
    headers: { "user-agent": USER_AGENT, "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Bing auth HTTP ${res.status}`);
  const html = await res.text();
  const ig = html.match(/IG:"([^"]+)"/)?.[1];
  const params = html.match(/params_AbusePreventionHelper\s*=\s*\[([^\]]+)\]/)?.[1];
  if (!ig || !params) throw new Error("Bing auth tokens not found");
  const [key, token, interval] = params.split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
  if (!key || !token) throw new Error("Bing auth tokens empty");
  bingAuth = { ig, key, token, expiresAt: Date.now() + Math.min(50 * 60_000, Number(interval) || 50 * 60_000) };
  return bingAuth;
}

async function request(text) {
  let lastError;
  for (let attempt = 0; attempt < 7; attempt++) {
    await pace();
    try {
      if (!bingAuth || bingAuth.expiresAt <= Date.now()) await refreshBingAuth();
      const res = await fetch(`${BING_ENDPOINT}&IG=${encodeURIComponent(bingAuth.ig)}&IID=translator.5028.1`, {
        method: "POST",
        headers: {
          "user-agent": USER_AGENT,
          "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8",
          "content-type": "application/x-www-form-urlencoded",
          referer: "https://www.bing.com/translator",
          origin: "https://www.bing.com",
        },
        body: new URLSearchParams({
          fromLang: "en",
          to: "zh-Hans",
          text,
          token: bingAuth.token,
          key: bingAuth.key,
        }),
        signal: AbortSignal.timeout(45_000),
      });
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after") || 0);
        const waitMs = Math.min(60_000, Math.max(5_000, retryAfter * 1000 || 5_000 * 2 ** attempt));
        console.warn(`rate limited; waiting ${waitMs}ms`);
        await sleep(waitMs);
        nextRequestAt = Date.now() + MIN_INTERVAL;
        lastError = new Error("HTTP 429");
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.text();
      if (!raw.trim()) throw new Error("empty response");
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error("bad JSON response");
      }
      if (data?.statusCode) throw new Error(`Bing status ${data.statusCode}`);
      const translated = data?.[0]?.translations?.[0]?.text;
      if (!translated?.trim()) throw new Error("empty translation");
      return translated;
    } catch (err) {
      lastError = err;
      if (/403|401|tokens|auth|empty response|bad JSON|status/i.test(err.message)) {
        // The endpoint can throttle by returning empty bodies for a stretch of
        // requests; refresh auth once, then wait it out with longer backoff.
        if (bingAuth) bingAuth = null;
        else await sleep(30_000);
      }
      await sleep(3_000 * (attempt + 1));
    }
  }
  throw lastError;
}

function splitMarkers(text, expected, offset = 0) {
  const re = /\[\[\s*\[?\s*(\d+)\s*\]?\s*\]\]/g;
  const matches = [...text.matchAll(re)];
  if (matches.length !== expected) return null;
  const out = new Array(expected);
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const index = Number(match[1]);
    if (index !== offset + i || out[index - offset] !== undefined) return null;
    const start = match.index + match[0].length;
    const end = matches[i + 1]?.index ?? text.length;
    const value = text.slice(start, end).replace(/\s+/g, " ").trim();
    if (!value) return null;
    out[index - offset] = value;
  }
  return out;
}

function splitText(text, max = LIMIT - 20) {
  if (text.length <= max) return [text];
  const sentences = text.match(/[^.!?]+[.!?]+["'”’)]*|[^.!?]+$/g) ?? [text];
  const out = [];
  let current = "";
  const push = (value) => {
    const trimmed = value.trim();
    if (trimmed) out.push(trimmed);
  };
  for (const sentence of sentences) {
    const value = sentence.trim();
    if (!value) continue;
    if (value.length > max) {
      push(current);
      current = "";
      let rest = value;
      while (rest.length > max) {
        let cut = rest.lastIndexOf(" ", max);
        if (cut < max * 0.6) cut = max;
        push(rest.slice(0, cut));
        rest = rest.slice(cut).trim();
      }
      current = rest;
      continue;
    }
    if ((`${current} ${value}`).trim().length > max) {
      push(current);
      current = value;
    } else {
      current = `${current} ${value}`.trim();
    }
  }
  push(current);
  return out;
}

async function translateArticle(article) {
  const fragments = [];
  for (let i = 0; i < article.paragraphs.length; i++) {
    for (const text of splitText(article.paragraphs[i])) fragments.push({ paragraph: i, text });
  }
  const translated = [];
  const recoveredBySource = new Map();
  let batch = [];
  let batchStart = 0;
  const flush = async () => {
    const source = batch.join("\n\n");
    let text;
    try {
      text = await request(source);
    } catch (err) {
      if (/429|fetch failed|timed out|timeout/i.test(err.message)) throw err;
      // Service can recover mid-run; keep any batch that later succeeds so the
      // paragraph fallback skips already translated paragraphs.
      try {
        text = await request(source);
      } catch (retryErr) {
        if (/429|fetch failed|timed out|timeout/i.test(retryErr.message)) throw retryErr;
        text = null;
      }
    }
    if (text != null) {
      const parsed = splitMarkers(text, batch.length, batchStart);
      if (parsed) {
        translated.push(...parsed);
        for (let i = 0; i < batch.length; i++) recoveredBySource.set(fragments[batchStart + i].text, parsed[i]);
        batch = [];
        batchStart = translated.length;
        return;
      }
    }
    throw new Error("batch marker mismatch");
  };
  for (let i = 0; i < fragments.length; i++) {
    const piece = `${marker(i)} ${fragments[i].text}`;
    if (batch.length) await flush();
    batch.push(piece);
  }
  if (batch.length) await flush();
  if (translated.length !== fragments.length) {
    const err = new Error(`got ${translated.length}/${fragments.length} fragments`);
    err.recoveredBySource = recoveredBySource;
    throw err;
  }
  const paragraphs = new Array(article.paragraphs.length).fill("");
  for (let i = 0; i < fragments.length; i++) {
    paragraphs[fragments[i].paragraph] += translated[i];
  }
  if (paragraphs.length !== article.paragraphs.length || paragraphs.some((p) => !p.trim())) {
    const err = new Error(`got ${paragraphs.length}/${article.paragraphs.length} paragraphs`);
    err.recoveredBySource = recoveredBySource;
    throw err;
  }
  for (const paragraph of paragraphs) {
    if (!/[\u4e00-\u9fa5]/.test(paragraph)) throw new Error("non-Chinese paragraph");
  }
  return paragraphs;
}

async function translateParagraphs(article, recovered = null) {
  const out = [];
  for (const paragraph of article.paragraphs) {
    const recoveredText = recovered?.get(paragraph);
    if (recoveredText) {
      out.push(recoveredText);
      continue;
    }
    const parts = [];
    for (const text of splitText(paragraph)) {
      const translated = await request(text);
      const cleaned = translated.replace(/\s+/g, " ").trim();
      if (!/[\u4e00-\u9fa5]/.test(cleaned)) throw new Error("non-Chinese paragraph");
      parts.push(cleaned);
    }
    out.push(parts.join(""));
  }
  return out;
}

const pending = [];
for (const article of articles) {
  const hash = sourceHash(article);
  const hit = cache[article.id];
  if (hit?.hash === hash && hit.paragraphsZh?.length === article.paragraphs.length) {
    hit.translation = {
      provider: hit.translation?.provider ?? BING_PROVIDER,
      kind: KIND,
      retrieved: hit.translation?.retrieved ?? RETRIEVED,
    };
    continue;
  }
  pending.push({ article, hash });
}

console.log(`translations: cached=${articles.length - pending.length} pending=${pending.length}`);

let cursor = 0;
let done = 0;
const failures = [];
async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= pending.length) return;
    const { article, hash } = pending[index];
    try {
      let paragraphsZh;
      try {
        paragraphsZh = await translateArticle(article);
      } catch (err) {
        if (/429|fetch failed|timed out|timeout/i.test(err.message)) throw err;
        console.warn(`${article.id}: batch failed (${err.message}); retrying paragraph by paragraph`);
        paragraphsZh = await translateParagraphs(article, err.recoveredBySource);
      }
      cache[article.id] = {
        hash,
        paragraphsZh,
        translation: { provider: BING_PROVIDER, kind: KIND, retrieved: RETRIEVED },
      };
      done++;
      if (done % 10 === 0 || done === pending.length) {
        writeFileSync(CACHE, JSON.stringify(cache));
        console.log(`translated ${done}/${pending.length}`);
      }
    } catch (err) {
      failures.push(`${article.id}: ${err.message}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
writeFileSync(CACHE, JSON.stringify(cache));

for (const article of articles) {
  const hit = cache[article.id];
  if (!hit || hit.hash !== sourceHash(article)) continue;
  article.paragraphsZh = hit.paragraphsZh;
  article.translation = {
    provider: hit.translation.provider,
    kind: KIND,
    retrieved: hit.translation.retrieved,
  };
}
if (!only) writeFileSync(new URL("articles.json", OUT), JSON.stringify(allArticles));

const translated = allArticles.filter((a) => a.paragraphsZh?.length === a.paragraphs.length).length;
console.log(`articles with full Chinese translation: ${translated}/${allArticles.length}`);
if (failures.length) {
  console.error(`translation failures (${failures.length}):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
