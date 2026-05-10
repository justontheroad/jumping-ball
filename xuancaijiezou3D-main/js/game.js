import { state } from './state.js';
import {
  GRAVITY_Y, INIT_HEIGHT, _g, BOUNCE_PERIOD, BALL_RADIUS, GROUND_Y,
  BOOST_GRAVITY_MULT, BOOST_DURATION, FALL_RESET_Y, MOUSE_SENSITIVITY,
  LERP_SMOOTHNESS, COLORS, LEVELS, LONG_SIZE_X, LONG_SIZE_Z, SQ_SIZE
} from './config.js';

export function saveLevelProgress() {
  try {
    localStorage.setItem('jumpingBall_progress', JSON.stringify({
      unlockedLevels: state.unlockedLevels,
      currentLevel: state.currentLevel,
      currentCycle: state.currentCycle
    }));
  } catch (e) {}
}

export function loadLevelProgress() {
  try {
    const data = localStorage.getItem('jumpingBall_progress');
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.unlockedLevels) state.unlockedLevels = parsed.unlockedLevels;
      if (typeof parsed.currentLevel === 'number') state.currentLevel = parsed.currentLevel;
      if (typeof parsed.currentCycle === 'number') state.currentCycle = parsed.currentCycle;
    }
  } catch (e) {}
}

export function saveEndlessProgress() {
  try {
    localStorage.setItem('jumpingBall_endless', JSON.stringify({
      bestDistance: state.endlessBestDistance,
      bestStageIndex: state.endlessBestStageIndex,
      totalRuns: state.endlessTotalRuns
    }));
  } catch (e) {}
}

export function loadEndlessProgress() {
  try {
    const data = localStorage.getItem('jumpingBall_endless');
    if (data) {
      const parsed = JSON.parse(data);
      state.endlessBestDistance = parsed.bestDistance || 0;
      state.endlessBestStageIndex = parsed.bestStageIndex || 0;
      state.endlessTotalRuns = parsed.totalRuns || 0;
    }
  } catch (e) {}
}

export function unlockNextLevel() {
  const nextLevel = state.currentLevel + 1;
  if (nextLevel < LEVELS.length && !state.unlockedLevels[nextLevel]) {
    state.unlockedLevels[nextLevel] = true;
    saveLevelProgress();
  }
}

export function getLevel() {
  const level = LEVELS[state.currentLevel];
  const multiplier = state.fns.getCycleMultiplier(state.currentCycle);
  return {
    ...level,
    winHits: Math.floor(level.winHits * multiplier),
    name: level.name,
    nameEn: level.nameEn
  };
}

export function startGame() {
  state.fns.hideLevelSelect();
  document.getElementById('inGameMenuBtn').style.display = 'block';
  state.strategy.loadProgress();
  resetGame();
}

export function resetGame() {
  state.fns.hideCombo();
  state.fns.hideVictory();
  state.fns.showLevelAnnounce();
  state.fns.resetDistanceUI();
  state.fns.cleanupBlackHole();
  state.hitCount = 0;
  state.strategy.resetState();
  state.boostTimer = 0;
  state.currentGravityY = GRAVITY_Y;
  state.boostCharging = false;
  state.boostParticleVisible = false;
  state.boostParticles.visible = false;
  state.boostFadeAlpha = 0;
  while (state.trackGroups.length > 0) {
    state.fns.removeGroup(0);
  }
  state.fns.generateInitialGroups();
  state.ballX = 0;
  state.ballXTarget = 0;
  state.ballY = state.floorContact;
  state.velY = Math.sqrt(2 * _g * INIT_HEIGHT);
  state.falling = false;
  state.dying = false;
  state.ballColorKey = null;
  state.sphere.scale.setScalar(1);
  state.wireMesh.scale.setScalar(1);
  state.ring.scale.setScalar(1);
  if (state.trackGroups.length > 0 && state.trackGroups[0].type === 1 && state.trackGroups[0].colorKey) {
    const cKey = state.trackGroups[0].colorKey;
    const rgb = COLORS[cKey].rgb;
    state.sphereMat.color.set(COLORS[cKey].hex);
    state.sphereMat.emissive.set(new THREE.Color(rgb[0]*0.3/255, rgb[1]*0.3/255, rgb[2]*0.3/255));
    state.ballColorKey = cKey;
    state.fns.setBoostParticleColor(cKey);
  } else {
    state.sphereMat.color.set(0x4488ff);
    state.sphereMat.emissive.set(0x112244);
    state.ballColorKey = null;
    state.fns.setBoostParticleColor(null);
  }
  state.sphere.visible = true;
  state.wireMesh.visible = true;
  state.ring.visible = true;
  state.fns.cleanupDeath();
  state.fns.hideGameOver();
  if (state.groupZList.length > 1) {
    state.velZ = Math.abs(state.groupZList[1]) / BOUNCE_PERIOD;
  } else {
    state.velZ = 2.0;
  }
}

export function animate() {
  requestAnimationFrame(animate);
  const now = performance.now() / 1000;
  let dt = now - state.lastTime;
  state.lastTime = now;
  dt = Math.min(dt, 0.05);
  state.t += dt;

  const levelSelectOverlay = document.getElementById('levelSelectOverlay');
  const victoryOverlay = document.getElementById('victoryOverlay');
  const gameOverOverlay = document.getElementById('gameOverOverlay');
  if (levelSelectOverlay.style.display === 'flex' || victoryOverlay.style.display === 'flex' || gameOverOverlay.style.display === 'flex') {
    state.renderer.render(state.scene, state.camera);
    return;
  }

  if (!state.dying) {
    state.ballXTarget += state.mouseDeltaX * MOUSE_SENSITIVITY;
    state.ballXTarget = Math.max(-15, Math.min(15, state.ballXTarget));
    const factor = 1 - Math.pow(1 - LERP_SMOOTHNESS, dt * 60);
    state.ballX += (state.ballXTarget - state.ballX) * factor;
  }
  state.mouseDeltaX = 0;

  if (!state.dying) {
    state.velY += state.currentGravityY * dt;
    state.ballY += state.velY * dt;
  }

  if (state.boostTimer > 0) {
    state.boostTimer -= dt;
    if (state.boostTimer <= 0) {
      state.boostTimer = 0;
      state.currentGravityY = GRAVITY_Y;
      if (!state.falling && !state.dying) {
        state.fns.recalcVelZFromAir();
      }
    }
  }

  if (!state.falling && !state.dying) {
    if (state.ballY <= state.floorContact && state.velY < 0) {
      const hit = state.fns.findCollisionWithAnyGroup();
      if (hit) {
        const { group, colorKey } = hit;
        if (group.type === 4) {
          state.ballY = state.floorContact;
          state.velY = Math.sqrt(2 * Math.abs(state.currentGravityY) * INIT_HEIGHT);
          state.currentGravityY = GRAVITY_Y * BOOST_GRAVITY_MULT;
          state.boostTimer = BOOST_DURATION;
          if (!state.boostCharging) {
            state.boostCharging = true;
            state.velZ = 0;
          } else {
            state.boostCharging = false;
            state.fns.onLandUpdateVelZ();
          }
          if (hit.mesh) {
            state.fns.triggerLandEffect(hit.mesh, 'boost', hit.group, LONG_SIZE_X, LONG_SIZE_Z);
          }
          state.fns.triggerCombo();
          state.hitCount++;
          if (state.hitCount >= state.strategy.getWinHits() && !state.victoryTrackSpawned) {
            state.strategy.onHitCountReached();
          }
        } else if (group.type !== 1 && state.ballColorKey && colorKey && state.ballColorKey !== colorKey) {
          state.fns.triggerDeath(colorKey);
        } else {
          if (group.isVictoryTrack && !state.winning) {
            state.strategy.onLandOnVictoryTrack();
            if (hit.mesh && hit.colorKey) {
              state.fns.triggerLandEffect(hit.mesh, hit.colorKey, hit.group, LONG_SIZE_X, LONG_SIZE_Z);
            }
          } else {
            state.ballY = state.floorContact;
            state.velY = Math.abs(state.velY);
            state.fns.onLandUpdateVelZ();
            if (hit.mesh && hit.colorKey) {
              const pw = hit.group.type === 1 ? LONG_SIZE_X : SQ_SIZE;
              const pd = hit.group.type === 1 ? LONG_SIZE_Z : SQ_SIZE;
              state.fns.triggerLandEffect(hit.mesh, hit.colorKey, hit.group, pw, pd);
            }
            state.fns.triggerCombo();
            state.hitCount++;
            if (state.hitCount >= state.strategy.getWinHits() && !state.victoryTrackSpawned) {
              state.strategy.onHitCountReached();
            }
          }
        }
      } else {
        state.velY = -Math.abs(state.velY);
        state.falling = true;
        state.velZ = 0;
      }
    }
    if (state.velY <= 0 && (state.velY - state.currentGravityY * dt) > 0) {
      if (state.ballY - state.floorContact < INIT_HEIGHT * 0.99) {
        state.ballY = state.floorContact + INIT_HEIGHT;
        state.velY = 0;
      }
    }
  } else if (state.falling) {
    if (state.ballY < FALL_RESET_Y) {
      state.falling = false;
      state.strategy.onGameOver();
    }
  } else if (state.dying) {
    state.fns.updateDeath(dt);
  }

  if (state.winning) {
    state.fns.updateWin(dt);
  } else if (state.blackHoleActive) {
    state.fns.updateBlackHole(dt);
    state.fns.checkBlackHoleCollision();
  }

  state.fns.updateTrack(state.velZ * dt);

  if (!state.dying) {
    state.sphere.position.x = state.ballX;
    state.sphere.position.y = state.ballY;
    state.sphere.position.z = 0;
    state.wireMesh.position.x = state.ballX;
    state.wireMesh.position.y = state.ballY;
    state.wireMesh.position.z = 0;
    state.ring.position.x = state.ballX;
    state.ring.position.y = state.ballY;
    state.ring.position.z = 0;

    state.sphere.rotation.y += 0.25 * dt;
    state.sphere.rotation.x = Math.sin(state.t * 0.4) * 0.1;
    state.wireMesh.rotation.y = state.sphere.rotation.y;
    state.wireMesh.rotation.x = state.sphere.rotation.x;

    state.ring.rotation.y += 0.35 * dt;
    state.ring.rotation.x = Math.sin(state.t * 0.3) * 0.15;
  }

  state.movingLight.position.set(
    Math.cos(state.t * 0.7) * 2.8,
    state.ballY + Math.sin(state.t * 0.5) * 1.0,
    Math.sin(state.t * 0.7) * 2.8
  );
  state.lightBall.position.copy(state.movingLight.position);

  state.controls.update();
  state.fns.updateLandEffects(dt);
  state.fns.updateBoostParticles(dt);
  state.strategy.checkStageTransition();
  state.fns.updateDistanceUI();
  state.renderer.render(state.scene, state.camera);
}
