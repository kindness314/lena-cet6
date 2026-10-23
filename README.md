# Lena

一个降低启动成本的六级词卡 PWA。打开就是聊天界面，每天最多 12 条英文消息，回完算完成；没有断签、没有进度条、没有红字。

在线使用：<https://kindness314.github.io/lena-cet6/>（手机 Chrome 打开后可「添加到主屏幕」）。

## 功能

- **聊天**：每天最多 12 条（新词上限 8，首日通常 8 条，之后由复习补满；可在设置里改成 5/8/12），点选项回意思；答错的消息会在 3 条后重新出现。
- **阅读**：内置 10 篇 Gutenberg 短文，点任意单词看意思；核心词可直接加进复习，也可以粘贴自己的英文文章。
- **目标**：考试倒计时，默认六级笔试 2026-12-12 15:00。
- **设置**：每日条数、发音开关、JSON 导出/导入。

数据只存在本机 `localStorage`，没有账号、没有后端。

## 开发

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # vitest
npm run build        # 产出 dist/
npm run preview      # 本地预览构建结果（含 service worker）
```

## 生成数据

`public/data/*.json` 由 `scripts/` 从原始语料构建，原始文件放在 `data/`（已 gitignore）。

1. 下载：
   - ECDICT（MIT）：`data/ecdict.csv`
   - Tatoeba 中英句对（CC BY 2.0 FR）：`data/cmn-eng_links.tsv.bz2`、`data/cmn_sentences.tsv.bz2`、`data/eng_sentences.tsv.bz2`
2. 构建（需要 Node 20+ 与 Python 3，且能访问上述站点）：

```bash
npm run data
```

`opencc-js` 仅用于构建期把 Tatoeba 的繁体中文转成简体，不会进入前端包。

产物：

| 文件 | 内容 |
| --- | --- |
| `words.json` | 800 个六级词，按词频排序 |
| `lookup.json` | 点词查义用的词典（CET4/CET6/考研/高频词） |
| `forms.json` | 词形还原（studies → study） |
| `sentences.json` | 每个词最多 2 条中英例句 |
| `articles.json` | 阅读文章 |

`scripts/check-data.mjs` 会校验词数、词性覆盖率、词典规模、例句覆盖率与文章数；不达标直接失败。

## 安装到手机

PWA 安装要求 HTTPS（localhost 除外）。把 `dist/` 部署到任意静态托管（Cloudflare Pages、Vercel、Netlify、GitHub Pages），用手机 Chrome 打开后选「添加到主屏幕」。

局域网 `npm run preview -- --host` 只能调试，不能安装。

## 数据来源与许可

- 词库：[ECDICT](https://github.com/skywind3000/ECDICT)，MIT
- 例句：[Tatoeba](https://tatoeba.org/)，CC BY 2.0 FR
- 文章：[Project Gutenberg](https://www.gutenberg.org/)，公有领域

## 结构

```
src/
  core/     纯逻辑：SRS、消息生成、状态、存储、词形
  views/    chat / read / goals / settings
  app.ts    启动、数据加载、Ctx
scripts/    数据构建与图标生成
tests/      vitest
```
