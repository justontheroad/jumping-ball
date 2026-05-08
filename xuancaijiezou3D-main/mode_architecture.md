# 多游戏模式架构抽象方案

## 一、现状分析：耦合点全景图

当前所有游戏逻辑集中在单个 `<script type="module">` 中，约2500行代码。模式相关逻辑散布在各处，通过全局变量 `currentLevel`、`currentCycle` 隐式驱动。

### 1.1 耦合点分类

将所有模式依赖点按**职责**分为6类：

| 类别 | 耦合点 | 位置 | 当前逻辑 |
|------|--------|------|---------|
| **A. 参数查询** | `getAvailableColors()` | L819 | 依赖 `currentLevel` 决定颜色数 |
| | `getLevel()` | L981 | 依赖 `currentLevel` + `currentCycle` 返回 maxType/winHits |
| | `getColorCount()` | L1031 | 依赖 `currentLevel` 返回颜色数 |
| **B. 轨道生成** | `randGap()` | L1288 | 固定 GAP_MIN~GAP_MAX，无模式分支 |
| | `createRandomGroup()` | L1235 | boost概率硬编码0.15，safeColor/maxType来自调用方 |
| | `generateInitialGroups()` | L1296 | 前5个type1 + 随机填充，调用 `getLevel().maxType` |
| | `updateTrack()` | L1322 | 补充轨道时调用 `getLevel().maxType`，受 `victoryTrackSpawned` 阻断 |
| | `createVictoryTrack()` | L1181 | 整个函数仅关卡模式使用 |
| **C. 碰撞/胜利判定** | `hitCount >= getLevel().winHits` | L2402, L2440 | 触发胜利轨道生成 |
| | `group.isVictoryTrack` | L2414 | 踩到通关轨道触发胜利 |
| | `winning` / `updateWin()` | L2473 | 胜利吸入动画 |
| | `blackHoleActive` | L2475 | 黑洞视觉更新 |
| **D. UI 显示** | `resetDistanceUI()` | L1916 | 显示关卡名+目标距离 |
| | `showLevelAnnounce()` | L2171 | 显示关卡名+跳跃次数 |
| | `showVictory()` | L2125 | 胜利弹窗内容（下一关/下一周目） |
| | `showGameOver()` | L1879 | GameOver弹窗（仅"返回选关"） |
| | `showLevelSelect()` | L1072 | 选关界面（周目显示） |
| **E. 流程控制** | `resetGame()` | L2235 | 重置所有状态，调用关卡相关函数 |
| | `startGame()` | L1092 | 隐藏选关+重置游戏 |
| | `victoryBtn.click` | L2146 | 下一关/下一周目逻辑 |
| | `restartBtn.click` | L1885 | 返回选关 |
| **F. 进度存储** | `saveProgress()` | L1003 | 存储 unlockedLevels/currentLevel/currentCycle |
| | `loadProgress()` | L1013 | 读取关卡进度 |
| | `unlockNextLevel()` | L995 | 解锁下一关 |

### 1.2 核心矛盾

当前代码的**6类耦合点**交织在一起，无法通过简单的 `if (gameMode === 'endless')` 分支干净地隔离——那样会在每个函数中散布条件判断，导致：
- 代码可读性急剧下降
- 新增模式时需要修改大量函数
- 测试困难，模式间容易互相影响

---

## 二、抽象方案对比

### 方案A：条件分支法（if/else）

**思路**：在每个耦合点添加 `if (gameMode === 'endless')` 分支。

```javascript
function getAvailableColors() {
  if (gameMode === 'endless') {
    return getEndlessColors(totalDistance);
  }
  // 原有关卡逻辑
  if (currentLevel >= 9) return [...baseColors, 'green', 'orange', 'purple'];
  ...
}
```

| 优点 | 缺点 |
|------|------|
| 改动最小，快速实现 | 分支散布各处，维护困难 |
| 不改变现有结构 | 新增模式需修改每个函数 |
| 直观易懂 | 模式间逻辑耦合，容易出bug |

**评估**：适合只有2种模式且不再扩展的场景。但若未来加入更多模式（如限时模式、双人模式），代码将不可维护。

### 方案B：配置对象法（Config Object）

**思路**：定义模式配置对象，将差异参数提取为配置项，函数通过读取配置工作。

```javascript
const MODE_CONFIGS = {
  levels: {
    getAvailableColors: () => { /* 关卡逻辑 */ },
    getWinHits: () => getLevel().winHits,
    hasVictory: true,
    getGapScale: () => 1.0,
    getBoostProb: () => 0.15,
    // ...
  },
  endless: {
    getAvailableColors: () => getEndlessStage(totalDistance).colors,
    getWinHits: () => Infinity,
    hasVictory: false,
    getGapScale: () => getEndlessStage(totalDistance).gapScale,
    getBoostProb: () => getEndlessStage(totalDistance).boostProb,
    // ...
  }
};

let modeConfig = MODE_CONFIGS.levels;

// 使用时
function getAvailableColors() {
  return modeConfig.getAvailableColors();
}
```

| 优点 | 缺点 |
|------|------|
| 差异集中在一处定义 | 配置对象可能变得庞大 |
| 新增模式只需添加配置 | 行为差异大时配置项过多 |
| 不修改现有函数结构 | 无法处理流程级差异（如胜利判定流程） |

**评估**：适合参数级差异，但无法处理流程级差异（如无限模式没有胜利流程）。

### 方案C：策略模式（Strategy Pattern）⭐ 推荐

**思路**：将每种模式封装为**策略对象**，包含该模式全部行为接口。游戏核心逻辑只调用策略接口，不关心具体模式。

```javascript
const levelStrategy = {
  getAvailableColors() { ... },
  getMaxType() { return getLevel().maxType; },
  getWinHits() { return getLevel().winHits; },
  getGapScale() { return 1.0; },
  getBoostProb() { return 0.15; },
  hasVictory() { return true; },
  onHitCountReached() { createVictoryTrack(...); blackHoleActive = true; },
  onLandOnVictoryTrack() { winning = true; ... },
  getDisplayName() { return getLevel().name; },
  getAnnounceText() { return `LEVEL ${currentLevel+1}`; },
  getDistanceTarget() { return targetDistance; },
  onGameOver() { showGameOver(); },
  onVictory() { showVictory(); },
  resetState() { /* 关卡模式特有重置 */ },
  saveProgress() { saveLevelProgress(); },
  getNextAction() { /* 胜利后：下一关/下一周目 */ },
};

const endlessStrategy = {
  getAvailableColors() { return getEndlessStage(totalDistance).colors; },
  getMaxType() { return getEndlessStage(totalDistance).maxType; },
  getWinHits() { return Infinity; },
  getGapScale() { return getEndlessStage(totalDistance).gapScale; },
  getBoostProb() { return getEndlessStage(totalDistance).boostProb; },
  hasVictory() { return false; },
  onHitCountReached() { /* 无限模式：什么都不做 */ },
  onLandOnVictoryTrack() { /* 不会触发 */ },
  getDisplayName() { return `无垠 · 阶段${currentStageIndex+1}`; },
  getAnnounceText() { return `阶段 ${currentStageIndex+1}`; },
  getDistanceTarget() { return null; },
  onGameOver() { showEndlessGameOver(); },
  onVictory() { /* 不会触发 */ },
  resetState() { /* 无限模式特有重置 */ },
  saveProgress() { saveEndlessProgress(); },
  getNextAction() { /* GameOver后：再来一次 */ },
};

let strategy = levelStrategy;
```

| 优点 | 缺点 |
|------|------|
| 模式完全隔离，互不影响 | 初始改造工作量较大 |
| 新增模式只需添加策略 | 需要定义清晰的策略接口 |
| 核心逻辑无分支，可读性好 | 策略接口需要前瞻性设计 |
| 可独立测试每种模式 |  |
| 流程级差异也能优雅处理 |  |

**评估**：最适合长期维护和多模式扩展。初始投入稍大，但后续新增模式成本极低。

---

## 三、推荐方案：策略模式（详细设计）

### 3.1 策略接口定义

根据6类耦合点，定义策略接口如下：

```javascript
// ===== 游戏模式策略接口 =====
// 每种模式必须实现以下全部方法

const strategyInterface = {
  // ─── A. 参数查询 ───
  getAvailableColors(),     // 返回当前可用颜色数组
  getMaxType(),             // 返回当前最大轨道类型 (1/2/3)
  getWinHits(),             // 返回通关所需碰撞次数 (Infinity=无限)
  getColorCount(),          // 返回当前颜色数量（用于UI显示）

  // ─── B. 轨道生成 ───
  getGapScale(),            // 返回间距缩放系数 (0.75~1.0)
  getBoostProb(),           // 返回加速轨道概率 (0.15~0.30)

  // ─── C. 碰撞/胜利判定 ───
  hasVictory(),             // 是否有胜利机制
  onHitCountReached(),      // hitCount达到winHits时的回调
  onLandOnVictoryTrack(),   // 踩到通关轨道时的回调
  checkStageTransition(),   // 检查阶段切换（无限模式专用，关卡模式空实现）

  // ─── D. UI 显示 ───
  getDisplayName(),         // 返回当前显示名（如"土星"或"无垠 · 阶段3"）
  getAnnounceInfo(),        // 返回闪现信息 { num, title, sub }
  getDistanceTargetText(),  // 返回目标行文本（如"目标: 120m"或"最远: 256m"）
  onGameOver(),             // GameOver时的UI处理
  onVictory(),              // 胜利时的UI处理

  // ─── E. 流程控制 ───
  resetState(),             // 模式特有的状态重置
  onGameOverRestart(),      // GameOver后重试的行为
  onVictoryNext(),          // 胜利后下一步的行为

  // ─── F. 进度存储 ───
  saveProgress(),           // 保存模式进度
  loadProgress(),           // 加载模式进度
};
```

### 3.2 关卡模式策略实现

```javascript
const levelStrategy = {
  getAvailableColors() {
    const base = ['pink', 'yellow', 'blue'];
    if (currentLevel >= 9) return [...base, 'green', 'orange', 'purple'];
    if (currentLevel >= 7) return [...base, 'green', 'orange'];
    if (currentLevel >= 5) return [...base, 'green'];
    return base;
  },
  getMaxType() { return getLevel().maxType; },
  getWinHits() { return getLevel().winHits; },
  getColorCount() {
    if (currentLevel >= 9) return 6;
    if (currentLevel >= 7) return 5;
    if (currentLevel >= 5) return 4;
    return 3;
  },
  getGapScale() { return 1.0; },
  getBoostProb() { return 0.15; },
  hasVictory() { return true; },
  onHitCountReached() {
    const victoryZ = -10 - Math.random() * 8;
    createVictoryTrack(victoryZ);
    blackHoleActive = true;
  },
  onLandOnVictoryTrack() {
    winning = true;
    winTimer = 0;
    velZ = 0;
    falling = false;
    bhAttracting = false;
    hideCombo();
    ballY = floorContact;
    velY = Math.abs(velY);
  },
  checkStageTransition() { /* 关卡模式无阶段切换 */ },
  getDisplayName() {
    const lv = getLevel();
    const cycleText = currentCycle > 1 ? `第${currentCycle}周目 · ` : '';
    return `${cycleText}${lv.name}`;
  },
  getAnnounceInfo() {
    const lv = getLevel();
    const cycleText = currentCycle > 1 ? `第${currentCycle}周目 · ` : '';
    return {
      num: `${cycleText}LEVEL ${currentLevel + 1}`,
      title: lv.name,
      sub: `跳 ${lv.winHits} 次 · ${this.getColorCount()}种颜色`
    };
  },
  getDistanceTargetText() {
    if (targetDistance !== null) return `目标: ${Math.floor(targetDistance)} m`;
    return '目标: ??? m';
  },
  onGameOver() { showGameOver(); },
  onVictory() { showVictory(); },
  resetState() {
    victoryTrackGroups = [];
    victoryTrackSpawned = false;
    blackHoleActive = false;
    bhAttracting = false;
    winning = false;
    winTimer = 0;
    cleanupBlackHole();
  },
  onGameOverRestart() { showLevelSelect(); },
  onVictoryNext() {
    unlockNextLevel();
    const isLast = currentLevel >= LEVELS.length - 1;
    if (isLast) {
      currentCycle++;
      currentLevel = 0;
      unlockedLevels = [true, false, ...];
      saveProgress();
      showLevelSelect();
    } else {
      currentLevel++;
      saveProgress();
      startGame();
    }
  },
  saveProgress() { /* 现有 saveProgress 逻辑 */ },
  loadProgress() { /* 现有 loadProgress 逻辑 */ },
};
```

### 3.3 无限模式策略实现

```javascript
const endlessStrategy = {
  getAvailableColors() {
    const stage = getEndlessStage(totalDistance);
    const base = ['pink', 'yellow', 'blue'];
    const extras = ['green', 'orange', 'purple'];
    return [...base, ...extras.slice(0, stage.colorCount - 3)];
  },
  getMaxType() { return getEndlessStage(totalDistance).maxType; },
  getWinHits() { return Infinity; },
  getColorCount() { return getEndlessStage(totalDistance).colorCount; },
  getGapScale() { return getEndlessStage(totalDistance).gapScale; },
  getBoostProb() { return getEndlessStage(totalDistance).boostProb; },
  hasVictory() { return false; },
  onHitCountReached() { /* 无限模式不触发胜利 */ },
  onLandOnVictoryTrack() { /* 不会触发 */ },
  checkStageTransition() {
    const stage = getEndlessStage(totalDistance);
    const newIdx = ENDLESS_STAGES.indexOf(stage);
    if (newIdx > currentStageIndex) {
      currentStageIndex = newIdx;
      showEndlessStageAnnounce(stage);
    }
  },
  getDisplayName() {
    const stage = getEndlessStage(totalDistance);
    return `无垠 · ${stage.name}`;
  },
  getAnnounceInfo() {
    const stage = getEndlessStage(totalDistance);
    return {
      num: `阶段 ${currentStageIndex + 1}`,
      title: stage.name,
      sub: `${stage.colorCount}种颜色 · 间距${stage.gapScale < 1 ? '缩小' : '正常'}`
    };
  },
  getDistanceTargetText() {
    return endlessBestDistance > 0 ? `最远: ${endlessBestDistance}m` : '';
  },
  onGameOver() { showEndlessGameOver(); },
  onVictory() { /* 不会触发 */ },
  resetState() {
    currentStageIndex = 0;
    // 无限模式不需要胜利/黑洞相关重置
  },
  onGameOverRestart() { startGame(); }, // 直接重开
  onVictoryNext() { /* 不会触发 */ },
  saveProgress() { saveEndlessProgress(); },
  loadProgress() { loadEndlessProgress(); },
};
```

### 3.4 核心逻辑改造示例

改造前后对比，以碰撞判定为例：

**改造前**（L2402, L2440）：
```javascript
hitCount++;
if (hitCount >= getLevel().winHits && !victoryTrackSpawned) {
  const victoryZ = -10 - Math.random() * 8;
  createVictoryTrack(victoryZ);
  blackHoleActive = true;
}
```

**改造后**：
```javascript
hitCount++;
if (hitCount >= strategy.getWinHits()) {
  strategy.onHitCountReached();
}
```

**改造前**（L2414）：
```javascript
if (group.isVictoryTrack && !winning) {
  winning = true;
  winTimer = 0;
  velZ = 0;
  ...
}
```

**改造后**：
```javascript
if (group.isVictoryTrack && !winning) {
  strategy.onLandOnVictoryTrack();
}
```

**改造前**（`randGap`）：
```javascript
function randGap() {
  return GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN);
}
```

**改造后**：
```javascript
function randGap() {
  return (GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN)) * strategy.getGapScale();
}
```

**改造前**（`createRandomGroup` boost概率）：
```javascript
if (Math.random() < 0.15) {
```

**改造后**：
```javascript
if (Math.random() < strategy.getBoostProb()) {
```

### 3.5 模式切换流程

```javascript
let gameMode = 'levels'; // 'levels' | 'endless'
let strategy = levelStrategy;

function switchMode(mode) {
  gameMode = mode;
  strategy = mode === 'levels' ? levelStrategy : endlessStrategy;
  strategy.loadProgress();
}
```

主菜单 Tab 切换时调用 `switchMode()`，开始游戏时 `startGame()` 内部使用 `strategy` 驱动所有行为。

---

## 四、改造影响评估

### 4.1 需要改造的函数清单

| 函数 | 改造方式 | 改动量 |
|------|---------|--------|
| `getAvailableColors()` | 委托 `strategy.getAvailableColors()` | 1行 |
| `getLevel()` | 保留（关卡模式内部使用），新增 `strategy.getMaxType()` 等替代调用 | 小 |
| `getColorCount()` | 委托 `strategy.getColorCount()` | 1行 |
| `randGap()` | 乘以 `strategy.getGapScale()` | 1行 |
| `createRandomGroup()` | boost概率用 `strategy.getBoostProb()` | 1行 |
| `generateInitialGroups()` | `getLevel().maxType` → `strategy.getMaxType()` | 1行 |
| `updateTrack()` | `getLevel().maxType` → `strategy.getMaxType()`，`victoryTrackSpawned` 条件用 `strategy.hasVictory()` 守卫 | 2行 |
| `resetDistanceUI()` | 委托 `strategy.getDisplayName()` + `strategy.getDistanceTargetText()` | 3行 |
| `showLevelAnnounce()` | 委托 `strategy.getAnnounceInfo()` | 3行 |
| `showGameOver()` | 委托 `strategy.onGameOver()` | 1行 |
| `showVictory()` | 委托 `strategy.onVictory()` | 1行 |
| `resetGame()` | 委托 `strategy.resetState()` | 替换部分逻辑 |
| 碰撞判定(L2402,L2440) | `strategy.getWinHits()` + `strategy.onHitCountReached()` | 4行 |
| 通关轨道判定(L2414) | `strategy.onLandOnVictoryTrack()` | 5行 |
| `victoryBtn.click` | `strategy.onVictoryNext()` | 替换 |
| `restartBtn.click` | `strategy.onGameOverRestart()` | 1行 |
| `saveProgress()` | `strategy.saveProgress()` | 1行 |
| `loadProgress()` | `strategy.loadProgress()` | 1行 |
| `animate()` | 新增 `strategy.checkStageTransition()` | 1行 |

### 4.2 不需要改造的部分

以下代码与模式无关，完全复用：
- Three.js 场景/渲染器/相机
- 球体物理（重力、弹跳、X轴控制）
- 碰撞检测（`findCollisionWithAnyGroup`）
- 轨道类型创建（`createType1/2/3/4`）
- 碎裂动画系统
- 着陆特效系统
- 加速轨道机制
- 粒子系统
- 黑洞视觉（`createBlackHole`、`updateBlackHole`）

### 4.3 新增代码清单

| 新增内容 | 估计行数 |
|---------|---------|
| `ENDLESS_STAGES` 常量 | ~10行 |
| `getEndlessStage()` 函数 | ~5行 |
| `endlessStrategy` 对象 | ~60行 |
| `levelStrategy` 对象（从现有逻辑提取） | ~60行 |
| 无限模式UI（HTML+CSS） | ~80行 |
| 无限模式GameOver弹窗 | ~30行 |
| `showEndlessStageAnnounce()` | ~10行 |
| `showEndlessGameOver()` | ~15行 |
| 记录存储函数 | ~20行 |
| Tab切换逻辑 | ~20行 |
| **合计** | **~310行** |

---

## 五、实施路径

### 阶段1：策略接口提取（不改变行为）

1. 定义 `levelStrategy`，将现有逻辑提取到策略方法中
2. 设置 `strategy = levelStrategy`，所有调用点改为 `strategy.xxx()`
3. **验证**：行为完全不变，只是代码组织方式改变

### 阶段2：实现无限模式策略

1. 定义 `ENDLESS_STAGES`、`getEndlessStage()`
2. 实现 `endlessStrategy`
3. 添加 `switchMode()` 函数

### 阶段3：无限模式UI

1. 主菜单Tab切换
2. 无限模式面板
3. GameOver弹窗扩展
4. 阶段切换闪现

### 阶段4：记录与存储

1. 无限模式进度存储
2. 最远记录显示
3. 新纪录检测

---

## 六、策略接口完整定义

```javascript
// 策略接口规范（JSDoc）
const strategyProto = {
  // ═══ 参数查询 ═══
  /** @returns {string[]} 当前可用颜色key数组 */
  getAvailableColors() {},
  /** @returns {number} 当前最大轨道类型 1/2/3 */
  getMaxType() {},
  /** @returns {number} 通关所需碰撞次数，Infinity=无通关 */
  getWinHits() {},
  /** @returns {number} 当前颜色数量（UI显示用） */
  getColorCount() {},

  // ═══ 轨道生成 ═══
  /** @returns {number} 间距缩放系数 0.75~1.0 */
  getGapScale() {},
  /** @returns {number} 加速轨道生成概率 0~1 */
  getBoostProb() {},

  // ═══ 碰撞/胜利判定 ═══
  /** @returns {boolean} 是否有胜利机制 */
  hasVictory() {},
  /** hitCount达到winHits时调用 */
  onHitCountReached() {},
  /** 踩到通关轨道时调用 */
  onLandOnVictoryTrack() {},
  /** 每帧检查阶段切换（无限模式用） */
  checkStageTransition() {},

  // ═══ UI显示 ═══
  /** @returns {string} 当前显示名 */
  getDisplayName() {},
  /** @returns {{num:string, title:string, sub:string}} 闪现信息 */
  getAnnounceInfo() {},
  /** @returns {string} 距离目标行文本 */
  getDistanceTargetText() {},
  /** GameOver时的UI处理 */
  onGameOver() {},
  /** 胜利时的UI处理 */
  onVictory() {},

  // ═══ 流程控制 ═══
  /** 模式特有的状态重置（在resetGame中调用） */
  resetState() {},
  /** GameOver后重试行为 */
  onGameOverRestart() {},
  /** 胜利后下一步行为 */
  onVictoryNext() {},

  // ═══ 进度存储 ═══
  /** 保存模式进度到localStorage */
  saveProgress() {},
  /** 从localStorage加载模式进度 */
  loadProgress() {},
};
```

---

## 七、总结

| 维度 | 方案A（条件分支） | 方案B（配置对象） | 方案C（策略模式）⭐ |
|------|-----------------|-----------------|-------------------|
| 改动量 | 最小 | 中等 | 中等偏大 |
| 可维护性 | 差 | 中 | 好 |
| 可扩展性 | 差 | 中 | 好 |
| 模式隔离度 | 低 | 中 | 高 |
| 流程级差异支持 | 弱 | 弱 | 强 |
| 测试友好度 | 低 | 中 | 高 |
| 后续新增模式成本 | 高（改每个函数） | 中（加配置项） | 低（加策略对象） |

**推荐方案C（策略模式）**：初始投入稍大，但换来清晰的模式隔离和低扩展成本。实施时按4个阶段推进，阶段1完成后行为完全不变，可安全验证后再进入阶段2。
