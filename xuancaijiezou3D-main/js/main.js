import { state } from './state.js';
import * as THREE from 'three';
import { BOUNCE_PERIOD, _g, INIT_HEIGHT, COLORS, GRAVITY_Y } from './config.js';
import { initScene } from './scene.js';
import { initPlayer } from './player.js';
import { initTrack, generateInitialGroups, createType1, createType2, createType3, createType4, createRandomGroup, createVictoryBlocksAt, updateTrack, findCollisionWithAnyGroup, disposeGroup, removeGroup, randGap, randColor, getAvailableColors, onLandUpdateVelZ, recalcVelZ, recalcVelZFromAir } from './track.js';
import { initEffects, setBoostParticleColor, updateBoostParticles, triggerLandEffect, updateLandEffects, triggerCombo, hideCombo, triggerDeath, updateDeath, cleanupDeath } from './effects.js';
import { createBlackHole, updateBlackHole, cleanupBlackHole, checkBlackHoleCollision, updateWin, spawnBlackHole } from './blackhole.js';
import { dom, switchTab, updateEndlessPanel, updateCardStates, showLevelSelect, showEndlessSelect, hideLevelSelect, showGameOver, showEndlessGameOver, hideGameOver, showVictory, hideVictory, showLevelAnnounce, showEndlessStageAnnounce, updateDistanceUI, resetDistanceUI, generateLevelCards, bindUIEvents } from './ui.js';
import { levelStrategy, endlessStrategy, switchMode } from './strategy.js';
import { saveLevelProgress, loadLevelProgress, saveEndlessProgress, loadEndlessProgress, unlockNextLevel, getLevel, startGame, resetGame, animate } from './game.js';
import { getCycleMultiplier } from './config.js';

initScene();
initPlayer();
initTrack();
initEffects();

state.fns = {
  createBlackHole,
  updateBlackHole,
  cleanupBlackHole,
  checkBlackHoleCollision,
  updateWin,
  spawnBlackHole,
  setBoostParticleColor,
  updateBoostParticles,
  triggerLandEffect,
  updateLandEffects,
  triggerCombo,
  hideCombo,
  triggerDeath,
  updateDeath,
  cleanupDeath,
  generateInitialGroups,
  createType1,
  createType2,
  createType3,
  createType4,
  createRandomGroup,
  createVictoryBlocksAt,
  updateTrack,
  findCollisionWithAnyGroup,
  disposeGroup,
  removeGroup,
  randGap,
  randColor,
  getAvailableColors,
  onLandUpdateVelZ,
  recalcVelZ,
  recalcVelZFromAir,
  switchTab,
  updateEndlessPanel,
  updateCardStates,
  showLevelSelect,
  showEndlessSelect,
  hideLevelSelect,
  showGameOver,
  showEndlessGameOver,
  hideGameOver,
  showVictory,
  hideVictory,
  showLevelAnnounce,
  showEndlessStageAnnounce,
  updateDistanceUI,
  resetDistanceUI,
  switchMode,
  saveLevelProgress,
  loadLevelProgress,
  saveEndlessProgress,
  loadEndlessProgress,
  unlockNextLevel,
  getLevel,
  startGame,
  resetGame,
  getCycleMultiplier,
};

state.strategy = levelStrategy;

generateLevelCards();
bindUIEvents();

loadLevelProgress();
loadEndlessProgress();
showLevelSelect();

generateInitialGroups();

if (state.groupZList.length > 1) {
  state.velZ = Math.abs(state.groupZList[1]) / BOUNCE_PERIOD;
} else {
  state.velZ = 2.0;
}
if (state.trackGroups.length > 0 && state.trackGroups[0].type === 1 && state.trackGroups[0].colorKey) {
  const initColor = state.trackGroups[0].colorKey;
  const initRgb = COLORS[initColor].rgb;
  state.sphereMat.color.set(COLORS[initColor].hex);
  state.sphereMat.emissive.set(new THREE.Color(initRgb[0]*0.3/255, initRgb[1]*0.3/255, initRgb[2]*0.3/255));
  state.ballColorKey = initColor;
  setBoostParticleColor(initColor);
}

state.lastTime = performance.now() / 1000;
state.t = 0;

animate();

window.addEventListener('resize', () => {
  state.camera.aspect = innerWidth / innerHeight;
  state.camera.updateProjectionMatrix();
  state.renderer.setSize(innerWidth, innerHeight);
});

document.addEventListener('mousemove', (e) => {
  if (e.movementX !== undefined) {
    state.mouseDeltaX += e.movementX;
  }
});
