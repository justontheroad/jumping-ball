# 无限模式（ENDLESS）设计方案

## 一、模式概述

新增 **ENDLESS 无限模式**，与现有10关关卡模式并列。球在无限生成的轨道上持续前进，难度随距离递增，直到出错为止。记录最长运行距离，挑战极限。

---

## 二、主菜单结构

### 2.1 整体布局

主菜单顶部新增**模式切换 Tab**，点击切换两个子页面：

```
┌─────────────────────────────────────────┐
│        [ 关卡模式 ]  [ 无限模式 ]         │  ← Tab 切换栏
│            INTERSTELLAR                  │
│                                         │
│   ─── 关卡模式内容 ───                   │
│   ┌──────┐ ┌──────┐ ┌──────┐            │
│   │ LV 1 │ │ LV 2 │ │ LV 3 │ ...       │  ← 10关卡片（复用现有）
│   └──────┘ └──────┘ └──────┘            │
│                                         │
│   ─── 无限模式内容 ───                   │
│   ┌─────────────────────────┐           │
│   │       ENDLESS           │           │  ← 大卡片
│   │        无垠              │           │
│   │    最远: 1275m          │           │
│   │    [ 开始挑战 ]          │           │
│   └─────────────────────────┘           │
│                                         │
│          返回菜单                         │
└─────────────────────────────────────────┘
```

### 2.2 关卡模式 Tab

- **完全复用现有选关界面**：10关卡片、锁定/解锁状态、周目显示
- 点击卡片 → 进入对应关卡游戏
- 无任何变化，保持现有逻辑

### 2.3 无限模式 Tab

切换到无限模式时，隐藏关卡卡片，显示一个居中的大卡片：

```
┌───────────────────────────┐
│                           │
│       E N D L E S S       │   ← 英文名，大字，渐变色
│                           │
│          无 垠             │   ← 中文名，超大字，渐变色
│                           │
│     ── 最远记录 ──         │   ← 分隔线
│                           │
│        1,275 m            │   ← 最远距离，大字，高亮
│        阶段 6 · 深渊       │   ← 最远阶段名
│                           │
│     ── 本次统计 ──         │   ← 分隔线（仅游戏结束后显示）
│                           │
│        423 m              │   ← 本次距离
│        阶段 4 · 压缩       │   ← 本次到达阶段
│                           │
│     [  开始挑战  ]         │   ← 主按钮，渐变色
│                           │
│     已挑战 42 次           │   ← 小字，总次数
│                           │
└───────────────────────────┘
```

- **首次进入**（无记录）：最远记录显示 `0 m`，阶段显示 `--`
- **有记录时**：显示历史最远距离和阶段
- **游戏结束后返回**：额外显示本次统计，若破纪录则高亮 + `🎉 新纪录!`
- **开始挑战按钮**：点击后进入无限模式游戏

### 2.4 Tab 切换交互

- Tab 栏固定在顶部，两个按钮水平排列
- 当前选中的 Tab 高亮（渐变下划线 + 文字高亮）
- 切换时内容区平滑过渡（淡入淡出）
- Tab 状态记忆：上次选择的 Tab 在下次打开时保持

---

## 三、游戏内 HUD 差异

### 3.1 对比表

| 元素 | 关卡模式 | 无限模式 |
|------|---------|---------|
| 左上角关卡名 | `土星` | `无垠 · 阶段3` |
| 右上角距离 | `35m` | `127m` |
| 右上角目标行 | `目标: ??? m` | `最远: 256m`（显示历史记录） |
| 阶段提示 | 无 | 每进入新阶段闪现提示（复用关卡名闪现动画） |
| 菜单按钮 | `菜单` | `菜单` |

### 3.2 无限模式 HUD 布局

```
┌──────────────────────────────────────────┐
│ 无垠 · 阶段3                   127m     │  ← 左：阶段名  右：当前距离
│                                最远: 256m│  ← 右：历史最远
│                                          │
│              (游戏画面)                    │
│                                          │
│  [菜单]                                  │  ← 左下角
└──────────────────────────────────────────┘
```

### 3.3 阶段切换闪现

当 `totalDistance` 跨越阶段阈值时，屏幕中央闪现阶段信息（复用 `levelAnnounce` 动画）：

```
阶段 3
迷彩
4种颜色 · 间距不变
```

---

## 四、GameOver 弹窗差异

### 4.1 对比表

| 元素 | 关卡模式 | 无限模式 |
|------|---------|---------|
| 标题 | `GAME OVER` | `GAME OVER` |
| 描述 | `颜色不同，球碎了...` | `颜色不同，球碎了...` |
| 本次距离 | 无 | `本次: 423m` |
| 新纪录 | 无 | 若破纪录，显示 `🎉 新纪录!`（渐变高亮） |
| 按钮 | `返回选关` | `再来一次` + `返回菜单` |

### 4.2 无限模式 GameOver 布局

```
┌─────────────────────────┐
│       GAME OVER          │
│  颜色不同，球碎了...      │
│                          │
│      本次: 423m          │
│    🎉 新纪录!            │   ← 仅破纪录时显示
│                          │
│   [ 再来一次 ]            │   ← 主按钮，直接重开
│                          │
│     返回菜单              │   ← 文字链接
└─────────────────────────┘
```

- **再来一次**：直接重置并开始新的无限模式游戏，不返回菜单
- **返回菜单**：返回主菜单的无限模式 Tab 页

---

## 五、难度递增系统

### 5.1 阶段划分

根据行进距离划分阶段，每个阶段增加一项难度维度：

| 阶段 | 距离 | 颜色数 | maxType | 间距缩放 | 加速轨道概率 | 阶段名 |
|------|------|--------|---------|---------|------------|--------|
| 1 | 0-100m | 3 | 2 | 1.0 | 15% | 启程 |
| 2 | 100-250m | 3 | 3 | 1.0 | 15% | 加速 |
| 3 | 250-450m | 4 | 3 | 1.0 | 15% | 迷彩 |
| 4 | 450-700m | 4 | 3 | 0.9 | 15% | 压缩 |
| 5 | 700-1000m | 5 | 3 | 0.85 | 20% | 混沌 |
| 6 | 1000-1400m | 5 | 3 | 0.8 | 25% | 深渊 |
| 7 | 1400m+ | 6 | 3 | 0.75 | 30% | 无尽 |

### 5.2 难度参数函数

```javascript
const ENDLESS_STAGES = [
  { dist: 0,    name: '启程', nameEn: 'Departure',   colorCount: 3, maxType: 2, gapScale: 1.0,  boostProb: 0.15 },
  { dist: 100,  name: '加速', nameEn: 'Acceleration', colorCount: 3, maxType: 3, gapScale: 1.0,  boostProb: 0.15 },
  { dist: 250,  name: '迷彩', nameEn: 'Camouflage',   colorCount: 4, maxType: 3, gapScale: 1.0,  boostProb: 0.15 },
  { dist: 450,  name: '压缩', nameEn: 'Compression',  colorCount: 4, maxType: 3, gapScale: 0.9,  boostProb: 0.15 },
  { dist: 700,  name: '混沌', nameEn: 'Chaos',        colorCount: 5, maxType: 3, gapScale: 0.85, boostProb: 0.20 },
  { dist: 1000, name: '深渊', nameEn: 'Abyss',        colorCount: 5, maxType: 3, gapScale: 0.8,  boostProb: 0.25 },
  { dist: 1400, name: '无尽', nameEn: 'Infinity',     colorCount: 6, maxType: 3, gapScale: 0.75, boostProb: 0.30 }
];

function getEndlessStage(distance) {
  let stage = ENDLESS_STAGES[0];
  for (const s of ENDLESS_STAGES) {
    if (distance >= s.dist) stage = s;
  }
  return stage;
}
```

### 5.3 难度维度说明

- **颜色数**：可用颜色从3种逐步增加到6种，颜色越多 type2/type3 的选择越难
- **maxType**：阶段1只有type1+type2，阶段2起加入type3（三方块），难度跳升
- **间距缩放**：轨道间距乘以缩放系数，系数越小间距越窄，反应时间越短
- **加速轨道概率**：type4 出现概率增加，加速后落地更难控制

---

## 六、核心逻辑改造

### 6.1 游戏模式标识

```javascript
let gameMode = 'levels'; // 'levels' | 'endless'
```

### 6.2 关键函数适配

| 函数 | 改造内容 |
|------|---------|
| `getAvailableColors()` | 无限模式下根据 `getEndlessStage(totalDistance).colorCount` 返回颜色 |
| `getLevel()` | 无限模式下返回 `{ maxType: stage.maxType, winHits: Infinity, name: stage.name, nameEn: stage.nameEn }` |
| `createRandomGroup()` | 无限模式下 boost 概率使用 `stage.boostProb` |
| `randGap()` | 无限模式下乘以 `stage.gapScale` |
| `resetDistanceUI()` | 无限模式下显示阶段名+最远记录，无目标行 |
| `showLevelAnnounce()` | 无限模式下显示阶段名 |
| `showGameOver()` | 无限模式下显示本次距离+新纪录+再来一次按钮 |
| `hitCount >= winHits` | 无限模式下 `winHits = Infinity`，永远不触发胜利轨道 |

### 6.3 胜利/黑洞逻辑

无限模式下**不生成黑洞、不触发胜利**。球持续在无限轨道上前进，直到：
- 碰到异色方块 → 死亡
- 掉落轨道 → 死亡

具体实现：`getLevel()` 在无限模式下返回 `winHits: Infinity`，`hitCount >= winHits` 永远为 false。

### 6.4 阶段切换检测

在 `animate()` 主循环中检测阶段切换：

```javascript
let currentStageIndex = 0;

// 在 animate 中
if (gameMode === 'endless') {
  const newStage = getEndlessStage(totalDistance);
  const newIdx = ENDLESS_STAGES.indexOf(newStage);
  if (newIdx > currentStageIndex) {
    currentStageIndex = newIdx;
    showEndlessStageAnnounce(newStage);
  }
}
```

### 6.5 记录存储

```javascript
// localStorage key: 'jumpingBall_endless'
{
  bestDistance: 1275,   // 最远距离（米）
  bestStageIndex: 5,    // 最远阶段索引
  totalRuns: 42         // 总挑战次数
}

function saveEndlessProgress() {
  try {
    localStorage.setItem('jumpingBall_endless', JSON.stringify({
      bestDistance: endlessBestDistance,
      bestStageIndex: endlessBestStageIndex,
      totalRuns: endlessTotalRuns
    }));
  } catch (e) {}
}

function loadEndlessProgress() {
  try {
    const data = localStorage.getItem('jumpingBall_endless');
    if (data) {
      const parsed = JSON.parse(data);
      endlessBestDistance = parsed.bestDistance || 0;
      endlessBestStageIndex = parsed.bestStageIndex || 0;
      endlessTotalRuns = parsed.totalRuns || 0;
    }
  } catch (e) {}
}
```

---

## 七、UI 元素清单

### 7.1 新增 HTML 元素

| 元素 | 用途 |
|------|------|
| `#modeTabs` | 模式切换 Tab 栏容器 |
| `#tabLevels` | 关卡模式 Tab 按钮 |
| `#tabEndless` | 无限模式 Tab 按钮 |
| `#endlessPanel` | 无限模式面板（大卡片+记录+按钮） |
| `#endlessBestDist` | 最远距离显示 |
| `#endlessBestStage` | 最远阶段显示 |
| `#endlessStartBtn` | 开始挑战按钮 |
| `#endlessTotalRuns` | 总挑战次数 |
| `#endlessNewRecord` | 新纪录标识 |
| `#retryBtn` | GameOver 中的"再来一次"按钮 |

### 7.2 新增 CSS

- Tab 栏样式（水平排列、选中高亮、渐变下划线）
- 无限模式大卡片样式（居中、渐变边框、记录数字高亮）
- 新纪录动画（脉冲发光）
- 面板切换过渡动画

---

## 八、实现步骤

1. **新增模式标识和参数系统**：`gameMode` 变量、`ENDLESS_STAGES` 常量、`getEndlessStage()` 函数、记录存储函数
2. **改造主菜单**：添加 Tab 切换栏 + 无限模式面板，关卡模式内容不变
3. **适配核心函数**：`getAvailableColors()`、`getLevel()`、`randGap()`、`createRandomGroup()` 等增加无限模式分支
4. **改造 HUD**：距离显示、阶段名、最远记录
5. **改造 GameOver 弹窗**：显示本次距离、新纪录、再来一次按钮
6. **阶段切换提示**：距离跨越阈值时闪现阶段信息
7. **记录存储**：localStorage 读写最远距离
8. **禁用胜利逻辑**：无限模式下不生成黑洞/胜利轨道

---

## 九、设计原则

- **零侵入**：关卡模式的所有逻辑完全不变，无限模式通过 `if (gameMode === 'endless')` 分支实现
- **复用优先**：轨道生成、碰撞检测、物理引擎全部复用，仅参数不同
- **渐进难度**：从3色简单开始，让玩家有热身期，逐步加到6色+窄间距+高加速概率
- **记录驱动**：最远距离是唯一目标，激励反复挑战
- **快速重试**：GameOver 后"再来一次"直接重开，减少操作步骤
