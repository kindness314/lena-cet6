import { h } from "../core/dom";
import type { Ctx } from "../app";
import { coverage } from "../core/game";
import { progressStats } from "../core/progress";
import { localDay } from "../core/random";
import { dueCount } from "../core/review";
import { shell } from "./shell";

function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(+d)) return iso;
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function remaining(target: number, now: number): string {
  if (Number.isNaN(target)) return "日期待确认";
  const diff = target - now;
  if (diff <= 0) return "已结束";
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  return days > 0 ? `${days} 天 ${hours} 小时` : `${hours} 小时`;
}

export function renderGoals(ctx: Ctx): HTMLElement {
  const st = ctx.state;
  const now = Date.now();
  const day = localDay(now);
  if (st.chat.day !== day) ctx.regen(day);
  const quota = st.settings.quota;
  const answered = st.chat.idx;
  const target = st.chat.msgs.length > 0 ? Math.min(quota, st.chat.msgs.length) : quota;
  const taskDone = st.tasks[day] === true;
  const due = dueCount(ctx, now);

  const body = h("div", { class: "page goals-page" });
  body.append(
    h(
      "section",
      { class: "card stack today-card" },
      h("div", { class: "kicker", text: "TODAY" }),
      h("h2", { text: taskDone ? "今天已经聊过了。" : "今天聊几句就好。" }),
      h(
        "div",
        { class: "meter", attrs: { role: "img", "aria-label": `今天已回 ${answered} 条，日目标 ${target} 条` } },
        h("div", { class: "meter-fill", attrs: { style: `width:${Math.min(100, Math.round((answered / target) * 100))}%` } }),
      ),
      h(
        "p",
        {
          class: "muted",
          text:
            answered > target
              ? `今天已回 ${answered} 条，随时可以停`
              : `今天 ${answered} / ${target} 条 · 不扣分，也不补作业`,
        },
      ),
      h(
        "div",
        { class: "row" },
        h("button", {
          class: taskDone ? "chip" : "chip quiet",
          text: taskDone ? "今天先这样" : "记下今天聊过",
          attrs: { type: "button" },
          on: {
            click: () => {
              st.tasks[day] = !taskDone;
              ctx.save();
              rerender(ctx);
            },
          },
        }),
        h("a", {
          class: "chip quiet",
          text: due > 0 ? `复习 · ${due} 个到期` : "去复习",
          attrs: { href: "#/review" },
        }),
      ),
    ),
  );

  const cov = coverage(ctx.words, st.words);
  const prog = progressStats(ctx.words, st.words, now);
  const pct = (n: number): number => Math.round((n / Math.max(1, cov.total)) * 100);
  body.append(
    h(
      "section",
      { class: "card stack" },
      h("div", { class: "kicker", text: "VOCAB" }),
      h("h2", { text: `学过 ${cov.learned} / ${cov.total} 个词。` }),
      h(
        "div",
        {
          class: "meter stages",
          attrs: { role: "img", "aria-label": `学习中 ${prog.learning} 个，熟悉 ${prog.familiar} 个，已掌握 ${prog.mastered} 个` },
        },
        h("div", { class: "meter-fill learning", attrs: { style: `width:${pct(prog.learning)}%` } }),
        h("div", { class: "meter-fill familiar", attrs: { style: `width:${pct(prog.familiar)}%` } }),
        h("div", { class: "meter-fill mastered", attrs: { style: `width:${pct(prog.mastered)}%` } }),
      ),
      h(
        "div",
        { class: "progress-legend muted" },
        h("span", { text: `学习中 ${prog.learning}` }),
        h("span", { text: `熟悉 ${prog.familiar}` }),
        h("span", { text: `已掌握 ${prog.mastered}` }),
      ),
      h("p", {
        class: "muted",
        text: `剧情池 ${cov.story.total}（学过 ${cov.story.learned}）· 小游戏 ${cov.game.total}（学过 ${cov.game.learned}）`,
      }),
      h("p", {
        class: "muted",
        text: `答对 ${prog.correct} / 答错 ${prog.wrong}${
          prog.accuracy === null ? "" : ` · 正确率 ${Math.round(prog.accuracy * 100)}%`
        } · 现在到期 ${prog.due} 个`,
      }),
    ),
  );

  const goals = st.goals.slice().sort((a, b) => +new Date(a.date) - +new Date(b.date));
  body.append(h("div", { class: "section-title" }, h("h3", { text: "重要的日子" }), h("span", { class: "muted", text: `${goals.length} 个` })));
  if (goals.length === 0) {
    body.append(h("p", { class: "card muted", text: "还没有日子。可以在下面加一个。" }));
  }
  for (const g of goals) {
    body.append(
      h(
        "section",
        { class: "card goal-card" },
        h(
          "div",
          {},
          h("div", { class: "goal-name", text: g.name }),
          h("div", { class: "muted", text: when(g.date) }),
        ),
        h(
          "div",
          { class: "goal-side" },
          h("div", { class: "goal-count", text: remaining(+new Date(g.date), now) }),
          h("button", {
            class: "plain tiny danger-quiet",
            text: "删除",
            attrs: { type: "button", "aria-label": `删除 ${g.name}` },
            on: {
              click: () => {
                st.goals = st.goals.filter((x) => x.id !== g.id);
                ctx.save();
                rerender(ctx);
              },
            },
          }),
        ),
      ),
    );
  }

  const name = h("input", { attrs: { type: "text", placeholder: "考试名称", "aria-label": "考试名称" } });
  const date = h("input", { attrs: { type: "datetime-local", "aria-label": "考试时间" } });
  const addNote = h("div", { class: "muted", attrs: { role: "status" } });
  body.append(
    h(
      "section",
      { class: "card stack" },
      h("h3", { text: "加一个日子" }),
      h("p", { class: "muted", text: "只是把日期放在这里，不催你。" }),
      h("div", { class: "form-grid" }, name, date),
      h(
        "div",
        { class: "row" },
        h("button", {
          class: "chip",
          text: "添加",
          attrs: { type: "button" },
          on: {
            click: () => {
              if (!name.value.trim() || !date.value) {
                addNote.textContent = "名称和日期都填一下。";
                return;
              }
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
        h("button", {
          class: "chip quiet",
          text: "用六级笔试日期",
          attrs: { type: "button" },
          on: {
            click: () => {
              const date = "2026-12-12T15:00:00+08:00";
              if (st.goals.some((g) => g.name === "六级笔试" && +new Date(g.date) === +new Date(date))) {
                addNote.textContent = "「六级笔试」已经在上面了。";
                return;
              }
              st.goals.push({ id: `cet6-${now}`, name: "六级笔试", date });
              ctx.save();
              rerender(ctx);
            },
          },
        }),
      ),
      addNote,
    ),
    h("p", { class: "muted center tiny", text: "目标不是打卡，是给未来的自己留一张便签。" }),
  );

  return shell({ title: "目标", eyebrow: "A LITTLE PLAN", body, tab: "goals", due: dueCount(ctx) });
}

function rerender(ctx: Ctx): void {
  const app = document.getElementById("app");
  if (app) app.replaceChildren(renderGoals(ctx));
}
