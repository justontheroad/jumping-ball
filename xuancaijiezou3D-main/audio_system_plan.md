# 音效系统可行性方案

## 一、现有代码分析

### 颜色体系

来源：`js/config.js:17-22`

| 颜色 | key | 色值 |
|------|-----|------|
| 粉色 | `pink` | 0xff68fd |
| 黄色 | `yellow` | 0xffe528 |
| 蓝色 | `blue` | 0x15befc |
| 绿色 | `green` | 0x00ff88 |
| 橙色 | `orange` | 0xff8844 |
| 紫色 | `purple` | 0xaa66ff |

### 方块类型

| 类型 | 说明 | 颜色数 |
|------|------|--------|
| type 1 | 大方块（长条形） | 1个颜色 |
| type 2 | 2个小方块 | 2个颜色 |
| type 3 | 3个小方块 | 3个颜色 |
| type 4 | 加速方块（boost，白色） | 无颜色 |

### 落地触发点

来源：`js/game.js:178-225`

球落地时已有 `triggerLandEffect(mesh, colorKey, group, w, d)` 调用，传入 `colorKey` 和 `group.type`，音效可直接在此处或 `triggerLandEffect` 内部触发。

---

## 二、技术方案：Web Audio API 合成音

### 选择理由

- 浏览器原生 API，零依赖，无需加载音频文件
- 用 `OscillatorNode` 合成音调，体积为 0KB
- 支持频率、波形、包络线（ADSR）精确控制
- 延迟极低（<5ms），适合游戏实时音效

---

## 三、音调映射设计

### 大方块（type 1）→ 中音区

采用 C 大调五声音阶 + 补音：

| 颜色 | 音名 | 频率(Hz) | 听感 |
|------|------|----------|------|
| pink | C4 | 261.63 | Do |
| yellow | D4 | 293.66 | Re |
| blue | E4 | 329.63 | Mi |
| green | G4 | 392.00 | Sol |
| orange | A4 | 440.00 | La |
| purple | C5 | 523.25 | Do(高) |

### 小方块（type 2/3）→ 低音区

同音名降一个八度：

| 颜色 | 音名 | 频率(Hz) | 听感 |
|------|------|----------|------|
| pink | C3 | 130.81 | Do(低) |
| yellow | D3 | 146.83 | Re(低) |
| blue | E3 | 164.81 | Mi(低) |
| green | G3 | 196.00 | Sol(低) |
| orange | A3 | 220.00 | La(低) |
| purple | C4 | 261.63 | Do |

### 加速方块（type 4）→ 特殊音效

上升扫频（sweep），从 C4 滑到 C6

### 选择五声音阶的理由

C-D-E-G-A-C 是五声音阶，任意组合都不会产生不和谐音，球随机落在不同颜色方块上时听起来自然悦耳。

---

## 四、音色设计（ADSR 包络）

```
音量
1.0 ─────╲
          ╲
0.7       ╲─────────
                     ╲
0.0                    ╲──────
     │攻击│衰减│  持续  │释放  │
     10ms 30ms  150ms  200ms
```

| 方块类型 | 波形 | 特点 |
|----------|------|------|
| 大方块 | 正弦波(sine) + 轻微泛音 | 温暖柔和 |
| 小方块 | 三角波(triangle) | 低沉浑厚 |
| 加速方块 | 锯齿波(sawtooth)扫频 | 科技感 |
| 死亡音效 | 下降扫频 + 噪声 | 低沉冲击 |
| 胜利音效 | C-E-G-C 琶音上行 | 愉悦感 |

---

## 五、实现架构

### 新增文件

`js/audio.js`

```
audio.js
├── initAudio()           — 创建 AudioContext（需用户交互后调用）
├── playNote(colorKey, isSmall) — 播放对应颜色音调
├── playBoost()           — 播放加速音效
├── playDeath()           — 播放死亡音效
├── playVictory()         — 播放胜利琶音
└── setVolume(v)          — 音量控制
```

### 集成点

改动最小化，仅在现有触发点各加一行调用：

| 触发场景 | 文件位置 | 调用 |
|----------|----------|------|
| 大方块落地 | game.js:214 | `playNote(colorKey, false)` |
| 小方块落地 | game.js:214 | `playNote(colorKey, true)` |
| 加速方块落地 | game.js:195 | `playBoost()` |
| 死亡 | effects.js:395 | `playDeath()` |
| 胜利 | blackhole.js:193 | `playVictory()` |

---

## 六、关键技术细节

### 1. AudioContext 延迟初始化

浏览器要求用户交互后才能创建 AudioContext。在第一次点击"开始游戏"时初始化。

```javascript
let audioCtx = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
```

### 2. 音效池（Voice Pool）

预创建 6-8 个 OscillatorNode 复用，避免每次落地都创建/销毁节点造成 GC 压力。

### 3. 音量归一化

低频音听起来比同振幅的高频音响，需对低音区做 +3~6dB 补偿。

### 4. 并发控制

球快速弹跳时可能同时触发多个音效，限制同时播放数为 3 个，超出的丢弃最旧的。

### 5. 静音开关

UI 右上角添加音量图标按钮，点击切换静音/开启。

---

## 七、工作量评估

| 任务 | 复杂度 | 说明 |
|------|--------|------|
| `audio.js` 核心合成引擎 | 中 | 频率映射 + ADSR + 音效池 |
| 集成到 game.js/effects.js/blackhole.js | 低 | 5个调用点各加一行 |
| AudioContext 初始化时机处理 | 低 | 首次交互时初始化 |
| 静音按钮 UI | 低 | 图标 + 切换逻辑 |
| 音色调优（频率/包络/泛音） | 中 | 需反复试听 |

---

## 八、风险与对策

| 风险 | 对策 |
|------|------|
| 移动端 AudioContext 延迟大 | 用 `audioContext.resume()` 确保激活；降级为短采样 |
| 部分浏览器不支持 | 特性检测，不支持时静默跳过 |
| 合成音听起来"电子味"重 | 叠加2层泛音 + 滤波器柔化，接近木琴/马林巴音色 |
| 快速弹跳时音效堆叠嘈杂 | 并发限制 + 最小间隔 80ms |

---

## 九、结论

完全可行。使用 Web Audio API 零依赖实现，核心只需新增一个 `audio.js` 文件（约150行），在现有5个触发点各加一行调用即可。
