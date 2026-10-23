import { h } from "../core/dom";
import type { Ctx } from "../app";
import { localDay } from "../core/random";
import type { Msg } from "../core/types";
import { addMore, answerCurrent, feedbackText } from "../core/session";
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
  const children: (Node | string)[] = [];
  if (msg.en) children.push(h("div", { class: "word", text: msg.w }));
  children.push(h("div", { class: "en" }, ...parts));
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
    return shell({ title: "Lena", avatar: "L", body: flow, tab: "chat", flush: true });
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
        h("button", {
          text,
          on: {
            click: () => {
              if (!answerCurrent(ctx, i)) return;
              renderChatInto(ctx);
            },
          },
        }),
      );
    });
  } else {
    opts.append(h("div", { class: "muted end-note", text: "今天的消息回完了。" }));
    opts.append(
      h("button", {
        text: "再来 5 条",
        on: {
          click: () => {
            if (addMore(ctx) === 0) {
              opts.replaceChildren(
                h("div", { class: "muted end-note", text: "词表走完了，去小说里点几个词。" }),
                h("a", { class: "chip", text: "去小说", attrs: { href: "#/read" } }),
              );
              return;
            }
            renderChatInto(ctx);
          },
        },
      }),
    );
    opts.append(h("a", { class: "chip", text: "去小说", attrs: { href: "#/read" } }));
  }

  const body = h("div", { class: "chat-body" }, flow, opts);
  requestAnimationFrame(() => {
    const el = document.querySelector(".flow");
    if (el) el.scrollTop = el.scrollHeight;
  });

  return shell({
    title: `Lena · ${Math.max(msgs.length - idx, 0)} 条未回`,
    avatar: "L",
    action: h("a", {
      class: "chip",
      text: "设置",
      attrs: { href: "#/settings" },
    }),
    body,
    tab: "chat",
    flush: true,
  });
}

function renderChatInto(ctx: Ctx): void {
  const app = document.getElementById("app");
  if (!app) return;
  app.replaceChildren(renderChat(ctx));
  const flow = document.querySelector(".flow");
  if (flow) requestAnimationFrame(() => (flow.scrollTop = flow.scrollHeight));
}
