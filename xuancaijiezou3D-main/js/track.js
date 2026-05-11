import * as THREE from 'three';
import { state } from './state.js';
import {
  COLORS, PLATE_HEIGHT, LONG_SIZE_X, LONG_SIZE_Z, SQ_SIZE, SQ_SPACING, SQ_OFFSET,
  GROUND_Y, GAP_MIN, GAP_MAX, VISIBLE_DEPTH, FADE_START, FADE_END,
  LEVELS, ENDLESS_STAGES, getEndlessStage, getCurrentBouncePeriod, _g, INIT_HEIGHT,
  GRAVITY_Y, BALL_RADIUS, BOUNCE_PERIOD
} from './config.js';

function createArrowTextureForColor(colorKey) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = COLORS[colorKey].hex;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(size * 0.5, size * 0.15);
  ctx.lineTo(size * 0.72, size * 0.45);
  ctx.lineTo(size * 0.58, size * 0.45);
  ctx.lineTo(size * 0.58, size * 0.82);
  ctx.lineTo(size * 0.42, size * 0.82);
  ctx.lineTo(size * 0.42, size * 0.45);
  ctx.lineTo(size * 0.28, size * 0.45);
  ctx.closePath();
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function makeMat(colorKey) {
  const rgb = COLORS[colorKey].rgb;
  return new THREE.MeshStandardMaterial({
    color: COLORS[colorKey].hex,
    metalness: 0.3, roughness: 0.35,
    emissive: new THREE.Color(rgb[0]*0.5/255, rgb[1]*0.5/255, rgb[2]*0.5/255),
    transparent: true, opacity: 1.0
  });
}

function makeBoostMat() {
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.1, roughness: 0.2,
    emissive: new THREE.Color(0.5, 0.5, 0.7),
    transparent: true, opacity: 0.95
  });
}

function makeSqMats(colorKey) {
  const base = makeMat(colorKey);
  const topMat = makeMat(colorKey);
  topMat.map = state.arrowTextures[colorKey];
  topMat.color.set(0xffffff);
  const side1 = makeMat(colorKey);
  const side2 = makeMat(colorKey);
  const side3 = makeMat(colorKey);
  const side4 = makeMat(colorKey);
  const bottom = makeMat(colorKey);
  return [side1, side2, topMat, bottom, side3, side4];
}

export function initTrack() {
  state.longGeo = new THREE.BoxGeometry(LONG_SIZE_X, PLATE_HEIGHT, LONG_SIZE_Z);
  state.sqGeo = new THREE.BoxGeometry(SQ_SIZE, PLATE_HEIGHT, SQ_SIZE);
  state.arrowTextures = {};
  for (const ck of Object.keys(COLORS)) {
    state.arrowTextures[ck] = createArrowTextureForColor(ck);
  }
}

export function getAvailableColors() {
  return state.strategy.getAvailableColors();
}

export function randColor() {
  const available = getAvailableColors();
  return available[Math.floor(Math.random() * available.length)];
}

export function randTwoColors() {
  const available = getAvailableColors();
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1]];
}

export function randThreeColors() {
  const available = getAvailableColors();
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  if (shuffled.length <= 3) return shuffled;
  return [shuffled[0], shuffled[1], shuffled[2]];
}

export function createType1(z, colorKey) {
  const mat = makeMat(colorKey);
  const mesh = new THREE.Mesh(state.longGeo, mat);
  mesh.position.set(0, GROUND_Y + PLATE_HEIGHT / 2, z);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  state.scene.add(mesh);
  return { type: 1, meshes: [mesh], mats: [mat], z, colorKey };
}

export function createType2(z, colors) {
  const result = { type: 2, meshes: [], mats: [], z, colorKeys: [] };
  const offset = SQ_SPACING * 0.65;
  const xPositions = [-offset, offset];
  for (let i = 0; i < 2; i++) {
    const mats = makeSqMats(colors[i]);
    const mesh = new THREE.Mesh(state.sqGeo, mats);
    mesh.position.set(xPositions[i], GROUND_Y + PLATE_HEIGHT / 2, z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    state.scene.add(mesh);
    result.meshes.push(mesh);
    result.mats.push(...mats);
    result.colorKeys.push(colors[i]);
  }
  return result;
}

export function createType3(z, colors) {
  const result = { type: 3, meshes: [], mats: [], z, colorKeys: [] };
  const xPositions = [-SQ_SPACING, 0, SQ_SPACING];
  for (let i = 0; i < 3; i++) {
    const mats = makeSqMats(colors[i]);
    const mesh = new THREE.Mesh(state.sqGeo, mats);
    mesh.position.set(xPositions[i], GROUND_Y + PLATE_HEIGHT / 2, z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    state.scene.add(mesh);
    result.meshes.push(mesh);
    result.mats.push(...mats);
    result.colorKeys.push(colors[i]);
  }
  return result;
}

export function createType4(z) {
  const mat = makeBoostMat();
  const mesh = new THREE.Mesh(state.longGeo, mat);
  mesh.position.set(0, GROUND_Y + PLATE_HEIGHT / 2, z);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  state.scene.add(mesh);
  return { type: 4, meshes: [mesh], mats: [mat], z, colorKey: 'boost' };
}

export function createVictoryBlocksAt(z) {
  const gap1 = randGap();
  const gap2 = randGap();
  const z1 = z - gap1;
  const z2 = z1 - gap2;

  const group1 = createType1(z, randColor());
  state.trackGroups.push(group1);
  state.groupZList.push(z);
  state.generatedCount++;

  const group2 = createType1(z1, randColor());
  group2.isVictoryTrack = true;
  state.trackGroups.push(group2);
  state.groupZList.push(z1);
  state.victoryTrackGroups.push(state.trackGroups.length - 1);
  state.generatedCount++;

  const group3 = createType1(z2, randColor());
  state.trackGroups.push(group3);
  state.groupZList.push(z2);
  state.generatedCount++;

  state.fns.createBlackHole(z1);
  state.bhGroup.scale.setScalar(0);
  state.bhSpawnTimer = 0;

  state.targetDistance = state.totalDistance + Math.abs(z1);
  state.fns.updateDistanceUI();

  state.victoryTrackSpawned = true;
  state.blackHoleActive = true;
}

export function createRandomGroup(z, safeColor, maxType) {
  maxType = maxType || 3;
  if (Math.random() < state.strategy.getBoostProb()) {
    const group = createType4(z);
    state.trackGroups.push(group);
    state.groupZList.push(z);
    return group;
  }
  const type = Math.floor(Math.random() * maxType) + 1;
  let group;
  if (type === 1) {
    group = createType1(z, randColor());
  } else if (type === 2) {
    const available = getAvailableColors().filter(k => k !== safeColor);
    const other = available[Math.floor(Math.random() * available.length)];
    const cols = [safeColor, other].sort(() => Math.random() - 0.5);
    group = createType2(z, cols);
  } else {
    const available = getAvailableColors().filter(k => k !== safeColor);
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const otherTwo = shuffled.slice(0, 2);
    const cols = [safeColor, ...otherTwo].sort(() => Math.random() - 0.5);
    group = createType3(z, cols);
  }
  state.trackGroups.push(group);
  state.groupZList.push(z);
  return group;
}

export function disposeGroup(group) {
  for (const m of group.meshes) state.scene.remove(m);
  for (const mat of group.mats) mat.dispose();
}

export function removeGroup(idx) {
  disposeGroup(state.trackGroups[idx]);
  state.trackGroups.splice(idx, 1);
  state.groupZList.splice(idx, 1);
  for (let i = 0; i < state.victoryTrackGroups.length; i++) {
    if (state.victoryTrackGroups[i] === idx) {
      state.victoryTrackGroups.splice(i, 1);
      i--;
    } else if (state.victoryTrackGroups[i] > idx) {
      state.victoryTrackGroups[i]--;
    }
  }
}

export function randGap() {
  return (GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN)) * state.strategy.getGapScale();
}

export function generateInitialGroups() {
  let z = 0;
  for (let i = 0; i < 5; i++) {
    const g = createType1(z, randColor());
    state.trackGroups.push(g);
    state.groupZList.push(z);
    state.generatedCount++;
    z -= randGap();
  }
  state.lastLongTrackColor = state.trackGroups[state.trackGroups.length - 1].colorKey;
  while (z > -VISIBLE_DEPTH) {
    z -= randGap();
    if (state.strategy.hasVictory() && !state.victoryTrackSpawned && state.generatedCount >= state.strategy.getWinHits()) {
      createVictoryBlocksAt(z);
      return;
    }
    createRandomGroup(z, state.lastLongTrackColor, state.strategy.getMaxType());
    state.generatedCount++;
    const newGroup = state.trackGroups[state.trackGroups.length - 1];
    if (newGroup.type === 1) {
      state.lastLongTrackColor = newGroup.colorKey;
    }
  }
}

export function updateTrack(deltaZ) {
  state.totalDistance += deltaZ;
  for (let i = 0; i < state.trackGroups.length; i++) {
    state.groupZList[i] += deltaZ;
    state.trackGroups[i].z = state.groupZList[i];
    for (const m of state.trackGroups[i].meshes) {
      m.position.z = state.groupZList[i];
    }
  }

  if (state.bhGroup && state.victoryTrackGroups.length > 0) {
    const victoryGroupIdx = state.victoryTrackGroups.find(idx => idx < state.trackGroups.length);
    if (victoryGroupIdx !== undefined) {
      const victoryGroup = state.trackGroups[victoryGroupIdx];
      if (victoryGroup) {
        state.bhGroup.position.z = victoryGroup.z;
        if (state.targetDistance !== null) {
          state.targetDistance = state.totalDistance + Math.abs(victoryGroup.z);
        }
      }
    }
  }

  for (let i = state.trackGroups.length - 1; i >= 0; i--) {
    const z = state.groupZList[i];
    const isNearVictory = state.victoryTrackGroups.some(vIdx => {
      if (vIdx === undefined || vIdx >= state.trackGroups.length) return false;
      const vz = state.trackGroups[vIdx].z;
      return Math.abs(z - vz) < 30;
    });
    if (state.trackGroups[i].isVictoryTrack || isNearVictory) continue;
    if (z > FADE_START) {
      const ratio = Math.min(1, (z - FADE_START) / (FADE_END - FADE_START));
      for (const mat of state.trackGroups[i].mats) {
        mat.opacity = 1.0 - ratio;
      }
    }
    if (z > FADE_END) {
      removeGroup(i);
    }
  }

  if (!state.victoryTrackSpawned || !state.strategy.hasVictory()) {
    let minZ = state.groupZList.length > 0 ? Math.min(...state.groupZList) : 0;
    while (minZ > -VISIBLE_DEPTH) {
      minZ -= randGap();
      if (state.strategy.hasVictory() && !state.victoryTrackSpawned && state.generatedCount >= state.strategy.getWinHits()) {
        createVictoryBlocksAt(minZ);
        break;
      }
      createRandomGroup(minZ, state.lastLongTrackColor, state.strategy.getMaxType());
      state.generatedCount++;
      const newGroup = state.trackGroups[state.trackGroups.length - 1];
      if (newGroup.type === 1) {
        state.lastLongTrackColor = newGroup.colorKey;
      }
    }
  }
}

export function findCollisionWithAnyGroup() {
  const r = BALL_RADIUS;
  let bestGroup = null, bestColorKey = null, bestMesh = null;
  let bestDist = Infinity;
  for (let gi = 0; gi < state.trackGroups.length; gi++) {
    const group = state.trackGroups[gi];
    const gz = state.groupZList[gi];
    for (let mi = 0; mi < group.meshes.length; mi++) {
      const mesh = group.meshes[mi];
      const bx = mesh.position.x;
      const by = mesh.position.y;
      let hsx, hsz;
      if (group.type === 1 || group.type === 4) {
        hsx = LONG_SIZE_X / 2;
        hsz = LONG_SIZE_Z / 2;
      } else {
        hsx = SQ_SIZE / 2;
        hsz = SQ_SIZE / 2;
      }
      const hsy = PLATE_HEIGHT / 2;
      const closestX = Math.max(bx - hsx, Math.min(state.ballX, bx + hsx));
      const closestY = Math.max(by - hsy, Math.min(state.ballY, by + hsy));
      const closestZ = Math.max(gz - hsz, Math.min(0, gz + hsz));
      const dx = state.ballX - closestX;
      const dy = state.ballY - closestY;
      const dz = 0 - closestZ;
      const dist = dx * dx + dy * dy + dz * dz;
      if (dist < r * r && dist < bestDist) {
        bestDist = dist;
        bestGroup = group;
        bestMesh = mesh;
        bestColorKey = group.colorKeys ? group.colorKeys[mi] : group.colorKey;
      }
    }
  }
  return bestGroup ? { group: bestGroup, colorKey: bestColorKey, mesh: bestMesh } : null;
}

export function recalcVelZ() {
  let nearestAheadZ = -Infinity;
  for (const z of state.groupZList) {
    if (z < -0.5 && z > nearestAheadZ) {
      nearestAheadZ = z;
    }
  }
  if (nearestAheadZ > -Infinity) {
    const period = getCurrentBouncePeriod(state.currentGravityY);
    state.velZ = Math.abs(nearestAheadZ) / period;
  }
}

export function recalcVelZFromAir() {
  let nearestAheadZ = -Infinity;
  for (const z of state.groupZList) {
    if (z < -0.5 && z > nearestAheadZ) {
      nearestAheadZ = z;
    }
  }
  if (nearestAheadZ <= -Infinity) return;

  const g = Math.abs(GRAVITY_Y);
  const h = state.ballY - state.floorContact;
  const normalVelY = Math.sqrt(2 * g * Math.max(INIT_HEIGHT - h, 0));
  if (state.velY > 0 && state.velY > normalVelY * 1.1) {
    state.velY = normalVelY;
  }

  let timeToLand;
  if (h <= 0.01) {
    timeToLand = getCurrentBouncePeriod(state.currentGravityY);
  } else {
    const vyUp = state.velY > 0 ? state.velY : 0;
    const tUp = vyUp / g;
    const hTop = h + vyUp * tUp - 0.5 * g * tUp * tUp;
    const tDown = Math.sqrt(2 * Math.max(hTop, 0) / g);
    timeToLand = tUp + tDown;
    if (timeToLand < 0.1) timeToLand = getCurrentBouncePeriod(state.currentGravityY);
  }

  state.velZ = Math.abs(nearestAheadZ) / timeToLand;
}

export function onLandUpdateVelZ() {
  let landingIdx = -1;
  let landingZ = Infinity;
  for (let i = 0; i < state.groupZList.length; i++) {
    if (Math.abs(state.groupZList[i]) < landingZ) {
      landingZ = Math.abs(state.groupZList[i]);
      landingIdx = i;
    }
  }

  if (landingIdx >= 0) {
    const group = state.trackGroups[landingIdx];
    if (group.type === 1 && group.colorKey && group.colorKey !== 'boost') {
      const cKey = group.colorKey;
      const rgb = COLORS[cKey].rgb;
      state.sphereMat.color.set(COLORS[cKey].hex);
      state.sphereMat.emissive.set(new THREE.Color(rgb[0]*0.3/255, rgb[1]*0.3/255, rgb[2]*0.3/255));
      state.ballColorKey = cKey;
      state.fns.setBoostParticleColor(cKey);
    }
  }
  let nearestAheadZ = -Infinity;
  for (const z of state.groupZList) {
    if (z < -0.5 && z > nearestAheadZ) {
      nearestAheadZ = z;
    }
  }
  if (nearestAheadZ > -Infinity) {
    const period = getCurrentBouncePeriod(state.currentGravityY);
    state.velZ = Math.abs(nearestAheadZ) / period;
  }
}
