import { h } from "../core/dom";
import type { Ctx } from "../app";
import { localDay } from "../core/random";
import type { Msg } from "../core/types";
import { dueCount } from "../core/review";
import { addMore, answerCurrent, answerTapAllowed, feedbackText } from "../core/session";
import { highlight, miniAvatar } from "./parts";
import { shell } from "./shell";

function lenaRow(...children: (Node | string)[]): HTMLElement {
  return h("div", { class: "mrow lena" }, miniAvatar(), h("div", { class: "bub" }, ...children));
}

function meRow(text: string): HTMLElement {
  return h("div", { class: "mrow me" }, h("div", { class: "bub me", text }));
}

function noteRow(text: string): HTMLElement {
  return h("div", { class: "mrow lena" }, miniAvatar(), h("div", { class: "bub note", text }));
}

function card(ctx: Ctx, msg: Msg, answered: boolean): (Node | string)[] {
  const parts = msg.en ? highlight(ctx, msg.en, msg.w) : [msg.w];
  const children: (Node | string)[] = [
    h(
      "div",
      { class: "word-line" },
      h("div", { class: "word", text: msg.w }),
      msg.ph ? h("span", { class: "word-ph", text: `/${msg.ph}/` }) : null,
    ),
  ];
  if (msg.en) children.push(h("div", { class: "en" }, ...parts));
  if (answered && msg.picked === undefined) {
    children.push(h("div", { class: "zh", text: msg.zh }));
  } else if (!answered) {
    children.push(h("div", { class: "ask", text: "它是什么意思？" }));
  }
  return children;
}

function history(ctx: Ctx, msg: Msg): HTMLElement[] {
  const rows: HTMLElement[] = [lenaRow(...card(ctx, msg, true))];
  if (msg.picked !== undefined) {
    rows.push(meRow(msg.opts[msg.picked] ?? ""));
    rows.push(noteRow(feedbackText(msg)));
  }
  return rows;
}

export function renderChat(ctx: Ctx): HTMLElement {
  const st = ctx.state;
  const day = localDay(Date.now());
  if (st.chat.day !== day) ctx.regen(day);

  const msgs = st.chat.msgs;
  const idx = st.chat.idx;
  const flow = h("div", { class: "flow" });

  const msgsWrap = h("div", { class: "msgs" });
  if (msgs.length === 0) {
    flow.append(
      h(
        "div",
        { class: "card" },
        h("p", { text: "词表里的词都已经见过了。" }),
        h("p", { class: "muted", text: "去小说里点几个词，把它们加进聊天。" }),
        h("a", { class: "plain", text: "去小说", attrs: { href: "#/read" } }),
      ),
    );
    return shell({ title: "Lena", avatar: "L", body: flow, tab: "chat", flush: true, due: dueCount(ctx) });
  }

  for (let i = 0; i < idx && i < msgs.length; i++) {
    for (const row of history(ctx, msgs[i])) msgsWrap.append(row);
  }
  if (idx < msgs.length) msgsWrap.append(lenaRow(...card(ctx, msgs[idx], false)));
  flow.append(msgsWrap);

  const opts = h("div", { class: "opts" });
  if (idx < msgs.length) {
    const msg = msgs[idx];
    msg.opts.forEach((text, i) => {
      opts.append(
        h(
          "button",
          {
            class: "choice",
            attrs: { type: "button" },
            on: {
              click: () => {
                if (!answerTapAllowed()) return;
                if (!answerCurrent(ctx, i, msg.id)) return;
                renderChatInto(ctx);
              },
            },
          },
          h("span", { class: "num", text: "ABCD"[i] ?? String(i + 1), attrs: { "aria-hidden": "true" } }),
          h("span", { class: "choice-text", text }),
        ),
      );
    });
  } else {
    opts.append(h("div", { class: "muted end-note", text: "今天的消息回完了。" }));
    opts.append(
      h("button", {
        text: "再来 5 条",
        on: {
          click: () => {
            // 连点保护：加完立刻重渲染，第二下会落到新题的选项上，替人答掉一道
            if (!answerTapAllowed()) return;
            if (addMore(ctx) === 0) {
              opts.replaceChildren(
                h("div", { class: "muted end-note", text: "这一幕的词用完了，剩下的词去小游戏里练。" }),
                h("a", { class: "chip", text: "去小游戏", attrs: { href: "#/game" } }),
              );
              return;
            }
            renderChatInto(ctx);
          },
        },
      }),
    );
    opts.append(h("a", { class: "chip", text: "去小说", attrs: { href: "#/read" } }));
    const due = dueCount(ctx);
    if (due > 0) {
      opts.append(
        h("a", {
          class: "chip review-link",
          text: `去复习 · ${due} 个到期`,
          attrs: { href: "#/review" },
        }),
      );
    }
  }

  const body = h("div", { class: "chat-body" }, flow, opts);
  requestAnimationFrame(() => {
    const el = document.querySelector(".flow");
    if (el) el.scrollTop = el.scrollHeight;
  });

  return shell({
    title: "Lena",
    eyebrow: msgs.length - idx > 0 ? `TODAY · ${msgs.length - idx} 条未回` : "TODAY · 已回完",
    avatar: "L",
    action: h("a", {
      class: "chip quiet",
      text: "设置",
      attrs: { href: "#/settings" },
    }),
    body,
    tab: "chat",
    flush: true,
    due: dueCount(ctx),
  });
}

function renderChatInto(ctx: Ctx): void {
  const app = document.getElementById("app");
  if (!app) return;
  app.replaceChildren(renderChat(ctx));
  const flow = document.querySelector(".flow");
  if (flow) requestAnimationFrame(() => (flow.scrollTop = flow.scrollHeight));
}
