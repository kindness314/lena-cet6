import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface Word {
  id: string;
  w: string;
  ph: string;
  pos: string;
  zh: string;
  freq: number;
  tier: "foundation" | "core" | "advanced";
  forms: string[];
}

interface Article {
  id: string;
  title: string;
  author: string;
  source: string;
  url: string;
  license: string;
  paragraphs: string[];
  category: string;
  level: string;
  wordCount: number;
  targetWords: number;
  keyWords: string[];
  paragraphsZh?: string[];
  translation?: { provider: string; kind: "machine"; retrieved: string };
  retrieved: string;
}

interface RawSource {
  name: string;
  url: string;
  license: string;
  sha256: string;
  bytes: number;
}

interface ArticleSource {
  id?: string;
  gid: number;
  title: string;
  author: string;
  category: string;
  level: string;
  start: number;
  end: number;
  license: string;
  sourceUrl: string;
  textUrl: string;
  sha256: string;
  bytes: number;
}

const read = <T>(path: string): T =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8")) as T;

const words = read<Word[]>("../public/data/words.json");
const sentences = read<Record<string, [string, string, string?][]>>("../public/data/sentences.json");
const forms = read<Record<string, string>>("../public/data/forms.json");
const articles = read<Article[]>("../public/data/articles.json");
const lookup = read<Record<string, { zh: string }>>("../public/data/lookup.json");
const raw = read<RawSource[]>("../scripts/sources/raw.json");
const articleSources = read<ArticleSource[]>("../scripts/sources/articles.json");
const sha = /^[a-f0-9]{64}$/;

describe("word data", () => {
  it("ships 636 CET4 foundation + 1500 core + 500 advanced words", () => {
    expect(words).toHaveLength(2636);
    expect(words.filter((w) => w.tier === "foundation")).toHaveLength(636);
    expect(words.filter((w) => w.tier === "core")).toHaveLength(1500);
    expect(words.filter((w) => w.tier === "advanced")).toHaveLength(500);
    expect(new Set(words.map((w) => w.id)).size).toBe(2636);
    expect(new Set(words.map((w) => w.w)).size).toBe(2636);
    expect(new Set(words.map((w) => w.freq)).size).toBe(2636);
  });

  it("has usable glosses and a contiguous frequency order", () => {
    for (const w of words) {
      expect(w.id).toBe(w.w);
      expect(w.zh).toMatch(/[\u4e00-\u9fa5]/);
      expect(w.pos).not.toBe("");
      expect(w.forms).toBeInstanceOf(Array);
      expect(Number.isInteger(w.freq) && w.freq > 0).toBe(true);
    }
    const freqs = words.map((w) => w.freq).sort((a, b) => a - b);
    expect(freqs[0]).toBe(1);
    expect(freqs.at(-1)).toBe(2636);
    for (let i = 0; i < freqs.length; i++) expect(freqs[i]).toBe(i + 1);
  });
});

describe("reading lookup", () => {
  it("keeps common inflected senses and article-only words", () => {
    expect(lookup.saw.zh).toContain("see");
    expect(lookup.bore.zh).toContain("bear");
    expect(lookup.queer.zh).toContain("奇怪");
    expect(lookup.tumbrils.zh).toContain("倾卸");
  });
});

describe("example sentences", () => {
  it("covers most words with at most two pair per word", () => {
    const ids = new Set(words.map((w) => w.w));
    const covered = Object.keys(sentences).filter((w) => ids.has(w));
    expect(covered.length).toBeGreaterThanOrEqual(2200);
    expect(covered.length / words.length).toBeGreaterThan(0.85);
    expect(Object.entries(sentences).every(([w, list]) => ids.has(w) && list.length >= 1 && list.length <= 2)).toBe(true);
  });

  it("stores bilingual, complete sentences with a known source", () => {
    const pairs = Object.values(sentences).flat();
    expect(pairs.length).toBeGreaterThanOrEqual(3104);
    const allowed = new Set(["tatoeba", "unpc", "wikimatrix", "opensubtitles"]);
    for (const [en, zh, source = "tatoeba"] of pairs) {
      expect(en.length).toBeGreaterThanOrEqual(12);
      expect(en).toMatch(/[.!?]["'”’)]?$/);
      expect(zh).toMatch(/[\u4e00-\u9fa5]/);
      expect(allowed.has(source)).toBe(true);
    }
  });
});

describe("reading articles", () => {
  it("keeps 600 sourced excerpts across ten categories", () => {
    expect(articles).toHaveLength(600);
    expect(new Set(articles.map((a) => a.id)).size).toBe(articles.length);
    const categories = new Set(articles.map((a) => a.category));
    expect(categories.size).toBe(10);
    for (const category of ["童话", "成长", "冒险", "侦探", "文学", "科幻", "历史", "思想", "科学", "社会"]) {
      expect(articles.filter((a) => a.category === category).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("attributes every excerpt honestly", () => {
    for (const a of articles) {
      expect(a.title).not.toBe("");
      expect(a.author).not.toBe("");
      expect(a.source).toContain("Project Gutenberg");
      expect(a.url).toMatch(/^https:\/\/www\.gutenberg\.org\/ebooks\/\d+$/);
      expect(a.license).toContain("公有领域");
      expect(a.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(a.paragraphs.length).toBeGreaterThanOrEqual(3);
      expect(a.wordCount).toBeGreaterThan(300);
      expect(a.targetWords).toBeGreaterThanOrEqual(7);
      for (const paragraph of a.paragraphs) expect(paragraph.trim().length).toBeGreaterThan(20);
    }
  });

  it("marks length-based key words that occur in the excerpt", () => {
    const wordIds = new Set(words.map((w) => w.w));
    const keyTarget = (wordCount: number) => Math.min(18, Math.max(6, Math.round(wordCount / 60)));
    for (const a of articles) {
      expect(a.keyWords).toHaveLength(keyTarget(a.wordCount));
      expect(a.keyWords).toHaveLength(Math.min(keyTarget(a.wordCount), a.targetWords));
      expect(new Set(a.keyWords).size).toBe(a.keyWords.length);
      const present = new Set(
        a.paragraphs.flatMap((paragraph) =>
          (paragraph.match(/[\p{L}]+(?:['’\-][\p{L}]+)*/gu) ?? []).map((raw) => {
            let form = raw.toLowerCase().replace(/’/g, "'");
            if (form.endsWith("'s")) form = form.slice(0, -2);
            return forms[form] ?? form;
          }),
        ),
      );
      for (const key of a.keyWords) {
        expect(wordIds.has(key)).toBe(true);
        expect(key).toMatch(/^[a-z][a-z'-]*$/);
        expect(present.has(key)).toBe(true);
      }
    }
  });

  it("has paragraph-aligned Chinese machine translations", () => {
    for (const a of articles) {
      expect(a.paragraphsZh).toHaveLength(a.paragraphs.length);
      for (const paragraph of a.paragraphsZh ?? []) {
        expect(paragraph).toMatch(/[\u4e00-\u9fa5]/);
      }
      expect(a.translation?.kind).toBe("machine");
      expect(["Google Translate", "Microsoft Translator", "Argos Translate"]).toContain(a.translation?.provider);
      expect(a.translation?.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("matches the article manifest one-to-one", () => {
    expect(articleSources).toHaveLength(articles.length);
    const byId = new Map(articleSources.map((a) => [a.id ?? String(a.gid), a]));
    for (const a of articles) {
      const src = byId.get(a.id);
      expect(src).toBeDefined();
      expect(src?.title).toBe(a.title);
      expect(src?.category).toBe(a.category);
      expect(src?.license).toBe(a.license);
      expect(src?.sourceUrl).toBe(a.url);
      expect(src?.textUrl).toMatch(/^https:\/\/www\.gutenberg\.org\/cache\/epub\/\d+\/pg\d+\.txt$/);
      expect(src?.sha256).toMatch(sha);
      expect(src?.bytes).toBeGreaterThan(10_000);
      expect(src?.start).toBeGreaterThanOrEqual(0);
      expect(src?.end).toBeGreaterThan(src?.start ?? 0);
    }
  });
});

describe("source manifests", () => {
  it("pins the seven raw downloads with HTTPS and SHA256", () => {
    expect(raw).toHaveLength(7);
    for (const item of raw) {
      expect(item.url).toMatch(/^https:\/\//);
      expect(item.sha256).toMatch(sha);
      expect(item.bytes).toBeGreaterThan(0);
      expect(item.license).not.toBe("");
    }
  });
});
