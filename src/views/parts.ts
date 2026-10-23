import type { Ctx } from "../app";
import { h } from "../core/dom";
import { findLemmaMatch } from "../core/annotate";

export function highlight(ctx: Ctx, text: string, word: string): (Node | string)[] {
  const hit = findLemmaMatch(text, word, ctx.forms, ctx.lookup);
  if (!hit) return [text];
  return [
    text.slice(0, hit.index),
    h("b", { text: hit.text }),
    text.slice(hit.index + hit.length),
  ];
}

export function miniAvatar(): HTMLElement {
  return h("div", { class: "mini", text: "L" });
}
