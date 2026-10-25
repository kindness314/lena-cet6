import { h } from "../core/dom";
import type { Ctx } from "../app";
import { nextRound, spellHint, spellOk } from "../core/game";
import { answerBox } from "../core/srs";
import type { Word } from "../core/types";
import { dueCount } from "../core/review";
import { shell } from "./shell";

const ROUND = 5;
const POS_LABEL: Record<string, string> = { n: "名", v: "动", a: "形", r: "副", p: "介", c: "连" };

type Mode = "match" | "spell";

const MODES: { id: Mode; href: string; label: string }[] = [
  { id: "match", href: "#/game", label: "配对" },
  { id: "spell", href: "#/game/spell", label: "拼写" },
];

function shuffle<T>(items: T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

function rerender(ctx: Ctx, mode: Mode): void {
  const app = document.getElementById("app");
  if (app) app.replaceChildren(renderGame(ctx, mode));
}

function modeTabs(mode: Mode): HTMLElement {
  return h(
    "div",
    { class: "game-modes", attrs: { role: "tablist", "aria-label": "小游戏模式" } },
    ...MODES.map((item) =>
      h("a", {
        class: item.id === mode ? "chip" : "chip quiet",
        text: item.label,
        attrs: {
          href: item.href,
          role: "tab",
          "aria-selected": String(item.id === mode),
        },
      }),
    ),
  );
}

function fmtTime(ms: number): string {
  const s = ms / 1000;
  return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}:${(s % 60).toFixed(0).padStart(2, "0")}`;
}

/** 最佳成绩只影响展示，存 localStorage 单独一个键（进不了备份，也就不进 schema）。 */
const BEST_KEY = "cet6.game.best";

function readBest(): Record<string, number> {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

/** 返回是否刷新了纪录。 */
function writeBest(mode: Mode, value: number): boolean {
  const best = readBest();
  const prev = best[mode];
  if (typeof prev === "number" && prev <= value) return false;
  best[mode] = value;
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(best));
  } catch {
    return false;
  }
  return true;
}

function emptyRound(ctx: Ctx, mode: Mode): HTMLElement {
  return shell({
    title: "小游戏",
    eyebrow: mode === "spell" ? "SPELL" : "MATCH",
    tab: "game",
    due: dueCount(ctx),
    body: h(
      "div",
      { class: "page game-page" },
      modeTabs(mode),
      h(
        "section",
        { class: "card" },
        h("h2", { text: "这会儿没有可练的词。" }),
        h("p", { class: "muted", text: "能放进剧情的词在剧情里学，其余词在这里练；到期词归复习页，练完再回来。" }),
      ),
    ),
  });
}

function roundWords(ctx: Ctx): Word[] {
  return nextRound(ctx.words, ctx.state.words, ROUND, {
    exclude: ctx.state.chat.msgs.map((m) => m.w),
    priority: ctx.state.gameQueue,
    now: Date.now(),
  });
}

export function renderGame(ctx: Ctx, param?: string): HTMLElement {
  const mode: Mode = param === "spell" ? "spell" : "match";
  const round = roundWords(ctx);
  if (round.length === 0) return emptyRound(ctx, mode);
  return mode === "spell" ? spellGame(ctx, round) : matchGame(ctx, round);
}

function record(ctx: Ctx, word: Word, correct: boolean): void {
  const now = Date.now();
  const prev = ctx.state.words[word.w] ?? { box: 0, due: now, seen: 0, wrong: 0 };
  ctx.state.words[word.w] = answerBox(prev, correct, now);
  // 练过就不再需要优先出题
  const queued = ctx.state.gameQueue.indexOf(word.w);
  if (queued >= 0) ctx.state.gameQueue.splice(queued, 1);
  ctx.save();
}

function finishRow(mode: Mode, onNext: () => void): HTMLElement {
  return h(
    "div",
    { class: "match-foot" },
    h(
      "div",
      { class: "row" },
      h("button", {
        class: "chip",
        text: "下一轮",
        attrs: { type: "button" },
        on: { click: onNext },
      }),
      h("a", { class: "chip quiet", text: "看复习", attrs: { href: "#/review" } }),
      h("a", {
        class: "chip quiet",
        text: mode === "spell" ? "去配对" : "去拼写",
        attrs: { href: mode === "spell" ? "#/game" : "#/game/spell" },
      }),
    ),
  );
}

function matchGame(ctx: Ctx, round: Word[]): HTMLElement {
  const enCol = h("div", { class: "match-col", attrs: { "aria-label": "英文" } });
  const zhCol = h("div", { class: "match-col", attrs: { "aria-label": "中文" } });
  const status = h("div", { class: "match-status", attrs: { "aria-live": "polite" } });
  const footer = h("div", { class: "match-foot" });
  const total = round.length;
  let active: { word: Word; el: HTMLButtonElement } | null = null;
  let matched = 0;
  let misses = 0;
  let streak = 0;
  let bestStreak = 0;
  let startedAt = 0;
  let timer = 0;

  const elapsed = (): number => (startedAt ? Date.now() - startedAt : 0);

  const updateStatus = (): void => {
    const bits = [`本轮 ${matched}/${total}`];
    if (startedAt) bits.push(fmtTime(elapsed()));
    if (streak > 1) bits.push(`连击 ${streak}`);
    if (misses > 0) bits.push(`失误 ${misses}`);
    status.textContent = bits.join(" · ");
  };

  const startClock = (): void => {
    if (startedAt) return;
    startedAt = Date.now();
    timer = window.setInterval(() => {
      if (!status.isConnected) {
        window.clearInterval(timer);
        return;
      }
      if (matched < total) updateStatus();
    }, 200);
  };

  const finish = (): void => {
    window.clearInterval(timer);
    const ms = elapsed();
    const perfect = misses === 0;
    const best = writeBest("match", ms);
    const prevBest = readBest().match;
    footer.append(
      h("div", {
        class: perfect ? "match-result good" : "match-result",
        text: `${perfect ? "全对" : `配对完成，失误 ${misses} 次`} · 用时 ${fmtTime(ms)} · 最长连击 ${bestStreak}`,
      }),
      h(
        "div",
        { class: "match-tip" },
        best
          ? "新的最佳用时，记在设备上了。"
          : `最佳 ${typeof prevBest === "number" ? fmtTime(prevBest) : "—"}。这些词已经安排复习了。`,
      ),
    );
    footer.append(
      h(
        "div",
        { class: "row" },
        h("button", {
          class: "chip",
          text: "下一轮",
          attrs: { type: "button" },
          on: { click: () => rerender(ctx, "match") },
        }),
        h("a", { class: "chip quiet", text: "看复习", attrs: { href: "#/review" } }),
        h("a", { class: "chip quiet", text: "去拼写", attrs: { href: "#/game/spell" } }),
      ),
    );
  };

  const makeCard = (label: string, kind: "en" | "zh", onTap: () => void): HTMLButtonElement => {
    const card = h("button", {
      class: `match-card ${kind}`,
      text: label,
      attrs: { type: "button" },
    });
    card.addEventListener("click", onTap);
    return card;
  };

  for (const word of shuffle(round)) {
    const card = makeCard(word.w, "en", () => {
      if (card.disabled || active) return;
      startClock();
      card.classList.add("selected");
      active = { word, el: card };
      updateStatus();
    });
    enCol.append(card);
  }

  for (const word of shuffle(round)) {
    const card = makeCard(word.zh, "zh", () => {
      if (card.disabled) return;
      const picked = active;
      if (!picked) return;
      startClock();
      active = null;
      if (picked.word.w === word.w) {
        picked.el.classList.remove("selected");
        picked.el.classList.add("matched");
        card.classList.add("matched");
        picked.el.disabled = true;
        card.disabled = true;
        record(ctx, word, true);
        matched += 1;
        streak += 1;
        bestStreak = Math.max(bestStreak, streak);
        updateStatus();
        if (matched === total) finish();
      } else {
        misses += 1;
        streak = 0;
        picked.el.classList.add("wrong");
        card.classList.add("wrong");
        const en = picked.el;
        window.setTimeout(() => {
          en.classList.remove("wrong", "selected");
          card.classList.remove("wrong");
        }, 420);
        updateStatus();
      }
    });
    zhCol.append(card);
  }

  updateStatus();

  const body = h(
    "div",
    { class: "page game-page" },
    modeTabs("match"),
    h(
      "div",
      { class: "game-head" },
      h("div", { class: "kicker", text: "MATCH" }),
      h("h2", { text: "配对。点英文，再点它的中文。" }),
      h("p", { class: "muted", text: "第一次点牌开始计时；连击越长，这一轮越像在赶末班车。" }),
    ),
    status,
    h("div", { class: "match-grid" }, enCol, zhCol),
    footer,
  );

  return shell({ title: "小游戏", eyebrow: "MATCH", body, tab: "game", due: dueCount(ctx) });
}

function spellGame(ctx: Ctx, round: Word[]): HTMLElement {
  const total = round.length;
  const head = h("div", { class: "spell-prompt" });
  const status = h("div", { class: "match-status", attrs: { "aria-live": "polite" } });
  const feedback = h("div", { class: "spell-feedback", attrs: { "aria-live": "polite" } });
  const footer = h("div", { class: "match-foot" });

  const input = h("input", {
    class: "spell-input",
    attrs: {
      type: "text",
      inputmode: "latin",
      autocapitalize: "off",
      autocomplete: "off",
      autocorrect: "off",
      spellcheck: "false",
      enterkeyhint: "done",
      placeholder: "拼出这个词",
      "aria-label": "拼写答案",
    },
  });

  const submit = h("button", {
    class: "chip spell-submit",
    text: "提交",
    attrs: { type: "button" },
  });

  let index = 0;
  let right = 0;
  let streak = 0;
  let bestStreak = 0;
  let attempts = 0;
  let locked = false;
  const startedAt = Date.now();

  const updateStatus = (): void => {
    const bits = [`本轮 ${index}/${total}`, `答对 ${right}`];
    if (streak > 1) bits.push(`连击 ${streak}`);
    status.textContent = bits.join(" · ");
  };

  const finish = (): void => {
    const ms = Date.now() - startedAt;
    const perfect = right === total;
    const best = writeBest("spell", ms);
    footer.append(
      h("div", {
        class: perfect || right * 2 >= total ? "match-result good" : "match-result",
        text: `拼对 ${right}/${total} · 最长连击 ${bestStreak} · 用时 ${fmtTime(ms)}`,
      }),
      h("div", {
        class: "match-tip",
        text: best ? "拼写速度也是新纪录。" : "拼错的词已经回到复习队列。",
      }),
      finishRow("spell", () => rerender(ctx, "spell")),
    );
    head.replaceChildren(h("p", { class: "spell-done", text: "这一轮拼完了。" }));
    input.remove();
    submit.remove();
  };

  const renderWord = (): void => {
    const word = round[index];
    if (!word) {
      finish();
      return;
    }
    const hint = spellHint(word.w);
    locked = false;
    attempts = 0;
    input.value = "";
    input.disabled = false;
    submit.disabled = false;
    feedback.textContent = "";
    feedback.className = "spell-feedback";
    head.replaceChildren(
      h(
        "div",
        { class: "spell-meaning" },
        word.pos ? h("span", { class: "word-pos", text: POS_LABEL[word.pos] ?? word.pos }) : null,
        h("span", { class: "spell-zh", text: word.zh }),
      ),
      h("div", { class: "spell-hint", text: `首字母 ${hint.letter} · 还有 ${hint.rest} 个字母` }),
    );
    if (word.ph) head.append(h("div", { class: "spell-ph", text: `/${word.ph}/` }));
    updateStatus();
    input.focus();
  };

  const advance = (): void => {
    index += 1;
    if (index >= total) finish();
    else renderWord();
  };

  const check = (): void => {
    const word = round[index];
    if (!word || locked) return;
    const guess = input.value;
    if (!guess.trim()) {
      input.focus();
      return;
    }
    attempts += 1;
    if (spellOk(guess, word.w)) {
      locked = true;
      record(ctx, word, true);
      right += 1;
      streak += 1;
      bestStreak = Math.max(bestStreak, streak);
      feedback.className = "spell-feedback good";
      feedback.textContent = attempts === 1 ? "对。" : `对，是 ${word.w}。`;
      input.disabled = true;
      submit.disabled = true;
      window.setTimeout(advance, 520);
      return;
    }
    streak = 0;
    if (attempts === 1) {
      feedback.className = "spell-feedback";
      const hint = spellHint(word.w);
      feedback.textContent = `再看一眼：${hint.letter}${"·".repeat(Math.min(hint.rest, 12))}（${word.w.length} 个字母）`;
      input.classList.add("wrong");
      window.setTimeout(() => input.classList.remove("wrong"), 380);
      input.select();
      return;
    }
    locked = true;
    record(ctx, word, false);
    feedback.className = "spell-feedback bad";
    feedback.textContent = `这个词是 ${word.w}。`;
    input.disabled = true;
    submit.disabled = true;
    window.setTimeout(advance, 1100);
  };

  submit.addEventListener("click", check);
  input.addEventListener("keydown", (event) => {
    if ((event as KeyboardEvent).key === "Enter") {
      event.preventDefault();
      check();
    }
  });

  const body = h(
    "div",
    { class: "page game-page" },
    modeTabs("spell"),
    h(
      "div",
      { class: "game-head" },
      h("div", { class: "kicker", text: "SPELL" }),
      h("h2", { text: "看中文，拼回英文。" }),
      h("p", { class: "muted", text: "一次机会先自己试；第二次还错就揭答案，这个词会回到复习。" }),
    ),
    status,
    h("div", { class: "card spell-card" }, head, h("div", { class: "spell-row" }, input, submit), feedback),
    footer,
  );

  renderWord();
  return shell({ title: "小游戏", eyebrow: "SPELL", body, tab: "game", due: dueCount(ctx) });
}
