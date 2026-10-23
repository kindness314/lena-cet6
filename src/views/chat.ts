import { h } from "../core/dom";
import type { Ctx } from "../app";
import { localDay } from "../core/random";
import { answerBox } from "../core/srs";
import { makeMsg } from "../core/messages";
import { shell } from "./shell";

function highlight(text: string, word: string): (Node | string)[] {
  const re = new RegExp(`\\b(${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\b`, "i");
  const m = re.exec(text);
  if (!m) return [text];
  return [text.slice(0, m.index), h("b", { text: m[1] }), text.slice(m.index + m[1].length)];
}

function bubble(ctx: Ctx, index: number, answered: boolean): HTMLElement {
  const msg = ctx.state.chat.msgs[index];
  const parts = msg.en ? highlight(msg.en, msg.w) : [msg.w];
  const children: (Node | string)[] = [h("div", { class: "en" }, ...parts)];
  if (answered) children.push(h("div", { class: "zh", text: msg.zh }));
  else children.push(h("div", { class: "zh", text: "选一个它的意思" }));
  return h("div", { class: "bub" + (answered ? " done" : "") }, ...children);
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
      h("div", { class: "card" },
        h("p", { text: "词表里的词都已经见过了。" }),
        h("p", { class: "muted", text: "去阅读里点几个词，把它们加进复习。" }),
        h("a", { class: "plain", text: "去阅读", attrs: { href: "#/read" } }),
      ),
    );
    return shell({ title: "Lena", avatar: "L", body: flow, tab: "chat", flush: true });
  }

  for (let i = 0; i < idx && i < msgs.length; i++) msgsWrap.append(bubble(ctx, i, true));
  if (idx < msgs.length) msgsWrap.append(bubble(ctx, idx, false));
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
              const now = Date.now();
              const correct = i === msg.correct;
              const prev = st.words[msg.w] ?? { box: 0, due: now, seen: 0, wrong: 0 };
              st.words[msg.w] = answerBox(prev, correct, now);
              if (!correct) {
                const clone = { ...msg, id: `${msg.id}:${idx}:r` };
                const at = idx + 3;
                if (at < st.chat.msgs.length) st.chat.msgs.splice(at, 0, clone);
                else st.chat.msgs.push(clone);
              }
              st.chat.idx++;
              if (st.chat.idx >= st.chat.msgs.length) st.tasks[day] = true;
              ctx.save();
              renderChatInto(ctx);
            },
          },
        }),
      );
    });
  } else {
    opts.append(
      h("div", { class: "muted", attrs: { style: "text-align:center;padding:8px 0" }, text: "今天的消息回完了。" }),
    );
    opts.append(
      h("button", {
        text: "再来 5 条",
        on: {
          click: () => {
            const seen = new Set(msgs.map((m) => m.w));
            const candidates = ctx.words
              .filter((w) => !st.words[w.w] && !seen.has(w.w))
              .slice(0, 5);
            if (candidates.length === 0) {
              opts.replaceChildren(h("div", { class: "muted", text: "词表已经走完一遍了，去阅读吧。" }));
              return;
            }
            for (const w of candidates) {
              st.chat.msgs.push(makeMsg(w, ctx.words, ctx.sentences, `${day}:more:${w.w}`));
            }
            ctx.save();
            renderChatInto(ctx);
          },
        },
      }),
    );
    opts.append(
      h("a", { class: "chip", text: "去阅读", attrs: { href: "#/read" } }),
    );
  }

  const body = h("div", { class: "chat-body" }, flow, opts);
  requestAnimationFrame(() => {
    const el = document.querySelector(".flow");
    if (el) el.scrollTop = el.scrollHeight;
  });

  return shell({
    title: `Lena · ${msgs.length - idx} 条未回`,
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
