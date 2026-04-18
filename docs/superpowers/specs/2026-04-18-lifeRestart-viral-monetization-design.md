# lifeRestart 病毒传播 + 买断式内容包改造设计

**日期**：2026-04-18
**状态**：草案待 review
**作者**：Brainstorming session 输出

---

## 1. 背景与定位

原版 lifeRestart（人生重开模拟器）在 2021 年靠"新鲜感 + 微博截图"短期爆火，但由于缺少社交结构、内容深度、长线养成，热度迅速衰退。本次改造的目标是在当前代码基础上，重新把它做成一款可以在手机端病毒传播、持续创收的 Web 游戏。

### 1.1 目标定位

- **分发平台**：纯 Web，手机竖屏优先。抖音/小红书/微信/朋友圈是主要流量来源。
- **商业模式**：**免费基础 + 付费内容包（买断）+ 付费高级账号**。不做抽卡、不卖数值强度、不卖复活、不卖随机物品。
- **长期愿景**：按主题世界线（赛博、修仙、古代、娱乐圈、末日……）持续出付费 DLC，每个 DLC 自成一套独有机制子系统。

### 1.2 为什么不做重氪抽卡

- 破坏游戏原有"轻讽刺、命运荒诞"的气质，影响口碑
- Apple App Store、Google Play 对随机付费物品要求概率披露、国内小游戏平台需版号
- 买断 + 内容包模型在独立游戏圈付费转化更稳，用户对"明确买到什么"接受度高
- "卖内容 / 身份 / 路线 / 收藏 / 便利"比"卖概率"长期 LTV 更高

---

## 2. 商业模式（全景）

| 类别 | 价格区间 | 内容 |
|---|---|---|
| 免费版 | $0 | 基础人生 + Phase 1 新玩法（选择/目标/图鉴/海报/种子挑战） |
| 高级版（买断一次性） | $4.99-$9.99 | 无广告、快速模拟、完整统计、云存档、更多继承槽、海报长图、更多每日挑战次数 |
| 主题人生包 | $2.99-$4.99/个 | 每个独立世界线，含 80-150 个事件 + 20 天赋 + 10 成就 + 5 结局线 + **独有机制子系统** |
| 完整高级版套餐 | $6.99-$12.99 | 高级版 + 已上线主题包打包折扣 |

**明确不卖**：付费抽卡、付费刷好结局、付费复活、付费强制提高稀有天赋概率、广告解锁核心流程。

---

## 3. 核心玩法改造（三层结构）

### 3.1 底层：留存引擎

- **路线图鉴**：皇帝线 / 首富线 / 科学家线 / 修仙线 / 赛博飞升线 / 反派线 / 孤独终老线等。每条线有解锁条件、关键事件、稀有结局，形成收集驱动。
- **跨世界线元系统**（Phase 2+）：图鉴、成就、称号跨所有世界线共享；设计跨界线成就（如"赛博飞升"需赛博包 + 修仙包同时解锁），撬动多包组合购买。

### 3.2 中层：核心玩法

- **关键年龄选择**：在 6、12、18、25、40、60 岁等节点，从"纯随机"切换为"玩家做选择"。每个选择改变属性 + 事件池权重 + 后续路线标签。
- **人生目标**：开局选目标（长寿 / 暴富 / 权力 / 艺术 / 修仙 / 黑科技 / 恋爱 / 普通人逆袭），影响事件池、结算评分、隐藏结局。
- **天赋 Build 组合**（Phase 2）：天赋间互相触发，形成流派（如"社恐+编程天才"→ 宅家创业线，"美貌+家境+社交"→ 名流线）。

### 3.3 表层：传播引擎

- **人生海报**：每局结算自动生成竖版长图，"梗点提取"算法选出本局最离谱的 3 个事件 + 称号 + 稀有度徽章。
- **种子挑战**：每日 UTC 00:00 全服刷新同一随机种子，"同一开局看谁活得更离谱"，天然产生对比向 UGC。
- **稀有度可视化**：隐藏结局触发时独立解锁动画 + "全球仅 X% 玩家达成"字样，作为朋友圈炫耀硬通货。

---

## 4. Phase 1 范围（本次实施重点）

### 4.1 交付目标

一个**可在手机浏览器运行的新版 Web 游戏**，改造核心玩法 + 迁移技术栈，全部免费，不含付费点。用 Phase 1 验证"新玩法是否更好玩、分享率是否足够高、传播漏斗是否通畅"，为后续付费内容包做流量基础。

### 4.2 包含的功能

**玩法改造**：
1. 关键年龄选择系统（6/12/18/25/40/60 岁节点插入选择 UI）
2. 人生目标选择（开局界面新增目标选择步骤）
3. 路线图鉴（结算后显示本局触发的路线 + 全图鉴完成度）
4. 人生海报（结算页一键生成长图，可保存/分享）
5. 种子挑战（首页入口 + 每日种子 + 结果展示）

**技术改造**：
6. 从 Laya + 原生 JS 迁移到 **Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui + Zustand + Framer Motion**
7. 手机竖屏优先（390×844 基准），竖屏锁定，安全区适配
8. `src/modules/*.js` 全部 TS 化迁移到 `src/core/*.ts`
9. 原地迁移：保留 `public/*.json` 数据，重写 UI 层，删除 Laya 相关文件

### 4.3 明确不做

- 天赋 Build 组合（依赖更大天赋池，与 Phase 2 主题包同步开发）
- 新主题世界线（Phase 2 首个商业 DLC 做赛博）
- 每日挑战（与种子挑战区别：每日挑战是"特定命题人生"，Phase 2 做）
- 云存档 / 账号体系（Phase 2 高级版做，Phase 1 只用 localStorage）
- 付费点（Phase 2 开始做）
- 跨界线成就系统（依赖多个主题包，Phase 2+）

---

## 5. Phase 1 架构设计

### 5.1 目录结构

```
src/
  core/                      # 纯 TS 游戏逻辑，无 UI 依赖
    life.ts                  # 主循环，改造自 src/modules/life.js
    property.ts              # 属性系统，改造自 property.js
    talent.ts                # 天赋系统，改造自 talent.js
    event.ts                 # 事件系统，改造自 event.js
    achievement.ts           # 成就系统，改造自 achievement.js
    choice.ts                # 新增：关键年龄选择
    goal.ts                  # 新增：人生目标
    route.ts                 # 新增：路线图鉴
    poster.ts                # 新增：海报数据提取
    seed.ts                  # 新增：种子挑战
    types.ts                 # 公共类型定义
  components/                # React UI 组件
    ui/                      # shadcn 原子组件
    game/                    # 游戏业务组件（AgeCard / ChoiceModal / PosterView 等）
  pages/                     # 页面级组件（可做路由，也可做 SPA 状态机）
    HomePage.tsx
    SetupPage.tsx            # 选天赋 / 分配属性 / 选人生目标
    PlayPage.tsx             # 年龄推进
    SummaryPage.tsx          # 结算 + 海报
    DexPage.tsx              # 路线图鉴
    SeedPage.tsx             # 种子挑战
  store/                     # Zustand
    gameStore.ts             # 游戏状态（含 persist 中间件到 localStorage）
    dexStore.ts              # 图鉴状态
  data/                      # 运行时数据加载
    loader.ts                # 从 public/*.json 加载
    schema.ts                # 数据结构类型
  styles/
    globals.css              # Tailwind 基础
  main.tsx
  App.tsx
public/                      # 保留原数据
  events/*.json
  talents/*.json
  achievements/*.json
  ... （其余资源 images/fonts/particle 保留需要的）
```

**删除**：`src/ui/`（Laya UI）、`src/app.js`、`lifeRestart.laya`、`laya/`、`template/`、`src/functions/`（并入 `src/core/`）。

**保留但简化**：`src/i18n/` 只保留 `zh.js` 和基础加载器（Phase 1 锁中文，但保留 `t(key)` 调用习惯和目录结构，避免 Phase 2+ 国际化时再大改）。

**保留参考**：`repl/` 作为核心逻辑的命令行测试入口，Phase 1 结束前确保命令行版仍能跑，作为 `src/core/` 的黑盒验证。

### 5.1.1 原地迁移的并存与切换流程

Phase 1 执行过程中，新旧代码会有一段时间并存。策略如下：

1. **里程碑 M1：脚手架搭建**。在仓库根新建 `src-next/`（最终切换时改回 `src/`），初始化 Vite + React + TS + Tailwind 骨架，与老的 Laya 项目完全隔离。`package.json` 增加 `dev:next` / `build:next` 脚本，老的 `dev` / `build` 保持可运行，方便对比。
2. **里程碑 M2：核心逻辑 TS 迁移**。把 `src/modules/*.js` 逐文件翻译到 `src-next/core/*.ts`，每翻译完一个文件，用 `repl/` 的命令行版做差异回归测试（同一组输入，新旧两份代码输出一致）。
3. **里程碑 M3：UI 层 + Phase 1 新玩法**。在 `src-next/` 里实现所有 React 页面 + 选择/目标/图鉴/海报/种子挑战。老项目继续可跑。
4. **里程碑 M4：数据迁移**。补齐事件的 `drama` 字段、路线 tag、新增 goals/routes/choices 目录。xlsx 源头加新列或新表，调整 `pnpm xlsx2json` 输出。
5. **里程碑 M5：切换**。整体验证通过后，一次性提交：删除老 `src/`，把 `src-next/` 改名为 `src/`，`package.json` 脚本指向新路径，删除 `laya/` `template/` `lifeRestart.laya` `src/ui/` `src/app.js` 等 Laya 残留。这一步是单独的 PR/commit，便于 review 和回滚。

### 5.2 核心循环改造（`life.ts` 的 `next()`）

**原版 `life.js:134` 逻辑**：
```
next() {
  const {age, event, talent} = property.ageNext();
  const talentContent = doTalent(talent);
  const eventContent = doEvent(random(event));   // 随机抽一个事件
  const isEnd = property.isEnd();
  return { age, content: [talentContent, eventContent].flat(), isEnd };
}
```

**改造后逻辑（伪代码）**：
```
next(): NextResult {
  const { age, event, talent } = property.ageNext();
  const talentContent = doTalent(talent);

  // 关键节点检查
  if (isChoicePoint(age)) {
    const choice = choiceSystem.buildChoice(age, currentState);
    return { age, kind: 'choice', choice, talentContent };
  }

  // 目标加权抽事件
  const eventId = weightedRandom(event, goal.getWeightFor(currentState));
  const eventContent = doEvent(eventId);

  // 路线标签判定
  route.checkAndApply(age, eventContent, currentState);

  const isEnd = property.isEnd();
  return { age, kind: 'normal', content: [talentContent, eventContent].flat(), isEnd };
}

// 新增方法：应用玩家的选择
applyChoice(choiceId: string, optionId: string): NextResult {
  const option = choice.getOption(choiceId, optionId);
  property.apply(option.effects);        // 改属性
  route.addTags(option.tags);            // 加路线标签
  return next();                         // 继续推进
}
```

**调用方（React 层）**：
```
// store/gameStore.ts
advance: () => {
  const result = life.next();
  if (result.kind === 'choice') {
    set({ pending: result.choice });     // UI 弹选择框
  } else {
    set({ log: [...log, ...result.content] });
  }
}
resolveChoice: (optionId) => {
  const result = life.applyChoice(pendingChoiceId, optionId);
  // 同上
}
```

### 5.3 数据结构扩展（JSON schema）

所有新增数据放在 `public/` 下对应子目录，走 `data/loader.ts` 统一加载。

**关键年龄选择**（`public/choices/*.json`）：
```jsonc
{
  "id": "choice_age12_music",
  "age": 12,
  "trigger": { "property": "TLT", "op": "contains", "value": "1004" },  // 例如有音乐天赋才触发
  "title": "你被发现有音乐天赋",
  "options": [
    { "id": "A", "label": "专心训练", "effects": {"INT":+1, "HAP":-1}, "tags": ["child_star"] },
    { "id": "B", "label": "当作爱好", "effects": {"HAP":+1}, "tags": [] },
    { "id": "C", "label": "拒绝安排", "effects": {}, "tags": ["rebel"] }
  ]
}
```

触发优先级：若多个 choice 同一年龄满足条件，按优先级字段排序取最高的一个；如无触发则跳过该节点继续走随机事件流程。

**人生目标**（`public/goals/*.json`）：
```jsonc
{
  "id": "goal_longevity",
  "name": "长寿",
  "description": "活得比所有人都久",
  "eventWeights": { "tag:health": 1.5, "tag:illness": 0.7 },
  "scoreBonus": { "AGE_min_80": 20, "AGE_min_100": 50 },
  "unlockEndings": ["ending_centenarian"]
}
```

**路线图鉴**（`public/routes/*.json`）：
```jsonc
{
  "id": "route_scholar",
  "name": "寒门学者",
  "description": "从贫寒中走出的学问人",
  "conditions": [
    { "tag": "poor_origin", "atAge": 6 },
    { "tag": "studious", "atAge": 18 },
    { "property": "INT", "op": ">=", "value": 9, "atAge": 25 }
  ],
  "rarity": "SR",
  "estimatedDropRate": 0.042
}
```

路线判定时机：每次事件/选择应用完 tag 后调用 `route.checkAndApply`，满足所有条件则标记本局触发，存入图鉴。

### 5.4 人生海报生成

- 结算时 `poster.buildPosterData(history)` 提取：
  - 本局触发的路线（最稀有的 1 条）
  - 3 个"梗点事件"（按事件稀有度 + 戏剧性评分排序，数据在事件 JSON 中预标注 `drama: 0-10`）
  - 最终称号（根据目标完成度 + 路线组合生成）
  - 寿命 / 最终属性雷达图简化版
  - 稀有度徽章
- React 层用 `html-to-image` 把指定 DOM 导出 PNG，390×844 的 2x 图，用户可下载或分享
- 海报右下角二维码/短链（Phase 1 可先占位，Phase 2 接域名）

### 5.5 种子挑战

- `seed.ts`：根据当日日期（UTC）生成确定性种子 `seed = hash(dateString)`
- 所有随机调用通过 `seedRandom(seed)` 走可复现的 PRNG（用 `mulberry32` 或 `seedrandom` 库）
- 挑战结果仅在本地记录（Phase 1 无账号）；海报中包含"种子挑战 · 2026-04-18"标签便于跨用户对比

### 5.6 状态管理

- `gameStore`：当前局状态（age, properties, talents, history, pendingChoice, log）
- 使用 `zustand/middleware` 的 `persist` 写到 localStorage：
  - 保存：图鉴解锁情况、最近 5 局历史、种子挑战记录、音频/视觉设置
  - 不保存：当前进行中的一局（刷新即丢弃，避免复杂的中断恢复逻辑）

### 5.7 移动端规范

- **视口**：`<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
- **竖屏锁定**：通过 CSS 媒体查询 `@media (orientation: landscape)` 显示"请竖屏游玩"遮罩
- **设计基准**：390×844（iPhone 14）；用 Tailwind `min-h-dvh` 动态视口高度避免 iOS Safari 地址栏抖动
- **安全区**：所有固定底部元素用 `pb-[env(safe-area-inset-bottom)]`
- **点击热区**：按钮最小 44×44px
- **字号基准**：正文 16px，标题 18-22px，小字 14px
- **交互反馈**：所有点击走 Framer Motion 的 `whileTap={{ scale: 0.95 }}`
- **性能**：首屏 JS 控制在 150KB gzip 以内，字体用系统字体栈不加载外部字体

---

## 6. 合规与品味底线

**不做的事**（无论 Phase 几）：
- 付费抽卡 / 付费提高稀有天赋概率 / 付费随机物品
- 付费复活 / 付费强制好结局
- 广告解锁核心流程（看广告才能继续玩）
- 未成年人诱导付费设计

**遵守的规范**：
- Apple App Store Review Guidelines（数字内容走 IAP，随机付费物品需概率披露）
- Google Play Payments Policy（应用内数字商品需走 Play Billing）
- 中国大陆小游戏平台抽卡概率公示、未成年人限额政策（虽然 Phase 1 是 Web 不直接适用，但为 Phase 2+ 可能的小程序版本预留合规空间）

---

## 7. 风险与未解决问题

| 风险 | 应对 |
|---|---|
| 现有事件数据没有 `drama` / 路线 `tag` 字段，海报梗点提取和路线判定缺少原材料 | Phase 1 首个里程碑是数据迁移脚本 + 补标注（先随机给所有事件一个 drama=5，路线 tag 基于关键词启发式初标，后续人工精修） |
| 命令行版 `repl/` 依赖老的 `src/modules/`，迁移后可能断裂 | Phase 1 中期做 `repl` 对 `src/core/` 的适配，把它作为核心逻辑的自动化回归测试入口 |
| `public/*.json` 由 xlsx 转换生成，迁移后源头 xlsx 仍是老格式 | 保留 `pnpm xlsx2json` 流程，只调整输出 schema；新字段先放在独立 xlsx 文件里，不污染原有 |
| 竖屏锁定对横屏用户有流失 | Phase 1 接受这个流失，数据监测后 Phase 2 评估是否做横屏版 |
| Phase 1 没有账号/云存档，用户清 localStorage 会丢图鉴 | 可接受，Phase 2 上高级版时做云存档一并解决 |

---

## 8. Phase 2+ 预留

以下不在本 spec 范围内，但架构需为它们留接口：

1. **内容包注册架构**：每个主题包是独立 npm 子模块或动态加载的 JSON 包，包含自己的 events/talents/routes/choices 以及**独有机制子系统**（通过注册"属性扩展"和"计算钩子"挂到 core 层）
2. **首个商业 DLC：赛博人生**（$3.99）：义体槽 / 债务累积 / 网络声望 / 过载风险机制
3. **高级版账号系统**：云存档、跨设备同步、完整统计、海报长图
4. **每日命题挑战**（区别于种子挑战）
5. **跨界线成就**（需 2+ 主题包）
6. **天赋 Build 组合**（依赖更大天赋池）
7. **国际化**：英文 + 可能的日文/韩文

---

## 9. 成功指标（Phase 1）

- **核心玩法验证**：新版本平均单局时长 ≥ 原版 1.5x
- **留存**：Day 1 留存 ≥ 25%，Day 7 留存 ≥ 8%
- **传播**：海报生成率 ≥ 30%（结算后主动点生成海报的比例）、种子挑战日活占比 ≥ 15%
- **技术**：首屏加载 ≤ 2.5s（4G 网络）、首屏 JS ≤ 150KB gzip
- **Phase 1 完成标志**：以上指标有数据可测（即使不达标也算完成，数据用于决策 Phase 2 方向）

---

## 附录 A：原项目关键文件索引

- `src/modules/life.js:134` — 原核心推进函数 `next()`，改造起点
- `src/modules/property.js` — 属性系统，`ageNext()` 返回当年可触发的 event/talent
- `src/modules/event.js` — 事件加载和执行
- `src/modules/talent.js` — 天赋加载和替换
- `src/modules/achievement.js` — 成就触发
- `public/events/*.json` — 事件数据
- `public/talents/*.json` — 天赋数据
- `repl/index.js` — 命令行版入口，可作为核心逻辑回归测试基线
