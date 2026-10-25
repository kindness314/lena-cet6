import { h } from "../core/dom";
import type { Ctx } from "../app";
import {
  answerReview,
  dueCount,
  formatDue,
  nextDueAt,
  pendingChatWords,
  REVIEW_BATCH,
  reviewQueue,
} from "../core/review";
import { describeProgress, progressStats } from "../core/progress";
import { feedbackText } from "../core/session";
import type { Msg } from "../core/types";
import { highlight } from "./parts";
import { shell } from "./shell";

function reviewCard(ctx: Ctx, msg: Msg): HTMLElement {
  const children: (Node | string)[] = [
    h(
      "div",
      { class: "word-line" },
      h("div", { class: "word", text: msg.w }),
      msg.ph ? h("span", { class: "word-ph", text: `/${msg.ph}/` }) : null,
    ),
  ];
  if (msg.en) children.push(h("div", { class: "en" }, ...highlight(ctx, msg.en, msg.w)));
  children.push(h("div", { class: "ask", text: "它是什么意思？" }));
  children.push(h("div", { class: "review-progress muted", text: describeProgress(ctx.state.words[msg.w]) }));
  return h("section", { class: "card review-card" }, ...children);
}

export function renderReview(ctx: Ctx): HTMLElement {
  const now = Date.now();
  const queue = reviewQueue(ctx, now);
  const totalDue = dueCount(ctx, now);
  const stats = progressStats(ctx.words, ctx.state.words, now);
  const body = h("div", { class: "page review-page" });

  if (queue.length === 0) {
    const seen = stats.touched;
    const next = nextDueAt(ctx.words, ctx.state.words, now);
    body.append(
      h(
        "section",
        { class: "card stack" },
        h("div", { class: "kicker", text: "SPACED REVIEW" }),
        h("h2", { text: seen === 0 ? "还没有复习记录。" : "现在没有到期的词。" }),
        h(
          "p",
          {
            class: "muted",
            text:
              seen === 0
                ? "先去聊天或小说里认识几个词，之后它们会按间隔回来。"
                : next
                  ? `下一个到期：${formatDue(next, now)}。`
                  : "所有词都还在间隔里，过一阵再来。",
          },
        ),
        h("div", { class: "row" }, h("a", { class: "chip", text: "去聊天", attrs: { href: "#/chat" } }), h("a", { class: "chip quiet", text: "去小说", attrs: { href: "#/read" } })),
      ),
    );
    return shell({ title: "复习", eyebrow: "SPACED REVIEW", body, tab: "review", due: 0 });
  }

  const counter = h("span", { class: "review-count", text: `1 / ${queue.length}` });
  const fill = h("div", { class: "meter-fill", attrs: { style: "width:0%" } });
  const head = h(
    "div",
    { class: "review-head" },
    h("div", { class: "kicker", text: "DUE TODAY" }),
    h("h2", { text: `${totalDue} 个词到期，这一轮连刷 ${queue.length} 个。` }),
    h(
      "p",
      {
        class: "muted",
        text: totalDue > queue.length ? `还有 ${totalDue - queue.length} 个放下一批，答完自动出下一题。` : "答完自动出下一题，答错明天再来。",
      },
    ),
    h(
      "div",
      { class: "review-track" },
      counter,
      h("div", { class: "meter review-meter" }, fill),
    ),
  );

  const slot = h("div", { class: "review-slot" });
  let pos = 0;
  let right = 0;
  const started = Date.now();

  // 角标跟着作答实时更新，不用等下次进页面
  const refreshBadge = () => {
    const left = dueCount(ctx);
    const link = document.querySelector<HTMLAnchorElement>('.tabbar a[href="#/review"]');
    link?.setAttribute("aria-label", left > 0 ? `复习（${left} 个到期）` : "复习");
    document.querySelectorAll<HTMLElement>(".tab-badge").forEach((el) => {
      if (left > 0) el.textContent = left > 99 ? "99+" : String(left);
      else el.remove();
    });
  };

  const paint = (done: number) => {
    counter.textContent = `${Math.min(done + 1, queue.length)} / ${queue.length}`;
    fill.style.width = `${Math.round((done / queue.length) * 100)}%`;
    refreshBadge();
  };

  const drawSummary = () => {
    const left = dueCount(ctx);
    const secs = Math.max(1, Math.round((Date.now() - started) / 1000));
    const rate = Math.round((right / Math.max(1, queue.length)) * 100);
    fill.style.width = "100%";
    counter.textContent = `${queue.length} / ${queue.length}`;
    refreshBadge();
    slot.replaceChildren(
      h(
        "section",
        { class: "card stack review-summary" },
        h("div", { class: "kicker", text: "ROUND DONE" }),
        h("h2", { text: `这一轮 ${queue.length} 个词刷完了。` }),
        h("p", { class: "muted", text: `答对 ${right} / 答错 ${queue.length - right} · 正确率 ${rate}% · 用时 ${secs} 秒` }),
        left > 0
          ? h("p", { class: "muted", text: `还有 ${left} 个词到期，随时可以再来一批。` })
          : h("p", { class: "muted", text: "今天的到期词都过了一遍，之后按间隔回来。" }),
        h(
          "div",
          { class: "row" },
          h("button", {
            class: "chip",
            text: left > 0 ? `再刷一批 · ${Math.min(left, REVIEW_BATCH)} 个` : "再刷一批",
            attrs: { type: "button" },
            on: { click: () => rerender(ctx) },
          }),
          h("a", { class: "chip quiet", text: "回聊天", attrs: { href: "#/chat" } }),
        ),
      ),
    );
  };

  const drawOne = () => {
    const msg = queue[pos];
    const inChat = pendingChatWords(ctx).has(msg.w);
    const opts = h("div", { class: "opts" });
    const feedback = h("div", { class: "review-feedback" });
    let answered = false;

    const choose = (pick: number) => {
      if (answered) return;
      answered = true;
      const result = answerReview(ctx, msg, pick, Date.now());
      msg.picked = pick;
      if (result.correct) right += 1;
      opts.querySelectorAll<HTMLButtonElement>("button").forEach((button, index) => {
        button.disabled = true;
        button.classList.toggle("correct", index === msg.correct);
        button.classList.toggle("picked", index === pick);
      });
      feedback.append(
        h("div", { class: result.correct ? "review-result good" : "review-result bad", text: feedbackText(msg) }),
        h("div", { class: "muted", text: `下次复习：${formatDue(result.state.due)}` }),
      );
      paint(pos + 1);
      window.setTimeout(() => {
        if (!slot.isConnected) return;
        pos += 1;
        if (pos < queue.length) drawOne();
        else drawSummary();
      }, 1200);
    };

    msg.opts.forEach((text, i) => {
      opts.append(
        h(
          "button",
          {
            class: "choice",
            attrs: { type: "button" },
            on: { click: () => choose(i) },
          },
          h("span", { class: "num", text: "ABCD"[i] ?? String(i + 1), attrs: { "aria-hidden": "true" } }),
          h("span", { class: "choice-text", text }),
        ),
      );
    });

    slot.replaceChildren(
      reviewCard(ctx, msg),
      opts,
      feedback,
      h("p", { class: "muted review-hint", text: inChat ? "这个词也在今天的聊天里，答完会从聊天队列移除。" : " " }),
    );
  };

  paint(0);
  drawOne();
  body.append(head, slot);

  return shell({
    title: "复习",
    eyebrow: `REVIEW · ${totalDue} 个到期`,
    body,
    tab: "review",
    due: totalDue,
  });
}

function rerender(ctx: Ctx): void {
  const app = document.getElementById("app");
  if (app) app.replaceChildren(renderReview(ctx));
}
