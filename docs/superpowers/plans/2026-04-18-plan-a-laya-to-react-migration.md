# Plan A：Laya → React/TS 迁移实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal**：把 lifeRestart 从 Laya + 原生 JS 迁移到 Vite + React 18 + TypeScript + Tailwind 的手机优先 Web 应用，**玩法 100% 不变**，通过 REPL 快照回归验证 core 层行为等价。

**Architecture**：新代码在 `src-next/` 并存老代码构建，先用 deterministic REPL 生成 3 个基线 fixture，然后 1:1 翻译 `src/modules/*.js` 和 `src/functions/*.js` 到 `src-next/core/*.ts`，每次 port 完跑快照回归确保等价。UI 层用 React + Zustand 复刻现有 Laya 的 4 个屏（主菜单 / 天赋属性设置 / 年龄推进 / 结算），移动端竖屏优先。全部完成后一次原子 commit 切换（删 `src/` → `src-next/` 改名 `src/` → 清 Laya 残留）。

**Tech Stack**：Vite 8（已装）、React 18、TypeScript 5、Tailwind CSS 3、shadcn/ui primitives（复制到本地，不作为依赖安装）、Zustand 5、Framer Motion 11、Vitest（已装）、@testing-library/react 16、@testing-library/jest-dom、`happy-dom`（vitest 环境）、`mulberry32` 内联 PRNG。

---

## 文件结构（locked-in）

**新建**（在 `src-next/` 下）：

| 文件 | 责任 |
|---|---|
| `src-next/main.tsx` | React 入口 |
| `src-next/App.tsx` | 顶层页面路由/状态机 |
| `src-next/styles/globals.css` | Tailwind 指令 + 全局 reset |
| `src-next/components/LandscapeLockout.tsx` | 横屏时显示遮罩 |
| `src-next/components/ui/button.tsx` | shadcn button（复制） |
| `src-next/components/ui/card.tsx` | shadcn card |
| `src-next/components/game/TalentCard.tsx` | 天赋卡片（设置阶段） |
| `src-next/components/game/PropertyAllocator.tsx` | 属性分配器 |
| `src-next/components/game/AgeLine.tsx` | 年龄行（轨迹阶段） |
| `src-next/components/game/SummaryTable.tsx` | 结算属性表 |
| `src-next/pages/HomePage.tsx` | 主菜单 |
| `src-next/pages/SetupPage.tsx` | 天赋选择 + 属性分配 |
| `src-next/pages/PlayPage.tsx` | 年龄推进 |
| `src-next/pages/SummaryPage.tsx` | 结算 + 继承天赋选择 |
| `src-next/store/gameStore.ts` | Zustand 游戏状态 + localStorage 持久化 |
| `src-next/store/index.ts` | store 桶文件 |
| `src-next/core/types.ts` | 核心类型定义 |
| `src-next/core/config.ts` | 共享游戏配置（从 repl+src/index 提取） |
| `src-next/core/util.ts` | 工具函数（从 src/functions/util.js 迁移） |
| `src-next/core/condition.ts` | 条件判定（从 src/functions/condition.js 迁移） |
| `src-next/core/events.ts` | 事件总线（替代 globalThis.$$on/$$event） |
| `src-next/core/data/loader.ts` | JSON 加载器（替代 globalThis.json） |
| `src-next/core/achievement.ts` | 成就模块 port |
| `src-next/core/event.ts` | 事件模块 port |
| `src-next/core/talent.ts` | 天赋模块 port |
| `src-next/core/property.ts` | 属性模块 port |
| `src-next/core/character.ts` | 角色模块 port |
| `src-next/core/life.ts` | 主循环 port |
| `src-next/core/index.ts` | core 桶文件 |
| `src-next/i18n/zh-cn.ts` | 中文词表（从 src/i18n/zh-cn.js 迁移） |
| `src-next/vite.config.ts` | Vite 配置（覆写后用于 dev:next / build:next） |
| `src-next/tsconfig.json` | TS 配置，strict mode，path alias |
| `src-next/index.html` | 手机优先 HTML 壳 |
| `tests/fixtures/repl-seed-42.txt` | 回归基线 |
| `tests/fixtures/repl-seed-1337.txt` | 回归基线 |
| `tests/fixtures/repl-seed-2024.txt` | 回归基线 |
| `repl/deterministic.js` | 种子化运行脚本（Plan A 临时文件，M5 时删除） |
| `repl/harness.js` | 回归 diff harness |

**修改**：
- `package.json` — 加依赖、加脚本
- `.gitignore` — 加 `tests/fixtures/*.actual.txt`

**M5 删除**：`src/`（整个老代码）、`src/ui/`、`src/app.js`、`lifeRestart.laya`、`laya/`、`template/`、`src-next/` 目录重命名为 `src/`、`repl/deterministic.js`、`repl/harness.js`。

---

## 开发约定

- **提交粒度**：每个 task 结束时 commit，commit 信息用英文，短句，祈使句式，形如 `feat: port property module to TS` 或 `test: add repl regression baseline`。
- **分支**：直接在 `main` 上开发（用户没有要求分支或 worktree）。
- **依赖管理**：使用 `pnpm`（项目已配置 `pnpm-lock.yaml`）。所有 `pnpm add` 都加 `-D`（开发依赖）除非生产代码直接 import。
- **类型严格度**：`tsconfig.strict: true`。所有 `any` 必须显式注释原因。
- **测试运行**：默认 `pnpm test`（单跑）；回归 diff 跑 `pnpm test:repl`。
- **不在 Plan A 中做**：新玩法（choice/goal/dex/poster/seed）、PWA、i18n 扩展、性能优化。

---

## Part 1：脚手架（M1）

### Task 1：安装依赖 + 初始化 src-next 骨架

**Files:**
- Modify: `package.json`
- Create: `src-next/main.tsx`
- Create: `src-next/App.tsx`
- Create: `src-next/index.html`
- Create: `src-next/tsconfig.json`
- Create: `src-next/vite.config.ts`

- [ ] **Step 1: 安装运行时依赖**

```bash
pnpm add react@^18.3.1 react-dom@^18.3.1 zustand@^5.0.0 framer-motion@^11.11.0
```

预期：`package.json` 出现这 4 个包在 `dependencies`。

- [ ] **Step 2: 安装开发依赖**

```bash
pnpm add -D typescript@^5.6.0 @types/react@^18.3.0 @types/react-dom@^18.3.0 @vitejs/plugin-react@^6.0.0 tailwindcss@^3.4.0 postcss@^8.4.0 autoprefixer@^10.4.0 @testing-library/react@^16.0.0 @testing-library/jest-dom@^6.5.0 happy-dom@^15.7.0
```

- [ ] **Step 3: 创建 src-next/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowImportingTsExtensions": false,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: 创建 src-next/vite.config.ts**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  server: { port: 5174, host: true },
  build: {
    outDir: '../dist-next',
    emptyOutDir: true,
  },
  publicDir: '../public',
})
```

- [ ] **Step 5: 创建 src-next/index.html**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#0f172a" />
    <link rel="icon" href="/favicon.ico" />
    <title>人生重开模拟器</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: 创建 src-next/main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 7: 创建 src-next/App.tsx**

```tsx
export default function App() {
  return <div className="p-4">Hello lifeRestart (next)</div>
}
```

- [ ] **Step 8: 加脚本到 package.json**

在 `package.json` 的 `scripts` 对象中加入：

```json
"dev:next": "vite --config src-next/vite.config.ts",
"build:next": "vite build --config src-next/vite.config.ts"
```

- [ ] **Step 9: 启动验证**

```bash
pnpm dev:next
```

预期：输出 `Local: http://localhost:5174/`，浏览器打开能看到 "Hello lifeRestart (next)"。Ctrl-C 关闭。

- [ ] **Step 10: Commit**

```bash
git add package.json pnpm-lock.yaml src-next/
git commit -m "feat: scaffold src-next with vite + react 18 + ts"
```

---

### Task 2：Tailwind + 手机视口 + 横屏锁定

**Files:**
- Create: `src-next/tailwind.config.js`
- Create: `src-next/postcss.config.js`
- Create: `src-next/styles/globals.css`
- Create: `src-next/components/LandscapeLockout.tsx`
- Modify: `src-next/App.tsx`
- Modify: `src-next/main.tsx`

- [ ] **Step 1: 创建 tailwind 配置**

`src-next/tailwind.config.js`：

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './**/*.{ts,tsx}'],
  theme: {
    extend: {
      minHeight: { dvh: '100dvh' },
      height: { dvh: '100dvh' },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 2: 创建 postcss 配置**

`src-next/postcss.config.js`：

```js
export default {
  plugins: {
    tailwindcss: { config: './src-next/tailwind.config.js' },
    autoprefixer: {},
  },
}
```

- [ ] **Step 3: 创建 globals.css**

`src-next/styles/globals.css`：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root {
  @apply h-dvh overflow-hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  user-select: none;
}

body {
  @apply bg-slate-900 text-slate-100;
}
```

- [ ] **Step 4: 创建 LandscapeLockout 组件**

`src-next/components/LandscapeLockout.tsx`：

```tsx
import { useEffect, useState } from 'react'

export function LandscapeLockout({ children }: { children: React.ReactNode }) {
  const [isLandscape, setIsLandscape] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape) and (max-height: 500px)')
    const update = () => setIsLandscape(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  if (isLandscape) {
    return (
      <div className="flex h-dvh items-center justify-center bg-slate-900 text-slate-100 p-8 text-center">
        <div>
          <div className="text-4xl mb-4">📱</div>
          <div className="text-lg">请竖屏游玩</div>
          <div className="text-sm text-slate-400 mt-2">Please rotate your device</div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
```

- [ ] **Step 5: 修改 main.tsx 引入样式**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 6: 修改 App.tsx 包裹 Lockout**

```tsx
import { LandscapeLockout } from './components/LandscapeLockout'

export default function App() {
  return (
    <LandscapeLockout>
      <div className="h-dvh bg-slate-900 text-slate-100 flex items-center justify-center pt-safe-top pb-safe-bottom">
        <div className="text-xl">Hello lifeRestart (next)</div>
      </div>
    </LandscapeLockout>
  )
}
```

- [ ] **Step 7: 手动验证**

```bash
pnpm dev:next
```

浏览器 DevTools → Toggle Device Toolbar → iPhone 14 预设。预期竖屏显示 "Hello lifeRestart (next)"；切换为横屏预期显示 "请竖屏游玩"。Ctrl-C 关闭。

- [ ] **Step 8: Commit**

```bash
git add src-next/
git commit -m "feat: add tailwind + mobile viewport + landscape lockout"
```

---

### Task 3：Vitest + RTL 测试框架

**Files:**
- Create: `src-next/vitest.config.ts`
- Create: `src-next/vitest.setup.ts`
- Create: `src-next/components/LandscapeLockout.test.tsx`
- Modify: `package.json`

- [ ] **Step 1: 创建 vitest 配置**

`src-next/vitest.config.ts`：

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['./**/*.{test,spec}.{ts,tsx}'],
  },
})
```

- [ ] **Step 2: 创建 setup**

`src-next/vitest.setup.ts`：

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 3: 写组件测试（红灯 → 绿灯）**

`src-next/components/LandscapeLockout.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LandscapeLockout } from './LandscapeLockout'

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    media: '',
    onchange: null,
  }))
}

describe('LandscapeLockout', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders children when portrait', () => {
    mockMatchMedia(false)
    render(<LandscapeLockout><div>Game</div></LandscapeLockout>)
    expect(screen.getByText('Game')).toBeInTheDocument()
    expect(screen.queryByText('请竖屏游玩')).not.toBeInTheDocument()
  })

  it('renders rotate prompt when landscape', () => {
    mockMatchMedia(true)
    render(<LandscapeLockout><div>Game</div></LandscapeLockout>)
    expect(screen.getByText('请竖屏游玩')).toBeInTheDocument()
    expect(screen.queryByText('Game')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 4: 加测试脚本**

`package.json` 的 `scripts` 加入：

```json
"test:next": "vitest run --config src-next/vitest.config.ts",
"test:next:watch": "vitest --config src-next/vitest.config.ts"
```

- [ ] **Step 5: 跑测试**

```bash
pnpm test:next
```

预期：2 passed。若失败读错误信息调整。

- [ ] **Step 6: Commit**

```bash
git add src-next/vitest.config.ts src-next/vitest.setup.ts src-next/components/LandscapeLockout.test.tsx package.json
git commit -m "test: add vitest + rtl harness for src-next"
```

---

## Part 2：回归基线（M2 的安全网）

### Task 4：种子化 REPL 运行脚本

目标：让 `repl/` 能接受一个固定 seed，跑一段预定义的命令序列（`remake → random → attribute 分配 → next × 100`），把输出捕获到文件。这样我们有一个"老代码确定性输出"可以作为迁移后的回归基线。

**Files:**
- Create: `repl/deterministic.js`
- Modify: `package.json`

- [ ] **Step 1: 阅读 repl/app.js 了解 API**

已知：`App.repl(command)` 接受字符串返回输出；`$$on('achievement', ...)` 订阅成就；游戏流程 `remake → select → next → next` 会走完 4 个 Steps。

- [ ] **Step 2: 创建 deterministic.js**

`repl/deterministic.js`：

```js
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { readFile } from 'fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

globalThis.localStorage = {
  getItem: key => globalThis.localStorage[key] ?? null,
  setItem: (key, val) => { globalThis.localStorage[key] = val },
}

// Seeded PRNG: mulberry32
function mulberry32(a) {
  return function() {
    a |= 0
    a = a + 0x6D2B79F5 | 0
    let t = Math.imul(a ^ a >>> 15, 1 | a)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

const seed = Number(process.argv[2] ?? 42)
const rng = mulberry32(seed)
Math.random = rng  // Override global before loading App

const { default: App } = await import('./app.js')

const outputs = []
const app = new App()
app.io(
  () => {},  // no input
  (data, isRepl) => outputs.push(String(data)),
  () => {}
)
await app.initial()

const commands = [
  '/remake',
  '/random',       // random talent pick
  '/next',         // move to property step
  '/random',       // random property alloc
  '/next',         // start trajectory
]
for (let i = 0; i < 120; i++) commands.push('/next')  // advance 120 "next"s (handles end-of-life naturally)
commands.push('/next')  // enter summary
commands.push('/random')  // pick random talent extend
commands.push('/next')  // finalize

for (const c of commands) {
  const ret = app.repl(c)
  if (!ret) continue
  if (typeof ret === 'string') outputs.push(ret)
  else if (Array.isArray(ret)) outputs.push(ret.join('\n'))
  else outputs.push(ret.message)
}

// Strip ANSI color codes for stable diff
const clean = outputs.join('\n').replace(/\x1B\[[0-9;]*[A-Za-z]/g, '')
process.stdout.write(clean)
```

- [ ] **Step 3: 加脚本到 package.json**

```json
"repl:deterministic": "node repl/deterministic.js"
```

- [ ] **Step 4: 跑一次看输出**

```bash
pnpm repl:deterministic 42 > /tmp/seed-42-preview.txt
head -50 /tmp/seed-42-preview.txt
```

预期：看到类似 "人生重开模拟器" 起始 + 天赋列表 + 属性分配 + 每年的事件文本。若报错（如数据未生成），先跑 `pnpm xlsx2json` 生成数据再重试。

- [ ] **Step 5: Commit**

```bash
git add repl/deterministic.js package.json
git commit -m "test: add deterministic seeded repl runner"
```

---

### Task 5：捕获回归基线 + diff harness

**Files:**
- Create: `tests/fixtures/repl-seed-42.txt`
- Create: `tests/fixtures/repl-seed-1337.txt`
- Create: `tests/fixtures/repl-seed-2024.txt`
- Create: `repl/harness.js`
- Create: `tests/core-regression.test.js`
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: 生成 3 个基线 fixture**

```bash
mkdir -p tests/fixtures
pnpm repl:deterministic 42 > tests/fixtures/repl-seed-42.txt
pnpm repl:deterministic 1337 > tests/fixtures/repl-seed-1337.txt
pnpm repl:deterministic 2024 > tests/fixtures/repl-seed-2024.txt
wc -l tests/fixtures/*.txt
```

预期：每个文件 >= 100 行。

- [ ] **Step 2: 创建 diff harness**

`repl/harness.js`：

```js
import { readFile } from 'fs/promises'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

export async function runSeed(seed, script = 'repl/deterministic.js') {
  return new Promise((resolve, reject) => {
    const p = spawn('node', [script, String(seed)], { cwd: root })
    let stdout = ''
    let stderr = ''
    p.stdout.on('data', d => stdout += d)
    p.stderr.on('data', d => stderr += d)
    p.on('close', code => {
      if (code !== 0) return reject(new Error(`exit ${code}: ${stderr}`))
      resolve(stdout)
    })
  })
}

export async function readFixture(seed) {
  return await readFile(join(root, `tests/fixtures/repl-seed-${seed}.txt`), 'utf8')
}
```

- [ ] **Step 3: 写回归测试（用根目录 vitest 跑）**

`tests/core-regression.test.js`：

```js
import { describe, it, expect } from 'vitest'
import { runSeed, readFixture } from '../repl/harness.js'

const SEEDS = [42, 1337, 2024]

describe('core behavior regression (baseline = current src/modules)', () => {
  for (const seed of SEEDS) {
    it(`seed ${seed} matches fixture`, async () => {
      const expected = await readFixture(seed)
      const actual = await runSeed(seed, 'repl/deterministic.js')
      expect(actual).toBe(expected)
    }, 60000)
  }
})
```

- [ ] **Step 4: 加根目录测试脚本**

`package.json` scripts 加：

```json
"test:repl": "vitest run tests/core-regression.test.js"
```

- [ ] **Step 5: 跑回归，验证绿灯**

```bash
pnpm test:repl
```

预期：3 passed。此时"新"脚本和"老"fixture 是同一套代码，必须 100% 一致。若失败说明 deterministic.js 有非确定性漏网，排查。

- [ ] **Step 6: 加 .gitignore**

追加到 `.gitignore`：

```
tests/fixtures/*.actual.txt
```

- [ ] **Step 7: Commit**

```bash
git add tests/ repl/harness.js package.json .gitignore
git commit -m "test: capture repl baseline fixtures for 3 seeds"
```

---

## Part 3：核心 TS 迁移（M2）

**迁移策略**：对每个 JS 文件，创建对应 TS 文件翻译代码（保留方法签名、字段名、行为），在 `src-next/core/index.ts` 桶中导出；每迁移一个关键文件（property/talent/life）就运行 Task 15 的适配脚本跑回归。

**Ground rule**：**不能重构**，只能翻译。任何"顺便优化"都推到 Plan B。

### Task 6：types.ts + config.ts

**Files:**
- Create: `src-next/core/types.ts`
- Create: `src-next/core/config.ts`
- Create: `src-next/core/types.test.ts`

- [ ] **Step 1: 读源以识别所有公共类型**

相关代码：`src/modules/property.js`（PropertyTypes 常量）、`src/modules/life.js`（AchievementOpportunity）、`src/modules/talent.js`（grade 取值 1/2/3）、`src/i18n/zh-cn.js`（判级 key）。

- [ ] **Step 2: 写 types.ts**

`src-next/core/types.ts`：

```ts
// PropertyType mirrors property.js TYPES (35 keys). Keep 1:1.
export const PropertyType = {
  AGE: 'AGE',
  CHR: 'CHR', INT: 'INT', STR: 'STR', MNY: 'MNY',
  SPR: 'SPR', LIF: 'LIF', TLT: 'TLT', EVT: 'EVT', TMS: 'TMS',
  LAGE: 'LAGE', HAGE: 'HAGE',
  LCHR: 'LCHR', HCHR: 'HCHR',
  LINT: 'LINT', HINT: 'HINT',
  LSTR: 'LSTR', HSTR: 'HSTR',
  LMNY: 'LMNY', HMNY: 'HMNY',
  LSPR: 'LSPR', HSPR: 'HSPR',
  SUM: 'SUM',
  EXT: 'EXT',
  ATLT: 'ATLT', AEVT: 'AEVT', ACHV: 'ACHV',
  CTLT: 'CTLT', CEVT: 'CEVT', CACHV: 'CACHV',
  TTLT: 'TTLT', TEVT: 'TEVT', TACHV: 'TACHV',
  REVT: 'REVT', RTLT: 'RTLT', RACHV: 'RACHV',
  RDM: 'RDM',
} as const

export type PropertyTypeKey = typeof PropertyType[keyof typeof PropertyType]

export const AchievementOpportunity = {
  START: 'START',
  END: 'END',
  TRAJECTORY: 'TRAJECTORY',
  SUMMARY: 'SUMMARY',
} as const

export type AchievementOpportunityKey =
  typeof AchievementOpportunity[keyof typeof AchievementOpportunity]

export type TalentGrade = 0 | 1 | 2 | 3

export interface TalentMeta {
  id: number                     // talent.js line 17: Number(id)
  name: string
  description: string
  grade: TalentGrade
  exclusive?: number             // flag (value 1) — not pullable in random pool
  exclude?: string[]             // mutual-exclusion list of talent ids
  condition?: string
  effect?: Record<string, number>
  replacement?: Record<string, number>
  status?: number
  max_triggers?: number
}

export interface EventMeta {
  id: number
  event: string
  include?: string
  exclude?: string
  NoRandom?: number
  effect?: Record<string, number>
  postEvent?: string
  branch?: Array<[string, number]>  // event.js parses "cond:id" → [cond, Number(id)]
  grade?: TalentGrade
}

export interface AchievementMeta {
  id: number
  name: string
  description: string
  opportunity: AchievementOpportunityKey
  condition: string
  grade?: TalentGrade
  hide?: number
}

export interface LifeConfig {
  defaultPropertyPoints: number
  talentSelectLimit: number
  propertyAllocateLimit: [number, number]
  defaultPropertys: Partial<Record<PropertyTypeKey, number>>
  talentConfig: {
    talentPullCount: number
    talentRate: Record<string, number>
    additions: Record<string, Array<[number, Record<string, number>]>>
  }
  propertyConfig: {
    judge: Record<string, Array<[number, TalentGrade] | [number, TalentGrade, string]>>
  }
  characterConfig: {
    characterPullCount: number
    rateableKnife: number
    propertyWeight: Array<[number, number]>
    talentWeight: Array<[number, number]>
  }
}

export interface TrajectoryContent {
  type: 'TLT' | 'EVT'
  name?: string
  grade?: TalentGrade
  description: string
  postEvent?: string
}

export interface NextResult {
  age: number
  content: TrajectoryContent[]
  isEnd: boolean
}

// property.judge() returns {prop, value, judge, grade, progress}
export interface SummaryEntry {
  prop: string
  value: number
  grade: TalentGrade
  judge: string
  progress: number
}

export type LifeSummary = Partial<Record<PropertyTypeKey, SummaryEntry>>
```

- [ ] **Step 3: 写 config.ts（从 repl/app.js 的 config 逐字迁移）**

`src-next/core/config.ts`：

```ts
import type { LifeConfig } from './types'

export const defaultConfig: LifeConfig = {
  defaultPropertyPoints: 20,
  talentSelectLimit: 3,
  propertyAllocateLimit: [0, 10],
  defaultPropertys: { SPR: 5 },
  talentConfig: {
    talentPullCount: 10,
    talentRate: { 1: 100, 2: 10, 3: 1, total: 1000 },
    additions: {
      TMS: [[10,{2:1}],[30,{2:2}],[50,{2:3}],[70,{2:4}],[100,{2:5}]],
      CACHV: [[10,{2:1}],[30,{2:2}],[50,{2:3}],[70,{2:4}],[100,{2:5}]],
    },
  },
  propertyConfig: {
    judge: {
      RTLT: [[0,0],[0.3,1],[0.6,2],[0.9,3]],
      REVT: [[0,0],[0.2,1],[0.4,2],[0.6,3]],
      TMS: [
        [0,0,'UI_Remake_Times_Judge_Level_0'],[10,1,'UI_Remake_Times_Judge_Level_1'],
        [30,1,'UI_Remake_Times_Judge_Level_2'],[50,2,'UI_Remake_Times_Judge_Level_3'],
        [70,2,'UI_Remake_Times_Judge_Level_4'],[100,3,'UI_Remake_Times_Judge_Level_5'],
      ],
      CACHV: [
        [0,0,'UI_Achievement_Count_Judge_Level_0'],[10,1,'UI_Achievement_Count_Judge_Level_1'],
        [30,1,'UI_Achievement_Count_Judge_Level_2'],[50,2,'UI_Achievement_Count_Judge_Level_3'],
        [70,2,'UI_Achievement_Count_Judge_Level_4'],[100,3,'UI_Achievement_Count_Judge_Level_5'],
      ],
      HCHR: [[0,0,'UI_Judge_Level_0'],[1,0,'UI_Judge_Level_1'],[2,0,'UI_Judge_Level_2'],[4,0,'UI_Judge_Level_3'],[7,1,'UI_Judge_Level_4'],[9,2,'UI_Judge_Level_5'],[11,3,'UI_Judge_Level_6']],
      HMNY: [[0,0,'UI_Judge_Level_0'],[1,0,'UI_Judge_Level_1'],[2,0,'UI_Judge_Level_2'],[4,0,'UI_Judge_Level_3'],[7,1,'UI_Judge_Level_4'],[9,2,'UI_Judge_Level_5'],[11,3,'UI_Judge_Level_6']],
      HSPR: [[0,0,'UI_Spirit_Judge_Level_0'],[1,0,'UI_Spirit_Judge_Level_1'],[2,0,'UI_Spirit_Judge_Level_2'],[4,0,'UI_Spirit_Judge_Level_3'],[7,1,'UI_Spirit_Judge_Level_4'],[9,2,'UI_Spirit_Judge_Level_5'],[11,3,'UI_Spirit_Judge_Level_6']],
      HINT: [[0,0,'UI_Judge_Level_0'],[1,0,'UI_Judge_Level_1'],[2,0,'UI_Judge_Level_2'],[4,0,'UI_Judge_Level_3'],[7,1,'UI_Judge_Level_4'],[9,2,'UI_Judge_Level_5'],[11,3,'UI_Judge_Level_6'],[21,3,'UI_Intelligence_Judge_Level_7'],[131,3,'UI_Intelligence_Judge_Level_8'],[501,3,'UI_Intelligence_Judge_Level_9']],
      HSTR: [[0,0,'UI_Judge_Level_0'],[1,0,'UI_Judge_Level_1'],[2,0,'UI_Judge_Level_2'],[4,0,'UI_Judge_Level_3'],[7,1,'UI_Judge_Level_4'],[9,2,'UI_Judge_Level_5'],[11,3,'UI_Judge_Level_6'],[21,3,'UI_Strength_Judge_Level_7'],[101,3,'UI_Strength_Judge_Level_8'],[401,3,'UI_Strength_Judge_Level_9'],[1001,3,'UI_Strength_Judge_Level_10'],[2001,3,'UI_Strength_Judge_Level_11']],
      HAGE: [[0,0,'UI_AGE_Judge_Level_0'],[1,0,'UI_AGE_Judge_Level_1'],[10,0,'UI_AGE_Judge_Level_2'],[18,0,'UI_AGE_Judge_Level_3'],[40,0,'UI_AGE_Judge_Level_4'],[60,1,'UI_AGE_Judge_Level_5'],[70,1,'UI_AGE_Judge_Level_6'],[80,2,'UI_AGE_Judge_Level_7'],[90,2,'UI_AGE_Judge_Level_8'],[95,3,'UI_AGE_Judge_Level_9'],[100,3,'UI_AGE_Judge_Level_10'],[500,3,'UI_AGE_Judge_Level_11']],
      SUM: [[0,0,'UI_Judge_Level_0'],[41,0,'UI_Judge_Level_1'],[50,0,'UI_Judge_Level_2'],[60,0,'UI_Judge_Level_3'],[80,1,'UI_Judge_Level_4'],[100,2,'UI_Judge_Level_5'],[110,3,'UI_Judge_Level_6'],[120,3,'UI_Judge_Level_7']],
    },
  },
  characterConfig: {
    characterPullCount: 3,
    rateableKnife: 10,
    propertyWeight: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,5],[7,4],[8,3],[9,2],[10,1]],
    talentWeight: [[1,1],[2,2],[3,3],[4,2],[5,1]],
  },
}
```

- [ ] **Step 4: 写小测试验证导出**

`src-next/core/types.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { defaultConfig } from './config'
import { PropertyType, AchievementOpportunity } from './types'

describe('core types/config', () => {
  it('defaultConfig has expected shape', () => {
    expect(defaultConfig.defaultPropertyPoints).toBe(20)
    expect(defaultConfig.talentConfig.talentRate[1]).toBe(100)
    expect(defaultConfig.propertyConfig.judge.HAGE).toBeInstanceOf(Array)
  })
  it('exports PropertyType keys', () => {
    expect(PropertyType.TLT).toBe('TLT')
    expect(AchievementOpportunity.START).toBe('START')
  })
})
```

- [ ] **Step 5: 跑测试**

```bash
pnpm test:next
```

预期：之前的 2 个 + 这里的 2 个 = 4 passed。

- [ ] **Step 6: Commit**

```bash
git add src-next/core/
git commit -m "feat(core): add types and shared config"
```

---

### Task 7：util.ts + condition.ts + events.ts

**Files:**
- Create: `src-next/core/util.ts`
- Create: `src-next/core/condition.ts`
- Create: `src-next/core/condition.test.ts`
- Create: `src-next/core/events.ts`

- [ ] **Step 1: 读 src/functions/util.js 和 src/functions/condition.js**

```bash
cat src/functions/util.js src/functions/condition.js src/functions/condition.spec.js
```

识别所有导出：记录 `util.clone`、`util.weightRandom` 等等，以及 `condition.checkCondition` 的签名。

- [ ] **Step 2: 写 util.ts（逐字翻译 util.js）**

`src-next/core/util.ts`：把 `util.js` 中的函数逐个翻译为 TS。保留同名导出。若有 `any` 用 `unknown` 或最精确类型，确有动态性的用 `any` 并注释 `// reason: ...`。**不改逻辑**。

- [ ] **Step 3: 写 condition.ts（逐字翻译 condition.js）**

`src-next/core/condition.ts`：同样逐字翻译。

- [ ] **Step 4: 迁移 condition 的现有测试**

`src-next/core/condition.test.ts`：把 `src/functions/condition.spec.js` 的 case 翻译成 TS（import 改为 `./condition`）。

- [ ] **Step 5: 写 events.ts（事件总线）**

`src-next/core/events.ts`：

```ts
type Listener = (data: unknown) => void

const listeners = new Map<string, Set<Listener>>()

export function on(tag: string, fn: Listener): void {
  let set = listeners.get(tag)
  if (!set) { set = new Set(); listeners.set(tag, set) }
  set.add(fn)
}

export function off(tag: string, fn: Listener): void {
  listeners.get(tag)?.delete(fn)
}

export function emit(tag: string, data?: unknown): void {
  listeners.get(tag)?.forEach(fn => fn(data))
}

export function clearAll(): void {
  listeners.clear()
}
```

注：这替换 `globalThis.$$on / $$event / $$off`，但在迁移期**保留 globalThis 作为兼容 shim**（在 core/index.ts 中桥接），因为 core/*.ts 的旧实现可能仍调用全局。迁移完后 Task 15 可清理。

- [ ] **Step 6: 跑测试**

```bash
pnpm test:next
```

预期：之前的 + condition 的 case 全部 passed。

- [ ] **Step 7: Commit**

```bash
git add src-next/core/
git commit -m "feat(core): port util, condition, event bus"
```

---

### Task 8：data/loader.ts

**Files:**
- Create: `src-next/core/data/loader.ts`
- Create: `src-next/core/data/loader.test.ts`

- [ ] **Step 1: 确认数据路径**

```bash
ls public/data/zh-cn/ 2>/dev/null || (pnpm xlsx2json && ls public/data/zh-cn/)
```

预期：`achievement.json age.json character.json events.json talents.json`。

- [ ] **Step 2: 写 loader.ts**

`src-next/core/data/loader.ts`：

```ts
export type DataSet = 'achievement' | 'age' | 'character' | 'events' | 'talents'

let baseUrl = '/data'
let language = 'zh-cn'

export function configureLoader(opts: { baseUrl?: string; language?: string }): void {
  if (opts.baseUrl !== undefined) baseUrl = opts.baseUrl
  if (opts.language !== undefined) language = opts.language
}

export async function loadDataSet<T = unknown>(name: DataSet): Promise<T> {
  const url = `${baseUrl}/${language}/${name}.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`loadDataSet(${name}): HTTP ${res.status}`)
  return res.json() as Promise<T>
}

export async function loadRaw<T = unknown>(path: string): Promise<T> {
  const url = `${baseUrl}/${path}.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`loadRaw(${path}): HTTP ${res.status}`)
  return res.json() as Promise<T>
}
```

注：浏览器里 `fetch` 用 Vite 的 `publicDir: '../public'`；Node/REPL 里需要在 Task 15 的 REPL 适配器里 polyfill `fetch` 用 `fs.readFile`。

- [ ] **Step 3: 写最小测试**

`src-next/core/data/loader.test.ts`：

```ts
import { describe, it, expect, vi } from 'vitest'
import { configureLoader, loadDataSet } from './loader'

describe('loader', () => {
  it('calls fetch with configured language path', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    vi.stubGlobal('fetch', fetchMock)
    configureLoader({ baseUrl: '/d', language: 'zh-cn' })
    const result = await loadDataSet('events')
    expect(fetchMock).toHaveBeenCalledWith('/d/zh-cn/events.json')
    expect(result).toEqual({ ok: true })
    vi.unstubAllGlobals()
  })
  it('throws on non-ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    await expect(loadDataSet('events')).rejects.toThrow(/404/)
    vi.unstubAllGlobals()
  })
})
```

- [ ] **Step 4: 跑测试**

```bash
pnpm test:next
```

预期：新加 2 passed。

- [ ] **Step 5: Commit**

```bash
git add src-next/core/data/
git commit -m "feat(core): add data loader"
```

---

### Task 9：core/achievement.ts

**Files:**
- Create: `src-next/core/achievement.ts`

- [ ] **Step 1: 读 src/modules/achievement.js**

```bash
cat src/modules/achievement.js
```

识别 class `Achievement`、方法 `initial/achieve/record/count`、字段。

- [ ] **Step 2: 翻译为 TS**

`src-next/core/achievement.ts`：把 `achievement.js` 逐行翻译到 TS，替换：
- `import { ... } from './...'` 的路径保持，扩展名从 `.js` 改为从 `./xxx`（moduleResolution bundler 会解析）
- `globalThis.$$event` 调用改为 `import { emit } from './events'` 然后 `emit(...)`
- `globalThis.json` 调用改为 `import { loadDataSet, loadRaw } from './data/loader'`
- 属性加上类型注解
- 保留所有方法签名（名称、参数、返回）

**规则**：method names 和 public API 必须 1:1 保留，因为 `life.ts` 和 REPL 会调用它们。内部变量名可改善。

- [ ] **Step 3: 让 types.ts 涵盖 Achievement 公共方法返回**

补充或确认 types.ts 中 `AchievementMeta` 已存在。

- [ ] **Step 4: 编译检查**

```bash
pnpm test:next
```

预期：无编译错误（此阶段没新增测试，只要通过现有测试 + 无 TS 编译错）。

- [ ] **Step 5: Commit**

```bash
git add src-next/core/achievement.ts
git commit -m "feat(core): port achievement module to ts"
```

---

### Task 10：core/event.ts

**Files:**
- Create: `src-next/core/event.ts`

- [ ] **Step 1: 读 src/modules/event.js**

```bash
cat src/modules/event.js
```

- [ ] **Step 2: 翻译**

`src-next/core/event.ts`：应用 Part 3 顶部的迁移规则——逐行翻译，保留方法签名；把 `globalThis.$$event` 改为 `import { emit } from './events'`；把 `globalThis.json` 改为 `import { loadDataSet } from './data/loader'`；给所有字段和参数加类型。**不改逻辑**。

- [ ] **Step 3: 编译检查**

```bash
pnpm test:next
```

- [ ] **Step 4: Commit**

```bash
git add src-next/core/event.ts
git commit -m "feat(core): port event module to ts"
```

---

### Task 11：core/talent.ts

**Files:**
- Create: `src-next/core/talent.ts`

- [ ] **Step 1: 读 src/modules/talent.js**

```bash
cat src/modules/talent.js
```

- [ ] **Step 2: 翻译**

应用 Part 3 顶部的迁移规则。`talent.js` 内部用了 `util.weightRandom` —— 确保从 `./util` 正确 import。把 `globalThis.$$event` 改为 `emit`（`import { emit } from './events'`），`globalThis.json` 改为 `loadDataSet`。公共方法 `random / randomByConfig / replace / get / do / allocationAddition / exclude / do（trigger）` 签名完全保留。

- [ ] **Step 3: 编译检查**

```bash
pnpm test:next
```

- [ ] **Step 4: Commit**

```bash
git add src-next/core/talent.ts
git commit -m "feat(core): port talent module to ts"
```

---

### Task 12：core/property.ts

**Files:**
- Create: `src-next/core/property.ts`

- [ ] **Step 1: 读 src/modules/property.js**

```bash
wc -l src/modules/property.js
cat src/modules/property.js
```

最大的模块（423 行）。专注翻译，不优化。

- [ ] **Step 2: 翻译**

`src-next/core/property.ts`。注意：
- 大量 `#private` 字段翻译为 TS 的 `private` 修饰符或保留 `#` 语法
- `PropertyTypes` 常量使用 `import { PropertyType } from './types'`
- judge 的三元组数组类型用 `Array<[number, TalentGrade] | [number, TalentGrade, string]>`

- [ ] **Step 3: 编译检查**

```bash
pnpm test:next
```

- [ ] **Step 4: Commit**

```bash
git add src-next/core/property.ts
git commit -m "feat(core): port property module to ts"
```

---

### Task 13：core/character.ts

**Files:**
- Create: `src-next/core/character.ts`

- [ ] **Step 1: 读 src/modules/character.js**

```bash
cat src/modules/character.js
```

- [ ] **Step 2: 翻译**

`src-next/core/character.ts`。

- [ ] **Step 3: 编译检查**

```bash
pnpm test:next
```

- [ ] **Step 4: Commit**

```bash
git add src-next/core/character.ts
git commit -m "feat(core): port character module to ts"
```

---

### Task 14：core/life.ts + i18n + index.ts

**Files:**
- Create: `src-next/core/life.ts`
- Create: `src-next/i18n/zh-cn.ts`
- Create: `src-next/core/index.ts`

- [ ] **Step 1: 读 src/modules/life.js**

```bash
cat src/modules/life.js
```

- [ ] **Step 2: 翻译 life.ts**

**关键**：保留 `next()` 的原始签名 `next(): NextResult`，不加任何 "choice" 分支（那是 Plan B 的事）。保留所有 public 方法：`config`、`initial`、`remake`、`start`、`next`、`getPropertyPoints`、`talentRandom`、`talentExtend`、`exclude`、`summary`、`PropertyTypes`、`getLastRecord`、`getTalentCurrentTriggerCount`、`check`、`clone`、`talentReplace`、`doTalent`、`doEvent`、`random`、`format`。

顺便把 `summary` getter 的返回类型加到 `types.ts`：

```ts
// 追加到 src-next/core/types.ts
export interface SummaryEntry { value: number; grade: TalentGrade; judge: string }
export type LifeSummary = Partial<Record<PropertyTypeKey, SummaryEntry>>
```

并让 `life.ts` 的 `get summary(): LifeSummary` 使用此类型。

- [ ] **Step 3: 写 i18n/zh-cn.ts**

`src-next/i18n/zh-cn.ts`：从 `src/i18n/zh-cn.js` 复制内容，改为 `export default { ... } as Record<string, string>`。

- [ ] **Step 4: 写 core/index.ts 桶**

`src-next/core/index.ts`：

```ts
export { default as Life } from './life'
export * from './types'
export { defaultConfig } from './config'
export { configureLoader, loadDataSet, loadRaw } from './data/loader'
export { on, off, emit, clearAll } from './events'
```

- [ ] **Step 5: 编译检查**

```bash
pnpm test:next
```

- [ ] **Step 6: Commit**

```bash
git add src-next/core/life.ts src-next/core/index.ts src-next/i18n/
git commit -m "feat(core): port life module and add barrel exports"
```

---

### Task 15：REPL 适配 src-next/core + 回归必须绿

**Files:**
- Create: `repl/deterministic-next.js`
- Modify: `repl/app.js`（新建一个 next 版本或用环境变量切换）
- Modify: `tests/core-regression.test.js`

- [ ] **Step 1: 复制 repl/app.js 为 repl/app-next.js**

```bash
cp repl/app.js repl/app-next.js
```

- [ ] **Step 2: 修改 app-next.js 从 src-next/core 引入**

打开 `repl/app-next.js`，把：
```js
import Life from '../src/modules/life.js'
import $lang from '../src/i18n/zh-cn.js'
```
改为：
```js
import { Life, configureLoader } from '../src-next/core/index.ts'
import $lang from '../src-next/i18n/zh-cn.ts'
```

注：Node 原生不读 `.ts`。为了让这一步可行，**先尝试** Node 22 的 `--experimental-strip-types`；如果不支持或项目 Node 版本低，用 tsx 作为 ts loader：`pnpm add -D tsx`，然后用 `node --import tsx repl/deterministic-next.js`。

- [ ] **Step 3: polyfill fetch 给 Node 用**

在 `repl/app-next.js` 加载前做 shim：

```js
import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

globalThis.fetch = async (url) => {
  const path = join(__dirname, '..', 'public', url.replace(/^\/?/, ''))
  const data = await readFile(path, 'utf8')
  return { ok: true, status: 200, async json() { return JSON.parse(data) } }
}
```

- [ ] **Step 4: 写 deterministic-next.js**

`repl/deterministic-next.js`：复制 `repl/deterministic.js`，把 import 从 `./app.js` 改为 `./app-next.js`。保持所有 seed 逻辑和命令序列完全一致。

- [ ] **Step 5: 修改回归测试使用 next 版**

`tests/core-regression.test.js` 增加一个 describe：

```js
describe('core behavior regression (new = src-next/core)', () => {
  for (const seed of SEEDS) {
    it(`seed ${seed} matches fixture`, async () => {
      const expected = await readFixture(seed)
      const actual = await runSeed(seed, 'repl/deterministic-next.js')
      expect(actual).toBe(expected)
    }, 60000)
  }
})
```

- [ ] **Step 6: 跑回归**

```bash
pnpm test:repl
```

**预期**：6 passed（3 个 baseline + 3 个 next）。这是整个 Plan A 最关键的验证点。

**若失败**：
1. 写个小脚本生成 `repl-seed-42.actual.txt`，用 `diff` 对比两个文件找第一处分歧。
2. 典型分歧点：随机数调用顺序（如果 TS port 里不小心改了方法内的 `Math.random()` 调用次数或顺序就会挂）。
3. 回退到对应模块的 port commit，逐行重新核对。

- [ ] **Step 7: 加脚本**

`package.json` scripts 加：

```json
"repl:deterministic:next": "node --import tsx repl/deterministic-next.js"
```

（若 Step 2 用了 `--experimental-strip-types`，命令改为相应形式。）

- [ ] **Step 8: Commit**

```bash
git add repl/ tests/ package.json
git commit -m "test: verify src-next/core behavioral parity with src/modules"
```

---

## Part 4：React UI 复刻当前游戏

**范围**：只做当前 Laya 版本已有的 4 个屏（主菜单、设置、轨迹、结算 + 继承）。**不加**任何 Phase 1 的新玩法（choice/goal/dex/poster/seed）—— 那些在 Plan B。

### Task 16：Zustand gameStore

**Files:**
- Create: `src-next/store/gameStore.ts`
- Create: `src-next/store/gameStore.test.ts`
- Create: `src-next/store/index.ts`

- [ ] **Step 1: 写 store 骨架**

`src-next/store/gameStore.ts`：

```ts
import { create } from 'zustand'
import { Life, defaultConfig, configureLoader } from '@/core'
import type { TalentMeta, NextResult } from '@/core/types'

export type Step = 'home' | 'talent' | 'property' | 'trajectory' | 'summary'

interface GameState {
  step: Step
  life: Life | null
  initialized: boolean
  randomTalents: TalentMeta[]
  selectedTalents: Set<string>
  talentExtend: string | null
  propertyAlloc: Record<'CHR'|'INT'|'STR'|'MNY', number> & { total: number; SPR: number }
  trajectoryLog: Array<{ age: number; result: NextResult }>
  isEnd: boolean

  initialize(): Promise<void>
  goHome(): void
  remake(): void
  toggleTalent(id: string): void
  confirmTalents(): void
  setProperty(tag: 'CHR'|'INT'|'STR'|'MNY', delta: number, mode: 'set'|'add'): void
  randomProperty(): void
  startTrajectory(): void
  advance(): void
  setTalentExtend(id: string | null): void
  finishSummary(): void
}

export const useGameStore = create<GameState>((set, get) => {
  const life = new Life()
  life.config(defaultConfig)
  configureLoader({ baseUrl: '/data', language: 'zh-cn' })
  return {
        step: 'home',
        life,
        initialized: false,
        randomTalents: [],
        selectedTalents: new Set(),
        talentExtend: null,
        propertyAlloc: { CHR: 0, INT: 0, STR: 0, MNY: 0, SPR: 5, total: 20 },
        trajectoryLog: [],
        isEnd: false,

        async initialize() {
          const { life, initialized } = get()
          if (initialized || !life) return
          await life.initial(
            (dataSet: string) => fetch(`/data/zh-cn/${dataSet}.json`).then(r => r.json()),
            (path: string) => fetch(`/data/${path}.json`).then(r => r.json()),
          )
          set({ initialized: true })
        },

        goHome() { set({ step: 'home', isEnd: false, trajectoryLog: [] }) },

        remake() {
          const life = get().life!
          const randomTalents = life.talentRandom()
          set({
            step: 'talent',
            randomTalents,
            selectedTalents: new Set(),
            talentExtend: null,
            trajectoryLog: [],
            isEnd: false,
          })
        },

        toggleTalent(id: string) {
          const { selectedTalents, randomTalents, life } = get()
          const next = new Set(selectedTalents)
          if (next.has(id)) { next.delete(id); set({ selectedTalents: next }); return }
          if (next.size >= 3) return
          const exclusive = life!.exclude(Array.from(next), id)
          if (exclusive != null && next.has(String(exclusive))) return
          next.add(id)
          set({ selectedTalents: next })
        },

        confirmTalents() {
          const { selectedTalents, life } = get()
          if (selectedTalents.size !== 3) return
          life!.remake(Array.from(selectedTalents))
          const total = life!.getPropertyPoints()
          set({
            step: 'property',
            propertyAlloc: { CHR: 0, INT: 0, STR: 0, MNY: 0, SPR: 5, total },
          })
        },

        setProperty(tag, delta, mode) {
          const { propertyAlloc } = get()
          const current = propertyAlloc[tag]
          const newVal = mode === 'set' ? delta : current + delta
          if (newVal < 0 || newVal > 10) return
          const others = (['CHR','INT','STR','MNY'] as const).filter(t => t !== tag)
            .reduce((s, t) => s + propertyAlloc[t], 0)
          if (newVal + others > propertyAlloc.total) return
          set({ propertyAlloc: { ...propertyAlloc, [tag]: newVal } })
        },

        randomProperty() {
          const { propertyAlloc } = get()
          let t = propertyAlloc.total
          const arr = [10, 10, 10, 10]
          while (t > 0) {
            const sub = Math.round(Math.random() * (Math.min(t, 10) - 1)) + 1
            while (true) {
              const sel = Math.floor(Math.random() * 4) % 4
              if (arr[sel] - sub < 0) continue
              arr[sel] -= sub; t -= sub; break
            }
          }
          set({ propertyAlloc: {
            ...propertyAlloc,
            CHR: 10 - arr[0], INT: 10 - arr[1], STR: 10 - arr[2], MNY: 10 - arr[3],
          }})
        },

        startTrajectory() {
          const { life, propertyAlloc } = get()
          const { CHR, INT, STR, MNY } = propertyAlloc
          life!.start({ CHR, INT, STR, MNY, SPR: 5 })
          set({ step: 'trajectory', trajectoryLog: [], isEnd: false })
        },

        advance() {
          const { life, trajectoryLog, isEnd } = get()
          if (isEnd) { set({ step: 'summary' }); return }
          const result = life!.next()
          set({
            trajectoryLog: [...trajectoryLog, { age: result.age, result }],
            isEnd: result.isEnd,
          })
        },

        setTalentExtend(id: string | null) { set({ talentExtend: id }) },

        finishSummary() {
          const { life, talentExtend } = get()
          if (talentExtend) {
            // @ts-expect-error: life.talentExtend signature
            life!.talentExtend(talentExtend)
          }
          set({ step: 'home' })
        },
      }
  })
// Note: Plan A 不用 persist（不持久化图鉴/历史）。Plan B 引入图鉴时再加 persist middleware。
```

`src-next/store/index.ts`：

```ts
export { useGameStore } from './gameStore'
```

- [ ] **Step 2: 写 store 最小行为测试**

`src-next/store/gameStore.test.ts`：

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './gameStore'

describe('gameStore', () => {
  beforeEach(() => {
    useGameStore.setState({ step: 'home', selectedTalents: new Set(), isEnd: false, trajectoryLog: [] })
  })

  it('starts at home', () => {
    expect(useGameStore.getState().step).toBe('home')
  })

  it('toggleTalent respects 3-limit (no data loaded, smoke only)', () => {
    useGameStore.setState({ randomTalents: [
      { id: 'a', name: 'A', description: '', grade: 1 },
      { id: 'b', name: 'B', description: '', grade: 1 },
      { id: 'c', name: 'C', description: '', grade: 1 },
      { id: 'd', name: 'D', description: '', grade: 1 },
    ] as any })
    useGameStore.getState().toggleTalent('a')
    useGameStore.getState().toggleTalent('b')
    useGameStore.getState().toggleTalent('c')
    useGameStore.getState().toggleTalent('d')
    expect(useGameStore.getState().selectedTalents.size).toBe(3)
  })
})
```

注：`toggleTalent` 用 `life.exclude` 会尝试访问数据。测试里 `life` 的 `exclude` 在数据未加载时可能抛错。若挂则在 toggleTalent 内加个 try/catch，或者测试里 mock life。取简单路径：测试用 `useGameStore.setState({ life: null as any })` 并在 toggleTalent 首行加 `if (!life) { ... simple add ... }` 的测试兜底分支 —— **但这样改动了生产代码**。更好：用 vi.spyOn mock life.exclude。代码如上预期若挂则加 mock：

```ts
useGameStore.setState({ life: { exclude: () => null } as any })
```

- [ ] **Step 3: 跑测试**

```bash
pnpm test:next
```

预期：新加 2 passed。

- [ ] **Step 4: Commit**

```bash
git add src-next/store/
git commit -m "feat(store): add zustand gameStore"
```

---

### Task 17：App 路由骨架 + 启动流程

**Files:**
- Modify: `src-next/App.tsx`
- Create: `src-next/pages/HomePage.tsx`（stub，Task 18 完善）
- Create: `src-next/pages/SetupPage.tsx`（stub，Task 19 完善）
- Create: `src-next/pages/PlayPage.tsx`（stub，Task 20 完善）
- Create: `src-next/pages/SummaryPage.tsx`（stub，Task 21 完善）

- [ ] **Step 1: 创建 4 个 stub 页**

`src-next/pages/HomePage.tsx`：

```tsx
export function HomePage() {
  return <div className="p-4 text-slate-100">HomePage (stub)</div>
}
```

同样写 `SetupPage.tsx`、`PlayPage.tsx`、`SummaryPage.tsx`，替换文字。

- [ ] **Step 2: 修改 App.tsx 按 store.step 路由**

```tsx
import { useEffect } from 'react'
import { LandscapeLockout } from './components/LandscapeLockout'
import { useGameStore } from './store'
import { HomePage } from './pages/HomePage'
import { SetupPage } from './pages/SetupPage'
import { PlayPage } from './pages/PlayPage'
import { SummaryPage } from './pages/SummaryPage'

export default function App() {
  const step = useGameStore(s => s.step)
  const initialized = useGameStore(s => s.initialized)
  const initialize = useGameStore(s => s.initialize)

  useEffect(() => { void initialize() }, [initialize])

  if (!initialized) {
    return (
      <LandscapeLockout>
        <div className="h-dvh flex items-center justify-center text-slate-100">
          Now Loading…
        </div>
      </LandscapeLockout>
    )
  }

  return (
    <LandscapeLockout>
      <div className="h-dvh flex flex-col pt-safe-top pb-safe-bottom overflow-hidden">
        {step === 'home' && <HomePage />}
        {(step === 'talent' || step === 'property') && <SetupPage />}
        {step === 'trajectory' && <PlayPage />}
        {step === 'summary' && <SummaryPage />}
      </div>
    </LandscapeLockout>
  )
}
```

- [ ] **Step 3: 浏览器验证**

```bash
pnpm dev:next
```

浏览器里预期：首屏 "Now Loading…"，加载完后切到 "HomePage (stub)"。DevTools 里无报错。

- [ ] **Step 4: Commit**

```bash
git add src-next/App.tsx src-next/pages/
git commit -m "feat: add page routing skeleton keyed on store.step"
```

---

### Task 18：HomePage

**Files:**
- Modify: `src-next/pages/HomePage.tsx`
- Create: `src-next/components/ui/button.tsx`

- [ ] **Step 1: 添加 shadcn button**

`src-next/components/ui/button.tsx`：

```tsx
import * as React from 'react'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }

export function Button({ variant = 'primary', className = '', ...props }: Props) {
  const base = 'inline-flex items-center justify-center rounded-2xl text-base font-medium transition active:scale-95 min-h-[44px] px-5'
  const skin = variant === 'primary'
    ? 'bg-slate-100 text-slate-900 hover:bg-white'
    : 'bg-transparent text-slate-100 border border-slate-600 hover:bg-slate-800'
  return <button className={`${base} ${skin} ${className}`} {...props} />
}
```

- [ ] **Step 2: 实现 HomePage**

```tsx
import { Button } from '../components/ui/button'
import { useGameStore } from '../store'

export function HomePage() {
  const remake = useGameStore(s => s.remake)
  return (
    <div className="flex-1 flex flex-col items-center justify-between p-8">
      <div className="text-center mt-16">
        <h1 className="text-3xl font-bold mb-2">人生重开模拟器</h1>
        <p className="text-slate-400 text-sm">这垃圾人生一秒也不想待了</p>
      </div>
      <div className="w-full max-w-xs space-y-3 mb-8">
        <Button className="w-full" onClick={remake}>重开一次</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 浏览器手动验证**

```bash
pnpm dev:next
```

点击 "重开一次" 应切到 SetupPage stub。

- [ ] **Step 4: Commit**

```bash
git add src-next/pages/HomePage.tsx src-next/components/ui/button.tsx
git commit -m "feat(page): implement HomePage"
```

---

### Task 19：SetupPage（天赋选择 + 属性分配）

**Files:**
- Modify: `src-next/pages/SetupPage.tsx`
- Create: `src-next/components/game/TalentCard.tsx`
- Create: `src-next/components/game/PropertyAllocator.tsx`

- [ ] **Step 1: TalentCard 组件**

```tsx
import type { TalentMeta } from '@/core/types'

const gradeColors: Record<number, string> = {
  0: 'border-slate-600 bg-slate-800',
  1: 'border-blue-500 bg-blue-950',
  2: 'border-purple-500 bg-purple-950',
  3: 'border-yellow-400 bg-yellow-950',
}

export function TalentCard({
  talent, selected, onToggle,
}: { talent: TalentMeta; selected: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`w-full text-left p-3 rounded-xl border-2 transition ${gradeColors[talent.grade] ?? gradeColors[0]} ${selected ? 'ring-2 ring-slate-100' : ''}`}
    >
      <div className="font-medium">{talent.name}</div>
      <div className="text-xs text-slate-300 mt-1">{talent.description}</div>
    </button>
  )
}
```

- [ ] **Step 2: PropertyAllocator 组件**

```tsx
import { useGameStore } from '../../store'

const labels = { CHR: '颜值', INT: '智力', STR: '体质', MNY: '家境' } as const

export function PropertyAllocator() {
  const alloc = useGameStore(s => s.propertyAlloc)
  const setProperty = useGameStore(s => s.setProperty)
  const randomProperty = useGameStore(s => s.randomProperty)

  const used = alloc.CHR + alloc.INT + alloc.STR + alloc.MNY
  const remaining = alloc.total - used

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm text-slate-300">
        <span>剩余点数</span>
        <span className="text-slate-100">{remaining} / {alloc.total}</span>
      </div>
      {(['CHR','INT','STR','MNY'] as const).map(tag => (
        <div key={tag} className="flex items-center gap-3">
          <div className="w-16 text-sm">{labels[tag]}</div>
          <button
            className="w-10 h-10 rounded-full bg-slate-700 text-xl active:scale-95"
            onClick={() => setProperty(tag, -1, 'add')}
          >-</button>
          <div className="flex-1 text-center text-lg">{alloc[tag]}</div>
          <button
            className="w-10 h-10 rounded-full bg-slate-700 text-xl active:scale-95"
            onClick={() => setProperty(tag, +1, 'add')}
          >+</button>
        </div>
      ))}
      <button
        className="w-full py-2 text-slate-300 underline text-sm"
        onClick={randomProperty}
      >随机分配</button>
    </div>
  )
}
```

- [ ] **Step 3: SetupPage 整合**

```tsx
import { Button } from '../components/ui/button'
import { useGameStore } from '../store'
import { TalentCard } from '../components/game/TalentCard'
import { PropertyAllocator } from '../components/game/PropertyAllocator'

export function SetupPage() {
  const step = useGameStore(s => s.step)
  const randomTalents = useGameStore(s => s.randomTalents)
  const selectedTalents = useGameStore(s => s.selectedTalents)
  const toggleTalent = useGameStore(s => s.toggleTalent)
  const confirmTalents = useGameStore(s => s.confirmTalents)
  const startTrajectory = useGameStore(s => s.startTrajectory)
  const goHome = useGameStore(s => s.goHome)
  const alloc = useGameStore(s => s.propertyAlloc)
  const used = alloc.CHR + alloc.INT + alloc.STR + alloc.MNY
  const canStart = used === alloc.total

  if (step === 'talent') {
    return (
      <div className="flex-1 flex flex-col p-4">
        <div className="mb-3 text-sm text-slate-300">选择 3 个天赋 ({selectedTalents.size}/3)</div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {randomTalents.map(t => (
            <TalentCard
              key={t.id}
              talent={t}
              selected={selectedTalents.has(t.id)}
              onToggle={() => toggleTalent(t.id)}
            />
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Button variant="ghost" onClick={goHome}>返回</Button>
          <Button className="flex-1" disabled={selectedTalents.size !== 3} onClick={confirmTalents}>下一步</Button>
        </div>
      </div>
    )
  }

  // property step
  return (
    <div className="flex-1 flex flex-col p-4">
      <div className="mb-3 text-sm text-slate-300">分配属性点</div>
      <div className="flex-1"><PropertyAllocator /></div>
      <div className="mt-3 flex gap-2">
        <Button variant="ghost" onClick={goHome}>返回</Button>
        <Button className="flex-1" disabled={!canStart} onClick={startTrajectory}>开始人生</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 手动验证**

```bash
pnpm dev:next
```

流程：首页 → 重开 → 天赋列表能选/反选（上限 3） → 下一步进入属性分配 → 分配完能开始人生 → PlayPage stub。

- [ ] **Step 5: Commit**

```bash
git add src-next/pages/SetupPage.tsx src-next/components/game/
git commit -m "feat(page): implement SetupPage (talent + property)"
```

---

### Task 20：PlayPage（年龄推进 + 事件流）

**Files:**
- Modify: `src-next/pages/PlayPage.tsx`
- Create: `src-next/components/game/AgeLine.tsx`

- [ ] **Step 1: AgeLine 组件**

```tsx
import type { TrajectoryContent } from '@/core/types'

export function AgeLine({ age, content }: { age: number; content: TrajectoryContent[] }) {
  return (
    <div className="py-2 border-b border-slate-800">
      <div className="flex gap-3">
        <div className="w-12 text-slate-400 text-sm pt-0.5">{age}岁</div>
        <div className="flex-1 space-y-1 text-sm">
          {content.map((c, i) => {
            if (c.type === 'TLT') {
              return <div key={i} className="text-purple-300">天赋【{c.name}】发动：{c.description}</div>
            }
            return (
              <div key={i}>
                <div>{c.description}</div>
                {c.postEvent && <div className="text-slate-400 text-xs mt-0.5">{c.postEvent}</div>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: PlayPage 整合**

```tsx
import { useEffect, useRef } from 'react'
import { Button } from '../components/ui/button'
import { useGameStore } from '../store'
import { AgeLine } from '../components/game/AgeLine'

export function PlayPage() {
  const log = useGameStore(s => s.trajectoryLog)
  const isEnd = useGameStore(s => s.isEnd)
  const advance = useGameStore(s => s.advance)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [log])

  return (
    <div className="flex-1 flex flex-col p-4">
      <div className="text-sm text-slate-400 mb-2">人生轨迹</div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto pr-1">
        {log.map(({ age, result }) => (
          <AgeLine key={age} age={age} content={result.content} />
        ))}
        {log.length === 0 && <div className="text-slate-500 text-sm">点击"下一年"开始人生</div>}
      </div>
      <div className="mt-3">
        <Button className="w-full" onClick={advance}>
          {isEnd ? '查看总评' : '下一年'}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 浏览器验证**

```bash
pnpm dev:next
```

走完完整流程：天赋 → 属性 → 开始 → 每按一次"下一年"添加一行 → 寿终后按钮变 "查看总评" → 点击切到 SummaryPage stub。

- [ ] **Step 4: Commit**

```bash
git add src-next/pages/PlayPage.tsx src-next/components/game/AgeLine.tsx
git commit -m "feat(page): implement PlayPage trajectory view"
```

---

### Task 21：SummaryPage（结算 + 继承天赋）

**Files:**
- Modify: `src-next/pages/SummaryPage.tsx`
- Create: `src-next/components/game/SummaryTable.tsx`

- [ ] **Step 1: SummaryTable**

```tsx
import type { Life } from '@/core'
import zh from '@/i18n/zh-cn'

const dims = [
  { label: '颜值', key: 'HCHR' },
  { label: '智力', key: 'HINT' },
  { label: '体质', key: 'HSTR' },
  { label: '家境', key: 'HMNY' },
  { label: '快乐', key: 'HSPR' },
  { label: '享年', key: 'HAGE' },
  { label: '总评', key: 'SUM' },
] as const

export function SummaryTable({ life }: { life: Life }) {
  const s = life.summary

  const gradeColor = (g: number) =>
    g === 0 ? 'text-slate-300' : g === 1 ? 'text-blue-300' : g === 2 ? 'text-purple-300' : 'text-yellow-300'

  return (
    <div className="space-y-2">
      {dims.map(({ label, key }) => {
        const d = s[key]
        if (!d) return null
        return (
          <div key={key} className="flex justify-between items-center py-2 border-b border-slate-800">
            <span className="text-slate-300">{label}</span>
            <span className={gradeColor(d.grade)}>{d.value} · {zh[d.judge] ?? d.judge}</span>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: SummaryPage**

```tsx
import { Button } from '../components/ui/button'
import { useGameStore } from '../store'
import { SummaryTable } from '../components/game/SummaryTable'
import { TalentCard } from '../components/game/TalentCard'

export function SummaryPage() {
  const life = useGameStore(s => s.life)
  const selectedTalents = useGameStore(s => s.selectedTalents)
  const randomTalents = useGameStore(s => s.randomTalents)
  const talentExtend = useGameStore(s => s.talentExtend)
  const setTalentExtend = useGameStore(s => s.setTalentExtend)
  const finishSummary = useGameStore(s => s.finishSummary)

  const ownedTalents = randomTalents.filter(t => selectedTalents.has(t.id))

  if (!life) return null

  return (
    <div className="flex-1 flex flex-col p-4">
      <div className="text-lg font-medium mb-3">总评</div>
      <div className="flex-1 overflow-y-auto">
        <SummaryTable life={life} />
        <div className="mt-6 mb-2 text-sm text-slate-300">选一个天赋继承到下一世（可跳过）</div>
        <div className="space-y-2">
          {ownedTalents.map(t => (
            <TalentCard
              key={t.id}
              talent={t}
              selected={talentExtend === t.id}
              onToggle={() => setTalentExtend(talentExtend === t.id ? null : t.id)}
            />
          ))}
        </div>
      </div>
      <div className="mt-3">
        <Button className="w-full" onClick={finishSummary}>再来一次</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 浏览器端到端验证**

```bash
pnpm dev:next
```

走完 Home → Setup (talent + property) → Play → Summary，能回到 Home，"再来一次"能正常重新开始。

- [ ] **Step 4: Commit**

```bash
git add src-next/pages/SummaryPage.tsx src-next/components/game/SummaryTable.tsx
git commit -m "feat(page): implement SummaryPage with talent inheritance"
```

---

### Task 22：端到端冒烟测试 + 响应式核对

**Files:**
- Create: `src-next/e2e-manual.md`（QA checklist）

- [ ] **Step 1: 写 QA checklist**

`src-next/e2e-manual.md`：

```md
# Plan A E2E 手工 QA

设备：iPhone 14 (390x844) via Chrome DevTools

- [ ] 首次加载显示 "Now Loading…" 然后切到 Home
- [ ] Home 页"重开一次"按钮可点
- [ ] 天赋列表：能选/反选，上限 3
- [ ] 互斥天赋被正确阻止（用已知互斥对测试）
- [ ] 属性分配 +/- 按钮可用，上下界 0/10 限制生效
- [ ] "随机分配"能把属性点用光
- [ ] PlayPage 每点一次"下一年"增加一行
- [ ] 寿终后按钮变 "查看总评"
- [ ] Summary 各维度和判级显示正确（参照老版本对比）
- [ ] 继承天赋可选/取消
- [ ] "再来一次"回到 Home
- [ ] 横屏切换到 "请竖屏游玩" 遮罩
- [ ] 竖屏切回正常
- [ ] 安全区：iPhone 带刘海机型底部按钮不被吞
- [ ] 刷新页面保持加载完成（不重复 Now Loading）
- [ ] DevTools Console 全程无 error
```

- [ ] **Step 2: 真机/浏览器跑一遍全部 checkbox**

```bash
pnpm dev:next
```

打开 `http://<局域网 IP>:5174` 用真手机访问（或 DevTools 设备模式）。逐项勾。任何失败项：不结束 Task 22，回到对应 task 修。

- [ ] **Step 3: 跑全部自动化测试**

```bash
pnpm test:next && pnpm test:repl
```

预期：全绿。

- [ ] **Step 4: Commit（如果 checklist 修了代码）**

若有修改：

```bash
git add -A
git commit -m "fix: address e2e smoke issues"
```

否则只提交 checklist：

```bash
git add src-next/e2e-manual.md
git commit -m "docs: add e2e manual qa checklist"
```

---

## Part 5：原子切换（M5）

### Task 23：切换前完整验证

- [ ] **Step 1: 全部自动化测试通过**

```bash
pnpm test:next && pnpm test:repl
```

预期：全绿。**不绿不进切换**。

- [ ] **Step 2: 手动 QA 再跑一遍**

按 Task 22 的 checklist 再走一遍，确认全部通过。

- [ ] **Step 3: 老版本对照跑一遍（可选）**

```bash
pnpm dev  # 老版本
# 用同一组天赋选择和属性分配玩一局，比较总评数值量级
```

注：这不是严格比较（老版新版用了不同 PRNG 流），只是 sanity check "新版游戏体验 ≈ 老版"。

- [ ] **Step 4: git status 确认工作区干净**

```bash
git status
```

预期：working tree clean。

---

### Task 24：原子切换 commit

**Files:**
- Delete: `src/`（整个目录）
- Delete: `laya/`、`template/`、`lifeRestart.laya`、`public/libs/`、`public/view/`、`public/particle/`、`public/condition_test.html`、`public/unpack.json`
- Rename: `src-next/` → `src/`
- Modify: `package.json`（脚本改回 `dev` / `build` / `test`）
- Modify: `vite.config.js` → 替换为 `src/vite.config.ts` 或根目录 `vite.config.ts`
- Modify: `jsconfig.json`（删除或改为 `tsconfig.json`）
- Delete: `repl/deterministic.js`、`repl/harness.js`（临时回归工具，切换后不再需要；但 `repl/app.js` 保留并指向新 `src/core`）
- Modify: `repl/app.js`（改 import 路径到新 `src/core`）

- [ ] **Step 1: 删除老代码**

```bash
git rm -r src laya template lifeRestart.laya vite.config.js jsconfig.json
git rm public/libs public/view public/particle public/condition_test.html public/unpack.json
```

- [ ] **Step 2: 重命名 src-next → src**

```bash
git mv src-next src
```

此时 `src/vite.config.ts`、`src/tsconfig.json`、`src/index.html` 都已就位。

- [ ] **Step 3: 调整 package.json scripts**

改为：

```json
{
  "scripts": {
    "xlsx2json": "vt transform -d public \"data/**/*.xlsx\"",
    "dev": "vite --config src/vite.config.ts",
    "build": "vite build --config src/vite.config.ts",
    "start": "vite preview --config src/vite.config.ts",
    "test": "vitest run --config src/vitest.config.ts",
    "test:watch": "vitest --config src/vitest.config.ts",
    "test:repl": "vitest run tests/core-regression.test.js",
    "repl": "node repl/index.js"
  }
}
```

删除 `dev:next`、`build:next`、`test:next`、`test:next:watch`、`repl:deterministic`、`repl:deterministic:next`。

- [ ] **Step 4: 修改 repl/app.js 指向新 src/core**

打开 `repl/app.js`（这是老 REPL 入口，用户仍要能跑 `node repl`），把：

```js
import Life from '../src/modules/life.js'
import $lang from '../src/i18n/zh-cn.js'
```

改为：

```js
import { Life } from '../src/core/index.ts'
import $lang from '../src/i18n/zh-cn.ts'
```

并加 Task 15 Step 3 的 fetch polyfill。用 tsx loader 跑：`node --import tsx repl/index.js`，脚本相应更新。

- [ ] **Step 5: 删除临时回归工具**

```bash
git rm repl/deterministic.js repl/deterministic-next.js repl/app-next.js repl/harness.js tests/core-regression.test.js tests/fixtures/repl-seed-42.txt tests/fixtures/repl-seed-1337.txt tests/fixtures/repl-seed-2024.txt
rmdir tests/fixtures tests 2>/dev/null
```

**谨慎**：这些是 Plan A 的回归测试工具，删除前确认所有自动化测试绿、手动 QA 过。删除后这个"两边等价"的证明就只在 git 历史里了（commit `test: verify src-next/core behavioral parity with src/modules` 对应的 PR）。

- [ ] **Step 6: 清理 src/e2e-manual.md（这个不需要了）**

```bash
git rm src/e2e-manual.md
```

- [ ] **Step 7: 启动新项目验证**

```bash
pnpm dev
```

预期：`http://localhost:5174`（或 5173）能打开，游戏能正常玩。

```bash
pnpm test
```

预期：src 下全部单元测试绿。

```bash
node --import tsx repl/index.js
```

预期：能进 REPL，输入 `/remake` 能走流程。

- [ ] **Step 8: 一次性 commit（大 commit 可接受，因为这是纯重命名 + 配置调整）**

```bash
git add -A
git commit -m "refactor: swap src-next to src, remove laya and legacy build"
```

---

### Task 25：切换后收尾

**Files:**
- Modify: `README.md`、`README-zh_CN.md`
- Modify: `Dockerfile`（若有）

- [ ] **Step 1: 更新 README-zh_CN.md**

替换技术栈说明：原 "Laya + Vite" 改为 "Vite + React 18 + TypeScript + Tailwind CSS"。
启动命令已不变（`pnpm dev`），保留即可。

- [ ] **Step 2: 更新 README.md（英文同步）**

同 Step 1。

- [ ] **Step 3: 检查 Dockerfile**

```bash
cat Dockerfile
```

如引用了 `laya/` 或老的 `src/` 路径，更新。如只 `COPY . .` + `pnpm install && pnpm build`，不用改。

- [ ] **Step 4: 构建验证**

```bash
pnpm build
```

预期：`dist-next/` 或 `dist/`（看 vite.config 里的 outDir）产出。检查 html/js/css 齐全。

- [ ] **Step 5: preview 验证**

```bash
pnpm start
```

预期：preview 服务器起来，游戏可玩。

- [ ] **Step 6: Commit**

```bash
git add README.md README-zh_CN.md Dockerfile
git commit -m "docs: update readme for react/ts migration"
```

- [ ] **Step 7: Plan A 完工标志**

```bash
git log --oneline -30
```

预期：清晰的迁移历史。Plan A 结束。Plan B 可以从"稳定的 React/TS 基础"上开始。

---

## 完工判定

Plan A 算完成当且仅当：

1. `pnpm dev` 能启动新版，游戏可完整玩一局（Home → Setup → Play → Summary → Home）
2. `pnpm test` 全绿
3. `pnpm repl` 可用（带 tsx loader）
4. `src-next/` 目录不存在（已 rename）
5. `laya/`、`template/`、`lifeRestart.laya`、老 `src/modules/`、老 `src/ui/` 都已删除
6. git 历史清晰，从 Task 1 到 Task 25 每步有 commit
7. E2E QA checklist 在手动测试中全部通过
