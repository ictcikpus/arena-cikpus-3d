import * as THREE from 'three';
import { Client } from 'colyseus.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import './style.css';

// Arena Cikpus 3D — browser MOBA prototype with solo modes, audio, VFX and Colyseus networking.

const $ = (id) => document.getElementById(id);
const root = $('game-root');
const ui = {
  timer: $('timer'), hpBar: $('hp-bar'), hpText: $('hp-text'), manaBar: $('mana-bar'), manaText: $('mana-text'),
  toast: $('toast'), objective: $('objective-text'), objectiveSub: $('objective-sub'), target: $('target-banner'),
  targetLabel: $('target-label'), targetDistance: $('target-distance'), blueScore: $('blue-score'), redScore: $('red-score'),
  level: $('level'), xp: $('xp-label'), xpBar: $('xp-bar'), minimap: $('minimap'),
  cameraZoom: $('camera-zoom'), zoomLabel: $('zoom-label'), follow: $('camera-follow'), pauseOverlay: $('pause-overlay'),
  networkLabel: $('network-label'), networkIndicator: $('network-indicator'), gameModeLabel: $('game-mode-label'), playerSubtitle: $('player-subtitle')
};

const scene = new THREE.Scene();
scene.background = new THREE.Color('#a6c4c8');
scene.fog = new THREE.FogExp2('#a6c4c8', 0.0048);
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 650);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.domElement.classList.add('scene-canvas');
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.55));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.98;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.info.autoReset = true;
renderer.domElement.setAttribute('aria-label', 'Arena permainan 3D. Gunakan WASD untuk bergerak dan drag untuk memutar kamera.');
root.prepend(renderer.domElement);
const composer = new EffectComposer(renderer);
composer.setPixelRatio(renderer.getPixelRatio());
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.24, 0.46, 0.86));
composer.addPass(new OutputPass());

// Daylight sky dome and physically-based lighting. A local procedural sky keeps the
// scene self-contained (no external HDR files required on GitHub Pages).
const sky = new Sky();
sky.scale.setScalar(480);
scene.add(sky);
const skyUniforms = sky.material.uniforms;
skyUniforms.turbidity.value = 7.5;
skyUniforms.rayleigh.value = 2.2;
skyUniforms.mieCoefficient.value = 0.0045;
skyUniforms.mieDirectionalG.value = 0.82;
skyUniforms.sunPosition.value.set(-0.6, 0.72, 0.36).normalize();
const pmremGenerator = new THREE.PMREMGenerator(renderer);
const environmentScene = new THREE.Scene();
environmentScene.add(sky.clone());
scene.environment = pmremGenerator.fromScene(environmentScene, 0.04, 0.1, 600).texture;
environmentScene.clear();
pmremGenerator.dispose();

function makeCanvasTexture(kind, size = 512) {
  const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rand = (() => { let seed = kind === 'grass' ? 173 : kind === 'stone' ? 271 : kind === 'bark' ? 431 : 619; return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; })();
  if (kind === 'grass') {
    ctx.fillStyle = '#4b7043'; ctx.fillRect(0, 0, size, size);
    const palette = ['#345a38','#41663a','#60824b','#739251','#2f5838','#527747','#8aa05b'];
    for (let i = 0; i < 7800; i++) { const x=rand()*size, y=rand()*size; ctx.globalAlpha=0.12+rand()*0.22; ctx.strokeStyle=palette[Math.floor(rand()*palette.length)]; ctx.lineWidth=0.7+rand()*1.8; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+(rand()-.5)*4,y-1-rand()*7); ctx.stroke(); }
    for (let i = 0; i < 1700; i++) { ctx.globalAlpha=0.08+rand()*0.12; ctx.fillStyle=rand()>.5?'#d6cf8b':'#1e392b'; ctx.fillRect(rand()*size,rand()*size,1+rand()*2,1+rand()*2); }
  } else if (kind === 'stone') {
    ctx.fillStyle = '#555951'; ctx.fillRect(0,0,size,size);
    const colors=['#928e7b','#a6a18b','#77796e','#b6ad96','#686c62','#9b9988','#838276'];
    const tw=64, th=48;
    for(let row=0;row<Math.ceil(size/th);row++) for(let col=0;col<Math.ceil(size/tw);col++) {
      const x=col*tw+(row%2)*tw*.5, y=row*th; const pad=3+rand()*3;
      ctx.fillStyle='#454941'; ctx.fillRect(x+pad-2,y+pad-2,tw-pad*1.3,th-pad*1.2);
      ctx.fillStyle=colors[Math.floor(rand()*colors.length)]; ctx.beginPath();
      const j=rand()*8; ctx.moveTo(x+pad+j,y+pad); ctx.lineTo(x+tw-pad,y+pad+rand()*5); ctx.lineTo(x+tw-pad-rand()*7,y+th-pad); ctx.lineTo(x+pad+rand()*5,y+th-pad-rand()*5); ctx.closePath(); ctx.fill();
      ctx.globalAlpha=.18; ctx.strokeStyle='#eee4c9'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x+pad+5,y+pad+5); ctx.lineTo(x+tw*.4,y+pad+4); ctx.stroke(); ctx.globalAlpha=1;
    }
    for(let i=0;i<7500;i++){ctx.globalAlpha=rand()*.16;ctx.fillStyle=rand()>.5?'#e7e1d0':'#202923';ctx.fillRect(rand()*size,rand()*size,1+rand()*2,1+rand()*2);}
  } else if (kind === 'bark') {
    ctx.fillStyle='#513b2c';ctx.fillRect(0,0,size,size);
    for(let i=0;i<400;i++){let x=rand()*size,w=1+rand()*9;ctx.globalAlpha=.13+rand()*.24;ctx.strokeStyle=rand()>.5?'#c49a66':'#201d18';ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x,0);ctx.bezierCurveTo(x+(rand()-.5)*18,size*.3,x+(rand()-.5)*12,size*.65,x+(rand()-.5)*10,size);ctx.stroke();}
    for(let i=0;i<500;i++){ctx.globalAlpha=.14;ctx.fillStyle='#d0a16a';ctx.fillRect(rand()*size,rand()*size,2+rand()*4,1+rand()*14);}
  } else if (kind === 'rock') {
    ctx.fillStyle='#727a73';ctx.fillRect(0,0,size,size);
    const stones=['#4b5550','#59635c','#858b80','#9b9d8e','#656e69','#bec0ad','#7c8077'];
    for(let i=0;i<3400;i++){ctx.globalAlpha=.08+rand()*.28;ctx.fillStyle=stones[Math.floor(rand()*stones.length)];ctx.beginPath();ctx.ellipse(rand()*size,rand()*size,2+rand()*24,1+rand()*12,rand()*Math.PI,0,Math.PI*2);ctx.fill();}
    for(let i=0;i<240;i++){ctx.globalAlpha=.18;ctx.strokeStyle=rand()>.5?'#343d39':'#d2d0bc';ctx.lineWidth=.5+rand()*2;let x=rand()*size,y=rand()*size;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(rand()-.5)*28,y+(rand()-.5)*34);ctx.lineTo(x+(rand()-.5)*45,y+(rand()-.5)*50);ctx.stroke();}
  } else {
    ctx.fillStyle='#174e68';ctx.fillRect(0,0,size,size);
    for(let i=0;i<190;i++){ctx.globalAlpha=.15+rand()*.28;ctx.strokeStyle=rand()>.5?'#6ad2d0':'#0c344e';ctx.lineWidth=.5+rand()*2;ctx.beginPath();let x=rand()*size,y=rand()*size;ctx.moveTo(x,y);ctx.bezierCurveTo(x+30,y-8,x+50,y+10,x+85,y+rand()*8);ctx.stroke();}
    for(let i=0;i<100;i++){ctx.globalAlpha=.1;ctx.fillStyle='#a8f6ec';ctx.beginPath();ctx.ellipse(rand()*size,rand()*size,8+rand()*25,1+rand()*3,rand(),0,Math.PI*2);ctx.fill();}
  }
  ctx.globalAlpha=1;
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS=THREE.RepeatWrapping; tex.wrapT=THREE.RepeatWrapping; tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy()); tex.needsUpdate=true;
  return tex;
}
const grassTexture = makeCanvasTexture('grass'); grassTexture.repeat.set(12,12);
const cobbleTexture = makeCanvasTexture('stone');
const rockTexture = makeCanvasTexture('rock');
const barkTexture = makeCanvasTexture('bark'); barkTexture.repeat.set(1,2.5);
const waterTexture = makeCanvasTexture('water'); waterTexture.repeat.set(8,1.3);
const laneTextureMain = cobbleTexture.clone(); laneTextureMain.repeat.set(2.2,25); laneTextureMain.needsUpdate=true;
const laneTextureSide = cobbleTexture.clone(); laneTextureSide.repeat.set(1.7,24); laneTextureSide.needsUpdate=true;

scene.add(new THREE.HemisphereLight(0xe4f5ff, 0x46523a, 1.65));
const sun = new THREE.DirectionalLight(0xffedcf, 3.25);
sun.position.set(-24, 42, 22);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -42; sun.shadow.camera.right = 42; sun.shadow.camera.top = 42; sun.shadow.camera.bottom = -42;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 110; sun.shadow.radius = 3.5;
sun.shadow.bias = -0.00018; sun.shadow.normalBias = 0.025;
scene.add(sun);
const fillLight = new THREE.PointLight(0x79d8ff, 17, 30, 2);
fillLight.position.set(-12, 7, 4); scene.add(fillLight);
const redLight = new THREE.PointLight(0xff766d, 16, 30, 2);
redLight.position.set(12, 6, -12); scene.add(redLight);

function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0.035, flatShading: false, ...extra });
}
const texturedStoneMain = mat('#ffffff', { map: laneTextureMain, bumpMap: laneTextureMain, bumpScale: 0.075, roughness: 0.94 });
const texturedStoneSide = mat('#ffffff', { map: laneTextureSide, bumpMap: laneTextureSide, bumpScale: 0.065, roughness: 0.95 });
const groundMaterial = mat('#ffffff', { map: grassTexture, bumpMap: grassTexture, bumpScale: 0.065, roughness: 1 });
const M = {
  grass: mat('#456c48'), grassLight: mat('#5e8552'), grassDark: mat('#294e3e'), ground: groundMaterial,
  lane: texturedStoneSide, laneLight: texturedStoneMain, laneEdge: mat('#454d43'),
  river: new THREE.MeshPhysicalMaterial({ color:'#67c4d4', map:waterTexture, bumpMap:waterTexture, bumpScale:0.13, roughness:0.16, metalness:0.22, clearcoat:0.78, clearcoatRoughness:0.13, envMapIntensity:1.1 }),
  waterLight: mat('#b1fcff', { emissive: '#3cb1d0', emissiveIntensity: 0.3, roughness: 0.18 }),
  rock: mat('#777f79', { map: rockTexture, bumpMap: rockTexture, bumpScale: 0.12, roughness: 0.94 }), rockLight: mat('#aaa995', { map: rockTexture, bumpMap: rockTexture, bumpScale: 0.07, roughness: 0.88 }), wood: mat('#765337', { map: barkTexture, bumpMap: barkTexture, bumpScale: 0.11, roughness: 0.94 }),
  leaf1: mat('#2f7040', { roughness: 0.89 }), leaf2: mat('#4e8848', { roughness: 0.84 }), leaf3: mat('#244f33', { roughness: 0.92 }),
  blue: mat('#2188e9', { color: '#2188e9', metalness: 0.42, roughness: 0.38, emissive: '#073c7e', emissiveIntensity: 0.22 }), blueDark: mat('#143853', { metalness: 0.28, roughness: 0.43 }), blueLight: mat('#7eeaff', { emissive: '#33bfe8', emissiveIntensity: 0.75, metalness: 0.18, roughness: 0.25 }),
  red: mat('#df475b', { metalness: 0.36, roughness: 0.4, emissive: '#7d142c', emissiveIntensity: 0.22 }), redDark: mat('#582331', { metalness: 0.27, roughness: 0.47 }), redLight: mat('#ff9a82', { emissive: '#ec443c', emissiveIntensity: 0.72, roughness: 0.25 }),
  gold: mat('#ffd36f', { metalness: 0.75, roughness: 0.28, emissive: '#9d6619', emissiveIntensity: 0.28 }), skin: mat('#d9a47c', { roughness: 0.68 }), armor: mat('#d9e4e8', { metalness: 0.72, roughness: 0.27 }), dark: mat('#142736', { roughness: 0.7 }), white: mat('#f2fbff', { roughness: 0.32 }), purple: mat('#a080ff', { metalness: 0.2, roughness: 0.25, emissive: '#5338cc', emissiveIntensity: 0.6 })
};
const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
// Fine magical dust motes make the arena feel active without loading external particle assets.
const ambientMoteCount = 150;
const ambientMoteBase = new Float32Array(ambientMoteCount * 3);
const ambientMotePositions = new Float32Array(ambientMoteCount * 3);
const ambientMoteColors = new Float32Array(ambientMoteCount * 3);
for (let i = 0; i < ambientMoteCount; i++) {
  const p = i * 3;
  ambientMoteBase[p] = (Math.random() - 0.5) * 68;
  ambientMoteBase[p + 1] = 0.3 + Math.random() * 4.2;
  ambientMoteBase[p + 2] = (Math.random() - 0.5) * 68;
  ambientMotePositions[p] = ambientMoteBase[p]; ambientMotePositions[p + 1] = ambientMoteBase[p + 1]; ambientMotePositions[p + 2] = ambientMoteBase[p + 2];
  const color = new THREE.Color(i % 7 === 0 ? '#d8b9ff' : i % 4 === 0 ? '#ffe3a0' : '#89e9ff');
  ambientMoteColors[p] = color.r; ambientMoteColors[p + 1] = color.g; ambientMoteColors[p + 2] = color.b;
}
const ambientMoteGeometry = new THREE.BufferGeometry();
ambientMoteGeometry.setAttribute('position', new THREE.BufferAttribute(ambientMotePositions, 3));
ambientMoteGeometry.setAttribute('color', new THREE.BufferAttribute(ambientMoteColors, 3));
const ambientMotes = new THREE.Points(ambientMoteGeometry, new THREE.PointsMaterial({ size: 0.105, vertexColors: true, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
ambientMotes.frustumCulled = false; scene.add(ambientMotes);
function addMesh(parent, geometry, material, position, rotation = null, cast = true, receive = true) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  if (rotation) mesh.rotation.set(rotation.x || 0, rotation.y || 0, rotation.z || 0);
  mesh.castShadow = cast; mesh.receiveShadow = receive; parent.add(mesh); return mesh;
}
function box(parent, x, y, z, w, h, d, material, rotY = 0, cast = true) {
  return addMesh(parent, new THREE.BoxGeometry(w, h, d), material, v3(x, y + h / 2, z), { y: rotY }, cast, true);
}
function cylinder(parent, x, y, z, rTop, rBottom, h, material, sides = 8) {
  return addMesh(parent, new THREE.CylinderGeometry(rTop, rBottom, h, sides), material, v3(x, y + h / 2, z));
}
function sphere(parent, x, y, z, radius, material, detail = 1) {
  const g = detail === 2 ? new THREE.IcosahedronGeometry(radius, 1) : new THREE.IcosahedronGeometry(radius, 0);
  return addMesh(parent, g, material, v3(x, y, z));
}
function pathRect(x, z, w, d, material = M.lane) {
  box(scene, x, 0.045, z, w, 0.10, d, M.laneEdge, 0, false);
  box(scene, x, 0.10, z, w - 0.35, 0.10, d - 0.35, material, 0, false);
}

// Ground, lanes, river and crossing bridges.
const ground = addMesh(scene, new THREE.PlaneGeometry(74, 74, 56, 56), M.ground, v3(0, -0.06, 0), { x: -Math.PI / 2 }, false, true);
ground.rotation.x = -Math.PI / 2;
for (let x = -33; x <= 33; x += 6) {
  for (let z = -33; z <= 33; z += 6) {
    if (Math.abs(x) < 3.8 || Math.abs(x - 14) < 2.8 || Math.abs(x + 14) < 2.8) continue;
    if (Math.abs(z) < 2.5) continue;
    const patch = addMesh(scene, new THREE.PlaneGeometry(5.7, 5.7), (Math.abs((x * 7 + z * 3) % 4) < 1.1) ? M.grassLight : M.grassDark, v3(x, 0.005, z), { x: -Math.PI / 2 }, false, false);
    patch.material = patch.material.clone(); patch.material.transparent = true; patch.material.opacity = 0.25;
  }
}
// River runs across the map; stone lane crossings keep all lanes walkable.
box(scene, 0, 0.0, 0, 69, 0.12, 4.9, M.river, 0, false);
box(scene, 0, 0.035, -2.58, 69, 0.17, 0.34, M.rock, 0, false);
box(scene, 0, 0.035, 2.58, 69, 0.17, 0.34, M.rock, 0, false);
for (let x = -32; x <= 32; x += 5) {
  const ripple = box(scene, x, 0.10, 0, 2.1, 0.025, 0.035, M.waterLight, 0, false);
  ripple.userData.ripple = true;
}
// Main and side lanes connect both bases.
pathRect(0, 0, 7.1, 67, M.laneLight);
pathRect(-14, 0, 5.1, 67, M.lane);
pathRect(14, 0, 5.1, 67, M.lane);
// Lane markings and bridge stone seams.
for (const x of [-14, 0, 14]) {
  for (const z of [-1.45, -0.75, 0, 0.75, 1.45]) {
    box(scene, x, 0.21, z, x === 0 ? 4.9 : 3.1, 0.025, 0.055, M.rockLight, 0, false);
  }
  for (const z of [-27, -21, -15, -9, -3, 3, 9, 15, 21, 27]) {
    box(scene, x, 0.215, z, x === 0 ? 5.8 : 3.8, 0.015, 0.06, M.rock, 0, false);
  }
}
// Side branches connect lanes and jungle paths.
for (const z of [-22, -11, 11, 22]) {
  pathRect(0, z, 33, 3.0, M.lane);
  for (const x of [-20, -15, -10, -5, 0, 5, 10, 15, 20]) box(scene, x, 0.205, z, 0.055, 0.016, 2.1, M.rock, 0, false);
}
// Decorative stones along the riverside and near the jungle edges.
for (let x = -32; x <= 32; x += 4) {
  if (Math.abs(x) < 3 || Math.abs(Math.abs(x) - 14) < 3) continue;
  sphere(scene, x, 0.18, 3.0 + Math.sin(x) * 0.25, 0.48 + Math.abs(Math.sin(x * 1.7)) * 0.3, M.rock);
  sphere(scene, x + 1.2, 0.14, -3.1 + Math.cos(x * 0.7) * 0.2, 0.38 + Math.abs(Math.cos(x)) * 0.26, M.rockLight);
}

const foliageGeometry = new THREE.SphereGeometry(0.82, 12, 10);
function makeTree(x, z, scale = 1, variant = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(scale); scene.add(g);
  // Tapered trunk, root buttresses and short branches create a less geometric silhouette.
  cylinder(g, 0, 0, 0, 0.13, 0.27, 2.2, M.wood, 10);
  for (let r=0; r<4; r++) {
    const a = r * Math.PI * 0.5 + variant * 0.37;
    const root = addMesh(g, new THREE.CylinderGeometry(0.025, 0.13, 0.78, 6), M.wood, v3(Math.cos(a)*0.31,0.24,Math.sin(a)*0.31));
    root.rotation.z = Math.cos(a) * 0.62; root.rotation.x = Math.sin(a) * 0.62;
  }
  const limb = (a, y, length) => {
    const direction = v3(Math.cos(a)*length*0.72, length*0.58, Math.sin(a)*length*0.72);
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.095,length,7), M.wood);
    branch.position.set(Math.cos(a)*0.16, y, Math.sin(a)*0.16).addScaledVector(direction,0.5);
    branch.quaternion.setFromUnitVectors(v3(0,1,0), direction.clone().normalize());
    branch.castShadow=true; branch.receiveShadow=true; g.add(branch);
  };
  for (let i=0; i<4; i++) limb(i*Math.PI/2 + variant*0.4, 1.2 + (i%2)*0.28, 1.15);
  const crownMaterials = [M.leaf1,M.leaf2,M.leaf3];
  const broadleaf = variant !== 2;
  const clusters = broadleaf ? [
    [-0.60,2.25,0.00,0.92,0.88,0.83], [0.52,2.42,0.16,0.95,0.93,0.90],
    [0.02,2.82,-0.30,0.92,0.98,0.88], [-0.08,2.25,0.66,0.78,0.75,0.77],
    [0.18,2.70,0.55,0.72,0.80,0.78], [-0.35,2.92,0.28,0.73,0.77,0.75],
    [0.42,2.18,-0.46,0.78,0.73,0.80]
  ] : [
    [0,2.05,0,0.80,0.82,0.80], [0,2.55,0,0.69,0.72,0.69],
    [0,3.0,0,0.58,0.65,0.58], [0,3.38,0,0.43,0.48,0.43]
  ];
  clusters.forEach((c,i)=>{
    const crown = new THREE.Mesh(foliageGeometry, crownMaterials[(i+variant)%crownMaterials.length]);
    crown.position.set(c[0],c[1],c[2]); crown.scale.set(c[3],c[4],c[5]);
    crown.rotation.y=(i*1.7+variant)*0.33; crown.castShadow=true; crown.receiveShadow=true; g.add(crown);
  });
  if (variant === 1) {
    // A few airy leaf sprays diversify the tropical canopy.
    for (let i=0;i<5;i++) {
      const a=i*Math.PI*2/5, frond=new THREE.Mesh(new THREE.ConeGeometry(0.24,1.8,6),M.leaf2);
      frond.position.set(Math.cos(a)*0.64,2.85,Math.sin(a)*0.64); frond.rotation.z=Math.cos(a)*0.85; frond.rotation.x=Math.sin(a)*0.85; frond.rotation.y=a;
      frond.castShadow=true; g.add(frond);
    }
  }
  g.userData.swayPhase = x * 0.31 + z * 0.19;
  return g;
}
function makeBush(x, z, scale = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(scale); scene.add(g);
  g.userData.swayPhase = x * 0.23 + z * 0.37;
  const blobs=[[-0.42,0.32,0,0.58],[0.08,0.43,-0.08,0.65],[0.48,0.29,0.16,0.5],[-0.05,0.52,0.33,0.47],[0.26,0.34,-0.34,0.46]];
  blobs.forEach((b,i)=>{const leaf=new THREE.Mesh(foliageGeometry,[M.leaf1,M.leaf2,M.leaf3][i%3]);leaf.position.set(b[0],b[1],b[2]);leaf.scale.set(b[3],b[3]*0.75,b[3]*0.92);leaf.castShadow=true;leaf.receiveShadow=true;g.add(leaf);});
  return g;
}
function makeRock(x, z, scale = 1) {
  const mesh = addMesh(scene, new THREE.DodecahedronGeometry(0.7, 1), Math.random() > 0.5 ? M.rock : M.rockLight, v3(x, 0.34 * scale, z));
  mesh.scale.set(scale * (0.9 + Math.random() * 0.4), scale * (0.65 + Math.random() * 0.6), scale);
  mesh.rotation.set(Math.random(), Math.random() * 2, Math.random()); return mesh;
}
// Forest boundaries and clustered jungle pockets.
for (let z = -31; z <= 31; z += 5) {
  makeTree(-31 + Math.sin(z) * 1.5, z, 0.9 + (Math.abs(z) % 3) * 0.09, Math.abs(z) % 3);
  makeTree(31 + Math.cos(z * 0.6) * 1.2, z + 1.5, 0.9 + (Math.abs(z + 1) % 3) * 0.1, (Math.abs(z) + 1) % 3);
  if (Math.abs(z) > 5 && Math.abs(z) < 28) {
    makeTree(-21 + Math.sin(z * 0.2) * 1.9, z, 0.6 + (Math.abs(z) % 3) * 0.1, 1);
    makeTree(21 + Math.cos(z * 0.2) * 1.8, z - 2, 0.7 + (Math.abs(z) % 3) * 0.09, 2);
  }
}
for (const z of [-25, -18, -8, 8, 18, 25]) {
  makeBush(-8.5, z, 0.8); makeBush(8.5, z + 2, 0.75); makeBush(-19, z + 1, 0.85); makeBush(19, z - 1, 0.85);
  makeRock(-10.5, z - 1.5, 0.75); makeRock(10.5, z + 1.1, 0.8);
}

// Dense but inexpensive instanced grass tufts add parallax near lane edges without
// thousands of individual draw calls. Clear the lanes, bridges and river for readability.
function addGroundGrass(count = 1200) {
  const positions = [-0.018,0,0, -0.075,0.24,0, 0.02,0,0, 0,0,-0.018, 0.008,0.29,-0.07, 0,0,0.02, -0.018,0,0.018, 0.01,0.34,-0.01, 0.02,0,-0.018];
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
  geom.setIndex([0,1,2,3,4,5,6,7,8]); geom.computeVertexNormals();
  const bladeMat = new THREE.MeshStandardMaterial({ color:'#ffffff', vertexColors:true, side:THREE.DoubleSide, roughness:1, metalness:0, emissive:'#07170a', emissiveIntensity:0.04 });
  const blades = new THREE.InstancedMesh(geom, bladeMat, count);
  const dummy = new THREE.Object3D(), color = new THREE.Color(); let placed=0, attempts=0;
  while(placed<count && attempts<count*5) {
    attempts++;
    const x=-31+Math.random()*62, z=-31+Math.random()*62;
    const onLane = Math.abs(x)<4.0 || Math.abs(Math.abs(x)-14)<3.0 || [-22,-11,11,22].some(v=>Math.abs(z-v)<2.1) || Math.abs(z)<3.3;
    const nearBase = Math.abs(z)>27.5 && Math.abs(x)<5.5;
    if(onLane || nearBase) continue;
    dummy.position.set(x,0.02,z); dummy.rotation.y=Math.random()*Math.PI*2;
    const h=0.45+Math.random()*0.55; dummy.scale.setScalar(0.55+Math.random()*0.6); dummy.scale.y*=h; dummy.updateMatrix(); blades.setMatrixAt(placed,dummy.matrix);
    const hue=0.25+Math.random()*0.045; color.setHSL(hue,0.38+Math.random()*0.24,0.24+Math.random()*0.2); blades.setColorAt(placed,color); placed++;
  }
  blades.count=placed; blades.castShadow=false; blades.receiveShadow=true; scene.add(blades);
}
addGroundGrass();
// Tall crystals add readable landmarks and color to each side of the river.
function crystal(x, z, colorMat, scale = 1) {
  const group = new THREE.Group(); group.position.set(x, 0, z); group.scale.setScalar(scale); scene.add(group);
  const c = addMesh(group, new THREE.OctahedronGeometry(0.72, 0), colorMat, v3(0, 1.0, 0)); c.scale.set(0.78, 1.55, 0.78); c.rotation.z = 0.12;
  const base = addMesh(group, new THREE.DodecahedronGeometry(0.85, 0), M.rock, v3(0, 0.28, 0)); base.scale.set(1.2, 0.42, 1.2);
  const light = new THREE.PointLight(colorMat === M.redLight ? 0xff425f : 0x47dfff, 7, 7, 2); light.position.set(0, 1.3, 0); group.add(light);
  return group;
}
crystal(-5.4, 5.2, M.blueLight, 0.85); crystal(5.4, -5.2, M.redLight, 0.85);
crystal(-22, 4, M.purple, 0.7); crystal(22, -5, M.redLight, 0.65);

function makeTower(x, z, team, size = 1) {
  const blue = team === 'blue', primary = blue ? M.blue : M.red, dark = blue ? M.blueDark : M.redDark, glow = blue ? M.blueLight : M.redLight;
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(size); scene.add(g);
  cylinder(g, 0, 0, 0, 1.0, 1.28, 0.55, M.rock, 8);
  cylinder(g, 0, 0.52, 0, 0.76, 0.95, 1.15, primary, 7);
  const shoulder = addMesh(g, new THREE.CylinderGeometry(0.68, 0.88, 0.38, 6), dark, v3(0, 1.32, 0));
  shoulder.rotation.y = Math.PI / 6;
  addMesh(g, new THREE.ConeGeometry(0.8, 0.82, 6), dark, v3(0, 1.91, 0));
  const core = addMesh(g, new THREE.OctahedronGeometry(0.33, 0), glow, v3(0, 1.65, 0)); core.scale.y = 1.35;
  const ring = addMesh(g, new THREE.TorusGeometry(1.05, 0.045, 6, 24), glow, v3(0, 0.16, 0), { x: Math.PI / 2 }, false, false);
  ring.userData.spin = true;
  const light = new THREE.PointLight(blue ? 0x3ba9ff : 0xff526d, 4.2, 7, 2); light.position.set(0, 1.8, 0); g.add(light);
  g.userData.team = team; g.userData.hp = 1800; return g;
}
function makeBase(z, team) {
  const blue = team === 'blue', primary = blue ? M.blue : M.red, dark = blue ? M.blueDark : M.redDark, glow = blue ? M.blueLight : M.redLight;
  const g = new THREE.Group(); g.position.set(0, 0, z); scene.add(g);
  cylinder(g, 0, 0, 0, 4.2, 4.8, 0.65, M.rock, 8);
  const platform = addMesh(g, new THREE.CylinderGeometry(3.65, 4.0, 0.4, 8), primary, v3(0, 0.55, 0));
  platform.rotation.y = Math.PI / 8;
  box(g, -2.4, 0.72, 0, 0.9, 1.0, 2.2, dark, 0.2); box(g, 2.4, 0.72, 0, 0.9, 1.0, 2.2, dark, -0.2);
  const core = addMesh(g, new THREE.OctahedronGeometry(1.25, 0), glow, v3(0, 2.2, 0)); core.scale.y = 1.2;
  const ring = addMesh(g, new THREE.TorusGeometry(2.0, 0.08, 8, 30), glow, v3(0, 1.35, 0), { x: Math.PI / 2 }, false, false); ring.userData.spin = true;
  const light = new THREE.PointLight(blue ? 0x3ec8ff : 0xff415e, 12, 18, 2); light.position.set(0, 2.2, 0); g.add(light);
  return g;
}
const blueBase = makeBase(30, 'blue');
const redBase = makeBase(-30, 'red');
const towers = [];
for (const x of [-14, 0, 14]) {
  towers.push(makeTower(x, 21, 'blue', x === 0 ? 1.03 : 0.86));
  towers.push(makeTower(x, 11, 'blue', x === 0 ? 1.0 : 0.82));
  towers.push(makeTower(x, -21, 'red', x === 0 ? 1.03 : 0.86));
  towers.push(makeTower(x, -11, 'red', x === 0 ? 1.0 : 0.82));
}

function makeSword(parent, color = M.blueLight) {
  const sword = new THREE.Group(); sword.position.set(0.56, 1.0, 0.02); sword.rotation.z = -0.28; parent.add(sword);
  box(sword, 0, 0.3, 0, 0.12, 0.62, 0.12, color, 0, true);
  const blade = addMesh(sword, new THREE.ConeGeometry(0.1, 0.55, 4), M.white, v3(0, 0.88, 0)); blade.rotation.y = Math.PI / 4;
  box(sword, 0, 0.03, 0, 0.42, 0.09, 0.15, M.gold, 0, true);
  cylinder(sword, 0, -0.32, 0, 0.08, 0.09, 0.32, M.dark, 6);
  return sword;
}
function createHealthSprite(team) {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 48;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#07121ddd'; ctx.beginPath(); ctx.roundRect(3, 3, 250, 42, 10); ctx.fill();
  ctx.strokeStyle = team === 'blue' ? '#75dfff' : '#ff8391'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = team === 'blue' ? '#1f9cf0' : '#ed4358'; ctx.fillRect(10, 10, 236, 27);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(team === 'blue' ? 'ALLY' : 'ENEMY', 128, 30);
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sprite.scale.set(2.5, 0.48, 1); return { sprite, canvas, ctx, tex, team };
}
function updateHealthSprite(record, current, maximum) {
  const { ctx, canvas, tex, team } = record;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#07121ddd'; ctx.beginPath(); ctx.roundRect(3, 3, 250, 42, 10); ctx.fill();
  ctx.strokeStyle = team === 'blue' ? '#75dfff' : '#ff8391'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = team === 'blue' ? '#1f9cf0' : '#ed4358'; ctx.fillRect(10, 10, 236 * Math.max(0, current / maximum), 27);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`${Math.max(0, Math.ceil(current))} HP`, 128, 30); tex.needsUpdate = true;
}
function makeHero(team = 'blue', isPlayer = false) {
  const blue = team === 'blue', primary = blue ? M.blue : M.red, dark = blue ? M.blueDark : M.redDark, glow = blue ? M.blueLight : M.redLight;
  const g = new THREE.Group();
  const shadow = addMesh(g, new THREE.CircleGeometry(0.8, 18), mat('#07121f', { transparent: true, opacity: 0.38, depthWrite: false }), v3(0, 0.06, 0), { x: -Math.PI / 2 }, false, false); shadow.scale.set(1.05, 0.72, 1);
  const capeGeo = new THREE.ConeGeometry(0.56, 1.45, 5); const cape = addMesh(g, capeGeo, dark, v3(0, 1.0, -0.34)); cape.rotation.x = Math.PI / 2.35; cape.rotation.z = Math.PI;
  const body = addMesh(g, new THREE.CapsuleGeometry(0.36, 0.62, 3, 7), primary, v3(0, 0.97, 0));
  const chest = addMesh(g, new THREE.BoxGeometry(0.57, 0.47, 0.31), blue ? M.armor : dark, v3(0, 1.12, 0.11)); chest.rotation.z = -0.04;
  // Layered pauldrons, breastplate inlay, belt and leg guards give the heroes a more crafted silhouette.
  const shoulderL = addMesh(g,new THREE.SphereGeometry(0.255,14,12),blue?M.armor:primary,v3(-0.39,1.35,0.02)); shoulderL.scale.set(1.18,0.78,1.02);
  const shoulderR = addMesh(g,new THREE.SphereGeometry(0.255,14,12),blue?M.armor:primary,v3(0.39,1.35,0.02)); shoulderR.scale.set(1.18,0.78,1.02);
  box(g,0,1.12,0.28,0.25,0.34,0.035,glow,0,true);
  box(g,0,0.70,0.15,0.55,0.12,0.34,M.gold,0,true);
  sphere(g,-0.34,1.24,0.05,0.22,dark); sphere(g,0.34,1.24,0.05,0.22,dark);
  // Arms and gloves.
  const leftArm = addMesh(g, new THREE.CapsuleGeometry(0.105, 0.4, 2, 5), primary, v3(-0.42, 0.95, 0.07)); leftArm.rotation.z = -0.3;
  const rightArm = addMesh(g, new THREE.CapsuleGeometry(0.105, 0.4, 2, 5), primary, v3(0.43, 0.99, 0.1)); rightArm.rotation.z = 0.18;
  // Boots and glowing leg plates.
  const leftLeg = addMesh(g, new THREE.CapsuleGeometry(0.13, 0.28, 2, 5), dark, v3(-0.19, 0.36, 0));
  const rightLeg = addMesh(g, new THREE.CapsuleGeometry(0.13, 0.28, 2, 5), dark, v3(0.19, 0.36, 0));
  sphere(g, -0.19, 0.18, 0.1, 0.17, blue ? M.blueLight : M.redLight); sphere(g, 0.19, 0.18, 0.1, 0.17, blue ? M.blueLight : M.redLight);
  const head = addMesh(g, new THREE.SphereGeometry(0.27, 20, 16), M.skin, v3(0, 1.77, 0.03));
  sphere(g,-0.095,1.79,0.265,0.035,M.dark); sphere(g,0.095,1.79,0.265,0.035,M.dark);
  sphere(g,0,1.70,0.285,0.045,M.skin);
  const helmCap = addMesh(g,new THREE.SphereGeometry(0.295,16,10,0,Math.PI*2,0,Math.PI*0.55),blue?M.armor:dark,v3(0,1.91,-0.015));
  const helm = addMesh(g, new THREE.ConeGeometry(0.28, 0.37, 6), dark, v3(0, 2.11, -0.10)); helm.rotation.y = 0.22;
  box(g, 0, 1.84, 0.25, 0.39, 0.10, 0.09, glow, 0, false);
  const crest=addMesh(g,new THREE.BoxGeometry(0.06,0.25,0.06),M.gold,v3(0,2.21,-0.035)); crest.rotation.z=0.16;
  const sword = makeSword(g, glow);
  const ring = addMesh(g, new THREE.TorusGeometry(0.72, 0.045, 6, 24), glow, v3(0, 0.11, 0), { x: Math.PI / 2 }, false, false); ring.userData.spin = true;
  const health = createHealthSprite(team); health.sprite.position.set(0, 2.75, 0); g.add(health.sprite);
  g.position.set(0, 0, 0); scene.add(g);
  g.userData = { team, isPlayer, hp: isPlayer ? 1000 : 650, maxHp: isPlayer ? 1000 : 650, mana: 300, maxMana: 300, sword, ring, health, leftLeg, rightLeg, leftArm, rightArm, body, chest, walkTime: 0, alive: true, lastDamage: 0, respawnAt: 0 };
  updateHealthSprite(health, g.userData.hp, g.userData.maxHp);
  return g;
}
const hero = makeHero('blue', true); hero.position.set(0, 0, 25);
const enemy = makeHero('red', false); enemy.position.set(1.3, 0, -19); enemy.userData.hp = 650; updateHealthSprite(enemy.userData.health, enemy.userData.hp, enemy.userData.maxHp);

function makeMinion(team, laneX, z) {
  const blue = team === 'blue'; const g = new THREE.Group();
  const primary = blue ? M.blue : M.red, dark = blue ? M.blueDark : M.redDark, glow = blue ? M.blueLight : M.redLight;
  const body = addMesh(g, new THREE.CapsuleGeometry(0.25, 0.28, 2, 5), primary, v3(0, 0.52, 0));
  sphere(g, 0, 0.94, 0.05, 0.22, M.skin);
  addMesh(g, new THREE.ConeGeometry(0.26, 0.32, 5), dark, v3(0, 1.12, -0.04));
  box(g, 0.29, 0.37, 0.02, 0.09, 0.54, 0.08, glow, -0.22, true);
  const ring = addMesh(g, new THREE.TorusGeometry(0.36, 0.028, 4, 14), glow, v3(0, 0.07, 0), { x: Math.PI / 2 }, false, false);
  g.position.set(laneX, 0, z); scene.add(g);
  g.userData = { team, laneX, hp: 160, maxHp: 160, lastHit: 0, alive: true, ring, speed: 1.65 + Math.random() * 0.25 };
  return g;
}
const minions = [];
for (const laneX of [-14, 0, 14]) {
  for (let i = 0; i < 3; i++) {
    minions.push(makeMinion('blue', laneX, 24 + i * 1.45));
    minions.push(makeMinion('red', laneX, -24 - i * 1.45));
  }
}

const state = { hp: 1000, maxHp: 1000, mana: 300, maxMana: 300, speed: 8.5, xp: 35, level: 1, blueScore: 0, redScore: 0, lastAttack: 0, attackCooldown: 0.58, paused: true, startAt: performance.now(), elapsed: 0, mode: 'practice', online: false, cameraShake: 0 };
const keys = new Set();
const effects = [];
const cooldowns = { q: 0, e: 0, r: 0 };
let lastFrame = performance.now();
let cameraYaw = 0.18, cameraDistance = 22, cameraPitch = THREE.MathUtils.degToRad(52), followCamera = true;
let cameraFocus = hero.position.clone();
let mouseLook = null, activeTouch = null, joystick = { x: 0, y: 0 }, joystickOrigin = { x: 0, y: 0 };
let toastTimer = null;
const network = { client: null, room: null, localPlayer: null, remotePlayers: new Map(), lastSend: 0, roomId: '', bound: new Set() };
let selectedHeroClass = 'guardian';
let audioEngine = null;
// Audio defaults on for a first visit; the splash-screen toggle can disable it. Persisted user preference wins.
let audioEnabled = localStorage.getItem('arena-audio-enabled') === null ? true : localStorage.getItem('arena-audio-enabled') === 'true';

class ArenaAudio {
  constructor() {
    this.ctx = null; this.master = null; this.music = null; this.sfx = null;
    this.musicVolume = Number(localStorage.getItem('arena-music-volume') ?? 0.24);
    this.sfxVolume = Number(localStorage.getItem('arena-sfx-volume') ?? 0.72);
    this.musicTimer = null; this.noteIndex = 0; this.enabled = false;
  }
  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    this.ctx = new AudioContextClass();
    this.master = this.ctx.createGain(); this.music = this.ctx.createGain(); this.sfx = this.ctx.createGain();
    this.music.gain.value = this.musicVolume; this.sfx.gain.value = this.sfxVolume; this.master.gain.value = 0.88;
    this.music.connect(this.master); this.sfx.connect(this.master); this.master.connect(this.ctx.destination);
  }
  async setEnabled(enabled) {
    this.enabled = Boolean(enabled); audioEnabled = this.enabled;
    localStorage.setItem('arena-audio-enabled', String(this.enabled));
    this.syncButtons();
    if (!this.enabled) { if (this.musicTimer) clearInterval(this.musicTimer); this.musicTimer = null; if (this.master && this.ctx) this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.035); return; }
    this.init();
    if (!this.ctx) { showToast('Browser ini tidak mendukung Web Audio.'); return; }
    await this.ctx.resume(); this.master.gain.setTargetAtTime(0.88, this.ctx.currentTime, 0.08); this.startMusic(); this.play('ui');
  }
  syncButtons() {
    const label = $('sound-toggle-label'); const button = $('sound-toggle'); const gameButton = $('sound-game-btn'); const splashButton = $('splash-audio-toggle');
    if (label) label.textContent = this.enabled ? 'AUDIO ON' : 'AUDIO OFF';
    if (button) { button.classList.toggle('enabled', this.enabled); button.setAttribute('aria-pressed', String(this.enabled)); }
    if (gameButton) { gameButton.classList.toggle('enabled', this.enabled); gameButton.textContent = this.enabled ? '♫' : '♩'; }
    if (splashButton) { splashButton.classList.toggle('enabled', this.enabled); splashButton.setAttribute('aria-pressed', String(this.enabled)); const text = splashButton.querySelector('span'); if (text) text.textContent = this.enabled ? 'AUDIO ON' : 'AUDIO OFF'; }
  }
  setVolume(kind, value) {
    const v = Math.max(0, Math.min(1, Number(value) / 100));
    if (kind === 'music') { this.musicVolume = v; localStorage.setItem('arena-music-volume', String(v)); if (this.music && this.ctx) this.music.gain.setTargetAtTime(v, this.ctx.currentTime, 0.04); }
    else { this.sfxVolume = v; localStorage.setItem('arena-sfx-volume', String(v)); if (this.sfx && this.ctx) this.sfx.gain.setTargetAtTime(v, this.ctx.currentTime, 0.04); }
  }
  tone(freq, endFreq, duration, type = 'sine', volume = 0.12, delay = 0, destination = 'sfx') {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime + delay; const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(Math.max(1, freq), t); osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t + duration);
    gain.gain.setValueAtTime(0.0001, t); gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), t + 0.015); gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain); gain.connect(destination === 'music' ? this.music : this.sfx); osc.start(t); osc.stop(t + duration + 0.03);
  }
  noise(duration = 0.16, volume = 0.08, lowpass = 1800) {
    if (!this.enabled || !this.ctx) return;
    const length = Math.max(1, Math.floor(this.ctx.sampleRate * duration)); const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate); const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = this.ctx.createBufferSource(); source.buffer = buffer; const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = lowpass;
    const gain = this.ctx.createGain(); gain.gain.value = volume; source.connect(filter); filter.connect(gain); gain.connect(this.sfx); source.start();
  }
  play(name) {
    if (!this.enabled || !this.ctx) return;
    const notes = (frequencies, duration = 0.18, wave = 'sine', volume = 0.095, spacing = 0.055) => frequencies.forEach((f, i) => this.tone(f, f * (i % 2 ? 0.94 : 1.04), duration, wave, volume, i * spacing));
    if (name === 'ui') { this.tone(480, 680, 0.075, 'sine', 0.045); this.tone(740, 910, 0.065, 'triangle', 0.025, 0.035); }
    if (name === 'menu') { notes([293.66, 440, 587.33], 0.24, 'sine', 0.035, 0.08); this.tone(146.83, 196, 0.42, 'triangle', 0.025); }
    if (name === 'start') { this.tone(82, 164, 0.65, 'sine', 0.08); notes([196, 261.63, 392, 523.25, 659.25], 0.34, 'triangle', 0.06, 0.085); this.noise(0.28, 0.022, 3200); }
    if (name === 'attack') { this.tone(420, 95, 0.16, 'sawtooth', 0.10); this.tone(880, 220, 0.095, 'triangle', 0.045, 0.015); this.noise(0.14, 0.07, 3100); }
    if (name === 'dash') { this.tone(960, 145, 0.27, 'triangle', 0.14); this.tone(340, 90, 0.19, 'sine', 0.05, 0.035); this.noise(0.26, 0.065, 4700); }
    if (name === 'blast') { this.tone(150, 42, 0.42, 'sawtooth', 0.16); this.tone(380, 75, 0.33, 'triangle', 0.10, 0.02); this.tone(880, 180, 0.18, 'sine', 0.04, 0.04); this.noise(0.3, 0.10, 1750); }
    if (name === 'heal') { notes([392, 523.25, 659.25, 783.99, 1046.5], 0.36, 'sine', 0.075, 0.08); this.tone(196, 392, 0.55, 'triangle', 0.035); }
    if (name === 'hit') { this.tone(230, 72, 0.14, 'square', 0.075); this.tone(670, 220, 0.09, 'triangle', 0.04, 0.012); this.noise(0.12, 0.07, 1250); }
    if (name === 'level') { notes([392, 523.25, 659.25, 783.99, 1046.5], 0.42, 'triangle', 0.085, 0.07); this.noise(0.12, 0.018, 5500); }
    if (name === 'kill') { this.tone(260, 70, 0.25, 'sawtooth', 0.11); this.tone(660, 990, 0.22, 'triangle', 0.075, 0.1); this.tone(130, 65, 0.36, 'sine', 0.065, 0.015); this.noise(0.18, 0.04, 1900); }
    if (name === 'error') { this.tone(310, 220, 0.16, 'square', 0.045); this.tone(260, 190, 0.18, 'square', 0.035, 0.13); }
  }
  startMusic() {
    if (!this.enabled || this.musicTimer || !this.ctx) return;
    // Small procedural fantasy-moba motif: warm pad, occasional harmony and a soft low pulse.
    const scale = [146.83, 174.61, 220, 261.63, 196, 220, 164.81, 196];
    const harmony = [220, 261.63, 329.63, 392, 293.66, 329.63, 246.94, 293.66];
    this.musicTimer = setInterval(() => {
      if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
      const index = this.noteIndex % scale.length; const freq = scale[index]; this.noteIndex++;
      this.tone(freq, freq * 1.003, 0.72, 'sine', 0.022, 0, 'music');
      this.tone(harmony[index], harmony[index] * 1.002, 0.84, 'triangle', 0.009, 0.045, 'music');
      if (this.noteIndex % 2 === 0) this.tone(freq * 2, freq * 2.002, 0.22, 'sine', 0.006, 0.12, 'music');
      if (this.noteIndex % 4 === 0) { this.tone(freq / 2, freq / 2, 0.92, 'triangle', 0.026, 0, 'music'); this.tone(60, 45, 0.16, 'sine', 0.012, 0, 'music'); }
    }, 610);
  }
}
audioEngine = new ArenaAudio();
audioEngine.enabled = audioEnabled;
audioEngine.syncButtons();

function showToast(message) {
  ui.toast.textContent = message; ui.toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 1600);
}
function updatePlayerHud() {
  ui.hpBar.style.width = `${Math.max(0, state.hp / state.maxHp * 100)}%`;
  ui.hpText.textContent = `${Math.ceil(state.hp)} / ${state.maxHp}`;
  ui.manaBar.style.width = `${Math.max(0, state.mana / state.maxMana * 100)}%`;
  ui.manaText.textContent = `${Math.ceil(state.mana)} / ${state.maxMana}`;
  ui.level.textContent = String(state.level);
  ui.xp.textContent = `${state.xp} / 100 XP`;
  ui.xpBar.style.width = `${state.xp}%`;
  ui.blueScore.textContent = String(state.blueScore).padStart(2, '0');
  ui.redScore.textContent = String(state.redScore).padStart(2, '0');
}
function awardXP(amount) {
  state.xp += amount;
  while (state.xp >= 100) { state.xp -= 100; state.level += 1; state.maxHp += 80; state.hp = Math.min(state.maxHp, state.hp + 180); audioEngine?.play('level'); addImpactBurst(hero.position, '#f7d77f', 20); showToast(`LEVEL UP! Sekarang level ${state.level}`); }
  updatePlayerHud();
}
function addRingEffect(position, color, maxScale = 3.2, duration = 0.42, tube = 0.075) {
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, tube, 7, 32), material);
  ring.rotation.x = Math.PI / 2; ring.position.copy(position); ring.position.y = 0.18; scene.add(ring);
  effects.push({ type: 'ring', object: ring, elapsed: 0, duration, maxScale });
}
function addSigilEffect(position, color = '#b6a0ff', radius = 2.4, duration = 0.82) {
  const group = new THREE.Group(); group.position.set(position.x, 0.105, position.z); scene.add(group);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
  const outer = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.035, 6, 64), material); outer.rotation.x = Math.PI / 2; group.add(outer);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.69, 0.025, 5, 48), material); inner.rotation.x = Math.PI / 2; group.add(inner);
  const core = new THREE.Mesh(new THREE.RingGeometry(radius * 0.28, radius * 0.32, 40), material); core.rotation.x = -Math.PI / 2; core.position.y = 0.012; group.add(core);
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.025, 0.045), material);
    tick.position.set(Math.cos(angle) * radius * 0.84, 0.015, Math.sin(angle) * radius * 0.84); tick.rotation.y = -angle; group.add(tick);
  }
  effects.push({ type: 'sigil', object: group, elapsed: 0, duration, maxScale: 1.12 });
}
function addMotionTrail(from, to, color = '#80ecff') {
  const start = from.clone(); start.y += 0.9; const end = to.clone(); end.y += 0.9;
  const mid = start.clone().lerp(end, 0.5); mid.y += 0.45;
  const geometry = new THREE.BufferGeometry().setFromPoints([start, mid, end]);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const line = new THREE.Line(geometry, material); scene.add(line);
  effects.push({ type: 'trail', object: line, elapsed: 0, duration: 0.34, maxScale: 1 });
}
function kickCameraShake(strength = 0.08) { state.cameraShake = Math.max(state.cameraShake, Math.min(0.24, strength)); }

function addImpactBurst(position, color = '#79eaff', count = 16) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3); const velocities = [];
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 0.3; positions[i * 3 + 1] = Math.random() * 0.45; positions[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    const angle = Math.random() * Math.PI * 2, speed = 1.4 + Math.random() * 4.0;
    velocities.push(new THREE.Vector3(Math.cos(angle) * speed, 1.2 + Math.random() * 3.1, Math.sin(angle) * speed));
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color, size: 0.17, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
  const points = new THREE.Points(geometry, material); points.position.copy(position); points.position.y += 0.55; scene.add(points);
  effects.push({ type: 'particles', object: points, elapsed: 0, duration: 0.52, velocities, positions });
}
function triggerScreenFlash(kind = 'skill') {
  const element = $('fx-overlay'); if (!element) return;
  element.className = `fx-overlay ${kind}`;
  clearTimeout(element._resetTimer);
  element._resetTimer = setTimeout(() => { element.className = 'fx-overlay'; }, 360);
}
function addSlashEffect(position, rotation, color = '#83f3ff') {
  const group = new THREE.Group(); group.position.copy(position); group.position.y = 1.15; group.rotation.y = rotation; scene.add(group);
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.77, 0.11, 6, 18, Math.PI * 1.12), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false }));
  arc.rotation.set(0.2, 0, -0.65); arc.position.z = 0.35; group.add(arc);
  const glint = new THREE.Mesh(new THREE.SphereGeometry(0.15, 7, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' })); glint.position.set(0.7, 0.1, 0.55); group.add(glint);
  effects.push({ type: 'slash', object: group, elapsed: 0, duration: 0.26, maxScale: 1.3 });
}
function addProjectile(from, to, color = '#6beaff', damage = 140) {
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.23, 1), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.98 }));
  mesh.position.copy(from); mesh.position.y = 1.35; scene.add(mesh);
  const light = new THREE.PointLight(color, 2.2, 4, 2); mesh.add(light);
  effects.push({ type: 'projectile', object: mesh, from: mesh.position.clone(), to: to.clone().add(v3(0, 1.3, 0)), elapsed: 0, duration: 0.28, damage });
}
function removeEffect(index) {
  const effect = effects[index]; scene.remove(effect.object);
  effect.object.traverse?.(obj => { if (obj.geometry) obj.geometry.dispose(); if (obj.material && !Array.isArray(obj.material)) obj.material.dispose(); });
  effects.splice(index, 1);
}
function nearestEnemy(maxRange = 7) {
  let nearest = null, distance = maxRange;
  const candidates = [enemy, ...minions.filter(m => m.userData.team === 'red' && m.userData.alive), ...Array.from(network.remotePlayers.values()).map(p => p.model).filter(Boolean)];
  for (const target of candidates) {
    if (!target.userData.alive || target.visible === false) continue;
    const d = hero.position.distanceTo(target.position);
    if (d < distance) { distance = d; nearest = target; }
  }
  return nearest ? { target: nearest, distance } : null;
}
function damageUnit(target, amount, source = 'hero') {
  if (!target?.userData?.alive) return;
  const data = target.userData;
  const beforeHp = data.hp;
  data.hp = Math.max(0, data.hp - amount);
  if (data.hp < beforeHp) { audioEngine?.play('hit'); addImpactBurst(target.position, data.team === 'red' ? '#ff697f' : '#73ebff', 16); addRingEffect(target.position, data.team === 'red' ? '#ff8196' : '#83f3ff', 1.45, 0.28, 0.055); kickCameraShake(target === enemy ? 0.035 : 0.055); }
  if (data.health) updateHealthSprite(data.health, data.hp, data.maxHp);
  if (data.hp <= 0) {
    audioEngine?.play('kill');
    data.alive = false; target.visible = false;
    addRingEffect(target.position, data.team === 'red' ? '#ff6b86' : '#67dfff', 2.5, 0.5);
    if (target === enemy) {
      state.blueScore += 1; updatePlayerHud(); awardXP(30); showToast('Lawan tumbang! +30 XP');
      data.respawnAt = performance.now() + 2300;
    } else if (data.team === 'red' && source === 'hero') {
      awardXP(8); showToast('Minion lawan dikalahkan · +8 XP');
    }
  }
}
function basicAttack() {
  const now = performance.now();
  if (state.paused || now - state.lastAttack < state.attackCooldown * 1000) return;
  state.lastAttack = now;
  audioEngine?.play('attack');
  kickCameraShake(0.045); triggerScreenFlash('attack-flash');
  hero.userData.sword.rotation.x = -0.72;
  setTimeout(() => { if (hero.userData.sword) hero.userData.sword.rotation.x = 0; }, 170);
  addSlashEffect(hero.position, hero.rotation.y);
  const found = nearestEnemy(5.8);
  if (state.mode === 'online' && network.room) { network.room.send('attack'); triggerScreenFlash('attack-flash'); showToast('Serangan dikirim ke server pertandingan'); return; }
  if (found) {
    damageUnit(found.target, found.target === enemy ? 105 : 90);
    addImpactBurst(found.target.position, '#91f3ff', 23); addSigilEffect(found.target.position, '#72eaff', 1.05, 0.34);
    addProjectile(hero.position.clone().add(v3(0, 1.0, 0)), found.target.position, '#8befff', 90);
    showToast(found.target === enemy ? 'Serangan mengenai hero lawan · -105 HP' : 'Minion lawan terkena serangan');
  } else {
    showToast('Serangan dilepaskan — dekati lawan untuk menghasilkan damage');
  }
}
function useSkill(which) {
  if (state.paused) return;
  const now = performance.now();
  if (cooldowns[which] > now) { showToast('Skill masih dalam cooldown'); return; }
  if (which !== 'q') {
    const cost = which === 'e' ? 65 : 50;
    if (state.mana < cost) { showToast('Mana tidak cukup untuk menggunakan skill'); return; }
    state.mana -= cost;
  }
  const cd = { q: 4800, e: 7200, r: 11500 }[which];
  cooldowns[which] = now + cd;
  if (which === 'q') {
    const dashStart = hero.position.clone();
    const dir = v3(Math.sin(hero.rotation.y), 0, Math.cos(hero.rotation.y));
    hero.position.addScaledVector(dir, 4.1);
    hero.position.x = THREE.MathUtils.clamp(hero.position.x, -30, 30); hero.position.z = THREE.MathUtils.clamp(hero.position.z, -31, 31);
    addMotionTrail(dashStart, hero.position, '#8df2ff'); addRingEffect(hero.position, '#61eaff', 3.0, 0.4, 0.09); addSlashEffect(hero.position, hero.rotation.y, '#d8faff'); addImpactBurst(hero.position, '#8aeaff', 25); addSigilEffect(hero.position, '#61eaff', 1.6, 0.44); kickCameraShake(0.07);
    audioEngine?.play('dash'); triggerScreenFlash('dash-flash'); showToast('DASH! Bergerak cepat ke arah hadap');
  } else if (which === 'e') {
    addSigilEffect(hero.position, '#b6a0ff', 3.0, 0.9); addRingEffect(hero.position, '#b6a0ff', 4.8, 0.58, 0.1); addImpactBurst(hero.position, '#b7a5ff', 42); kickCameraShake(0.16);
    audioEngine?.play('blast'); triggerScreenFlash('skill-flash');
    if (state.mode !== 'online') {
      const targets = [enemy, ...minions.filter(m => m.userData.team === 'red' && m.userData.alive)].filter(t => t.userData.alive && hero.position.distanceTo(t.position) < 7.5);
      for (const target of targets) damageUnit(target, target === enemy ? 180 : 120);
      showToast(targets.length ? `ARCANE BURST mengenai ${targets.length} target` : 'ARCANE BURST! Efek sihir dilepaskan');
    } else { network.room?.send('skill', { key: 'e', rotation: hero.rotation.y }); showToast('ARCANE BURST! Server memproses area serangan'); }
  } else if (which === 'r') {
    state.hp = Math.min(state.maxHp, state.hp + 260); addRingEffect(hero.position, '#8effba', 4.4, 0.65, 0.12); addImpactBurst(hero.position, '#94ffc0', 23);
    audioEngine?.play('heal'); triggerScreenFlash('heal-flash'); addSigilEffect(hero.position, '#8effba', 2.35, 0.82); kickCameraShake(0.035); showToast('PEMULIHAN · +260 HP');
    if (state.mode === 'online') network.room?.send('skill', { key: 'r', rotation: hero.rotation.y });
  }
  if (state.mode === 'online' && which === 'q') network.room?.send('skill', { key: 'q', rotation: hero.rotation.y });
  if (state.mode === 'online' && which === 'e' && state.mana < 0) state.mana = 0;
  updatePlayerHud();
}


const HERO_ARCHETYPES = {
  guardian: { name: 'Guardian', role: 'WARRIOR', subtitle: 'Penjaga Gerbang', hp: 1200, mana: 300, speed: 8.5, cooldown: 0.58, primary: '#247fdb', accent: '#d4e8ee', glow: '#79eaff', description: 'Petarung garis depan dengan HP kuat dan damage konsisten.' },
  arcanist: { name: 'Arcanist', role: 'MAGE', subtitle: 'Pengendali Arcana', hp: 850, mana: 480, speed: 8.0, cooldown: 0.7, primary: '#7148d9', accent: '#d2bcff', glow: '#c0a5ff', description: 'Ahli sihir dengan mana besar dan serangan skill yang kuat, tetapi lebih rapuh.' },
  ranger: { name: 'Ranger', role: 'SCOUT', subtitle: 'Pemburu Bayangan', hp: 950, mana: 340, speed: 10.0, cooldown: 0.43, primary: '#188f79', accent: '#a7dfc7', glow: '#7fffd1', description: 'Hero lincah untuk berpindah posisi dan melakukan serangan cepat.' }
};

function applyHeroArchetype(model, heroKey) {
  const archetype = HERO_ARCHETYPES[heroKey] || HERO_ARCHETYPES.guardian;
  const body = model.userData.body, chest = model.userData.chest;
  if (body?.material) { body.material = body.material.clone(); body.material.color.set(archetype.primary); body.material.emissive?.set(archetype.primary); body.material.emissiveIntensity = 0.18; }
  if (chest?.material) { chest.material = chest.material.clone(); chest.material.color.set(archetype.accent); }
  for (const limb of [model.userData.leftArm, model.userData.rightArm]) if (limb?.material) { limb.material = limb.material.clone(); limb.material.color.set(archetype.primary); }
  if (model.userData.ring?.material) { model.userData.ring.material = model.userData.ring.material.clone(); model.userData.ring.material.color.set(archetype.glow); model.userData.ring.material.emissive?.set(archetype.glow); }
  model.userData.heroClass = heroKey;
}

function chooseHero(heroKey) {
  if (!HERO_ARCHETYPES[heroKey]) return;
  selectedHeroClass = heroKey;
  document.querySelectorAll('.hero-pick').forEach(card => {
    const active = card.dataset.hero === heroKey;
    card.classList.toggle('active', active); card.setAttribute('aria-pressed', String(active));
  });
  $('hero-description').textContent = HERO_ARCHETYPES[heroKey].description;
  audioEngine?.play('ui');
}

function applyHeroSelection() {
  const archetype = HERO_ARCHETYPES[selectedHeroClass] || HERO_ARCHETYPES.guardian;
  applyHeroArchetype(hero, selectedHeroClass);
  state.maxHp = archetype.hp; state.hp = archetype.hp; state.maxMana = archetype.mana; state.mana = archetype.mana;
  state.speed = archetype.speed; state.attackCooldown = archetype.cooldown;
  $('portrait').innerHTML = `<span>${selectedHeroClass === 'guardian' ? '⚔' : selectedHeroClass === 'arcanist' ? '✧' : '➶'}</span><i>${state.level}</i>`;
  ui.playerSubtitle.textContent = `${archetype.subtitle} · Tim ${hero.userData.team === 'red' ? 'Merah' : 'Biru'}`;
  const playerName = document.querySelector('.player-name');
  if (playerName) playerName.innerHTML = `${archetype.name} <span class="role-pill">${archetype.role}</span>`;
  updatePlayerHud();
}

function setTeamForHero(model, team) {
  model.userData.team = team;
  const isRed = team === 'red';
  if (model.userData.ring?.material) { model.userData.ring.material = model.userData.ring.material.clone(); model.userData.ring.material.color.set(isRed ? '#ff8e9f' : '#7eeaff'); model.userData.ring.material.emissive?.set(isRed ? '#ff3656' : '#33bfe8'); }
  const ring = model.userData.ring;
  if (ring) ring.material.needsUpdate = true;
}

function startGame(mode = 'practice') {
  audioEngine?.play('start'); triggerScreenFlash('start-flash');
  state.mode = mode;
  state.online = mode === 'online'; state.paused = false; state.startAt = performance.now(); state.elapsed = 0;
  $('main-menu').classList.add('hidden'); $('multiplayer-modal').classList.remove('show'); $('multiplayer-modal').setAttribute('aria-hidden', 'true');
  ui.pauseOverlay.classList.remove('show'); $('pause-btn').textContent = 'Ⅱ';
  if (mode !== 'online') {
    hero.position.set(0, 0, 25); enemy.position.set(1.3, 0, -19); enemy.userData.alive = true; enemy.userData.hp = enemy.userData.maxHp; enemy.visible = true;
    state.blueScore = mode === 'brawl' ? 0 : 0; state.redScore = 0;
  } else {
    enemy.visible = false; enemy.userData.alive = false;
  }
  ui.gameModeLabel.textContent = mode === 'online' ? 'ONLINE MATCH' : mode === 'brawl' ? 'BRAWL VS AI' : 'SOLO PRACTICE';
  ui.networkLabel.textContent = mode === 'online' ? 'ONLINE' : 'LOCAL';
  ui.networkIndicator.classList.toggle('is-online', mode === 'online');
  ui.objective.textContent = mode === 'brawl' ? 'Bertahan dari serangan AI' : mode === 'online' ? 'Kalahkan tim lawan' : 'Hancurkan markas lawan';
  ui.objectiveSub.textContent = mode === 'online' ? 'Gerakan dan combat disinkronkan melalui room' : mode === 'brawl' ? 'Bot mengejar hero secara agresif' : 'Kalahkan penjaga dan maju bersama minion';
  if (mode !== 'online') { network.roomId = ''; $('network-room-chip').hidden = true; }
  updatePlayerHud();
}

function setLobbyStatus(message, kind = '') {
  const status = $('lobby-status'); status.textContent = message; status.className = `lobby-status ${kind}`;
}
function openMultiplayerModal(kind = 'quick') {
  $('multiplayer-modal').classList.add('show'); $('multiplayer-modal').setAttribute('aria-hidden', 'false');
  const lastServer = localStorage.getItem('arena-server-url') || '';
  const lastName = localStorage.getItem('arena-player-name') || 'CikpusHero';
  $('server-url').value = lastServer; $('player-name').value = lastName;
  setLobbyStatus('Masukkan URL backend Colyseus yang sudah online. GitHub Pages bukan server game.');
  $('room-code-box').hidden = true;
  $('server-url').focus();
  audioEngine?.play('ui');
}
function closeMultiplayerModal() {
  $('multiplayer-modal').classList.remove('show'); $('multiplayer-modal').setAttribute('aria-hidden', 'true');
  audioEngine?.play('ui');
}
function normalizeServerUrl(raw) {
  let value = String(raw || '').trim();
  if (!value) return '';
  if (!/^[a-z]+:\/\//i.test(value)) value = `https://${value}`;
  if (value.startsWith('wss://')) value = `https://${value.slice(6)}`;
  if (value.startsWith('ws://')) value = `http://${value.slice(5)}`;
  if (location.protocol === 'https:' && value.startsWith('http://')) value = `https://${value.slice(7)}`;
  return value.replace(/\/$/, '');
}

function bindNetworkPlayer(player, sessionId) {
  if (!network.room || network.bound.has(sessionId)) return;
  network.bound.add(sessionId);
  if (sessionId === network.room.sessionId) {
    network.localPlayer = player;
    hero.position.set(player.x, 0, player.z);
    setTeamForHero(hero, player.team);
    state.maxHp = player.maxHp; state.hp = player.hp; state.maxMana = player.maxMana; state.mana = player.mana;
    if (player.heroClass && player.heroClass !== selectedHeroClass) applyHeroArchetype(hero, player.heroClass);
    ui.playerSubtitle.textContent = `${HERO_ARCHETYPES[player.heroClass]?.subtitle || 'Petarung'} · Tim ${player.team === 'blue' ? 'Biru' : 'Merah'}`;
    player.onChange(() => {
      state.hp = player.hp; state.maxHp = player.maxHp; state.mana = player.mana; state.maxMana = player.maxMana;
      const dx = hero.position.x - player.x, dz = hero.position.z - player.z;
      if (Math.hypot(dx, dz) > 2.0) hero.position.set(player.x, 0, player.z);
      updatePlayerHud();
    });
  } else {
    const model = makeHero(player.team, false);
    applyHeroArchetype(model, player.heroClass || 'guardian');
    setTeamForHero(model, player.team);
    model.position.set(player.x, 0, player.z); model.userData.hp = player.hp; model.userData.maxHp = player.maxHp; model.userData.alive = player.hp > 0;
    model.userData.name = player.name; model.visible = player.hp > 0;
    updateHealthSprite(model.userData.health, player.hp, player.maxHp);
    const entry = { model, targetPosition: v3(player.x, 0, player.z), state: player, team: player.team, name: player.name };
    network.remotePlayers.set(sessionId, entry);
    player.onChange(() => {
      entry.targetPosition.set(player.x, 0, player.z);
      entry.team = player.team; entry.name = player.name;
      model.userData.hp = player.hp; model.userData.maxHp = player.maxHp; model.userData.alive = player.hp > 0;
      model.visible = player.hp > 0;
      updateHealthSprite(model.userData.health, player.hp, player.maxHp);
    });
  }
}

function installNetworkHandlers(room) {
  room.state.players.onAdd((player, sessionId) => bindNetworkPlayer(player, sessionId));
  room.state.players.onRemove((player, sessionId) => {
    const entry = network.remotePlayers.get(sessionId);
    if (entry) { scene.remove(entry.model); entry.model.traverse(obj => { if (obj.geometry) obj.geometry.dispose(); }); network.remotePlayers.delete(sessionId); }
    network.bound.delete(sessionId);
  });
  for (const [sessionId, player] of room.state.players) bindNetworkPlayer(player, sessionId);
  room.onStateChange(serverState => {
    state.blueScore = serverState.blueScore || 0; state.redScore = serverState.redScore || 0; updatePlayerHud();
  });
  room.onMessage('combat', message => {
    if (message.type === 'hit') {
      if (message.targetSessionId === room.sessionId) { audioEngine?.play('hit'); triggerScreenFlash('attack-flash'); showToast(`Kamu terkena serangan ${message.attacker} · -${message.damage} HP`); }
      else if (message.attacker === ($('player-name').value || 'CikpusHero')) showToast(`Serangan mengenai ${message.target} · -${message.damage} HP`);
    } else if (message.type === 'kill') {
      audioEngine?.play('kill'); triggerScreenFlash('skill-flash'); showToast(message.targetSessionId === room.sessionId ? 'Kamu tumbang — respawn segera' : `${message.target} tumbang oleh ${message.attacker}`);
      state.blueScore = message.score?.blue ?? state.blueScore; state.redScore = message.score?.red ?? state.redScore; updatePlayerHud();
    } else if (message.type === 'skill') {
      if (message.attacker !== ($('player-name').value || 'CikpusHero')) addImpactBurst(v3(message.x || hero.position.x, 0, message.z || hero.position.z), message.key === 'e' ? '#bba6ff' : message.key === 'r' ? '#94ffc0' : '#70eaff', 22);
    } else if (message.type === 'miss') {
      if (message.attacker === ($('player-name').value || 'CikpusHero')) showToast('Tidak ada hero lawan dalam jangkauan');
    } else if (message.type === 'no-mana') showToast('Mana tidak cukup');
    else if (message.type === 'cooldown') showToast('Skill masih dalam cooldown server');
  });
  room.onMessage('system', event => { if (event.type === 'join') showToast(`${event.name} bergabung · ${event.count}/10 pemain`); });
  room.onLeave((code) => {
    if (network.room !== room) return;
    network.room = null; network.localPlayer = null; state.online = false;
    ui.networkLabel.textContent = 'OFFLINE'; ui.networkIndicator.classList.remove('is-online');
    if (state.mode === 'online') { showToast(`Koneksi pertandingan terputus (${code}). Kembali ke menu untuk menyambung lagi.`); }
  });
  room.onError((code, message) => setLobbyStatus(`Server error ${code}: ${message}`, 'error'));
}

async function connectMultiplayer(kind = 'quick') {
  const rawUrl = $('server-url').value;
  const serverUrl = normalizeServerUrl(rawUrl);
  const playerName = String($('player-name').value || 'CikpusHero').trim().slice(0, 20) || 'CikpusHero';
  const roomCode = String($('room-code').value || '').trim();
  if (!serverUrl || serverUrl.includes('example')) { setLobbyStatus('URL server belum diisi. Deploy apps/server ke layanan Node.js/WebSocket lalu masukkan URL HTTPS-nya.', 'error'); return; }
  if (location.protocol === 'https:' && !serverUrl.startsWith('https://')) { setLobbyStatus('Halaman game HTTPS membutuhkan server HTTPS/WSS agar browser tidak memblokir koneksi.', 'error'); return; }
  localStorage.setItem('arena-server-url', serverUrl); localStorage.setItem('arena-player-name', playerName);
  setLobbyStatus('Menghubungkan ke server dan mencari room...', 'connecting');
  for (const button of [$('quick-match-btn'), $('create-room-btn'), $('join-room-btn')]) button.disabled = true;
  try {
    const client = new Client(serverUrl);
    const options = { name: playerName, heroClass: selectedHeroClass, mode: 'classic' };
    let room;
    if (kind === 'create') room = await client.create('custom-battle', { ...options, mode: 'custom', private: true });
    else if (kind === 'join') {
      if (!roomCode) throw new Error('Masukkan kode room teman terlebih dahulu.');
      room = await client.joinById(roomCode, options);
    } else room = await client.joinOrCreate('battle', options);
    applyHeroSelection();
    network.client = client; network.room = room; network.localPlayer = null; network.remotePlayers.clear(); network.bound.clear(); network.roomId = room.id;
    installNetworkHandlers(room);
    state.mode = 'online'; state.online = true;
    $('room-live-code').textContent = room.id; $('network-room-chip').hidden = false;
    setLobbyStatus(kind === 'create' ? `Room berhasil dibuat: ${room.id}` : `Terhubung ke room ${room.id}.`, 'success');
    $('room-share-code').textContent = room.id; $('room-code-box').hidden = false;
    startGame('online');
    showToast(`Terhubung ke pertandingan online · Room ${room.id}`);
    if (kind === 'create') { setTimeout(() => { if (network.room === room) showToast(`Bagikan kode room: ${room.id}`); }, 800); }
  } catch (error) {
    console.error('Multiplayer connection failed', error);
    setLobbyStatus(`Gagal terhubung: ${error?.message || 'periksa URL server, deployment, dan WebSocket'}`, 'error');
  } finally {
    for (const button of [$('quick-match-btn'), $('create-room-btn'), $('join-room-btn')]) button.disabled = false;
  }
}

// First-launch cinematic. The mode menu is visible behind this layer but inaccessible until the player continues.
const splash = $('splash-screen');
const splashParticleRoot = $('splash-particles');
if (splashParticleRoot) {
  for (let i = 0; i < 34; i++) {
    const particle = document.createElement('i');
    particle.style.left = `${(i * 37.7 + (i % 5) * 8) % 100}%`;
    particle.style.setProperty('--size', `${1.5 + (i % 4) * 0.8}px`);
    particle.style.setProperty('--duration', `${7 + (i % 7) * 1.3}s`);
    particle.style.setProperty('--delay', `${-(i % 11) * 0.83}s`);
    particle.style.setProperty('--drift', `${(i % 2 ? 1 : -1) * (18 + (i % 6) * 12)}px`);
    particle.style.setProperty('--particle-color', i % 5 === 0 ? '#d4b6ff' : i % 3 === 0 ? '#f4d79a' : '#76e7f7');
    splashParticleRoot.appendChild(particle);
  }
}
$('splash-audio-toggle').addEventListener('click', () => audioEngine.setEnabled(!audioEngine.enabled));
$('enter-main-menu').addEventListener('click', async () => {
  try { if (audioEnabled && !audioEngine.ctx) await audioEngine.setEnabled(true); } catch (error) { console.warn('Audio belum dapat diaktifkan:', error); }
  audioEngine?.play('start');
  splash?.setAttribute('aria-hidden', 'true');
  splash?.classList.add('leaving');
  window.setTimeout(() => { if (splash) splash.hidden = true; audioEngine?.play('menu'); }, 650);
});

// Main-menu interactions. The scene continues rendering behind the menu for a live arena backdrop.
document.querySelectorAll('[data-hero]').forEach(button => button.addEventListener('click', () => chooseHero(button.dataset.hero)));
document.querySelectorAll('[data-start-mode]').forEach(button => button.addEventListener('click', () => { applyHeroSelection(); audioEngine?.play('ui'); startGame(button.dataset.startMode); }));
$('play-practice').addEventListener('click', () => { applyHeroSelection(); audioEngine?.play('ui'); startGame('practice'); });
$('open-multiplayer').addEventListener('click', () => openMultiplayerModal('quick'));
document.querySelectorAll('[data-open-multiplayer]').forEach(button => button.addEventListener('click', () => openMultiplayerModal(button.dataset.openMultiplayer)));
$('close-multiplayer').addEventListener('click', closeMultiplayerModal);
$('quick-match-btn').addEventListener('click', () => connectMultiplayer('quick'));
$('create-room-btn').addEventListener('click', () => connectMultiplayer('create'));
$('join-room-btn').addEventListener('click', () => connectMultiplayer('join'));
$('sound-toggle').addEventListener('click', () => audioEngine.setEnabled(!audioEngine.enabled));
$('sound-game-btn').addEventListener('click', () => audioEngine.setEnabled(!audioEngine.enabled));
$('music-volume').addEventListener('input', e => audioEngine.setVolume('music', e.target.value));
$('sfx-volume').addEventListener('input', e => audioEngine.setVolume('sfx', e.target.value));
$('copy-room-code').addEventListener('click', async () => { if (network.roomId) { try { await navigator.clipboard.writeText(network.roomId); showToast('Kode room disalin'); } catch { showToast(`Kode room: ${network.roomId}`); } } });
$('copy-room-code-modal').addEventListener('click', async () => { const code = $('room-share-code').textContent; try { await navigator.clipboard.writeText(code); setLobbyStatus('Kode room disalin. Bagikan kepada teman.','success'); } catch { setLobbyStatus(`Salin kode room secara manual: ${code}`,'success'); } });
$('server-url').addEventListener('change', () => localStorage.setItem('arena-server-url', normalizeServerUrl($('server-url').value)));
$('player-name').addEventListener('change', () => localStorage.setItem('arena-player-name', $('player-name').value.slice(0,20)));
$('multiplayer-modal').addEventListener('click', e => { if (e.target === $('multiplayer-modal')) closeMultiplayerModal(); });
window.addEventListener('keydown', e => { if (e.key === 'Escape' && $('multiplayer-modal').classList.contains('show')) closeMultiplayerModal(); });
if (audioEnabled) window.addEventListener('pointerdown', () => { if (audioEngine && !audioEngine.ctx) audioEngine.setEnabled(true).catch(() => {}); }, { once: true });

$('attack').addEventListener('click', basicAttack);
$('skill-q').addEventListener('click', () => useSkill('q'));
$('skill-e').addEventListener('click', () => useSkill('e'));
$('skill-r').addEventListener('click', () => useSkill('r'));
$('reset-btn').addEventListener('click', () => location.reload());
function setPaused(paused) {
  state.paused = paused; ui.pauseOverlay.classList.toggle('show', paused); $('pause-btn').textContent = paused ? '▶' : 'Ⅱ';
  if (paused) { keys.clear(); joystick = { x: 0, y: 0 }; }
}
$('pause-btn').addEventListener('click', () => setPaused(!state.paused));
$('resume-btn').addEventListener('click', () => setPaused(false));
addEventListener('keydown', (e) => {
  if (!$('main-menu').classList.contains('hidden')) return;
  const k = e.key.toLowerCase();
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  if (k === 'p' || k === 'escape') { setPaused(!state.paused); return; }
  keys.add(k);
  if (e.repeat) return;
  if (k === ' ') basicAttack(); if (k === 'q') useSkill('q'); if (k === 'e') useSkill('e'); if (k === 'r') useSkill('r');
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

// Camera controls: drag the arena to rotate, mouse wheel/slider to zoom, and use the arrows to nudge the view.
function setZoom(value) {
  cameraDistance = THREE.MathUtils.clamp(Number(value), 12, 34);
  ui.cameraZoom.value = String(cameraDistance); ui.zoomLabel.textContent = `ZOOM ${cameraDistance}`;
}
ui.cameraZoom.addEventListener('input', (e) => setZoom(e.target.value));
$('rotate-left').addEventListener('click', () => { cameraYaw -= Math.PI / 8; });
$('rotate-right').addEventListener('click', () => { cameraYaw += Math.PI / 8; });
ui.follow.addEventListener('click', () => {
  followCamera = !followCamera; ui.follow.classList.toggle('active', followCamera); ui.follow.textContent = followCamera ? 'FOLLOW' : 'FREE';
  if (!followCamera) cameraFocus.copy(hero.position);
  showToast(followCamera ? 'Kamera mengikuti hero' : 'Kamera bebas — titik fokus dikunci');
});
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
renderer.domElement.addEventListener('wheel', (e) => { e.preventDefault(); setZoom(cameraDistance + (e.deltaY > 0 ? 1 : -1)); }, { passive: false });
root.addEventListener('pointerdown', (e) => {
  if (e.target !== renderer.domElement || state.paused) return;
  if (e.pointerType === 'touch') {
    if (e.clientX < window.innerWidth * 0.47) {
      activeTouch = { id: e.pointerId, mode: 'move', x: e.clientX, y: e.clientY };
      joystickOrigin = { x: e.clientX, y: e.clientY }; joystick = { x: 0, y: 0 };
    } else {
      activeTouch = { id: e.pointerId, mode: 'camera', x: e.clientX, y: e.clientY };
    }
    root.setPointerCapture?.(e.pointerId);
  } else if (e.button === 0 || e.button === 2) {
    mouseLook = { id: e.pointerId, x: e.clientX, y: e.clientY }; renderer.domElement.setPointerCapture?.(e.pointerId);
  }
});
root.addEventListener('pointermove', (e) => {
  if (activeTouch && e.pointerId === activeTouch.id) {
    if (activeTouch.mode === 'move') {
      const dx = e.clientX - activeTouch.x, dy = e.clientY - activeTouch.y;
      const len = Math.hypot(dx, dy), max = 65, s = Math.min(1, len / max);
      joystick.x = len ? dx / len * s : 0; joystick.y = len ? dy / len * s : 0;
    } else {
      const dx = e.clientX - activeTouch.x, dy = e.clientY - activeTouch.y;
      cameraYaw -= dx * 0.008;
      cameraPitch = THREE.MathUtils.clamp(cameraPitch + dy * 0.006, THREE.MathUtils.degToRad(34), THREE.MathUtils.degToRad(66));
      activeTouch.x = e.clientX; activeTouch.y = e.clientY;
    }
    return;
  }
  if (mouseLook && e.pointerId === mouseLook.id) {
    const dx = e.clientX - mouseLook.x, dy = e.clientY - mouseLook.y;
    cameraYaw -= dx * 0.006;
    cameraPitch = THREE.MathUtils.clamp(cameraPitch + dy * 0.0045, THREE.MathUtils.degToRad(34), THREE.MathUtils.degToRad(66));
    mouseLook.x = e.clientX; mouseLook.y = e.clientY;
  }
});
function clearPointer(e) {
  if (activeTouch && e.pointerId === activeTouch.id) { activeTouch = null; joystick = { x: 0, y: 0 }; }
  if (mouseLook && e.pointerId === mouseLook.id) mouseLook = null;
}
root.addEventListener('pointerup', clearPointer); root.addEventListener('pointercancel', clearPointer); root.addEventListener('lostpointercapture', clearPointer);

function updateCamera(dt) {
  // Spherical orbit camera: the camera always stays above the ground plane instead of
  // dropping to y=0 (the problem visible in the earlier deployed build).
  if (followCamera) cameraFocus.lerp(hero.position, Math.min(1, dt * 5.5));
  const horizontal = cameraDistance * Math.cos(cameraPitch);
  const height = cameraDistance * Math.sin(cameraPitch);
  const offset = v3(Math.sin(cameraYaw) * horizontal, height, Math.cos(cameraYaw) * horizontal);
  const desired = cameraFocus.clone().add(offset);
  camera.position.lerp(desired, Math.min(1, dt * 7.5));
  // Look a little forward into the lane; the forward vector follows camera rotation.
  const lookAhead = v3(-Math.sin(cameraYaw) * 2.8, 0, -Math.cos(cameraYaw) * 2.8);
  const lookAt = cameraFocus.clone().add(lookAhead).add(v3(0, 1.3, 0));
  if (state.cameraShake > 0.001) {
    const shake = state.cameraShake; const t = performance.now() * 0.067;
    camera.position.add(v3(Math.sin(t * 1.7) * shake, Math.cos(t * 2.3) * shake * 0.55, Math.sin(t * 1.2) * shake * 0.6));
    state.cameraShake *= Math.exp(-dt * 16);
  }
  camera.lookAt(lookAt);
}
function updateHeroMovement(dt) {
  let inputX = 0, inputY = 0;
  if (keys.has('a') || keys.has('arrowleft')) inputX -= 1;
  if (keys.has('d') || keys.has('arrowright')) inputX += 1;
  if (keys.has('w') || keys.has('arrowup')) inputY += 1;
  if (keys.has('s') || keys.has('arrowdown')) inputY -= 1;
  inputX += joystick.x; inputY += -joystick.y;
  const len = Math.hypot(inputX, inputY);
  if (len > 1) { inputX /= len; inputY /= len; }
  if (len > 0.08) {
    // Movement is camera-relative to keep the controls intuitive after rotating the view.
    const right = v3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));
    const forward = v3(Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
    const moveX = right.x * inputX + forward.x * inputY;
    const moveZ = right.z * inputX + forward.z * inputY;
    hero.position.x += moveX * state.speed * dt; hero.position.z += moveZ * state.speed * dt;
    hero.rotation.y = Math.atan2(moveX, moveZ);
    const data = hero.userData; data.walkTime += dt * 11;
    data.leftLeg.rotation.x = Math.sin(data.walkTime) * 0.57; data.rightLeg.rotation.x = -Math.sin(data.walkTime) * 0.57;
    data.leftArm.rotation.x = -Math.sin(data.walkTime) * 0.24; data.rightArm.rotation.x = Math.sin(data.walkTime) * 0.26;
    data.body.position.y = 0.97 + Math.abs(Math.sin(data.walkTime)) * 0.045;
    data.sword.rotation.x = Math.sin(data.walkTime) * 0.08;
  } else {
    const data = hero.userData; data.leftLeg.rotation.x *= 0.82; data.rightLeg.rotation.x *= 0.82; data.leftArm.rotation.x *= 0.82; data.rightArm.rotation.x *= 0.82; data.body.position.y += (0.97 - data.body.position.y) * Math.min(1, dt * 8);
    data.walkTime += dt * 2.2; data.body.position.y += Math.sin(data.walkTime) * 0.003;
  }
  hero.position.x = THREE.MathUtils.clamp(hero.position.x, -30, 30); hero.position.z = THREE.MathUtils.clamp(hero.position.z, -31, 31);
  if (state.mode === 'online' && network.room && len > 0.04 && performance.now() - network.lastSend > 65) { network.lastSend = performance.now(); network.room.send('move', { x: hero.position.x, z: hero.position.z, rotation: hero.rotation.y }); }
}
function updateEnemyAI(dt, now) {
  if (state.mode === 'online') { enemy.visible = false; enemy.userData.alive = false; return; }
  enemy.visible = true;
  const d = hero.position.distanceTo(enemy.position);
  if (!enemy.userData.alive) {
    if (now > enemy.userData.respawnAt) {
      enemy.userData.alive = true; enemy.userData.hp = enemy.userData.maxHp; enemy.position.set((Math.random() - 0.5) * 3, 0, -19); enemy.visible = true; updateHealthSprite(enemy.userData.health, enemy.userData.hp, enemy.userData.maxHp); showToast('Hero lawan kembali ke arena');
    }
    return;
  }
  if (d < (state.mode === 'brawl' ? 48 : 12)) {
    const direction = hero.position.clone().sub(enemy.position); direction.y = 0; direction.normalize();
    if (d > 3.2) { enemy.position.addScaledVector(direction, dt * (state.mode === 'brawl' ? 3.6 : 2.25)); enemy.rotation.y = Math.atan2(-direction.x, -direction.z); }
    else if (now - enemy.userData.lastDamage > 1400) {
      enemy.userData.lastDamage = now; state.hp = Math.max(0, state.hp - 45); updatePlayerHud(); audioEngine?.play('hit'); triggerScreenFlash('hit-flash'); kickCameraShake(0.15); addImpactBurst(hero.position, '#ff657f', 22); addRingEffect(hero.position, '#ff657f', 1.7, 0.32, 0.075); addSlashEffect(hero.position, enemy.rotation.y, '#ff7786'); showToast('Kamu terkena serangan hero lawan · -45 HP');
      if (state.hp <= 0) { state.redScore += 1; state.hp = state.maxHp; hero.position.set(0, 0, 25); updatePlayerHud(); showToast('Kamu tumbang dan kembali ke markas'); }
    }
  } else {
    enemy.position.x = 1.3 + Math.sin(state.elapsed * 0.8) * 2.2;
    enemy.position.z = -19 + Math.sin(state.elapsed * 0.48) * 1.4;
    enemy.rotation.y = Math.PI + Math.sin(state.elapsed * 0.6) * 0.25;
  }
  enemy.userData.walkTime += dt * (d < 12 ? 8 : 2);
  enemy.userData.leftLeg.rotation.x = Math.sin(enemy.userData.walkTime) * (d < 12 ? 0.4 : 0.08);
  enemy.userData.rightLeg.rotation.x = -enemy.userData.leftLeg.rotation.x;
}
function updateMinions(dt, now) {
  for (const m of minions) {
    const d = m.userData;
    if (state.mode === 'online') {
      m.position.z += (d.team === 'blue' ? -1 : 1) * d.speed * dt;
      if (Math.abs(m.position.z) > 29) m.position.z = d.team === 'blue' ? 25 : -25;
      d.ring.rotation.z += dt * 1.2;
      continue;
    }
    if (!d.alive) {
      if (!d.respawnAt) d.respawnAt = now + 6500;
      if (now > d.respawnAt) {
        d.alive = true; d.hp = d.maxHp; d.respawnAt = 0; m.visible = true;
        m.position.set(d.laneX, 0, d.team === 'blue' ? 25 + Math.random() * 2 : -25 - Math.random() * 2);
      }
      continue;
    }
    const enemies = minions.filter(other => other.userData.alive && other.userData.team !== d.team && Math.abs(other.userData.laneX - d.laneX) < 1 && m.position.distanceTo(other.position) < 2.0);
    const opposingHero = (d.team === 'blue' ? enemy : hero);
    const heroNear = opposingHero.userData.alive && m.position.distanceTo(opposingHero.position) < 2.3;
    if (enemies.length || heroNear) {
      if (now - d.lastHit > 1050) {
        d.lastHit = now;
        const target = enemies[0] || opposingHero;
        if (target === hero) { state.hp = Math.max(0, state.hp - 13); audioEngine?.play('hit'); updatePlayerHud(); if (state.hp <= 0) { state.redScore += 1; state.hp = state.maxHp; hero.position.set(0, 0, 25); updatePlayerHud(); showToast('Minion lawan menjatuhkanmu — respawn di markas'); } }
        else damageUnit(target, target === enemy ? 25 : 35, 'minion');
      }
    } else {
      m.position.z += (d.team === 'blue' ? -1 : 1) * d.speed * dt;
      m.position.x += (d.laneX - m.position.x) * dt * 1.5;
    }
    d.ring.rotation.z += dt * 1.2;
    if (Math.abs(m.position.z) > 29) { m.position.z = d.team === 'blue' ? 25 : -25; }
  }
}
function updateEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i]; e.elapsed += dt; const t = Math.min(1, e.elapsed / e.duration);
    if (e.type === 'ring') { e.object.scale.setScalar(0.45 + t * e.maxScale); e.object.material.opacity = 1 - t; }
    else if (e.type === 'particles') { const attr = e.object.geometry.attributes.position; for (let p = 0; p < e.velocities.length; p++) { const i = p * 3; e.velocities[p].y -= 7.5 * dt; e.positions[i] += e.velocities[p].x * dt; e.positions[i + 1] += e.velocities[p].y * dt; e.positions[i + 2] += e.velocities[p].z * dt; } attr.array.set(e.positions); attr.needsUpdate = true; e.object.material.opacity = 1 - t; e.object.material.size = 0.17 * (1 - t * 0.55); }
    else if (e.type === 'slash') { e.object.scale.setScalar(0.65 + t * e.maxScale); e.object.rotation.y += dt * 2; e.object.children.forEach(c => { if (c.material) c.material.opacity = 1 - t; }); }
    else if (e.type === 'projectile') {
      e.object.position.lerpVectors(e.from, e.to, t); e.object.position.y += Math.sin(t * Math.PI) * 1.2;
      e.object.rotation.x += dt * 10; e.object.rotation.y += dt * 13;
      if (t >= 0.88 && !e.impactSpawned) { e.impactSpawned = true; addImpactBurst(e.to, '#a6f5ff', 15); addRingEffect(e.to, '#8ceeff', 1.55, 0.27, 0.06); }
    }
    else if (e.type === 'sigil') { e.object.rotation.y += dt * 1.25; e.object.scale.setScalar(0.78 + Math.sin(t * Math.PI) * 0.36 + t * 0.15); e.object.traverse(obj => { if (obj.material) obj.material.opacity = 0.92 * (1 - t); }); }
    else if (e.type === 'trail') { e.object.material.opacity = 0.92 * (1 - t); e.object.scale.setScalar(1 + t * 0.2); }
    if (t >= 1) removeEffect(i);
  }
}
function updateCooldowns(now) {
  const entries = [['q', 'q-cooldown'], ['e', 'e-cooldown'], ['r', 'r-cooldown']];
  for (const [key, id] of entries) {
    const el = $(id), remain = Math.max(0, (cooldowns[key] - now) / 1000);
    el.classList.toggle('active', remain > 0); el.textContent = remain > 0 ? remain.toFixed(1) : '';
  }
}
function updateMinimap() {
  const canvas = ui.minimap, ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#173b37'; ctx.fillRect(0, 0, w, h);
  // jungle speckles
  for (let x = 0; x < w; x += 14) for (let y = 0; y < h; y += 13) { ctx.fillStyle = ((x * 7 + y * 11) % 3) ? '#214d3d' : '#2e6246'; ctx.fillRect(x + ((y * 2) % 6), y, 5, 4); }
  const px = x => (x + 36) / 72 * w, py = z => (z + 36) / 72 * h;
  ctx.strokeStyle = '#81958a'; ctx.lineWidth = 7;
  for (const x of [-14, 0, 14]) { ctx.beginPath(); ctx.moveTo(px(x), py(-34)); ctx.lineTo(px(x), py(34)); ctx.stroke(); }
  for (const z of [-22, -11, 11, 22]) { ctx.beginPath(); ctx.moveTo(px(-32), py(z)); ctx.lineTo(px(32), py(z)); ctx.stroke(); }
  ctx.strokeStyle = '#24b9cb'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(px(-34), py(0)); ctx.lineTo(px(34), py(0)); ctx.stroke();
  // map objectives and heroes
  for (const t of towers) { ctx.fillStyle = t.userData.team === 'blue' ? '#58caff' : '#ff7788'; ctx.fillRect(px(t.position.x) - 2, py(t.position.z) - 2, 4, 4); }
  ctx.fillStyle = '#4dbeff'; ctx.beginPath(); ctx.arc(px(0), py(30), 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff6878'; ctx.beginPath(); ctx.arc(px(0), py(-30), 5, 0, Math.PI * 2); ctx.fill();
  for (const m of minions) { if (!m.userData.alive) continue; ctx.fillStyle = m.userData.team === 'blue' ? '#8beaff' : '#ffadb2'; ctx.fillRect(px(m.position.x) - 1.6, py(m.position.z) - 1.6, 3.2, 3.2); }
  if (enemy.userData.alive) { ctx.fillStyle = '#ff3d62'; ctx.strokeStyle = '#fff0f1'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(px(enemy.position.x), py(enemy.position.z), 4.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  for (const entry of network.remotePlayers.values()) { const isBlue = entry.team === 'blue'; ctx.fillStyle = isBlue ? '#7edbff' : '#ff6f87'; ctx.strokeStyle = isBlue ? '#e3fbff' : '#ffe6eb'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(px(entry.model.position.x), py(entry.model.position.z), 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = hero.userData.team === 'red' ? '#ff6f87' : '#4ce0ff'; ctx.strokeStyle = '#e3fbff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(px(hero.position.x), py(hero.position.z), 4.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

function resize() {
  const w = Math.max(1, root.clientWidth), h = Math.max(1, root.clientHeight);
  camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); composer.setSize(w, h);
}
if ('ResizeObserver' in window) new ResizeObserver(resize).observe(root); else addEventListener('resize', resize);
resize(); setZoom(22); updatePlayerHud(); updateMinimap();
$('music-volume').value = String(Math.round(audioEngine.musicVolume * 100)); $('sfx-volume').value = String(Math.round(audioEngine.sfxVolume * 100));

let minimapTick = 0;
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastFrame) / 1000, 0.04); lastFrame = now;
  if (!state.paused) {
    state.elapsed = (now - state.startAt) / 1000;
    ui.timer.textContent = `${String(Math.floor(state.elapsed / 60)).padStart(2, '0')}:${String(Math.floor(state.elapsed % 60)).padStart(2, '0')}`;
    updateHeroMovement(dt); updateEnemyAI(dt, now); updateMinions(dt, now);
    for (const entry of network.remotePlayers.values()) { entry.model.position.lerp(entry.targetPosition, Math.min(1, dt * 10)); if (entry.model.userData.alive) { const movement = entry.model.position.distanceTo(entry.targetPosition); if (movement > 0.025) entry.model.rotation.y = Math.atan2(entry.targetPosition.x - entry.model.position.x, entry.targetPosition.z - entry.model.position.z); } }
    if (state.mode === 'online' && network.localPlayer) { const sx = network.localPlayer.x, sz = network.localPlayer.z; if (Math.hypot(hero.position.x - sx, hero.position.z - sz) > 2.0) hero.position.lerp(v3(sx, 0, sz), Math.min(1, dt * 6)); }
    if (state.mana < state.maxMana) { state.mana = Math.min(state.maxMana, state.mana + dt * 4.5); updatePlayerHud(); }
    updateCooldowns(now);
    const found = nearestEnemy(12);
    ui.target.style.opacity = found ? '1' : '0.42';
    ui.targetLabel.textContent = found ? (found.target === enemy ? 'HERO LAWAN TERDETEKSI' : 'MINION LAWAN TERDETEKSI') : 'CARI TARGET';
    ui.targetDistance.textContent = found ? `JARAK ${found.distance.toFixed(1)}M` : 'DI LUAR JANGKAUAN';
    if (state.hp < state.maxHp * 0.25) { ui.objective.textContent = 'HP RENDAH — PULIHKAN DIRI'; ui.objectiveSub.textContent = 'Gunakan skill R untuk memulihkan HP'; }
    else { ui.objective.textContent = 'Hancurkan markas lawan'; ui.objectiveSub.textContent = 'Kalahkan penjaga dan maju bersama minion'; }
    minimapTick += dt; if (minimapTick > 0.16) { updateMinimap(); minimapTick = 0; }
  }
  // Cosmetic effects, water flow and crystal motion continue behind the splash/menu and while paused.
  updateEffects(dt);
  if (state.paused) {
    const idle = now * 0.0018;
    if (hero?.userData?.body) hero.userData.body.position.y = 0.97 + Math.sin(idle) * 0.025;
    if (hero?.userData?.sword) hero.userData.sword.rotation.z = -0.28 + Math.sin(idle * 0.8) * 0.018;
  }
  const ambientTime = now / 1000;
  scene.traverse(obj => {
    if (obj.userData?.spin && state.paused) obj.rotation.z += dt * 0.26;
    if (Number.isFinite(obj.userData?.swayPhase) && state.paused) obj.rotation.z = Math.sin(ambientTime * 0.62 + obj.userData.swayPhase) * 0.012;
  });
  waterTexture.offset.x = (ambientTime * 0.015) % 1; waterTexture.offset.y = (ambientTime * 0.004) % 1;
  fillLight.position.x = -12 + Math.sin(ambientTime * 0.35) * 4; redLight.position.x = 12 + Math.cos(ambientTime * 0.42) * 4;
  const moteAttr = ambientMotes.geometry.attributes.position;
  for (let i = 0; i < ambientMoteCount; i++) {
    const p = i * 3;
    ambientMotePositions[p] = ambientMoteBase[p] + Math.sin(ambientTime * 0.42 + i * 1.7) * 0.2;
    ambientMotePositions[p + 1] += dt * (0.06 + (i % 5) * 0.018);
    if (ambientMotePositions[p + 1] > 5.0) ambientMotePositions[p + 1] = 0.25;
    ambientMotePositions[p + 2] = ambientMoteBase[p + 2] + Math.cos(ambientTime * 0.3 + i * 0.8) * 0.18;
  }
  moteAttr.needsUpdate = true;
  updateCamera(dt); composer.render();
}
requestAnimationFrame(animate);
