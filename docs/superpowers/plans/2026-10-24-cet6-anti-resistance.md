# 六级「低抵触」学习工具 · 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 一个纯前端离线 PWA：默认「聊天」每天 12 条词卡消息，配阅读点词与多考试倒计时。

**Architecture:** Vite + TypeScript，无框架；hash 路由；localStorage 单键状态；构建期脚本把 ECDICT / Tatoeba / Gutenberg 转成静态 JSON 放进 `public/data/`。

**Tech Stack:** Vite 7, TypeScript 5, Vitest, vite-plugin-pwa。

**Spec:** `docs/superpowers/specs/2026-10-24-cet6-anti-resistance-design.md`

## Global Constraints

- 考试时间：2026-12-12 15:00–17:25（Asia/Shanghai）。
- 每日默认 12 条消息，新词 ≤ 8；可选 5 / 8 / 12。
- 无惩罚性 UI：无断签红字、无进度条、无扣分。
- 数据仅本机；导出/导入 JSON。
- 中文文案；代码英文。
- 不 commit（未获授权）。
- 数据源：ECDICT (MIT)、Tatoeba (CC BY 2.0 FR)、Project Gutenberg (PD)；页面底部注明来源。
- 移动端 390–430px 无横向滚动；支持深色模式。

## Review Focus

- 词形还原失败（`studies`、`harder`、`don't`）时仍应能查词，不应显示空白卡片。
- 断更 3 天回来：不补发、不报错、当天正常生成 12 条。
- 同一天重复进入：消息顺序与选项顺序稳定，不重抽。
- 到期复习积压时：只发前 12 条，不爆量；新词为 0 也不报错。
- 无例句的词：消息退化为「单词 + 释义选项」，不崩。
- 导入超长文本（> 100k 字符）：分段渲染，不卡死。

---

### Task 1: 脚手架与外壳

**Files:** `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.ts`, `src/router.ts`, `src/style.css`, `src/views/*.ts`

**Interfaces:**
- Produces: `router.ts` → `mountRouter(routes: Record<string, (el: HTMLElement, param?: string) => void>)`；`navigate(hash: string)`；CSS 变量 `--bg --fg --muted --line --accent`。

- [ ] Step 1: `npm init -y`，安装 vite typescript vitest vite-plugin-pwa
- [ ] Step 2: 写 `index.html` 外壳 + `src/style.css`（手机优先、暗色）
- [ ] Step 3: `src/router.ts` 实现 hash 路由与 4 个空视图
- [ ] Step 4: 验证 `npm run dev -- --host` 可打开，`npm test` 跑通空套件

### Task 2: 数据构建

**Files:** `scripts/build-words.mjs`, `scripts/build-sentences.mjs`, `scripts/build-articles.mjs`, `scripts/sources/articles.json`, `public/data/{words,lookup,forms,sentences,articles}.json`

**Interfaces:**
- Produces: `words.json: Word[]`（`{id,w,ph,pos,zh,freq}`）；`lookup.json: Record<string,Lookup>`（`{ph,pos,zh}`）；`forms.json: Record<string,string>`（词形→原形）；`sentences.json: Record<string,[string,string][]>`；`articles.json: Article[]`（`{id,title,source,url,license,paragraphs:string[]}`）。

- [ ] Step 1: 下载 ECDICT（ghproxy 镜像），生成 words（cet6 且词频前 800）、lookup（cet4/cet6/ky 或 bnc≤20000）、forms（exchange 字段）
- [ ] Step 2: 下载 Tatoeba `cmn-eng_links` + 英/中句子，按词索引 ≤16 词的句对，每词取 2 句
- [ ] Step 3: 从 Gutenberg 抓 10–12 篇公版文本，去头尾，截取 ≤800 词
- [ ] Step 4: 校验：`node scripts/check-data.mjs` 输出各文件条目数与非空字段比例，words=800、lookup>20000、sentences 覆盖 ≥70% 的 words

### Task 3: 复习调度与消息生成（TDD）

**Files:** `src/core/srs.ts`, `src/core/messages.ts`, `src/core/options.ts`, `tests/srs.test.ts`, `tests/messages.test.ts`

**Interfaces:**
- `answerBox(box: number, correct: boolean): {box:number, dueAt:number}`，间隔 `[10min,1d,2d,4d,7d,15d]`，错→box 0（10 分钟）
- `buildDay(input: {now:number; words:Word[]; sentences:Sentences; state:WordsState; quota:number; newCap:number; seed:string}): Msg[]`
- `Msg = {id:string; w:string; en:string; zh:string; opts:[string,string,string,string]; correct:number}`
- `pickDistractors(word, pool): string[]` 同词性、中文 gloss 不重合

- [ ] Step 1: 写失败测试：间隔推进、错题回 0、同日稳定、到期积压只取 quota、无例句退化
- [ ] Step 2: 运行确认失败
- [ ] Step 3: 实现最小逻辑
- [ ] Step 4: 运行通过（`npm test`）

### Task 4: 状态与持久化（TDD）

**Files:** `src/core/state.ts`, `src/core/storage.ts`, `tests/state.test.ts`

**Interfaces:**
- `State = {v:1; words:Record<string,{box:number;due:number;seen:number;wrong:number}>; chat:{day:string;msgs:Msg[];idx:number}; goals:Goal[]; settings:{quota:5|8|12;newCap:number}; reads:Record<string,number>}`
- `loadState(): State`；`saveState(s)`；`exportJson(s): string`；`importJson(s: string): State`（校验版本与字段，失败抛错）
- 跨日：`ensureDay(state, now)` 丢弃旧 `msgs` 并重新生成

- [ ] Step 1: 失败测试：导出→导入等价；坏 JSON 抛错；跨日重生成且不补发
- [ ] Step 2: 实现；Step 3: 通过

### Task 5: 聊天界面

**Files:** `src/views/chat.ts`, `src/components/bubble.ts`

- [ ] Step 1: 会话头部（名字、未读）、气泡流、底部 4 选项
- [ ] Step 2: 选中→对/错样式与释义；滚动到最新；完成后显示「再来 5 条 / 去阅读」
- [ ] Step 3: 桌面窄屏 + 手机视口实测（浏览器）

### Task 6: 阅读器与点词

**Files:** `src/views/read.ts`, `src/core/annotate.ts`, `tests/annotate.test.ts`

**Interfaces:**
- `annotate(text: string, forms: Record<string,string>, lookup: Lookup, srsWords: Set<string>): Token[]`，`Token = {text:string; word?:string; target?:boolean}`

- [ ] Step 1: TDD：`studies→study`、`don't`、连字符、大小写、标点切分
- [ ] Step 2: 文章列表 + 阅读页 + 词卡（发音、加入复习）+ 粘贴导入
- [ ] Step 3: 实测点词与高亮

### Task 7: 目标与设置

**Files:** `src/views/goals.ts`, `src/views/settings.ts`

- [ ] Step 1: 倒计时卡片（12-12 15:00，含其他考试增删）、每日最低任务勾选
- [ ] Step 2: 设置（每日条数、发音开关）、导出/导入按钮
- [ ] Step 3: 实测跨零点与空状态

### Task 8: 离线、安装与收尾

**Files:** `vite.config.ts`, `README.md`, `.project/{plan,memory,tools}.md`

- [ ] Step 1: manifest + Service Worker 预缓存 data JSON；`npm run build && npm run preview`
- [ ] Step 2: 手机实机（局域网）验收：12 条 ≤ 90 秒、断网可用、点词、倒计时
- [ ] Step 3: README（开发/局域网 HTTPS 安装步骤/数据来源与许可）、更新项目记录
