# 代码分离方案

## 现状

当前所有代码集中在 `three-sphere.html` 一个文件中（~3073 行）：
- CSS 样式：~695 行（L7-L702）
- HTML 结构：~81 行（L704-L785）
- Import Map：~7 行（L786-L793）
- JavaScript：~2276 行（L795-L3071）

JS 内部有 19 个 `// =====` 逻辑段，但全部共享模块作用域变量，耦合度极高。

---

## 目标结构

```
xuancaijiezou3D-main/
├── index.html                  # HTML 骨架 + importmap
├── css/
│   └── style.css               # 全部样式
├── js/
│   ├── main.js                 # 入口：初始化 + 启动
│   ├── state.js                # 共享可变状态（全局单例）
│   ├── config.js               # 常量 & 关卡数据 & ENDLESS_STAGES
│   ├── scene.js                # Three.js 场景/相机/渲染器/控制器
│   ├── strategy.js             # 策略模式（levelStrategy / endlessStrategy）
│   ├── ui.js                   # UI 函数（选关/GameOver/胜利/公告等）
│   ├── track.js                # 轨道组系统（生成/碰撞/更新）
│   ├── effects.js              # 粒子/着陆特效/连击/加速轨道
│   ├── player.js               # 球体/物理/鼠标控制
│   ├── blackhole.js            # 黑洞系统
│   └── game.js                 # 游戏循环/状态管理/reset/start
├── server.js                   # HTTP 服务器
└── design/                     # 设计文档
```

---

## 分阶段实施

### Phase 1：样式 & HTML 分离（低风险，立即可做）

将 CSS 和 HTML 拆为独立文件，JS 暂保留内联。

**改动：**
- 提取 `<style>...</style>` 内容 → `css/style.css`
- `index.html` 中 `<link rel="stylesheet" href="css/style.css">`
- HTML body 部分保留在 `index.html`
- `<script type="module">` 内容保留在 `index.html`

**风险：** 无。纯搬运，不改变任何逻辑。

---

### Phase 2：JS 提取为单文件（低风险）

将 `<script type="module">` 内容整体移入 `js/game.js`。

**改动：**
- 提取 JS → `js/game.js`
- `index.html` 中 `<script type="module" src="js/game.js"></script>`
- importmap 保留在 `index.html` 的 `<head>` 中

**风险：** 极低。ES module 的 `src` 属性与内联等效。

---

### Phase 3：JS 模块化拆分（高风险，需仔细设计）

这是核心难点。当前所有变量在同一个模块作用域，直接拆分会导致大量
`ReferenceError`。需要引入 **共享状态模块** 作为桥梁。

#### 3.1 共享状态模块 `state.js`

```javascript
// state.js — 全局可变状态单例
// 所有模块 import 同一个对象，通过属性读写共享状态

export const state = {
  // Three.js 核心
  scene: null,
  camera: null,
  renderer: null,
  controls: null,

  // 游戏模式
  gameMode: 'levels',
  strategy: null,

  // 轨道
  trackGroups: [],
  groupZList: [],

  // 球体 & 物理
  ball: null,
  ballMats: [],
  velocity: { x: 0, y: 0, z: 0 },
  isOnGround: false,

  // 关卡进度
  currentLevel: 1,
  hitCount: 0,
  winHits: 5,
  totalDistance: 0,

  // 无限模式
  currentStageIndex: 0,
  endlessBestDistance: 0,
  endlessBestStageIndex: 0,
  endlessTotalRuns: 0,

  // UI 状态
  currentTab: 'levels',
  lastEndlessDistance: 0,
  lastEndlessStageIndex: 0,
  lastEndlessNewRecord: false,

  // ... 其他共享变量
};
```

**设计原则：**
- `state` 是唯一真源（Single Source of Truth）
- 所有模块通过 `import { state } from './state.js'` 访问
- 读：`state.gameMode`；写：`state.gameMode = 'endless'`
- 不可变常量放 `config.js`，可变状态放 `state.js`

#### 3.2 各模块职责 & 导出

| 模块 | 导出 | 依赖 |
|------|------|------|
| `config.js` | `LEVELS`, `ENDLESS_STAGES`, `COLORS`, `TRACK_DIMS`, 常量 | 无 |
| `state.js` | `state` (可变状态对象) | 无 |
| `scene.js` | `initScene()` → 填充 state.scene/camera/renderer | `state` |
| `strategy.js` | `levelStrategy`, `endlessStrategy`, `switchMode()` | `state`, `config`, `ui`, `game` |
| `ui.js` | `showLevelSelect()`, `showEndlessSelect()`, `showGameOver()`, `showEndlessGameOver()`, `showLevelAnnounce()`, `showEndlessStageAnnounce()`, `switchTab()`, `updateEndlessPanel()`, `resetDistanceUI()` | `state`, `config` |
| `track.js` | `createRandomGroup()`, `generateInitialGroups()`, `updateTrack()`, `getLevel()`, `randGap()` | `state`, `config`, `scene` |
| `effects.js` | `initParticles()`, `initBoostTrack()`, `spawnLandingEffect()`, `updateCombo()`, `updateBoostTimer()` | `state`, `scene` |
| `player.js` | `initBall()`, `updateBallPhysics()`, `handleMouseControl()` | `state`, `config`, `scene` |
| `blackhole.js` | `createBlackhole()`, `updateBlackhole()` | `state`, `scene` |
| `game.js` | `startGame()`, `resetGame()`, `animate()`, `saveLevelProgress()`, `loadLevelProgress()`, `saveEndlessProgress()`, `loadEndlessProgress()` | `state`, `config`, 所有模块 |
| `main.js` | 入口：调用各模块 init，绑定事件，启动循环 | 所有模块 |

#### 3.3 循环依赖处理

策略模块 (`strategy.js`) 需要调用 UI 函数（如 `showEndlessGameOver`），
而 UI 模块需要读取 `strategy` 状态。这形成循环依赖。

**解决方案：延迟绑定（Lazy Binding）**

```javascript
// strategy.js
let _ui = null;
export function bindUI(uiModule) { _ui = uiModule; }

export const endlessStrategy = {
  onGameOver() { _ui.showEndlessGameOver(); },
  // ...
};
```

```javascript
// main.js
import * as ui from './ui.js';
import { bindUI } from './strategy.js';

bindUI(ui);  // 在所有模块加载后绑定
```

或者更简洁地：让 strategy 只操作 `state`，由 `game.js`（主循环）
根据 state 变化调用 UI，避免 strategy 直接依赖 UI。

#### 3.4 DOM 引用管理

当前代码大量使用 `document.getElementById()`。建议集中管理：

```javascript
// ui.js
const $ = (id) => document.getElementById(id);

export const dom = {
  levelSelectOverlay: $('levelSelectOverlay'),
  gameOverOverlay: $('gameOverOverlay'),
  victoryOverlay: $('victoryOverlay'),
  restartBtn: $('restartBtn'),
  // ...
};
```

---

## 实施建议

| 阶段 | 工作量 | 风险 | 建议时机 |
|------|--------|------|----------|
| Phase 1 | 0.5h | 无 | 立即 |
| Phase 2 | 0.5h | 极低 | 紧接 Phase 1 |
| Phase 3 | 4-8h | 高 | 功能稳定后 |

**Phase 3 的关键风险点：**
1. **变量作用域变更**：模块作用域 → state 对象属性，所有读写点都要改
2. **循环依赖**：strategy ↔ ui/game 需要延迟绑定或事件机制
3. **初始化顺序**：模块加载顺序可能影响 `state` 填充时机
4. **测试回归**：每个模块拆出后需验证功能完整性

**建议：** Phase 1 + Phase 2 可以立即执行，Phase 3 等功能完全稳定后
再进行，且应按模块逐个拆出（每次只拆一个模块，验证通过后再拆下一个）。
