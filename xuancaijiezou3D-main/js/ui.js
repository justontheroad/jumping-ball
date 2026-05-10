import { state } from './state.js';
import { LEVELS, ENDLESS_STAGES, getEndlessStage, getCycleMultiplier, COLORS } from './config.js';

const $ = (id) => document.getElementById(id);

export const dom = {
  levelSelectOverlay: $('levelSelectOverlay'),
  levelCardsContainer: $('levelCards'),
  inGameMenuBtn: $('inGameMenuBtn'),
  tabLevels: $('tabLevels'),
  tabEndless: $('tabEndless'),
  endlessPanel: $('endlessPanel'),
  endlessBestDistEl: $('endlessBestDist'),
  endlessBestStageEl: $('endlessBestStage'),
  endlessRunInfoEl: $('endlessRunInfo'),
  endlessRunDistEl: $('endlessRunDist'),
  endlessRunStageEl: $('endlessRunStage'),
  endlessNewRecordEl: $('endlessNewRecord'),
  endlessStartBtn: $('endlessStartBtn'),
  endlessTotalRunsEl: $('endlessTotalRuns'),
  levelSelectTitle: $('levelSelectTitle'),
  levelSelectSub: $('levelSelectSub'),
  gameOverOverlay: $('gameOverOverlay'),
  restartBtn: $('restartBtn'),
  retryBtn: $('retryBtn'),
  backToMenuLink: $('backToMenuLink'),
  gameOverEndlessInfo: $('gameOverEndlessInfo'),
  goDistEl: $('goDist'),
  goStageEl: $('goStage'),
  goNewRecordEl: $('goNewRecord'),
  victoryOverlay: $('victoryOverlay'),
  victoryBtn: $('victoryBtn'),
  victoryTitle: $('victoryTitle'),
  victoryDesc: $('victoryDesc'),
  levelAnnounce: $('levelAnnounce'),
  levelNumEl: $('levelNum'),
  levelTitleEl: $('levelTitle'),
  levelSubEl: $('levelSub'),
  distCurrent: $('distCurrent'),
  distTarget: $('distTarget'),
  levelNameEl: $('levelName'),
};

export function switchTab(tab) {
  state.currentTab = tab;
  dom.tabLevels.classList.toggle('active', tab === 'levels');
  dom.tabEndless.classList.toggle('active', tab === 'endless');
  if (tab === 'levels') {
    dom.levelCardsContainer.style.display = 'flex';
    dom.levelSelectTitle.style.display = 'block';
    dom.levelSelectSub.style.display = 'block';
    dom.endlessPanel.classList.remove('visible');
  } else {
    dom.levelCardsContainer.style.display = 'none';
    dom.levelSelectTitle.style.display = 'none';
    dom.levelSelectSub.style.display = 'none';
    dom.endlessPanel.classList.add('visible');
    updateEndlessPanel();
  }
}

export function updateEndlessPanel() {
  dom.endlessBestDistEl.textContent = state.endlessBestDistance > 0 ? `${state.endlessBestDistance} m` : '0 m';
  if (state.endlessBestDistance > 0) {
    const stage = ENDLESS_STAGES[state.endlessBestStageIndex];
    dom.endlessBestStageEl.textContent = `阶段 ${state.endlessBestStageIndex + 1} · ${stage.name}`;
  } else {
    dom.endlessBestStageEl.textContent = '--';
  }
  dom.endlessTotalRunsEl.textContent = `已挑战 ${state.endlessTotalRuns} 次`;
  if (state.lastEndlessDistance > 0) {
    dom.endlessRunInfoEl.style.display = 'block';
    dom.endlessRunDistEl.textContent = `${Math.floor(state.lastEndlessDistance)} m`;
    const stage = getEndlessStage(state.lastEndlessDistance);
    const idx = ENDLESS_STAGES.indexOf(stage);
    dom.endlessRunStageEl.textContent = `阶段 ${idx + 1} · ${stage.name}`;
    dom.endlessNewRecordEl.style.display = state.lastEndlessNewRecord ? 'block' : 'none';
  } else {
    dom.endlessRunInfoEl.style.display = 'none';
  }
}

export function updateCardStates() {
  const cards = dom.levelCardsContainer.querySelectorAll('.level-card');
  cards.forEach((card, i) => {
    card.classList.toggle('active', i === state.currentLevel);
    card.classList.toggle('locked', !state.unlockedLevels[i]);
  });
}

export function showLevelSelect() {
  state.fns.switchMode('levels');
  updateCardStates();
  if (state.currentCycle > 1) {
    dom.levelSelectTitle.textContent = `第${state.currentCycle}周目`;
    dom.levelSelectSub.textContent = `难度系数: ${getCycleMultiplier(state.currentCycle)}x`;
  } else {
    dom.levelSelectTitle.textContent = '选择关卡';
    dom.levelSelectSub.textContent = 'INTERSTELLAR';
  }
  switchTab(state.currentTab);
  dom.levelSelectOverlay.style.display = 'flex';
  dom.inGameMenuBtn.style.display = 'none';
}

export function showEndlessSelect() {
  state.fns.switchMode('endless');
  switchTab('endless');
  updateEndlessPanel();
  dom.levelSelectOverlay.style.display = 'flex';
  dom.inGameMenuBtn.style.display = 'none';
}

export function hideLevelSelect() {
  dom.levelSelectOverlay.style.display = 'none';
}

export function showGameOver() {
  if (state.gameMode === 'endless') {
    showEndlessGameOver();
  } else {
    dom.gameOverEndlessInfo.classList.remove('visible');
    dom.retryBtn.style.display = 'none';
    dom.backToMenuLink.classList.add('visible');
    dom.restartBtn.style.display = 'inline-block';
    dom.gameOverOverlay.style.display = 'flex';
  }
}

export function showEndlessGameOver() {
  const dist = Math.floor(state.totalDistance);
  const stage = getEndlessStage(state.totalDistance);
  const stageIdx = ENDLESS_STAGES.indexOf(stage);
  const isNewRecord = dist > state.endlessBestDistance;
  if (isNewRecord) {
    state.endlessBestDistance = dist;
    state.endlessBestStageIndex = stageIdx;
  }
  state.endlessTotalRuns++;
  state.lastEndlessDistance = state.totalDistance;
  state.lastEndlessStageIndex = stageIdx;
  state.lastEndlessNewRecord = isNewRecord;
  state.fns.saveEndlessProgress();

  dom.goDistEl.textContent = `${dist} m`;
  dom.goStageEl.textContent = `阶段 ${stageIdx + 1} · ${stage.name}`;
  dom.goNewRecordEl.style.display = isNewRecord ? 'block' : 'none';
  dom.gameOverEndlessInfo.classList.add('visible');
  dom.retryBtn.style.display = 'inline-block';
  dom.backToMenuLink.classList.add('visible');
  dom.restartBtn.style.display = 'none';
  dom.gameOverOverlay.style.display = 'flex';
}

export function hideGameOver() {
  dom.gameOverOverlay.style.display = 'none';
}

export function showVictory() {
  const lv = state.fns.getLevel();
  const isLastLevel = state.currentLevel >= LEVELS.length - 1;

  if (isLastLevel) {
    const nextCycle = state.currentCycle + 1;
    const CYCLE_MESSAGES = { 2: '重启轮回，再续前缘', 3: '星河无尽，勇者无疆', 4: '超越极限，永不止步', 5: '永恒轮回，传说永存' };
    const cycleMsg = CYCLE_MESSAGES[nextCycle] || '永恒轮回，传说永存';
    dom.victoryTitle.textContent = '通关！';
    dom.victoryDesc.textContent = `恭喜征服${lv.name}！${cycleMsg}`;
    dom.victoryBtn.textContent = state.currentCycle === 1 ? '开启二周目' : `开启第${nextCycle}周目`;
  } else {
    dom.victoryTitle.textContent = 'YOU WIN!';
    dom.victoryDesc.textContent = `你成功进入了${lv.name}的黑洞！`;
    dom.victoryBtn.textContent = '下一关';
  }
  dom.victoryOverlay.style.display = 'flex';
}

export function hideVictory() {
  dom.victoryOverlay.style.display = 'none';
}

export function showLevelAnnounce() {
  const info = state.strategy.getAnnounceInfo();
  dom.levelNumEl.textContent = info.num;
  dom.levelTitleEl.textContent = info.title;
  dom.levelSubEl.textContent = info.sub;
  dom.levelAnnounce.classList.remove('show');
  void dom.levelAnnounce.offsetWidth;
  dom.levelAnnounce.classList.add('show');
  if (state.levelAnnounceTimer) clearTimeout(state.levelAnnounceTimer);
  state.levelAnnounceTimer = setTimeout(() => {
    dom.levelAnnounce.classList.remove('show');
  }, 2600);
}

export function showEndlessStageAnnounce(stage) {
  const idx = ENDLESS_STAGES.indexOf(stage);
  dom.levelNumEl.textContent = `阶段 ${idx + 1}`;
  dom.levelTitleEl.textContent = stage.name;
  dom.levelSubEl.textContent = `${stage.colorCount}种颜色 · 间距${stage.gapScale < 1 ? '缩小' : '正常'}`;
  dom.levelAnnounce.classList.remove('show');
  void dom.levelAnnounce.offsetWidth;
  dom.levelAnnounce.classList.add('show');
  if (state.levelAnnounceTimer) clearTimeout(state.levelAnnounceTimer);
  state.levelAnnounceTimer = setTimeout(() => {
    dom.levelAnnounce.classList.remove('show');
  }, 2600);
}

export function updateDistanceUI() {
  const d = Math.floor(state.totalDistance);
  dom.distCurrent.innerHTML = `${d}<span class="unit">m</span>`;
  if (state.targetDistance !== null) {
    const td = Math.floor(state.targetDistance);
    dom.distTarget.textContent = `目标: ${td} m`;
    if (!dom.distTarget.classList.contains('revealed')) {
      dom.distTarget.classList.add('revealed');
    }
  }
}

export function resetDistanceUI() {
  state.totalDistance = 0;
  state.targetDistance = null;
  const targetText = state.strategy.getDistanceTargetText();
  dom.distTarget.textContent = targetText || '目标: ??? m';
  if (targetText) {
    dom.distTarget.classList.add('revealed');
  } else {
    dom.distTarget.textContent = '目标: ??? m';
    dom.distTarget.classList.remove('revealed');
  }
  dom.levelNameEl.textContent = state.strategy.getDisplayName();
  updateDistanceUI();
}

export function generateLevelCards() {
  LEVELS.forEach((lv, i) => {
    const card = document.createElement('div');
    card.className = 'level-card';
    card.dataset.index = i;
    let colorCount = 3;
    if (i >= 9) colorCount = 6;
    else if (i >= 7) colorCount = 5;
    else if (i >= 5) colorCount = 4;

    card.innerHTML = `
      <div class="card-num">LEVEL ${i + 1}</div>
      <div class="card-name">${lv.name}</div>
      <div class="card-name-en">${lv.nameEn}</div>
      <div class="card-desc">${colorCount}种颜色</div>
    `;
    card.addEventListener('click', () => {
      if (!state.unlockedLevels[i]) return;
      state.currentLevel = i;
      state.fns.saveLevelProgress();
      state.fns.switchMode('levels');
      state.fns.startGame();
    });
    dom.levelCardsContainer.appendChild(card);
  });
}

export function bindUIEvents() {
  dom.tabLevels.addEventListener('click', () => switchTab('levels'));
  dom.tabEndless.addEventListener('click', () => switchTab('endless'));

  dom.endlessStartBtn.addEventListener('click', () => {
    state.fns.switchMode('endless');
    state.fns.startGame();
  });

  dom.inGameMenuBtn.addEventListener('click', () => {
    if (state.gameMode === 'endless') {
      showEndlessSelect();
    } else {
      showLevelSelect();
    }
  });

  dom.restartBtn.addEventListener('click', () => {
    hideGameOver();
    state.strategy.onGameOverRestart();
  });
  dom.retryBtn.addEventListener('click', () => {
    hideGameOver();
    state.fns.startGame();
  });
  dom.backToMenuLink.addEventListener('click', () => {
    hideGameOver();
    if (state.gameMode === 'endless') {
      showEndlessSelect();
    } else {
      showLevelSelect();
    }
  });

  dom.victoryBtn.addEventListener('click', () => {
    hideVictory();
    state.strategy.onVictoryNext();
  });
}
