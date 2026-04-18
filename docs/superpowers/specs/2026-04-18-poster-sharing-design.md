# 结局海报分享 Design Spec

## Goal

在 SummaryPage 添加"分享海报"功能，生成一张复古羊皮纸风格的竖版（9:16）海报图片，用户可长按保存或点击下载，方便分享至微信/微博/小红书。

## Feature Scope

- 海报内容：7 维总评数据 + 3 个天赋标签 + 1 条戏剧性事件引言
- 海报风格：复古羊皮纸（暖黄 + 做旧质感 + 命运签文感）
- 海报尺寸：竖版 9:16（360×640px，devicePixelRatio=2 下实际 720×1280px）
- 导出方式：弹层内 `<img>` 可长按存图 + 下载按钮

## Data Sources

从 Zustand gameStore 读取：

| 字段 | 类型 | 用途 |
|------|------|------|
| `life.summary` | `Partial<Record<PropertyTypeKey, SummaryEntry>>` | 7 维总评 |
| `selectedTalents` | `Set<string>` | 已选天赋 ID |
| `randomTalents` | `TalentMeta[]` | 天赋元数据（含 name/description） |
| `trajectoryLog` | `Array<{age, result: NextResult}>` | 生平事件，用于选取戏剧性事件 |

**天赋展示逻辑：** 取 `randomTalents` 中 id 在 `selectedTalents` 内的前 3 条，展示 name。

**戏剧性事件选取逻辑：**
1. 过滤 `trajectoryLog` 中 `result.type === 'EVT'` 的条目
2. 按 grade 降序（SSSS > SSS > SS > S > A > B > C）取最高评级者作为默认
3. 用户可在弹层内点击"换一条"循环切换候选事件列表
4. 展示格式：`"[age]岁 · [event description]"`

## Components

### `src/components/poster/PosterCard.tsx`

纯展示组件，接受 props，渲染海报 DOM 布局，**不含任何 canvas 逻辑**。

```ts
interface PosterCardProps {
  summary: Partial<Record<PropertyTypeKey, SummaryEntry>>;
  talents: TalentMeta[];        // 最多 3 条
  dramaticEvent: string;        // 已格式化字符串
  age: number;                  // 享年
  overallGrade: string;         // 总评 grade 文字（如"普通"）
}
```

布局（从上到下）：
1. 顶部标题："人生重开模拟器"（字母间距宽，小字，暖棕色）
2. 享年大字 + 总评小字
3. 7 维属性网格（3列，最后 SUM 单独一行居中）
4. 天赋标签行（最多 3 个，pill 样式）
5. 分割线 + 戏剧性事件引言（斜体，引号包裹）
6. 底部水印："lifeRestart · syaro.io"（极小字，居中，弱化颜色）

样式约束：
- 背景色 `#fef9ef`，边框 `2px solid #e7d9c0`
- 字体 `'PingFang SC', 'Noto Serif SC', serif`
- 宽度固定 `360px`，高度固定 `640px`（由父容器控制）
- 所有颜色使用 `#` hex，不使用 Tailwind 动态类（html2canvas 兼容性）

### `src/hooks/usePosterExport.ts`

```ts
function usePosterExport(cardRef: RefObject<HTMLDivElement>): {
  dataUrl: string | null;
  isGenerating: boolean;
  generate: () => Promise<void>;
  clear: () => void;
}
```

- 调用 `html2canvas(cardRef.current, { scale: 2, useCORS: true })`
- 返回 `canvas.toDataURL('image/png')`
- 捕获错误时 `console.error` 并保持 `dataUrl: null`

### `src/components/poster/PosterModal.tsx`

弹层组件：

```ts
interface PosterModalProps {
  dataUrl: string;
  dramaticEvent: string;
  onSwapEvent: () => void;
  onClose: () => void;
}
```

布局：
- 半透明黑色遮罩，点击遮罩关闭
- 居中显示 `<img src={dataUrl} style="max-height:80vh" />`，长按可保存
- 图片下方两个按钮："换一条事件" + "保存图片"（触发 `<a download="life-poster.png">`）
- 顶部右上角关闭按钮

### `src/pages/SummaryPage.tsx` 修改

- 新增隐藏的 `<div ref={cardRef} style="position:fixed;left:-9999px;top:0">` 内含 `<PosterCard>`
- 新增"分享海报"按钮，点击后调用 `generate()`，生成完成后打开 `PosterModal`
- 维护 `currentEventIndex` state 用于"换一条"循环

## Dependencies

新增：`html2canvas`（已在 npm，约 60kB gzip）

```bash
pnpm add html2canvas
pnpm add -D @types/html2canvas
```

## Error Handling

- `html2canvas` 失败：按钮恢复可点击状态，toast 提示"海报生成失败，请重试"
- 无事件可选（`trajectoryLog` 全为天赋条目）：戏剧性事件显示享年引言兜底文案

## Out of Scope

- 直接调用分享 API（Web Share API）：兼容性差，不做
- 海报内嵌二维码：不做
- 多语言海报：不做（仅中文）
