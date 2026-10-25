import { h } from "../core/dom";
import type { Ctx } from "../app";
import { getImported, setImported } from "../app";
import { annotate, normalizeForm } from "../core/annotate";
import { wordHome } from "../core/game";
import { describeProgress, isTouched } from "../core/progress";
import { dueCount } from "../core/review";
import { enqueueGame, enqueueWord } from "../core/session";
import { SENTENCE_SOURCE_LABEL, type Article } from "../core/types";
import { shell } from "./shell";

const ALL = "全部";
const OWN = "我的导入";
let activeFilter = ALL;
let shelfPage = 1;
let shelfQuery = "";
const SHELF_PAGE = 30;
let showTranslation = false;
const POS_LABEL: Record<string, string> = { n: "名词", v: "动词", a: "形容词", r: "副词", p: "介词", c: "连词" };

const READER_PREFS_KEY = "cet6.reader.prefs";
const READER_PROGRESS_KEY = "cet6.reader.progress";
const READER_LAST_KEY = "cet6.reader.last";
const SIZES = [16, 18, 21];
const LEADINGS = [1.7, 1.95, 2.2];

interface ReaderPrefs {
  size: number;
  leading: number;
}

function readPrefs(): ReaderPrefs {
  const fallback: ReaderPrefs = { size: 1, leading: 1 };
  try {
    const raw = localStorage.getItem(READER_PREFS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<ReaderPrefs>;
    const size = typeof parsed.size === "number" ? Math.min(SIZES.length - 1, Math.max(0, parsed.size)) : 1;
    const leading = typeof parsed.leading === "number" ? Math.min(LEADINGS.length - 1, Math.max(0, parsed.leading)) : 1;
    return { size, leading };
  } catch {
    return fallback;
  }
}

function savePrefs(prefs: ReaderPrefs): void {
  try {
    localStorage.setItem(READER_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* 存不上就只作用这一屏 */
  }
}

/** 书库里的进度条只作展示：正文滚动位置本身存在 state.reads 里，能精确续读。 */
function readProgress(): Record<string, number> {
  try {
    const raw = localStorage.getItem(READER_PROGRESS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeProgress(id: string, pct: number): void {
  try {
    const map = readProgress();
    map[id] = Math.round(pct);
    localStorage.setItem(READER_PROGRESS_KEY, JSON.stringify(map));
    localStorage.setItem(READER_LAST_KEY, id);
  } catch {
    /* 忽略 */
  }
}

function lastReadId(): string | null {
  try {
    return localStorage.getItem(READER_LAST_KEY);
  } catch {
    return null;
  }
}

function wordCount(article: Article): number {
  if (typeof article.wordCount === "number") return article.wordCount;
  return article.paragraphs.join(" ").split(/\s+/).filter(Boolean).length;
}

function articleStats(article: Article): string {
  const bits = [`${wordCount(article)} 词`];
  if (article.keyWords?.length) bits.push(`${article.keyWords.length} 个重点词`);
  else if (article.targetWords) bits.push(`${article.targetWords} 个学习词`);
  return bits.join(" · ");
}

function articleMeta(article: Article): string {
  const bits: string[] = [];
  if (article.category) bits.push(article.category);
  if (article.level) bits.push(article.level);
  bits.push(articleStats(article));
  return bits.join(" · ");
}

function contextSentence(article: Article, surface: string): string | null {
  const escaped = surface.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const hit = new RegExp(`(^|[^A-Za-z])${escaped}(?![A-Za-z])`, "i");
  for (const paragraph of article.paragraphs) {
    if (!paragraph.toLowerCase().includes(surface.toLowerCase())) continue;
    const sentences = paragraph.match(/[^.!?]+[.!?]+["'”’)]?|[^.!?]+$/g) ?? [paragraph];
    const sentence = sentences.find((part) => hit.test(part));
    if (sentence) return sentence.trim();
  }
  return null;
}

function openSheet(
  ctx: Ctx,
  article: Article,
  word: string,
  surface: string,
  trigger: HTMLElement | null,
  close: () => void,
): { backdrop: HTMLElement; panel: HTMLElement; destroy: () => void } {
  const entry = ctx.lookup[word];
  const isTarget = ctx.targets.has(word);
  const wordObj = ctx.words.find((w) => w.w === word);
  const inQueue = ctx.state.chat.msgs.some((m) => m.w === word);
  // 排进队列但没答过不算“学过”，也不写空壳 WordState（否则它会立刻被当成到期词）
  const known = isTouched(ctx.state.words[word]);
  // 池外词不进剧情队列，改走小游戏的优先队列
  const home = wordHome(word);
  const inGame = ctx.state.gameQueue.includes(word);

  const speak = () => {
    if (typeof speechSynthesis === "undefined") return;
    const u = new SpeechSynthesisUtterance(word);
    u.lang = "en-US";
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  };
  const add = h("button", {
    class: "chip",
    text:
      home === "game"
        ? inGame ? "小游戏里已有" : "加进小游戏"
        : inQueue ? "今天聊天里已有" : known ? "放进聊天" : "加进聊天",
    attrs: { type: "button" },
    on: {
      click: () => {
        if (!wordObj) return;
        if (home === "game") {
          if (inGame) return;
          add.textContent = enqueueGame(ctx, wordObj) ? "已加进小游戏" : "小游戏里已有";
          return;
        }
        if (inQueue) return;
        add.textContent = enqueueWord(ctx, wordObj) ? "已加进聊天" : "今天聊天里已有";
        ctx.save();
      },
    },
  });

  const example = ctx.sentences[word]?.[0];
  const exampleSource = example ? SENTENCE_SOURCE_LABEL[example[2] ?? "tatoeba"] : null;
  const contextual = contextSentence(article, surface);
  const tier = wordObj?.tier === "advanced" ? "进阶" : wordObj?.tier === "foundation" ? "基础" : "核心";
  const panel = h(
    "div",
    {
      class: "sheet",
      attrs: { role: "dialog", "aria-modal": "true", "aria-labelledby": "sheet-word", tabindex: "-1" },
    },
    h("div", { class: "sheet-handle", attrs: { "aria-hidden": "true" } }),
    h(
      "div",
      { class: "sheet-head" },
      h(
        "div",
        {},
        h("h4", { text: surface, attrs: { id: "sheet-word" } }),
        surface.toLowerCase() !== word.toLowerCase()
          ? h("div", { class: "muted", text: `原形：${word}` })
          : null,
      ),
      h(
        "div",
        { class: "sheet-tags" },
        isTarget ? h("span", { class: "tag", text: tier }) : null,
        entry?.pos && POS_LABEL[entry.pos] ? h("span", { class: "tag quiet", text: POS_LABEL[entry.pos] }) : null,
      ),
    ),
    entry?.ph ? h("div", { class: "sheet-ph", text: `/${entry.ph}/` }) : null,
    h("p", { class: "sheet-zh", text: entry?.zh ?? "未收录" }),
    h("div", { class: "sheet-progress muted", text: describeProgress(ctx.state.words[word]) }),
    contextual
      ? h(
          "div",
          { class: "sheet-context" },
          h("div", { class: "muted", text: "本文语境" }),
          h("p", {}, ...highlightText(contextual, surface)),
        )
      : null,
    example
      ? h(
          "div",
          { class: "sheet-example" },
          h("p", {}, ...highlightText(example[0], word)),
          h("p", { class: "muted", text: example[1] }),
        )
      : null,
    h(
      "div",
      { class: "row sheet-actions" },
      ctx.state.settings.sound ? h("button", { class: "chip", text: "发音", attrs: { type: "button" }, on: { click: speak } }) : null,
      isTarget ? add : h("span", { class: "muted", text: "不在学习词表" }),
      h("button", { class: "chip quiet sheet-close", text: "关闭", attrs: { type: "button" }, on: { click: close } }),
    ),
    h(
      "div",
      {
        class: "sheet-source muted",
        text: example
          ? `释义：ECDICT（第三方 MIT 词典）· 例句：${exampleSource}`
          : "释义：ECDICT（第三方 MIT 词典）",
      },
    ),
  );

  const backdrop = h("div", { class: "sheet-backdrop" });
  const closeOnKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...panel.querySelectorAll<HTMLElement>("button, [href], [tabindex]:not([tabindex='-1'])")];
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === panel) {
      event.preventDefault();
      last.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  const closeOnBackdrop = (event: Event) => {
    if (event.target === backdrop) close();
  };
  backdrop.addEventListener("click", closeOnBackdrop);
  document.addEventListener("keydown", closeOnKey);
  const scrollY = window.scrollY;
  const body = document.body;
  const prevBody = {
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width,
    overflow: body.style.overflow,
  };
  body.style.position = "fixed";
  body.style.top = `-${scrollY}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.width = "100%";
  body.style.overflow = "hidden";
  requestAnimationFrame(() => {
    panel.focus();
  });
  return {
    backdrop,
    panel,
    destroy: () => {
      document.removeEventListener("keydown", closeOnKey);
      backdrop.removeEventListener("click", closeOnBackdrop);
      body.style.position = prevBody.position;
      body.style.top = prevBody.top;
      body.style.left = prevBody.left;
      body.style.right = prevBody.right;
      body.style.width = prevBody.width;
      body.style.overflow = prevBody.overflow;
      window.scrollTo(0, scrollY);
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    },
  };
}

function highlightText(text: string, word: string): (Node | string)[] {
  const parts = text.split(new RegExp(`\\b(${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\b`, "i"));
  if (parts.length < 3) return [text];
  return parts.map((part, i) => (i % 2 === 1 ? h("b", { text: part }) : part));
}

function reader(ctx: Ctx, article: Article): HTMLElement {
  const paras = article.paragraphs.slice(0, 120);
  const id = article.id;
  const ac = new AbortController();
  let closeSheet = () => {};
  const pctOf = (): number => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (max <= 0) return 100;
    return Math.min(100, Math.max(0, Math.round((window.scrollY / max) * 100)));
  };
  const savePos = () => {
    ctx.state.reads[id] = Math.round(window.scrollY);
    ctx.save();
    writeProgress(id, pctOf());
  };
  window.addEventListener(
    "route:before",
    () => {
      closeSheet();
      savePos();
      document.querySelectorAll(".sheet, .sheet-backdrop").forEach((el) => el.remove());
      ac.abort();
    },
    { signal: ac.signal },
  );
  window.addEventListener("pagehide", savePos, { signal: ac.signal });
  const saved = ctx.state.reads[id] ?? 0;
  if (saved > 0) {
    requestAnimationFrame(() => {
      if (!ac.signal.aborted) window.scrollTo(0, saved);
    });
  }
  const prefs = readPrefs();
  const container = h("div", { class: "reader" });
  const applyPrefs = (): void => {
    container.style.setProperty("--reader-size", `${SIZES[prefs.size]}px`);
    container.style.setProperty("--reader-leading", String(LEADINGS[prefs.leading]));
  };
  applyPrefs();
  const zhParas = article.paragraphsZh ?? [];
  const zhEls: HTMLElement[] = [];
  const highlight = article.keyWords?.length ? new Set(article.keyWords) : ctx.targets;
  const open = (word: string, surface: string, trigger: HTMLElement | null) => {
    closeSheet();
    let panel: HTMLElement | null = null;
    let backdrop: HTMLElement | null = null;
    let destroy = () => {};
    const close = () => {
      panel?.remove();
      backdrop?.remove();
      destroy();
      closeSheet = () => {};
    };
    const pack = openSheet(ctx, article, word, surface, trigger, close);
    backdrop = pack.backdrop;
    panel = pack.panel;
    destroy = pack.destroy;
    backdrop.append(panel);
    document.body.append(backdrop);
    closeSheet = close;
  };
  for (let index = 0; index < paras.length; index++) {
    const p = paras[index];
    const tokens = annotate(p, ctx.forms, ctx.lookup, highlight);
    const pEl = h("p", { class: index === 0 ? "reader-lead" : "" });
    // 首段首字母下沉：跳过开头的引号，只放大第一个字母
    let capDone = index !== 0;
    for (const t of tokens) {
      if (!capDone && t.word !== undefined && /[A-Za-z]/.test(t.text)) {
        capDone = true;
        const span = h("span", { class: "w reader-cap-host" });
        span.append(
          h("span", { class: "reader-cap", text: t.text.slice(0, 1) }),
          t.text.slice(1),
        );
        pEl.append(span);
        continue;
      }
      if (t.word || /^\p{L}/u.test(t.text)) {
        const isTarget = Boolean(t.target);
        const span = h("span", {
          class: "w" + (isTarget ? " target" : ""),
          text: t.text,
          attrs: isTarget ? { role: "button", tabindex: "0", "aria-label": `${t.text}，查看释义` } : {},
          on: {
            click: () => open(t.word ?? normalizeForm(t.text), t.text, span),
            keydown: (event) => {
              const key = (event as KeyboardEvent).key;
              if (key === "Enter" || key === " ") {
                event.preventDefault();
                open(t.word ?? normalizeForm(t.text), t.text, span);
              }
            },
          },
        });
        pEl.append(span);
      } else {
        pEl.append(t.text);
      }
    }
    container.append(pEl);
    if (zhParas[index]) {
      const zhEl = h("p", { class: "reader-zh", text: zhParas[index], attrs: { lang: "zh-CN" } });
      zhEl.hidden = !showTranslation;
      container.append(zhEl);
      zhEls.push(zhEl);
    }
  }
  if (article.paragraphs.length > paras.length) {
    container.append(
      h("p", { class: "muted", text: `后面还有 ${article.paragraphs.length - paras.length} 段，先读到这里。` }),
    );
  }

  const zhButton = article.paragraphsZh?.length
    ? h("button", {
        class: "chip quiet reader-zh-toggle",
        text: showTranslation ? "隐藏译文" : "显示译文",
        attrs: { type: "button", "aria-pressed": String(showTranslation) },
        on: {
          click: () => {
            if (!zhButton) return;
            showTranslation = !showTranslation;
            for (const el of zhEls) el.hidden = !showTranslation;
            zhButton.textContent = showTranslation ? "隐藏译文" : "显示译文";
            zhButton.setAttribute("aria-pressed", String(showTranslation));
          },
        },
      })
    : null;

  const readerNote = article.keyWords?.length
    ? "虚线词是本文重点；点任意单词可查释义，少数专名可能未收录。" + (zhButton ? " 可点「显示译文」对照中文。" : "")
    : "点带虚线的词看释义。" + (zhButton ? " 可点「显示译文」对照中文。" : "");

  // 阅读器底栏：进度 + 字号/行距；像阅读软件一样随时可调，不占正文宽度
  const fill = h("i");
  const pct = h("span", { class: "reader-pct", text: "0%" });
  const typePanel = h("div", { class: "reader-type" });
  const typeRow = (label: string, options: string[], index: number, pick: (i: number) => void): HTMLElement => {
    const row = h("div", { class: "reader-type-row" }, h("span", { class: "muted", text: label }));
    options.forEach((text, i) => {
      const chip = h("button", {
        class: i === index ? "filter-chip active" : "filter-chip",
        text,
        attrs: { type: "button", "aria-pressed": String(i === index) },
        on: {
          click: () => {
            pick(i);
            for (const btn of [...row.querySelectorAll("button")]) {
              const on = btn === chip;
              btn.classList.toggle("active", on);
              btn.setAttribute("aria-pressed", String(on));
            }
          },
        },
      });
      row.append(chip);
    });
    return row;
  };
  // 改字号/行距会把内容重排，按百分比回位，眼睛不用重新找地方
  const reflow = (): void => {
    const keep = pctOf();
    applyPrefs();
    savePrefs(prefs);
    window.scrollTo(0, Math.round((document.documentElement.scrollHeight - window.innerHeight) * (keep / 100)));
  };
  typePanel.append(
    typeRow("字号", ["小", "标准", "大"], prefs.size, (i) => {
      prefs.size = i;
      reflow();
    }),
    typeRow("行距", ["紧", "标准", "松"], prefs.leading, (i) => {
      prefs.leading = i;
      reflow();
    }),
  );
  typePanel.hidden = true;
  const typeBtn = h("button", {
    class: "chip quiet reader-aa",
    text: "Aa",
    attrs: { type: "button", "aria-expanded": "false", "aria-label": "排版设置" },
    on: {
      click: () => {
        typePanel.hidden = !typePanel.hidden;
        typeBtn.setAttribute("aria-expanded", String(!typePanel.hidden));
      },
    },
  });
  const bar = h(
    "div",
    { class: "reader-bar" },
    typePanel,
    h(
      "div",
      { class: "reader-bar-main" },
      h("div", { class: "reader-bar-track", attrs: { role: "progressbar", "aria-label": "阅读进度" } }, fill),
      pct,
      zhButton ?? h("span"),
      typeBtn,
    ),
  );
  const paint = (): void => {
    const value = pctOf();
    fill.style.width = `${value}%`;
    pct.textContent = `${value}%`;
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!ac.signal.aborted) paint();
    },
    { passive: true, signal: ac.signal },
  );
  requestAnimationFrame(paint);

  const body = h(
    "div",
    { class: "reader-page" },
    h(
      "div",
      { class: "reader-head" },
      h("div", { class: "reader-kicker", text: articleMeta(article) }),
      h("p", { class: "reader-note", text: readerNote }),

    ),
    container,
    bar,
    h(
      "div",
      { class: "reader-foot muted" },
      h("span", { text: [article.source, article.license].filter(Boolean).join(" · ") }),
      article.translation
        ? h("span", {
            class: "reader-translation-note",
            text: `译文：${article.translation.provider} 机器翻译，仅作阅读辅助（${article.translation.retrieved}）`,
          })
        : null,
      article.url
        ? h("a", { class: "plain", text: "原文链接", attrs: { href: article.url, target: "_blank", rel: "noreferrer" } })
        : null,
    ),
  );
  return shell({ title: article.title, eyebrow: article.category ?? "阅读", back: "#/read", body, tab: "read", due: dueCount(ctx) });
}

function importer(ctx: Ctx): HTMLElement {
  const title = h("input", { attrs: { type: "text", placeholder: "标题（可选）" } });
  const text = h("textarea", { attrs: { rows: "12", placeholder: "粘贴英文文章，段落之间空一行" } });
  const note = h("div", { class: "muted" });
  const save = h("button", {
    class: "chip",
    text: "保存并阅读",
    attrs: { type: "button" },
    on: {
      click: () => {
        const paragraphs = text.value
          .split(/\n\s*\n/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (paragraphs.length === 0) {
          note.textContent = "先粘贴一段英文。";
          return;
        }
        const article: Article = {
          id: "own",
          title: title.value.trim() || "我导入的文章",
          source: "我的导入",
          url: "",
          license: "",
          paragraphs,
          category: OWN,
          level: "自定",
          wordCount: paragraphs.join(" ").split(/\s+/).filter(Boolean).length,
        };
        setImported(article);
        location.hash = "#/read/own";
        ctx.save();
      },
    },
  });
  return shell({
    title: "导入文章",
    eyebrow: "OWN TEXT",
    back: "#/read",
    body: h(
      "div",
      { class: "page" },
      h("div", { class: "card stack" }, title, text, note, h("div", { class: "row" }, save)),
      h("p", { class: "muted", text: "文章只保存在这台设备上。导入会替换上一篇自定文章。" }),
    ),
    tab: "read",
    due: dueCount(ctx),
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

  if (activeFilter !== ALL && activeFilter !== OWN && !all.some((a) => a.category === activeFilter)) activeFilter = ALL;
  if (activeFilter === OWN && !imported) activeFilter = ALL;
  const categories = new Map<string, number>();
  for (const article of ctx.articles) {
    if (article.category) categories.set(article.category, (categories.get(article.category) ?? 0) + 1);
  }

  const tabs = h("div", { class: "shelf-tabs", attrs: { role: "tablist", "aria-label": "文章分类" } });
  const tabButtons: HTMLButtonElement[] = [];
  const addTab = (name: string, count: number) => {
    const active = activeFilter === name;
    const button = h(
      "button",
      {
        class: "filter-chip" + (active ? " active" : ""),
        attrs: { type: "button", role: "tab", "aria-selected": String(active) },
        on: {
          click: () => {
            if (activeFilter === name) return;
            activeFilter = name;
            shelfPage = 1;
            for (const other of tabButtons) {
              const on = other === button;
              other.classList.toggle("active", on);
              other.setAttribute("aria-selected", String(on));
            }
            paint();
            window.scrollTo({ top: 0 });
          },
        },
      },
      h("span", { text: name }),
      h("small", { text: String(count) }),
    );
    tabButtons.push(button);
    tabs.append(button);
  };
  addTab(ALL, all.length);
  if (imported) addTab(OWN, 1);
  // 分类按篇数从多到少，常用分类不用横滑才找得到
  for (const [name, count] of [...categories.entries()].sort((a, b) => b[1] - a[1])) addTab(name, count);

  const progress = readProgress();
  const last = lastReadId();
  const resume = last ? all.find((article) => article.id === last) : null;
  const list = h("div", { class: "page shelf-page" });

  const search = h("input", {
    attrs: {
      type: "search",
      placeholder: "搜书名 / 作者 / 分类",
      "aria-label": "搜索文章",
      enterkeyhint: "search",
      autocomplete: "off",
    },
  });
  search.value = shelfQuery;
  search.addEventListener("input", () => {
    shelfQuery = search.value;
    shelfPage = 1;
    paint();
  });
  list.append(h("label", { class: "shelf-search" }, h("i", { attrs: { "aria-hidden": "true" } }), search));

  if (resume && (progress[resume.id] ?? 0) > 0) {
    const pct = progress[resume.id];
    list.append(
      h(
        "a",
        { class: "card resume-card", attrs: { href: `#/read/${resume.id}`, "aria-label": `继续阅读 ${resume.title}` } },
        bookCover(resume),
        h(
          "div",
          { class: "resume-body" },
          h("div", { class: "article-kicker", text: pct >= 97 ? "读完了，再看一遍" : "接着读 · 上次读到" }),
          h("h3", { text: resume.title }),
          h(
            "div",
            { class: "article-progress", attrs: { role: "progressbar", "aria-valuenow": String(pct), "aria-valuemin": "0", "aria-valuemax": "100" } },
            h("i", { attrs: { style: `width:${pct}%` } }),
          ),
          h("p", { class: "muted", text: `${pct}% · ${articleStats(resume)}` }),
        ),
      ),
    );
  }

  list.append(tabs);

  const count = h("span", { class: "shelf-count" });
  const grid = h("div", { class: "shelf-grid" });
  const empty = h("p", { class: "muted empty-note", text: "没有匹配的文章。" });
  const sentinel = h("div", { class: "shelf-sentinel", attrs: { "aria-hidden": "true" } });
  const more = h("button", { class: "chip quiet shelf-more", attrs: { type: "button" } });
  list.append(h("div", { class: "shelf-section" }, count, h("span", { class: "muted", text: "在读 → 未读 → 读完" })), grid, empty, sentinel, more);

  function paint(): void {
    const pool = all.filter((article) => (activeFilter === ALL || article.category === activeFilter) && matchesQuery(article, shelfQuery));
    const sorted = [...pool].sort((x, y) => shelfGroup(progress[x.id]) - shelfGroup(progress[y.id]));
    const pages = Math.max(1, Math.ceil(sorted.length / SHELF_PAGE));
    if (shelfPage > pages) shelfPage = pages;
    const shown = sorted.slice(0, shelfPage * SHELF_PAGE);
    grid.replaceChildren(...shown.map((article) => shelfBook(article, progress[article.id])));
    grid.hidden = sorted.length === 0;
    empty.hidden = sorted.length > 0;
    const query = shelfQuery.trim();
    count.textContent = query
      ? `搜索「${query}」· ${sorted.length} 篇`
      : `${activeFilter === ALL ? "全部" : activeFilter} · ${sorted.length} 篇`;
    const left = sorted.length - shown.length;
    more.hidden = left <= 0;
    more.textContent = `加载更多（已显示 ${shown.length} / ${sorted.length}）`;
  }

  const ac = new AbortController();
  const maybeMore = (): void => {
    if (more.hidden || ac.signal.aborted) return;
    if (sentinel.getBoundingClientRect().top > window.innerHeight + 400) return;
    shelfPage += 1;
    paint();
  };
  window.addEventListener("scroll", maybeMore, { passive: true, signal: ac.signal });
  window.addEventListener("route:before", () => ac.abort(), { signal: ac.signal });
  more.addEventListener("click", maybeMore);

  shelfPage = 1;
  paint();
  return shell({
    title: "书架",
    eyebrow: "阅读空间",
    action: h("a", { class: "chip quiet", text: "导入文章", attrs: { href: "#/read/import" } }),
    body: list,
    tab: "read",
    due: dueCount(ctx),
  });
}

function bookCover(article: Article): HTMLElement {
  const letter = (article.title.match(/[A-Za-z\u4e00-\u9fa5]/)?.[0] ?? "R").toUpperCase();
  return h(
    "div",
    { class: "book-cover", attrs: { "aria-hidden": "true" } },
    h("span", { text: letter }),
    h("i", { text: article.category ?? "READ" }),
  );
}

function shelfGroup(pct?: number): number {
  if (typeof pct !== "number" || pct <= 0) return 1;
  return pct >= 97 ? 2 : 0;
}

function shelfBook(article: Article, pct?: number): HTMLElement {
  const group = shelfGroup(pct);
  const state = group === 2 ? "读完" : group === 0 ? `${pct}%` : "未读";
  return h(
    "a",
    {
      class: "shelf-book",
      attrs: { href: `#/read/${article.id}`, "aria-label": `阅读 ${article.title}，${wordCount(article)} 词，${state}` },
    },
    bookCover(article),
    h("h3", { class: "shelf-title", text: article.title }),
    h("p", { class: "shelf-meta", text: `${wordCount(article)} 词 · ${state}` }),
  );
}

function matchesQuery(article: Article, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [article.title, article.author, article.category, article.level].some(
    (value) => typeof value === "string" && value.toLowerCase().includes(needle),
  );
}
