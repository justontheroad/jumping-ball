export const GROUND_Y = -2.0;
export const BALL_RADIUS = 0.5;
export const GRAVITY_Y = -14.7;
export const INIT_HEIGHT = 3.0;
export const VISIBLE_DEPTH = 120;
export const _g = Math.abs(GRAVITY_Y);
export const _t_down = Math.sqrt(2 * INIT_HEIGHT / _g);
export const BOUNCE_PERIOD = 2 * _t_down;

export const BOOST_DURATION = 10.0;
export const BOOST_GRAVITY_MULT = 3.0;

export const GAP_MIN = 3.75;
export const GAP_MAX = 7.5;

export const COLORS = {
  pink:   { hex: 0xff68fd, rgb: [255, 104, 253] },
  yellow: { hex: 0xffe528, rgb: [255, 229,  40] },
  blue:   { hex: 0x15befc, rgb: [ 21, 190, 252] },
  green:  { hex: 0x00ff88, rgb: [  0, 255, 136] },
  orange: { hex: 0xff8844, rgb: [255, 136,  68] },
  purple: { hex: 0xaa66ff, rgb: [170, 102, 255] }
};

export const PLATE_HEIGHT = 0.12;
export const LONG_SIZE_X = 5.25;
export const LONG_SIZE_Z = 1.2;
export const SQ_SIZE = 1.05;
export const SQ_SPACING = 1.35;
export const SQ_OFFSET = (SQ_SPACING - SQ_SIZE) / 2;

export const LEVELS = [
  { name: '永恒号', nameEn: 'Endurance', maxType: 1, winHits: 10 },
  { name: '水星', nameEn: 'Mercury', maxType: 2, winHits: 15 },
  { name: '金星', nameEn: 'Venus', maxType: 2, winHits: 30 },
  { name: '火星', nameEn: 'Mars', maxType: 3, winHits: 50 },
  { name: '土星', nameEn: 'Saturn', maxType: 3, winHits: 80 },
  { name: '木星', nameEn: 'Jupiter', maxType: 3, winHits: 120 },
  { name: '天王星', nameEn: 'Uranus', maxType: 3, winHits: 180 },
  { name: '海王星', nameEn: 'Neptune', maxType: 3, winHits: 250 },
  { name: '超新星', nameEn: 'Supernova', maxType: 3, winHits: 350 },
  { name: '卡冈图雅', nameEn: 'Gargantua', maxType: 3, winHits: 500 }
];

export const CYCLE_MULTIPLIERS = [1.0, 1.5, 2.0, 2.5, 3.0];
export const CYCLE_MESSAGES = {
  2: '重启轮回，再续前缘',
  3: '星河无尽，勇者无疆',
  4: '超越极限，永不止步',
  5: '永恒轮回，传说永存'
};

export const ENDLESS_STAGES = [
  { dist: 0,    name: '启程', nameEn: 'Departure',   colorCount: 3, maxType: 2, gapScale: 1.0,  boostProb: 0.15 },
  { dist: 100,  name: '加速', nameEn: 'Acceleration', colorCount: 3, maxType: 3, gapScale: 1.0,  boostProb: 0.15 },
  { dist: 250,  name: '迷彩', nameEn: 'Camouflage',   colorCount: 4, maxType: 3, gapScale: 1.0,  boostProb: 0.15 },
  { dist: 450,  name: '压缩', nameEn: 'Compression',  colorCount: 4, maxType: 3, gapScale: 0.9,  boostProb: 0.15 },
  { dist: 700,  name: '混沌', nameEn: 'Chaos',        colorCount: 5, maxType: 3, gapScale: 0.85, boostProb: 0.20 },
  { dist: 1000, name: '深渊', nameEn: 'Abyss',        colorCount: 5, maxType: 3, gapScale: 0.8,  boostProb: 0.25 },
  { dist: 1400, name: '无尽', nameEn: 'Infinity',     colorCount: 6, maxType: 3, gapScale: 0.75, boostProb: 0.30 }
];

export const DEATH_DURATION = 1.0;

export const RIPPLE_DURATION = 1.0;
export const PRESS_DURATION = 0.5;

export const COMBO_HIDE_DELAY = 2000;

export const FALL_RESET_Y = -30;

export const BH_RADIUS = 2.5;
export const BH_EVENT_HORIZON = 2.0;
export const BH_ATTRACT_RADIUS = 3.5;
export const BH_SPAWN_DURATION = 2.0;

export const MOUSE_SENSITIVITY = 0.012;
export const LERP_SMOOTHNESS = 0.12;

export const FADE_START = 3;
export const FADE_END = 12;

export const BOOST_PARTICLE_COUNT = 8000;
export const BOOST_COLOR_LERP_SPEED = 3.0;

export function getCurrentBouncePeriod(currentGravityY) {
  const g = Math.abs(currentGravityY);
  const tDown = Math.sqrt(2 * INIT_HEIGHT / g);
  return 2 * tDown;
}

export function getCycleMultiplier(currentCycle) {
  const idx = Math.min(currentCycle - 1, CYCLE_MULTIPLIERS.length - 1);
  return CYCLE_MULTIPLIERS[idx];
}

export function getLevel(currentLevel, currentCycle) {
  const level = LEVELS[currentLevel];
  const multiplier = getCycleMultiplier(currentCycle);
  return { ...level, winHits: Math.floor(level.winHits * multiplier), name: level.name, nameEn: level.nameEn };
}

export function getEndlessStage(distance) {
  let stage = ENDLESS_STAGES[0];
  for (const s of ENDLESS_STAGES) {
    if (distance >= s.dist) stage = s;
  }
  return stage;
}
