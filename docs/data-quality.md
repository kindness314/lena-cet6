# 数据来源、构建与边界

这份文档说明 `public/data/` 里每个数字从哪里来、怎么复现，以及哪些说法**不能**由这些数据支持。

一句话边界：这是一套基于第三方词典、社区例句和公有领域选段的个人学习材料，**不是官方六级词表、不是真题、也不是经人工逐句审校的教材**。

## 1. 原始输入

所有原始文件只落在 `.data-sandbox/`（已 gitignore），由 `npm run data:fetch` 下载。下载器只接受下列白名单 URL，要求 HTTPS，限制重定向后的协议、超时和大小，并在落盘前校验字节数与 SHA256。

| 文件 | 来源 | 许可 | 字节 | SHA256 |
| --- | --- | --- | ---: | --- |
| `ecdict.csv` | [ECDICT](https://github.com/skywind3000/ECDICT) | MIT | 65,933,428 | `1a6947e04785db63613a92e14903cdae7954f7e84860b10e68e5c7cbb3f9c3cf` |
| `cmn-eng_links.tsv.bz2` | [Tatoeba](https://tatoeba.org/) | CC BY 2.0 FR | 481,442 | `7fb926b7ea92d0a9270b546a3f8aa89b523ff086b0b56bd938bac129ed3ff73b` |
| `cmn_sentences.tsv.bz2` | Tatoeba | CC BY 2.0 FR | 1,258,968 | `896eb1a6ef068fc0a501d0ab0d3059dd097bec0ea056c052e386f4491cdacab7` |
| `eng_sentences.tsv.bz2` | Tatoeba | CC BY 2.0 FR | 24,908,986 | `bb3dcc28a8984a26dc466ee14eb53c4210b0dd9bb111b9d686d1efc83ecf091c` |
| `WikiMatrix.en-zh.txt.zip` | [OPUS WikiMatrix](https://opus.nlpl.eu/datasets/WikiMatrix) | CC BY-SA 4.0 | 103,866,994 | `a7b99bd29d5b3445a2293a661b60f341f2fe9009540ef1662d1373481ac53bbf` |
| `UNPC.en-zh.txt.zip` | [OPUS UNPC](https://opus.nlpl.eu/datasets/UNPC) | UN Parallel Corpus terms; attribution required | 1,535,707,641 | `527313b09c3c4975c65c3424bb573da846f30b375aeb099117096e2c53769b2f` |
| `OpenSubtitles.en-zh_CN.txt.zip` | [OPUS OpenSubtitles v2024](https://opus.nlpl.eu/datasets/OpenSubtitles) | ODC-BY | 594,348,923 | `ac2fd8c041f3b03dde29a683d3c225587188ec70f61e85111d75463a8f9089fe` |

Gutenberg 书文件按 `scripts/sources/articles.json` 的 `gid` / `textUrl` / `sha256` / `bytes` 单独下载到 `.data-sandbox/gutenberg/`，共 64 本（600 个选段；同一本书可有多段）。清单同时记录 `start` / `end` 段落范围，构建时只取这一段。

来源声明必须按实际情况表述：

- **ECDICT** 是第三方 MIT 许可词典，`cet6`、`frq`、`bnc` 都是它的字段；把它称为「官方六级词表」是不准确的。
- **Tatoeba** 是社区众包语料，许可为 CC BY 2.0 FR；翻译由志愿者贡献，不能保证每句都像考试例句。
- **UNPC** 是联合国平行语料；使用必须注明联合国为来源，引用 Ziemski et al. (2016)，且不得暗示联合国的认可或背书。
- **WikiMatrix** 是 CC BY-SA 4.0 的维基百科句对；引用 Schwenk et al. (2019)，再分发时以相同方式共享。自动对齐会有错译。
- **OpenSubtitles v2024** 是 ODC-BY 字幕语料；构建期只对人工抽检通过的白名单词取样，避免把字幕断句和错译带进词卡。
- **Project Gutenberg** 文本在美国属于公有领域；这不等于在所有司法辖区都无版权。应用内的许可文案写明「公有领域（美国）」。

## 2. 2636 个学习词

先划清口径：[2016 修订版《全国大学英语四、六级考试大纲》](https://cet.neea.edu.cn/res/Home/1704/55b02330ac17274664f06d9d3db8249d.pdf)的词表共 **5418 个词目**，分四级和六级两个级别，六级词用 ★ 标出；它是四级 + 六级的累计词表，不是 5418 个六级新增词。本项目不复制这份官方词表。

`scripts/build-words.mjs` 从 ECDICT 读取 `word, phonetic, translation, pos, tag, bnc, frq, exchange`。ECDICT 的 `cet6` 标签有 5407 条，与官方 5418 不是同一套计数；排除 `zk` / `gk` 后剩 3291 条候选。

1. 取带 `cet6` 标签、且不带 `zk` / `gk` 标签的纯字母词（允许 `-` 和 `'`）。`gk` 是 ECDICT 的高中及以下标记；保留它会把 `system`、`court`、`effect` 这类词占掉每日名额。
2. 按 `min(bnc, frq)` 排序，取前 1500 个作为 **core**。
3. 从剩余 `cet6` 词中排除仍带 `cet4` 或 `gk` 的词，取前 500 个作为 **advanced**。这一步是为了让进阶词更像「六级扩展」，而不是把四级基础词再算一遍。
4. 收集 ECDICT 中带 `cet4`、不带 `zk` / `gk`、且不在前两步 2000 词里的词。这样的词有 638 条；其中 `reservior` / `uptodate` 是已有标准词（`reservoir` / `up-to-date`）的拼写变体，排除后剩 636 条作为 **foundation**。这 636 条里有 94 条只带 `cet4`、不带 `cet6`，所以它们不在 3291 条候选内。
5. 排序时先按「3 个 foundation + 1 个 advanced」跑到 foundation 用完（共 636 个 foundation + 212 个 advanced），再按「3 个 core + 1 个 advanced」排列剩余词。这样四级缺口优先进入每日队列，同时保留六级进阶词的早期曝光。
6. `freq` 是 1–2636 的连续应用内优先级，不是词频排名。
7. `zh` 取 ECDICT 第一条非括号释义，去掉词性前缀，最多保留两个义项、28 个字符；`pos` 归一化为 `n` / `v` / `a` / `r` / `?` 等。
8. `forms` 取 ECDICT `exchange` 字段中的屈折形式，最多 10 个。
9. 音标以 ECDICT 为主；构建器对少数错误或缺失条目做显式修正，当前 2636 个词都有音标。

因此 `tier` 是**构建脚本的分层**，不是官方级别；`foundation` 表示「原 2000 词之外缺失的 CET4 非基础词」，不等于官方四级。2636 是每日学习子集，不声称覆盖 5418 个大纲词目；阅读器的查词索引另覆盖 27,705 条词形/词条。

`lookup.json` 另收 ECDICT 中 `zk` / `gk` / `cet4` / `cet6` / `ky` 标签词、常见系动词与缩写，以及 `min(bnc, frq) <= 20000` 的词，供阅读器点词。点词卡使用合并后的多词性释义（最多 4 个不同词性或词形说明，截到 48 字符），例如 `saw` 会同时显示「锯子」和「see 的过去式」；学习卡片的 `words[].zh` 仍是短释义。

`scripts/build-glossary.mjs` 在 `sentences` / `articles` 之后运行一次：它扫描文章正文，对前端解析后仍查不到的词补 ECDICT 条目，直接并入 `lookup.json`，因此前端不需要新增数据文件。全大写缩写、只有大写用法且缺名字标记的短词会被跳过，避免把 `Geo`、`Chas` 映射成技术义；ECDICT 没有的专名保持未收录。当前 600 篇共 457,946 个正文 token，4,592 个（1.00%）未收录，归并为 2,698 个唯一词形，主要是专名、古词和连字符复合词。`forms.json` 只保留 lookup 中真实存在的词形，避免把查不到的词形映射进来。

## 3. 例句：2575 / 2636

`scripts/build-sentences.mjs` 先构建 Tatoeba，再按固定优先级为仍缺例句的词补 UNPC、WikiMatrix、OpenSubtitles。所有来源使用同一套长度和噪声过滤，但新来源额外要求中文译文含 ECDICT 词条的中文义项，以减少同形异义错配。

1. 只读 Tatoeba 的 `cmn-eng` 链接表，以及英文、中文句子表；必须中英两侧都能解析出文本。
2. **优先 1:1 链接**：英文和中文各自只有这一个对应句；没有 1:1 句子时，回退到多对多链接。多对多更容易出现错配，所以只在覆盖率不足时使用，并在打分时降低权重。
3. 英文过滤：4–20 个 token、12–240 字符、以 `.` / `!` / `?` 结尾、不含 URL/邮箱/方括号、不含 4 个以上连续大写字母、`!`/`?` 不超过 2 个。
4. 中文过滤：含汉字、长度 4–80、不含 URL；用 OpenCC 在构建期做繁转简（`opencc-js` 不进入前端包）。
5. 把句子中的词形还原到目标词，按「含原形、长度接近 9 词、只出现一次、不含数字、1:1 加分」打分，每个词最多保留 2 句，同句去重。同一英文句有多个中文译法时，优先 1:1、长度接近 10 字的译文。
6. 对 Tatoeba 仍无例句的词，逐行读取 UNPC（奖励 5）→ WikiMatrix（奖励 4）→ OpenSubtitles（奖励 1）。新来源先做更严格的英文过滤：排除文档编号、列表项、方括号、HTML 实体、全大写缩写、RTL 控制符和字幕对话符；中文排除粤语字、列表编号、残留拉丁文本和长度异常。
7. 用一个词的 ECDICT 中文释义拆出可匹配词条，候选中文必须包含其中至少一个词条；再按「词条长度、来源奖励、是否含原形、6–14 token、中文 8–50 字、不含数字」打分。
8. 选中一个词时，按 UNPC → WikiMatrix → OpenSubtitles 的顺序取第一个有候选的来源，最多 2 句，且第二句只取同源；中文译文 Levenshtein 相似度 ≥ 0.9 视为重复。不同来源不混排，避免低质量来源污染高质量例句。
9. OpenSubtitles 字幕断句和错译较多，只对人工抽检通过的 36 个词开放；白名单外的词宁可保留裸词卡。

结果：**2575 个词有例句（98%），共 4469 对**。

| 来源 | 句对数 | 覆盖词数 |
| --- | ---: | ---: |
| Tatoeba | 3124 | 1864 |
| UNPC | 1222 | 636 |
| WikiMatrix | 61 | 39 |
| OpenSubtitles | 62 | 36 |
| 合计 | 4469 | 2575 |

剩余 61 个词在应用里显示**裸词卡**（只有单词、音标、词性、释义），不会自动生成例句。这是故意的：没有可靠句子时不编造。缺失词多为低频词、专名或过滤后无合格候选的词。

已知限制：

- 1:1 优先降低错配，但回退的多对多链接仍可能带来语气或词义偏差；例如个别译文可能把肯定/否定说反。
- WikiMatrix 是自动对齐语料，仍有少量错译；例如把 `masonic lodge` 译成「小屋」、把 `wool` 译成「棉布」。词卡逐句显示来源，便于识别；没有把这些句子伪装成 Tatoeba。
- UNPC 是联合国正式文件语域，句法偏长、偏公文；过滤后保留的句子语义通常更稳，但不代表口语或六级阅读风格。
- OpenSubtitles 只保留人工抽检白名单；白名单本身也可能有语境特殊的句子。
- 例句长度和标点规则会偏向短句，不能代表六级阅读的句法难度。
- 覆盖率从约 70% 提到 98% 来自新增平行语料和更宽的候选池，不是补写或机器翻译。

## 4. 文章：600 篇 / 10 类 / 4895 段

文章从 64 本 Gutenberg 纯文本中按固定段落范围截取，控制到 380–980 词；每段不超过 320 词，至少 3 段。分类和难度是编辑标注，不是官方分级。当前共有 600 篇：保留的 176 篇原有选段不改变 `id`，方便已有阅读进度继续对应；新增 424 篇使用 `gid-序号` 的新 `id`，范围避开同书已有选段和新增选段，因此同一段正文不会被重复收录。

选段硬门槛是至少 7 个当前学习词；实际大多数选段有 20–60 个目标词。`scripts/build-articles.mjs` 会保留每篇的 `targetWords`（去重命中数），并按篇幅从这些词中选重点词：

```text
keyTarget(wordCount) = clamp(round(wordCount / 60), 6, 18)
```

380 词约 6 个、600 词约 10 个、800 词约 13 个、980 词约 16 个。优先 `advanced` 层，其次按 `sourceRank` 从高到低（更少见），出现次数和是否有真实例句只作同分排序；排除大写专名。阅读器只给 `keyWords` 加下划线，其他单词仍可点击查释义；文章卡显示重点词数。`targetWords` 仍保留原始命中数，供数据校验和选段使用。

分类数量：童话 35、成长 68、冒险 78、侦探 70、文学 132、科幻 70、历史 30、思想 52、科学 36、社会 29。

逐篇 `gid`、标题、分类、难度、`start` / `end` 段落范围、许可和来源哈希以 [`scripts/sources/articles.json`](../scripts/sources/articles.json) 为准；构建器会再次校验每本书的字节数和 SHA256，再取指定范围。正文中的词全部可点；`scripts/build-glossary.mjs` 只为 ECDICT 确实存在的词补条目，专名、古词和部分连字符复合词继续显示「未收录」。

### 中文译文

`scripts/translate-articles.mjs` 在构建期调用 Google Translate 或 Microsoft Translator（Bing），为 600 篇各生成逐段中文译文，写入 `articles.json` 的 `paragraphsZh`，并与 `paragraphs` 一一对应；同时写入 `translation: { provider, kind: "machine", retrieved }`。早期缓存由 Google Translate 生成，新增和补译由 Microsoft Translator 生成，`provider` 按篇记录真实来源。在线服务持续失败（长时间返回空响应）的少数篇章用 Argos Translate（本地离线神经网络模型，en→zh，MIT/Apache 双许可的一部分随包分发）兜底，provider 标注为 `Argos Translate`。阅读器默认显示英文，点「显示译文」后在中英段落之间切换。

译文有两层边界：

- 这是**机器翻译，仅作阅读辅助**，不是出版译本，也没有经过逐句人工审校；文学对话、双关、古语和专名的处理可能不稳定。
- 原文仍是 Project Gutenberg 美国公有领域文本；译文由 Google Translate、Microsoft Translator 或 Argos Translate 生成，应用内按篇标注真实来源和生成日期。应用运行时不会联网请求翻译，译文已随数据打包。

已知限制：

- 2148 的选段位于合集 `The Works of Edgar Allan Poe` 内的 `The Thousand-and-Second Tale of Scheherazade`；文章标题使用实际故事名，来源链接仍指向 Gutenberg 合集。
- 部分选段从情节中间开始，或在句子中途以省略号截断；这是固定长度和来源段落范围的代价。
- `targetWords` 是去重后的目标词数；`keyWords` 是按上式算出的重点词数。正文里同一词可能出现多次，所以带下划线的 token 数可能多于重点词数。
- 重点词是构建期静态选择，不随用户的 SRS 状态变化；用户导入的文章没有 `keyWords`，回退为全部学习词高亮。
- 文章导入后只在浏览器本机保存；应用不会把用户文章上传。
- 新增选段来自同一批 64 本书；它增加了阅读量，但没有增加新的作者或书目，也没有改变原有 176 篇的 `id` 和段落。

## 5. 可复现命令

```bash
npm run data:fetch        # 只下载清单内文件，校验 SHA256 / bytes
npm run data:verify       # 校验 .data-sandbox 中的原始文件
npm run data:sources      # 校验 manifest：URL、gid、范围、分类、哈希字段
npm run data:extract      # Python 解压 bz2 / zip，生成 work 语料
npm run data:build        # words / lookup / forms / sentences / articles / glossary
npm run data:translate    # 可选：联网生成逐段机器译文；已有译文会按原文哈希缓存
node scripts/check-data.mjs
npm test
```

`check-data.mjs` 的硬门槛包括：2580–2700 词、foundation 600–700、core ≥ 1450、advanced ≥ 450、词性覆盖 ≥ 95%、音标覆盖 ≥ 词数 − 3、lookup ≥ 24k、forms ≥ 20k、例句覆盖 ≥ 85%、文章 = 600 篇、段落 ≥ 250、每类 ≥ 2 篇、词频连续唯一、每篇文章 ≥ 3 段、目标词 ≥ 7、`keyWords` 按篇幅公式计算且都真实出现在正文、每篇 `paragraphsZh` 与正文一一对应。当前的精确值是 2636 词、2575 个词有 4469 对例句、600 篇文章、4895 段、600 篇有完整机器译文。

## 6. 不能从数据得出的结论

- 不能声称这 2636 词覆盖了 5418 个大纲词目，或它们就是官方考纲。
- 不能声称 Tatoeba / UNPC / WikiMatrix / OpenSubtitles 例句经过考试机构审校，或足以代表真题难度；平行语料仍可能错译。
- 不能声称 Gutenberg 选段是完整作品，或公有领域状态全球一致。
- 不能用文章数量、句子数量推导「学习效果」；这些数字只描述材料规模。
