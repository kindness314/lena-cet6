import { h } from "../core/dom";
import type { Ctx } from "../app";
import { exportJson, importJson, STORAGE_KEY } from "../core/state";
import { localDay } from "../core/random";
import { shell } from "./shell";

export function renderSettings(ctx: Ctx): HTMLElement {
  const st = ctx.state;
  const quota = h(
    "select",
    {
      on: {
        change: () => {
          st.settings.quota = Number((quota as HTMLSelectElement).value) as 5 | 8 | 12;
          ctx.save();
          note.textContent = "已保存，明天生效（今天想多了可以点「再来 5 条」）";
        },
      },
    },
    ...[5, 8, 12].map((n) =>
      h("option", { text: `${n} 条`, attrs: { value: String(n), ...(st.settings.quota === n ? { selected: "" } : {}) } }),
    ),
  );

  const sound = h("input", {
    attrs: { type: "checkbox", ...(st.settings.sound ? { checked: "" } : {}) },
    on: {
      change: () => {
        st.settings.sound = (sound as HTMLInputElement).checked;
        ctx.save();
      },
    },
  });

  const note = h("div", { class: "muted" });

  const file = h("input", {
    attrs: { type: "file", accept: "application/json" },
    on: {
      change: () => {
        const f = (file as HTMLInputElement).files?.[0];
        if (!f) return;
        void f.text().then((raw) => {
          try {
            const state = importJson(raw);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            location.reload();
          } catch (err) {
            note.textContent = `导入失败：${(err as Error).message}`;
          }
        });
      },
    },
  });

  const exportBtn = h("button", {
    class: "chip",
    text: "导出备份",
    on: {
      click: () => {
        const blob = new Blob([exportJson(st)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `cet6-backup-${localDay(Date.now())}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
      },
    },
  });

  const body = h(
    "div",
    { class: "page" },
    h("div", { class: "card" }, h("div", { class: "muted", text: "每天默认几条" }), quota, note),
    h("div", { class: "card" }, h("label", {}, sound, " 单词发音")),
    h(
      "div",
      { class: "card" },
      h("div", { class: "muted", text: "备份" }),
      h("div", { class: "row" }, exportBtn),
      file,
      h("div", { class: "muted", text: "导入会覆盖当前进度" }),
    ),
    h(
      "div",
      { class: "card muted" },
      h("p", { text: "六级笔试：2026-12-12 15:00–17:25" }),
      h("p", { text: "词库：ECDICT（MIT）；例句：Tatoeba（CC BY 2.0 FR）；文章：Project Gutenberg（公有领域）。" }),
      h("p", { text: "数据只存在这台设备上。" }),
    ),
  );

  return shell({ title: "设置", back: "#/chat", body });
}
