import type { Article, Lookup, Sentences, State, Word } from "./core/types";
import { saveState } from "./core/storage";
import { buildDay } from "./core/messages";
import { ensureDay } from "./core/state";
import { localDay } from "./core/random";
import { sceneForState } from "./core/scenes";

export interface Ctx {
  state: State;
  words: Word[];
  lookup: Record<string, Lookup>;
  forms: Record<string, string>;
  sentences: Sentences;
  articles: Article[];
  targets: Set<string>;
  save(): void;
  regen(day?: string): void;
}

export const IMPORT_KEY = "cet6.import.v1";

export function getImported(): Article | null {
  try {
    const raw = localStorage.getItem(IMPORT_KEY);
    if (!raw) return null;
    const a = JSON.parse(raw) as Partial<Article>;
    if (!a || typeof a.title !== "string" || !Array.isArray(a.paragraphs)) return null;
    const paragraphs = a.paragraphs.filter((p): p is string => typeof p === "string" && p.trim().length > 0);
    if (paragraphs.length === 0) return null;
    return {
      id: "own",
      title: a.title.trim() || "我导入的文章",
      source: "我的导入",
      url: "",
      license: "",
      paragraphs,
      category: "我的导入",
      level: "自定",
      wordCount: paragraphs.join(" ").split(/\s+/).filter(Boolean).length,
    };
  } catch {
    return null;
  }
}

export function setImported(article: Article): void {
  localStorage.setItem(IMPORT_KEY, JSON.stringify(article));
}

export function generate(state: State, words: Word[], sentences: Sentences): void {
  const day = localDay(Date.now());
  ensureDay(state, day, () =>
    buildDay({
      now: Date.now(),
      words,
      sentences,
      wordsState: state.words,
      quota: state.settings.quota,
      newCap: state.settings.newCap,
      seed: day,
      themeWords: sceneForState(state, day).theme,
    }),
  );
}

export function makeCtx(
  state: State,
  words: Word[],
  lookup: Record<string, Lookup>,
  forms: Record<string, string>,
  sentences: Sentences,
  articles: Article[],
): Ctx {
  const ctx: Ctx = {
    state,
    words,
    lookup,
    forms,
    sentences,
    articles,
    targets: new Set(words.map((w) => w.id)),
    save: () => saveState(state),
    regen: (day?: string) => {
      generate(state, words, sentences);
      if (day) state.chat.day = day;
      saveState(state);
    },
  };
  return ctx;
}

export async function fetchJson<T>(file: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${file}`);
  if (!res.ok) throw new Error(`加载 ${file} 失败 (${res.status})`);
  return (await res.json()) as T;
}
