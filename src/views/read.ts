import { h } from "../core/dom";
import type { Ctx } from "../app";
import { getImported, setImported } from "../app";
import { annotate, normalizeForm } from "../core/annotate";
import type { Article } from "../core/types";
import { shell } from "./shell";

function wordCount(article: Article): number {
  return article.paragraphs.join(" ").split(/\s+/).filter(Boolean).length;
}

function sheet(ctx: Ctx, word: string, close: () => void): HTMLElement {
  const entry = ctx.lookup[word];
  const isTarget = ctx.targets.has(word);
  const speak = () => {
    if (!ctx.state.settings.sound || typeof speechSynthesis === "undefined") return;
    const u = new SpeechSynthesisUtterance(word);
    u.lang = "en-US";
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  };
  const add = h("button", {
    class: "chip",
    text: ctx.state.words[word] ? "已在复习里" : "加入复习",
    on: {
      click: () => {
        if (ctx.state.words[word]) return;
        const now = Date.now();
        ctx.state.words[word] = { box: 0, due: now, seen: 0, wrong: 0 };
        ctx.save();
        add.textContent = "已在复习里";
      },
    },
  });
  const box = h(
    "div",
    { class: "sheet" },
    h("h4", { text: word }),
    h("div", { class: "muted", text: entry?.ph ? `/${entry.ph}/` : "" }),
    h("p", { text: entry?.zh ?? "未收录" }),
    h(
      "div",
      { class: "row" },
      h("button", { class: "chip", text: "发音", on: { click: speak } }),
      isTarget ? add : h("span", { class: "muted", text: "不在六级核心词表" }),
      h("button", { class: "chip", text: "关闭", on: { click: close } }),
    ),
  );
  return box;
}

function reader(ctx: Ctx, article: Article): HTMLElement {
  const paras = article.paragraphs.slice(0, 120);
  const container = h("div", { class: "reader" });
  let closeSheet = () => {};
  const open = (word: string) => {
    closeSheet();
    const el = sheet(ctx, word, () => el.remove());
    closeSheet = () => el.remove();
    document.body.append(el);
  };
  for (const p of paras) {
    const tokens = annotate(p, ctx.forms, ctx.lookup, ctx.targets);
    const pEl = h("p");
    for (const t of tokens) {
      if (t.word || /^\p{L}/u.test(t.text)) {
        const span = h("span", {
          class: "w" + (t.target ? " target" : ""),
          text: t.text,
          on: { click: () => open(t.word ?? normalizeForm(t.text)) },
        });
        pEl.append(span);
      } else {
        pEl.append(t.text);
      }
    }
    container.append(pEl);
  }
  if (article.paragraphs.length > paras.length) {
    container.append(
      h("p", { class: "muted", text: `后面还有 ${article.paragraphs.length - paras.length} 段，先读到这里。` }),
    );
  }

  const body = h(
    "div",
    {},
    h("p", { class: "muted", text: `${article.source} · ${article.license} · ${wordCount(article)} 词` }),
    container,
    h("p", { class: "muted" }, ...(article.url ? [h("a", { class: "plain", text: "原文链接", attrs: { href: article.url, target: "_blank", rel: "noreferrer" } })] : [])),
  );
  return shell({ title: article.title, back: "#/read", body, tab: "read" });
}

function importer(ctx: Ctx): HTMLElement {
  const title = h("input", { attrs: { type: "text", placeholder: "标题（可选）" } });
  const text = h("textarea", { attrs: { rows: "12", placeholder: "粘贴英文文章，段落之间空一行" } });
  const save = h("button", {
    class: "chip",
    text: "保存并阅读",
    on: {
      click: () => {
        const paragraphs = text.value.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
        if (paragraphs.length === 0) return;
        const article: Article = {
          id: "own",
          title: title.value.trim() || "我导入的文章",
          source: "我的导入",
          url: "",
          license: "",
          paragraphs,
        };
        setImported(article);
        location.hash = "#/read/own";
        ctx.save();
      },
    },
  });
  return shell({
    title: "导入文章",
    back: "#/read",
    body: h("div", {}, title, text, h("div", { class: "row" }, save)),
    tab: "read",
  });
}

export function renderRead(ctx: Ctx, param?: string): HTMLElement {
  if (param === "import") return importer(ctx);
  const imported = getImported();
  const all = imported ? [imported, ...ctx.articles] : ctx.articles;
  if (param) {
    const article = all.find((a) => a.id === param);
    if (article) return reader(ctx, article);
  }
  const list = h("div", { class: "page" });
  list.append(
    h(
      "div",
      { class: "card" },
      h("p", { text: "点任意单词看意思；加进复习的词，会出现在聊天里。" }),
      h("a", { class: "chip", text: "导入自己的文章", attrs: { href: "#/read/import" } }),
    ),
  );
  for (const a of all) {
    const item = h(
      "a",
      { class: "card article-item", attrs: { href: `#/read/${a.id}` } },
      h("h3", { text: a.title }),
      h("div", { class: "muted", text: `${a.source} · ${wordCount(a)} 词` }),
    );
    list.append(item);
  }
  return shell({ title: "阅读", body: list, tab: "read" });
}
