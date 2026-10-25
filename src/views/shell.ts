import { h } from "../core/dom";
import { avatarMark } from "./art";
import { backIcon, navIcon, type NavIcon } from "./icons";

export type Tab = "chat" | "story" | "read" | "game" | "review" | "goals";

const TABS: { id: Tab; label: string; href: string; icon: NavIcon }[] = [
  { id: "chat", label: "聊天", href: "#/chat", icon: "chat" },
  { id: "story", label: "剧情", href: "#/story", icon: "story" },
  { id: "read", label: "小说", href: "#/read", icon: "read" },
  { id: "game", label: "游戏", href: "#/game", icon: "game" },
  { id: "review", label: "复习", href: "#/review", icon: "review" },
  { id: "goals", label: "目标", href: "#/goals", icon: "goals" },
];

export function shell(opts: {
  title: string;
  eyebrow?: string;
  avatar?: string;
  back?: string;
  action?: HTMLElement;
  body: HTMLElement;
  tab?: Tab;
  flush?: boolean;
  /** 到期复习词数：在「复习」栏上挂一个角标，不用点进去才知道。 */
  due?: number;
}): HTMLElement {
  const left = opts.back
    ? h(
        "button",
        {
          class: "icon-btn back",
          attrs: { type: "button", "aria-label": "返回" },
          on: { click: () => (location.hash = opts.back ?? "#/chat") },
        },
        backIcon(),
      )
    : opts.avatar
      ? h("div", { class: "avatar", attrs: { "aria-hidden": "true" } }, avatarMark())
      : h("div", { class: "brand-dot", attrs: { "aria-hidden": "true" } }, h("span", { text: "L" }));

  const heading = h(
    "div",
    { class: "title-wrap" },
    opts.eyebrow ? h("div", { class: "eyebrow", text: opts.eyebrow }) : null,
    h("h1", { text: opts.title }),
  );

  const bar = h("header", { class: "appbar" }, left, heading, opts.action ?? h("span", { class: "appbar-spacer" }));

  const wrap = opts.flush
    ? h("div", { class: "flush" }, opts.body)
    : h("div", { class: "page" }, opts.body);

  const root = h("div", { class: opts.flush ? "flush-root" : "app-root" }, bar, wrap);
  if (opts.tab) {
    const barEl = h("nav", { class: "tabbar", attrs: { "aria-label": "主要导航" } });
    for (const t of TABS) {
      const active = t.id === opts.tab;
      const a = h(
        "a",
        {
          class: active ? "active" : "",
          attrs: {
            href: t.href,
            "aria-current": active ? "page" : "false",
            "aria-label":
              t.id === "review" && (opts.due ?? 0) > 0
                ? `${t.label}（${opts.due} 个到期）`
                : t.label,
          },
        },
        navIcon(t.icon),
        h("span", { class: "tab-label", text: t.label }),
        t.id === "review" && (opts.due ?? 0) > 0
          ? h("span", { class: "tab-badge", text: opts.due! > 99 ? "99+" : String(opts.due) })
          : null,
      );
      barEl.append(a);
    }
    root.append(barEl);
  }
  return root;
}
