import * as THREE from 'three';
import { state } from './state.js';
import { BALL_RADIUS, GROUND_Y, GRAVITY_Y, INIT_HEIGHT, _g } from './config.js';

export function initPlayer() {
  const sphereGeo = new THREE.SphereGeometry(BALL_RADIUS, 64, 64);
  state.sphereMat = new THREE.MeshStandardMaterial({
    color: 0x4488ff, metalness: 0.3, roughness: 0.2, emissive: 0x112244
  });
  state.sphere = new THREE.Mesh(sphereGeo, state.sphereMat);
  state.sphere.castShadow = true;
  state.scene.add(state.sphere);

  state.wireMesh = new THREE.Mesh(sphereGeo,
    new THREE.MeshBasicMaterial({ color: 0x88ccff, wireframe: true, transparent: true, opacity: 0.08 })
  );
  state.scene.add(state.wireMesh);

  const ringCount = 120;
  const ringPos = new Float32Array(ringCount * 3);
  for (let i = 0; i < ringCount; i++) {
    const a = (i / ringCount) * Math.PI * 2;
    const r = 0.8 + Math.random() * 0.1;
    ringPos[i * 3] = Math.cos(a) * r;
    ringPos[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
    ringPos[i * 3 + 2] = Math.sin(a) * r;
  }
  const ringGeo = new THREE.BufferGeometry();
  ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPos, 3));
  state.ring = new THREE.Points(ringGeo,
    new THREE.PointsMaterial({ color: 0x66aaff, size: 0.04, transparent: true, opacity: 0.7 }));
  state.scene.add(state.ring);

  state.floorContact = GROUND_Y + BALL_RADIUS;
  state.ballY = state.floorContact;
  state.velY = Math.sqrt(2 * _g * INIT_HEIGHT);
  state.currentGravityY = GRAVITY_Y;
}
