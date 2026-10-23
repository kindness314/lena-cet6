import "./style.css";
import { fetchJson, generate, makeCtx } from "./app";
import { loadState } from "./core/storage";
import type { Article, Lookup, Sentences, Word } from "./core/types";
import { route, start } from "./router";
import { renderChat } from "./views/chat";
import { renderGoals } from "./views/goals";
import { renderRead } from "./views/read";
import { renderSettings } from "./views/settings";

async function boot(): Promise<void> {
  const app = document.getElementById("app");
  if (!app) return;
  try {
    const [words, lookup, forms, sentences, articles] = await Promise.all([
      fetchJson<Word[]>("words.json"),
      fetchJson<Record<string, Lookup>>("lookup.json"),
      fetchJson<Record<string, string>>("forms.json"),
      fetchJson<Sentences>("sentences.json"),
      fetchJson<Article[]>("articles.json"),
    ]);
    const state = loadState();
    const ctx = makeCtx(state, words, lookup, forms, sentences, articles);
    generate(state, words, sentences);
    ctx.save();

    route("chat", () => renderChat(ctx));
    route("read", (id) => renderRead(ctx, id));
    route("goals", () => renderGoals(ctx));
    route("settings", () => renderSettings(ctx));
    start();
  } catch (err) {
    app.replaceChildren();
    const p = document.createElement("p");
    p.className = "page muted";
    p.textContent = `数据加载失败：${(err as Error).message}`;
    app.append(p);
  }
}

void boot();
