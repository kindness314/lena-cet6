import { h } from "../core/dom";
import type { Ctx } from "../app";
import { addMore, answerCurrent, feedbackText } from "../core/session";
import { localDay } from "../core/random";
import type { Msg } from "../core/types";
import { highlight } from "./parts";
import { shell } from "./shell";

function portrait(): HTMLElement {
  return h(
    "div",
    { class: "vn-portrait" },
    h("div", { class: "vn-orb" }, h("div", { class: "vn-bust" })),
    h("div", { class: "vn-status" }, h("span", { class: "dot" }), "Lena · 在线"),
  );
}

function frame(body: (Node | string)[], choices?: HTMLElement, prefix?: HTMLElement | null): HTMLElement {
  const scene = h(
    "div",
    { class: "vn-scene" },
    portrait(),
    h("div", { class: "vn-dialogue" }, prefix ?? null, h("div", { class: "vn-name", text: "Lena" }), ...body),
  );
  return h("div", { class: "vn-body" }, scene, choices ?? null);
}

function question(ctx: Ctx, msg: Msg): HTMLElement {
  const body: (Node | string)[] = [h("div", { class: "vn-word", text: msg.w })];
  if (msg.en) body.push(h("p", { class: "vn-sentence" }, ...highlight(ctx, msg.en, msg.w)));
  body.push(h("div", { class: "vn-ask", text: "这个词，是什么意思？" }));

  const choices = h("div", { class: "vn-choices" });
  msg.opts.forEach((text, i) => {
    choices.append(
      h(
        "button",
        {
          class: "vn-choice",
          on: {
            click: () => {
              if (!answerCurrent(ctx, i)) return;
              rerender(ctx);
            },
          },
        },
        h("span", { class: "num", text: String(i + 1) }),
        text,
      ),
    );
  });
  return frame(body, choices);
}

function result(ctx: Ctx, msg: Msg): HTMLElement {
  const body: (Node | string)[] = [];
  const said =
    msg.picked === undefined
      ? null
      : h("div", { class: "vn-you", text: `你：${msg.opts[msg.picked] ?? ""}` });
  body.push(h("div", { class: "vn-word", text: msg.w }));
  if (msg.en) body.push(h("p", { class: "vn-sentence" }, ...highlight(ctx, msg.en, msg.w)));
  body.push(h("p", { class: "vn-reply", text: feedbackText(msg) }));

  const next = h("button", {
    class: "vn-continue",
    text: "继续",
    on: {
      click: () => {
        ctx.state.storySeen = ctx.state.chat.idx;
        ctx.save();
        rerender(ctx);
      },
    },
  });
  return frame(body, h("div", { class: "vn-choices" }, next), said);
}

function ending(ctx: Ctx): HTMLElement {
  const st = ctx.state;
  const notes = h("div", { class: "vn-choices" });
  notes.append(h("div", { class: "muted end-note", text: "今天的剧情到这儿。" }));
  notes.append(
    h("button", {
      class: "vn-continue",
      text: "再来 5 条",
      on: {
        click: () => {
          if (addMore(ctx) === 0) {
            notes.replaceChildren(
              h("div", { class: "muted end-note", text: "词表走完了，去小说里点几个词。" }),
              h("a", { class: "chip", text: "去小说", attrs: { href: "#/read" } }),
            );
            return;
          }
          st.storySeen = st.chat.idx;
          ctx.save();
          rerender(ctx);
        },
      },
    }),
  );
  notes.append(h("a", { class: "chip", text: "去聊天", attrs: { href: "#/chat" } }));

  return frame(
    [h("p", { class: "vn-sentence", text: "今天先到这儿。" }), h("div", { class: "vn-ask", text: "明天再聊。" })],
    notes,
  );
}

export function renderStory(ctx: Ctx): HTMLElement {
  const st = ctx.state;
  const day = localDay(Date.now());
  if (st.chat.day !== day) ctx.regen(day);
  const idx = st.chat.idx;
  const seen = Math.max(0, Math.min(st.storySeen, idx));
  let body: HTMLElement;
  if (idx > seen && idx > 0) {
    body = result(ctx, st.chat.msgs[idx - 1]);
  } else if (idx < st.chat.msgs.length) {
    body = question(ctx, st.chat.msgs[idx]);
  } else {
    body = ending(ctx);
  }

  return shell({
    title: "Lena · 剧情",
    avatar: "L",
    action: h("a", { class: "chip", text: "聊天", attrs: { href: "#/chat" } }),
    body,
    tab: "story",
    flush: true,
  });
}

function rerender(ctx: Ctx): void {
  const app = document.getElementById("app");
  if (!app) return;
  app.replaceChildren(renderStory(ctx));
  window.scrollTo(0, 0);
}
