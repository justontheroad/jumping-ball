import * as THREE from 'three';
import { state } from './state.js';
import { BALL_RADIUS, GROUND_Y, INIT_HEIGHT, BH_RADIUS, BH_EVENT_HORIZON, BH_ATTRACT_RADIUS, BH_SPAWN_DURATION, VISIBLE_DEPTH } from './config.js';

export function createBlackHole(z) {
  state.bhGroup = new THREE.Group();
  const bhY = GROUND_Y + BALL_RADIUS + INIT_HEIGHT / 2;
  state.bhGroup.position.set(0, bhY, z);
  state.scene.add(state.bhGroup);

  const coreGeo = new THREE.SphereGeometry(0.8, 32, 32);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const core = new THREE.Mesh(coreGeo, coreMat);
  state.bhGroup.add(core);

  const accGeo = new THREE.RingGeometry(1.0, BH_RADIUS, 64);
  const accMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uInner: { value: 1.0 },
      uOuter: { value: BH_RADIUS },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uInner;
      uniform float uOuter;
      varying vec2 vUv;
      void main() {
        vec2 center = vUv - 0.5;
        float dist = length(center);
        float angle = atan(center.y, center.x);
        float spiral = sin(angle * 3.0 - uTime * 4.0 + dist * 10.0) * 0.5 + 0.5;
        float radial = 1.0 - smoothstep(uInner / (uInner + uOuter), 1.0, dist * 2.0);
        vec3 col1 = vec3(0.4, 0.2, 1.0);
        vec3 col2 = vec3(0.2, 0.5, 1.0);
        vec3 col3 = vec3(1.0, 0.3, 0.8);
        vec3 col = mix(col1, col2, spiral);
        col = mix(col, col3, pow(spiral, 3.0));
        float alpha = radial * (0.4 + 0.6 * spiral);
        gl_FragColor = vec4(col, alpha * 0.8);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const accDisk = new THREE.Mesh(accGeo, accMat);
  state.bhGroup.add(accDisk);

  const glowGeo = new THREE.RingGeometry(BH_RADIUS, BH_RADIUS + 1.5, 64);
  const glowMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vec2 center = vUv - 0.5;
        float dist = length(center);
        float angle = atan(center.y, center.x);
        float spiral = sin(angle * 2.0 - uTime * 2.0 + dist * 8.0) * 0.5 + 0.5;
        float fade = 1.0 - smoothstep(0.0, 1.0, dist * 2.0);
        vec3 col = mix(vec3(0.2, 0.1, 0.6), vec3(0.1, 0.3, 0.8), spiral);
        gl_FragColor = vec4(col, fade * 0.25 * spiral);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  state.bhGroup.add(glow);

  const pCount = 300;
  const pPositions = new Float32Array(pCount * 3);
  state.bhParticleData = [];
  for (let i = 0; i < pCount; i++) {
    state.bhParticleData.push({
      angle: Math.random() * Math.PI * 2,
      radius: BH_RADIUS * 0.5 + Math.random() * BH_RADIUS * 2,
      speed: 1.0 + Math.random() * 2.5,
      yOff: (Math.random() - 0.5) * 1.5,
      ySpeed: (Math.random() - 0.5) * 0.5,
      shrink: 0.003 + Math.random() * 0.008,
    });
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
  state.bhParticles = new THREE.Points(pGeo, new THREE.PointsMaterial({
    color: 0xaa88ff,
    size: 0.06,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  state.bhGroup.add(state.bhParticles);
}

export function updateBlackHole(dt) {
  if (!state.bhGroup || !state.bhParticles) return;
  state.bhRotation += dt * 0.8;

  if (state.bhSpawnTimer < BH_SPAWN_DURATION) {
    state.bhSpawnTimer += dt;
    const progress = Math.min(1, state.bhSpawnTimer / BH_SPAWN_DURATION);
    const eased = 1 - Math.pow(1 - progress, 3);
    state.bhGroup.scale.setScalar(eased);
  }

  state.bhGroup.children.forEach(child => {
    if (child.material && child.material.uniforms && child.material.uniforms.uTime) {
      child.material.uniforms.uTime.value += dt;
    }
  });
  state.bhGroup.rotation.y += dt * 0.3;

  const posAttr = state.bhParticles.geometry.getAttribute('position');
  for (let i = 0; i < state.bhParticleData.length; i++) {
    const pd = state.bhParticleData[i];
    pd.angle += pd.speed * dt;
    pd.radius -= pd.shrink;
    pd.yOff *= 0.998;
    if (pd.radius < 0.3) {
      pd.radius = BH_RADIUS * 0.8 + Math.random() * BH_RADIUS * 1.5;
      pd.angle = Math.random() * Math.PI * 2;
      pd.yOff = (Math.random() - 0.5) * 1.5;
    }
    posAttr.setXYZ(i,
      Math.cos(pd.angle) * pd.radius,
      pd.yOff,
      Math.sin(pd.angle) * pd.radius
    );
  }
  posAttr.needsUpdate = true;
}

export function cleanupBlackHole() {
  if (state.bhGroup) {
    state.bhGroup.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (child.material.dispose) child.material.dispose();
      }
    });
    state.scene.remove(state.bhGroup);
    state.bhGroup = null;
    state.bhParticles = null;
    state.bhParticleData = [];
  }
}

export function checkBlackHoleCollision() {
  if (!state.bhGroup || state.winning || state.dying) return;
}

export function updateWin(dt) {
  if (!state.winning) return;
  state.winTimer += dt;
  if (state.bhGroup && state.sphere.visible) {
    const bhPos = state.bhGroup.position;
    const speed = 3 + state.winTimer * 5;
    state.ballX += (bhPos.x - state.ballX) * dt * speed;
    state.ballY += (bhPos.y - state.ballY) * dt * speed;
    const scale = Math.max(0.01, 1 - state.winTimer * 1.5);
    state.sphere.scale.setScalar(scale);
    state.wireMesh.scale.setScalar(scale);
    state.ring.scale.setScalar(scale);
    if (scale <= 0.05) {
      state.sphere.visible = false;
      state.wireMesh.visible = false;
      state.ring.visible = false;
    }
  }
  updateBlackHole(dt);
  if (state.winTimer > 1.5) {
    state.winning = false;
    state.strategy.onVictory();
  }
}

export function spawnBlackHole() {
  state.blackHoleActive = true;
  state.bhSpawnTimer = 0;
  const z = -VISIBLE_DEPTH * 0.75;
  createBlackHole(z);
  state.bhGroup.scale.setScalar(0);
  state.targetDistance = state.totalDistance + Math.abs(z);
  state.fns.updateDistanceUI();
}
