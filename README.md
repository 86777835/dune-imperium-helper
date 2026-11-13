# 沙丘：帝国助手

线下桌游的中文手机助手：一个站覆盖《沙丘：帝国》与《沙丘：帝国 – 起义》，支持《伊克斯崛起》《不朽之躯》《血脉永续》。原生 JavaScript / Cloudflare Workers，没有运行时构建步骤。

## 功能与文件

- `public/logic.js`：配置校验、五阶段、冲突奖励档位、六人让出与人工裁定边界、终局防重、团队合计、同分排序、撤销；服务端共享。
- `public/steps.js`：按版本、人数、扩展、模组、标准/史诗生成准备清单和阶段提示，每条附官方 PDF 页码。
- `public/app.js`、`index.html`、`style.css`：手机界面、DOM morph、表单草稿、WebSocket 同步、主持人推进、每人终局核对、代填、结算长图和评价。
- `src/worker.js`：Room / Lobby / Archive Durable Objects，服务端权威 reduce 与版本号校验。房间凭四位码访问；主持凭据留在创建手机，不发给其他连接。进入未认领的房间的第一台手机取得主持权。
- 版本预选：总入口的盒子链到 `/?v=base` 或 `/?v=uprising`，从这里建的房间直接选好对应版本，进房后地址栏去掉 `v`。测试见 `tests/test_preselect.mjs`。
- `public/teach.*`（2026-11-13）：「N 分钟讲规则」，带新人快速开局。顶部切换基础版 / 起义（基础版约 5 分钟、起义约 6 分钟）：从总入口带 `?v=` 进来按版本打开，否则用这台手机上次的选择。8 段主流程，重要要素各一句；术语点开看图和注释；「问」按钮把问题连同「（版本：…）」发给规则助手（`chat.js` 的 `window.askRules`）。主流程后是注意事项（基础版 16 条、起义 20 条），每条写好答案，依据 `tools/faq.json` 和规则书。图片在 `public/img/teach/`，截自 Dire Wolf 官方简中规则书，坐标见 `tools/teach_crops.py`。首页「创建新房间」下方是入口卡片。
- `public/history.*`：自动存档，按主版本、模式、人数、扩展、玩家/领袖/房间码筛选，打开原房修订。
- `tools/讲解稿.md`、`tools/faq.json`：10 节讲解、26 条 FAQ，版本标签与来源。`public/guide.*` 提供教程、搜索及过滤。旧简中勘误单列，无 PDF 页码明确注明。
- `src/chat.js`、`src/sse.js`、`public/chat.js`：本站讲解稿和 FAQ 限定问答，Flash → Workers AI Qwen → Pro；9 秒首个回答文字 / 8 秒中途停顿切换。只读匹兹堡 KV 检查状态，不创建 cron，不显示模型名。
- 联网查找（2026-11-12，照匹兹堡移植）：讲解稿和 FAQ 里没有答案的沙丘规则问题，模型只回一行「【需联网】+英文搜索词」，服务器转去调 DeepSeek 搜索接口（`/v1/tools/search`，同一个密钥，6 秒超时；先只搜 BGG，不足 3 条再搜全网，最多 6 条），再让模型只依据摘要作答、用 [1] [2] 标出处。基础版和起义差别大，所以搜索词分版本：基础版以 `Dune Imperium` 开头，起义以 `Dune Imperium Uprising` 开头；总入口问答加在问题前的「（版本：基础版/起义）」会被识别。联网回答要指出摘要属于哪个版本，版本对不上的不能当成本版规则；玩家没说版本时分别说明。页面在这类回答上方固定显示「本站资料没有这一条，以下来自网上讨论，本站未核对」，下面列来源链接；搜不到或搜索失败就明说，不编。无关问题不联网。每次联网在日志里记一条 `chat web search`，用来核对后补进 FAQ。
- `public/img/`：出版社提供的平面盒封与 Codex 生成的原创教程图；来源见 `docs/素材来源.md`。

只输入实物已计算的最终战力；不模拟卡牌、兵力、自动对手、资源钱包或自动战斗。单/双人有说明、官方 companion 入口和结果录入。六人指挥官与盟友独立记录，最后按队合计。

## 本地运行

```sh
wrangler dev --port 8911
```

`wrangler.jsonc` 使用 `dune-imperium-helper`，限流编号 `1081`，`CHAT_STATE` 绑定匹兹堡现有 KV。无 cron。

线上：https://dune.leisurecat.cloud（custom domain）；仓库 86777835/dune-imperium-helper。部署：`wrangler deploy`。

规则助手密钥由用户自行设置：`wrangler secret put DEEPSEEK_API_KEY --name dune-imperium-helper`。无密钥时返回明确错误。

## 测试

在项目根临时建立依赖链接，测试仅访问本地服务；所有评价请求均由 Playwright 拦截。

```sh
ln -s /tmp/claude-501/pgh2/node_modules node_modules
node tests/test_logic.mjs
node tests/test_stream.mjs
node tests/test_authority.mjs
node tests/test_room.mjs
node tests/test_nav.mjs
node tests/test_review.mjs
node tests/test_preselect.mjs
node tests/test_teach.mjs http://localhost:8911/ /tmp/claude-501/codex_tasks/shots   # 只模拟 /api/chat，也可以对线上跑
node tests/test_chat.mjs http://localhost:8911/ /tmp/claude-501/codex_tasks/shots --no-key
# 联网查找：wrangler dev 改加 --var DEEPSEEK_API_KEY:fake --var DEEPSEEK_BASE:http://127.0.0.1:8912 --var CHAT_CF_MODEL:@cf/none/missing
node tests/test_chat.mjs http://localhost:8911/ /tmp/claude-501/codex_tasks/shots --mock-web
rm node_modules
```

Playwright 使用本机 Chrome，390×844 手机视口；导航另查 320px。默认截图目录 `/tmp/claude-501/codex_tasks/shots/`，前缀 `dune_`。测试完整游戏不应对线上运行。

## 内容维护

编辑 `tools/make_content.mjs` 中的讲解与 FAQ 原始数据后：

```sh
node tools/make_content.mjs
python3 tools/build_guide.py tools/讲解稿.md public/guide.html tools/faq.json
```

静态产物已经生成；部署不需要构建。`public/steps.js` 为配置清单来源，应同步核查官方页码和单测。不要把未知规则自动填补为推测答案。

## 规则边界

- 六人标准最多 9 轮；六人史诗按官方专章最多 10 轮，不把 9 轮套到史诗。
- 不朽＋史诗的控制香料放初始弃牌堆，不替换实验；六人指挥官不加该牌。见不朽 p12、六人 PDF p13。
- 跨队三人以上平局同时涉及同队让出：不自动排列，指向起义 p14、六人 p5（PDF p11）。血脉特殊效果未核清时指向血脉 p10。
- Chaumurky 保留英文名以便核对实物，未猜测未在规则正文找到的简中牌名。全部资源仍相同时显示并列，提示补最后揭示顺序；不擅自宣告冠军。
- 没有登录账号系统，房间码用于同桌协作；每人选自己的身份，也能为其他人代填。主持权保存在本机浏览器；请保留主持手机的数据。
- 微信真机未实测；已在 Chrome 手机视口检查触控尺寸、横向溢出、草稿和重连。长图支持长按或下载。

游戏及官方盒封版权归原权利方。本项目是非官方实体桌游辅助工具。
