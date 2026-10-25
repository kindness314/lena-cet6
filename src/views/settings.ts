import { h } from "../core/dom";
import type { Ctx } from "../app";
import { exportJson, importJson, STORAGE_KEY } from "../core/state";
import { localDay } from "../core/random";
import { shell } from "./shell";
import { SENTENCE_SOURCE_LABEL, type SentenceSource } from "../core/types";

function sourceRow(name: string, detail: string, href: string): HTMLElement {
  return h(
    "div",
    { class: "source-row" },
    h(
      "div",
      {},
      h("div", { class: "source-name", text: name }),
      h("div", { class: "muted", text: detail }),
    ),
    h("a", { class: "plain source-link", text: "来源", attrs: { href, target: "_blank", rel: "noreferrer" } }),
  );
}

function examSummary(goals: Ctx["state"]["goals"]): { date: string; time: string; name: string } | null {
  const exam = goals
    .filter((goal) => goal.name.includes("六级") && !Number.isNaN(+new Date(goal.date)))
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))[0];
  if (!exam) return null;
  const when = new Date(exam.date);
  return {
    date: when.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }),
    time: when.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }),
    name: exam.name,
  };
}

export function renderSettings(ctx: Ctx): HTMLElement {
  const st = ctx.state;
  const exam = examSummary(st.goals);
  const note = h("div", { class: "muted", attrs: { role: "status" } });
  const quota = h(
    "select",
    {
      attrs: { "aria-label": "每天默认几条" },
      on: {
        change: () => {
          st.settings.quota = Number((quota as HTMLSelectElement).value) as 5 | 8 | 12;
          ctx.save();
          note.textContent = "已保存，明天生效；今天想多聊可以点「再来 5 条」。";
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

  const file = h("input", {
    class: "file-input",
    attrs: { type: "file", accept: "application/json" },
    on: {
      change: () => {
        const f = (file as HTMLInputElement).files?.[0];
        if (!f) return;
        void f.text().then((raw) => {
          try {
            const state = importJson(raw);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            note.textContent = "导入成功，正在重新打开。";
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
    attrs: { type: "button" },
    on: {
      click: () => {
        const blob = new Blob([exportJson(st)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `cet6-backup-${localDay(Date.now())}.json`;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      },
    },
  });
  const importBtn = h("button", {
    class: "chip quiet",
    text: "选择备份文件",
    attrs: { type: "button" },
    on: { click: () => (file as HTMLInputElement).click() },
  });

  const categories = new Set(ctx.articles.map((a) => a.category).filter(Boolean));
  const sentenceCounts = new Map<SentenceSource, number>();
  for (const list of Object.values(ctx.sentences)) {
    for (const pair of list) {
      const source = pair[2] ?? "tatoeba";
      sentenceCounts.set(source, (sentenceCounts.get(source) ?? 0) + 1);
    }
  }
  const sentenceSummary = [...sentenceCounts]
    .sort((a, b) => b[1] - a[1])
    .map(([source, count]) => `${SENTENCE_SOURCE_LABEL[source]} ${count}`)
    .join(" · ");
  const body = h(
    "div",
    { class: "page settings-page" },
    h(
      "section",
      { class: "card stack" },
      h("div", { class: "kicker", text: "DAILY" }),
      h("h2", { text: "每天几句就好" }),
      h("p", { class: "muted", text: "不追连续天数，也不扣分。哪天没来，第二天照常开始。" }),
      h("label", { class: "field" }, h("span", { text: "默认条数" }), quota),
      note,
    ),
    h(
      "section",
      { class: "card" },
      h("div", { class: "kicker", text: "SOUND" }),
      h(
        "label",
        { class: "switch-row" },
        sound,
        h(
          "span",
          {},
          h("strong", { text: "单词发音" }),
          h("small", { class: "muted", text: "用浏览器自带的语音；能否离线取决于系统语音包。" }),
        ),
      ),
    ),
    h(
      "section",
      { class: "card stack" },
      h("div", { class: "kicker", text: "EXAM" }),
      exam
        ? h("div", { class: "exam-line" }, h("strong", { text: exam.date }), h("span", { text: `${exam.time} · ${exam.name}` }))
        : h("div", { class: "exam-line" }, h("strong", { text: "还没设日期" }), h("span", { text: "去「目标」里加一个" })),
      h("p", { class: "muted", text: exam ? "日期只是提醒，不是倒计时压力。可以在「目标」里增删。" : "日期只是提醒。加不加、什么时候加，都由你决定。" }),
    ),
    h(
      "section",
      { class: "card stack" },
      h("div", { class: "kicker", text: "BACKUP" }),
      h("p", { class: "muted", text: "数据只存在这台设备。换设备前导出一次 JSON。" }),
      h("div", { class: "row" }, exportBtn, importBtn),
      file,
    ),
    h(
      "section",
      { class: "card stack source-card" },
      h("div", { class: "kicker", text: "SOURCES" }),
      h("p", { class: "muted", text: "下面是这座小书房里每样东西的来处。" }),
      sourceRow(
        "2016 四、六级大纲",
        "官方词表 5418 个词目，分四级和六级，六级词带 ★；这是累计词表。本项目只取高频子集，不复制官方表。",
        "https://cet.neea.edu.cn/res/Home/1704/55b02330ac17274664f06d9d3db8249d.pdf",
      ),
      sourceRow(
        "ECDICT 词典",
        `${ctx.words.length} 个学习词 + ${Object.keys(ctx.lookup).length.toLocaleString("en-US")} 条查词索引；MIT 许可的第三方词典，不是官方六级词表。`,
        "https://github.com/skywind3000/ECDICT",
      ),
      sourceRow(
        "例句语料",
        `${Object.keys(ctx.sentences).length} 个词有例句（${sentenceSummary}）；每条都标了来源。`,
        "https://tatoeba.org/",
      ),
      sourceRow(
        "Tatoeba",
        "社区众包句对，CC BY 2.0 FR；优先作为生活化例句。",
        "https://tatoeba.org/",
      ),
      sourceRow(
        "UNPC",
        "联合国平行语料，须注明联合国为来源并引用 Ziemski et al. (2016)。",
        "https://opus.nlpl.eu/datasets/UNPC",
      ),
      sourceRow(
        "WikiMatrix",
        "维基百科句对，CC BY-SA 4.0；引用 Schwenk et al. (2019)，补正式与科普语境。",
        "https://opus.nlpl.eu/datasets/WikiMatrix",
      ),
      sourceRow(
        "OpenSubtitles",
        "影视字幕句对，ODC-BY；只作最后兜底，口语和翻译质量波动较大。",
        "https://opus.nlpl.eu/datasets/OpenSubtitles",
      ),
      sourceRow(
        "Project Gutenberg 文章",
        `${ctx.articles.length} 篇短选段，${categories.size} 个分类；美国公有领域，选段做了删节。`,
        "https://www.gutenberg.org/",
      ),
      h("p", { class: "muted tiny", text: "界面的动漫场景与人物是原创 SVG，没有使用外部图片。" }),
    ),
    h("p", { class: "muted center tiny", text: "Lena · CET-6 小书房 · 无账号 · 无追踪" }),
  );

  return shell({ title: "设置", eyebrow: "PREFERENCES", back: "#/chat", body });
}
