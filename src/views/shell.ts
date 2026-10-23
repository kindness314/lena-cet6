import { h } from "../core/dom";

export type Tab = "chat" | "story" | "read" | "goals";

export function shell(opts: {
  title: string;
  avatar?: string;
  back?: string;
  action?: HTMLElement;
  body: HTMLElement;
  tab?: Tab;
  flush?: boolean;
}): HTMLElement {
  const bar = h(
    "header",
    { class: "appbar" },
    opts.back
      ? h(
          "button",
          {
            class: "chip",
            text: "返回",
            on: { click: () => (location.hash = opts.back ?? "#/chat") },
          },
          null,
        )
      : opts.avatar
        ? h("div", { class: "avatar", text: opts.avatar })
        : null,
    h("h1", { text: opts.title }),
    opts.action ?? null,
  );

  const wrap = opts.flush
    ? h("div", { class: "flush" }, opts.body)
    : h("div", { class: "page" }, opts.body);

  const root = h("div", { class: opts.flush ? "flush-root" : "" }, bar, wrap);
  if (opts.tab) {
    const tabs: { id: Tab; label: string; href: string }[] = [
      { id: "chat", label: "聊天", href: "#/chat" },
      { id: "story", label: "剧情", href: "#/story" },
      { id: "read", label: "小说", href: "#/read" },
      { id: "goals", label: "目标", href: "#/goals" },
    ];
    const barEl = h("nav", { class: "tabbar" });
    for (const t of tabs) {
      const a = h("a", {
        text: t.label,
        attrs: { href: t.href },
        class: t.id === opts.tab ? "active" : "",
      });
      barEl.append(a);
    }
    root.append(barEl);
  }
  return root;
}
