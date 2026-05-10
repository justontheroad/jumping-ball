import { state } from './state.js';
import { LEVELS, ENDLESS_STAGES, getEndlessStage, getCycleMultiplier, CYCLE_MESSAGES } from './config.js';

export const levelStrategy = {
  getAvailableColors() {
    const base = ['pink', 'yellow', 'blue'];
    if (state.currentLevel >= 9) return [...base, 'green', 'orange', 'purple'];
    if (state.currentLevel >= 7) return [...base, 'green', 'orange'];
    if (state.currentLevel >= 5) return [...base, 'green'];
    return base;
  },
  getMaxType() { return state.fns.getLevel().maxType; },
  getWinHits() { return state.fns.getLevel().winHits; },
  getColorCount() {
    if (state.currentLevel >= 9) return 6;
    if (state.currentLevel >= 7) return 5;
    if (state.currentLevel >= 5) return 4;
    return 3;
  },
  getGapScale() { return 1.0; },
  getBoostProb() { return 0.15; },
  hasVictory() { return true; },
  onHitCountReached() {
    const victoryZ = -10 - Math.random() * 8;
    state.fns.createVictoryTrack(victoryZ);
    state.blackHoleActive = true;
  },
  onLandOnVictoryTrack() {
    state.winning = true;
    state.winTimer = 0;
    state.velZ = 0;
    state.falling = false;
    state.bhAttracting = false;
    state.fns.hideCombo();
    state.ballY = state.floorContact;
    state.velY = Math.abs(state.velY);
  },
  checkStageTransition() {},
  getDisplayName() {
    const lv = state.fns.getLevel();
    const cycleText = state.currentCycle > 1 ? `第${state.currentCycle}周目 · ` : '';
    return `${cycleText}${lv.name}`;
  },
  getAnnounceInfo() {
    const lv = state.fns.getLevel();
    const cycleText = state.currentCycle > 1 ? `第${state.currentCycle}周目 · ` : '';
    return {
      num: `${cycleText}LEVEL ${state.currentLevel + 1}`,
      title: lv.name,
      sub: `跳 ${lv.winHits} 次 · ${this.getColorCount()}种颜色`
    };
  },
  getDistanceTargetText() {
    if (state.targetDistance !== null) return `目标: ${Math.floor(state.targetDistance)} m`;
    return '目标: ??? m';
  },
  onGameOver() { state.fns.showGameOver(); },
  onVictory() { state.fns.showVictory(); },
  resetState() {
    state.victoryTrackGroups = [];
    state.victoryTrackSpawned = false;
    state.blackHoleActive = false;
    state.bhAttracting = false;
    state.winning = false;
    state.winTimer = 0;
    state.fns.cleanupBlackHole();
  },
  onGameOverRestart() { state.fns.showLevelSelect(); },
  onVictoryNext() {
    state.fns.unlockNextLevel();
    const isLast = state.currentLevel >= LEVELS.length - 1;
    if (isLast) {
      state.currentCycle++;
      state.currentLevel = 0;
      state.unlockedLevels = [true, false, false, false, false, false, false, false, false, false];
      state.fns.saveLevelProgress();
      state.fns.showLevelSelect();
    } else {
      state.currentLevel++;
      state.fns.saveLevelProgress();
      state.fns.startGame();
    }
  },
  saveProgress() { state.fns.saveLevelProgress(); },
  loadProgress() { state.fns.loadLevelProgress(); },
};

export const endlessStrategy = {
  getAvailableColors() {
    const stage = getEndlessStage(state.totalDistance);
    const base = ['pink', 'yellow', 'blue'];
    const extras = ['green', 'orange', 'purple'];
    return [...base, ...extras.slice(0, stage.colorCount - 3)];
  },
  getMaxType() { return getEndlessStage(state.totalDistance).maxType; },
  getWinHits() { return Infinity; },
  getColorCount() { return getEndlessStage(state.totalDistance).colorCount; },
  getGapScale() { return getEndlessStage(state.totalDistance).gapScale; },
  getBoostProb() { return getEndlessStage(state.totalDistance).boostProb; },
  hasVictory() { return false; },
  onHitCountReached() {},
  onLandOnVictoryTrack() {},
  checkStageTransition() {
    const stage = getEndlessStage(state.totalDistance);
    const newIdx = ENDLESS_STAGES.indexOf(stage);
    if (newIdx > state.currentStageIndex) {
      state.currentStageIndex = newIdx;
      state.fns.showEndlessStageAnnounce(stage);
    }
  },
  getDisplayName() {
    const stage = getEndlessStage(state.totalDistance);
    return `无垠 · ${stage.name}`;
  },
  getAnnounceInfo() {
    const stage = getEndlessStage(state.totalDistance);
    return {
      num: `阶段 ${state.currentStageIndex + 1}`,
      title: stage.name,
      sub: `${stage.colorCount}种颜色 · 间距${stage.gapScale < 1 ? '缩小' : '正常'}`
    };
  },
  getDistanceTargetText() {
    return state.endlessBestDistance > 0 ? `最远: ${state.endlessBestDistance}m` : '';
  },
  onGameOver() { state.fns.showEndlessGameOver(); },
  onVictory() {},
  resetState() {
    state.currentStageIndex = 0;
    state.victoryTrackGroups = [];
    state.victoryTrackSpawned = false;
    state.blackHoleActive = false;
    state.bhAttracting = false;
    state.winning = false;
    state.winTimer = 0;
    state.fns.cleanupBlackHole();
  },
  onGameOverRestart() { state.fns.startGame(); },
  onVictoryNext() {},
  saveProgress() { state.fns.saveEndlessProgress(); },
  loadProgress() { state.fns.loadEndlessProgress(); },
};

export function switchMode(mode) {
  state.gameMode = mode;
  state.strategy = mode === 'endless' ? endlessStrategy : levelStrategy;
}
