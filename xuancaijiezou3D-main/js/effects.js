import * as THREE from 'three';
import { state } from './state.js';
import {
  BALL_RADIUS,
  COLORS,
  GROUND_Y,
  PLATE_HEIGHT,
  LONG_SIZE_X,
  LONG_SIZE_Z,
  SQ_SIZE,
  BOOST_PARTICLE_COUNT,
  BOOST_COLOR_LERP_SPEED,
  DEATH_DURATION,
  RIPPLE_DURATION,
  PRESS_DURATION,
  COMBO_HIDE_DELAY
} from './config.js';

const rippleVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const rippleFragmentShader = `
  uniform vec3 uColor;
  uniform float uProgress;
  varying vec2 vUv;
  void main() {
    vec2 centered = abs(vUv - 0.5) * 2.0;
    float boxDist = max(centered.x, centered.y);
    float innerFill = 1.0 - smoothstep(0.0, 0.08, boxDist);
    float outerFade = 1.0 - smoothstep(0.0, 0.6, boxDist);
    float masterFade = 1.0 - smoothstep(0.3, 1.0, uProgress);
    float alpha = (innerFill * 0.7 + outerFade * 0.3) * masterFade;
    float glow = exp(-boxDist * 3.0) * masterFade * 0.5;
    vec3 col = uColor * (1.0 + glow * 0.5);
    gl_FragColor = vec4(col, alpha + glow * 0.4);
  }
`;

export function initEffects() {
  const boostParticleGeo = new THREE.BufferGeometry();
  const boostPosArr = new Float32Array(BOOST_PARTICLE_COUNT * 3);
  const boostSizeArr = new Float32Array(BOOST_PARTICLE_COUNT);
  const boostParticleData = [];

  for (let i = 0; i < BOOST_PARTICLE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const tunnelR = 3 + Math.random() * 25;
    const zOff = -60 + Math.random() * 120;
    const spiralPhase = Math.random() * Math.PI * 2;
    const spiralArm = Math.floor(Math.random() * 3);

    boostPosArr[i * 3]     = tunnelR * Math.cos(angle);
    boostPosArr[i * 3 + 1] = (Math.random() - 0.5) * 30;
    boostPosArr[i * 3 + 2] = zOff;

    const sizeRoll = Math.random();
    if (sizeRoll < 0.7) {
      boostSizeArr[i] = 0.06 + Math.random() * 0.12;
    } else if (sizeRoll < 0.92) {
      boostSizeArr[i] = 0.2 + Math.random() * 0.4;
    } else {
      boostSizeArr[i] = 0.6 + Math.random() * 1.0;
    }

    boostParticleData.push({
      angle,
      tunnelR,
      baseTunnelR: tunnelR,
      zOff,
      spiralPhase,
      spiralArm,
      speed: 1.5 + Math.random() * 3.0,
      zSpeed: 5 + Math.random() * 15,
      pulsePhase: Math.random() * Math.PI * 2,
      sizeBase: boostSizeArr[i],
    });
  }

  boostParticleGeo.setAttribute('position', new THREE.BufferAttribute(boostPosArr, 3));
  boostParticleGeo.setAttribute('aSize', new THREE.BufferAttribute(boostSizeArr, 1));

  const boostParticleColorTarget = new THREE.Color(0.4, 0.53, 1.0);
  const boostParticleColorCurrent = new THREE.Color(0.4, 0.53, 1.0);

  const boostParticleMat = new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 0.0 },
      uColor: { value: new THREE.Color(0.4, 0.53, 1.0) },
    },
    vertexShader: `
      attribute float aSize;
      varying float vDist;
      void main() {
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vDist = -mvPos.z;
        gl_PointSize = aSize * (250.0 / max(1.0, -mvPos.z));
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      uniform vec3 uColor;
      varying float vDist;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float alpha = 1.0 - smoothstep(0.0, 1.0, d);
        float glow = exp(-d * 3.0) * 0.7;
        vec3 col = uColor * (1.0 + glow);
        float fog = smoothstep(100.0, 15.0, vDist);
        gl_FragColor = vec4(col, (alpha + glow * 0.6) * uOpacity * fog);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const boostParticles = new THREE.Points(boostParticleGeo, boostParticleMat);
  boostParticles.visible = false;
  state.scene.add(boostParticles);

  state.boostParticles = boostParticles;
  state.boostParticleGeo = boostParticleGeo;
  state.boostParticleMat = boostParticleMat;
  state.boostParticleData = boostParticleData;
  state.boostParticleColorTarget = boostParticleColorTarget;
  state.boostParticleColorCurrent = boostParticleColorCurrent;

  state.boostParticleTime = 0;
  state.boostParticleVisible = false;
  state.boostFadeAlpha = 0;

  state.landEffects = [];
  state.comboCount_ = 0;
  state.comboVisible = false;
  state.comboTimeout = null;

  state.dying = false;
  state.deathTimer = 0;
  state.deathFragments = [];
  state.deathParticles = [];
}

export function setBoostParticleColor(colorKey) {
  if (!colorKey || !COLORS[colorKey]) return;
  const rgb = COLORS[colorKey].rgb;
  state.boostParticleColorTarget.set(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
}

export function updateBoostParticles(dt) {
  const isActive = state.boostTimer > 0;
  if (isActive && !state.boostParticleVisible) {
    state.boostParticleVisible = true;
    state.boostParticles.visible = true;
    setBoostParticleColor(state.ballColorKey);
    state.boostParticleColorCurrent.copy(state.boostParticleColorTarget);
  }
  if (isActive) {
    state.boostFadeAlpha = Math.min(1.0, state.boostFadeAlpha + dt * 2.5);
  } else {
    state.boostFadeAlpha = Math.max(0.0, state.boostFadeAlpha - dt * 1.2);
    if (state.boostFadeAlpha <= 0) {
      state.boostParticleVisible = false;
      state.boostParticles.visible = false;
    }
  }
  state.boostParticleMat.uniforms.uOpacity.value = state.boostFadeAlpha * 0.85;

  if (state.boostFadeAlpha <= 0) return;

  state.boostParticleColorCurrent.lerp(state.boostParticleColorTarget, 1 - Math.exp(-BOOST_COLOR_LERP_SPEED * dt));
  state.boostParticleMat.uniforms.uColor.value.copy(state.boostParticleColorCurrent);

  state.boostParticleTime += dt;
  const posAttr = state.boostParticleGeo.getAttribute('position');
  const sizeAttr = state.boostParticleGeo.getAttribute('aSize');

  for (let i = 0; i < BOOST_PARTICLE_COUNT; i++) {
    const pd = state.boostParticleData[i];
    pd.angle += pd.speed * dt;
    pd.zOff += pd.zSpeed * dt;
    if (pd.zOff > 60) {
      pd.zOff -= 120;
    }

    const spiralAngle = pd.angle + pd.spiralArm * (Math.PI * 2 / 3);
    const zNorm = (pd.zOff + 60) / 120;
    const tunnelConverge = 1.0 - Math.abs(zNorm - 0.5) * 0.6;
    const r = pd.baseTunnelR * tunnelConverge;

    const spiralX = Math.sin(pd.zOff * 0.08 + pd.spiralPhase) * r * 0.4;
    const spiralY = Math.cos(pd.zOff * 0.08 + pd.spiralPhase) * r * 0.3;

    const x = r * Math.cos(spiralAngle) + spiralX;
    const y = r * Math.sin(spiralAngle) * 0.5 + spiralY + state.ballY * 0.25;
    const z = pd.zOff;

    posAttr.setXYZ(i, x, y, z);

    const sizePulse = 1.0 + Math.sin(state.boostParticleTime * 2.0 + pd.pulsePhase) * 0.2;
    sizeAttr.setX(i, pd.sizeBase * sizePulse);
  }
  posAttr.needsUpdate = true;
  sizeAttr.needsUpdate = true;
}

export function triggerLandEffect(plateMesh, plateColorKey, plateGroup, plateW, plateD) {
  const baseY = GROUND_Y + PLATE_HEIGHT / 2;
  state.landEffects.push({
    mesh: plateMesh,
    baseY,
    timer: 0,
    duration: PRESS_DURATION,
    type: 'press'
  });

  let rgb;
  if (plateColorKey === 'boost') {
    rgb = [220, 220, 255];
  } else {
    rgb = COLORS[plateColorKey].rgb;
  }
  const color = new THREE.Color(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);

  const rippleGeo = new THREE.PlaneGeometry(plateW, plateD);
  const rippleMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: color },
      uProgress: { value: 0.0 }
    },
    vertexShader: rippleVertexShader,
    fragmentShader: rippleFragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const ripple = new THREE.Mesh(rippleGeo, rippleMat);
  ripple.rotation.x = -Math.PI / 2;
  plateMesh.add(ripple);
  ripple.position.set(0, -PLATE_HEIGHT / 2 - 0.005, 0);
  state.landEffects.push({
    mesh: ripple,
    parentMesh: plateMesh,
    timer: 0,
    duration: RIPPLE_DURATION,
    type: 'ripple',
    mat: rippleMat
  });

  const edgeCount = 40;
  const posArr = new Float32Array(edgeCount * 3);
  const edgePositions = [];
  for (let i = 0; i < edgeCount; i++) {
    const edge = Math.floor(Math.random() * 4);
    const t = (Math.random() - 0.5);
    let x, z;
    switch (edge) {
      case 0: x = plateW / 2 * t; z = plateD / 2; break;
      case 1: x = plateW / 2 * t; z = -plateD / 2; break;
      case 2: x = plateW / 2; z = plateD / 2 * t; break;
      case 3: x = -plateW / 2; z = plateD / 2 * t; break;
    }
    posArr[i * 3] = x;
    posArr[i * 3 + 1] = 0;
    posArr[i * 3 + 2] = z;
    const len = Math.sqrt(x * x + z * z) || 1;
    edgePositions.push({ x, z, dx: x / len, dz: z / len });
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  const particleMat = new THREE.PointsMaterial({
    color: color,
    size: 0.06,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  particles.rotation.x = -Math.PI / 2;
  plateMesh.add(particles);
  particles.position.set(0, -PLATE_HEIGHT / 2 - 0.005, 0);
  state.landEffects.push({
    mesh: particles,
    parentMesh: plateMesh,
    timer: 0,
    duration: RIPPLE_DURATION,
    type: 'particles',
    mat: particleMat,
    geo: particleGeo,
    edgePositions,
    origPositions: posArr.slice()
  });
}

export function updateLandEffects(dt) {
  for (let i = state.landEffects.length - 1; i >= 0; i--) {
    const fx = state.landEffects[i];
    fx.timer += dt;
    const progress = Math.min(1, fx.timer / fx.duration);
    const eased = 1 - Math.pow(1 - progress, 2);

    if (fx.type === 'press') {
      const t = progress;
      const pressDepth = 0.18;
      if (t < 0.5) {
        const ease = t * 2;
        fx.mesh.position.y = fx.baseY - pressDepth * ease;
      } else {
        const ease = (t - 0.5) * 2;
        const overshoot = Math.sin(ease * Math.PI) * 0.015;
        fx.mesh.position.y = fx.baseY - pressDepth * (1 - ease) + overshoot;
      }
    } else if (fx.type === 'ripple') {
      const scale = 1 + eased * 8;
      fx.mesh.scale.setScalar(scale);
      fx.mat.uniforms.uProgress.value = progress;
    } else if (fx.type === 'particles') {
      const posAttr = fx.geo.getAttribute('position');
      for (let j = 0; j < fx.edgePositions.length; j++) {
        const ep = fx.edgePositions[j];
        const dist = eased * 1.5;
        posAttr.array[j * 3]     = fx.origPositions[j * 3]     + ep.dx * dist;
        posAttr.array[j * 3 + 1] = Math.sin(progress * Math.PI) * 0.05;
        posAttr.array[j * 3 + 2] = fx.origPositions[j * 3 + 2] + ep.dz * dist;
      }
      posAttr.needsUpdate = true;
      fx.mat.opacity = (1 - progress) * 0.8;
    }

    if (fx.timer >= fx.duration) {
      if (fx.type === 'press') {
        fx.mesh.position.y = fx.baseY;
      } else {
        if (fx.parentMesh) fx.parentMesh.remove(fx.mesh);
        fx.mesh.geometry.dispose();
        if (fx.mat.dispose) fx.mat.dispose();
      }
      state.landEffects.splice(i, 1);
    }
  }
}

export function triggerCombo() {
  state.comboCount_++;
  const word = Math.random() > 0.2 ? 'PERFECT' : 'GREAT';

  const comboUI = document.getElementById('comboUI');
  const comboWord = document.getElementById('comboWord');
  const comboCount = document.getElementById('comboCount');

  comboWord.textContent = word;
  comboUI.classList.add('visible');
  state.comboVisible = true;

  comboWord.classList.remove('pop');
  void comboWord.offsetWidth;
  comboWord.classList.add('pop');

  comboCount.textContent = `x${state.comboCount_}`;
  comboCount.classList.remove('bump');
  void comboCount.offsetWidth;
  comboCount.classList.add('bump');

  if (state.ballColorKey) {
    const rgb = COLORS[state.ballColorKey].rgb;
    const glowColor = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
    const shadow = `0 0 20px ${glowColor}, 0 0 40px ${glowColor}, 0 0 80px rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.4)`;
    comboWord.style.textShadow = shadow;
    comboCount.style.textShadow = `0 0 12px ${glowColor}, 0 0 24px rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.3)`;
  }

  if (state.comboTimeout) clearTimeout(state.comboTimeout);
  state.comboTimeout = setTimeout(() => {
    const ui = document.getElementById('comboUI');
    if (ui) ui.classList.remove('visible');
    state.comboVisible = false;
    state.comboCount_ = 0;
  }, COMBO_HIDE_DELAY);
}

export function hideCombo() {
  const comboUI = document.getElementById('comboUI');
  if (comboUI) comboUI.classList.remove('visible');
  state.comboVisible = false;
  state.comboCount_ = 0;
  if (state.comboTimeout) { clearTimeout(state.comboTimeout); state.comboTimeout = null; }
}

export function triggerDeath(plateColorKey) {
  state.dying = true;
  state.deathTimer = 0;
  state.velZ = 0;

  hideCombo();

  state.sphere.visible = false;
  state.wireMesh.visible = false;
  state.ring.visible = false;

  const fragGeo = new THREE.IcosahedronGeometry(BALL_RADIUS * 0.25, 1);
  const fragCount = 25;
  for (let i = 0; i < fragCount; i++) {
    const fragMat = new THREE.MeshStandardMaterial({
      color: state.sphereMat.color.clone(),
      metalness: 0.3, roughness: 0.2,
      emissive: state.sphereMat.emissive.clone(),
      transparent: true, opacity: 1.0
    });
    const frag = new THREE.Mesh(fragGeo, fragMat);
    frag.position.set(state.ballX, state.ballY, 0);
    state.scene.add(frag);
    const speed = 3 + Math.random() * 5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    state.deathFragments.push({
      mesh: frag,
      mat: fragMat,
      vel: new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.abs(Math.cos(phi)) * speed * 0.8 + 2,
        Math.sin(phi) * Math.sin(theta) * speed
      ),
      angularVel: new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      )
    });
  }

  const particleGeo = new THREE.SphereGeometry(BALL_RADIUS * 0.06, 4, 4);
  const particleCount = 80;
  for (let i = 0; i < particleCount; i++) {
    const pMat = new THREE.MeshBasicMaterial({
      color: [0xff68fd, 0xffe528, 0x15befc, 0xffffff][Math.floor(Math.random() * 4)],
      transparent: true, opacity: 1.0
    });
    const particle = new THREE.Mesh(particleGeo, pMat);
    particle.position.set(state.ballX, state.ballY, 0);
    state.scene.add(particle);
    const speed = 1.5 + Math.random() * 7;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    state.deathParticles.push({
      mesh: particle,
      mat: pMat,
      vel: new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.abs(Math.cos(phi)) * speed * 0.6 + 1,
        Math.sin(phi) * Math.sin(theta) * speed
      ),
      life: 0.6 + Math.random() * 0.4
    });
  }

  setTimeout(() => {
    state.strategy.onGameOver();
  }, DEATH_DURATION * 1000);
}

export function updateDeath(dt) {
  if (!state.dying) return;
  state.deathTimer += dt;

  for (const f of state.deathFragments) {
    f.vel.y -= 9.8 * dt;
    f.mesh.position.addScaledVector(f.vel, dt);
    f.mesh.rotation.x += f.angularVel.x * dt;
    f.mesh.rotation.y += f.angularVel.y * dt;
    f.mesh.rotation.z += f.angularVel.z * dt;
    const alpha = Math.max(0, 1 - state.deathTimer / DEATH_DURATION);
    f.mat.opacity = alpha;
  }

  for (const p of state.deathParticles) {
    p.vel.y -= 6 * dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    const lifeRatio = Math.max(0, p.life - state.deathTimer / DEATH_DURATION);
    p.mat.opacity = lifeRatio;
    const scale = Math.max(0.01, lifeRatio);
    p.mesh.scale.setScalar(scale);
  }
}

export function cleanupDeath() {
  for (const f of state.deathFragments) {
    state.scene.remove(f.mesh);
    f.mat.dispose();
  }
  state.deathFragments.length = 0;
  for (const p of state.deathParticles) {
    state.scene.remove(p.mesh);
    p.mat.dispose();
  }
  state.deathParticles.length = 0;
}
