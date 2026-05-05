# 关卡设计更新方案

## 一、关卡配置（10关）

### 关卡列表

| 关卡 | 名称 | 英文名 | winHits | maxType | 颜色数量 | 预估距离 |
|------|------|--------|---------|---------|----------|----------|
| 1 | 永恒号 | Endurance | 5 | 1 | 3种 | ~28m |
| 2 | 水星 | Miller | 15 | 2 | 3种 | ~84m |
| 3 | 曼恩星球 | Mann | 30 | 2 | 3种 | ~168m |
| 4 | 米勒星球 | Miller-2 | 50 | 3 | 3种 | ~280m |
| 5 | 土星 | Saturn | 80 | 3 | 3种 | ~448m |
| 6 | 木星 | Jupiter | 120 | 3 | 4种 | ~672m |
| 7 | 天王星 | Uranus | 180 | 3 | 4种 | ~1008m |
| 8 | 海王星 | Neptune | 250 | 3 | 5种 | ~1400m |
| 9 | 超新星 | Supernova | 350 | 3 | 5种 | ~1960m |
| 10 | 卡冈图雅 | Gargantua | 500 | 3 | 6种 | ~2800m |

### 关卡说明

- **maxType**：轨道类型上限
  - 1：仅长直轨道
  - 2：长直轨道 + 双方块
  - 3：长直轨道 + 双方块 + 三方块
- **winHits**：需要跳跃次数（一周目基准值）
- **预估距离**：按平均轨道间距 ~5.6m 计算

---

## 二、周目系统

### 周目难度系数

| 周目 | 难度系数 | winHits 倍率 | 显示规则 |
|------|----------|--------------|----------|
| 一周目 | 1.0x | 1x | 不显示周目信息 |
| 二周目 | 1.5x | 1.5x | 显示"二周目" + 提示语 |
| 三周目 | 2.0x | 2x | 显示周目信息 |
| 四周目 | 2.5x | 2.5x | 显示周目信息 |
| 五周目+ | 3.0x | 3x | 显示周目信息 |

### 周目提示语

| 进入周目 | 提示语 |
|----------|--------|
| 二周目 | 重启轮回，再续前缘 |
| 三周目 | 星河无尽，勇者无疆 |
| 四周目 | 超越极限，永不止步 |
| 五周目+ | 永恒轮回，传说永存 |

### 周目流程

1. 通关第10关后，显示通关弹窗
2. 弹窗显示周目提示语和"开启X周目"按钮
3. 点击按钮后：
   - `currentCycle++`
   - `currentLevel = 0`
   - 重置关卡解锁状态
   - 进入关卡选择界面

---

## 三、颜色系统

### 颜色配置

| 颜色 | 十六进制 | RGB | 解锁关卡 |
|------|----------|-----|----------|
| 粉色 (pink) | `#ff68fd` | (255, 104, 253) | 基础 |
| 黄色 (yellow) | `#ffe528` | (255, 229, 40) | 基础 |
| 蓝色 (blue) | `#15befc` | (21, 190, 252) | 基础 |
| 绿色 (green) | `#00ff88` | (0, 255, 136) | 第6关 |
| 橙色 (orange) | `#ff8844` | (255, 136, 68) | 第8关 |
| 紫色 (purple) | `#aa66ff` | (170, 102, 255) | 第10关 |

### 颜色解锁规则

| 关卡范围 | 颜色数量 | 可用颜色 |
|----------|----------|----------|
| 1-5关 | 3种 | 粉、黄、蓝 |
| 6-7关 | 4种 | 粉、黄、蓝、绿 |
| 8-9关 | 5种 | 粉、黄、蓝、绿、橙 |
| 10关 | 6种 | 粉、黄、蓝、绿、橙、紫 |

### 颜色函数

```javascript
// 根据当前关卡获取可用颜色
function getAvailableColors() {
  const baseColors = ['pink', 'yellow', 'blue'];
  if (currentLevel >= 9) return [...baseColors, 'green', 'orange', 'purple'];
  if (currentLevel >= 7) return [...baseColors, 'green', 'orange'];
  if (currentLevel >= 5) return [...baseColors, 'green'];
  return baseColors;
}

// 随机选择一种颜色
function randColor() {
  const available = getAvailableColors();
  return available[Math.floor(Math.random() * available.length)];
}

// 随机选择两种不同颜色
function randTwoColors() {
  const available = getAvailableColors();
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1]];
}

// 随机选择三种不同颜色
function randThreeColors() {
  const available = getAvailableColors();
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  if (shuffled.length <= 3) return shuffled;
  return [shuffled[0], shuffled[1], shuffled[2]];
}
```

---

## 四、存档系统

### 存档数据结构

```javascript
{
  unlockedLevels: [true, false, false, false, false, false, false, false, false, false],
  currentLevel: 0,
  currentCycle: 1
}
```

### 存档函数

```javascript
function saveProgress() {
  localStorage.setItem('jumpingBall_progress', JSON.stringify({
    unlockedLevels,
    currentLevel,
    currentCycle
  }));
}

function loadProgress() {
  const data = localStorage.getItem('jumpingBall_progress');
  if (data) {
    const parsed = JSON.parse(data);
    if (parsed.unlockedLevels) unlockedLevels = parsed.unlockedLevels;
    if (typeof parsed.currentLevel === 'number') currentLevel = parsed.currentLevel;
    if (typeof parsed.currentCycle === 'number') currentCycle = parsed.currentCycle;
  }
}
```

---

## 五、UI 显示规则

### 关卡选择界面

- **一周目**：标题显示"选择关卡"，副标题显示"INTERSTELLAR"
- **二周目及以上**：标题显示"第X周目"，副标题显示"难度系数: X.Xx"
- **关卡卡片**：显示关卡名称、英文名、颜色数量

### 游戏内距离 UI

- **一周目**：显示关卡名称（如"永恒号"）
- **二周目及以上**：显示"第X周目 · 关卡名"

### 关卡名称闪现

- **一周目**：显示"LEVEL X · 关卡名 · 跳 N 次 · X种颜色"
- **二周目及以上**：显示"第X周目 · LEVEL X · 关卡名 · 跳 N 次 · X种颜色"

---

## 六、实现文件

主要修改文件：`three-sphere.html`

### 关键代码位置

| 功能 | 代码位置 |
|------|----------|
| 关卡配置 | `const LEVELS = [...]` |
| 周目系统 | `let currentCycle`, `CYCLE_MULTIPLIERS`, `CYCLE_MESSAGES` |
| 颜色系统 | `const COLORS`, `getAvailableColors()`, `randColor()` |
| 存档系统 | `saveProgress()`, `loadProgress()` |
| 胜利弹窗 | `showVictory()`, `victoryBtn.addEventListener()` |
| 关卡选择 | `showLevelSelect()`, `updateCardStates()` |
| 关卡闪现 | `showLevelAnnounce()` |

---

## 七、测试要点

1. **关卡解锁**：通关后下一关解锁
2. **周目切换**：通关第10关后进入下一周目
3. **难度系数**：二周目 winHits = 一周目 × 1.5
4. **颜色解锁**：第6关出现绿色，第8关出现橙色，第10关出现紫色
5. **存档持久化**：刷新页面后进度保持
6. **UI 显示**：一周目不显示周目信息，二周目及以上显示
