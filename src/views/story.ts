import { h } from "../core/dom";
import type { Ctx } from "../app";
import { addMore, answerCurrent, answerTapAllowed, feedbackText } from "../core/session";
import { localDay } from "../core/random";
import type { Msg } from "../core/types";
import {
  ARCS,
  SCENES,
  arcById,
  sceneEnding,
  sceneFeedback,
  sceneForState,
  sceneQuestion,
  type Scene,
} from "../core/scenes";
import { lenaPortrait, type Mood } from "./art";
import { sceneArt } from "./scene-art";
import { highlight } from "./parts";
import { dueCount } from "../core/review";
import { shell } from "./shell";

function sceneHeader(scene: Scene): HTMLElement {
  const arc = arcById(scene.arc);
  return h(
    "div",
    { class: "vn-art-wrap" },
    sceneArt(scene),
    h(
      "div",
      { class: "vn-caption" },
      h("div", { class: "vn-arc", text: arc.name }),
      h("div", { class: "vn-title", text: scene.title }),
      h("div", { class: "vn-meta", text: `${scene.place} · ${scene.time} · ${scene.weather}` }),
    ),
  );
}

function dialog(
  scene: Scene,
  mood: Mood,
  body: (Node | string)[],
  prefix?: HTMLElement | null,
): HTMLElement {
  return h(
    "div",
    { class: "vn-stage" },
    lenaPortrait(mood, scene),
    h(
      "div",
      { class: "vn-dialogue" },
      prefix ?? null,
      h("div", { class: "vn-name", text: "Lena" }),
      ...body,
    ),
  );
}

function frame(
  scene: Scene,
  mood: Mood,
  body: (Node | string)[],
  choices?: HTMLElement,
  prefix?: HTMLElement | null,
): HTMLElement {
  return h(
    "div",
    { class: "vn-body" },
    sceneHeader(scene),
    dialog(scene, mood, body, prefix),
    choices ?? null,
  );
}

function question(ctx: Ctx, msg: Msg, scene: Scene): HTMLElement {
  const idx = ctx.state.chat.idx;
  const { narr, prompt } = sceneQuestion(scene, idx, msg.w);
  const body: (Node | string)[] = [
    h("p", { class: "vn-atmos", text: narr }),
    h("p", { class: "vn-narration", text: prompt }),
    h(
      "div",
      { class: "vn-word-line" },
      h("div", { class: "vn-word", text: msg.w }),
      msg.ph ? h("div", { class: "vn-ph", text: `/${msg.ph}/` }) : null,
    ),
  ];
  if (msg.en) body.push(h("p", { class: "vn-sentence" }, ...highlight(ctx, msg.en, msg.w)));
  body.push(h("div", { class: "vn-ask", text: "这个词，是什么意思？" }));

  const choices = h("div", { class: "vn-choices" });
  msg.opts.forEach((text, i) => {
    choices.append(
      h(
        "button",
        {
          class: "vn-choice",
          attrs: { type: "button" },
          on: {
            click: () => {
              if (!answerTapAllowed()) return;
              if (!answerCurrent(ctx, i, msg.id)) return;
              rerender(ctx);
            },
          },
        },
        h("span", { class: "num", text: "ABCD"[i] ?? String(i + 1), attrs: { "aria-hidden": "true" } }),
        text,
      ),
    );
  });
  return frame(scene, "curious", body, choices);
}

function result(ctx: Ctx, msg: Msg, scene: Scene): HTMLElement {
  const correct = msg.picked === msg.correct;
  const beatIndex = Math.max(0, ctx.state.chat.idx - 1);
  const body: (Node | string)[] = [];
  const said =
    msg.picked === undefined
      ? null
      : h("div", { class: "vn-you", text: `你：${msg.opts[msg.picked] ?? ""}` });
  body.push(
    h(
      "div",
      { class: "vn-word-line" },
      h("div", { class: "vn-word", text: msg.w }),
      msg.ph ? h("div", { class: "vn-ph", text: `/${msg.ph}/` }) : null,
    ),
  );
  if (msg.en) body.push(h("p", { class: "vn-sentence" }, ...highlight(ctx, msg.en, msg.w)));
  body.push(
    h("p", { class: "vn-reply", text: sceneFeedback(scene, beatIndex, msg.w, correct) }),
  );
  body.push(
    h(
      "p",
      { class: `vn-answer ${correct ? "is-good" : "is-soft"}` },
      h("span", { text: correct ? "答对了 · " : "再看一眼 · " }),
      feedbackText(msg),
    ),
  );

  const next = h("button", {
    class: "vn-continue",
    text: "继续",
    attrs: { type: "button" },
    on: {
      click: () => {
        ctx.state.storySeen = ctx.state.chat.idx;
        ctx.save();
        rerender(ctx);
      },
    },
  });
  return frame(
    scene,
    correct ? "happy" : "calm",
    body,
    h("div", { class: "vn-choices" }, next),
    said,
  );
}

function ending(ctx: Ctx, scene: Scene): HTMLElement {
  const st = ctx.state;
  const notes = h("div", { class: "vn-choices" });
  notes.append(h("div", { class: "muted end-note", text: "今天的剧情到这儿。" }));
  notes.append(
    h("button", {
      class: "vn-continue",
      text: "再来 5 条",
      attrs: { type: "button" },
      on: {
        click: () => {
          if (addMore(ctx) === 0) {
            notes.replaceChildren(
              h("div", { class: "muted end-note", text: "这一幕的词用完了，剩下的词去小游戏里练。" }),
              h("a", { class: "chip", text: "去小游戏", attrs: { href: "#/game" } }),
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
    scene,
    "calm",
    [
      h("p", { class: "vn-narration", text: dayEnding(ctx, scene) }),
      h("div", { class: "vn-ask", text: "明天再聊。" }),
    ],
    notes,
  );
}

function dayEnding(ctx: Ctx, scene: Scene): string {
  const answered = ctx.state.chat.msgs.filter((m) => m.picked !== undefined);
  const correctCount = answered.filter((m) => m.picked === m.correct).length;
  return sceneEnding(scene, answered.length, correctCount);
}

function closePicker(
  backdrop: HTMLElement,
  previous: HTMLElement | null,
  onKey: (event: KeyboardEvent) => void,
  restoreFocus = true,
): void {
  backdrop.remove();
  document.body.style.overflow = "";
  document.removeEventListener("keydown", onKey);
  if (restoreFocus && previous?.isConnected) previous.focus();
}

function closePickerAndRerender(
  ctx: Ctx,
  backdrop: HTMLElement,
  onKey: (event: KeyboardEvent) => void,
): void {
  closePicker(backdrop, null, onKey, false);
  rerender(ctx);
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>("[data-scene-picker]")?.focus();
  });
}

function openPicker(ctx: Ctx): void {
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const backdrop = h("div", { class: "picker-backdrop" });
  const close = h("button", {
    class: "picker-close",
    text: "关闭",
    attrs: { type: "button", "aria-label": "关闭场景选择" },
  });
  const title = h("h2", { text: "今晚去哪", attrs: { id: "picker-title" } });
  const dialog = h(
    "div",
    {
      class: "scene-picker",
      attrs: { role: "dialog", "aria-modal": "true", "aria-labelledby": "picker-title" },
    },
    h(
      "div",
      { class: "picker-head" },
      h("div", {}, h("div", { class: "kicker", text: "SCENE SELECT" }), title),
      close,
    ),
    h("p", { class: "picker-sub muted", text: "换一幕不会清空进度，也不会改变今天的词表。" }),
  );

  const auto = h(
    "button",
    {
      class: "picker-auto" + (ctx.state.storySceneId ? "" : " selected"),
      attrs: { type: "button", "aria-pressed": String(!ctx.state.storySceneId) },
      on: {
        click: () => {
          ctx.state.storySceneId = "";
          ctx.save();
          closePickerAndRerender(ctx, backdrop, onKey);
        },
      },
    },
    h("span", { class: "picker-dot" }),
    h("span", {}, h("strong", { text: "跟随每日轮换" }), h("small", { text: "明天会自动换到下一幕" })),
  );
  dialog.append(auto);

  for (const arc of ARCS) {
    const group = SCENES.filter((item) => item.arc === arc.id);
    dialog.append(
      h(
        "section",
        { class: "picker-arc", attrs: { "aria-label": arc.name } },
        h("div", { class: "picker-arc-head" }, h("span", { text: arc.name }), h("small", { text: arc.tagline })),
        h(
          "div",
          { class: "picker-grid" },
          ...group.map((item) => {
            const selected = ctx.state.storySceneId === item.id;
            const done = item.theme.filter((word) => {
              const st = ctx.state.words[word];
              return st !== undefined && (st.seen > 0 || st.wrong > 0);
            }).length;
            const pct = Math.round((done / item.theme.length) * 100);
            return h(
              "button",
              {
                class: "picker-scene" + (selected ? " selected" : ""),
                attrs: { type: "button", "aria-pressed": String(selected) },
                on: {
                  click: () => {
                    ctx.state.storySceneId = item.id;
                    ctx.save();
                    closePickerAndRerender(ctx, backdrop, onKey);
                  },
                },
              },
              sceneArt(item),
              h("span", { class: "picker-scene-title", text: item.title }),
              h("span", { class: "picker-scene-meta", text: item.time }),
              h(
                "span",
                { class: "picker-scene-prog", attrs: { "aria-label": `已学 ${done} / ${item.theme.length} 词` } },
                h(
                  "span",
                  { class: "picker-scene-track" },
                  h("span", { class: "picker-scene-fill", attrs: { style: `width:${pct}%` } }),
                ),
                h("span", { class: "picker-scene-count", text: `${done}/${item.theme.length}` }),
              ),
            );
          }),
        ),
      ),
    );
  }

  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closePicker(backdrop, previous, onKey);
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...dialog.querySelectorAll<HTMLElement>("button, [href], [tabindex]:not([tabindex='-1'])")];
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  close.addEventListener("click", () => closePicker(backdrop, previous, onKey));
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) closePicker(backdrop, previous, onKey);
  });
  document.addEventListener("keydown", onKey);
  backdrop.append(dialog);
  document.body.append(backdrop);
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => {
    (dialog.querySelector<HTMLElement>(".picker-scene.selected, .picker-auto.selected") ?? close).focus();
  });
}

export function renderStory(ctx: Ctx): HTMLElement {
  const st = ctx.state;
  const day = localDay(Date.now());
  if (st.chat.day !== day) ctx.regen(day);
  const scene = sceneForState(st, day);
  const idx = st.chat.idx;
  const seen = Math.max(0, Math.min(st.storySeen, idx));
  let body: HTMLElement;
  if (idx > seen && idx > 0) {
    body = result(ctx, st.chat.msgs[idx - 1], scene);
  } else if (idx < st.chat.msgs.length) {
    body = question(ctx, st.chat.msgs[idx], scene);
  } else {
    body = ending(ctx, scene);
  }

  return shell({
    title: "Lena · 剧情",
    eyebrow: arcById(scene.arc).name,
    action: h("button", {
      class: "chip",
      text: "换一幕",
      attrs: { type: "button", "data-scene-picker": "true" },
      on: { click: () => openPicker(ctx) },
    }),
    body,
    tab: "story",
    due: dueCount(ctx),
    flush: true,
  });
}

export function rerenderStory(ctx: Ctx): void {
  const app = document.getElementById("app");
  if (!app) return;
  app.replaceChildren(renderStory(ctx));
  window.scrollTo(0, 0);
}

function rerender(ctx: Ctx): void {
  rerenderStory(ctx);
}
