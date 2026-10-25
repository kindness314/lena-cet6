# Lena

一个降低启动成本的六级词卡 PWA。聊天、剧情、小说、小游戏和复习共用同一份学习进度；没有断签、没有进度条、没有红字。

在线使用：<https://kindness314.github.io/lena-cet6/>（手机 Chrome 打开后可「添加到主屏幕」）。

## 内容

- **2636 个学习词**：636 个补齐的 CET4 基础词 + 1500 个高频核心词 + 500 个进阶词。前 848 个词按「3 个基础 + 1 个进阶」排列，先补四级缺口；之后按「3 个核心 + 1 个进阶」排列。词条来自第三方 ECDICT 词典，**不是官方考试大纲**。
- **2575 个词有真人例句**：共 4469 对中英句子，来自 Tatoeba、联合国平行语料（UNPC）、WikiMatrix 和 OpenSubtitles；每句标注来源。优先 1:1 翻译对，缺少时回退到多对多链接。没有合适例句的词只显示裸词卡，不补写。
- **600 篇 Gutenberg 选段**：10 个分类（童话、成长、冒险、侦探、文学、科幻、历史、思想、科学、社会），每篇 380–980 词，保留来源、许可和段落范围；重点词按篇幅选 6–16 个，阅读器只给这些词加下划线。每篇另附逐段中文机器翻译，可一键显示。
- **12 个剧情场景**：4 条故事弧（雨夜来信、星海值夜、城市末班、海边电台），按天轮换，也可以手动选一幕。
- 阅读器可点任意单词查看释义、音标、本文语境和例句；在学习词表里的词可以加进当天队列；也可以导入自己的英文文章，只存在本机。

**词汇范围**：[2016 修订版四、六级大纲](https://cet.neea.edu.cn/res/Home/1704/55b02330ac17274664f06d9d3db8249d.pdf)词表共 **5418 个词目**，分四级和六级两个级别，六级词用 ★ 标出；这是累计词表，不是 5418 个六级新增词。本项目不复制官方词表：ECDICT 的 `cet6` 标签有 5407 条，排除高中词后剩 3291 条候选，从中取 1500 个核心词 + 500 个进阶词；再补上原 2000 词之外缺失的 636 个 CET4 非基础词（另 2 条是 ECDICT 拼写错误，已排除），合计 2636 个每日学习词。阅读器另有 27,705 条查词索引，不需要先背完 2636 词才能查词。

## 功能

- **聊天**：每天默认 12 条以内（新词上限 8，可在设置里改成 5/8/12）。回完一条留下选择和回应；答错的词会稍后重新出现。
- **剧情**：同一份词表换成视觉小说场景。Lena 在对话框里出题，选完选项看到回应，继续往下走；场景只改变叙事和氛围，不另建学习系统。
- **小说**：分类筛选、阅读位置恢复、点词卡、发音；点词后按词的归属加进聊天或小游戏。导入文章会重新统计词数并做基本字段校验。
- **小游戏**：配对练习，一轮 5 对，点英文再点它对应的中文；配对成功才写入复习，配错只是闪一下，没有计时和惩罚。三档词（基础 / 核心 / 进阶）按剩余词量混着出，通常是 1:3:1。
- **复习**：底部独立入口，按 SRS 到期时间出题；答对拉长间隔，答错 10 分钟后再来。聊天和目标的当日卡片也会显示到期数量。
- **目标**：只记录日期，不做倒计时施压；默认六级笔试便签，可以增删。
- **设置**：每日条数、发音开关、JSON 导出/导入、内容来源说明。

词汇按归属分工：能放进 12 个剧情场景的 605 个词只在聊天 / 剧情里出，其余 2031 个词只在游戏里配对（小说里点词会按同样的规则分流，加入对应队列）。四个练习入口共用一个 SRS：答过的词在同一时间只出现在一个地方，到期的词归复习页。复习答掉当天聊天里同一个词时，会自动从聊天剩余队列移除。

数据只存在本机 `localStorage`，没有账号、没有后端、没有追踪。

## 开发

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # vitest
npm run build        # 产出 dist/（含 PWA）
npm run preview      # 预览构建结果，含 service worker
node scripts/check-data.mjs
```

需要 Node 20+。数据构建额外需要 Python 3。

## 生成数据

原始语料只放在被 gitignore 的 `.data-sandbox/`，不会提交；仓库里保留派生 JSON、来源清单和校验脚本。

```bash
npm run data:fetch   # HTTPS 白名单下载 -> .data-sandbox/，校验 SHA256 与字节数
npm run data         # verify -> source check -> extract -> build -> check-data
npm run data:translate # 可选：联网生成逐段中文机器译文（Google/Microsoft，按段缓存；在线不可用时用 Argos Translate 本地兜底）
```

`npm run data:fetch` 只接受清单里的 ECDICT / Tatoeba / Gutenberg / OPUS 语料 URL，并校验固定哈希；三个 OPUS ZIP 约 2.2 GB，解压后占用更大。不会执行下载内容。`npm run data` 不负责下载，第一次运行前要先执行 `data:fetch`。

产物：

| 文件 | 内容 |
| --- | --- |
| `public/data/words.json` | 2636 个学习词（636 基础 + 1500 核心 + 500 进阶） |
| `public/data/lookup.json` | 27,705 条点词查词索引；多词性义项合并，文章专用词由 glossary 补齐 |
| `public/data/forms.json` | 22,467 条词形映射（studies → study） |
| `public/data/sentences.json` | 2575 个词、4469 对中英例句；每对带 `tatoeba` / `unpc` / `wikimatrix` / `opensubtitles` 来源 |
| `public/data/articles.json` | 600 篇选段、4895 个段落；每篇含 6–16 个 `keyWords` 和逐段 `paragraphsZh` |

来源与算法边界、完整 SHA256、600 篇文章的段落范围见 [`docs/data-quality.md`](docs/data-quality.md)；逐篇范围以 `scripts/sources/articles.json` 为准。

## 安装到手机

PWA 安装要求 HTTPS（localhost 除外）。把 `dist/` 部署到任意静态托管（Cloudflare Pages、Vercel、Netlify、GitHub Pages），用手机 Chrome 打开后选「添加到主屏幕」。

局域网 `npm run preview -- --host` 只能调试，不能安装。

## 数据来源与许可

- 词库：[ECDICT](https://github.com/skywind3000/ECDICT)，MIT。`cet6` / `frq` / `bnc` 是词典字段，不是官方词表；中文释义经过截断和清理。
- 例句：
  - [Tatoeba](https://tatoeba.org/)，CC BY 2.0 FR。优先 1:1 链接，缺失时回退多对多并做长度、标点和语言过滤。
  - [UNPC](https://conferences.unite.un.org/uncorpus)，须注明联合国为来源，并引用 Ziemski et al. (2016)；不得暗示联合国背书。
  - [WikiMatrix](https://opus.nlpl.eu/datasets/WikiMatrix)，CC BY-SA 4.0；引用 Schwenk et al. (2019)。以相同方式共享。
  - [OpenSubtitles v2024](https://opus.nlpl.eu/datasets/OpenSubtitles)，ODC-BY；字幕语料仅保留人工抽检通过的白名单词，来源链接 <https://www.opensubtitles.org/>。
  - 社区/自动对齐语料仍可能有错译；词卡逐句显示来源，便于判断。
- 文章：[Project Gutenberg](https://www.gutenberg.org/)，美国公有领域。选段做了删节；公有领域状态按美国法律说明，不保证在其他司法辖区同样适用。
- 界面里的 Lena 场景与人物是原创 inline SVG，没有使用外部图片。

## 已知边界

- 2575 / 2636 个词有例句；其余显示裸词卡，不编造句子。
- 选段可能从场景中间开始，也可能在段落中被截断；这是为了保持固定长度和可读性。
- 文章难度标签（轻松 / 适中 / 挑战）是编辑估计，不是 CEFR 或六级官方分级。
- 聊天、剧情、小游戏、复习共用 SRS 但互斥出场，答错会重新入队；当天没有「必须做完」的硬门槛。
- 小游戏一轮只有 5 对，池里没学过、没到期的词都配完后，会用已学过但还没到期的词继续练，不会空转。
- 所有数据只在本机；清理浏览器存储会丢失进度，换设备前请导出 JSON。

## 结构

```
src/
  core/     纯逻辑：SRS、消息生成、场景、状态、存储、词形
  views/    chat / story / read / game / review / goals / settings / 视觉组件
  app.ts    启动、数据加载、Ctx
scripts/    数据下载、校验、构建与图标生成
tests/      vitest
docs/       数据来源与质量说明
```
