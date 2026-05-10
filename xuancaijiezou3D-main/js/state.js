export const state = {
  scene: null,
  camera: null,
  renderer: null,
  controls: null,

  sphere: null,
  sphereMat: null,
  wireMesh: null,
  ring: null,

  movingLight: null,
  lightBall: null,

  longGeo: null,
  sqGeo: null,
  arrowTextures: null,

  boostParticles: null,
  boostParticleGeo: null,
  boostParticleMat: null,
  boostParticleData: [],

  gameMode: 'levels',
  strategy: null,

  currentCycle: 1,
  currentLevel: 0,
  unlockedLevels: [true, false, false, false, false, false, false, false, false, false],

  endlessBestDistance: 0,
  endlessBestStageIndex: 0,
  endlessTotalRuns: 0,
  currentStageIndex: 0,
  lastEndlessDistance: 0,
  lastEndlessStageIndex: 0,
  lastEndlessNewRecord: false,

  trackGroups: [],
  groupZList: [],
  lastLongTrackColor: null,
  victoryTrackGroups: [],
  victoryTrackSpawned: false,

  ballX: 0,
  ballY: 0,
  velY: 0,
  velZ: 0,
  ballXTarget: 0,
  mouseDeltaX: 0,
  ballColorKey: null,
  floorContact: 0,
  falling: false,

  boostTimer: 0,
  currentGravityY: 0,
  boostCharging: false,
  boostParticleVisible: false,
  boostFadeAlpha: 0,
  boostParticleTime: 0,
  boostParticleColorTarget: null,
  boostParticleColorCurrent: null,

  dying: false,
  deathTimer: 0,
  deathFragments: [],
  deathParticles: [],

  comboCount_: 0,
  comboVisible: false,
  comboTimeout: null,

  hitCount: 0,
  totalDistance: 0,
  blackHoleActive: false,
  winning: false,
  winTimer: 0,
  targetDistance: null,

  bhGroup: null,
  bhParticles: null,
  bhParticleData: [],
  bhRotation: 0,
  bhSpawnTimer: 0,
  bhAttracting: false,

  landEffects: [],

  currentTab: 'levels',
  levelAnnounceTimer: null,

  lastTime: 0,
  t: 0,

  fns: {}
};
