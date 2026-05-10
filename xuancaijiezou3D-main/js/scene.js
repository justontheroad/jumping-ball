import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { state } from './state.js';

export function initScene() {
  state.scene = new THREE.Scene();
  state.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
  state.camera.position.set(0, 3, 10);
  state.camera.lookAt(0, 0, -10);

  state.renderer = new THREE.WebGLRenderer({ antialias: true });
  state.renderer.setSize(innerWidth, innerHeight);
  state.renderer.setPixelRatio(devicePixelRatio);
  state.renderer.shadowMap.enabled = true;
  state.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(state.renderer.domElement);

  state.controls = new OrbitControls(state.camera, state.renderer.domElement);
  state.controls.enableDamping = true;
  state.controls.dampingFactor = 0.05;
  state.controls.enableRotate = false;
  state.controls.enableZoom = false;
  state.controls.enablePan = false;
  state.controls.target.set(0, 0, -10);

  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(4000 * 3);
  for (let i = 0; i < starPos.length; i++) starPos[i] = (Math.random() - 0.5) * 300;
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  state.scene.add(new THREE.Points(starGeo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, transparent: true, opacity: 0.7 })));

  state.scene.add(new THREE.AmbientLight(0x223355, 1.8));
  const keyLight = new THREE.PointLight(0xffffff, 150, 50);
  keyLight.position.set(5, 8, 5);
  keyLight.castShadow = true;
  state.scene.add(keyLight);
  const fillLight = new THREE.PointLight(0x6633ff, 70, 30);
  fillLight.position.set(-5, -2, 3);
  state.scene.add(fillLight);

  state.movingLight = new THREE.PointLight(0xff6600, 60, 25);
  state.scene.add(state.movingLight);

  state.lightBall = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff9933 })
  );
  state.scene.add(state.lightBall);
}
