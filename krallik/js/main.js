// =====================================================================
//  DEMİR SANCAK — ana dosya: şehir sahnesi, kamera, arayüz panelleri
// =====================================================================
import * as THREE from 'three';
import * as BLD from './buildings.js';
import { createSoldier, createTank, animateUnit, createCitizen } from './units.js';
import * as ASSETS from './assets.js';
import { initWorldMap, openWorldMap, worldOpen, refreshWorldUI } from './worldmap.js';
import { serverPlayers, assignServer, listAlliances, getAlliance, createAlliance, joinAlliance, updateMember, leaveAlliance, kickMember, editAlliance, sendChat, watchChat, ALLIANCE_MAX } from './online.js';
import { online, onOnline, initOnline, loadCloud, saveCloud, topPlayers, rivals, sendAttack, fetchInbox, clearInbox, connectGoogle, switchToExistingGoogle } from './online.js';
import { RESEARCH, RESEARCH_MAX, researchCost, QUESTS, DAILY, DAILY_CHEST, LOGIN_REWARDS, SPEEDUPS, SPEED_ORDER, SPEED_TIER, SPEED_SHOP, DROP_QUEST, DROP_EVENT, FRAMES, FRAME_BY_ID, OFFERS } from './data.js';
import { campCap, RES, BUILDINGS, PLOTS, MAX_LEVEL, maxLevel, thRequirements, upgradeCost, TROOPS, HEROES, HERO_BY_ID, RARITY, heroBonus, heroLevelCost, SUMMON, SHOP, RES_PACKS } from './data.js';
import * as G from './state.js';
import { getAvatar } from './scenes.js';
import { initScenes, openBattle, openSummon, openHeroViewer, getPortrait, getBuildingPortrait, sceneActive, renderActive } from './scenes.js';
import { createGrass } from './grass.js';
import { sfx as asfx, initAudio, updateAudio, setMusic, setSfx, audioState, playVoice } from './audio.js';
import { initTutorial, tutEvent } from './tut.js';
import { icon } from './icons.js';
import { paintCity } from './terrain.js';
import { createLife, createVillager, animVillager } from './life.js';
import { LORD_NAMES, KINGDOM_NAMES } from './data.js';

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
renderer.toneMappingExposure = 1.15;
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
city.background = new THREE.Color(0x0b1430);
city.fog = new THREE.Fog(0x0e1a3a, 120, 320);
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 1, 600);
const sun = new THREE.DirectionalLight(0x9fb8ff, 1.55);
sun.position.set(45, 70, 30); sun.castShadow = true;
Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 10, far: 200 });
sun.shadow.mapSize.set(isMobile ? 2048 : 4096, isMobile ? 2048 : 4096);
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
city.add(sun, sun.target);
const hemiNight = new THREE.HemisphereLight(0x5a74c8, 0x1a2a20, 0.62); city.add(hemiNight);

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
let waterNormal, grassField = null, life = null;
const CLOUDS = [];
const GARDENS = [];
const FOUNTAIN = [-3.8, 8.4];
const STALLS = [[-9.6, 0.4, '#c8302a', Math.PI / 2], [9.6, 0.9, '#2a6ad0', -Math.PI / 2]];
// çim yerleşimi: yollar, meydan, arsalar ve surlardan kaçın
const ROAD_LINES = PLOTS.filter((q) => q.id !== 'townhall').map((q) => [[0, 0], [q.x * 0.55, q.z * 0.2 + (q.z > 0 ? 4 : -4)], [q.x, q.z]]).concat([[[0, 0], [0, 50]]]);
function segDist(px, pz, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz; const t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l)) : 0; return Math.hypot(px - ax - dx * t, pz - az - dz * t); }
function grassAvoid(x, z) {
  const r = Math.hypot(x, z);

  if (Math.abs(r - 40) < 2.2) return true;
  for (const p of PLOTS) { const f = (BLD.FOOTPRINT[p.key] || 7) / 2 + 0.6; if (Math.abs(x - p.x) < f && Math.abs(z - p.z) < f) return true; }
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
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x3a7430, roughness: 1 }));
  ground.receiveShadow = true; city.add(ground);
  const sand = new THREE.Mesh(new THREE.RingGeometry(70, 95, 96).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xd8c08a, roughness: 1 }));
  sand.position.y = -0.25; sand.receiveShadow = true; city.add(sand);
  // su
  waterNormal = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = 'rgb(128,128,255)'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) { const x = Math.random() * w, y = Math.random() * h, r = rand(4, 18); const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rand(100, 160)},${rand(100, 160)},255,.5)`); g.addColorStop(1, 'rgba(128,128,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
  }, true, false);
  waterNormal.repeat.set(40, 40);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x0e2a48, roughness: 0.08, metalness: 0.3, normalMap: waterNormal, normalScale: new THREE.Vector2(0.5, 0.5) }));
  water.position.y = -0.6; city.add(water);
  // uzak dağlar
  if (ASSETS.ready.models) {
    const mts = ['mountain_A_grass_trees', 'mountain_B_grass_trees', 'mountain_C_grass_trees', 'hills_A_trees', 'hills_B_trees'];
    for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2 + rand(-0.08, 0.08), r = rand(120, 170), m = ASSETS.model(mts[i % 5]); if (!m) continue; const sc = i % 5 > 2 ? rand(14, 20) : rand(22, 34); m.scale.setScalar(sc); m.position.set(Math.cos(a) * r, -1, Math.sin(a) * r); m.rotation.y = rand(0, 6); m.traverse((o) => { if (o.isMesh) o.castShadow = false; }); city.add(m); }
    for (let i = 0; i < 9; i++) { const c = ASSETS.model(i % 2 ? 'cloud_big' : 'cloud_small'); if (!c) continue; c.scale.setScalar(rand(8, 14)); c.position.set(rand(-120, 120), rand(38, 55), rand(-120, 80)); c.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.55; o.material.color.setHex(0x5a6a9a); } }); city.add(c); CLOUDS.push(c); }
    return;
  }
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
  const inner = [[6, 30], [-22, -10], [22, -12], [-34, 2], [34, 3]];
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
  if (h.workers) { h.workers.forEach((v) => h.group.remove(v)); h.workers = null; }
  if (st === 'busy') {
    h.workers = [];
    for (let i = 0; i < 2; i++) { const v = createCitizen(4, { tool: true }) || createVillager({ work: true, hat: i ? 'cap' : 'straw', carry: 'tool' }); const a = i * Math.PI + 0.6; v.position.set(Math.cos(a) * fp * 0.38, 0, Math.sin(a) * fp * 0.38 + fp * 0.1); v.rotation.y = Math.atan2(-v.position.x, -v.position.z); h.group.add(v); h.workers.push(v); }
  }
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
    const a = { obj: o, state: i ? 'attack' : 'idle', phase: rand(0, 10) };
    ambient.push(a); h.archers.push(a);
  }
}
// Devriye askerleri
function makeLamp(spots) {
  const proto = new THREE.Group();
  const iron = new THREE.MeshStandardMaterial({ color: 0x2a2a30, metalness: 0.8, roughness: 0.4 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x3a2a10, emissive: 0xffb050, emissiveIntensity: 1.3 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 2.6, 6), iron); post.position.y = 1.3; proto.add(post);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.05), iron); arm.position.set(0.22, 2.5, 0); proto.add(arm);
  const lan = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.22), glass); lan.position.set(0.42, 2.3, 0); proto.add(lan);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.18, 4), iron); cap.position.set(0.42, 2.52, 0); cap.rotation.y = Math.PI / 4; proto.add(cap);
  return instancify(proto, spots.map(([x, z]) => new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(-x, -z) + Math.PI / 2, 0)), new THREE.Vector3(1, 1, 1))));
}
function makeBush(spots) {
  const proto = BLD.createTree(3);
  return instancify(proto, spots.map(([x, z]) => { const s = rand(0.5, 0.75); return new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rand(0, 6), 0)), new THREE.Vector3(s, s, s)); }));
}
function FOUNTAIN_FX(f, h) {
  const n = 70, g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), dat = [];
  for (let i = 0; i < n; i++) dat.push({ a: Math.random() * 6.28, o: Math.random(), v: rand(0.9, 1.2) });
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xd8f4ff, size: 0.12, transparent: true, opacity: 0.9 }));
  pts.position.copy(f.position); city.add(pts);
  fountainTick = (t) => { for (let i = 0; i < n; i++) { const d = dat[i], u = (t * 0.8 * d.v + d.o) % 1, r = 0.15 + u * 1.0; pos[i * 3] = Math.cos(d.a) * r; pos[i * 3 + 1] = h * 0.72 + u * 0.5 - u * u * h * 0.6; pos[i * 3 + 2] = Math.sin(d.a) * r; } g.attributes.position.needsUpdate = true; };
}
let fountainTick = null;
// =====================================================================
//  GECE ATMOSFERİ: yıldızlar, ay, ateşböcekleri, fener ışık havuzları
// =====================================================================
let nightTick = null;
function glowTexture(inner = 'rgba(255,255,255,1)') { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, inner); gr.addColorStop(0.3, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); }
function buildNight() {
  const glow = glowTexture();
  // yıldızlı gök kubbesi
  const N = 1400, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 0.92); const r = 420; pos[i * 3] = Math.sin(ph) * Math.cos(th) * r; pos[i * 3 + 1] = Math.cos(ph) * r * 0.75 + 20; pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r; const w = 0.6 + Math.random() * 0.4; col[i * 3] = w; col[i * 3 + 1] = w; col[i * 3 + 2] = 0.8 + Math.random() * 0.2; }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.8, map: glow, vertexColors: true, transparent: true, depthWrite: false, fog: false, sizeAttenuation: true }));
  city.add(stars);
  // ay
  const mc = document.createElement('canvas'); mc.width = mc.height = 256; const mx = mc.getContext('2d');
  let g = mx.createRadialGradient(128, 128, 30, 128, 128, 128); g.addColorStop(0, 'rgba(220,230,255,.9)'); g.addColorStop(0.45, 'rgba(160,190,255,.25)'); g.addColorStop(1, 'rgba(120,150,255,0)'); mx.fillStyle = g; mx.fillRect(0, 0, 256, 256);
  g = mx.createRadialGradient(118, 116, 4, 128, 128, 46); g.addColorStop(0, '#fffdf0'); g.addColorStop(1, '#d8dcf0'); mx.fillStyle = g; mx.beginPath(); mx.arc(128, 128, 44, 0, 7); mx.fill();
  mx.fillStyle = 'rgba(160,165,190,.45)'; for (const [x, y, r] of [[112, 118, 9], [140, 138, 7], [132, 108, 5], [116, 146, 6]]) { mx.beginPath(); mx.arc(x, y, r, 0, 7); mx.fill(); }
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(mc), fog: false, depthWrite: false, transparent: true }));
  moon.scale.setScalar(120); city.add(moon);
  // binalarda sıcak ışık havuzları + birkaç gerçek ışık
  const poolMat = new THREE.MeshBasicMaterial({ map: glow, color: 0xff9030, transparent: true, opacity: 0.38, blending: THREE.AdditiveBlending, depthWrite: false });
  const pools = [];
  const lit = ['townhall', 'barracks', 'summon', 'hospital', 'heroes', 'potion'];
  for (const p of PLOTS) {
    const fp = (BLD.FOOTPRINT[p.key] || 7);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(fp * 1.7, fp * 1.7).rotateX(-Math.PI / 2), poolMat); pool.position.set(p.x, 0.05, p.z + fp * 0.15); pool.renderOrder = 2; city.add(pool); pools.push(pool);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: p.key === 'summon' ? 0xb070ff : p.key === 'hospital' ? 0x70ffa0 : 0xffb050, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.35 }));
    halo.position.set(p.x, fp * 0.45, p.z + fp * 0.35); halo.scale.setScalar(fp * 1.1); city.add(halo); pools.push(halo);
    if (lit.includes(p.key) && !isMobile || (isMobile && ['townhall', 'summon', 'barracks'].includes(p.key))) {
      const L = new THREE.PointLight(p.key === 'summon' ? 0xb070ff : p.key === 'hospital' ? 0x80ffb0 : 0xffa850, p.key === 'townhall' ? 45 : 22, fp * 2.0, 1.7);
      L.position.set(p.x, fp * 0.5, p.z + fp * 0.6); city.add(L);
    }
  }
  // meydan çeşmesi ışığı
  { const L = new THREE.PointLight(0x80c8ff, 25, 12, 1.6); L.position.set(0, 3, 9.3); city.add(L); }
  // ateşböcekleri
  const FN = isMobile ? 70 : 130, fpos = new Float32Array(FN * 3), fd = [];
  for (let i = 0; i < FN; i++) { const a = Math.random() * 6.28, r = 12 + Math.random() * 56; fd.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, y: 0.6 + Math.random() * 3, p: Math.random() * 6.28, s: 0.3 + Math.random() * 0.6 }); }
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
  const flies = new THREE.Points(fg, new THREE.PointsMaterial({ size: 0.7, map: glow, color: 0xd8ff70, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  city.add(flies);
  // yavaş döngü: ~8 dk gece, ~2 dk alacakaranlık (asla tam gündüz değil)
  const NIGHT = { bg: new THREE.Color(0x0b1430), fog: new THREE.Color(0x0e1a3a), sun: new THREE.Color(0x9fb8ff), sunI: 1.55, hs: new THREE.Color(0x5a74c8), hi: 0.62, exp: 1.15 };
  const DUSK = { bg: new THREE.Color(0x3a2a58), fog: new THREE.Color(0x5a3a5a), sun: new THREE.Color(0xffa070), sunI: 2.0, hs: new THREE.Color(0x9a7ac8), hi: 0.85, exp: 1.2 };
  const cyc = { bg: new THREE.Color(), fog: new THREE.Color(), sun: new THREE.Color(), hs: new THREE.Color() };
  nightTick = (t) => {
    const u = (Date.now() / 1000 % 600) / 600; // 10 dakikalık tur
    const k = u < 0.8 ? 0 : Math.sin((u - 0.8) / 0.2 * Math.PI); // son %20'de alacakaranlık
    const e = k * k * (3 - 2 * k);
    city.background.copy(cyc.bg.copy(NIGHT.bg).lerp(DUSK.bg, e));
    city.fog.color.copy(cyc.fog.copy(NIGHT.fog).lerp(DUSK.fog, e));
    sun.color.copy(cyc.sun.copy(NIGHT.sun).lerp(DUSK.sun, e)); sun.intensity = lerp(NIGHT.sunI, DUSK.sunI, e);
    hemiNight.color.copy(cyc.hs.copy(NIGHT.hs).lerp(DUSK.hs, e)); hemiNight.intensity = lerp(NIGHT.hi, DUSK.hi, e);
    renderer.toneMappingExposure = lerp(NIGHT.exp, DUSK.exp, e);
    stars.material.opacity = 1 - e * 0.8; moon.material.opacity = 1 - e * 0.5;
    flies.visible = e < 0.6;
    moon.position.set(camera.position.x - 160, camera.position.y + 110, camera.position.z - 260);
    stars.position.set(camera.position.x, 0, camera.position.z);
    for (let i = 0; i < FN; i++) { const d = fd[i]; fpos[i * 3] = d.x + Math.sin(t * d.s + d.p) * 1.6; fpos[i * 3 + 1] = d.y + Math.sin(t * d.s * 1.7 + d.p) * 0.5; fpos[i * 3 + 2] = d.z + Math.cos(t * d.s * 0.8 + d.p) * 1.6; }
    fg.attributes.position.needsUpdate = true;
    flies.material.opacity = 0.65 + Math.sin(t * 3) * 0.25;
    poolMat.opacity = 0.35 + Math.sin(t * 7) * 0.03 + Math.sin(t * 13) * 0.02;
  };
}
function buildPatrols() {
  life = createLife(city, { roads: ROAD_LINES, mobile: isMobile, fountainAt: null, stalls: [] });
  { const f = ASSETS.hfModel('p_fountain'); if (f) { const fs = ASSETS.hfSize('p_fountain'); f.scale.setScalar(3.4 / Math.max(fs.x, fs.z)); f.position.set(0, 0, 9.3); city.add(f); FOUNTAIN_FX(f, 3.4 * fs.y / Math.max(fs.x, fs.z)); } }
  for (const sx of [-1, 1]) { const g = createSoldier('spearman', 'blue'); g.position.set(sx * 2.6, 0, 7.2); city.add(g); ambient.push({ obj: g, state: 'idle', phase: rand(0, 5) }); }
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
const cam = { tx: 0, tz: 4, dist: innerHeight > innerWidth ? 110 : 80, distT: innerHeight > innerWidth ? 84 : 64, yaw: 0.55, pitch: 0.92, vx: 0, vz: 0 };
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
      const req = Math.max(def.reqTH, p.reqTH || 0), reqOk = !def.reqB || Object.entries(def.reqB).every(([rk, rl]) => G.maxLevelOf(rk) >= rl);
      html += G.thLevel() >= req && reqOk ? `<div class="build">＋ ${def.name}</div>` : `<div class="lock">🔒 ${def.name}</div>`;
    } else {
      if (id === 'barracks' && G.S.training) html += `<div class="tm">${TROOPS[G.S.training.type].icon} ${G.fmtTime(G.S.training.end - t)}</div>`;
      if (p.key === 'tankyard' && G.S.tankTraining) html += `<div class="tm">${TROOPS.tank.icon} ${G.fmtTime(G.S.tankTraining.end - t)}</div>`;
      if (p.key === 'academy' && G.S.research.cur) html += `<div class="tm">🔬 ${G.fmtTime(G.S.research.cur.end - t)}</div>`;
      if (p.key === 'hospital' && G.S.healing) html += `<div class="tm heal">💚 ${G.fmtTime(G.S.healing.end - t)}</div>`;
      if (p.key === 'potion' && G.S.potions > 0) html += `<div class="bub" style="animation:none;font-size:16px">🧪${G.S.potions}</div>`;
      const pend = G.pending(id);
      if (def.prod && pend > b.level * 5) html += `<div class="bub">${icon(def.prod, 28)}</div>`;
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
  const d = document.createElement('div'); d.className = 'toast' + (bad ? ' bad' : '');
  const m = String(msg).match(/^(\p{Extended_Pictographic}\uFE0F?|[✓✗⚡⚔⬆])\s*/u);
  const ic = document.createElement('i'), tx = document.createElement('span');
  ic.textContent = m ? m[1] : (bad ? '⚠️' : '✨'); tx.textContent = m ? String(msg).slice(m[0].length) : msg;
  d.append(ic, tx);
  const box = $('toasts'); while (box.children.length >= 3) box.firstChild.remove();
  box.appendChild(d); setTimeout(() => d.remove(), 2600);
}
function floaty(text, x, y, color = '#fff') {
  const d = document.createElement('div'); d.className = 'floaty'; d.textContent = text; d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.color = color;
  document.body.appendChild(d); setTimeout(() => d.remove(), 1300);
}
const costHtml = (cost) => Object.entries(cost).filter(([, v]) => v > 0).map(([r, v]) => `<span class="${G.S.res[r] >= v ? '' : 'no'}">${icon(r, 20)} ${G.fmt(v)}</span>`).join('');
const stars = (n) => '★'.repeat(n);
let avatarFor = null, frameFor = null;
function updateTop() {
  for (const r of ['food', 'wood', 'stone', 'gold']) $('r_' + r).textContent = G.fmt(G.S.res[r]);
  const pw = G.cityPower(); $('power').textContent = G.fmt(pw);
  { const steps = [0, 5e3, 1e4, 2.5e4, 5e4, 1e5, 2.5e5, 5e5, 1e6, 2.5e6, 5e6, 1e7, 2.5e7, 5e7, 1e8, 2.5e8, 5e8, 1e9, 2.5e9]; let i = steps.findIndex((v) => v > pw); if (i < 0) i = steps.length - 1; const lo = steps[i - 1] || 0; $('powBar').style.width = Math.min(100, (pw - lo) / Math.max(1, steps[i] - lo) * 100).toFixed(1) + '%'; }
  if (frameFor !== G.S.frame) { frameFor = G.S.frame; $('frameImg').src = UI('fr_' + G.S.frame); const av = document.querySelector('#top .avatar'); av.className = 'avatar' + (isPremFrame(G.S.frame) ? ' anim fa-' + G.S.frame : ''); av.style.setProperty('--m', `url(${UI('fr_' + G.S.frame)})`); }
  $('kname').textContent = G.S.name;
  $('thLvl').textContent = G.thLevel();
  $('logDot').classList.toggle('hidden', !G.loginPending());
  $('evDot').classList.toggle('hidden', !G.claimableCount());
  if (avatarFor !== G.S.commander) { avatarFor = G.S.commander; getAvatar(G.S.commander).then((u) => { $('avatarImg').src = u; }); }
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
const PORTRAIT_CACHE = {};
const PORTRAIT_CLEAR = (key) => { for (const k in PORTRAIT_CACHE) if (k.startsWith(key + ':')) delete PORTRAIT_CACHE[k]; };
let sheetId = null, sheetTimer = 0, trainSel = 'infantry', trainQty = 50;
function openBuilding(id) { sheetId = id; renderSheet(); $('sheetWrap').classList.add('open'); sfx('open'); tutEvent('sheet:' + id); }
export function closeSheet() { sheetId = null; $('sheetWrap').classList.remove('open'); }
$('sheetWrap').addEventListener('pointerdown', (e) => { if (e.target.id === 'sheetWrap') closeSheet(); });
function upgradeBlock(id) {
  const p = PLOTS.find((q) => q.id === id), b = G.S.buildings[id], t = Date.now() / 1000;
  if (b.busyUntil > t) {
    const pct = (t - b.busyStart) / (b.busyUntil - b.busyStart) * 100;
    return `<div class="progress"><span style="width:${pct}%"></span><em>🔨 ${b.level ? 'Yükseltiliyor' : 'İnşa ediliyor'} • ${G.fmtTime(b.busyUntil - t)}</em></div>
      <button class="btn speedbtn" style="width:100%;margin-bottom:8px" data-act="spd" data-tg="b:${id}">⏩ Hızlandır ${spCountTxt()}</button>
      <button class="btn gold" style="width:100%" data-act="speed">⚡ Hemen bitir • 🪙 ${G.gemCostForTime(b.busyUntil - t)}</button>`;
  }
  if (b.level >= maxLevel(p.key)) return `<p class="desc">✨ En yüksek seviyeye ulaştı (Sv.${maxLevel(p.key)}).</p>`;
  let reqHtml = '';
  if (p.key === 'townhall') {
    const reqs = thRequirements(b.level + 1);
    if (reqs.length) reqHtml = `<div class="req-box"><div class="req-h">Sv.${b.level + 1} için gerekenler</div>${reqs.map(([rk, rl]) => { const have = G.maxLevelOf(rk), ok = have >= rl; return `<div class="req-row ${ok ? 'ok' : ''}"><span class="req-ic">${ok ? '✓' : '✗'}</span><b>${BUILDINGS[rk].name} Sv.${rl}</b><small>Şu an Sv.${have}</small>${ok ? '' : `<button class="w-btn" data-gobld="${rk}">Git</button>`}</div>`; }).join('')}</div>`;
  } else if (b.level + 1 > G.thLevel()) reqHtml = `<div class="req-box"><div class="req-row big"><span class="req-bimg">${BUILDINGS.townhall.icon}</span><div class="req-t"><b>Belediye Binası Sv.${b.level + 1}</b><small>Şu an Sv.${G.thLevel()}</small></div><button class="w-btn" data-gobld="townhall">Git »</button></div></div>`;
  const c = G.canUpgrade(id), cost = upgradeCost(p.key, b.level + 1), time = G.upgradeTime(p.key, b.level + 1);
  return `${reqHtml}<div class="cost">${costHtml(cost)}<span>⏱ ${G.fmtTime(time)}</span></div>
    ${c.ok || c.req ? '' : `<div class="why">${c.why}</div>`}
    <button class="btn" style="width:100%" data-act="upgrade" ${c.ok ? '' : 'disabled'}>${b.level ? `⬆ Seviye ${b.level + 1}'e yükselt` : '🔨 İnşa et'}</button>`;
}
const STAT_ICONS = [[/kapasite|sınır/i, '⛺'], [/şehirdeki|hazır ordu|birlik/i, '👥'], [/sefer/i, '⛑️'], [/eğitim/i, '📜'], [/güç/i, '⚔️'], [/zafer/i, '🏆'], [/depo|korunan/i, '📦'], [/kule|hasar|savunma/i, '🏹'], [/hız|süre|sonraki/i, '⏱️'], [/üretim|saatlik/i, '⚙️'], [/iksir/i, '🧪'], [/yaralı|iyileş/i, '💚'], [/kahraman/i, '🛡️'], [/şans|garanti/i, '🔮'], [/ganimet|kaynak|toplanacak|birikmiş/i, '💰'], [/tank/i, '⚙️']];
const statIcon = (k) => (STAT_ICONS.find(([re]) => re.test(k)) || [0, '✦'])[1];
function renderSheet() {
  if (!sheetId) return;
  const id = sheetId, p = PLOTS.find((q) => q.id === id), key = p.key, def = BUILDINGS[key], b = G.S.buildings[id], L = b.level, t = Date.now() / 1000;
  let body = '';
  const stat = (k, v, up) => `<div class="stat"><i class="st-ic">${statIcon(k)}</i><div><small>${k}</small><b>${v}${up ? ` <span class="up">→ ${up}</span>` : ''}</b></div></div>`;
  if (L > 0) {
    if (key === 'townhall') body += `<div class="stats">${stat('Krallık gücü', G.fmt(G.cityPower()))}${stat('Bina seviye sınırı', L)}${stat('Depo sınırı', G.fmt(G.storageCap()))}${stat('Zafer / Yenilgi', `${G.S.stats.wins} / ${G.S.stats.losses}`)}</div>`;
    if (def.prod) {
      const pend = G.pending(id);
      body += `<div class="stats">${stat('Üretim / saat', G.fmt(G.prodPerHour(key, L)), L < maxLevel(key) ? G.fmt(G.prodPerHour(key, L + 1)) : '')}${stat('Kapasite', G.fmt(G.prodCap(key, L)))}</div>
        <button class="btn blue" style="width:100%;margin-bottom:10px" data-act="collect" ${pend >= 1 ? '' : 'disabled'}>${RES[def.prod].icon} Topla • ${G.fmt(pend)}</button>`;
    }
    if (key === 'archery') body += `<div class="stats">${stat('Kule hasarı', G.fmt(L * 260), L < maxLevel(key) ? G.fmt((L + 1) * 260) : '')}${stat('Toplam savunma', G.fmt(G.towerPower()))}</div>`;
    if (key === 'warehouse') body += `<div class="stats">${stat('Depo sınırı', G.fmt(G.storageCap()))}${stat('Yağmadan korunan', Math.round((0.3 + L * 0.05) * 100) + '%')}</div>`;
    if (key === 'heroes') body += `<div class="stats">${stat('Kahraman sayısı', Object.keys(G.S.heroes).length + ' / ' + HEROES.length)}${stat('Kahraman seviye sınırı', G.heroMaxLevel())}</div><button class="btn purple" style="width:100%;margin-bottom:10px" data-go="heroes">🛡️ Kahramanları göster</button>`;
    if (key === 'summon') body += `<div class="stats">${stat('5★ şansı', '%0,6')}${stat('5★ garanti', `${G.S.pity5} / ${SUMMON.pity5}`)}</div><button class="btn purple" style="width:100%;margin-bottom:10px" data-go="summon">🔮 Çağırma ekranını aç</button>`;
    if (key === 'barracks') body += barracksUI();
    if (key === 'tankyard') body += tankyardUI();
    if (key === 'camp') body += campUI(L);
    if (key === 'forge') body += `<div class="stats">${stat('Birlik savunması', '+' + Math.round(G.forgeDefBonus() * 100) + '%', L < maxLevel(key) ? '+' + Math.round((L + 1) * 2.5) + '%' : '')}${stat('Tank üretim hızı', '+' + L * 8 + '%', L < maxLevel(key) ? '+' + (L + 1) * 8 + '%' : '')}</div>`;
    if (key === 'rally') body += `<div class="stats">${stat('Saldırı gücü', '+' + L * 3 + '%', L < maxLevel(key) ? '+' + (L + 1) * 3 + '%' : '')}${stat('Ganimet kapasitesi', '+' + L * 8 + '%', L < maxLevel(key) ? '+' + (L + 1) * 8 + '%' : '')}${stat('Hazır ordu', G.fmt(G.totalTroops(G.S.troops)))}${stat('Tanklar', G.fmt(G.S.troops.tank || 0))}</div><button class="btn red" style="width:100%;margin-bottom:10px" data-go="world">⚔ Sefere çık</button>`;
    if (key === 'academy') body += academyUI();
    if (key === 'hospital') body += hospitalUI();
    if (key === 'potion') {
      const cap = G.potionCap(), next = G.S.potions < cap ? G.potionInterval() - (t - G.S.potionAt) : 0;
      body += `<div class="stats">${stat('İksirler', `${G.S.potions} / ${cap}`)}${stat('Sonraki iksir', next > 0 ? G.fmtTime(next) : 'Depo dolu')}${stat('İksir başına iyileşme', 40 + L * 10 + ' asker')}${stat('Yaralılar', G.fmt(G.totalWounded()))}</div>
        <button class="btn" style="width:100%;margin-bottom:10px" data-act="potion" ${G.S.potions ? '' : 'disabled'}>🧪 İksir kullan</button>`;
    }
  }
  const pkey = key + ':' + Math.max(1, L);
  $('sheet').innerHTML = `<div class="sh-head"><div class="sh-ico" id="shPortrait">${PORTRAIT_CACHE[pkey] ? `<img src="${PORTRAIT_CACHE[pkey]}">` : def.icon}</div><div><h2>${def.name}</h2><small>${L ? 'Seviye ' + L + ' / ' + maxLevel(key) : 'İnşa edilmedi'}</small></div><button class="x" data-act="close">✕</button></div>
    <p class="desc">${def.desc}</p>${body}<div class="divider-orn"></div>${upgradeBlock(id)}`;
  if (!PORTRAIT_CACHE[pkey]) getBuildingPortrait(key, Math.max(1, L)).then((u) => { PORTRAIT_CACHE[pkey] = u; const el = $('shPortrait'); if (el && sheetId === id) el.innerHTML = `<img src="${u}">`; });
  const sl = $('qtySlider');
  if (sl) sl.oninput = () => { trainQty = +sl.value; renderSheetSoon(); };
  const tsl = $('tankSlider');
  if (tsl) tsl.oninput = () => { tankQty = +tsl.value; renderSheetSoon(); };
}
let soon = 0;
function renderSheetSoon() { clearTimeout(soon); soon = setTimeout(renderSheet, 30); }
// Ordu kampları doluluk çubuğu (kışla, tank atölyesi ve kamp panelinde)
function campBar() {
  const have = G.armyTotal(), cap = G.armyCap(), pct = Math.min(100, have / Math.max(1, cap) * 100), full = have >= cap;
  return `<div class="campbar ${full ? 'full' : ''}"><span>🏕️ Ordu kampları</span><b>${G.fmt(have)} / ${G.fmt(cap)}</b><i style="width:${pct.toFixed(1)}%"></i></div>${full ? '<p class="desc camp-warn">Kamplar dolu! Yeni birlik eğitmek için Ordu Kampı yükselt ya da yeni kamp aç.</p>' : ''}`;
}
function campUI(L) {
  const stat = (k, v, up) => `<div class="stat"><i class="st-ic">${statIcon(k)}</i><div><small>${k}</small><b>${v}${up ? ` <span class="up">→ ${up}</span>` : ''}</b></div></div>`;
  const camps = PLOTS.filter((p) => p.key === 'camp');
  const rows = camps.map((p, i) => { const l = G.lvl(p.id); return `<div class="camp-row ${l ? '' : 'off'}"><span>🏕️ Kamp ${i + 1}</span><em>${l ? 'Sv.' + l : '🔒 Belediye Sv.' + p.reqTH}</em><b>${l ? G.fmt(campCap(l)) : '—'}</b></div>`; }).join('');
  const nx = L < maxLevel('camp') ? campCap(L + 1) : 0;
  const away = G.totalTroops(G.troopsAway()), train = (G.S.training?.n || 0) + (G.S.tankTraining?.n || 0);
  return campBar() + `<div class="stats">${stat('Bu kampın kapasitesi', G.fmt(campCap(L)), nx ? G.fmt(nx) : '')}${stat('Şehirdeki birlikler', G.fmt(G.totalTroops(G.S.troops)))}${stat('Seferdeki', G.fmt(away))}${stat('Eğitimdeki', G.fmt(train))}</div>
    <div class="camp-list">${rows}</div>`;
}
const TROOP_IMG = { infantry: 'u_infantry', spearman: 'u_spearman', archer: 'u_archer', cavalry: 'u_cavalry', tank: 'b_tank' };
const troopImg = (k) => `<img class="tp-img" src="${UI(TROOP_IMG[k])}" alt="">`;
function barracksUI() {
  const t = Date.now() / 1000;
  if (G.S.training) {
    const tr = G.S.training, pct = (t - tr.start) / (tr.end - tr.start) * 100;
    return `<p class="desc"><b>${TROOPS[tr.type].icon} ${tr.n} ${TROOPS[tr.type].name}</b> eğitiliyor…</p>
      <div class="progress green"><span style="width:${pct}%"></span><em>${G.fmtTime(tr.end - t)}</em></div>
      <button class="btn speedbtn" style="width:100%;margin-bottom:8px" data-act="spd" data-tg="train">⏩ Hızlandır ${spCountTxt()}</button>
      <button class="btn gold" style="width:100%;margin-bottom:10px" data-act="speedtrain">⚡ Hemen bitir • 🪙 ${G.gemCostForTime(tr.end - t)}</button>`;
  }
  const room = G.campRoom(), max = Math.max(1, Math.min(G.trainBatchMax(), room));
  trainQty = clamp(trainQty, 1, max);
  let cards = '';
  if (TROOPS[trainSel].building) trainSel = 'infantry';
  for (const k in TROOPS) {
    if (TROOPS[k].building) continue;
    const d = TROOPS[k], un = G.troopUnlocked(k);
    cards += `<div class="troop tp ${k === trainSel ? 'sel' : ''} ${un ? '' : 'locked'}" data-troop="${k}">${troopImg(k)}<span class="tp-n">${d.short}</span><small>${un ? G.fmt(G.S.troops[k]) : '🔒 Kışla ' + d.reqBarracks}</small></div>`;
  }
  const d = TROOPS[trainSel], cost = G.trainCost(trainSel, trainQty), time = d.time * trainQty / G.trainSpeed();
  return campBar() + `<div class="troops">${cards}</div>
    <div class="tp-card">${troopImg(trainSel)}<div><b>${d.name}</b><p>${d.desc}</p><div class="tp-st"><span>⚔️ ${d.atk}</span><span>🛡️ ${d.def}</span><span>❤️ ${d.hp}</span><span>🎒 ${d.load}</span></div></div></div>
    <div class="qty"><span>Miktar</span><span>${trainQty} / ${max}</span></div>
    <input id="qtySlider" class="slider" type="range" min="1" max="${max}" value="${trainQty}">
    <div class="cost">${costHtml(cost)}<span>⏱ ${G.fmtTime(time)}</span></div>
    <button class="btn red" style="width:100%;margin-bottom:10px" data-act="train" ${G.troopUnlocked(trainSel) && G.canAfford(cost) && room > 0 ? '' : 'disabled'}>⚔ Eğit</button>`;
}
let tankQty = 2;
function tankyardUI() {
  const t = Date.now() / 1000, d = TROOPS.tank;
  let s = `<div class="stats"><div class="stat"><small>Tanklarım</small><b>${G.fmt(G.S.troops.tank || 0)}</b> <small style="display:inline;color:#ffaa8a">🤕 ${G.S.wounded.tank || 0}</small></div><div class="stat"><small>Parti / Hız</small><b>${G.tankBatchMax()} • x${G.tankSpeed().toFixed(2)}</b></div></div>`;
  if (G.S.tankTraining) {
    const tr = G.S.tankTraining, pct = (t - tr.start) / (tr.end - tr.start) * 100;
    return s + `<p class="desc"><b>${d.icon} ${tr.n} ${d.name}</b> üretiliyor…</p>
      <div class="progress green"><span style="width:${pct}%"></span><em>${G.fmtTime(tr.end - t)}</em></div>
      <button class="btn speedbtn" style="width:100%;margin-bottom:8px" data-act="spd" data-tg="tank">⏩ Hızlandır ${spCountTxt()}</button>
      <button class="btn gold" style="width:100%;margin-bottom:10px" data-act="speedtank">⚡ Hemen bitir • 🪙 ${G.gemCostForTime(tr.end - t)}</button>`;
  }
  const room = G.campRoom(), max = Math.max(1, Math.min(G.tankBatchMax(), room)); tankQty = clamp(tankQty, 1, max); s += campBar();
  const cost = G.trainCost('tank', tankQty), time = d.time * tankQty / G.tankSpeed();
  return s + `<div class="tankcard"><img src="assets/ui/b_tank.webp" alt=""><div><b>${d.name}</b><br>${d.desc}<br><small>⚔ ${d.atk} &nbsp; 🛡 ${d.def} &nbsp; ❤ ${d.hp} &nbsp; 🎒 ${d.load}</small></div></div>
    <div class="qty"><span>Miktar</span><span>${tankQty} / ${max}</span></div>
    <input id="tankSlider" class="slider" type="range" min="1" max="${max}" value="${tankQty}">
    <div class="cost">${costHtml(cost)}<span>⏱ ${G.fmtTime(time)}</span></div>
    <button class="btn red" style="width:100%;margin-bottom:10px" data-act="traintank" ${G.canAfford(cost) && room > 0 ? '' : 'disabled'}>⚙️ Tank üret</button>`;
}
function academyUI() {
  const t = Date.now() / 1000, cur = G.S.research.cur;
  let s = '';
  if (cur) {
    const pct = (t - cur.start) / (cur.end - cur.start) * 100, R = RESEARCH[cur.key];
    s += `<p class="desc"><b>${R.icon} ${R.name} Sv.${(G.S.research.levels[cur.key] || 0) + 1}</b> araştırılıyor…</p>
      <div class="progress"><span style="width:${pct}%"></span><em>${G.fmtTime(cur.end - t)}</em></div>
      <button class="btn speedbtn" style="width:100%;margin-bottom:8px" data-act="spd" data-tg="research">⏩ Hızlandır ${spCountTxt()}</button>
      <button class="btn gold" style="width:100%;margin-bottom:10px" data-act="speedres">⚡ Hemen bitir • 🪙 ${G.gemCostForTime(cur.end - t)}</button>`;
  }
  for (const k in RESEARCH) {
    const R = RESEARCH[k], lv = G.S.research.levels[k] || 0, c = G.canResearch(k);
    const cost = lv < RESEARCH_MAX ? researchCost(k, lv + 1) : null;
    s += `<div class="rsch"><span class="ri">${R.icon}</span><div class="rt"><b>${R.name}</b> <span class="stars">${'●'.repeat(lv)}${'○'.repeat(RESEARCH_MAX - lv)}</span><br>${R.desc}: <b style="color:#7dff9a">+${lv * R.per}${R.unit}</b>${cost ? ` → +${(lv + 1) * R.per}${R.unit}<br><span class="cost" style="margin:2px 0 0;font-size:11.5px">${costHtml(cost)}</span>` : ''}${!c.ok && lv < RESEARCH_MAX && !cur ? `<br><span style="color:#ffb0a0;font-size:11px">${c.why}</span>` : ''}</div>
      ${lv < RESEARCH_MAX ? `<button class="btn blue" data-act="research" data-k="${k}" ${c.ok ? '' : 'disabled'}>🔬</button>` : '<span>✨</span>'}</div>`;
  }
  return s + '<div style="height:6px"></div>';
}
function hospitalUI() {
  const t = Date.now() / 1000, cap = G.hospitalCap(), w = G.totalWounded();
  let s = `<div class="stats"><div class="stat"><small>Yaralılar</small><b>${G.fmt(w)} / ${G.fmt(cap)}</b></div><div class="stat"><small>İksir</small><b>🧪 ${G.S.potions}</b></div></div>`;
  s += `<div class="troops t5">${Object.keys(TROOPS).map((k) => `<div class="troop tp">${troopImg(k)}<span class="tp-n">${TROOPS[k].short}</span><small>🤕 ${G.S.wounded[k]}</small></div>`).join('')}</div>`;
  if (G.S.healing) {
    const hl = G.S.healing, pct = (t - hl.start) / (hl.end - hl.start) * 100;
    s += `<div class="progress green"><span style="width:${pct}%"></span><em>💚 ${G.totalTroops(hl.counts)} asker iyileşiyor • ${G.fmtTime(hl.end - t)}</em></div><button class="btn speedbtn" style="width:100%;margin-bottom:8px" data-act="spd" data-tg="heal">⏩ Hızlandır ${spCountTxt()}</button>`;
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
  const gb = e.target.closest('[data-gobld]');
  if (gb) { const pl = PLOTS.filter((q) => q.key === gb.dataset.gobld).sort((x, y) => G.lvl(x.id) - G.lvl(y.id))[0]; if (pl) { openBuilding(pl.id); focusOn(pl.x, pl.z); } return; }
  const a = e.target.closest('[data-act]'); if (!a) return;
  const act = a.dataset.act, id = sheetId;
  if (act === 'research') { const r = G.startResearch(a.dataset.k); if (!r.ok) toast(r.why, true); else { toast('🔬 Araştırma başladı'); sfx('build'); } }
  if (act === 'speedres') { if (!G.speedResearch()) needGold(); else sfx('coin'); }
  if (act === 'close') return closeSheet();
  if (act === 'upgrade') { const r = G.startUpgrade(id); if (!r.ok) toast(r.why, true); else { toast('🔨 İnşaat başladı'); sfx('build'); refreshPlot(id); tutEvent('upgrade'); } }
  if (act === 'speed') { if (G.speedUp(id)) { sfx('coin'); tutEvent('speed'); } else needGold(); }
  if (act === 'collect') doCollect(id);
  if (act === 'spd') { openSpeed(a.dataset.tg); return; }
  if (act === 'train') { const r = G.startTraining(trainSel, trainQty); if (!r.ok) toast(r.why, true); else { toast('⚔ Eğitim başladı'); sfx('train'); tutEvent('train'); } }
  if (act === 'speedtrain') { if (!G.speedTraining()) needGold(); }
  if (act === 'traintank') { const r = G.startTankTraining(tankQty); if (!r.ok) toast(r.why, true); else { toast('⚙️ Tank üretimi başladı'); sfx('build'); } }
  if (act === 'speedtank') { if (!G.speedTankTraining()) needGold(); }
  if (act === 'heal') { const r = G.startHealing(); if (!r.ok) toast(r.why, true); else { toast('💚 İyileştirme başladı'); sfx('heal'); } }
  if (act === 'potion') { const r = G.usePotion(); if (!r.ok) toast(r.why, true); else toast(`🧪 ${r.healed || ''} asker iyileşti`); }
  renderSheet(); updateTop(); updateLabels(true);
});
document.addEventListener('input', (e) => { if (e.target.id === 'alSearch') { AL.q = e.target.value; const q = AL.q.toLowerCase(); document.querySelectorAll('.al-card').forEach((c) => { c.style.display = !q || c.dataset.alk.includes(q) ? '' : 'none'; }); } });
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'alChatIn') document.querySelector('[data-alsend]')?.click(); });
function needGold() { toast('Yetersiz altın', true); setTimeout(() => navigate('shop'), 500); }

// ---------------------------------------------------------------------
//  Modallar: dünya, kahramanlar, mağaza, raporlar, profil
// ---------------------------------------------------------------------
export function openModal(html) {
  const box = $('modalBox');
  if (html.includes('<!--/head-->')) { const [h, b] = html.split('<!--/head-->'); html = h + `<div class="w-body">${PENDING_SIDE}<div class="w-main">${b}</div></div>`; box.classList.add('win'); }
  else box.classList.remove('win');
  PENDING_SIDE = '';
  box.innerHTML = html; $('modal').classList.add('open');
}
let PENDING_SIDE = '';
const UI = (n) => `assets/ui/${n}.webp`;
const ICON_MAP = { '🗺️': 'nav_world', '⚔️': 'nav_heroes', '🛡️': 'nav_heroes', '🪙': 'res_gold', '📜': 'nav_reports', '⚜': 'nav_city', '📋': 'nav_quest', '🏆': 'ic_trophy', '📅': 'ic_calendar' };
const resImg = (r, sz = 18) => `<img src="${UI('res_' + r)}" width="${sz}" height="${sz}" alt="">`;
const pill = (r, v) => `<span class="w-pill">${resImg(r)}+${G.fmt(v)}</span>`;
function tabsHtml(tabs, active) { return `<aside class="w-side">${tabs.map((t) => `<button class="w-tab ${t.id === active ? 'on' : ''}" data-wtab="${t.id}"><img src="${UI(t.icon)}" alt=""><span>${t.label}</span>${t.dot ? '<em class="dot"></em>' : ''}</button>`).join('')}</aside>`; }
export function closeModal() { alStopChat(); lastModalKey = ''; $('modal').classList.remove('open'); $('modalBox').innerHTML = ''; setNav('city'); }
$('modal').addEventListener('pointerdown', (e) => { if (e.target.id === 'modal') closeModal(); });
function setNav(go) { document.querySelectorAll('nav button').forEach((b) => b.classList.toggle('on', b.dataset.go === go)); }
document.querySelectorAll('nav button, #rside .rbtn').forEach((b) => b.addEventListener('click', () => navigate(b.dataset.go)));
$('goldBtn').onclick = (e) => { e.stopPropagation(); shopTab = 'gold'; navigate('shop'); };
document.querySelectorAll('#top .res[data-r]').forEach((el) => (el.onclick = () => { shopTab = 'res'; navigate('shop'); }));
$('profileBtn').onclick = () => navigate('profile');
$('chipTroops').onclick = () => navigate('army');
$('chipRaid').onclick = () => toast('Düşman yaklaşıyor! Asker eğit ve kulelerini güçlendir.');

let modalKind = '', worldSel = null, heroTab = 'mine';
export function navigate(go) {
  closeSheet();
  setNav(go);
  if (go === 'city') { closeModal(); return; }
  if (go === 'events') { questTab = 'daily'; go = 'quests'; }

  if (go === 'summon') { closeModal(); setNav('summon'); openSummon(); tutEvent('summonOpen'); return; }
  if (go === 'alliance') { closeModal(); setNav('alliance'); sfx('open'); openAlliance(); return; }
  if (go === 'world') { tutEvent('worldOpen'); if (G.S.tut === 'done') { closeModal(); setNav('world'); sfx('open'); openWorldMap(); return; } }
  sfx('open');
  modalKind = go;
  renderModal();
}
function head(title, icon, tabs, active) {
  const ic = ICON_MAP[icon] || icon || 'ic_gift';
  PENDING_SIDE = tabs ? tabsHtml(tabs, active) : '';
  return `<div class="w-head"><div class="w-medal"><img src="${UI(ic)}" alt=""></div><div class="w-plaque"><i class="laurel l"></i><span>${title}</span><i class="laurel r"></i></div></div><button class="w-x" data-m="close">✕</button><!--/head-->`;
}
let lastModalKey = '';
function renderModal() {
  const key = modalKind + ':' + questTab + ':' + heroTab + ':' + shopTab + ':' + profTab;
  const keep = key === lastModalKey && $('modal').classList.contains('open');
  const sc = $('modalBox').querySelector('.w-main'), y = keep && sc ? sc.scrollTop : 0;
  lastModalKey = key;
  renderModalInner();
  const sc2 = $('modalBox').querySelector('.w-main'); if (sc2 && y) sc2.scrollTop = y;
}
function renderModalInner() {
  const k = modalKind;
  if (k === 'world') return openModal(worldUI());
  if (k === 'heroes') { openModal(heroesUI()); return; }
  if (k === 'shop') return openModal(shopUI());
  if (k === 'reports') { G.S.reportsSeen = G.S.reports.length ? G.S.reports[0].t : 0; G.save(); $('repDot').classList.add('hidden'); return openModal(reportsUI()); }
  if (k === 'profile') return openModal(profileUI());
  if (k === 'army') return openModal(armyUI());
  if (k === 'quests') return openModal(questsUI());
  if (k === 'ranking') return openModal(rankingUI());
  if (k === 'login') return openModal(loginUI());
  if (k === 'attack') return openModal(attackUI());
  if (k === 'scout') return openModal(scoutUI(scoutRep));
  if (k === 'speed') return openModal(speedUI());
  if (k === 'offers') return openModal(offersUI());
  if (k === 'alliance') return openModal(allianceUI());
}
const allEnemies = () => G.S.enemies.concat(G.ONLINE.enemies);
function worldUI() {
  refreshRivals();
  const e = worldSel && allEnemies().find((q) => q.id === worldSel);
  const my = G.cityPower();
  let kds = `<div class="kd me" style="left:50%;top:50%"><span class="ki">🏰</span><span class="kp">${G.S.name}</span></div>`;
  for (const q of allEnemies()) {
    const sh = q.shieldUntil > Date.now() / 1000;
    kds += `<div class="kd ${q.id === worldSel ? 'sel' : ''} ${sh ? 'shield' : ''} ${q.real ? 'real' : ''}" data-k="${q.id}" style="left:${q.x * 100}%;top:${q.y * 100}%"><span class="ki">${q.real ? '🌐' : q.power > my * 1.3 ? '🏯' : '🏘️'}</span><span class="kp">${q.name}</span></div>`;
  }
  let lines = '';
  for (const q of allEnemies()) lines += `<line x1="50%" y1="50%" x2="${q.x * 100}%" y2="${q.y * 100}%" stroke="rgba(255,240,200,.15)" stroke-width="1.5" stroke-dasharray="4 5"/>`;
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
    <p class="demo">${online.ready ? `🌐 Çevrimiçi • Haritada ${G.ONLINE.enemies.length} gerçek oyuncu (🌐) ve bilgisayar krallıkları var.` : online.failed ? '⚠️ Sunucuya bağlanılamadı; bilgisayar krallıklarıyla oynuyorsun.' : 'Sunucuya bağlanılıyor…'}</p>`;
}
let atk = { troops: {}, heroes: [] };
function attackUI() {
  const e = G.findEnemy(worldSel);
  if (!e) return worldUI();
  if (!atk.init) { atk = { init: true, troops: {}, heroes: G.S.heroes[G.S.commander] ? [G.S.commander] : [] }; for (const t in TROOPS) atk.troops[t] = Math.floor(G.S.troops[t] * 0.8); }
  const owned = Object.keys(G.S.heroes).map((id) => HERO_BY_ID[id]).sort((a, b) => b.rarity - a.rarity || G.S.heroes[b.id].level - G.S.heroes[a.id].level);
  const slots = Array.from({ length: G.MAX_COMMANDERS }, (_, i) => {
    const id = atk.heroes[i];
    if (!id) return `<div class="cmd-slot empty"><span>＋</span></div>`;
    const h = HERO_BY_ID[id];
    return `<div class="cmd-slot" style="--rc:${RARITY[h.rarity].color}" data-cmdpick="${id}"><img src="assets/heroes/${id}_a.webp" alt="">${i === 0 ? '<em class="crown">👑</em>' : ''}<b>Sv.${G.S.heroes[id].level}</b><i>✕</i></div>`;
  }).join('');
  const pool = owned.map((h) => `<button class="cmd-pick ${atk.heroes.includes(h.id) ? 'on' : ''}" style="--rc:${RARITY[h.rarity].color}" data-cmdpick="${h.id}"><img src="assets/heroes/${h.id}_a.webp" alt=""><span>${h.name.split(' ').pop()}</span><small>${'★'.repeat(h.rarity)}</small></button>`).join('');
  let rows = '';
  for (const t in TROOPS) {
    const max = G.S.troops[t], v = Math.min(atk.troops[t] || 0, max);
    rows += `<div class="tr-row ${max ? '' : 'off'}"><div class="tr-top"><span class="tr-ic">${TROOPS[t].icon}</span><b>${TROOPS[t].name}</b><span class="tr-n">${G.fmt(v)} <small>/ ${G.fmt(max)}</small></span></div>
      <div class="tr-ctl"><input class="slider" type="range" min="0" max="${max}" value="${v}" data-slider="${t}" ${max ? '' : 'disabled'}>
      <button class="tq" data-tq="${t}:0">0</button><button class="tq" data-tq="${t}:half">½</button><button class="tq" data-tq="${t}:all">Tümü</button></div></div>`;
  }
  const tot = G.totalTroops(atk.troops), myP = G.armyPowerMulti(atk.troops, atk.heroes), better = myP >= e.power;
  return head('Sefer Kampı', '⚔️') + `
    <div class="w-banner camp-banner"><div><div class="bt">${e.name}</div><div class="bs">Lord ${e.lord} • ⚔ ${G.fmt(e.power)}</div></div></div>
    <div class="w-card"><div class="camp-h"><b>Komutanlar</b><span>${atk.heroes.length} / ${G.MAX_COMMANDERS}</span></div>
      <div class="cmd-slots">${slots}</div>
      <div class="cmd-pool">${pool || '<p class="desc">Henüz kahramanın yok.</p>'}</div>
      <p class="camp-note">İlk komutan 👑 tam bonus verir, diğerleri azalan oranda (%50, %35, %25, %20) katkı sağlar.</p></div>
    <div class="w-card"><div class="camp-h"><b>Birlikler</b><span>${G.fmt(tot)} asker</span></div>
      <div class="row" style="margin-bottom:8px"><button class="w-btn" data-tall="none">Temizle</button><button class="w-btn" data-tall="half">Yarısı</button><button class="w-btn gold" data-tall="all">Hepsini seç</button></div>
      ${rows}</div>
    <div class="stats"><div class="stat"><small>Ordu gücün</small><b style="color:${better ? '#7dff9a' : '#ffb08a'}">⚔ ${G.fmt(myP)}</b></div><div class="stat"><small>Düşman gücü</small><b>⚔ ${G.fmt(e.power)}</b></div></div>
    <div class="row"><button class="btn gray" data-m="world">Geri</button><button class="btn red" data-m="march" ${tot ? '' : 'disabled'}>🚩 Yürüyüşe çık</button></div>`;
}
let questTab = 'main';
const rewardTxt = (r) => Object.entries(r).filter(([k]) => RES[k]).map(([k, v]) => `${RES[k].icon} ${G.fmt(v)}`).join('  ') + (r._items ? '  ' + r._items.map((it) => `⏩ ${SPEEDUPS[it.id].short}${it.n > 1 ? ' ×' + it.n : ''}`).join('  ') : '');
// Ödül alındığında: kaynak bildirimi + büyük hızlandırma çıktıysa özel kutlama
function rewardFx(r, icon = '🎉') {
  toast(icon + ' ' + rewardTxt(r));
  const big = (r._items || []).filter((it) => SPEEDUPS[it.id].tier >= 3).sort((a, b) => SPEEDUPS[b.id].sec - SPEEDUPS[a.id].sec)[0];
  if (big) { sfx('reveal5'); showItemDrop(big); } else sfx('coin');
}
function showItemDrop(it) {
  const d = SPEEDUPS[it.id]; let el = $('itemDrop'); if (!el) { el = document.createElement('div'); el.id = 'itemDrop'; document.body.appendChild(el); }
  el.className = 'idrop t' + d.tier; el.innerHTML = `<div class="idrop-box"><div class="idrop-rays"></div>${spIcon(it.id, 120)}<b>${SPEED_TIER[d.tier]} ödül!</b><span>${d.name}${it.n > 1 ? ' ×' + it.n : ''}</span><small>Dokun ve devam et</small></div>`;
  el.onclick = () => el.classList.add('hidden'); el.classList.remove('hidden');
  clearTimeout(showItemDrop.t); showItemDrop.t = setTimeout(() => el.classList.add('hidden'), 6000);
}
// Çerçeveli avatar (özel çerçeveler animasyonlu)
const isPremFrame = (fr) => !!FRAME_BY_ID[fr] && !FRAME_BY_ID[fr].free;
export const frameHtml = (hero, fr, sz = 48) => { fr = FRAME_BY_ID[fr] ? fr : 'bronze'; const f = UI('fr_' + fr); return `<span class="fav ${isPremFrame(fr) ? 'anim fa-' + fr : ''}" style="--s:${sz}px;--m:url(${f})"><img class="fav-a" src="assets/heroes/${hero || 'emre'}_a.webp" alt=""><span class="fav-fw"><img class="fav-f" src="${f}" alt=""><i class="fav-sh"></i></span></span>`; };
// Hızlandırma simgesi: kum saati (nadirlik rengi) + süre rozeti
export const spIcon = (id, sz = 56, n) => { const d = SPEEDUPS[id]; return `<span class="sp-ic t${d.tier}" style="--sz:${sz}px"><img src="${UI('sp_t' + d.tier)}" alt=""><b>${d.short}</b>${n != null ? `<em>×${G.fmt(n)}</em>` : ''}</span>`; };
const rewardPills = (r) => Object.entries(r).map(([k, v]) => pill(k, v)).join('');
function questsUI() {
  G.dailyReset();
  let body = '';
  const qRow = (icon, text, x, y, reward, btn) => `<div class="w-row"><img src="${UI(icon)}" alt=""><div class="rt">${text}<div class="pb"><i><b style="width:${Math.min(100, x / y * 100)}%"></b></i><small>${G.fmt(x)}/${G.fmt(y)}</small></div></div><div class="w-rw">${rewardPills(reward)}<span class="w-pill sp-q ${questTab === 'daily' ? 'ev' : ''}" title="Rastgele hızlandırma"><img src="${UI(questTab === 'daily' ? 'sp_t3' : 'sp_t1')}" alt="">?</span>${btn}</div></div>`;
  if (questTab === 'main') {
    const list = G.activeQuests();
    body += `<div class="w-banner" style="background-image:url(${UI('banner_quest')})"><div><div class="bt">Krallık Görevleri</div><div class="bs">Her görev rastgele ⏩ hızlandırma verir!</div></div><span class="bt2">${Object.keys(G.S.qClaimed).length} / ${QUESTS.length}</span></div>`;
    if (!list.length) body += '<p class="desc">🏆 Tüm ana görevleri tamamladın!</p>';
    for (const q of list) {
      const [x, y] = G.questProgress(q), ok = x >= y;
      const icon = q.t[0] === 'bld' ? 'nav_city' : q.t[1] === 'wins' ? 'nav_heroes' : q.t[1] === 'summons' ? 'ic_summon' : q.t[1] === 'trained' ? 'nav_heroes' : 'nav_quest';
      body += qRow(icon, q.text, x, y, q.reward, ok ? `<button class="w-btn gold" data-claimq="${q.id}">Al</button>` : `<button class="w-btn" data-goq="${q.id}">Git</button>`);
    }
  } else if (questTab === 'daily') {
    const n = G.dailyClaimedCount();
    const steps = [1, 2, 3, DAILY_CHEST.need];
    body += `<div class="w-banner" style="background-image:url(${UI('banner_quest')})"><div><div class="bt">Günlük Görevler</div><div class="bs">${DAILY_CHEST.need} görev bitir, sandığı aç! ⏩ 24 saate kadar hızlandırma şansı</div></div><span class="bt2">⏱ ${G.fmtTime((new Date().setHours(24, 0, 0, 0) - Date.now()) / 1000)}</span></div>`;
    body += `<div class="w-card"><div class="w-track">${steps.map((st, i) => `<div class="ms ${n >= st ? 'ok' : ''}"><div class="box"><img src="${UI(i === 3 ? 'nav_shop' : i === 1 ? 'res_gold' : 'res_food')}" alt="">${i === 3 ? '' : `<small>${i === 1 ? '+30' : '+500'}</small>`}</div><div class="node">${st}</div></div>`).join('')}</div>
      <div style="text-align:center;margin-top:8px"><button class="w-btn gold" data-chest ${!G.S.daily.chest && n >= DAILY_CHEST.need ? '' : 'disabled'}>${G.S.daily.chest ? 'Sandık alındı' : `Sandığı aç (${Math.min(n, DAILY_CHEST.need)}/${DAILY_CHEST.need})`}</button></div></div>`;
    for (const d of DAILY) {
      const x = G.dailyProg(d), ok = x >= d.n, got = G.S.daily.claimed[d.id];
      const icon = { collects: 'res_food', trained: 'nav_heroes', upgrades: 'nav_city', wins: 'ic_trophy', summons: 'ic_summon', heals: 'ic_gift' }[d.stat] || 'nav_quest';
      body += qRow(icon, d.text, x, d.n, d.reward, got ? '<button class="w-btn green" disabled>✓</button>' : ok ? `<button class="w-btn gold" data-claimd="${d.id}">Al</button>` : `<button class="w-btn" data-goq="d:${d.stat}">Git</button>`);
    }
  } else body += loginBody();
  const dailyDot = DAILY.some((d) => !G.S.daily.claimed[d.id] && G.dailyProg(d) >= d.n);
  return head('Görevler', 'nav_quest', [{ id: 'main', label: 'Ana Görevler', icon: 'nav_quest', dot: G.activeQuests().some(G.questDone) }, { id: 'daily', label: 'Günlük', icon: 'ic_calendar', dot: dailyDot }, { id: 'login', label: 'Giriş Ödülü', icon: 'ic_gift', dot: G.loginPending() }], questTab) + body;
}
function loginBody() {
  const streak = G.S.login.streak || 0, pending = G.loginPending();
  const yk = (() => { const y = new Date(Date.now() - 86400000); return `${y.getFullYear()}-${y.getMonth()}-${y.getDate()}`; })();
  const nextDay = pending ? (G.S.login.last === yk ? streak % 7 : 0) : (streak - 1) % 7;
  const cells = LOGIN_REWARDS.map((r, i) => { const k = r.gold ? 'gold' : Object.keys(r)[0]; return `<div class="${i < nextDay ? 'got' : ''} ${i === nextDay ? 'today' : ''}">Gün ${i + 1}<i><img src="${UI(i === 6 ? 'nav_shop' : 'res_' + k)}" width="30" height="30" alt=""></i>${G.fmt(r[k])}</div>`; }).join('');
  return `<div class="w-banner" style="background-image:url(${UI('banner_profile')})"><div><div class="bt">Günlük Giriş</div><div class="bs">Her gün gir, 7. gün büyük ödül!</div></div></div><div class="w-card"><div class="cal" style="margin:0">${cells}</div></div>
    <button class="w-btn gold" style="width:100%;padding:12px" data-m="login" ${pending ? '' : 'disabled'}>${pending ? 'Ödülü al' : 'Yarın tekrar gel'}</button>`;
}
function loginUI() { questTab = 'login'; return questsUI(); }
function updateQuestUI() {
  const n = G.claimableCount();
  $('questDot').classList.toggle('hidden', !n);
  const q = G.activeQuests()[0];
  if (!q) { $('qCh').textContent = 'Tebrikler:'; $('qText').textContent = 'Tüm görevler tamamlandı!'; $('qNum').textContent = ''; $('qProg').style.width = '100%'; $('qPct').textContent = '100%'; return; }
  const [x, y] = G.questProgress(q), ok = x >= y, pct = Math.floor(Math.min(1, x / y) * 100);
  const ch = `Bölüm ${QUESTS.indexOf(q) + 1}:`, num = `(${G.fmt(x)}/${G.fmt(y)})`;
  if ($('qText').textContent !== q.text) $('qText').textContent = q.text;
  if ($('qCh').textContent !== ch) $('qCh').textContent = ch;
  if ($('qNum').textContent !== num) $('qNum').textContent = num;
  $('qProg').style.width = pct + '%'; $('qPct').textContent = pct + '%';
  $('qbar').classList.toggle('done', ok);
  $('qBtn').innerHTML = ok ? 'Al <s>✓</s>' : 'Git <s>»</s>';
}
$('qbar').onclick = () => {
  const q = G.activeQuests()[0];
  if (q && G.questDone(q)) { const r = G.claimQuest(q.id); if (r) { rewardFx(r); updateTop(); updateQuestUI(); } return; }
  if (q && q.t[0] === 'bld') { const p = PLOTS.find((x) => x.key === q.t[1]); if (p) { openBuilding(p.id); focusOn(p.x, p.z); return; } }
  if (q && q.t[1] === 'trained') { openBuilding('barracks'); focusOn(-17, 2); return; }
  if (q && (q.t[1] === 'wins')) return navigate('world');
  if (q && q.t[1] === 'summons') return navigate('summon');
  navigate('quests');
};
// Krallık haberleri (canlı akış)
const NEWS = [];
export function pushNews(html) { NEWS.push(html); }
function randomNews() {
  const lord = LORD_NAMES[Math.floor(Math.random() * LORD_NAMES.length)], kd = KINGDOM_NAMES[Math.floor(Math.random() * KINGDOM_NAMES.length)];
  const h = HEROES[Math.floor(Math.random() * 7)];
  const opts = [
    `<u>${lord}</u> (${kd}) <em>${'★'.repeat(h.rarity)} ${h.name}</em> çağırdı!`,
    `<u>${lord}</u> Belediye Binası'nı <em>Sv.${2 + Math.floor(Math.random() * 8)}</em> yaptı`,
    `<u>${kd}</u> ordusu <em>${KINGDOM_NAMES[Math.floor(Math.random() * KINGDOM_NAMES.length)]}</em> krallığını yağmaladı!`,
    `<u>${lord}</u> <em>${G.fmt(1000 + Math.random() * 20000)}</em> asker eğitti`,
    `Gezgin tüccar meydana geldi: <em>Mağaza'da özel teklifler!</em>`,
  ];
  return opts[Math.floor(Math.random() * opts.length)];
}
setInterval(() => {
  if (!$('newsTxt')) return;
  const html = NEWS.length ? NEWS.shift() : randomNews();
  const sp = document.createElement('span'); sp.innerHTML = html;
  const tr = $('newsTxt').parentElement; tr.innerHTML = ''; sp.id = 'newsTxt'; tr.appendChild(sp);
}, 5200);
function rankingUI() {
  const hsh = (t) => { let h = 0; for (const c of String(t)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  const freeFr = FRAMES.filter((f) => f.free), heroIds = HEROES.map((h) => h.id);
  const me = { name: G.S.name, sub: 'Sen', power: G.cityPower(), me: true, hero: G.S.commander, frame: G.S.frame, tag: G.S.alliance?.tag };
  if (online.ready && Date.now() - G.ONLINE.topAt > 60000) { G.ONLINE.topAt = Date.now(); topPlayers(50).then((l) => { G.ONLINE.top = l; if (modalKind === 'ranking') renderModal(); }); }
  const real = G.ONLINE.top.filter((p) => p.uid !== online.uid).map((p) => ({ name: p.name || 'Oyuncu', real: true, sub: 'Belediye Sv.' + (p.th || 1), power: p.power || 0, hero: p.hero?.id || heroIds[hsh(p.uid) % heroIds.length], frame: p.frame || freeFr[hsh(p.uid) % freeFr.length].id, tag: p.alliance?.tag }));
  const bots = G.S.enemies.map((e) => ({ name: e.name, sub: e.lord, power: Math.round(e.power * 1.6 + e.th * 2500), hero: heroIds[hsh(e.name) % heroIds.length], frame: freeFr[hsh(e.lord) % freeFr.length].id }));
  const list = real.concat(bots).concat([me]).sort((a, b) => b.power - a.power);
  const medal = (i) => (i < 3 ? `<i class="rk-medal m${i + 1}">${i + 1}</i>` : `<i class="rk-num">${i + 1}</i>`);
  return head('Krallık Sıralaması', '🏆') + '<div class="rk-list">' + list.map((r, i) => `<div class="rk-row ${r.me ? 'me' : ''} ${i < 3 ? 'top' + (i + 1) : ''}">
      <div class="rk-av">${frameHtml(r.hero, r.frame, 46)}${medal(i)}</div>
      <div class="rk-n"><b>${r.tag ? `<em class="rk-tag">[${r.tag}]</em> ` : ''}${r.name}${r.real ? ' <span class="rk-real">🌐</span>' : ''}</b><small>${r.sub}</small></div>
      <div class="rk-p">⚔ ${G.fmt(r.power)}</div></div>`).join('') + '</div><p class="desc" style="text-align:center;margin-top:10px">🌐 Gerçek oyuncular ve bilgisayar krallıkları birlikte sıralanır.</p>';
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
      <img src="assets/heroes/${h.id}.webp" alt="" loading="lazy"><span class="st">${stars(h.rarity)}</span>${o ? `<span class="lv">Sv.${o.level}</span>` : ''}<div class="hn">${h.name}</div></div>`;
  }).join('');
  const own = Object.keys(G.S.heroes).length;
  return head('Kahramanlar', 'nav_heroes', [{ id: 'mine', label: `Benimkiler (${own})`, icon: 'nav_heroes' }, { id: 'all', label: `Koleksiyon (${HEROES.length})`, icon: 'ic_trophy' }], heroTab) +
    `<div class="w-stats"><div class="w-stat"><img src="${UI('nav_heroes')}"><div><small>Kahraman</small><b>${own} / ${HEROES.length}</b></div></div><div class="w-stat"><img src="${UI('ic_summon')}"><div><small>5★ garantiye</small><b>${SUMMON.pity5 - G.S.pity5}</b></div></div></div>
    <div class="hgrid v2">${cards}</div>`;
}
export async function fillPortraits(root = $('modalBox')) {
  const els = [...root.querySelectorAll('[data-portrait]')];
  for (const el of els) {
    const url = await getPortrait(el.dataset.portrait);
    if (!el.isConnected) return;
    const img = new Image(); img.src = url; el.replaceWith(img);
  }
}
let shopTab = 'gold';
function speedShopHtml() {
  const pct = (tbl, k) => { const tot = tbl.reduce((a, r) => a + r[1], 0), r = tbl.find((q) => q[0] === k); return r ? (r[1] / tot * 100).toFixed(r[1] / tot < 0.01 ? 1 : 0) + '%' : '—'; };
  const owned = SPEED_ORDER.filter((k) => G.S.items[k] > 0);
  return `<div class="sp-shop">${SPEED_SHOP.map((p) => { const d = SPEEDUPS[p.id]; return `<div class="pack sp-pack t${d.tier}">${p.tag ? `<span class="tag">${p.tag}</span>` : ''}${spIcon(p.id, 74)}<b>${d.name}</b><small>Sende: ${G.fmt(G.S.items[p.id] || 0)}</small><button class="w-btn gold" style="width:100%" data-spbuy="${p.id}">🪙 ${G.fmt(p.gold)}</button></div>`; }).join('')}</div>
    <div class="w-card sp-bag"><h4>🎒 Çantam</h4>${owned.length ? `<div class="sp-bag-list">${owned.map((k) => spIcon(k, 54, G.S.items[k])).join('')}</div>` : '<p class="desc" style="margin:0">Henüz hızlandırman yok.</p>'}</div>
    <div class="w-card sp-odds"><h4>🎲 Nereden kazanılır?</h4><table><tr><th></th><th>Ana görev</th><th>Etkinlik</th></tr>${SPEED_ORDER.filter((k) => !['s2d', 's3d'].includes(k)).map((k) => `<tr><td>${spIcon(k, 30)}</td><td>${pct(DROP_QUEST, k)}</td><td>${pct(DROP_EVENT, k)}</td></tr>`).join('')}</table><p class="desc" style="margin:6px 0 0">2 ve 3 günlük hızlandırmalar yalnızca markette.</p></div>`;
}
// =====================================================================
//  İttifak
// =====================================================================
const AL_EMBLEMS = ['Aslan', 'Kurt', 'Kartal', 'Ejder', 'Kılıçlar', 'Hilal', 'Anka', 'Buz', 'Kale', 'Taç'];
const AL_COLORS = ['#c8281a', '#2a5ad8', '#2a9a3a', '#8a3ad8', '#e0a020', '#2a2a3a'];
const AL = { doc: null, list: null, chat: null, chatErr: '', unsub: null, tab: 'find', q: '', form: { name: '', tag: '', emblem: 0, color: 1, desc: '', open: true }, busy: false, err: '' };
const alEm = (e, c, sz = 46) => `<span class="al-em" style="--c:${AL_COLORS[c] || AL_COLORS[1]};--s:${sz}px"><img src="${UI('ac_' + (AL_EMBLEMS[e] ? e : 0))}" alt=""></span>`;
const alPower = (a) => Object.values(a.members || {}).reduce((t, m) => t + (m.power || 0), 0);
function alStopChat() { if (AL.unsub) { AL.unsub(); AL.unsub = null; } }
function alRerender() { if (modalKind === 'alliance' && $('modal').classList.contains('open')) { const inp = $('alChatIn'), v = inp?.value; renderModal(); if (v && $('alChatIn')) $('alChatIn').value = v; } }
// ittifak verisini sunucudan tazele; üyelik bittiyse kaydı temizle; gücümü güncelle
async function alRefresh() {
  if (!online.ready) return;
  if (G.S.alliance) {
    const a = await getAlliance(G.S.alliance.id);
    if (!a || !a.members?.[online.uid]) { AL.doc = null; G.setAlliance(null); toast('🏳️ Artık bir ittifakta değilsin'); }
    else { AL.doc = a; G.setAlliance(a); const m = a.members[online.uid], me = G.myMember(); if (Math.abs((m.power || 0) - me.power) > me.power * 0.03 || m.frame !== me.frame || m.name !== me.name || m.th !== me.th) { updateMember(a.id, me, m.role, m.joined); a.members[online.uid] = { ...m, ...me }; } }
  } else AL.list = (await listAlliances(G.S.server || 1)).sort((x, y) => alPower(y) - alPower(x));
  alRerender();
}
function openAlliance() { modalKind = 'alliance'; AL.tab = G.S.alliance ? 'main' : 'find'; lastModalKey = ''; renderModal(); alRefresh(); }
function alTabs() { return G.S.alliance ? [{ id: 'main', label: 'İttifakım', icon: 'ic_alliance' }, { id: 'members', label: 'Üyeler', icon: 'nav_heroes' }, { id: 'chat', label: 'Sohbet', icon: 'nav_quest' }] : [{ id: 'find', label: 'İttifak Ara', icon: 'nav_world' }, { id: 'create', label: 'İttifak Kur', icon: 'ic_alliance' }]; }
function allianceUI() {
  const H = (b) => head('İttifak', 'ic_alliance', alTabs(), AL.tab) + b;
  if (!online.ready) return H(`<div class="al-off">🌐 İttifak özellikleri için çevrimiçi olmalısın.<br><small>${online.failed ? 'Sunucuya bağlanılamadı.' : 'Bağlanılıyor…'}</small></div>`);
  const ban = `<div class="w-banner al-ban" style="background-image:url(${UI('banner_alliance')})"><div><div class="bt">İttifaklar</div><div class="bs">Birlikte daha güçlüyüz</div></div></div>`;
  if (!G.S.alliance) {
    if (AL.tab === 'create') {
      const f = AL.form;
      return H(ban + `<div class="al-form">
        <div class="al-prev">${alEm(f.emblem, f.color, 64)}<div><b>${f.tag ? `[${f.tag}] ` : ''}${f.name || 'İttifak adı'}</b><small>Lider: ${G.S.name}</small></div></div>
        <label>İttifak adı</label><input id="alName" maxlength="20" value="${f.name.replace(/"/g, '')}" placeholder="ör. Demir Kurtlar">
        <label>Etiket (2–4 harf)</label><input id="alTag" maxlength="4" value="${f.tag}" placeholder="ör. DMR" style="text-transform:uppercase">
        <label>Arma</label><div class="al-pick em">${AL_EMBLEMS.map((e, i) => `<button class="${i === f.emblem ? 'on' : ''}" data-alem="${i}" title="${e}"><img src="${UI('ac_' + i)}" alt=""></button>`).join('')}</div>
        <label>Renk</label><div class="al-pick col">${AL_COLORS.map((c, i) => `<button class="${i === f.color ? 'on' : ''}" data-alcol="${i}" style="background:${c}"></button>`).join('')}</div>
        <label>Açıklama</label><textarea id="alDesc" maxlength="140" rows="2" placeholder="İttifakını tanıt…">${f.desc.replace(/</g, '')}</textarea>
        <label class="al-chk"><input type="checkbox" id="alOpen" ${f.open ? 'checked' : ''}> Herkes katılabilir (açık ittifak)</label>
        ${AL.err ? `<div class="why">${AL.err}</div>` : ''}
        <button class="w-btn gold al-go" data-alcreate ${AL.busy ? 'disabled' : ''}>🛡️ İttifak kur • 🪙 ${G.ALLIANCE_COST}</button></div>`);
    }
    const q = AL.q.toLowerCase(), list = (AL.list || []).filter((a) => !q || a.name.toLowerCase().includes(q) || a.tag.toLowerCase().includes(q));
    return H(ban + `<input class="al-search" id="alSearch" placeholder="🔍 İttifak adı ya da etiketi" value="${AL.q.replace(/"/g, '')}">
      ${AL.list === null ? '<div class="al-off">Yükleniyor…</div>' : !list.length ? `<div class="al-off">Bu sunucuda henüz ittifak yok.<br><button class="w-btn gold" data-wtab="create" style="margin-top:10px">🛡️ İlk ittifakı sen kur!</button></div>`
        : `<div class="al-list">${list.map((a) => { const n = Object.keys(a.members || {}).length, ld = a.members?.[a.leader]?.name || '-'; return `<div class="al-card" data-alk="${(a.tag + ' ' + a.name).toLowerCase().replace(/"/g, '')}">${alEm(a.emblem, a.color)}<div class="al-ci"><b>[${a.tag}] ${a.name}</b><small>👑 ${ld} • 👥 ${n}/${ALLIANCE_MAX}</small><small>⚔ ${G.fmt(alPower(a))}${a.desc ? ' • ' + a.desc.replace(/</g, '') : ''}</small></div>${a.open && n < ALLIANCE_MAX ? `<button class="w-btn green" data-aljoin="${a.id}" ${AL.busy ? 'disabled' : ''}>Katıl</button>` : `<span class="al-closed">${n >= ALLIANCE_MAX ? 'Dolu' : '🔒 Kapalı'}</span>`}</div>`; }).join('')}</div>`}`);
  }
  const a = AL.doc, me = online.uid, lead = a && a.leader === me;
  if (!a) return H('<div class="al-off">Yükleniyor…</div>');
  const mem = Object.entries(a.members || {}).sort((x, y) => (y[1].role === 'leader') - (x[1].role === 'leader') || (y[1].power || 0) - (x[1].power || 0));
  if (AL.tab === 'members') return H(`<div class="al-mh">👥 ${mem.length}/${ALLIANCE_MAX} üye • ⚔ ${G.fmt(alPower(a))}</div><div class="al-mem">${mem.map(([u, m]) => `<div class="al-mrow ${u === me ? 'me' : ''}">${frameHtml(m.hero, m.frame, 42)}<div class="al-mi"><b>${m.role === 'leader' ? '👑 ' : ''}${(m.name || 'Oyuncu').replace(/</g, '')}${u === me ? ' <small>(sen)</small>' : ''}</b><small>Belediye Sv.${m.th || 1} • ⚔ ${G.fmt(m.power || 0)}</small></div>${lead && u !== me ? `<button class="w-btn red" data-alkick="${u}">Çıkar</button>` : ''}</div>`).join('')}</div>`);
  if (AL.tab === 'chat') {
    if (!AL.unsub) { AL.chat = null; AL.unsub = watchChat(a.id, (msgs, err) => { if (msgs) AL.chat = msgs; else AL.chatErr = err; alRerender(); const box = $('alChat'); if (box) box.scrollTop = box.scrollHeight; }); }
    const tm = (t) => new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    return H(`<div class="al-chat" id="alChat">${AL.chatErr ? `<div class="why">${AL.chatErr}</div>` : AL.chat === null ? '<div class="al-off">Yükleniyor…</div>' : !AL.chat.length ? '<div class="al-off">Henüz mesaj yok. İlk mesajı sen yaz! 👋</div>'
      : AL.chat.map((m) => `<div class="al-msg ${m.uid === me ? 'me' : ''}">${frameHtml(m.hero, m.frame, 32)}<div class="al-bub"><b>${(m.name || '').replace(/</g, '')} <small>${tm(m.t)}</small></b><span>${String(m.text).replace(/</g, '&lt;')}</span></div></div>`).join('')}</div>
      <div class="al-send"><input id="alChatIn" maxlength="300" placeholder="Mesaj yaz…"><button class="w-btn gold" data-alsend>Gönder</button></div>`);
  }
  return H(`<div class="al-head">${alEm(a.emblem, a.color, 78)}<div><b>[${a.tag}] ${a.name}</b><small>👑 Lider: ${(a.members?.[a.leader]?.name || '-').replace(/</g, '')}</small><small>${a.open ? '🔓 Açık' : '🔒 Kapalı'} • Sunucu #${a.server}</small></div></div>
    <div class="al-stats"><div><small>Üyeler</small><b>👥 ${mem.length}/${ALLIANCE_MAX}</b></div><div><small>Toplam güç</small><b>⚔ ${G.fmt(alPower(a))}</b></div></div>
    <div class="al-desc">${a.desc ? a.desc.replace(/</g, '') : '<i>Açıklama yok</i>'}</div>
    ${lead ? `<div class="al-lead"><textarea id="alEditDesc" maxlength="140" rows="2" placeholder="Açıklamayı düzenle…">${(a.desc || '').replace(/</g, '')}</textarea><div class="row"><button class="w-btn" data-alsave>💾 Kaydet</button><button class="w-btn" data-altoggle>${a.open ? '🔒 Kapalı yap' : '🔓 Açık yap'}</button></div></div>` : ''}
    <p class="desc al-note">🤝 Müttefiklerin haritada yeşil halkayla görünür ve onlara saldırılamaz.</p>
    <button class="w-btn red al-go" data-alleave>🏳️ ${lead && mem.length === 1 ? 'İttifakı dağıt' : 'İttifaktan ayrıl'}</button>`);
}
async function alAction(fn) { if (AL.busy) return; AL.busy = true; AL.err = ''; alRerender(); try { await fn(); } finally { AL.busy = false; alRerender(); } }
// ---- Teklif paketleri ----
function offersUI() {
  const chip = (img, txt, cls = '') => `<span class="of-it ${cls}">${img}<b>${txt}</b></span>`;
  const cards = OFFERS.map((o) => {
    const left = G.offerLeft(o), items = [];
    if (o.hero5) items.push(chip('<img src="' + UI('ic_summon') + '" alt="">', `${o.hero5}× 5★ Kahraman`, 'hero'));
    for (const f of o.frames || []) items.push(chip(`<img class="of-fr" src="${UI('fr_' + f)}" alt="">`, FRAME_BY_ID[f].name + ' çerçevesi', 'frame'));
    for (const k of SPEED_ORDER.slice().reverse()) if (o.items?.[k]) items.push(chip(spIcon(k, 34), `${o.items[k]}× ${SPEEDUPS[k].short}`));
    if (o.gold) items.push(chip(resImg('gold', 30), G.fmt(o.gold)));
    for (const r in o.res || {}) items.push(chip(resImg(r, 30), G.fmt(o.res[r])));
    return `<div class="of-card t${o.tier} ${left ? '' : 'done'}">${o.tag ? `<span class="of-tag">${o.tag}</span>` : ''}
      <div class="of-head"><b>${o.name}</b><small>${left ? `Kalan: ${left}/${o.limit}` : 'Satın alındı'}</small></div>
      <div class="of-items">${items.join('')}</div>
      <button class="w-btn gold of-buy" data-offer="${o.id}" ${left ? '' : 'disabled'}>${left ? o.price : '✓ Alındı'}</button></div>`;
  }).join('');
  return head('Teklifler', 'ic_gift') + `<div class="w-banner" style="background-image:url(${UI('banner_shop')})"><div><div class="bt">Kraliyet Teklifleri</div><div class="bs">Kahraman, hızlandırma ve özel çerçeveler</div></div></div>
    <div class="of-list">${cards}</div><p class="demo">⚠️ Demo mağaza: gerçek ödeme alınmaz, içerik ücretsiz eklenir.</p>`;
}
function shopUI() {
  let body = `<div class="w-banner" style="background-image:url(${UI('banner_shop')})"><div><div class="bt">Kraliyet Hazinesi</div><div class="bs">Altın paketleri ve kaynaklar</div></div></div>`;
  if (shopTab === 'gold') body += `<div class="shop">${SHOP.map((p) => `<div class="pack">${p.tag ? `<span class="tag">${p.tag}</span>` : ''}<div class="pg"><img src="${UI('res_gold')}" width="54" height="54" alt=""></div><b>${G.fmt(p.gold)}</b>${p.bonus ? `<small>+${p.bonus} bonus</small>` : '<small>&nbsp;</small>'}<button class="w-btn gold" style="width:100%" data-buy="${p.id}">${p.price}</button></div>`).join('')}</div>`;
  else if (shopTab === 'speed') body += speedShopHtml();
  else body += `<div class="shop">${RES_PACKS.map((p) => `<div class="pack"><div class="pg">${Object.keys(p.res).map((r) => resImg(r, 34)).join('')}</div><b style="font-size:14px">${Object.values(p.res).map((v) => G.fmt(v)).join(' / ')}</b><button class="w-btn" style="width:100%" data-rbuy="${p.id}">${resImg('gold')} ${p.gold}</button></div>`).join('')}</div>`;
  body += '<p class="demo">⚠️ Demo mağaza: gerçek ödeme alınmaz, altın ücretsiz eklenir.</p>';
  return head('Mağaza', 'nav_shop', [{ id: 'gold', label: 'Altın', icon: 'res_gold' }, { id: 'speed', label: 'Hızlandır', icon: 'sp_t4' }, { id: 'res', label: 'Kaynak', icon: 'res_wood' }], shopTab) + body;
}
function reportsUI() {
  if (!G.S.reports.length) return head('Savaş Raporları', '📜') + '<p class="desc">Henüz savaş yok. Dünya haritasından bir krallığa saldır!</p>';
  const tot = (o) => G.fmt(G.totalTroops(o || {}));
  const ago = (t) => { const s = Date.now() / 1000 - t; return s < 60 ? 'az önce' : s < 3600 ? Math.floor(s / 60) + ' dk önce' : Math.floor(s / 3600) + ' sa önce'; };
  return head('Savaş Raporları', '📜') + G.S.reports.map((r, i) => r.kind === 'scout' ? `<div class="rep scout ${r.failed ? 'lose' : ''}" data-scoutrep="${i}"><span class="t">${ago(r.t)}</span>
    <b>👁 Gözetleme: ${r.failed ? 'BAŞARISIZ' : 'RAPOR'}</b> — ${r.enemy}
    <div class="ln">${r.failed ? r.why : `Yağmalanabilir: 🌾${G.fmt(r.loot.food)} 🪵${G.fmt(r.loot.wood)} 🪨${G.fmt(r.loot.stone)} • Asker: ${tot(r.troops)} • <u>Ayrıntılar ›</u>`}</div></div>` : `<div class="rep ${r.win ? '' : 'lose'}"><span class="t">${ago(r.t)}</span>
    <b>${r.kind === 'attack' ? '⚔ Saldırı' : '🛡️ Savunma'}: ${r.win ? 'ZAFER' : 'YENİLGİ'}</b> — ${r.enemy}
    <div class="ln">Kayıpların: ${tot(r.aLoss)} (🤕 ${tot(r.wounded)} yaralı, 💀 ${tot(r.dead)} ölü) • Düşman kaybı: ${tot(r.dLoss)}</div>
    ${r.kind === 'attack' && r.win ? `<div class="ln">Ganimet: 🌾${G.fmt(r.loot.food || 0)} 🪵${G.fmt(r.loot.wood || 0)} 🪨${G.fmt(r.loot.stone || 0)}${r.zombie ? '' : ' 🪙' + (r.loot.gold || 0)}${r.items ? ' ' + r.items.map((it) => `⏩${SPEEDUPS[it.id].short}${it.n > 1 ? '×' + it.n : ''}`).join(' ') : ''}</div>` : ''}
    ${r.kind === 'defense' && !r.win ? `<div class="ln">Yağmalanan: 🌾${G.fmt(r.loot.food || 0)} 🪵${G.fmt(r.loot.wood || 0)} 🪨${G.fmt(r.loot.stone || 0)}</div>` : ''}</div>`).join('');
}
// ---- Hızlandırma penceresi ----
let speedTarget = null;
const spTotal = () => SPEED_ORDER.reduce((a, k) => a + (G.S.items[k] || 0), 0);
const spCountTxt = () => { const n = spTotal(); return n ? `<small class="spn">${G.fmt(n)}</small>` : ''; };
const SP_NAMES = { train: 'Asker eğitimi', tank: 'Tank üretimi', research: 'Araştırma', heal: 'İyileştirme' };
function openSpeed(tg) { speedTarget = tg; modalKind = 'speed'; lastModalKey = ''; sfx('open'); renderModal(); }
function speedUI() {
  const tg = speedTarget, left = G.timerLeft(tg);
  const name = tg && tg.startsWith('b:') ? (() => { const p = PLOTS.find((q) => q.id === tg.slice(2)); return `${BUILDINGS[p.key].name} Sv.${G.lvl(p.id) + 1}`; })() : SP_NAMES[tg] || '';
  if (!left) return head('Hızlandır', 'ic_gift') + `<div class="sp-done">✅ Tamamlandı!</div><button class="w-btn" data-m="close" style="width:100%">Kapat</button>`;
  const owned = SPEED_ORDER.filter((k) => G.S.items[k] > 0), plan = G.bestSpeedups(tg);
  const planSec = plan.reduce((a, [k, n]) => a + SPEEDUPS[k].sec * n, 0);
  const rows = owned.map((k) => { const d = SPEEDUPS[k], need = Math.min(G.S.items[k], Math.ceil(left / d.sec));
    return `<div class="sp-row t${d.tier}">${spIcon(k, 52, G.S.items[k])}<div class="sp-txt"><b>${d.name}</b><small>${SPEED_TIER[d.tier]}</small></div><div class="sp-btns"><button class="w-btn" data-spuse="${k}:1">Kullan</button>${need > 1 ? `<button class="w-btn gold" data-spuse="${k}:${need}">×${need}</button>` : ''}</div></div>`; }).join('');
  return head('Hızlandır', 'ic_gift') + `<div class="sp-head"><small>${name}</small><b data-spleft>${G.fmtTime(left)}</b></div>
    ${owned.length ? `<button class="w-btn gold sp-best" data-spbest>⚡ Akıllı kullan <small>(${plan.map(([k, n]) => SPEEDUPS[k].short + (n > 1 ? '×' + n : '')).join(' + ')}${planSec >= left ? ' → bitir' : ''})</small></button><div class="sp-list">${rows}</div>`
      : `<div class="sp-empty">Hiç hızlandırman yok. Görevlerden ve etkinliklerden kazanabilir ya da marketten alabilirsin.</div>`}
    <div class="sp-foot"><button class="w-btn" data-spshop>🛒 Market</button><button class="w-btn red" data-spgold>⚡ Altınla bitir • 🪙 ${G.gemCostForTime(left)}</button></div>`;
}
function afterSpeed(r) {
  updateTop(); renderSheet(); updateLabels(true);
  if (r && r.done) { toast('✅ Tamamlandı!'); sfx('built'); closeModal(); } else renderModal();
}
// ---- Gözetleme raporu ----
let scoutRep = null;
const agoTxt = (t) => { const s = Date.now() / 1000 - t; return s < 60 ? 'az önce' : s < 3600 ? Math.floor(s / 60) + ' dk önce' : Math.floor(s / 3600) + ' sa önce'; };
function scoutUI(r) {
  if (!r) return head('Gözetleme Raporu', '🗺️') + '<p class="desc">Rapor bulunamadı.</p>';
  if (r.failed) return head('Gözetleme Raporu', '🗺️') + `<div class="sc-fail">🚁 Helikopter <b>${r.enemy}</b> şehrini gözetleyemedi.<br>${r.why}</div><button class="w-btn" data-m="close">Kapat</button>`;
  const order = ['infantry', 'spearman', 'archer', 'cavalry', 'tank'];
  const tot = G.totalTroops(r.troops || {});
  const h = r.hero && r.hero.id ? HERO_BY_ID[r.hero.id] : null;
  const ratio = r.power / Math.max(1, G.cityPower());
  const diff = ratio < 0.6 ? ['Kolay', '#7dff9a'] : ratio < 1 ? ['Orta', '#ffe68a'] : ratio < 1.5 ? ['Zor', '#ffaa6a'] : ['Çok zor', '#ff6a5a'];
  const target = G.findEnemy(r.target), lootSum = r.loot.food + r.loot.wood + r.loot.stone;
  return head('Gözetleme Raporu', '🗺️') + `
    <div class="sc-top"><div><b>${r.real ? '🌐 ' : ''}${r.enemy}</b><span>${r.lord || ''} • Belediye Sv.${r.th}</span></div><em>👁 ${agoTxt(r.t)}<br><small>X:${r.mapX} Y:${r.mapY}</small></em></div>
    <div class="sc-pow"><div><small>Toplam güç</small><b>⚔ ${G.fmt(r.power)}</b></div><div><small>Senin gücün</small><b>⚔ ${G.fmt(G.cityPower())}</b></div><div><small>Zorluk</small><b style="color:${diff[1]}">${diff[0]}</b></div></div>
    <h4 class="sc-h">💰 Yağmalanabilir kaynaklar</h4>
    <div class="sc-res">${['food', 'wood', 'stone', 'gold'].map((k) => `<div>${resImg(k, 30)}<b>${G.fmt(r.loot[k] || 0)}</b></div>`).join('')}</div>
    <p class="sc-note">Kazanırsan ordunun taşıyabildiği kadarını alırsın. Toplam: ${G.fmt(lootSum)}</p>
    <h4 class="sc-h">🛡️ Savunmadaki askerler <span>${G.fmt(tot)}</span></h4>
    <div class="sc-troops">${order.map((k) => `<div class="${(r.troops[k] || 0) ? '' : 'zero'}"><i>${TROOPS[k].icon}</i><span>${TROOPS[k].short}</span><b>${G.fmt(r.troops[k] || 0)}</b></div>`).join('')}</div>
    <h4 class="sc-h">👑 Komutan</h4>
    ${h ? `<div class="sc-hero"><img src="assets/heroes/${h.id}_a.webp" alt=""><div><b>${h.name}</b><span>${'★'.repeat(h.rarity)} • Bonus +%${r.hero.bonus}</span></div></div>` : r.hero ? `<div class="sc-hero"><div><b>Bilinmeyen komutan</b><span>Bonus +%${r.hero.bonus}</span></div></div>` : '<div class="sc-hero none">Şehirde komutan yok</div>'}
    <h4 class="sc-h">🏹 Okçu kuleleri</h4>
    <div class="sc-hero none">${r.tower ? `Kule hasarı: <b>${G.fmt(r.tower)}</b>` : 'Kule savunması yok'}</div>
    <div class="sc-btns"><button class="w-btn" data-m="close">Kapat</button>${target && worldOpen() ? `<button class="w-btn red" data-scoutatk="${r.target}">⚔ Saldır</button>` : ''}</div>`;
}
export function openScoutReport(r) { scoutRep = r; modalKind = 'scout'; lastModalKey = ''; renderModal(); }
let profTab = 'me';
function profileUI() {
  const h = HERO_BY_ID[G.S.commander], th = G.thLevel();
  const id = (G.S.created * 7919 % 90000000 + 10000000) | 0;
  let body = '';
  if (profTab === 'me') {
    const badges = [
      { n: 'İlk Zafer', i: 'ic_trophy', ok: G.S.stats.wins >= 1 }, { n: 'Çağırıcı', i: 'ic_summon', ok: G.S.totalPulls >= 10 },
      { n: 'Kale Lordu', i: 'nav_city', ok: th >= 5 }, { n: 'Hasat Ustası', i: 'res_food', ok: (G.S.counters?.collects || 0) >= 20 },
      { n: 'Fatih', i: 'nav_heroes', ok: G.S.stats.wins >= 10 }, { n: 'Hazine', i: 'nav_shop', ok: G.S.res.gold >= 2000 },
      { n: 'Kâşif', i: 'nav_world', ok: G.S.stats.kills >= 500 }, { n: 'Efsane', i: 'ic_gift', ok: Object.keys(G.S.heroes).some((x) => HERO_BY_ID[x].rarity === 5) },
    ];
    body = `<div class="w-banner" style="background-image:url(${UI('banner_profile')});min-height:140px;align-items:center">
      <div class="w-prof"><div class="w-prof-av">${frameHtml(G.S.commander, G.S.frame, 70)}</div><div><div class="nm">${G.S.name}</div><div class="sub">ID: ${id} • Komutan: ${h ? h.name : '-'}</div>
      <div class="w-xp"><span class="lvl">${th}</span><div class="bar"><span style="width:${th * 10}%"></span></div></div></div></div></div>
      <div class="w-stats">
        <div class="w-stat"><img src="${UI('nav_heroes')}"><div><small>Güç</small><b>${G.fmt(G.cityPower())}</b></div></div>
        <div class="w-stat"><img src="${UI('ic_trophy')}"><div><small>Zafer / Yenilgi</small><b>${G.S.stats.wins} / ${G.S.stats.losses}</b></div></div>
        <div class="w-stat"><img src="${UI('nav_world')}"><div><small>Öldürülen düşman</small><b>${G.fmt(G.S.stats.kills)}</b></div></div>
        <div class="w-stat"><img src="${UI('ic_summon')}"><div><small>Toplam çağırma</small><b>${G.S.totalPulls}</b></div></div></div>
      <div class="w-card"><h4><img src="${UI('ic_trophy')}">Rozetlerim</h4><div class="w-badges">${badges.map((b) => `<div class="w-badge ${b.ok ? '' : 'off'}"><img src="${UI(b.i)}" alt="">${b.n}</div>`).join('')}</div></div>`;
  } else if (profTab === 'frame') {
    const cur = FRAME_BY_ID[G.S.frame] || FRAMES[0];
    const tile = (f) => { const own = G.frameOwned(f.id), on = G.S.frame === f.id;
      return `<div class="fr-tile ${on ? 'on' : ''} ${f.free ? '' : 'prem t' + f.tier}" data-frame="${f.id}"><div class="fr-sm">${frameHtml(G.S.commander, f.id, 52)}</div>
        <b>${f.name}</b>${on ? '<em class="fr-st on">✓ Takılı</em>' : own ? '<em class="fr-st">Tak</em>' : `<em class="fr-st buy">🪙 ${G.fmt(f.gold)}</em>`}${f.pro ? '<i class="fr-pro">PRO</i>' : ''}</div>`; };
    body = `<div class="fr-hero"><div class="fr-big">${frameHtml(G.S.commander, cur.id, 66)}</div><div><small>Takılı çerçeve</small><b>${cur.name}</b><span>${cur.free ? 'Ücretsiz' : 'Özel çerçeve'}</span></div></div>
      <h4 class="fr-h">Ücretsiz çerçeveler</h4><div class="fr-grid">${FRAMES.filter((f) => f.free).map(tile).join('')}</div>
      <h4 class="fr-h prem">✨ Özel çerçeveler</h4><div class="fr-grid">${FRAMES.filter((f) => !f.free).map(tile).join('')}</div>`;
  } else {
    body = `<div class="w-card"><h4><img src="${UI('nav_city')}">Krallık adı</h4>
      <input data-name maxlength="16" value="${G.S.name.replace(/"/g, '')}" style="width:100%;padding:11px;border-radius:12px;background:#120a30;color:#fff;border:1px solid var(--wline);font-weight:800;font-size:15px;margin-bottom:8px">
      <button class="w-btn green" style="width:100%" data-m="savename">Kaydet</button></div>
      <div class="w-card"><h4><img src="${UI('nav_world')}">Hesap ve bulut kayıt</h4>
        <p class="desc" style="margin:0 0 8px">${!online.ready ? (online.failed ? '⚠️ Sunucuya bağlanılamadı. İlerlemen bu cihazda kayıtlı.' : 'Sunucuya bağlanılıyor…') : online.isGoogle ? `✅ Google hesabı bağlı: <b>${online.user.email || online.name}</b><br>İlerlemen bulutta; başka cihazda Google ile girersen devam edersin.` : '👤 Misafir hesap. İlerlemen buluta yedekleniyor ama telefonu değiştirirsen kaybolabilir. <b>Google hesabını bağla</b>, her cihazda devam et.'}</p>
        ${online.ready && !online.isGoogle ? '<button class="w-btn gold" style="width:100%" data-m="google">🔗 Google ile bağlan</button>' : ''}
        ${online.ready ? '<button class="w-btn" style="width:100%;margin-top:6px" data-m="cloudsave">☁️ Şimdi buluta kaydet</button>' : ''}</div>
      <div class="w-card"><h4><img src="${UI('nav_reports')}">Ses</h4><div class="row"><button class="w-btn" style="flex:1" data-m="sound">${audioState().sfxOn ? '🔊 Efekt açık' : '🔇 Efekt kapalı'}</button><button class="w-btn" style="flex:1" data-m="music">${audioState().musicOn ? '🎵 Müzik açık' : '🔇 Müzik kapalı'}</button></div></div>
      <button class="w-btn red" style="width:100%;padding:12px" data-m="reset">Oyunu sıfırla</button>`;
  }
  return head('Profil', 'nav_heroes', [{ id: 'me', label: 'Profilim', icon: 'nav_heroes' }, { id: 'frame', label: 'Çerçeve', icon: 'crown' }, { id: 'set', label: 'Ayarlar', icon: 'nav_quest' }], profTab) + body;
}
$('modalBox').addEventListener('input', (e) => {
  const s = e.target.dataset.slider;
  if (s) { atk.troops[s] = +e.target.value; const box = $('modalBox'), y = box.scrollTop; clearTimeout(soon); soon = setTimeout(() => { renderModal(); $('modalBox').scrollTop = y; }, 60); }
});
$('modalBox').addEventListener('click', (e) => {
  const wt = e.target.closest('[data-wtab]');
  if (wt) { const v = wt.dataset.wtab; if (modalKind === 'quests' || modalKind === 'login') { questTab = v; modalKind = 'quests'; } else if (modalKind === 'heroes') heroTab = v; else if (modalKind === 'shop') shopTab = v; else if (modalKind === 'profile') profTab = v; else if (modalKind === 'alliance') { if (v !== 'chat') alStopChat(); AL.tab = v; AL.err = ''; if (v === 'find') alRefresh(); } return renderModal(); }
  const gq = e.target.closest('[data-goq]');
  if (gq) { const v = gq.dataset.goq; const q = QUESTS.find((x) => x.id === v); closeModal();
    if (q && q.t[0] === 'bld') { const p = PLOTS.find((x) => x.key === q.t[1]); if (p) { openBuilding(p.id); focusOn(p.x, p.z); } return; }
    if (v.includes('trained') || (q && q.t[1] === 'trained')) { openBuilding('barracks'); focusOn(-17, 2); return; }
    if (q && q.t[1] === 'tanks') { openBuilding('tankyard'); focusOn(-14, 28); return; }
    if (v.includes('wins') || (q && q.t[1] === 'wins')) return navigate('world');
    if (v.includes('summons') || (q && q.t[1] === 'summons')) return navigate('summon');
    if (v.includes('heals')) { openBuilding('hospital'); return; }
    return; }
  const qt = e.target.closest('[data-qtab]'); if (qt) { questTab = qt.dataset.qtab; return renderModal(); }
  const cq = e.target.closest('[data-claimq]'); if (cq) { const r = G.claimQuest(cq.dataset.claimq); if (r) { rewardFx(r); updateTop(); } return renderModal(); }
  const cd = e.target.closest('[data-claimd]'); if (cd) { const r = G.claimDaily(cd.dataset.claimd); if (r) { rewardFx(r); updateTop(); } return renderModal(); }
  if (e.target.closest('[data-chest]')) { const r = G.claimChest(); if (r) { rewardFx(r, '🎁'); updateTop(); } return renderModal(); }
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
  const cp = e.target.closest('[data-cmdpick]');
  if (cp && modalKind === 'attack') { const id = cp.dataset.cmdpick, i = atk.heroes.indexOf(id); if (i >= 0) atk.heroes.splice(i, 1); else if (atk.heroes.length < G.MAX_COMMANDERS) { atk.heroes.push(id); playVoice(id); } else toast('En fazla 5 komutan', true); sfx('click'); return renderModal(); }
  const tq = e.target.closest('[data-tq]');
  if (tq) { const [t, m2] = tq.dataset.tq.split(':'), max = G.S.troops[t]; atk.troops[t] = m2 === 'all' ? max : m2 === 'half' ? Math.floor(max / 2) : 0; return renderModal(); }
  const ta = e.target.closest('[data-tall]');
  if (ta) { const m2 = ta.dataset.tall; for (const t in TROOPS) atk.troops[t] = m2 === 'all' ? G.S.troops[t] : m2 === 'half' ? Math.floor(G.S.troops[t] / 2) : 0; return renderModal(); }
  if (modalKind === 'alliance') {
    const em = e.target.closest('[data-alem]'), co = e.target.closest('[data-alcol]');
    const keepForm = () => { const f = AL.form; f.name = $('alName')?.value ?? f.name; f.tag = ($('alTag')?.value ?? f.tag).toUpperCase().replace(/[^A-Z0-9ÇĞİÖŞÜ]/g, ''); f.desc = $('alDesc')?.value ?? f.desc; f.open = $('alOpen') ? $('alOpen').checked : f.open; };
    if (em) { keepForm(); AL.form.emblem = +em.dataset.alem; return renderModal(); }
    if (co) { keepForm(); AL.form.color = +co.dataset.alcol; return renderModal(); }
    if (e.target.closest('[data-alcreate]')) { keepForm(); const f = AL.form;
      if (f.name.trim().length < 3) { AL.err = 'İsim en az 3 harf olmalı'; return renderModal(); }
      if (f.tag.length < 2) { AL.err = 'Etiket 2–4 harf olmalı'; return renderModal(); }
      if (G.S.res.gold < G.ALLIANCE_COST) return needGold();
      return alAction(async () => { const r = await createAlliance({ name: f.name.trim().slice(0, 20), tag: f.tag, emblem: f.emblem, color: f.color, desc: f.desc.trim().slice(0, 140), open: f.open, server: G.S.server || 1 }, G.myMember());
        if (!r.ok) { AL.err = r.why; return; } G.payAlliance(); G.setAlliance({ id: r.id, tag: f.tag, name: f.name.trim(), emblem: f.emblem, color: f.color }); sfx('reveal5'); toast(`🛡️ [${f.tag}] ${f.name} kuruldu!`); AL.tab = 'main'; updateTop(); syncSoon(); await alRefresh(); }); }
    const jn = e.target.closest('[data-aljoin]');
    if (jn) return alAction(async () => { const r = await joinAlliance(jn.dataset.aljoin, G.myMember()); if (!r.ok) { toast(r.why, true); return; } const a = await getAlliance(jn.dataset.aljoin); G.setAlliance(a); AL.doc = a; AL.tab = 'main'; sfx('built'); toast(`🤝 [${a.tag}] ${a.name} ittifakına katıldın!`); syncSoon(); });
    if (e.target.closest('[data-alleave]')) { if (!confirm('İttifaktan ayrılmak istiyor musun?')) return; return alAction(async () => { const r = await leaveAlliance(AL.doc); if (!r.ok) { toast(r.why, true); return; } alStopChat(); AL.doc = null; G.setAlliance(null); AL.tab = 'find'; AL.list = null; toast(r.deleted ? '🏳️ İttifak dağıtıldı' : '🏳️ İttifaktan ayrıldın'); syncSoon(); await alRefresh(); }); }
    const kk = e.target.closest('[data-alkick]');
    if (kk) { const nm = AL.doc.members[kk.dataset.alkick]?.name; if (!confirm(`${nm} ittifaktan çıkarılsın mı?`)) return; return alAction(async () => { const r = await kickMember(AL.doc.id, kk.dataset.alkick); if (!r.ok) { toast(r.why, true); return; } toast('👢 Üye çıkarıldı'); await alRefresh(); }); }
    if (e.target.closest('[data-alsave]')) return alAction(async () => { const d = ($('alEditDesc')?.value || '').trim().slice(0, 140); const r = await editAlliance(AL.doc.id, { desc: d }); if (!r.ok) toast(r.why, true); else { toast('💾 Kaydedildi'); await alRefresh(); } });
    if (e.target.closest('[data-altoggle]')) return alAction(async () => { const r = await editAlliance(AL.doc.id, { open: !AL.doc.open }); if (!r.ok) toast(r.why, true); else await alRefresh(); });
    if (e.target.closest('[data-alsend]')) { const inp = $('alChatIn'), t = inp?.value.trim(); if (!t) return; inp.value = ''; sendChat(AL.doc.id, t, G.myMember()).then((r) => { if (!r.ok) toast(r.why, true); }); return; }
  }
  const fr = e.target.closest('[data-frame]');
  if (fr) { const id = fr.dataset.frame; if (G.frameOwned(id)) { G.setFrame(id); sfx('click'); toast('🖼️ Çerçeve takıldı'); } else { const r = G.buyFrame(id); if (!r.ok) { if (r.needGold) needGold(); else toast(r.why, true); return; } sfx('reveal'); toast(`✨ ${FRAME_BY_ID[id].name} çerçevesi alındı`); } updateTop(); return renderModal(); }
  const ob = e.target.closest('[data-offer]');
  if (ob) { const r = G.buyOffer(ob.dataset.offer); if (!r.ok) { toast(r.why, true); return; } sfx('reveal5'); toast('🎁 Paket eklendi!' + (r.heroes.length ? ' ' + r.heroes.map((h) => '★5 ' + HERO_BY_ID[h].name).join(', ') : '')); updateTop(); return renderModal(); }
  const su = e.target.closest('[data-spuse]');
  if (su) { const [k, n] = su.dataset.spuse.split(':'); const r = G.useSpeedup(speedTarget, k, +n); if (!r.ok) toast(r.why, true); else { sfx('coin'); toast(`⏩ ${SPEEDUPS[k].short}${r.count > 1 ? ' ×' + r.count : ''} kullanıldı`); } return afterSpeed(r); }
  if (e.target.closest('[data-spbest]')) { const n = G.useBest(speedTarget); if (n) { sfx('coin'); toast(`⏩ ${n} hızlandırma kullanıldı`); } return afterSpeed({ done: !G.timerLeft(speedTarget) }); }
  if (e.target.closest('[data-spshop]')) { shopTab = 'speed'; modalKind = 'shop'; return renderModal(); }
  if (e.target.closest('[data-spgold]')) { const tg = speedTarget, ok = tg.startsWith('b:') ? G.speedUp(tg.slice(2)) : tg === 'train' ? G.speedTraining() : tg === 'tank' ? G.speedTankTraining() : tg === 'research' ? G.speedResearch() : G.speedHealing?.(); if (!ok) { needGold(); return; } sfx('coin'); return afterSpeed({ done: true }); }
  const sb = e.target.closest('[data-spbuy]');
  if (sb) { const r = G.buySpeedup(sb.dataset.spbuy); if (!r.ok) { if (r.needGold) needGold(); else toast(r.why, true); return; } sfx('coin'); toast(`🛒 ${SPEEDUPS[sb.dataset.spbuy].name} alındı`); updateTop(); return renderModal(); }
  const sr = e.target.closest('[data-scoutrep]');
  if (sr) { openScoutReport(G.S.reports[+sr.dataset.scoutrep]); return; }
  const sa = e.target.closest('[data-scoutatk]');
  if (sa) { const id = sa.dataset.scoutatk; closeModal(); window.__dsAttack(id); return; }
  const m = e.target.closest('[data-m]'); if (!m) return;
  const a = m.dataset.m;
  if (a === 'close') closeModal();
  if (a === 'login') { const r = G.claimLogin(); if (r) { toast(`📅 Gün ${r.day}: ` + rewardTxt(r.reward)); sfx('built'); updateTop(); } closeModal(); }
  if (a === 'world') { if (worldOpen()) { $('modal').classList.remove('open'); $('modalBox').innerHTML = ''; atk.init = false; return; } modalKind = 'world'; renderModal(); }
  if (a === 'toattack') { modalKind = 'attack'; atk.init = false; renderModal(); tutEvent('attackOpen'); }
  if (a === 'march') {
    const troops = { ...atk.troops }, hero = atk.heroes[0];
    if (worldOpen()) { const sm = G.startMarch(worldSel, troops, atk.heroes); if (!sm.ok) return toast(sm.why, true); $('modal').classList.remove('open'); $('modalBox').innerHTML = ''; atk.init = false; sfx('horn'); toast(`🚩 Ordu yola çıktı • varış ${G.fmtTime(sm.march.dur)}`); refreshWorldUI(); syncSoon(); return; }
    const r = G.attackEnemy(worldSel, troops, atk.heroes);
    if (!r) return toast('Asker seç', true);
    closeModal(); atk.init = false; tutEvent('battle');
    if (r.enemy.real) { sendAttack(r.enemy.uid, { name: G.S.name, win: r.res.win, loot: r.rep.loot, sent: r.sent, aLoss: r.res.aLoss, dLoss: r.res.dLoss }); syncSoon(); }
    openBattle({ mode: 'attack', result: r.res, attacker: { troops: r.sent, hero }, defender: { troops: addBack(r.res.D, r.res.dLoss), tower: r.enemy.tower }, report: r.rep, title: r.enemy.name });
  }
  if (a === 'gobarracks') { closeModal(); openBuilding('barracks'); focusOn(-17, 2); }
  if (a === 'google') { connectGoogle().then((ok) => { if (ok) { toast('✅ Google hesabı bağlandı'); syncNow(); } renderModal(); }); return; }
  if (a === 'cloudsave') { syncNow().then((ok) => toast(ok ? '☁️ Buluta kaydedildi' : 'Kaydedilemedi', !ok)); return; }
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
  if (ev === 'battle') { $('repDot').classList.remove('hidden'); if (data.win && data.kind === 'attack') pushNews(`<u>${G.S.name}</u> <em>${data.enemy}</em> krallığını fethetti!`); }
  if (ev === 'quests') { updateQuestUI(); }
  if (ev === 'marchArrived') {
    const { r } = data; if (r.enemy.real) sendAttack(r.enemy.uid, { name: G.S.name, win: r.res.win, loot: r.rep.loot, sent: r.sent, aLoss: r.res.aLoss, dLoss: r.res.dLoss });
    lastBattle = r; sfx(r.res.win ? 'win' : 'lose');
    if (r.rep.zombie) { if (r.res.win) toast(`🧟 Zombi Sv.${r.rep.zombie} öldürüldü! ` + (r.rep.items || []).map((it) => `⏩ ${SPEEDUPS[it.id].short}${it.n > 1 ? ' ×' + it.n : ''}`).join(' ')); else toast(`🧟 Zombi Sv.${r.rep.zombie} çok güçlüydü! Ordun yenildi`, true); }
    showBattleBanner(r); refreshWorldUI(); syncSoon();
  }
  if (ev === 'scout') { sfx('click'); refreshWorldUI(); }
  if (ev === 'scoutArrived') { if (!data.report?.failed) toast(`👁 Helikopter ${data.tname} şehrini gözetliyor…`); refreshWorldUI(); }
  if (ev === 'scoutHome') { refreshWorldUI(); updateTop(); $('repDot').classList.remove('hidden'); if (data.report?.failed) toast('🚁 Gözetleme başarısız: ' + data.report.why, true); else { sfx('reveal'); openScoutReport(data.report); } }
  if (ev === 'marchHome') { toast('↩ Ordun şehre döndü'); refreshWorldUI(); updateTop(); }
  if (ev === 'marchBlocked') { toast('🛡️ Hedefin kalkanı var, ordu geri dönüyor', true); refreshWorldUI(); }
  if (ev === 'researched') { toast(`🔬 ${RESEARCH[data].name} Sv.${G.S.research.levels[data]} tamamlandı!`); sfx('built'); }
});
let lastBattle = null;
function showBattleBanner(r) {
  let b = $('battleBanner'); if (!b) { b = document.createElement('div'); b.id = 'battleBanner'; document.body.appendChild(b); }
  const loot = r.rep.loot || {};
  b.className = 'bb ' + (r.res.win ? 'win' : 'lose');
  b.innerHTML = `<i>${r.res.win ? '🏆' : '💀'}</i><div><b>${r.res.win ? 'Zafer!' : 'Yenilgi'} • ${r.enemy.name}</b><small>${r.res.win ? `🌾${G.fmt(loot.food || 0)} 🪵${G.fmt(loot.wood || 0)} 🪨${G.fmt(loot.stone || 0)} 🪙${loot.gold || 0}` : 'Ordun geri çekiliyor'}</small></div><button id="bbWatch">İzle ▶</button><button id="bbX">✕</button>`;
  b.style.display = 'flex';
  $('bbX').onclick = () => { b.style.display = 'none'; };
  $('bbWatch').onclick = () => { b.style.display = 'none'; const x = lastBattle; if (!x) return; openBattle({ mode: 'attack', result: x.res, attacker: { troops: x.sent, hero: x.rep.hero }, defender: { troops: addBack(x.res.D, x.res.dLoss), tower: x.enemy.tower }, report: x.rep, title: x.enemy.name }); };
  clearTimeout(b._t); b._t = setTimeout(() => { b.style.display = 'none'; }, 12000);
}
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
  for (const c of CLOUDS) { c.position.x += dt * 1.2; if (c.position.x > 140) c.position.x = -140; }
  for (const id in holders) { const c = holders[id].content; if (c && c.userData.update) c.userData.update(tAcc, dt); }
  if (wallGroup) wallGroup.children.forEach((c) => c.userData.update && c.userData.update(tAcc, dt));
  updateAmbient(tAcc, dt);
  if (life) life.update(tAcc, dt);
  if (fountainTick) fountainTick(tAcc);
  if (nightTick) nightTick(tAcc);
  for (const id in holders) { const w = holders[id].workers; if (w) w.forEach((v, i) => (v.userData.kk ? animateUnit(v, 'work', tAcc + i * 0.4, dt) : animVillager(v, 'work', tAcc + i * 0.4))); }
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
    updateTop(); updateQuestUI();
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
// ---------------------------------------------------------------------
//  Çevrimiçi: giriş, bulut kayıt, rakipler, gelen saldırılar
// ---------------------------------------------------------------------
let lastSync = 0, syncTimer = 0;
async function syncNow() { if (!online.ready) return false; lastSync = Date.now(); return saveCloud(G.exportSave(), G.publicProfile()); }
function syncSoon() { clearTimeout(syncTimer); syncTimer = setTimeout(syncNow, 3000); }
async function refreshRivals(force) {
  if (!online.ready || (!force && Date.now() - G.ONLINE.rivalsAt < 90000)) return;
  G.ONLINE.rivalsAt = Date.now();
  const list = await serverPlayers(G.S.server || 1, 200);
  G.ONLINE.enemies = list.map(G.rivalToEnemy);
  if (modalKind === 'world' && $('modal').classList.contains('open')) renderModal();
}
async function processInbox() {
  if (!online.ready) return;
  const items = await fetchInbox(); if (!items.length) return;
  for (const it of items) { const r = G.applyIncoming(it); toast(r.win ? `🛡️ ${r.enemy} saldırdı, savunman kazandı!` : `⚔️ ${r.enemy} şehrini yağmaladı!`, !r.win); }
  $('repDot').classList.remove('hidden');
  await clearInbox(items.map((x) => x.id)); updateTop(); syncSoon();
}
async function adoptCloud(cloud, ask) {
  if (!cloud?.data) return false;
  let c; try { c = JSON.parse(cloud.data); } catch (e) { return false; }
  const cTh = c.buildings?.townhall?.level || 1;
  if (ask && !confirm(`Bulutta kayıtlı bir krallık bulundu: "${c.name}" (Belediye Sv.${cTh}). Bu cihazdaki ilerlemenin yerine o yüklensin mi?`)) return false;
  G.importSave(cloud.data); location.reload(); return true;
}
async function startOnline() {
  onOnline(async (ev) => {
    if (ev === 'google') { syncNow(); if (modalKind === 'profile') renderModal(); }
    if (ev === 'google-exists') { if (confirm('Bu Google hesabına bağlı başka bir krallık var. O krallığa geçilsin mi? (Bu cihazdaki misafir ilerlemesi bırakılır)')) { if (await switchToExistingGoogle()) { const cloud = await loadCloud(); if (!(await adoptCloud(cloud, false))) syncNow(); } } }
  });
  const ok = await initOnline(); if (!ok) return;
  const cloud = await loadCloud();
  const fresh = Date.now() / 1000 - G.S.created < 900 && G.thLevel() <= 2;
  let cTh = 0; try { cTh = JSON.parse(cloud?.data || '{}').buildings?.townhall?.level || 0; } catch (e) { /* bozuk */ }
  if (cloud && (fresh ? cTh > G.thLevel() : cloud.updated > G.S.lastSeen * 1000 + 120000)) { if (await adoptCloud(cloud, true)) return; }
  if (!G.S.server) { const n = await assignServer(); G.placeOnServer(n); toast(`🌐 Sunucu #${n}'e katıldın!`); }
  await syncNow();
  processInbox(); refreshRivals(true);
  if (G.S.alliance) alRefresh(); // üyeliği doğrula, gücü güncelle
  setInterval(() => { if (G.S.alliance) alRefresh(); }, 300000);
  setInterval(() => { if (Date.now() - lastSync > 60000) syncNow(); }, 15000);
  setInterval(processInbox, 120000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') syncNow(); });
}
async function boot() {
  G.load();
  setLoad(4, 'Modeller yükleniyor…'); await frame();
  await ASSETS.loadAll((f) => setLoad(4 + f * 40, `Modeller yükleniyor… %${Math.round(f * 100)}`));
  BLD.setUnitFactory(createSoldier, animateUnit, createTank);
  ASSETS.setOnHFLoaded((k) => { const base = k.replace(/_2$|[234]$/, ''); for (const id in holders) if (holders[id].plot.key === base) { holders[id].state = ''; refreshPlot(id); } PORTRAIT_CLEAR(base); });
  setLoad(46, 'Arazi hazırlanıyor…'); await frame();
  city.environment = makeEnv(0x1a2a5a, 0x2a3a6a, 0x0a1010, false);
  city.environmentIntensity = 0.55;
  buildTerrain();
  setLoad(30, 'Orman dikiliyor…'); await frame();
  buildNature();
  setLoad(50, 'Surlar örülüyor…'); await frame();
  buildWalls();
  setLoad(65, 'Binalar inşa ediliyor…'); await frame();
  buildPlots();
  setLoad(80, 'Askerler toplanıyor…'); await frame();
  buildPatrols();
  buildNight();
  initScenes({ renderer, toast, sfx, closeModal, navigate, onSceneClosed, fillPortraits, needGold, updateTop, makeEnv, event: tutEvent });
  const onAttack = (id) => { worldSel = id; atk.init = false; modalKind = 'attack'; renderModal(); };
  window.__dsAttack = onAttack;
  initWorldMap({ renderer, toast, sfx, online, serverPlayers, onAttack, onScoutReport: openScoutReport, onTeleport: () => syncNow() });
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  applyCam();
  setLoad(95, 'Son dokunuşlar…'); await frame();
  renderer.compile(city, camera);
  setLoad(100);
  document.querySelectorAll('[data-ico]').forEach((el) => { el.innerHTML = icon(el.dataset.ico, +(el.dataset.s || 22)); });
  ['top', 'side', 'nav', 'rside', 'bottomHud'].forEach((id) => $(id).classList.remove('hidden'));
  updateTop();
  $('loading').style.opacity = 0; setTimeout(() => $('loading').remove(), 500);
  if (G.S.reports.length && G.S.reports[0].t > (G.S.reportsSeen || 0)) $('repDot').classList.remove('hidden');
  const away = Date.now() / 1000 - (G.S.lastSeenBoot || Date.now() / 1000);
  G.S.lastSeenBoot = Date.now() / 1000;
  initTutorial({ sfx, toast, updateTop, getPortrait, getAvatar, plotScreen, focusPlot });
  updateQuestUI();
  if (G.S.tut === 'done' && G.loginPending()) setTimeout(() => { modalKind = 'login'; openModal(loginUI()); }, 900);
  requestAnimationFrame(loop);
  setTimeout(startOnline, 1500);
}
boot().catch((e) => { console.error(e); setLoad(100, 'Hata: ' + e.message); });
window.__dsShowDrop = (it) => showItemDrop(it);
window.__ds = { openBattle, online, G, cam, navigate, holders, openBuilding, createTank, closeModal, toast, get grass() { return grassField; } };
