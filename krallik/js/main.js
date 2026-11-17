// =====================================================================
//  DEMİR SANCAK — ana dosya: şehir sahnesi, kamera, arayüz panelleri
// =====================================================================
import * as THREE from 'three';
import * as BLD from './buildings.js';
import { createSoldier, animateUnit } from './units.js';
import { RES, BUILDINGS, PLOTS, MAX_LEVEL, upgradeCost, upgradeTime, prodPerHour, prodCap, TROOPS, HEROES, HERO_BY_ID, RARITY, heroBonus, heroLevelCost, SUMMON, SHOP, RES_PACKS } from './data.js';
import * as G from './state.js';
import { initScenes, openBattle, openSummon, openHeroViewer, getPortrait, sceneActive, renderActive } from './scenes.js';
import { createGrass } from './grass.js';
import { sfx as asfx, initAudio, updateAudio, setMusic, setSfx, audioState } from './audio.js';
import { initTutorial, tutEvent } from './tut.js';

export const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && Math.min(innerWidth, innerHeight) < 900);

// ---------------------------------------------------------------------
//  Renderer
// ---------------------------------------------------------------------
const canvas = $('c');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.6 : 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

export function makeEnv(top = 0x8ec4ee, hor = 0xf4e2c0, bot = 0x4a5a3a, sun = true) {
  const pm = new THREE.PMREMGenerator(renderer);
  const es = new THREE.Scene();
  const g = new THREE.SphereGeometry(10, 32, 16), pos = g.attributes.position, cols = [];
  const T = new THREE.Color(top), H = new THREE.Color(hor), Bc = new THREE.Color(bot), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 10; if (y > 0) c.copy(H).lerp(T, Math.pow(y, 0.6)); else c.copy(H).lerp(Bc, Math.min(1, -y * 2.5)); cols.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  es.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  if (sun) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 7, 5.5) })); s.position.set(5, 6, 4); es.add(s); }
  const tex = pm.fromScene(es, 0.02).texture; pm.dispose();
  return tex;
}

// ---------------------------------------------------------------------
//  Şehir sahnesi
// ---------------------------------------------------------------------
export const city = new THREE.Scene();
city.background = new THREE.Color(0x9fcbe6);
city.fog = new THREE.Fog(0xbad6e6, 140, 340);
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 1, 600);
const sun = new THREE.DirectionalLight(0xfff0d6, 2.6);
sun.position.set(45, 70, 30); sun.castShadow = true;
Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 10, far: 200 });
sun.shadow.mapSize.set(isMobile ? 2048 : 4096, isMobile ? 2048 : 4096);
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
city.add(sun, sun.target);
city.add(new THREE.HemisphereLight(0xcfe6ff, 0x6a5a3a, 1.0));

function canvasTex(w, h, draw, repeat = true, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}
function speckle(ctx, w, h, n, cols, r0, r1, alpha = 1) {
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = alpha * rand(0.3, 1);
    ctx.fillStyle = cols[Math.floor(Math.random() * cols.length)];
    const x = Math.random() * w, y = Math.random() * h, r = rand(r0, r1);
    for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) { ctx.beginPath(); ctx.ellipse(x + dx, y + dy, r, r * rand(0.4, 1), rand(0, 3), 0, 6.3); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}
let waterNormal, grassField = null;
// çim yerleşimi: yollar, meydan, arsalar ve surlardan kaçın
const ROAD_LINES = PLOTS.filter((q) => q.id !== 'townhall').map((q) => [[0, 0], [q.x * 0.55, q.z * 0.2 + (q.z > 0 ? 4 : -4)], [q.x, q.z]]).concat([[[0, 0], [0, 50]]]);
function segDist(px, pz, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz; const t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l)) : 0; return Math.hypot(px - ax - dx * t, pz - az - dz * t); }
function grassAvoid(x, z) {
  const r = Math.hypot(x, z);
  if (r < 10.8) return true;
  if (Math.abs(r - 40) < 2.2) return true;
  for (const p of PLOTS) { const f = (BLD.FOOTPRINT[p.key] || 7) / 2 + 0.4; if (Math.abs(x - p.x) < f && Math.abs(z - p.z) < f) return true; }
  for (const L of ROAD_LINES) for (let i = 0; i < L.length - 1; i++) if (segDist(x, z, L[i][0], L[i][1], L[i + 1][0], L[i + 1][1]) < 1.6) return true;
  return false;
}
function buildTerrain() {
  const grass = canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#4c7a2c'; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, 900, ['#4f7f30', '#6ea044', '#7aac4a', '#557f2e', '#8ab656'], 6, 22, 0.35);
    speckle(ctx, w, h, 5000, ['#3f6a24', '#86b852', '#a0c860', '#4a7a2a'], 0.6, 2, 0.8);
    speckle(ctx, w, h, 60, ['#e8e070', '#f0f0f0', '#d070c0'], 1, 2, 0.9);
  });
  grass.repeat.set(26, 26);
  // ada
  const R = 80, geo = new THREE.CircleGeometry(R, 96);
  const p = geo.attributes.position;
  for (let i = 1; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), a = Math.atan2(y, x), k = 1 + Math.sin(a * 5) * 0.05 + Math.sin(a * 11 + 1) * 0.03; p.setXY(i, x * k, y * k); }
  geo.rotateX(-Math.PI / 2);
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: grass, roughness: 0.95 }));
  ground.receiveShadow = true; city.add(ground);
  grassField = createGrass(city, { radius: 72, avoid: grassAvoid, mobile: isMobile, density: isMobile ? 1.6 : 2.0, outerDensity: isMobile ? 0.7 : 0.9 });
  const sand = new THREE.Mesh(new THREE.RingGeometry(70, 95, 96).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xd8c08a, roughness: 1 }));
  sand.position.y = -0.25; sand.receiveShadow = true; city.add(sand);
  // su
  waterNormal = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = 'rgb(128,128,255)'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) { const x = Math.random() * w, y = Math.random() * h, r = rand(4, 18); const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rand(100, 160)},${rand(100, 160)},255,.5)`); g.addColorStop(1, 'rgba(128,128,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
  }, true, false);
  waterNormal.repeat.set(40, 40);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2c7aa0, roughness: 0.12, metalness: 0.15, normalMap: waterNormal, normalScale: new THREE.Vector2(0.5, 0.5) }));
  water.position.y = -0.6; city.add(water);
  // yollar
  const SZ = 110, PX = 1024;
  const roads = canvasTex(PX, PX, (ctx) => {
    const m = (v) => (v / SZ + 0.5) * PX;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const stroke = (pts, w, col, blur) => { ctx.strokeStyle = col; ctx.lineWidth = w / SZ * PX; ctx.filter = blur ? `blur(${blur}px)` : 'none'; ctx.beginPath(); pts.forEach(([x, z], i) => (i ? ctx.lineTo(m(x), m(z)) : ctx.moveTo(m(x), m(z)))); ctx.stroke(); };
    const lines = PLOTS.filter((q) => q.id !== 'townhall').map((q) => [[0, 0], [q.x * 0.55, q.z * 0.2 + (q.z > 0 ? 4 : -4)], [q.x, q.z]]);
    lines.push([[0, 0], [0, 50]]);
    for (const l of lines) stroke(l, 3.4, 'rgba(110,88,58,.45)', 5);
    for (const l of lines) stroke(l, 2.3, 'rgba(146,118,82,.92)', 1.5);
    // meydan
    ctx.filter = 'blur(3px)'; ctx.fillStyle = 'rgba(160,150,135,1)'; ctx.beginPath(); ctx.arc(m(0), m(0), 10 / SZ * PX, 0, 7); ctx.fill();
    ctx.filter = 'none';
    for (let i = 0; i < 1400; i++) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 9.6; const gv = rand(120, 175); ctx.fillStyle = `rgba(${gv + 6},${gv},${gv - 12},.9)`; const x = m(Math.cos(a) * r), y = m(Math.sin(a) * r); ctx.fillRect(x, y, rand(4, 8), rand(4, 8)); }
    // toprak lekeleri
    ctx.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < 3000; i++) { ctx.fillStyle = `rgba(${rand(60, 120)},${rand(50, 90)},${rand(30, 60)},.35)`; ctx.fillRect(Math.random() * PX, Math.random() * PX, 2, 2); }
  }, false);
  const rp = new THREE.Mesh(new THREE.PlaneGeometry(SZ, SZ).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: roads, transparent: true, roughness: 0.95, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  rp.position.y = 0.03; rp.receiveShadow = true; rp.renderOrder = 1; city.add(rp);
  // uzak dağlar
  const mm = new THREE.MeshStandardMaterial({ color: 0x6a7a6a, flatShading: true, roughness: 1 });
  const snow = new THREE.MeshStandardMaterial({ color: 0xf4f8ff, flatShading: true, roughness: 0.8 });
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + rand(-0.1, 0.1), r = rand(190, 260), h = rand(40, 95), w = rand(35, 60);
    const mt = new THREE.Mesh(new THREE.ConeGeometry(w, h, 7, 1), mm); mt.position.set(Math.cos(a) * r, h / 2 - 2, Math.sin(a) * r); mt.rotation.y = rand(0, 3); city.add(mt);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(w * 0.3, h * 0.3, 7, 1), snow); cap.position.set(mt.position.x, h - h * 0.15 - 2, mt.position.z); cap.rotation.y = mt.rotation.y; city.add(cap);
  }
}

// Prototipten instanced kopyalar (ağaçlar vb.)
function instancify(proto, matrices) {
  proto.updateMatrixWorld(true);
  const out = new THREE.Group();
  proto.traverse((m) => {
    if (!m.isMesh) return;
    const im = new THREE.InstancedMesh(m.geometry, m.material, matrices.length);
    im.castShadow = true; im.receiveShadow = true;
    const tmp = new THREE.Matrix4();
    matrices.forEach((M, i) => { tmp.multiplyMatrices(M, m.matrixWorld); im.setMatrixAt(i, tmp); });
    im.computeBoundingSphere();
    out.add(im);
  });
  return out;
}
function buildNature() {
  const avoid = (x, z) => {
    if (Math.hypot(x, z) < 44) return true;
    if (Math.abs(x) < 4 && z > 0 && z < 60) return true;
    return false;
  };
  for (let v = 0; v < 4; v++) {
    const ms = [];
    let tries = 0;
    while (ms.length < (v === 3 ? 40 : 55) && tries++ < 3000) {
      const a = Math.random() * 6.28, r = rand(40, 74), x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (avoid(x, z)) continue;
      const s = rand(0.8, 1.35);
      ms.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rand(0, 6.28), 0)), new THREE.Vector3(s, s, s)));
    }
    city.add(instancify(BLD.createTree(v), ms));
  }
  // şehir içi birkaç ağaç
  const inner = [[-8, 26], [8, 27], [-22, -10], [22, -12], [-6, -26], [9, -27], [20, 24], [-21, 24], [-34, 2], [34, 3]];
  for (const [x, z] of inner) { const t = BLD.createTree(Math.floor(Math.random() * 3)); t.position.set(x, 0, z); t.rotation.y = rand(0, 6); city.add(t); }
  const rs = [];
  for (let i = 0; i < 30; i++) { const a = Math.random() * 6.28, r = rand(45, 76); const x = Math.cos(a) * r, z = Math.sin(a) * r; if (avoid(x, z)) continue; const rk = BLD.createRock(rand(0.6, 1.8)); rk.position.set(x, 0, z); rk.rotation.y = rand(0, 6); city.add(rk); rs.push(rk); }
}

// Surlar
let wallGroup = null, wallLevel = -1;
function buildWalls() {
  const L = Math.max(1, G.thLevel());
  if (L === wallLevel) return;
  wallLevel = L;
  if (wallGroup) city.remove(wallGroup);
  wallGroup = new THREE.Group();
  const R = 40, N = 8;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2 + Math.PI / N, a1 = ((i + 1) / N) * Math.PI * 2 + Math.PI / N;
    const p0 = new THREE.Vector3(Math.cos(a0) * R, 0, Math.sin(a0) * R), p1 = new THREE.Vector3(Math.cos(a1) * R, 0, Math.sin(a1) * R);
    const tw = BLD.createWallTower(L); tw.position.copy(p0); wallGroup.add(tw);
    const mid = p0.clone().add(p1).multiplyScalar(0.5), len = p0.distanceTo(p1) - 4;
    const ang = Math.atan2(p1.z - p0.z, p1.x - p0.x);
    const isGate = Math.abs(mid.x) < 5 && mid.z > 0;
    if (isGate) {
      for (const s of [-1, 1]) { const w = BLD.createWall(len / 2 - 3.5, L); const off = (len / 4 + 1.75) * s; w.position.set(mid.x + Math.cos(ang) * off, 0, mid.z + Math.sin(ang) * off); w.rotation.y = -ang; wallGroup.add(w); }
      for (const s of [-1, 1]) { const g = BLD.createWallTower(L); g.scale.setScalar(0.8); g.position.set(mid.x + Math.cos(ang) * 4 * s, 0, mid.z + Math.sin(ang) * 4 * s); wallGroup.add(g); }
    } else {
      const w = BLD.createWall(len, L); w.position.copy(mid); w.rotation.y = -ang; wallGroup.add(w);
    }
  }
  city.add(wallGroup);
}

// ---------------------------------------------------------------------
//  Binalar
// ---------------------------------------------------------------------
const holders = {}; // plotId -> { group, content, hit, state, label }
const hitboxes = [];
const hitMat = new THREE.MeshBasicMaterial({ visible: false });
function buildPlots() {
  for (const p of PLOTS) {
    const g = new THREE.Group(); g.position.set(p.x, 0, p.z);
    const fp = BLD.FOOTPRINT[p.key] || 7;
    const hit = new THREE.Mesh(new THREE.BoxGeometry(fp, 6, fp), hitMat); hit.position.y = 3; hit.userData.plotId = p.id; g.add(hit);
    hitboxes.push(hit);
    city.add(g);
    const el = document.createElement('div'); el.className = 'lbl'; $('labels').appendChild(el);
    holders[p.id] = { group: g, content: null, hit, state: '', el, height: 6, plot: p };
    el.addEventListener('pointerup', (e) => { if (e.target.classList.contains('bub')) { e.stopPropagation(); doCollect(p.id); } });
    refreshPlot(p.id);
  }
}
function plotState(id) {
  const b = G.S.buildings[id];
  if (b.busyUntil > Date.now() / 1000) return 'busy';
  return b.level > 0 ? 'b' + b.level : 'empty';
}
function refreshPlot(id) {
  const h = holders[id], st = plotState(id);
  if (h.state === st) return;
  h.state = st;
  if (h.content) h.group.remove(h.content);
  const key = h.plot.key, fp = BLD.FOOTPRINT[key] || 7;
  let c;
  if (st === 'busy') c = BLD.createConstructionSite(fp);
  else if (st === 'empty') c = BLD.createPlot(fp);
  else c = BLD.createBuilding(key, G.lvl(id));
  const wasBusy = h.prevState === 'busy';
  h.prevState = st;
  h.content = c; h.group.add(c);
  h.height = c.userData.height || (st === 'empty' ? 1.5 : 6);
  if (h.inited && (st === 'busy' || wasBusy)) { pops.push({ c, base: c.scale.x, t: 0, big: wasBusy }); burst(h.plot.x, h.height * 0.5, h.plot.z, wasBusy ? 0xffd860 : 0xc8a878, wasBusy ? 26 : 14, wasBusy); }
  h.inited = true;
  h.hit.scale.y = Math.max(0.4, h.height / 6); h.hit.position.y = Math.max(0.4, h.height / 6) * 3;
  if (key === 'archery') placeArchers(id);
}
// Yükseltme "pop" animasyonu ve parıltılar
const pops = [];
const sparks = [];
let sparkTex = null;
function burst(x, y, z, color, n, gold) {
  if (!sparkTex) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); sparkTex = new THREE.CanvasTexture(c); }
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, color, blending: gold ? THREE.AdditiveBlending : THREE.NormalBlending, transparent: true, depthWrite: false }));
    const a = Math.random() * 6.28, sp = rand(2, gold ? 7 : 4);
    s.position.set(x, gold ? y : 0.5, z); city.add(s);
    sparks.push({ s, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: gold ? rand(4, 10) : rand(0.5, 2), life: 0, max: rand(0.8, 1.4), size: gold ? rand(0.5, 1.0) : rand(1.5, 2.6) });
  }
}
function updatePops(dt) {
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i]; p.t += dt;
    const k = Math.min(1, p.t / 0.8), e = 1 - Math.pow(1 - k, 3) * Math.cos(k * (p.big ? 9 : 6));
    p.c.scale.set(p.base * (0.55 + 0.45 * e), p.base * (0.3 + 0.7 * e), p.base * (0.55 + 0.45 * e));
    if (k >= 1) { p.c.scale.setScalar(p.base); pops.splice(i, 1); }
  }
  for (let i = sparks.length - 1; i >= 0; i--) {
    const q = sparks[i]; q.life += dt;
    q.vy -= 9 * dt; q.s.position.x += q.vx * dt; q.s.position.y = Math.max(0.2, q.s.position.y + q.vy * dt); q.s.position.z += q.vz * dt;
    q.vx *= 0.97; q.vz *= 0.97;
    const u = q.life / q.max; q.s.material.opacity = 1 - u; q.s.scale.setScalar(q.size * (0.6 + u));
    if (u >= 1) { city.remove(q.s); q.s.material.dispose(); sparks.splice(i, 1); }
  }
}
export function focusPlot(id) { const h = holders[id]; if (h) focusOn(h.plot.x, h.plot.z); }
export function plotScreen(id) {
  const h = holders[id]; if (!h) return null;
  _v.set(h.plot.x, h.height + 1.2, h.plot.z).project(camera);
  if (_v.z > 1) return null;
  return { x: (_v.x + 1) / 2 * innerWidth, y: (1 - _v.y) / 2 * innerHeight - 30 };
}

// Kulelerdeki okçular
const ambient = []; // { obj, state, path, t, speed }
function placeArchers(id) {
  const h = holders[id];
  if (h.archers) { h.archers.forEach((a) => { h.group.remove(a.obj); ambient.splice(ambient.indexOf(a), 1); }); }
  h.archers = [];
  const top = h.content.userData.topY;
  if (!top || G.lvl(id) === 0 || plotState(id) === 'busy') return;
  for (let i = 0; i < 2; i++) {
    const o = createSoldier('archer', 'blue');
    o.position.set(i ? 0.8 : -0.8, top, 0.6); o.rotation.y = rand(-0.6, 0.6);
    h.group.add(o);
    const a = { obj: o, state: 'idle', phase: rand(0, 10) };
    ambient.push(a); h.archers.push(a);
  }
}
// Devriye askerleri
function buildPatrols() {
  const loops = [
    [[-6, 30], [6, 30], [6, 34], [-6, 34]],
    [[-30, 24], [-10, 24], [-10, 28], [-30, 28]],
    [[10, -24], [30, -24], [30, -28], [10, -28]],
  ];
  const types = ['infantry', 'spearman', 'archer', 'infantry', 'cavalry', 'spearman'];
  types.forEach((t, i) => {
    const o = createSoldier(t, 'blue');
    city.add(o);
    const path = loops[i % loops.length];
    ambient.push({ obj: o, state: 'walk', path, seg: 0, u: i * 0.35 % 1, speed: t === 'cavalry' ? 3 : 1.4, phase: rand(0, 10) });
  });
  // eğitim alanında idman yapan askerler
  for (let i = 0; i < 2; i++) {
    const o = createSoldier(i ? 'spearman' : 'infantry', 'blue');
    o.position.set(-17 + (i ? 1.2 : -1.2), 0, 2 + 4.6); o.rotation.y = i ? -Math.PI / 2 : Math.PI / 2;
    city.add(o); ambient.push({ obj: o, state: 'attack', phase: i * 0.4 });
  }
}
function updateAmbient(t, dt) {
  for (const a of ambient) {
    if (a.path) {
      const p0 = a.path[a.seg], p1 = a.path[(a.seg + 1) % a.path.length];
      const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      a.u += (a.speed * dt) / len;
      if (a.u >= 1) { a.u -= 1; a.seg = (a.seg + 1) % a.path.length; }
      const q0 = a.path[a.seg], q1 = a.path[(a.seg + 1) % a.path.length];
      a.obj.position.set(lerp(q0[0], q1[0], a.u), 0, lerp(q0[1], q1[1], a.u));
      a.obj.rotation.y = Math.atan2(q1[0] - q0[0], q1[1] - q0[1]);
    }
    animateUnit(a.obj, a.state, t + a.phase, dt);
  }
}

// ---------------------------------------------------------------------
//  Kamera kontrolü
// ---------------------------------------------------------------------
const cam = { tx: 0, tz: 4, dist: innerHeight > innerWidth ? 120 : 80, distT: innerHeight > innerWidth ? 105 : 72, yaw: 0.55, pitch: 0.92, vx: 0, vz: 0 };
function applyCam() {
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  camera.position.set(cam.tx + Math.sin(cam.yaw) * cp * cam.dist, sp * cam.dist, cam.tz + Math.cos(cam.yaw) * cp * cam.dist);
  camera.lookAt(cam.tx, 0, cam.tz);
}
const pointers = new Map();
let drag = null, pinch0 = 0, dist0 = 0, moved = 0;
canvas.addEventListener('pointerdown', (e) => {
  if (sceneActive()) return;
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) { drag = { x: e.clientX, y: e.clientY }; moved = 0; cam.vx = cam.vz = 0; }
  if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); dist0 = cam.distT; moved = 99; }
});
canvas.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId)) return;
  const prev = pointers.get(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    cam.distT = clamp(dist0 * pinch0 / Math.max(1, d), 28, 170);
    return;
  }
  if (!drag) return;
  const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
  moved += Math.abs(dx) + Math.abs(dy);
  const k = cam.dist / innerHeight * 1.05;
  const cs = Math.cos(cam.yaw), sn = Math.sin(cam.yaw);
  const mx = (-dx * cs - dy * sn / Math.sin(cam.pitch) * 0.9) * k, mz = (dx * sn - dy * cs / Math.sin(cam.pitch) * 0.9) * k;
  cam.tx = clamp(cam.tx + mx, -60, 60); cam.tz = clamp(cam.tz + mz, -60, 65);
  cam.vx = mx / 0.016; cam.vz = mz / 0.016;
});
const endPtr = (e) => {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  if (pointers.size === 0) {
    if (drag && moved < 10) tapAt(e.clientX, e.clientY);
    if (moved < 10) cam.vx = cam.vz = 0;
    drag = null;
  }
};
canvas.addEventListener('pointerup', endPtr);
canvas.addEventListener('pointercancel', endPtr);
canvas.addEventListener('wheel', (e) => { if (!sceneActive()) cam.distT = clamp(cam.distT * (1 + Math.sign(e.deltaY) * 0.12), 28, 170); }, { passive: true });
document.addEventListener('touchmove', (e) => { if (!e.target.closest('.sheet, .modal-box, .res10')) e.preventDefault(); }, { passive: false });

const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function tapAt(x, y) {
  ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(hitboxes, false)[0];
  if (hit) {
    const id = hit.object.userData.plotId;
    if (G.pending(id) > G.S.buildings[id].level * 5 && plotState(id) !== 'busy') { doCollect(id); return; }
    openBuilding(id);
    focusOn(holders[id].plot.x, holders[id].plot.z);
  } else closeSheet();
}
let focus = null;
function focusOn(x, z) { const k = innerHeight > innerWidth ? cam.dist * 0.16 : cam.dist * 0.06; focus = { x: x + Math.sin(cam.yaw) * k, z: z + Math.cos(cam.yaw) * k }; }

// ---------------------------------------------------------------------
//  Etiketler
// ---------------------------------------------------------------------
const _v = new THREE.Vector3();
let lastLabel = 0;
function updateLabels(force) {
  const t = Date.now() / 1000;
  const refreshText = force || t - lastLabel > 0.25;
  if (refreshText) lastLabel = t;
  for (const id in holders) {
    const h = holders[id], p = h.plot, b = G.S.buildings[id];
    _v.set(p.x, h.height + 1.2, p.z).project(camera);
    if (_v.z > 1) { h.el.style.display = 'none'; continue; }
    h.el.style.display = '';
    h.el.style.transform = `translate3d(${((_v.x + 1) / 2 * innerWidth).toFixed(1)}px, ${((1 - _v.y) / 2 * innerHeight).toFixed(1)}px, 0) translate(-50%, -100%)`;
    if (!refreshText) continue;
    const def = BUILDINGS[p.key];
    let html = '';
    if (b.busyUntil > t) html += `<div class="tm">🔨 ${G.fmtTime(b.busyUntil - t)}</div>`;
    else if (b.level === 0) {
      const req = def.reqTH;
      html += G.thLevel() >= req ? `<div class="build">＋ ${def.name}</div>` : `<div class="lock">🔒 ${def.name}</div>`;
    } else {
      if (id === 'barracks' && G.S.training) html += `<div class="tm">${TROOPS[G.S.training.type].icon} ${G.fmtTime(G.S.training.end - t)}</div>`;
      if (p.key === 'hospital' && G.S.healing) html += `<div class="tm heal">💚 ${G.fmtTime(G.S.healing.end - t)}</div>`;
      if (p.key === 'potion' && G.S.potions > 0) html += `<div class="bub" style="animation:none;font-size:16px">🧪${G.S.potions}</div>`;
      const pend = G.pending(id);
      if (def.prod && pend > b.level * 5) html += `<div class="bub">${RES[def.prod].icon}</div>`;
      if (p.key === 'summon' && G.freePullAvailable()) html += `<div class="bub" style="font-size:11px;width:auto;padding:0 9px;border-radius:12px;color:#6a3a00;font-weight:900">🎁 ÜCRETSİZ</div>`;
      html += `<div class="nm">${def.name}<em>${b.level}</em></div>`;
    }
    if (h.el._html !== html) { h.el.innerHTML = html; h.el._html = html; }
  }
}

// ---------------------------------------------------------------------
//  Arayüz yardımcıları
// ---------------------------------------------------------------------
export function toast(msg, bad = false) {
  const d = document.createElement('div'); d.className = 'toast' + (bad ? ' bad' : ''); d.textContent = msg;
  $('toasts').appendChild(d); setTimeout(() => d.remove(), 2300);
}
function floaty(text, x, y, color = '#fff') {
  const d = document.createElement('div'); d.className = 'floaty'; d.textContent = text; d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.color = color;
  document.body.appendChild(d); setTimeout(() => d.remove(), 1300);
}
const costHtml = (cost) => Object.entries(cost).filter(([, v]) => v > 0).map(([r, v]) => `<span class="${G.S.res[r] >= v ? '' : 'no'}">${RES[r].icon} ${G.fmt(v)}</span>`).join('');
const stars = (n) => '★'.repeat(n);
function updateTop() {
  for (const r of ['food', 'wood', 'stone', 'gold']) $('r_' + r).textContent = G.fmt(G.S.res[r]);
  $('power').textContent = G.fmt(G.cityPower());
  $('kname').textContent = G.S.name;
  $('troopCount').textContent = G.fmt(G.totalTroops());
  $('builderCount').textContent = `${G.busyBuilders()}/${G.builders()}`;
  $('freeDot').classList.toggle('hidden', !G.freePullAvailable());
  const left = G.S.raid.at - Date.now() / 1000;
  $('chipRaid').classList.toggle('hidden', left > 45);
  $('raidTxt').textContent = 'Saldırı: ' + G.fmtTime(left);
}

// ---------------------------------------------------------------------
//  Bina paneli
// ---------------------------------------------------------------------
let sheetId = null, sheetTimer = 0, trainSel = 'infantry', trainQty = 50;
function openBuilding(id) { sheetId = id; renderSheet(); $('sheetWrap').classList.add('open'); sfx('open'); tutEvent('sheet:' + id); }
export function closeSheet() { sheetId = null; $('sheetWrap').classList.remove('open'); }
$('sheetWrap').addEventListener('pointerdown', (e) => { if (e.target.id === 'sheetWrap') closeSheet(); });
function upgradeBlock(id) {
  const p = PLOTS.find((q) => q.id === id), b = G.S.buildings[id], t = Date.now() / 1000;
  if (b.busyUntil > t) {
    const pct = (t - b.busyStart) / (b.busyUntil - b.busyStart) * 100;
    return `<div class="progress"><span style="width:${pct}%"></span><em>🔨 ${b.level ? 'Yükseltiliyor' : 'İnşa ediliyor'} • ${G.fmtTime(b.busyUntil - t)}</em></div>
      <button class="btn gold" style="width:100%" data-act="speed">⚡ Hemen bitir • 🪙 ${G.gemCostForTime(b.busyUntil - t)}</button>`;
  }
  if (b.level >= MAX_LEVEL) return `<p class="desc">✨ En yüksek seviyeye ulaştı.</p>`;
  const c = G.canUpgrade(id), cost = upgradeCost(p.key, b.level + 1), time = upgradeTime(p.key, b.level + 1);
  return `<div class="cost">${costHtml(cost)}<span>⏱ ${G.fmtTime(time)}</span></div>
    ${c.ok ? '' : `<div class="why">${c.why}</div>`}
    <button class="btn" style="width:100%" data-act="upgrade" ${c.ok ? '' : 'disabled'}>${b.level ? `⬆ Seviye ${b.level + 1}'e yükselt` : '🔨 İnşa et'}</button>`;
}
function renderSheet() {
  if (!sheetId) return;
  const id = sheetId, p = PLOTS.find((q) => q.id === id), key = p.key, def = BUILDINGS[key], b = G.S.buildings[id], L = b.level, t = Date.now() / 1000;
  let body = '';
  const stat = (k, v, up) => `<div class="stat"><small>${k}</small><b>${v}${up ? ` <span class="up">→ ${up}</span>` : ''}</b></div>`;
  if (L > 0) {
    if (key === 'townhall') body += `<div class="stats">${stat('Krallık gücü', G.fmt(G.cityPower()))}${stat('Bina seviye sınırı', L)}${stat('Depo sınırı', G.fmt(G.storageCap()))}${stat('Zafer / Yenilgi', `${G.S.stats.wins} / ${G.S.stats.losses}`)}</div>`;
    if (def.prod) {
      const pend = G.pending(id);
      body += `<div class="stats">${stat('Üretim / saat', G.fmt(prodPerHour(key, L)), L < MAX_LEVEL ? G.fmt(prodPerHour(key, L + 1)) : '')}${stat('Kapasite', G.fmt(prodCap(key, L)))}</div>
        <button class="btn blue" style="width:100%;margin-bottom:10px" data-act="collect" ${pend >= 1 ? '' : 'disabled'}>${RES[def.prod].icon} Topla • ${G.fmt(pend)}</button>`;
    }
    if (key === 'archery') body += `<div class="stats">${stat('Kule hasarı', G.fmt(L * 260), L < MAX_LEVEL ? G.fmt((L + 1) * 260) : '')}${stat('Toplam savunma', G.fmt(G.towerPower()))}</div>`;
    if (key === 'warehouse') body += `<div class="stats">${stat('Depo sınırı', G.fmt(G.storageCap()))}${stat('Yağmadan korunan', Math.round((0.3 + L * 0.05) * 100) + '%')}</div>`;
    if (key === 'heroes') body += `<div class="stats">${stat('Kahraman sayısı', Object.keys(G.S.heroes).length + ' / ' + HEROES.length)}${stat('Kahraman seviye sınırı', G.heroMaxLevel())}</div><button class="btn purple" style="width:100%;margin-bottom:10px" data-go="heroes">🛡️ Kahramanları göster</button>`;
    if (key === 'summon') body += `<div class="stats">${stat('5★ şansı', '%0,6')}${stat('5★ garanti', `${G.S.pity5} / ${SUMMON.pity5}`)}</div><button class="btn purple" style="width:100%;margin-bottom:10px" data-go="summon">🔮 Çağırma ekranını aç</button>`;
    if (key === 'barracks') body += barracksUI();
    if (key === 'hospital') body += hospitalUI();
    if (key === 'potion') {
      const cap = G.potionCap(), next = G.S.potions < cap ? G.potionInterval() - (t - G.S.potionAt) : 0;
      body += `<div class="stats">${stat('İksirler', `${G.S.potions} / ${cap}`)}${stat('Sonraki iksir', next > 0 ? G.fmtTime(next) : 'Depo dolu')}${stat('İksir başına iyileşme', 40 + L * 10 + ' asker')}${stat('Yaralılar', G.fmt(G.totalWounded()))}</div>
        <button class="btn" style="width:100%;margin-bottom:10px" data-act="potion" ${G.S.potions ? '' : 'disabled'}>🧪 İksir kullan</button>`;
    }
  }
  $('sheet').innerHTML = `<div class="sh-head"><div class="sh-ico">${def.icon}</div><div><h2>${def.name}</h2><small>${L ? 'Seviye ' + L : 'İnşa edilmedi'}</small></div><button class="x" data-act="close">✕</button></div>
    <p class="desc">${def.desc}</p>${body}<div style="height:1px;background:var(--line);margin:8px 0 12px"></div>${upgradeBlock(id)}`;
  const sl = $('qtySlider');
  if (sl) sl.oninput = () => { trainQty = +sl.value; renderSheetSoon(); };
}
let soon = 0;
function renderSheetSoon() { clearTimeout(soon); soon = setTimeout(renderSheet, 30); }
function barracksUI() {
  const t = Date.now() / 1000;
  if (G.S.training) {
    const tr = G.S.training, pct = (t - tr.start) / (tr.end - tr.start) * 100;
    return `<p class="desc"><b>${TROOPS[tr.type].icon} ${tr.n} ${TROOPS[tr.type].name}</b> eğitiliyor…</p>
      <div class="progress green"><span style="width:${pct}%"></span><em>${G.fmtTime(tr.end - t)}</em></div>
      <button class="btn gold" style="width:100%;margin-bottom:10px" data-act="speedtrain">⚡ Hemen bitir • 🪙 ${G.gemCostForTime(tr.end - t)}</button>`;
  }
  const max = G.trainBatchMax();
  trainQty = clamp(trainQty, 1, max);
  let cards = '';
  for (const k in TROOPS) {
    const d = TROOPS[k], un = G.troopUnlocked(k);
    cards += `<div class="troop ${k === trainSel ? 'sel' : ''} ${un ? '' : 'locked'}" data-troop="${k}"><span class="ti">${d.icon}</span>${d.short}<small>${un ? G.fmt(G.S.troops[k]) : '🔒 Kışla ' + d.reqBarracks}</small></div>`;
  }
  const d = TROOPS[trainSel], cost = G.trainCost(trainSel, trainQty), time = d.time * trainQty / G.trainSpeed();
  return `<div class="troops">${cards}</div>
    <p class="desc" style="margin-bottom:6px"><b>${d.name}</b> — ${d.desc}<br><small>⚔ ${d.atk} &nbsp; 🛡 ${d.def} &nbsp; ❤ ${d.hp} &nbsp; 🎒 ${d.load}</small></p>
    <div class="qty"><span>Miktar</span><span>${trainQty} / ${max}</span></div>
    <input id="qtySlider" class="slider" type="range" min="1" max="${max}" value="${trainQty}">
    <div class="cost">${costHtml(cost)}<span>⏱ ${G.fmtTime(time)}</span></div>
    <button class="btn red" style="width:100%;margin-bottom:10px" data-act="train" ${G.troopUnlocked(trainSel) && G.canAfford(cost) ? '' : 'disabled'}>⚔ Eğit</button>`;
}
function hospitalUI() {
  const t = Date.now() / 1000, cap = G.hospitalCap(), w = G.totalWounded();
  let s = `<div class="stats"><div class="stat"><small>Yaralılar</small><b>${G.fmt(w)} / ${G.fmt(cap)}</b></div><div class="stat"><small>İksir</small><b>🧪 ${G.S.potions}</b></div></div>`;
  s += `<div class="troops">${Object.keys(TROOPS).map((k) => `<div class="troop"><span class="ti">${TROOPS[k].icon}</span>${TROOPS[k].short}<small>🤕 ${G.S.wounded[k]}</small></div>`).join('')}</div>`;
  if (G.S.healing) {
    const hl = G.S.healing, pct = (t - hl.start) / (hl.end - hl.start) * 100;
    s += `<div class="progress green"><span style="width:${pct}%"></span><em>💚 ${G.totalTroops(hl.counts)} asker iyileşiyor • ${G.fmtTime(hl.end - t)}</em></div>`;
  } else if (w) {
    s += `<div class="cost">${costHtml(G.healCost(G.S.wounded))}</div><button class="btn" style="width:100%;margin-bottom:8px" data-act="heal">💚 Tümünü iyileştir</button>`;
  }
  if (G.S.potions && (w || G.S.healing)) s += `<button class="btn purple" style="width:100%;margin-bottom:10px" data-act="potion">🧪 İksir kullan (anında iyileştir)</button>`;
  return s;
}
function doCollect(id) {
  const amt = G.collect(id);
  if (amt) {
    const p = holders[id].plot; _v.set(p.x, holders[id].height, p.z).project(camera);
    floaty(`+${G.fmt(amt)} ${RES[BUILDINGS[p.key].prod].icon}`, (_v.x + 1) / 2 * innerWidth - 30, (1 - _v.y) / 2 * innerHeight - 40, '#ffe68a');
    sfx('collect'); tutEvent('collect');
  }
  updateLabels(true); updateTop();
}
$('sheet').addEventListener('click', (e) => {
  const tr = e.target.closest('[data-troop]');
  if (tr) { trainSel = tr.dataset.troop; renderSheet(); return; }
  const go = e.target.closest('[data-go]');
  if (go) { closeSheet(); navigate(go.dataset.go); return; }
  const a = e.target.closest('[data-act]'); if (!a) return;
  const act = a.dataset.act, id = sheetId;
  if (act === 'close') return closeSheet();
  if (act === 'upgrade') { const r = G.startUpgrade(id); if (!r.ok) toast(r.why, true); else { toast('🔨 İnşaat başladı'); sfx('build'); refreshPlot(id); tutEvent('upgrade'); } }
  if (act === 'speed') { if (G.speedUp(id)) { sfx('coin'); tutEvent('speed'); } else needGold(); }
  if (act === 'collect') doCollect(id);
  if (act === 'train') { const r = G.startTraining(trainSel, trainQty); if (!r.ok) toast(r.why, true); else { toast('⚔ Eğitim başladı'); sfx('train'); tutEvent('train'); } }
  if (act === 'speedtrain') { if (!G.speedTraining()) needGold(); }
  if (act === 'heal') { const r = G.startHealing(); if (!r.ok) toast(r.why, true); else { toast('💚 İyileştirme başladı'); sfx('heal'); } }
  if (act === 'potion') { const r = G.usePotion(); if (!r.ok) toast(r.why, true); else toast(`🧪 ${r.healed || ''} asker iyileşti`); }
  renderSheet(); updateTop(); updateLabels(true);
});
function needGold() { toast('Yetersiz altın', true); setTimeout(() => navigate('shop'), 500); }

// ---------------------------------------------------------------------
//  Modallar: dünya, kahramanlar, mağaza, raporlar, profil
// ---------------------------------------------------------------------
export function openModal(html) { $('modalBox').innerHTML = html; $('modal').classList.add('open'); }
export function closeModal() { $('modal').classList.remove('open'); $('modalBox').innerHTML = ''; setNav('city'); }
$('modal').addEventListener('pointerdown', (e) => { if (e.target.id === 'modal') closeModal(); });
function setNav(go) { document.querySelectorAll('nav button').forEach((b) => b.classList.toggle('on', b.dataset.go === go)); }
document.querySelectorAll('nav button').forEach((b) => b.addEventListener('click', () => navigate(b.dataset.go)));
$('goldBtn').onclick = () => navigate('shop');
$('profileBtn').onclick = () => navigate('profile');
$('chipTroops').onclick = () => navigate('army');
$('chipRaid').onclick = () => toast('Düşman yaklaşıyor! Asker eğit ve kulelerini güçlendir.');

let modalKind = '', worldSel = null, heroTab = 'mine';
export function navigate(go) {
  closeSheet();
  setNav(go);
  if (go === 'city') { closeModal(); return; }
  if (go === 'summon') { closeModal(); setNav('summon'); openSummon(); tutEvent('summonOpen'); return; }
  if (go === 'world') tutEvent('worldOpen');
  sfx('open');
  modalKind = go;
  renderModal();
}
function head(title, icon) { return `<div class="sh-head"><div class="sh-ico">${icon}</div><div><h2>${title}</h2></div><button class="x" data-m="close">✕</button></div>`; }
function renderModal() {
  const k = modalKind;
  if (k === 'world') return openModal(worldUI());
  if (k === 'heroes') { openModal(heroesUI()); fillPortraits(); return; }
  if (k === 'shop') return openModal(shopUI());
  if (k === 'reports') { G.S.reportsSeen = G.S.reports.length ? G.S.reports[0].t : 0; G.save(); $('repDot').classList.add('hidden'); return openModal(reportsUI()); }
  if (k === 'profile') return openModal(profileUI());
  if (k === 'army') return openModal(armyUI());
  if (k === 'attack') return openModal(attackUI());
}
function worldUI() {
  const e = worldSel && G.S.enemies.find((q) => q.id === worldSel);
  const my = G.cityPower();
  let kds = `<div class="kd me" style="left:50%;top:50%"><span class="ki">🏰</span><span class="kp">${G.S.name}</span></div>`;
  for (const q of G.S.enemies) {
    const sh = q.shieldUntil > Date.now() / 1000;
    kds += `<div class="kd ${q.id === worldSel ? 'sel' : ''} ${sh ? 'shield' : ''}" data-k="${q.id}" style="left:${q.x * 100}%;top:${q.y * 100}%"><span class="ki">${q.power > my * 1.3 ? '🏯' : '🏘️'}</span><span class="kp">${q.name}</span></div>`;
  }
  let lines = '';
  for (const q of G.S.enemies) lines += `<line x1="50%" y1="50%" x2="${q.x * 100}%" y2="${q.y * 100}%" stroke="rgba(255,240,200,.15)" stroke-width="1.5" stroke-dasharray="4 5"/>`;
  let info = '<p class="desc" style="text-align:center;margin-top:10px">Saldırmak için haritada bir krallığa dokun.</p>';
  if (e) {
    const sh = e.shieldUntil > Date.now() / 1000;
    const ratio = e.power / Math.max(1, G.armyPower(G.S.troops));
    const diff = ratio < 0.6 ? ['Kolay', '#7dff9a'] : ratio < 1.0 ? ['Orta', '#ffe68a'] : ratio < 1.5 ? ['Zor', '#ffaa6a'] : ['Çok zor', '#ff6a5a'];
    info = `<div class="stats" style="margin-top:10px">
      <div class="stat"><small>Krallık</small><b>${e.name}</b><br><small>${e.lord}</small></div>
      <div class="stat"><small>Güç</small><b>⚔ ${G.fmt(e.power)}</b><br><small style="color:${diff[1]}">${diff[0]}</small></div>
      <div class="stat"><small>Ganimet (tahmini)</small><b style="font-size:12px">🌾${G.fmt(e.res.food * 0.6)} 🪵${G.fmt(e.res.wood * 0.6)} 🪨${G.fmt(e.res.stone * 0.6)} 🪙${e.res.gold}</b></div>
      <div class="stat"><small>Okçu kulesi</small><b>Sv. ${e.tower}</b></div></div>
      ${sh ? `<div class="why">🛡️ Kalkan aktif: ${G.fmtTime(e.shieldUntil - Date.now() / 1000)}</div>` : ''}
      <button class="btn red" style="width:100%" data-m="toattack" ${sh ? 'disabled' : ''}>⚔ Saldır</button>`;
  }
  return head('Dünya Haritası', '🗺️') + `<div class="wmap"><svg>${lines}</svg>${kds}</div>${info}
    <p class="demo">Diğer krallıklar şu an bilgisayar tarafından yönetiliyor. Gerçek çevrimiçi oyuncular için sunucu bağlantısı gerekir.</p>`;
}
let atk = { troops: {}, hero: null };
function attackUI() {
  const e = G.S.enemies.find((q) => q.id === worldSel);
  if (!e) return worldUI();
  if (!atk.init) { atk = { init: true, troops: {}, hero: G.S.commander }; for (const t in TROOPS) atk.troops[t] = Math.floor(G.S.troops[t] * 0.8); }
  let rows = '';
  for (const t in TROOPS) {
    const max = G.S.troops[t];
    rows += `<div class="qty"><span>${TROOPS[t].icon} ${TROOPS[t].name}</span><span>${atk.troops[t]} / ${max}</span></div>
      <input class="slider" type="range" min="0" max="${max}" value="${atk.troops[t]}" data-slider="${t}" ${max ? '' : 'disabled'}>`;
  }
  const owned = Object.keys(G.S.heroes).map((id) => HERO_BY_ID[id]).sort((a, b) => b.rarity - a.rarity);
  const heroSel = owned.map((h) => `<option value="${h.id}" ${h.id === atk.hero ? 'selected' : ''}>${stars(h.rarity)} ${h.name} (Sv.${G.S.heroes[h.id].level})</option>`).join('');
  const myP = G.armyPower(atk.troops, atk.hero, G.S.heroes[atk.hero]?.level, G.S.heroes[atk.hero]?.copies);
  return head(`${e.name}'a Saldır`, '⚔️') + `
    <div class="qty"><span>Komutan</span></div>
    <select data-hero style="width:100%;padding:10px;border-radius:10px;background:#1a1008;color:#fff;border:1px solid var(--line);font-weight:800;margin-bottom:8px">${heroSel}</select>
    ${rows}
    <div class="stats" style="margin-top:8px"><div class="stat"><small>Ordu gücün</small><b>⚔ ${G.fmt(myP)}</b></div><div class="stat"><small>Düşman gücü</small><b>⚔ ${G.fmt(e.power)}</b></div></div>
    <div class="row"><button class="btn gray" data-m="world">Geri</button><button class="btn red" data-m="march" ${G.totalTroops(atk.troops) ? '' : 'disabled'}>🚩 Yürüyüş başlat</button></div>`;
}
function armyUI() {
  let rows = '';
  for (const t in TROOPS) rows += `<div class="stat"><small>${TROOPS[t].icon} ${TROOPS[t].name}</small><b>${G.fmt(G.S.troops[t])}</b> <small style="display:inline;color:#ffaa8a">🤕 ${G.S.wounded[t]}</small></div>`;
  return head('Ordum', '🛡️') + `<div class="stats">${rows}</div><div class="stats"><div class="stat"><small>Ordu gücü</small><b>⚔ ${G.fmt(G.armyPower(G.S.troops))}</b></div><div class="stat"><small>Hastane</small><b>${G.fmt(G.totalWounded())} / ${G.fmt(G.hospitalCap())}</b></div></div>
    <button class="btn red" style="width:100%" data-m="gobarracks">⚔ Kışlaya git</button>`;
}
function heroesUI() {
  const list = heroTab === 'mine' ? HEROES.filter((h) => G.S.heroes[h.id]) : HEROES;
  const cards = list.map((h) => {
    const o = G.S.heroes[h.id];
    return `<div class="hcard ${o ? '' : 'locked'} ${G.S.commander === h.id ? 'cmd' : ''}" style="--rc:${RARITY[h.rarity].color}" data-hero="${h.id}">
      <div class="ph" data-portrait="${h.id}">⏳</div><span class="st">${stars(h.rarity)}</span>${o ? `<span class="lv">Sv.${o.level}</span>` : ''}<div class="hn">${h.name}</div></div>`;
  }).join('');
  return head('Karakter Deposu', '🛡️') + `<div class="tabs"><button data-tab="mine" class="${heroTab === 'mine' ? 'on' : ''}">Kahramanlarım (${Object.keys(G.S.heroes).length})</button><button data-tab="all" class="${heroTab === 'all' ? 'on' : ''}">Koleksiyon (${HEROES.length})</button></div>
    <div class="hgrid">${cards}</div>`;
}
export async function fillPortraits(root = $('modalBox')) {
  const els = [...root.querySelectorAll('[data-portrait]')];
  for (const el of els) {
    const url = await getPortrait(el.dataset.portrait);
    if (!el.isConnected) return;
    const img = new Image(); img.src = url; el.replaceWith(img);
  }
}
function shopUI() {
  const packs = SHOP.map((p) => `<div class="pack">${p.tag ? `<span class="tag">${p.tag}</span>` : ''}<div class="pg">🪙</div><b>${G.fmt(p.gold)}</b>${p.bonus ? `<small>+${p.bonus} bonus</small>` : '<small>&nbsp;</small>'}<button class="btn gold" data-buy="${p.id}">${p.price}</button></div>`).join('');
  const rp = RES_PACKS.map((p) => `<div class="pack"><div class="pg" style="font-size:22px">${Object.keys(p.res).map((r) => RES[r].icon).join('')}</div><b style="font-size:14px">${Object.entries(p.res).map(([r, v]) => G.fmt(v)).join(' / ')}</b><button class="btn" data-rbuy="${p.id}">🪙 ${p.gold}</button></div>`).join('');
  return head('Altın Mağazası', '🪙') + `<div class="shop">${packs}</div>
    <h3 class="cinzel" style="color:var(--gold);margin:16px 0 8px">Kaynak Paketleri</h3><div class="shop">${rp}</div>
    <p class="demo">⚠️ Demo mağaza: gerçek ödeme alınmaz, altın ücretsiz eklenir. Gerçek satış için App Store / Google Play ödeme sistemi veya bir ödeme sağlayıcı bağlanması gerekir.</p>`;
}
function reportsUI() {
  if (!G.S.reports.length) return head('Savaş Raporları', '📜') + '<p class="desc">Henüz savaş yok. Dünya haritasından bir krallığa saldır!</p>';
  const tot = (o) => G.fmt(G.totalTroops(o || {}));
  const ago = (t) => { const s = Date.now() / 1000 - t; return s < 60 ? 'az önce' : s < 3600 ? Math.floor(s / 60) + ' dk önce' : Math.floor(s / 3600) + ' sa önce'; };
  return head('Savaş Raporları', '📜') + G.S.reports.map((r) => `<div class="rep ${r.win ? '' : 'lose'}"><span class="t">${ago(r.t)}</span>
    <b>${r.kind === 'attack' ? '⚔ Saldırı' : '🛡️ Savunma'}: ${r.win ? 'ZAFER' : 'YENİLGİ'}</b> — ${r.enemy}
    <div class="ln">Kayıpların: ${tot(r.aLoss)} (🤕 ${tot(r.wounded)} yaralı, 💀 ${tot(r.dead)} ölü) • Düşman kaybı: ${tot(r.dLoss)}</div>
    ${r.kind === 'attack' && r.win ? `<div class="ln">Ganimet: 🌾${G.fmt(r.loot.food || 0)} 🪵${G.fmt(r.loot.wood || 0)} 🪨${G.fmt(r.loot.stone || 0)} 🪙${r.loot.gold || 0}</div>` : ''}
    ${r.kind === 'defense' && !r.win ? `<div class="ln">Yağmalanan: 🌾${G.fmt(r.loot.food || 0)} 🪵${G.fmt(r.loot.wood || 0)} 🪨${G.fmt(r.loot.stone || 0)}</div>` : ''}</div>`).join('');
}
function profileUI() {
  return head('Krallık', '⚜') + `<div class="qty"><span>Krallık adı</span></div>
    <input data-name maxlength="16" value="${G.S.name.replace(/"/g, '')}" style="width:100%;padding:10px;border-radius:10px;background:#1a1008;color:#fff;border:1px solid var(--line);font-weight:800;font-size:15px;margin-bottom:10px">
    <div class="stats"><div class="stat"><small>Güç</small><b>⚔ ${G.fmt(G.cityPower())}</b></div><div class="stat"><small>Zafer / Yenilgi</small><b>${G.S.stats.wins} / ${G.S.stats.losses}</b></div>
    <div class="stat"><small>Öldürülen düşman</small><b>${G.fmt(G.S.stats.kills)}</b></div><div class="stat"><small>Toplam çağırma</small><b>${G.S.totalPulls}</b></div></div>
    <div class="row"><button class="btn" data-m="savename">💾 Kaydet</button><button class="btn gray" data-m="sound">${audioState().sfxOn ? '🔊 Efekt' : '🔇 Efekt'}</button><button class="btn gray" data-m="music">${audioState().musicOn ? '🎵 Müzik' : '🔇 Müzik'}</button></div>
    <button class="btn red" style="width:100%;margin-top:10px" data-m="reset">🗑 Oyunu sıfırla</button>`;
}
$('modalBox').addEventListener('input', (e) => {
  const s = e.target.dataset.slider;
  if (s) { atk.troops[s] = +e.target.value; const box = $('modalBox'), y = box.scrollTop; clearTimeout(soon); soon = setTimeout(() => { renderModal(); $('modalBox').scrollTop = y; }, 60); }
});
$('modalBox').addEventListener('change', (e) => { if (e.target.dataset.hero !== undefined) { atk.hero = e.target.value; const y = $('modalBox').scrollTop; renderModal(); $('modalBox').scrollTop = y; } });
$('modalBox').addEventListener('click', (e) => {
  const kd = e.target.closest('[data-k]');
  if (kd) { worldSel = kd.dataset.k; atk.init = false; return renderModal(); }
  const tab = e.target.closest('[data-tab]');
  if (tab) { heroTab = tab.dataset.tab; return renderModal(); }
  const hc = e.target.closest('[data-hero]');
  if (hc && hc.classList.contains('hcard')) { if (G.S.heroes[hc.dataset.hero] || heroTab === 'all') { closeModal(); openHeroViewer(hc.dataset.hero); } return; }
  const buy = e.target.closest('[data-buy]');
  if (buy) {
    const p = SHOP.find((q) => q.id === buy.dataset.buy);
    if (confirm(`${G.fmt(p.gold + p.bonus)} altın eklensin mi?\n\n(Demo: gerçek ödeme yapılmaz.)`)) { G.S.res.gold += p.gold + p.bonus; G.save(); toast(`🪙 +${G.fmt(p.gold + p.bonus)} altın`); sfx('coin'); updateTop(); }
    return;
  }
  const rb = e.target.closest('[data-rbuy]');
  if (rb) {
    const p = RES_PACKS.find((q) => q.id === rb.dataset.rbuy);
    if (G.S.res.gold < p.gold) return needGold();
    G.S.res.gold -= p.gold; G.gainRes(p.res); G.save(); toast('📦 Kaynaklar eklendi'); sfx('coin'); updateTop(); return;
  }
  const m = e.target.closest('[data-m]'); if (!m) return;
  const a = m.dataset.m;
  if (a === 'close') closeModal();
  if (a === 'world') { modalKind = 'world'; renderModal(); }
  if (a === 'toattack') { modalKind = 'attack'; atk.init = false; renderModal(); tutEvent('attackOpen'); }
  if (a === 'march') {
    const troops = { ...atk.troops }, hero = atk.hero;
    const r = G.attackEnemy(worldSel, troops, hero);
    if (!r) return toast('Asker seç', true);
    closeModal(); atk.init = false; tutEvent('battle');
    openBattle({ mode: 'attack', result: r.res, attacker: { troops: r.sent, hero }, defender: { troops: addBack(r.res.D, r.res.dLoss), tower: r.enemy.tower }, report: r.rep, title: r.enemy.name });
  }
  if (a === 'gobarracks') { closeModal(); openBuilding('barracks'); focusOn(-17, 2); }
  if (a === 'savename') { const v = $('modalBox').querySelector('[data-name]').value.trim(); if (v) { G.S.name = v; G.save(); updateTop(); toast('Kaydedildi'); } }
  if (a === 'sound') { setSfx(!audioState().sfxOn); renderModal(); }
  if (a === 'music') { setMusic(!audioState().musicOn); renderModal(); }
  if (a === 'reset') { if (confirm('Tüm ilerleme silinsin mi? Bu geri alınamaz.')) { G.resetGame(); location.reload(); } }
});
const addBack = (a, b) => { const o = {}; for (const k in a) o[k] = a[k] + (b[k] || 0); return o; };

// ---------------------------------------------------------------------
//  Basit ses efektleri (WebAudio)
// ---------------------------------------------------------------------
export function sfx(kind) { asfx(kind); }
document.addEventListener('click', (e) => { if (e.target.closest('button, .troop, .hcard, .kd, .tabs button')) asfx('click'); }, { capture: true });

// ---------------------------------------------------------------------
//  Olaylar
// ---------------------------------------------------------------------
G.onChange((ev, data) => {
  if (ev === 'built') { refreshPlot(data); const p = PLOTS.find((q) => q.id === data); toast(`✅ ${BUILDINGS[p.key].name} Sv.${G.lvl(data)} hazır!`); sfx('built'); if (p.key === 'townhall') buildWalls(); }
  if (ev === 'building') refreshPlot(data);
  if (ev === 'trained') toast(`⚔ ${data.n} ${TROOPS[data.type].name} hazır!`);
  if (ev === 'healed') toast(`💚 ${G.totalTroops(data.counts)} asker iyileşti`);
  if (ev === 'battle') $('repDot').classList.remove('hidden');
});
export function onSceneClosed() { tutEvent('sceneClosed'); setNav('city'); updateTop(); updateLabels(true); for (const id in holders) refreshPlot(id); }

// ---------------------------------------------------------------------
//  Döngü
// ---------------------------------------------------------------------
let last = performance.now(), tAcc = 0, slow = 0, saveT = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000); last = now; tAcc += dt;
  updateAudio();
  if (renderActive(dt, tAcc)) { gameTick(dt); return; }
  // kamera
  if (!drag) { cam.tx += cam.vx * dt; cam.tz += cam.vz * dt; cam.vx *= Math.exp(-6 * dt); cam.vz *= Math.exp(-6 * dt); cam.tx = clamp(cam.tx, -60, 60); cam.tz = clamp(cam.tz, -60, 65); }
  if (focus) { cam.tx = lerp(cam.tx, focus.x, 1 - Math.exp(-5 * dt)); cam.tz = lerp(cam.tz, focus.z, 1 - Math.exp(-5 * dt)); if (Math.hypot(cam.tx - focus.x, cam.tz - focus.z) < 0.2 || drag) focus = null; }
  cam.dist = lerp(cam.dist, cam.distT, 1 - Math.exp(-8 * dt));
  cam.pitch = lerp(cam.pitch, 0.78 + (cam.dist - 28) / 142 * 0.22, 1 - Math.exp(-6 * dt));
  applyCam();
  updatePops(dt);
  if (grassField) grassField.update(tAcc);
  for (const id in holders) { const c = holders[id].content; if (c && c.userData.update) c.userData.update(tAcc, dt); }
  if (wallGroup) wallGroup.children.forEach((c) => c.userData.update && c.userData.update(tAcc, dt));
  updateAmbient(tAcc, dt);
  waterNormal.offset.set(tAcc * 0.01, tAcc * 0.006);
  renderer.render(city, camera);
  updateLabels();
  gameTick(dt);
}
function gameTick(dt) {
  slow += dt; saveT += dt;
  if (slow > 0.5) {
    slow = 0;
    G.tick();
    for (const id in holders) refreshPlot(id);
    updateTop();
    if (sheetId && !document.activeElement?.classList.contains('slider')) renderSheet();
    // baskın
    const left = G.S.raid.at - Date.now() / 1000;
    if (left < 30 && !G.S.raid.warned) { G.S.raid.warned = true; toast('⚠️ Düşman ordusu yaklaşıyor! 30 saniye!', true); sfx('warn'); }
    if (left <= 0 && !sceneActive() && !$('modal').classList.contains('open')) {
      const r = G.resolveRaid();
      closeSheet();
      openBattle({ mode: 'defense', result: r.res, attacker: { troops: r.attacker.troops }, defender: { troops: r.home, hero: G.S.commander, tower: G.towerPower() / 260 }, report: r.rep, title: r.attacker.name });
    } else if (left <= 0) G.S.raid.at = Date.now() / 1000 + 20;
  }
  if (saveT > 5) { saveT = 0; G.save(); }
}
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
});
addEventListener('visibilitychange', () => { if (document.hidden) G.save(); });

// ---------------------------------------------------------------------
//  Başlat
// ---------------------------------------------------------------------
const setLoad = (p, txt) => { $('loadBar').style.width = p + '%'; if (txt) $('loadTxt').textContent = txt; };
const frame = () => new Promise((r) => setTimeout(r, 16));
async function boot() {
  G.load();
  setLoad(10, 'Arazi hazırlanıyor…'); await frame();
  city.environment = makeEnv();
  city.environmentIntensity = 0.7;
  buildTerrain();
  setLoad(30, 'Orman dikiliyor…'); await frame();
  buildNature();
  setLoad(50, 'Surlar örülüyor…'); await frame();
  buildWalls();
  setLoad(65, 'Binalar inşa ediliyor…'); await frame();
  buildPlots();
  setLoad(80, 'Askerler toplanıyor…'); await frame();
  buildPatrols();
  initScenes({ renderer, toast, sfx, closeModal, navigate, onSceneClosed, fillPortraits, needGold, updateTop, makeEnv, event: tutEvent });
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  applyCam();
  setLoad(95, 'Son dokunuşlar…'); await frame();
  renderer.compile(city, camera);
  setLoad(100);
  ['top', 'side', 'nav'].forEach((id) => $(id).classList.remove('hidden'));
  updateTop();
  $('loading').style.opacity = 0; setTimeout(() => $('loading').remove(), 500);
  if (G.S.reports.length && G.S.reports[0].t > (G.S.reportsSeen || 0)) $('repDot').classList.remove('hidden');
  const away = Date.now() / 1000 - (G.S.lastSeenBoot || Date.now() / 1000);
  G.S.lastSeenBoot = Date.now() / 1000;
  initTutorial({ sfx, toast, updateTop, getPortrait, plotScreen, focusPlot });
  requestAnimationFrame(loop);
}
boot().catch((e) => { console.error(e); setLoad(100, 'Hata: ' + e.message); });
window.__ds = { G, cam, navigate, holders };
