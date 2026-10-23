import { h } from "../core/dom";
import type { Ctx } from "../app";
import { localDay } from "../core/random";
import { shell } from "./shell";

function remaining(target: number, now: number): string {
  const diff = target - now;
  if (diff <= 0) return "已结束";
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  return days > 0 ? `${days} 天 ${hours} 小时` : `${hours} 小时`;
}

export function renderGoals(ctx: Ctx): HTMLElement {
  const st = ctx.state;
  const now = Date.now();
  const body = h("div", { class: "page" });
  const day = localDay(now);
  const quota = st.settings.quota;

  for (const g of st.goals.slice().sort((a, b) => +new Date(a.date) - +new Date(b.date))) {
    const card = h(
      "div",
      { class: "card" },
      h("div", { class: "muted", text: g.name }),
      h("div", { class: "count", text: remaining(+new Date(g.date), now) }),
      h("div", { class: "muted", text: new Date(g.date).toLocaleString("zh-CN") }),
      h(
        "button",
        {
          class: "chip",
          text: "删除",
          on: {
            click: () => {
              st.goals = st.goals.filter((x) => x.id !== g.id);
              ctx.save();
              rerender(ctx);
            },
          },
        },
      ),
    );
    body.append(card);
  }

  const taskDone = st.tasks[day] === true;
  const target = Math.min(quota, st.chat.msgs.length) || quota;
  body.append(
    h(
      "div",
      { class: "card" },
      h("div", { class: "muted", text: "今天的最低任务" }),
      h("p", { text: `回 ${target} 条消息` }),
      h("button", {
        class: "chip",
        text: taskDone ? "已完成" : "标记完成",
        on: {
          click: () => {
            st.tasks[day] = !taskDone;
            ctx.save();
            rerender(ctx);
          },
        },
      }),
    ),
  );

  const name = h("input", { attrs: { type: "text", placeholder: "考试名称" } });
  const date = h("input", { attrs: { type: "datetime-local" } });
  body.append(
    h(
      "div",
      { class: "card" },
      h("div", { class: "muted", text: "添加考试" }),
      name,
      date,
      h(
        "div",
        { class: "row" },
        h("button", {
          class: "chip",
          text: "添加",
          on: {
            click: () => {
              if (!name.value.trim() || !date.value) return;
              st.goals.push({
                id: `g${now}`,
                name: name.value.trim(),
                date: new Date(date.value).toISOString(),
              });
              ctx.save();
              rerender(ctx);
            },
          },
        }),
      ),
    ),
  );

  return shell({ title: "目标", body, tab: "goals" });
}

function rerender(ctx: Ctx): void {
  const app = document.getElementById("app");
  if (app) app.replaceChildren(renderGoals(ctx));
}
