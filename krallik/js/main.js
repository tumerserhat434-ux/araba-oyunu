// =====================================================================
//  DEMİR SANCAK — ana dosya: şehir sahnesi, kamera, arayüz panelleri
// =====================================================================
import { LANG, setLang, tr } from './i18n.js?v=2611201530'; // önce yüklenmeli: ekrandaki metinleri çevirir
const LOC = LANG === 'en' ? 'en-US' : 'tr-TR';
import * as THREE from 'three';
import * as BLD from './buildings.js?v=2611201530';
import { createSoldier, createTank, animateUnit, createCitizen } from './units.js?v=2611201530';
import * as ASSETS from './assets.js?v=2611201530';
import { initWorldMap, openWorldMap, worldOpen, refreshWorldUI, refreshPyramids } from './worldmap.js?v=2611201530';
import { serverPlayers, assignServer, listAlliances, getAlliance, createAlliance, joinAlliance, updateMember, leaveAlliance, kickMember, editAlliance, sendChat, watchChat, ALLIANCE_MAX, createRally, joinRally, getRally, setRallyStatus, watchRallies, setRank, requestHelp, giveHelp, deleteHelp, watchHelps, watchPyramids, hitPyramid, watchWorldChat, sendWorldChat, shortId, findPlayerById, pairId, watchDmList, watchDm, sendDm, getPlayer, writeCity, getCities, getMyCity, topBy, topAlliances } from './online.js?v=2611201530';
import { online, onOnline, initOnline, loadCloud, saveCloud, topPlayers, rivals, sendAttack, fetchInbox, clearInbox, connectGoogle, switchToExistingGoogle } from './online.js?v=2611201530';
import { RESEARCH, RESEARCH_MAX, researchCost, QUESTS, DAILY, DAILY_CHEST, LOGIN_REWARDS, SPEEDUPS, SPEED_ORDER, SPEED_TIER, SPEED_SHOP, DROP_QUEST, DROP_EVENT, FRAMES, FRAME_BY_ID, OFFERS } from './data.js?v=2611201530';
import { FY_TASKS, FY_DAYS, FY_BONUS, TROOP_LV_MAX, troopLvMul, troopLvCost, troopLvTime, troopLvReq, VIP, VIP_MAX, ALLIANCE_SHOP, STAR_PATH, campCap, RES, BUILDINGS, PLOTS, MAX_LEVEL, maxLevel, thRequirements, upgradeCost, TROOPS, HEROES, HERO_BY_ID, RARITY, heroBonus, heroLevelCost, SUMMON, SHOP, RES_PACKS, BAG_DENOM, BAG_NAMES } from './data.js?v=2611201530';
import * as G from './state.js?v=2611201530';
import { getAvatar } from './scenes.js?v=2611201530';
import { initCampaign, openCampaign } from './campui.js?v=2611201530';
import { SKINS, SKIN_ORDER, createSkinFX } from './skins.js?v=2611201530';
import { campIdx, stageLabel } from './campaign.js?v=2611201530';
import { starsHtml, initScenes, openBattle, openSummon, openHeroViewer, getPortrait, getBuildingPortrait, sceneActive, renderActive } from './scenes.js?v=2611201530';
import { createFire } from './fire.js?v=2611201530';
import { createGrass } from './grass.js?v=2611201530';
import { sfx as asfx, initAudio, updateAudio, setMusic, setSfx, audioState, playVoice } from './audio.js?v=2611201530';
import { initTutorial, tutEvent } from './tut.js?v=2611201530';
import { icon } from './icons.js?v=2611201530';
import { paintCity } from './terrain.js?v=2611201530';
import { createLife, createVillager, animVillager } from './life.js?v=2611201530';
import { LORD_NAMES, KINGDOM_NAMES } from './data.js?v=2611201530';

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
// grafik belleği dolup WebGL bağlamı kaybolursa: kaydet ve kendini yeniden yükle (siyah/çizgili ekranda kalma)
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault(); try { G.save(); } catch (er) { /* yok say */ }
  const d = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0;z-index:999;display:grid;place-items:center;background:#0b1430;color:#ffe08a;font:900 18px Nunito,sans-serif;text-align:center;padding:20px';
  d.textContent = 'Grafik belleği yenileniyor…'; document.body.appendChild(d); setTimeout(() => location.reload(), 1200);
});
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
    if (Math.hypot(x, z) < 55) return true;
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
  const R = 50, N = 8; // Talimhane için surlar genişletildi (40 → 50; sekizgenin köşegen kenarı merkeze R·cos22,5° kadar yakın)
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
// ---- şehir yangını (saldırıya uğrayınca): kırmızı alarm, belediyede alev, yangın tüpü, can dolumu ----
let thFire = null, fireOut = 0;
function updateFireUI() {
  const burn = G.myCityBurning(), hp = G.myCityHp(), inCity = !sceneActive() && !worldOpen();
  $('fireAlarm').classList.toggle('hidden', !(burn && inCity));
  $('fireBtn').classList.toggle('hidden', !(burn && inCity));
  if (burn) $('fireHp').textContent = `Şehir canı %${Math.round(hp)}`;
  const regen = !burn && hp < 100;
  $('cityHpChip').classList.toggle('hidden', !(regen && inCity));
  if (regen) { $('cityHpBar').style.width = hp.toFixed(1) + '%'; $('cityHpTxt').textContent = '%' + Math.floor(hp); }
  const h = holders.townhall;
  if (burn && !thFire && h) {
    let R = 6, H = 10; if (h.content) { const b = new THREE.Box3().setFromObject(h.content), sz = b.getSize(new THREE.Vector3()); if (sz.y > 1) { H = sz.y; R = Math.max(sz.x, sz.z) * 0.5; } }
    thFire = createFire(R * 1.7, { h: Math.min(0.9, H / (R * 1.7) * 0.55), count: 20, smoke: 14, embers: 18, light: true }); h.group.add(thFire.group); fireOut = 0;
  }
}
$('fireBtn').addEventListener('click', () => {
  if (!G.extinguish()) return;
  sfx('reveal'); toast('🧯 Yangın söndürüldü! Şehrinin canı 2-3 dakikada dolacak'); fireOut = 1; updateFireUI(); syncSoon();
  if (online.ready) writeCity(G.S.server || 1, online.uid, G.myCityDoc());
});
// ---- belediye binası efekti (teklif paketleriyle) ----
let skinFX = null;
function applySkin() {
  const h = holders.townhall; if (!h) return;
  if (skinFX) { skinFX.userData.restore?.(); h.group.remove(skinFX); skinFX.traverse((o) => { o.geometry?.dispose(); if (o.material && !o.material.map?.isCanvasTexture) o.material.dispose?.(); }); skinFX = null; }
  const id = G.S.skin; if (!id || !SKINS[id] || plotState('townhall') === 'busy') return;
  // binanın gerçek ölçüsü (modelden)
  let R = (BLD.FOOTPRINT.townhall || 11) * 0.55, H = Math.max(8, h.height || 10);
  if (h.content) { const b = new THREE.Box3().setFromObject(h.content), sz = b.getSize(new THREE.Vector3()); if (sz.y > 1) { H = sz.y; R = Math.max(sz.x, sz.z) * 0.5; } }
  skinFX = createSkinFX(id, { R, H, base: h.content }); h.group.add(skinFX);
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
  if (id === 'townhall') applySkin();
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
document.addEventListener('touchmove', (e) => { if (!e.target.closest('.sheet, .modal-box, .res10, .cp-scroll')) e.preventDefault(); }, { passive: false });

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
// Emojiler yerine oyunun kendi simgeleri (iPhone 🪙'yi gri çiziyor, diğerleri de tarza uymuyor):
// sayfaya eklenen her metindeki bu emojiler <img class="ic-emo"> olur (bildirimler, harita kartları, pencereler)
const EMOJI_IMG = { '\u{1FA99}': 'res_gold', '🌾': 'res_food', '🪵': 'res_wood', '🪨': 'res_stone', '🧱': 'res_stone', '🗿': 'ic_giant', '🧟': 'ic_zombie', '💀': 'ic_zombie', '🔍': 'ic_search', '⚡': 'ic_energy', '🏆': 'ic_trophy', '🎁': 'ic_gift', '🎉': 'ic_gift', '📯': 'ic_rally', '👑': 'crown', '⏩': 'sp_t1', '⏭': 'sp_t1',
  '⚔': 'rk_i_swords', '🛡': 'em_shield', '🔒': 'em_lock', '🔓': 'em_unlock', '🤝': 'ic_alliance', '🌐': 'nav_world', '🌍': 'nav_world', '🗺': 'nav_world', '🔺': 'em_pyramid', '⛏': 'em_pickaxe', '✨': 'em_sparkle', '🚩': 'em_flag',
  '🏰': 'ic_castle', '🏯': 'ic_castle', '🏠': 'ic_castle', '🏛': 'nav_city', '🏘': 'nav_city', '🔥': 'em_fire', '⏱': 'em_hourglass', '⏳': 'em_hourglass', '💚': 'ic_alhelp', '⛑': 'ic_alhelp', '🚁': 'em_heli', '📍': 'em_pin', '👥': 'ic_almembers',
  '⚠': 'em_warn', '🧪': 'em_potion', '🔮': 'ic_summon', '⚙': 'em_gear', '🏹': 'u_archer', '🗡': 'u_infantry', '🪖': 'u_infantry', '🔱': 'u_spearman', '🐎': 'u_cavalry', '🤕': 'em_bandage', '🎯': 'ic_troops', '🏕': 'b_camp', '⛺': 'b_rally',
  '🔬': 'em_book', '📚': 'em_book', '📜': 'rk_i_scroll', '🏳': 'em_wflag', '🔨': 'ic_builder', '🏗': 'ic_builder', '⚒': 'b_forge', '👁': 'em_eye', '💨': 'em_smoke', '📦': 'ic_chest', '💰': 'ic_chest', '🎒': 'em_bag', '📋': 'nav_quest',
  '👢': 'em_boot', '🛒': 'nav_shop', '🧯': 'ic_extinguisher', '⚜': 'rk_i_laurel', '📅': 'ic_calendar', '🦸': 'nav_heroes', '👤': 'nav_heroes', '💾': 'em_save', '☁': 'em_cloud', '🔇': 'em_mute', '🔊': 'em_sound', '🎵': 'em_music', '🖼': 'em_frame',
  '📈': 'em_chart', '💡': 'em_bulb', '🔗': 'em_link', '🎲': 'em_dice', '❤': 'em_heart', '💬': 'ic_alchat', '🐂': 'res_food', '✅': 'em_sparkle' };
const EMO_RE = new RegExp('(' + Object.keys(EMOJI_IMG).join('|') + ')\uFE0F?', 'gu'), EMO_TEST = new RegExp(Object.keys(EMOJI_IMG).join('|'), 'u');
function coinFix(root) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (EMO_TEST.test(n.nodeValue) && !n.parentNode.closest?.('script,style,input,textarea,option') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
  const list = []; while (w.nextNode()) list.push(w.currentNode);
  for (const n of list) {
    const f = document.createDocumentFragment(); let last = 0; const v = n.nodeValue;
    for (const m of v.matchAll(EMO_RE)) { if (m.index > last) f.appendChild(document.createTextNode(v.slice(last, m.index))); const im = document.createElement('img'); im.className = 'ic-emo ic-gold'; im.src = `assets/ui/${EMOJI_IMG[m[1]]}.webp?v=2611201530`; im.alt = ''; f.appendChild(im); last = m.index + m[0].length; }
    if (last < v.length) f.appendChild(document.createTextNode(v.slice(last)));
    n.replaceWith(f);
  }
}
new MutationObserver((ms) => { for (const m of ms) { for (const a of m.addedNodes) { if (a.nodeType === 1) coinFix(a); else if (a.nodeType === 3 && a.parentNode && EMO_TEST.test(a.nodeValue)) coinFix(a.parentNode); } if (m.type === 'characterData' && m.target.parentNode && EMO_TEST.test(m.target.nodeValue || '')) coinFix(m.target.parentNode); } }).observe(document.body, { childList: true, subtree: true, characterData: true });
coinFix(document.body);
// bildirim simgeleri: emoji → oyunun kendi görselleri
const TOAST_IC = { '🎁': 'ic_gift', '⚡': 'ic_energy', '🧟': 'boss_5', '🏆': 'ic_trophy', '⚔': 'nav_heroes', '🔥': 'ic_extinguisher', '👑': 'crown', '🛡': 'ic_castle', '🤝': 'ic_alliance', '📯': 'ic_rally', '🗿': 'ic_giant', '🎯': 'ic_troops', '🔮': 'ic_summon', '✨': 'ic_summon', '💚': 'ic_alhelp', '↩': 'ic_troops', '⛏': 'res_stone', '🧯': 'ic_extinguisher', '🚁': 'nav_world', '📍': 'nav_world', '🌐': 'nav_world', '🔺': 'ic_throne', '💬': 'ic_alchat', '🔬': 'nav_quest', '🏗': 'ic_builder', '⬆': 'nav_city', '✓': 'ic_trophy' };
export function toast(msg, bad = false) {
  const d = document.createElement('div'); d.className = 'toast' + (bad ? ' bad' : '');
  const m = String(msg).match(/^(\p{Extended_Pictographic}\uFE0F?|[✓✗⚡⚔⬆])\s*/u);
  const ic = document.createElement('i'), tx = document.createElement('span');
  const em = m ? m[1].replace('\uFE0F', '') : (bad ? '⚠' : '✨'), img = TOAST_IC[em];
  if (img) { const im = document.createElement('img'); im.src = `assets/ui/${img}.webp?v=2611201530`; im.alt = ''; ic.appendChild(im); ic.classList.add('img'); } else ic.textContent = em;
  // metindeki ⏩ (hızlandırma) işaretlerini kum saati simgesine çevir
  const body = m ? String(msg).slice(m[0].length) : String(msg);
  body.split('⏩').forEach((part, i) => { if (i) { const h = document.createElement('img'); h.className = 'tq-sp'; h.src = 'assets/ui/sp_t1.webp?v=2611201530'; h.alt = ''; tx.appendChild(h); } tx.appendChild(document.createTextNode(part)); });
  const l = document.createElement('b'); l.className = 'laurel tq-laurel';
  d.append(l, ic, tx);
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
function updateEnergy() {
  const e = G.energyNow(), full = e >= G.ENERGY_MAX;
  $('energyCount').textContent = `${e}/${G.ENERGY_MAX}`; $('energyBar').style.width = Math.min(100, e / G.ENERGY_MAX * 100) + '%';
  $('chipEnergy').classList.toggle('low', e < 10);
  $('evDot').classList.toggle('hidden', !G.fyClaimable());
}
$('chipEnergy').onclick = () => { const e = G.energyNow(); sfx('click'); toast(e >= G.ENERGY_MAX ? `⚡ Enerji dolu (${e}/${G.ENERGY_MAX}). Saldırı ve ralli 10, zombi 5 enerji harcar` : `⚡ ${e}/${G.ENERGY_MAX} • +1 enerji ${G.fmtTime(G.energyNextIn())} sonra • dolmasına ${G.fmtTime(G.energyFullIn())}`); };
function updateTop() {
  updateVipBadge(); updateEnergy(); updateBagDot();
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
  $('campTag').textContent = stageLabel(campIdx());
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
      ${helpBtnHtml(id)}
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
    if (key === 'townhall') body += skinSheetHtml();
    if (key === 'townhall') body += `<div class="stats">${stat('Krallık gücü', G.fmt(G.cityPower()))}${stat('Bina seviye sınırı', L)}${stat('Depo sınırı', G.fmt(G.storageCap()))}${stat('Zafer / Yenilgi', `${G.S.stats.wins} / ${G.S.stats.losses}`)}</div>`;
    if (def.prod) {
      const pend = G.pending(id);
      body += `<div class="stats">${stat('Üretim / saat', G.fmt(G.prodPerHour(key, L)), L < maxLevel(key) ? G.fmt(G.prodPerHour(key, L + 1)) : '')}${stat('Kapasite', G.fmt(G.prodCap(key, L)))}</div>
        <button class="btn blue" style="width:100%;margin-bottom:10px" data-act="collect" ${pend >= 1 ? '' : 'disabled'}>${RES[def.prod].icon} Topla • ${G.fmt(pend)}</button>`;
    }
    if (key === 'archery') body += `<div class="stats">${stat('Kule hasarı', G.fmt(L * 260), L < maxLevel(key) ? G.fmt((L + 1) * 260) : '')}${stat('Toplam savunma', G.fmt(G.towerPower()))}</div>`;
    if (key === 'warehouse') body += `<div class="stats">${stat('Depo sınırı', G.fmt(G.storageCap()))}${stat('Yağmadan korunan', Math.round((0.3 + L * 0.05) * 100) + '%')}</div>`;
    if (key === 'heroes') body += `<div class="stats">${stat('Kahraman sayısı', Object.keys(G.S.heroes).length + ' / ' + HEROES.length)}${stat('Kahraman seviye sınırı', G.heroMaxLevel())}</div><button class="btn purple" style="width:100%;margin-bottom:10px" data-go="heroes">🛡️ Kahramanları göster</button>`;
    if (key === 'summon') body += `<div class="stats">${stat('5★ şansı', '%9')}${stat('5★ garanti', `${G.S.pity5} / ${SUMMON.pity5}`)}</div><button class="btn purple" style="width:100%;margin-bottom:10px" data-go="summon">🔮 Çağırma ekranını aç</button>`;
    if (key === 'barracks') body += barracksUI();
    if (key === 'drill') body += drillUI();
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
  $('sheet').innerHTML = `<i class="rk-c tl"></i><i class="rk-c tr"></i><div class="sh-head"><div class="sh-ico" id="shPortrait">${PORTRAIT_CACHE[pkey] ? `<img src="${PORTRAIT_CACHE[pkey]}">` : def.icon}</div><div class="sh-tt"><h2>${def.name}</h2><small>${L ? 'Seviye ' + L + ' / ' + maxLevel(key) : 'İnşa edilmedi'}</small></div><button class="x" data-act="close">✕</button></div>
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
// ---- Talimhane: asker seviyeleri ----
let drillSel = 'infantry';
function drillUI() {
  const t = Date.now() / 1000, u = G.S.tlvUp, kinds = Object.keys(TROOPS).filter((k) => !TROOPS[k].building);
  if (!kinds.includes(drillSel)) drillSel = 'infantry';
  const cards = kinds.map((k) => `<div class="troop tp ${k === drillSel ? 'sel' : ''}" data-drill="${k}">${troopImg(k)}<span class="tp-n">${TROOPS[k].short}</span><small>Sv.${G.troopLv(k)} / ${TROOP_LV_MAX}</small></div>`).join('');
  const k = drillSel, d = TROOPS[k], L = G.troopLv(k), N = L + 1, mx = L >= TROOP_LV_MAX;
  const sv = (st) => Math.round(d[st] * troopLvMul(L)), nv = (st) => Math.round(d[st] * troopLvMul(N));
  const row = (ic, nm, st) => `<div class="dr-st"><i>${ic}</i><span>${nm}</span><b>${sv(st)}</b>${mx ? '' : `<em>→ ${nv(st)}</em>`}</div>`;
  let act = '';
  if (u) { const pct = (t - u.start) / (u.end - u.start) * 100; act = `<p class="desc"><b>${TROOPS[u.t].short} Sv.${u.to}</b> talimde…</p><div class="progress green"><span style="width:${pct}%"></span><em>${G.fmtTime(u.end - t)}</em></div><button class="btn speedbtn" style="width:100%;margin-bottom:10px" data-act="spd" data-tg="tlv">⏩ Hızlandır ${spCountTxt()}</button>`; }
  else if (mx) act = '<div class="vp-max">👑 Bu asker en yüksek seviyede</div>';
  else { const c = G.canTroopUp(k), cost = troopLvCost(N); act = `<div class="cost">${costHtml(cost)}<span>⏱ ${G.fmtTime(troopLvTime(N))}</span></div>${c.ok ? '' : `<p class="why">${c.why}</p>`}<button class="btn red dr-go" data-act="drillup" ${c.ok ? '' : 'disabled'}>⬆ ${d.short} Sv.${N}'e yükselt</button>`; }
  return `<div class="troops">${cards}</div>
    <div class="tp-card">${troopImg(k)}<div><b>${d.name} <span class="tp-lv">Sv.${L}</span></b><p>Her seviye hasar, savunma ve canı %12 artırır. Sv.${N > TROOP_LV_MAX ? TROOP_LV_MAX : N} için Talimhane Sv.${troopLvReq(Math.min(N, TROOP_LV_MAX))} gerekir.</p></div></div>
    <div class="dr-stats">${row('⚔️', 'Hasar', 'atk')}${row('🛡️', 'Savunma', 'def')}${row('❤️', 'Can', 'hp')}</div>${act}`;
}
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
    <div class="tp-card">${troopImg(trainSel)}<div><b>${d.name}</b><p>${d.desc}</p><div class="tp-st"><span>⚔️ ${G.troopStat(trainSel, 'atk')}</span><span>🛡️ ${G.troopStat(trainSel, 'def')}</span><span>❤️ ${G.troopStat(trainSel, 'hp')}</span><span>🎒 ${d.load}</span><span class="tp-lv">Sv.${G.troopLv(trainSel)}</span></div></div></div>
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
  return s + `<div class="tankcard"><img src="assets/ui/b_tank.webp?v=2611201530" alt=""><div><b>${d.name}</b><br>${d.desc}<br><small>⚔ ${d.atk} &nbsp; 🛡 ${d.def} &nbsp; ❤ ${d.hp} &nbsp; 🎒 ${d.load}</small></div></div>
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
  const sk = e.target.closest('[data-skin]');
  if (sk) { const id = sk.dataset.skin; if (id && !G.S.skins[id]) { closeSheet(); navigate(SKINS[id].vip ? 'vip' : 'offers'); return; } G.setSkin(id || null); sfx(id ? 'reveal' : 'click'); toast(id ? `✨ ${SKINS[id].name} etkin` : 'Kostüm çıkarıldı'); syncSoon(); return renderSheet(); }
  const dr = e.target.closest('[data-drill]'); if (dr) { drillSel = dr.dataset.drill; return renderSheet(); }
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
  if (act === 'speed') { if (G.speedUp(id)) { sfx('coin'); tutEvent('speed'); helpCleanup(); } else needGold(); }
  if (act === 'askhelp') { askHelp(id); return; }
  if (act === 'collect') doCollect(id);
  if (act === 'spd') { openSpeed(a.dataset.tg); return; }
  if (act === 'drillup') { const r = G.startTroopUp(drillSel); if (!r.ok) return toast(r.why, true); toast('🎯 Talim başladı'); sfx('train'); updateTop(); return renderSheet(); }
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
  // tüm pencereler kırmızı-altın ortaçağ teması; sıralama taç-miğfer, diğerleri aslanlı kalkan arması
  const themed = box.classList.contains('win'); box.classList.toggle('rk-theme', themed); box.classList.toggle('win-lion', themed && modalKind !== 'ranking');
  PENDING_SIDE = '';
  box.innerHTML = html; $('modal').classList.add('open');
}
let PENDING_SIDE = '';
const UI = (n) => `assets/ui/${n}.webp?v=2611201530`;
const ICON_MAP = { '🗺️': 'nav_world', '⚔️': 'nav_heroes', '🛡️': 'nav_heroes', '🪙': 'res_gold', '📜': 'nav_reports', '⚜': 'nav_city', '📋': 'nav_quest', '🏆': 'ic_trophy', '📅': 'ic_calendar' };
const resImg = (r, sz = 18) => `<img src="${UI('res_' + r)}" width="${sz}" height="${sz}" alt="">`;
const pill = (r, v) => `<span class="w-pill">${resImg(r)}+${G.fmt(v)}</span>`;
function tabsHtml(tabs, active) { return `<aside class="w-side">${tabs.map((t) => `<button class="w-tab ${t.id === active ? 'on' : ''}" data-wtab="${t.id}"><img src="${UI(t.icon)}" alt=""><span>${t.label}</span>${t.dot ? '<em class="dot"></em>' : ''}</button>`).join('')}</aside>`; }
export function closeModal() { AL.sel = null; $('rkLayer').innerHTML = ''; alStopChat(); lastModalKey = ''; $('modal').classList.remove('open'); $('modalBox').innerHTML = ''; setNav('city'); }
$('modal').addEventListener('pointerdown', (e) => { if (e.target.id === 'modal') closeModal(); });
function setNav(go) { document.querySelectorAll('nav button').forEach((b) => b.classList.toggle('on', b.dataset.go === go)); }
// sağ sütun görev çubuğuna taşmasın: kısa ekranlarda orantılı küçült
function fitRside() {
  const r = $('rside'), bh = $('bottomHud'); if (!r || r.classList.contains('hidden')) return;
  const top = r.getBoundingClientRect().top, h = r.scrollHeight;
  const lim = (bh && !bh.classList.contains('hidden') ? bh.getBoundingClientRect().top : innerHeight - 190) - 4;
  const sc = Math.max(0.5, Math.min(1, (lim - top) / Math.max(1, h)));
  const v = sc < 0.999 ? `scale(${sc.toFixed(3)})` : ''; if (r.style.transform !== v) r.style.transform = v;
}
addEventListener('resize', fitRside); setInterval(fitRside, 1500);
document.querySelectorAll('nav button, #rside .rbtn').forEach((b) => b.addEventListener('click', () => navigate(b.dataset.go)));
$('goldBtn').onclick = (e) => { e.stopPropagation(); shopTab = 'gold'; navigate('shop'); };
document.querySelectorAll('#top .res[data-r]').forEach((el) => (el.onclick = () => { shopTab = 'res'; navigate('shop'); }));
$('profileBtn').onclick = (e) => { if (e.target.closest('#vipBtn')) return; navigate('profile'); };
$('vipBtn').onclick = (e) => { e.stopPropagation(); sfx('open'); navigate('vip'); };
function updateVipBadge() {
  const L = G.S.vip || 0; $('vipLvl').textContent = 'VIP ' + L; $('vipBtn').classList.toggle('off', !L); $('vipDot').classList.toggle('hidden', !G.vipBoxReady());
}
$('chipTroops').onclick = () => navigate('army');

let modalKind = '', worldSel = null, heroTab = 'mine';
export function navigate(go) {
  closeSheet();
  setNav(go);
  if (go === 'city') { closeModal(); return; }
  if (go === 'vip') { modalKind = 'vip'; setNav(''); return renderModal(); }
  if (go === 'events') { questTab = 'fy'; go = 'quests'; }

  if (go === 'campaign') { closeModal(); closeSheet(); openCampaign(); return; }
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
  return `<i class="rk-c tl"></i><i class="rk-c tr"></i><i class="rk-c bl"></i><i class="rk-c br"></i><div class="w-head"><div class="w-medal"><img src="${UI(ic)}" alt=""></div><div class="w-plaque"><i class="laurel l"></i><span>${title}</span><i class="laurel r"></i></div></div><button class="w-x" data-m="close">✕</button><!--/head-->`;
}
let lastModalKey = '';
function renderModal() {
  queueMicrotask(renderRankPop);
  const key = modalKind + ':' + BAG.tab + ':' + questTab + ':' + heroTab + ':' + shopTab + ':' + profTab;
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
  if (k === 'player') return openModal(playerUI());
  if (k === 'vip') return openModal(vipUI());
  if (k === 'army') return openModal(armyUI());
  if (k === 'quests') return openModal(questsUI());
  if (k === 'ranking') return openModal(rankingUI());
  if (k === 'login') return openModal(loginUI());
  if (k === 'attack') return openModal(attackUI());
  if (k === 'scout') return openModal(scoutUI(scoutRep));
  if (k === 'speed') return openModal(speedUI());
  if (k === 'bag') { G.S.bagSeen = G.bagCount(); G.save(); updateBagDot(); return openModal(bagUI()); }
  if (k === 'offers') return openModal(offersUI());
  if (k === 'chat') return openModal(chatUI());
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
  if (!atk.init) { atk = { init: true, rally: atk.rally || null, troops: {}, heroes: G.S.heroes[G.S.commander] ? [G.S.commander] : [] }; for (const t in TROOPS) atk.troops[t] = Math.floor(G.S.troops[t] * 0.8); }
  const owned = Object.keys(G.S.heroes).map((id) => HERO_BY_ID[id]).sort((a, b) => b.rarity - a.rarity || G.S.heroes[b.id].level - G.S.heroes[a.id].level);
  const slots = Array.from({ length: G.MAX_COMMANDERS }, (_, i) => {
    const id = atk.heroes[i];
    if (!id) return `<div class="cmd-slot empty"><span>＋</span></div>`;
    const h = HERO_BY_ID[id];
    return `<div class="cmd-slot" style="--rc:${RARITY[h.rarity].color}" data-cmdpick="${id}"><img src="assets/heroes/${id}_a.webp?v=2611201530" alt="">${i === 0 ? '<em class="crown">👑</em>' : ''}<b>Sv.${G.S.heroes[id].level}</b><i>✕</i></div>`;
  }).join('');
  const pool = owned.map((h) => `<button class="cmd-pick ${atk.heroes.includes(h.id) ? 'on' : ''}" style="--rc:${RARITY[h.rarity].color}" data-cmdpick="${h.id}"><img src="assets/heroes/${h.id}_a.webp?v=2611201530" alt=""><span>${h.name.split(' ').pop()}</span><small>${'★'.repeat(h.rarity)}</small></button>`).join('');
  let rows = '';
  for (const t in TROOPS) {
    const max = G.S.troops[t], v = Math.min(atk.troops[t] || 0, max);
    rows += `<div class="tr-row ${max ? '' : 'off'}"><div class="tr-top"><span class="tr-ic">${TROOPS[t].icon}</span><b>${TROOPS[t].name}</b><span class="tr-n">${G.fmt(v)} <small>/ ${G.fmt(max)}</small></span></div>
      <div class="tr-ctl"><input class="slider" type="range" min="0" max="${max}" value="${v}" data-slider="${t}" ${max ? '' : 'disabled'}>
      <button class="tq" data-tq="${t}:0">0</button><button class="tq" data-tq="${t}:half">½</button><button class="tq" data-tq="${t}:all">Tümü</button></div></div>`;
  }
  const tot = G.totalTroops(atk.troops), myP = G.armyPowerMulti(atk.troops, atk.heroes), better = myP >= e.power;
  const MT = e.mine ? G.MINE_TYPES[e.type] : null, rate = e.mine ? G.gatherRate(e.type, e.level, atk.troops, atk.heroes) : 0, hrs = e.mine ? G.mineHours(e.level) : 0, ref = e.mine ? G.mineRefPower(e.level) : 0;
  const RL = atk.rally && e.giant ? atk.rally : null, rTot = RL && RL.mode === 'join' ? Object.values(RL.r.members || {}).reduce((t, q) => t + (q.power || 0), 0) : 0;
  return head(RL ? 'Ralli Birliği' : e.mine ? 'Kazım Birliği' : 'Sefer Kampı', '⚔️') + `
    <div class="w-banner camp-banner"><div><div class="bt">${e.mine ? MT.icon + ' ' : ''}${e.name}</div><div class="bs">${RL ? `Ralli • en fazla ${G.RALLY_MAX} kişi • ${RL.mode === 'join' ? 'katılıyorsun' : 'katılım ' + G.RALLY_WAIT / 60 + ' dk'}` : e.mine ? `En fazla ${hrs} saat kazım • Tam verim için ⚔ ${G.fmt(ref)}` : `Lord ${e.lord} • ⚔ ${G.fmt(e.power)}`}</div></div></div>
    <div class="w-card"><div class="camp-h"><b>Komutanlar</b><span>${atk.heroes.length} / ${G.MAX_COMMANDERS}</span></div>
      <div class="cmd-slots">${slots}</div>
      <div class="cmd-pool">${pool || '<p class="desc">Henüz kahramanın yok.</p>'}</div>
      <p class="camp-note">İlk komutan 👑 tam bonus verir, diğerleri azalan oranda (%50, %35, %25, %20) katkı sağlar.</p></div>
    <div class="w-card"><div class="camp-h"><b>Birlikler</b><span>${G.fmt(tot)} asker</span></div>
      <div class="row" style="margin-bottom:8px"><button class="w-btn" data-tall="none">Temizle</button><button class="w-btn" data-tall="half">Yarısı</button><button class="w-btn gold" data-tall="all">Hepsini seç</button></div>
      ${rows}</div>
    ${e.mine ? `<div class="stats"><div class="stat"><small>Birlik gücü</small><b style="color:${myP >= ref ? '#7dff9a' : '#ffb08a'}">⚔ ${G.fmt(myP)}</b></div><div class="stat"><small>Saatlik verim</small><b>${MT.icon} ${G.fmt(rate)}</b></div><div class="stat"><small>Kazım süresi</small><b>⏱ ${hrs} sa</b></div><div class="stat"><small>Toplam (tam süre)</small><b>${MT.icon} ${G.fmt(Math.floor(rate * hrs))}</b></div></div>
      <p class="camp-note">${myP >= ref ? '✅ Tam verim!' : `Daha güçlü birlik = daha çok kaynak (tam verim ⚔ ${G.fmt(ref)}).`} Komutanlar verimi %50'ye kadar artırır. Birlik sayısı: ${G.S.marches.length}/${G.MAX_MARCHES}</p>`
    : RL ? `<div class="stats"><div class="stat"><small>Senin katkın</small><b>⚔ ${G.fmt(myP)}</b></div><div class="stat"><small>Ralli toplamı</small><b style="color:${rTot + myP >= e.power ? '#7dff9a' : '#ffb08a'}">⚔ ${G.fmt(rTot + myP)}</b></div><div class="stat"><small>Dev gücü</small><b>⚔ ${G.fmt(e.power)}</b></div><div class="stat"><small>Birlikler</small><b>${G.S.marches.length}/${G.MAX_MARCHES}</b></div></div><p class="camp-note">Toplam güç devin gücüne yetmeli. Süre bitmeden 30 sn önce birlikler ralli liderinin şehrinde toplanır.</p>`
    : `<div class="stats"><div class="stat"><small>Ordu gücün</small><b style="color:${better ? '#7dff9a' : '#ffb08a'}">⚔ ${G.fmt(myP)}</b></div><div class="stat"><small>Düşman gücü</small><b>⚔ ${G.fmt(e.power)}</b></div></div>`}
    <div class="row"><button class="btn gray" data-m="world">Geri</button><button class="btn red" data-m="march" ${tot ? '' : 'disabled'}>${RL ? (RL.mode === 'join' ? '🤝 Ralliye katıl' : '📯 Ralli aç') : e.mine ? '⛏ Kazmaya gönder' : '🚩 Yürüyüşe çık'}</button></div>`;
}
let questTab = 'main';
const QICON = { wins: 'ic_trophy', summons: 'ic_summon', trained: 'nav_heroes', zombies: 'ic_zombie', giants: 'ic_giant', rallies: 'ic_rally', collects: 'res_food', gathers: 'em_pickaxe', upgrades: 'ic_builder', heals: 'em_bandage', tanks: 'b_tank', speedups: 'sp_t2', energy: 'ic_energy', kills: 'rk_i_swords', scouts: 'em_heli' };
const rewardTxt = (r) => Object.entries(r).filter(([k]) => RES[k]).map(([k, v]) => `${RES[k].icon} ${G.fmt(v)}`).join('  ') + (r.energy ? `  ⚡ ${r.energy}` : '') + (r._items ? '  ' + r._items.map((it) => `⏩ ${SPEEDUPS[it.id].short}${it.n > 1 ? ' ×' + it.n : ''}`).join('  ') : '');
// Ödül alındığında: kaynak bildirimi + büyük hızlandırma çıktıysa özel kutlama
function rewardFx(r, icon = '🎉') {
  toast(icon + ' ' + rewardTxt(r) + '  → 🎒 Çantaya eklendi');
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
export const frameHtml = (hero, fr, sz = 48) => { fr = FRAME_BY_ID[fr] ? fr : 'bronze'; const f = UI('fr_' + fr); return `<span class="fav ${isPremFrame(fr) ? 'anim fa-' + fr : ''}" style="--s:${sz}px;--m:url(${f})"><img class="fav-a" src="assets/heroes/${hero || 'emre'}_a.webp?v=2611201530" alt=""><span class="fav-fw"><img class="fav-f" src="${f}" alt=""><i class="fav-sh"></i></span></span>`; };
// Hızlandırma simgesi: kum saati (nadirlik rengi) + süre rozeti
export const spIcon = (id, sz = 56, n) => { const d = SPEEDUPS[id]; return `<span class="sp-ic t${d.tier}" style="--sz:${sz}px"><img src="${UI('sp_t' + d.tier)}" alt=""><b>${d.short}</b>${n != null ? `<em>×${G.fmt(n)}</em>` : ''}</span>`; };
const rewardPills = (r) => Object.entries(r).map(([k, v]) => pill(k, v)).join('');
function questsUI() {
  G.dailyReset();
  let body = '';
  const qChips = (r) => [...['food', 'wood', 'stone', 'gold'].filter((k) => r[k]).map((k) => pill(k, r[k])), r.energy ? `<span class="w-pill"><img src="${UI('ic_energy')}" alt="">+${r.energy}</span>` : '', ...Object.entries(r.items || {}).map(([k, n]) => spIcon(k, 26, n > 1 ? n : null))].join('');
  const qRow = (icon, text, x, y, reward, btn, no) => `<div class="w-row qrow"><img src="${UI(icon)}" alt=""><div class="rt">${no ? `<em class="q-no">#${no}</em>` : ''}${text}<div class="pb"><i><b style="width:${Math.min(100, x / y * 100)}%"></b></i><small>${G.fmt(x)}/${G.fmt(y)}</small></div></div><div class="qr-side"><div class="qr-rw">${qChips(reward)}${questTab === 'daily' ? `<span class="w-pill sp-q ev" title="Rastgele hızlandırma"><img src="${UI('sp_t3')}" alt="">?</span>` : ''}</div>${btn}</div></div>`;
  if (questTab === 'main') {
    const list = G.activeQuests();
    const doneN = list.filter(G.questDone).length;
    body += `<div class="w-banner sm" style="background-image:url(${UI('banner_quest')})"><div><div class="bt">Krallık Görevleri</div><div class="bs">${QUESTS.length} görev • her görevin ödülü farklı</div></div><span class="bt2">${Object.keys(G.S.qClaimed).length} / ${QUESTS.length}</span></div>`;
    if (doneN > 1) body += `<button class="w-btn gold q-all" data-claimall>✓ Tamamlananları al</button>`;
    if (!list.length) body += '<p class="desc">🏆 Tüm ana görevleri tamamladın!</p>';
    for (const q of list) {
      const [x, y] = G.questProgress(q), ok = x >= y, k = q.t[1];
      const icon = q.t[0] === 'bld' ? 'nav_city' : QICON[k] || 'nav_quest';
      body += qRow(icon, q.text, x, y, q.reward, ok ? `<button class="w-btn gold" data-claimq="${q.id}">Al</button>` : `<button class="w-btn" data-goq="${q.id}">Git</button>`, q.no);
    }
  } else if (questTab === 'daily') {
    const n = G.dailyClaimedCount();
    const steps = [1, 2, 3, DAILY_CHEST.need];
    body += `<div class="w-banner sm" style="background-image:url(${UI('banner_quest')})"><div><div class="bt">Günlük Görevler</div><div class="bs">${DAILY_CHEST.need} görev bitir, sandığı aç! ⏩ 24 saate kadar hızlandırma şansı</div></div><span class="bt2">⏱ ${G.fmtTime((new Date().setHours(24, 0, 0, 0) - Date.now()) / 1000)}</span></div>`;
    body += `<div class="w-card"><div class="w-track">${steps.map((st, i) => `<div class="ms ${n >= st ? 'ok' : ''}"><div class="box"><img src="${UI(i === 3 ? 'nav_shop' : i === 1 ? 'res_gold' : 'res_food')}" alt="">${i === 3 ? '' : `<small>${i === 1 ? '+30' : '+500'}</small>`}</div><div class="node">${st}</div></div>`).join('')}</div>
      <div style="text-align:center;margin-top:8px"><button class="w-btn gold" data-chest ${!G.S.daily.chest && n >= DAILY_CHEST.need ? '' : 'disabled'}>${G.S.daily.chest ? 'Sandık alındı' : `Sandığı aç (${Math.min(n, DAILY_CHEST.need)}/${DAILY_CHEST.need})`}</button></div></div>`;
    for (const d of DAILY) {
      const x = G.dailyProg(d), ok = x >= d.n, got = G.S.daily.claimed[d.id];
      const icon = { collects: 'res_food', trained: 'nav_heroes', upgrades: 'nav_city', wins: 'ic_trophy', summons: 'ic_summon', heals: 'ic_gift' }[d.stat] || 'nav_quest';
      body += qRow(icon, d.text, x, d.n, d.reward, got ? '<button class="w-btn green" disabled>✓</button>' : ok ? `<button class="w-btn gold" data-claimd="${d.id}">Al</button>` : `<button class="w-btn" data-goq="d:${d.stat}">Git</button>`);
    }
  } else if (questTab === 'fy') body += fyBody();
  else body += loginBody();
  const dailyDot = DAILY.some((d) => !G.S.daily.claimed[d.id] && G.dailyProg(d) >= d.n);
  return head('Görevler', 'nav_quest', [{ id: 'fy', label: 'Fetih Yolu', icon: 'ic_campaign', dot: G.fyClaimable() > 0 }, { id: 'main', label: 'Ana Görevler', icon: 'nav_quest', dot: G.activeQuests().some(G.questDone) }, { id: 'daily', label: 'Günlük', icon: 'ic_calendar', dot: dailyDot }, { id: 'login', label: 'Giriş Ödülü', icon: 'ic_gift', dot: G.loginPending() }], questTab) + body;
}
// ---- Fetih Yolu etkinliği ----
let fyView = null;
const rwChips = (r) => [...['food', 'wood', 'stone', 'gold'].filter((k) => r[k]).map((k) => `<span class="vp-chip"><img src="${UI('res_' + k)}" alt="">${G.fmt(r[k])}</span>`), r.energy ? `<span class="vp-chip"><img src="${UI('ic_energy')}" alt="">${r.energy}</span>` : '', ...Object.entries(r.items || {}).map(([k, n]) => spIcon(k, 34, n))].join('');
function fyBody() {
  const st = G.fyState(), d = fyView == null || fyView > st.day ? st.day : fyView, tasks = G.fyDayTasks(d), got = G.fyDayClaimed(d), all = FY_DAYS[d], bonusGot = G.S.fy.bonus[d];
  const days = FY_DAYS.map((_, i) => { const lock = i > st.day, done = G.S.fy.bonus[i], dot = !lock && (G.fyDayTasks(i).some((q) => !G.S.fy.claimed[q.i] && G.fyDone(q)) || (!done && G.fyDayClaimed(i) >= FY_DAYS[i]));
    return `<button class="fy-day ${i === d ? 'on' : ''} ${lock ? 'lock' : ''} ${done ? 'done' : ''}" data-fyday="${i}" ${lock ? 'disabled' : ''}><small>Gün</small><b>${i + 1}</b>${lock ? '<i>🔒</i>' : done ? '<i>✓</i>' : ''}${dot ? '<em class="dot"></em>' : ''}</button>`; }).join('');
  const rows = tasks.map((q) => { const x = G.fyProg(q), ok = x >= q.n, c = G.S.fy.claimed[q.i];
    return `<div class="w-row fy-row ${c ? 'got' : ''}"><img src="${UI(q.icon)}" alt=""><div class="rt">${q.text}<div class="pb"><i><b style="width:${Math.min(100, x / q.n * 100)}%"></b></i><small>${G.fmt(Math.min(x, q.n))}/${G.fmt(q.n)}</small></div><div class="fy-rw">${rwChips(q.reward)}</div></div>${c ? '<button class="w-btn green" disabled>✓</button>' : ok ? `<button class="w-btn gold" data-fyclaim="${q.i}">Al</button>` : '<button class="w-btn" disabled>…</button>'}</div>`; }).join('');
  const total = Object.keys(G.S.fy.claimed).length;
  return `<div class="w-banner fy-ban" style="background-image:url(${UI('banner_quest')})"><div><div class="bt">Fetih Yolu</div><div class="bs">7 gün • 100 görev • her gün yeni görevler</div></div><span class="bt2">${total} / ${FY_TASKS.length}</span><span class="fy-end">⏳ ${G.fmtTime(st.endsIn)}</span></div>
    <div class="fy-days">${days}</div>
    <div class="w-card fy-top"><div class="fy-th"><b>Gün ${d + 1} ilerlemesi</b><span>${got} / ${all}</span></div>
      <div class="fy-bar"><i style="width:${got / all * 100}%"></i>${Array.from({ length: all - 1 }, (_, k) => `<s style="left:${(k + 1) / all * 100}%"></s>`).join('')}</div>
      <div class="fy-bonus"><img src="${UI('nav_shop')}" alt=""><div><b>Gün sandığı</b><small>Günün ${all} görevini tamamla • içinden sürpriz ödül çıkar 🎁</small></div>${bonusGot ? '<button class="w-btn green" disabled>✓ Alındı</button>' : `<button class="w-btn gold" data-fybonus="${d}" ${got >= all ? '' : 'disabled'}>Aç</button>`}</div>
      ${d === st.day && st.day < 6 ? `<small class="fy-next">Gün ${st.day + 2} görevleri ${G.fmtTime(st.nextIn)} sonra açılır</small>` : ''}</div>
    ${rows}`;
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
// ---- Sıralamalar: Krallık (güç), İttifak, Kahraman (en güçlü 5), Görev (bölüm-aşama) ----
let rankTab = 'power';
const RK = { hero: { at: 0, list: null }, camp: { at: 0, list: null }, ally: { at: 0, list: null } };
function rkLoad(k) {
  const c = RK[k]; if (!online.ready || Date.now() - c.at < 60000) return; c.at = Date.now();
  (k === 'ally' ? topAlliances(200) : topBy(k === 'hero' ? 'heroPow5' : 'camp', 50)).then((l) => { c.list = l; if (modalKind === 'ranking' && rankTab === k) renderModal(); });
}
const vipTag = (n) => (n > 0 ? ` <i class="vipt v${n}">VIP ${n}</i>` : '');
const rkMedal = (i) => (i < 3 ? `<i class="rk-medal m${i + 1}">${i + 1}</i>` : `<i class="rk-num">${i + 1}</i>`);
function rankingUI() {
  const tabs = [{ id: 'power', label: 'Krallık', icon: 'rk_i_crown' }, { id: 'ally', label: 'İttifak', icon: 'rk_i_swords' }, { id: 'hero', label: 'Kahraman', icon: 'rk_i_laurel' }, { id: 'camp', label: 'Görev', icon: 'rk_i_scroll' }];
  const H = (b) => head('Sıralama', 'ic_trophy', tabs, rankTab) + b;
  if (rankTab === 'power') return H(powerRankHtml());
  if (!online.ready) return H('<div class="al-off">🌐 Bu sıralama için çevrimiçi olmalısın.</div>');
  rkLoad(rankTab);
  const list = RK[rankTab].list;
  if (!list) return H('<div class="al-off">Yükleniyor…</div>');
  if (rankTab === 'ally') {
    const myA = G.S.alliance?.id, rows = list.map((a) => ({ a, pw: alPower(a), n: Object.keys(a.members || {}).length })).filter((x) => x.n).sort((x, y) => y.pw - x.pw).slice(0, 50);
    return H(`<div class="rk-desc">⚔ İttifak gücü: tüm üyelerin toplam gücü</div><div class="rk-list">` + (rows.length ? rows.map(({ a, pw, n }, i) => `<div class="rk-row ${a.id === myA ? 'me' : ''} ${i < 3 ? 'top' + (i + 1) : ''}">
      <div class="rk-av rk-al">${alEm(a.emblem, a.color, 50)}${rkMedal(i)}</div>
      <div class="rk-n"><b><em class="rk-tag">[${esc(a.tag)}]</em> ${esc(a.name)}</b><small>👥 ${n}/${ALLIANCE_MAX} • Sunucu #${a.server || 1}</small></div>
      <div class="rk-p">⚔ ${G.fmt(pw)}</div></div>`).join('') : '<div class="rk-empty">Henüz ittifak yok</div>') + '</div>');
  }
  // oyuncu sıralamaları (benim satırım da listede)
  const meVal = rankTab === 'hero' ? G.heroPow5() : G.S.camp?.done || 0, field = rankTab === 'hero' ? 'heroPow5' : 'camp';
  const rows = list.filter((p) => p.uid !== online.uid).map((p) => ({ uid: p.uid, pid: p.pid, name: p.name || 'Oyuncu', hero: p.cmd || p.hero?.id, frame: p.frame, tag: p.alliance?.tag, v: p[field] || 0, sc: p.showcase || [], vip: p.vip || 0 }));
  rows.push({ me: true, vip: G.S.vip || 0, uid: online.uid, name: G.S.name, hero: G.S.commander, frame: G.S.frame, tag: G.S.alliance?.tag, v: meVal, sc: G.showcaseIds().map((id) => ({ id })) });
  rows.sort((a, b) => b.v - a.v);
  const mini = (sc) => sc.slice(0, 5).filter((x) => HERO_BY_ID[x.id]).map((x) => `<img src="assets/heroes/${x.id}_a.webp?v=2611201530" alt="">`).join('');
  const desc = rankTab === 'hero' ? '🦸 Kahraman gücü: en güçlü 5 kahramanın toplam gücü' : '⚔ Görev ilerlemesi: bölüm ve aşama (3-2, 2-15\'in üstündedir)';
  return H(`<div class="rk-desc">${desc}</div><div class="rk-list">` + rows.map((r, i) => `<div class="rk-row pv ${r.me ? 'me' : ''} ${i < 3 ? 'top' + (i + 1) : ''}" ${r.me ? `data-pview="${online.uid}"` : pvAttr(r.uid, r.name, r.hero, r.frame, r.pid)}>
      <div class="rk-av">${frameHtml(r.hero, r.frame, 46)}${rkMedal(i)}</div>
      <div class="rk-n"><b class="rk-nb"><span>${r.tag ? `<em class="rk-tag">[${esc(r.tag)}]</em> ` : ''}${esc(r.name)}${r.me ? ' <small>(sen)</small>' : ''}</span>${vipTag(r.vip)}</b>${rankTab === 'hero' ? `<span class="rk-mini">${mini(r.sc)}</span>` : `<small>${r.v ? r.v + ' aşama tamamlandı' : 'Henüz başlamadı'}</small>`}</div>
      <div class="rk-p">${rankTab === 'hero' ? '🦸 ' + G.fmt(r.v) : `<span class="rk-stage">${stageLabel(r.v)}</span>`}</div></div>`).join('') + '</div>');
}
function powerRankHtml() {
  const hsh = (t) => { let h = 0; for (const c of String(t)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  const freeFr = FRAMES.filter((f) => f.free), heroIds = HEROES.map((h) => h.id);
  const me = { name: G.S.name, sub: 'Sen', power: G.cityPower(), me: true, vip: G.S.vip || 0, hero: G.S.commander, frame: G.S.frame, tag: G.S.alliance?.tag };
  if (online.ready && Date.now() - G.ONLINE.topAt > 60000) { G.ONLINE.topAt = Date.now(); topPlayers(50).then((l) => { G.ONLINE.top = l; if (modalKind === 'ranking') renderModal(); }); }
  const real = G.ONLINE.top.filter((p) => p.uid !== online.uid).map((p) => ({ uid: p.uid, pid: p.pid, vip: p.vip || 0, name: p.name || 'Oyuncu', real: true, sub: 'Belediye Sv.' + (p.th || 1), power: p.power || 0, hero: p.hero?.id || heroIds[hsh(p.uid) % heroIds.length], frame: p.frame || freeFr[hsh(p.uid) % freeFr.length].id, tag: p.alliance?.tag }));
  const bots = G.S.enemies.map((e) => ({ name: e.name, sub: e.lord, power: Math.round(e.power * 1.6 + e.th * 2500), hero: heroIds[hsh(e.name) % heroIds.length], frame: freeFr[hsh(e.lord) % freeFr.length].id }));
  const list = real.concat(bots).concat([me]).sort((a, b) => b.power - a.power);
  const medal = (i) => (i < 3 ? `<i class="rk-medal m${i + 1}">${i + 1}</i>` : `<i class="rk-num">${i + 1}</i>`);
  return '<div class="rk-list">' + list.map((r, i) => `<div class="rk-row ${r.me ? 'me' : ''} ${i < 3 ? 'top' + (i + 1) : ''} ${r.uid || r.me ? 'pv' : ''}" ${r.uid ? pvAttr(r.uid, r.name, r.hero, r.frame, r.pid) : r.me ? `data-pview="${online.uid || 'me'}"` : ''}>
      <div class="rk-av">${frameHtml(r.hero, r.frame, 46)}${medal(i)}</div>
      <div class="rk-n"><b class="rk-nb"><span>${r.tag ? `<em class="rk-tag">[${r.tag}]</em> ` : ''}${r.name}${r.real ? ' <span class="rk-real">🌐</span>' : ''}</span>${vipTag(r.vip)}</b><small>${r.sub}</small></div>
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
      <img src="assets/heroes/${h.id}.webp?v=2611201530" alt="" loading="lazy"><span class="st">${starsHtml(h, o?.ups, 13)}</span>${o ? `<span class="lv">Sv.${o.level}</span>` : ''}${o && h.rarity + (o.ups || 0) < 10 && o.copies >= (STAR_PATH[h.rarity][o.ups || 0] ?? 1e9) ? '<em class="hc-up">⬆</em>' : ''}<div class="hn">${h.name}</div></div>`;
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
const AL = { rallies: null, runsub: null, doc: null, list: null, chat: null, chatErr: '', unsub: null, tab: 'find', q: '', form: { name: '', tag: '', emblem: 0, color: 1, desc: '', open: true }, busy: false, err: '' };
const alEm = (e, c, sz = 46) => `<span class="al-em" style="--c:${AL_COLORS[c] || AL_COLORS[1]};--s:${sz}px"><img src="${UI('ac_' + (AL_EMBLEMS[e] ? e : 0))}" alt=""></span>`;
const alPower = (a) => Object.values(a.members || {}).reduce((t, m) => t + (m.power || 0), 0);
function alStopChat() { if (AL.unsub) { AL.unsub(); AL.unsub = null; } if (AL.runsub) { AL.runsub(); AL.runsub = null; } }
function alRerender() { if (modalKind === 'alliance' && $('modal').classList.contains('open')) { const inp = $('alChatIn'), v = inp?.value; renderModal(); if (v && $('alChatIn')) $('alChatIn').value = v; } }
// ittifak verisini sunucudan tazele; üyelik bittiyse kaydı temizle; gücümü güncelle
async function alRefresh() {
  if (!online.ready) return;
  if (G.S.alliance) {
    const a = await getAlliance(G.S.alliance.id);
    if (!a || !a.members?.[online.uid]) { AL.doc = null; G.setAlliance(null); toast('🏳️ Artık bir ittifakta değilsin'); }
    else { AL.doc = a; G.setAlliance(a); const m = a.members[online.uid], me = G.myMember(); if (Math.abs((m.power || 0) - me.power) > me.power * 0.03 || m.frame !== me.frame || m.name !== me.name || m.th !== me.th) { updateMember(a.id, me, m.role, m.joined, m.rank); a.members[online.uid] = { ...m, ...me }; } }
  } else AL.list = (await listAlliances(G.S.server || 1)).sort((x, y) => alPower(y) - alPower(x));
  helpWatch();
  alRerender();
}
function openAlliance() { modalKind = 'alliance'; AL.tab = G.S.alliance ? 'main' : 'find'; lastModalKey = ''; renderModal(); alRefresh(); }
function alTabs() { return G.S.alliance ? [{ id: 'main', label: 'İttifakım', icon: 'ic_alliance' }, { id: 'help', label: 'Yardım', icon: 'ic_alhelp', dot: helpPending().length > 0 }, { id: 'shop', label: 'Dükkan', icon: 'ic_alshop' }, { id: 'members', label: 'Üyeler', icon: 'nav_heroes' }, { id: 'rally', label: 'Ralli', icon: 'ic_rally' }, { id: 'chat', label: 'Sohbet', icon: 'nav_quest' }] : [{ id: 'find', label: 'İttifak Ara', icon: 'nav_world' }, { id: 'create', label: 'İttifak Kur', icon: 'ic_alliance' }]; }
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
  if (AL.tab === 'members') return H(membersHtml(a, mem, me));
  if (AL.tab === 'rally') {
    if (!AL.runsub) { AL.rallies = null; AL.runsub = watchRallies(a.id, (list, err) => { AL.rallies = list || []; AL.rallyErr = err || ''; alRerender(); }); }
    const nowMs = Date.now(), list = (AL.rallies || []).filter((r) => r.endsAt > nowMs).sort((x, y) => x.endsAt - y.endsAt);
    const busy = G.S.marches.length >= G.MAX_MARCHES;
    const cards = list.map((r) => { const mem = Object.values(r.members || {}), n = mem.length, tot = mem.reduce((t, q) => t + (q.power || 0), 0), need = r.giant.power, joined = !!r.members?.[me], pct = Math.min(100, tot / need * 100);
      return `<div class="rl-card ${joined ? 'in' : ''}"><div class="rl-gi"><img src="${UI('ic_giant')}" alt=""><b>${r.giant.level}</b></div>
        <div class="rl-info"><b>${r.giant.pyr ? '🔺 Piramit' : '🗿 Dev'} Sv.${r.giant.level}</b><small>👑 ${(r.leaderName || '').replace(/</g, '')} • 👥 ${n}/${G.RALLY_MAX}</small>
          <div class="rl-bar ${tot >= need ? 'ok' : ''}"><i style="width:${pct.toFixed(0)}%"></i><span>⚔ ${G.fmt(tot)} / ${G.fmt(need)}</span></div>
          <div class="rl-av">${mem.map((q) => frameHtml(q.hero, q.frame, 24)).join('')}</div></div>
        <div class="rl-side"><em data-rc="${r.endsAt}">${fmtMs(r.endsAt - nowMs)}</em>${joined ? '<span class="rl-tag">Katıldın</span>' : `<button class="w-btn green" data-rjoin="${r.id}" ${n >= G.RALLY_MAX || busy ? 'disabled' : ''}>${n >= G.RALLY_MAX ? 'Dolu' : 'Katıl'}</button>`}</div></div>`; }).join('');
    return H(`<div class="rl-head"><img src="${UI('ic_rally')}" alt=""><div><b>Ralliler</b><small>Devleri birlikte kesin! En fazla ${G.RALLY_MAX} kişi • katılım ${G.RALLY_WAIT / 60} dk • ödüller herkese eşit</small></div></div>
      <button class="rl-create" data-rnew><img src="${UI('ic_giant')}" alt=""><span>Ralli oluştur</span><small>Haritada dev ara</small></button>
      ${AL.rallyErr ? `<div class="why">${AL.rallyErr}</div>` : ''}
      <h4 class="rl-h">Açık ralliler ${busy ? '<small>(3 birliğin de dışarıda)</small>' : ''}</h4>
      ${AL.rallies === null ? '<div class="al-off">Yükleniyor…</div>' : list.length ? `<div class="rl-list">${cards}</div>` : '<div class="al-off">Şu an açık ralli yok. İlkini sen aç! 🗿</div>'}`);
  }
  if (AL.tab === 'chat') {
    if (!AL.unsub) { AL.chat = null; AL.unsub = watchChat(a.id, (msgs, err) => { if (msgs) AL.chat = msgs; else AL.chatErr = err; alRerender(); const box = $('alChat'); if (box) box.scrollTop = box.scrollHeight; }); }
    const tm = (t) => new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    return H(`<div class="al-chat" id="alChat">${AL.chatErr ? `<div class="why">${AL.chatErr}</div>` : AL.chat === null ? '<div class="al-off">Yükleniyor…</div>' : !AL.chat.length ? '<div class="al-off">Henüz mesaj yok. İlk mesajı sen yaz! 👋</div>'
      : AL.chat.map((m) => `<div class="al-msg ${m.uid === me ? 'me' : ''}">${frameHtml(m.hero, m.frame, 32)}<div class="al-bub"><b>${(m.name || '').replace(/</g, '')} <small>${tm(m.t)}</small></b><span>${String(m.text).replace(/</g, '&lt;')}</span></div></div>`).join('')}</div>
      <div class="al-send"><input id="alChatIn" maxlength="300" placeholder="Mesaj yaz…"><button class="w-btn gold" data-alsend>Gönder</button></div>`);
  }
  if (AL.tab === 'help') return H(helpTabHtml(a));
  if (AL.tab === 'shop') return H(alShopHtml());
  // Ana sayfa: üstte arma ve bilgiler, duyuru, altında özellik afişleri
  const pend = helpPending().length, ld = (a.members?.[a.leader]?.name || '-').replace(/</g, '');
  const feats = [
    { tab: 'help', img: 'ic_alhelp', t: 'İttifak Yardımı', s: 'Yükseltmelere yardım et, süreleri kısalt', n: pend, c: '#6a1e30' },
    { tab: 'shop', img: 'ic_alshop', t: 'İttifak Dükkanı', s: 'Yarı fiyatına hızlandırma ve kaynak', c: '#5a3a12' },
    { tab: 'rally', img: 'ic_rally', t: 'Ralliler', s: 'Devleri birlikte kesin', c: '#6a3a10' },
    { tab: 'members', img: 'ic_almembers', t: 'Üyeler', s: `${mem.length}/${ALLIANCE_MAX} üye • ⚔ ${G.fmt(alPower(a))}`, c: '#173a6e' },
    { tab: 'chat', img: 'ic_alchat', t: 'İttifak Sohbeti', s: 'Müttefiklerinle konuş', c: '#1e4a36' },
  ];
  return H(`<div class="al2-top" style="background-image:url(${UI('bg_alliance')})">
      <div class="al2-flag" style="--c:${AL_COLORS[a.color] || AL_COLORS[1]}">${alEm(a.emblem, a.color, 64)}<span class="al2-tag">[${a.tag}]</span></div>
      <div class="al2-info">
        <div class="al2-name"><b>${a.name.replace(/</g, '')}</b></div>
        <div><span>Lider:</span><b>👑 ${ld}</b></div>
        <div><span>Savaş gücü:</span><b class="g">⚔ ${G.fmt(alPower(a))}</b></div>
        <div><span>Rütben:</span><b class="al2-rk"><img src="${UI('rk_' + rankOf(a, me))}" alt="">R${rankOf(a, me)} ${RANKS[rankOf(a, me)]}</b></div>
        <div><span>Üye:</span><b>${mem.length}/${ALLIANCE_MAX}</b><small class="al2-srv">#${a.server} • ${a.open ? '🔓' : '🔒'}</small></div>
        <button class="al2-mail" data-algo="chat">💬 Sohbete git</button>
      </div>
    </div>
    <div class="al2-ann ${lead ? 'can' : ''}" ${lead ? 'data-alann' : ''}><em>[Duyuru]</em><span>${a.desc ? a.desc.replace(/</g, '') : 'Henüz duyuru yok.'}</span>${lead ? `<b>${AL.annOpen ? '▲' : '▼'}</b>` : ''}</div>
    ${lead && AL.annOpen ? `<div class="al-lead al2-edit"><textarea id="alEditDesc" maxlength="140" rows="2" placeholder="Duyuruyu düzenle…">${(a.desc || '').replace(/</g, '')}</textarea><div class="row"><button class="w-btn" data-alsave>💾 Kaydet</button><button class="w-btn" data-altoggle>${a.open ? '🔒 Kapalı yap' : '🔓 Açık yap'}</button></div></div>` : ''}
    <div class="al2-feats">${feats.map((f) => `<button class="al2-feat" style="--fc:${f.c}" data-algo="${f.tab}"><div class="al2-ft"><b>${f.t}</b><small>${f.s}</small></div><img src="${UI(f.img)}" alt="">${f.n ? `<em class="al2-n">${f.n}</em>` : ''}</button>`).join('')}</div>
    <p class="desc al-note">🤝 Müttefiklerin haritada yeşil halkayla görünür ve onlara saldırılamaz.</p>
    <button class="w-btn red al-go al2-leave" data-alleave>🏳️ ${lead && mem.length === 1 ? 'İttifakı dağıt' : 'İttifaktan ayrıl'}</button>`);
}
// =====================================================================
//  İttifak yardımı
// =====================================================================
const HELP = { list: [], unsub: null, aid: null, busy: false, deleting: new Set() };
const helpCount = (d) => Object.keys(d.helpers || {}).length;
// başkalarının, benim henüz yardım etmediğim, dolmamış istekleri
function helpPending() { const me = online.uid; return HELP.list.filter((d) => d.uid !== me && !(d.helpers || {})[me] && helpCount(d) < (d.max || G.HELP_MAX) && (d.ends || 0) > Date.now()); }
function helpWatch() {
  const aid = online.ready && G.S.alliance ? G.S.alliance.id : null;
  if (aid === HELP.aid && (HELP.unsub || !aid)) return;
  if (HELP.unsub) { HELP.unsub(); HELP.unsub = null; }
  HELP.aid = aid; HELP.list = []; updateHelpBadge();
  if (aid) HELP.unsub = watchHelps(aid, (list, err) => { if (list) HELP.list = list; HELP.err = err || ''; onHelps(); });
}
function delHelp(d) { if (HELP.deleting.has(d.id)) return; HELP.deleting.add(d.id); deleteHelp(HELP.aid, d.id).finally(() => setTimeout(() => HELP.deleting.delete(d.id), 15000)); }
// kendi isteklerime gelen yardımları uygula, biten istekleri sil
function onHelps() {
  const me = online.uid;
  for (const d of HELP.list) {
    if (d.uid !== me) continue;
    if (G.helpStale(d.plot, d.level)) { delHelp(d); continue; }
    const n = helpCount(d), before = G.helpable(d.plot)?.requested?.applied || 0;
    const cut = G.applyHelps(d.plot, d.level, n);
    if (cut > 0) {
      const names = Object.keys(d.helpers || {}).slice(before).map((u) => AL.doc?.members?.[u]?.name).filter(Boolean);
      toast(`🤝 ${names.length ? names.slice(0, 2).join(', ') + (names.length > 2 ? ` +${names.length - 2}` : '') : 'Müttefiklerin'} yardım etti • ${d.bname} −${G.fmtTime(cut)}`);
      sfx('coin'); refreshPlot(d.plot); if (sheetId === d.plot) renderSheet();
    }
    if (n >= (d.max || G.HELP_MAX)) delHelp(d);
  }
  updateHelpBadge(); alRerender();
}
function helpCleanup() { if (HELP.aid && HELP.list.length) onHelps(); }
function updateHelpBadge() { const n = helpPending().length, el = $('alDot'); if (!el) return; el.textContent = '+' + n; el.classList.toggle('hidden', !n); }
function helpBtnHtml(id) {
  if (!G.S.alliance) return '';
  const h = G.helpable(id); if (!h) return '';
  if (h.requested) { const n = Math.min(G.HELP_MAX, HELP.list.find((d) => d.id === h.requested.hid) ? helpCount(HELP.list.find((d) => d.id === h.requested.hid)) : h.requested.applied); return `<button class="btn helpbtn done" style="width:100%;margin-bottom:8px" disabled>🤝 Yardım istendi • ${n}/${G.HELP_MAX}</button>`; }
  return `<button class="btn helpbtn" style="width:100%;margin-bottom:8px" data-act="askhelp">🤝 Yardım iste <small>(her biri −${G.fmtTime(h.per)})</small></button>`;
}
async function askHelp(id) {
  const h = G.helpable(id); if (!h || h.requested) return;
  if (!G.S.alliance || !online.ready) return toast('Yardım istemek için çevrimiçi bir ittifakta olmalısın', true);
  const p = PLOTS.find((q) => q.id === id), hid = `${online.uid}_${id}_${h.level}`;
  const r = await requestHelp(G.S.alliance.id, hid, { name: G.S.name, hero: G.S.commander, frame: G.S.frame, plot: id, bname: BUILDINGS[p.key].name, level: h.level, per: h.per, max: G.HELP_MAX, ends: Math.round(G.S.buildings[id].busyUntil * 1000) });
  if (!r.ok) return toast(r.why, true);
  G.markHelp(id, h.level, hid, h.per); helpWatch(); sfx('click'); toast('🤝 İttifaktan yardım istendi'); renderSheet();
}
async function doHelp(list) {
  if (HELP.busy || !list.length) return; HELP.busy = true;
  let ok = 0, err = '';
  for (const d of list) { const r = await giveHelp(HELP.aid, d.id); if (r.ok) ok++; else err = r.why; }
  HELP.busy = false;
  if (ok) { sfx('coin'); toast(`🤝 ${ok} müttefikine yardım ettin!`); } else if (err) toast(err, true);
  alRerender();
}
// =====================================================================
//  İttifak rütbeleri (R5 lider … R1 acemi)
// =====================================================================
const RANKS = { 5: 'Lider', 4: 'Komutan', 3: 'Şövalye', 2: 'Asker', 1: 'Acemi' };
const RANK_DESC = { 5: 'İttifakın sahibi, her yetkiye sahip', 4: 'Lider atar • üye çıkarır, R1–R3 rütbesi verir', 3: "R1'leri R2'ye yükseltir", 2: 'Deneyimli üye', 1: 'Yeni katılan üyeler' };
const rankOf = (a, uid) => (uid === a.leader ? 5 : Math.min(4, Math.max(1, a.members?.[uid]?.rank || 1)));
// actor, target üyesine hangi rütbeleri verebilir?
function rankOptions(a, actor, target) {
  if (actor === target || target === a.leader) return [];
  const A = rankOf(a, actor), T = rankOf(a, target);
  if (A === 5) return [4, 3, 2, 1].filter((r) => r !== T);
  if (A === 4 && T <= 3) return [3, 2, 1].filter((r) => r !== T);
  if (A === 3 && T === 1) return [2];
  return [];
}
function canKick(a, actor, target) { if (actor === target || target === a.leader) return false; const A = rankOf(a, actor), T = rankOf(a, target); return A === 5 || (A === 4 && T <= 3); }
function membersHtml(a, mem, me) {
  const groups = [5, 4, 3, 2, 1].map((r) => [r, mem.filter(([u]) => rankOf(a, u) === r)]);
  const myR = rankOf(a, me);
  const rows = (list) => list.sort((x, y) => (y[1].power || 0) - (x[1].power || 0)).map(([u, m]) => {
    const can = rankOptions(a, me, u).length || canKick(a, me, u);
    return `<button class="al-mrow rk-row ${u === me ? 'me' : ''} ${can ? 'can' : ''}" ${can ? `data-almem="${u}"` : pvAttr(u, m.name, m.hero, m.frame)}><span class="ch-av" ${pvAttr(u, m.name, m.hero, m.frame)}>${frameHtml(m.hero, m.frame, 42)}</span><div class="al-mi"><b>${(m.name || 'Oyuncu').replace(/</g, '')}${u === me ? ' <small>(sen)</small>' : ''}</b><small>Belediye Sv.${m.th || 1} • ⚔ ${G.fmt(m.power || 0)}</small></div>${can ? '<i class="rk-more">⋯</i>' : ''}</button>`; }).join('');
  return `<div class="al-mh">👥 ${mem.length}/${ALLIANCE_MAX} üye • ⚔ ${G.fmt(alPower(a))} <span class="rk-me"><img src="${UI('rk_' + myR)}" alt="">Rütben: R${myR}</span></div>
    ${groups.map(([r, list]) => `<div class="rk-sec r${r}"><div class="rk-h"><img src="${UI('rk_' + r)}" alt=""><div><b>R${r} • ${RANKS[r]}</b><small>${RANK_DESC[r]}</small></div><span>${list.length}</span></div>
      ${list.length ? `<div class="al-mem">${rows(list)}</div>` : '<div class="rk-empty">Bu rütbede kimse yok</div>'}</div>`).join('')}
`;
}
// rütbe penceresi ittifak panelinin dışında (#rkLayer) çizilir, panelin kenarında kırpılmasın
function renderRankPop() {
  const L = $('rkLayer'); if (!L) return;
  const a = AL.doc, me = online.uid, sel = modalKind === 'alliance' && AL.tab === 'members' && a && AL.sel && a.members?.[AL.sel] ? AL.sel : null;
  if (!sel) { L.innerHTML = ''; return; }
  const m = a.members[sel], T = rankOf(a, sel), opts = rankOptions(a, me, sel);
  L.innerHTML = `<div class="rk-pop" data-alpopx><div class="rk-box">
      <div class="rk-ph">${frameHtml(m.hero, m.frame, 48)}<div><b>${(m.name || 'Oyuncu').replace(/</g, '')}</b><small><img src="${UI('rk_' + T)}" alt="">R${T} ${RANKS[T]} • ⚔ ${G.fmt(m.power || 0)}</small></div></div>
      ${opts.length ? `<div class="rk-ol">Rütbe ver</div><div class="rk-opts">${opts.map((r) => `<button data-alrank="${r}" class="${r > T ? 'up' : 'down'}"><img src="${UI('rk_' + r)}" alt=""><b>R${r}</b><small>${RANKS[r]}</small><em>${r > T ? '▲' : '▼'}</em></button>`).join('')}</div>` : ''}
      ${canKick(a, me, sel) ? `<button class="w-btn red rk-kick" data-alkick="${sel}">👢 İttifaktan çıkar</button>` : ''}
      <button class="w-btn rk-close" data-alpopx>Kapat</button></div></div>`;
}
function doKick(uid) {
  const nm = AL.doc?.members?.[uid]?.name; if (!AL.doc || !canKick(AL.doc, online.uid, uid)) return toast('Üye çıkarma yetkin yok', true);
  if (!confirm(`${nm} ittifaktan çıkarılsın mı?`)) return;
  return alAction(async () => { const r = await kickMember(AL.doc.id, uid); if (!r.ok) { toast(r.why, true); return; } AL.sel = null; toast('👢 Üye çıkarıldı'); sendChat(AL.doc.id, `👢 ${nm} ittifaktan çıkarıldı.`, G.myMember()); await alRefresh(); });
}
$('rkLayer').addEventListener('click', (e) => {
  const rr = e.target.closest('[data-alrank]'); if (rr) return doSetRank(AL.sel, +rr.dataset.alrank);
  const kk = e.target.closest('[data-alkick]'); if (kk) return doKick(kk.dataset.alkick);
  if (e.target.matches('[data-alpopx]') || e.target.closest('button[data-alpopx]')) { AL.sel = null; renderRankPop(); }
});
async function doSetRank(uid, r) {
  const a = AL.doc; if (!a || !rankOptions(a, online.uid, uid).includes(r)) return toast('Bu işlem için yetkin yok', true);
  const nm = a.members[uid]?.name || 'Üye', old = rankOf(a, uid);
  return alAction(async () => {
    const res = await setRank(a.id, uid, r); if (!res.ok) { toast(res.why, true); return; }
    sfx(r > old ? 'reveal5' : 'click'); toast(`${r > old ? '⬆️' : '⬇️'} ${nm} artık R${r} ${RANKS[r]}`);
    sendChat(a.id, `${r > old ? '⬆️' : '⬇️'} ${nm}, R${r} ${RANKS[r]} rütbesine ${r > old ? 'yükseltildi' : 'düşürüldü'}.`, G.myMember());
    AL.sel = null; await alRefresh();
  });
}
// =====================================================================
//  İttifak dükkanı
// =====================================================================
function alShopHtml() {
  const card = (p) => {
    const left = G.alShopLeft(p.id), bought = G.alShopBought(p.id), r = p.res && Object.keys(p.res)[0];
    const ic = p.item ? spIcon(p.item, 64) : `<span class="as-res">${resImg(r, 56)}</span>`;
    const name = p.item ? SPEEDUPS[p.item].name : `${p.res[r].toLocaleString(LOC)} ${RES[r]?.name || r}`;
    const can = left > 0, rich = G.S.res.gold >= p.gold;
    return `<div class="as-card ${can ? '' : 'out'}"><em class="as-off">−%50</em>${ic}
      <b class="as-n">${name}</b>
      <small class="as-lim">Bu hafta: <u>${bought}/${p.limit}</u></small>
      <div class="as-pr"><s>${resImg('gold', 14)} ${G.fmt(p.base)}</s></div>
      ${can ? `<div class="as-btns"><button class="w-btn gold" data-alshop="${p.id}" data-n="1" ${rich ? '' : 'disabled'}>${resImg('gold', 16)} ${G.fmt(p.gold)}</button>${left >= 5 ? `<button class="w-btn" data-alshop="${p.id}" data-n="5" ${G.S.res.gold >= p.gold * 5 ? '' : 'disabled'}>×5</button>` : ''}</div>` : '<div class="as-sold">Sınır doldu</div>'}</div>`;
  };
  const rs = G.alShopResetIn(), d = Math.floor(rs / 86400), h = Math.floor(rs % 86400 / 3600);
  return `<div class="hp-head as-head"><img src="${UI('ic_alshop')}" alt=""><div><b>İttifak Dükkanı</b><small>İttifak üyelerine özel: her şey market fiyatının <u class="as-half">yarısına</u>. Alım sınırları her Pazartesi yenilenir.</small></div></div>
    <div class="as-reset">⏳ Yenilenmeye: ${d ? d + ' gün ' : ''}${h} saat <span>${resImg('gold', 16)} ${G.fmt(G.S.res.gold)}</span></div>
    <h4 class="rl-h">Hızlandırmalar</h4><div class="as-grid">${ALLIANCE_SHOP.filter((p) => p.item).map(card).join('')}</div>
    <h4 class="rl-h">Kaynaklar</h4><div class="as-grid">${ALLIANCE_SHOP.filter((p) => p.res).map(card).join('')}</div>`;
}
function helpTabHtml(a) {
  const me = online.uid, nowMs = Date.now();
  const others = HELP.list.filter((d) => d.uid !== me && (d.ends || 0) > nowMs).sort((x, y) => !!(x.helpers || {})[me] - !!(y.helpers || {})[me] || (x.created || 0) - (y.created || 0));
  const mine = HELP.list.filter((d) => d.uid === me), pend = helpPending();
  const row = (d, own) => { const n = helpCount(d), max = d.max || G.HELP_MAX, did = (d.helpers || {})[me], full = n >= max;
    return `<div class="hp-row ${did ? 'did' : ''} ${own ? 'own' : ''}">${frameHtml(d.hero, d.frame, 44)}
      <div class="hp-i"><b>${own ? 'Senin isteğin' : (d.name || 'Oyuncu').replace(/</g, '')}</b><small>🏰 ${d.bname} Sv.${d.level} yükseltmesi • her yardım −${G.fmtTime(d.per)}</small>
        <div class="hp-bar"><i style="width:${n / max * 100}%"></i><span>${n}/${max} yardım${own && n ? ` • −${G.fmtTime(n * d.per)}` : ''}</span></div></div>
      ${own ? '' : did ? '<span class="hp-ok">✓</span>' : full ? '<span class="hp-ok">Dolu</span>' : `<button class="w-btn green" data-alhelp="${d.id}" ${HELP.busy ? 'disabled' : ''}>Yardım et</button>`}</div>`; };
  return `<div class="hp-head"><img src="${UI('ic_alhelp')}" alt=""><div><b>İttifak Yardımı</b><small>Her yardım müttefikinin yükseltmesini toplam sürenin %2,5'i kadar kısaltır (en az 1 dk). Bir istek en fazla ${G.HELP_MAX} yardım alır.</small></div></div>
    ${HELP.err ? `<div class="why">${HELP.err}</div>` : ''}
    <button class="hp-all" data-alhelpall ${!pend.length || HELP.busy ? 'disabled' : ''}>🤝 Hepsine yardım et${pend.length ? ` (${pend.length})` : ''}</button>
    ${mine.length ? `<h4 class="rl-h">İsteklerin</h4><div class="hp-list">${mine.map((d) => row(d, true)).join('')}</div>` : ''}
    <h4 class="rl-h">Müttefiklerin istekleri</h4>
    ${others.length ? `<div class="hp-list">${others.map((d) => row(d, false)).join('')}</div>` : '<div class="al-off">Şu an yardım bekleyen müttefik yok.</div>'}
    <p class="desc al-note">💡 Sen de bir binayı yükseltirken bina panelindeki <b>🤝 Yardım iste</b> butonuna bas.</p>`;
}
async function alAction(fn) { if (AL.busy) return; AL.busy = true; AL.err = ''; alRerender(); try { await fn(); } finally { AL.busy = false; alRerender(); } }
// ---- Ralli işlemleri ----
const fmtMs = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
setInterval(() => { document.querySelectorAll('[data-rc]').forEach((el) => { const v = +el.dataset.rc - Date.now(); el.textContent = fmtMs(v); el.classList.toggle('late', v < 30000); }); }, 1000);
function openRally(gid) {
  if (!online.ready) return toast('🌐 Ralli için çevrimiçi olmalısın', true);
  if (!G.S.alliance) return toast('🛡️ Ralli açmak için bir ittifaka katılmalısın', true);
  worldSel = gid; atk.init = false; atk.rally = { mode: 'create', gid }; modalKind = 'attack'; renderModal();
}
let rallyBusy = false;
async function doRally() {
  if (rallyBusy) return; const R = atk.rally, troops = { ...atk.troops }, heroes = [...atk.heroes];
  const tr = {}; for (const t in TROOPS) tr[t] = Math.min(troops[t] || 0, G.S.troops[t] || 0);
  if (!G.totalTroops(tr)) return toast('Asker seç', true);
  if (G.S.marches.length >= G.MAX_MARCHES) return toast(`En fazla ${G.MAX_MARCHES} birlik dışarıda olabilir`, true);
  const power = G.armyPowerMulti(tr, heroes), me = { name: G.S.name, power, hero: G.S.commander || heroes[0] || null, frame: G.S.frame };
  rallyBusy = true;
  try {
    if (R.mode === 'create') {
      const g = G.findEnemy(R.gid); if (!g) return toast('Hedef bulunamadı', true);
      if (g.pyr) { const acc = G.pyrAccess(g); if (!acc.ok) return toast((g.throne ? '👑 ' : '🔺 ') + acc.why, true); }
      else if (!G.giantUnlocked(g.level)) return toast(`🔒 Önce Sv.${g.level - 1} devi kesmelisiniz`, true);
      if (G.energyNow() < G.ENERGY_COST.rally) return toast(`⚡ Ralli açmak için ${G.ENERGY_COST.rally} enerji gerekli (sende ${G.S.energy})`, true);
      const endsAt = Date.now() + G.RALLY_WAIT * 1000, giant = { id: g.id, level: g.level, power: g.pyr ? G.pyrState(g).hp : g.power, mapX: Math.round(g.mapX), mapY: Math.round(g.mapY), ...(g.pyr ? { pyr: true } : {}) };
      const r = await createRally(G.S.alliance.id, { leaderName: G.S.name, giant, lx: G.S.mapX, ly: G.S.mapY, created: Date.now(), endsAt, members: { [online.uid]: me } });
      if (!r.ok) return toast(r.why, true);
      G.spendEnergy(G.ENERGY_COST.rally);
      if (!g.pyr) G.freezeGiant(g.id);
      const sm = G.startRallyMarch({ rid: r.id, aid: G.S.alliance.id, leader: online.uid, giant, lx: G.S.mapX, ly: G.S.mapY, endsAt: endsAt / 1000 }, tr, heroes);
      if (!sm.ok) return toast(sm.why, true);
      toast(`📯 Ralli açıldı! İttifakın ${G.RALLY_WAIT / 60} dk içinde katılabilir`); sfx('horn');
      sendChat(G.S.alliance.id, g.throne ? `📯 👑 DEMİR TAHT için ralli açtım! Herkes katılsın: İttifak › Ralli` : g.pyr ? `📯 🔺 Piramit Sv.${giant.level} için ralli açtım! Katılın: İttifak › Ralli` : `📯 Dev Sv.${giant.level} için ralli açtım! Katılın: İttifak › Ralli`, me);
    } else {
      const r = R.r, jr = await joinRally(G.S.alliance.id, r.id, me);
      if (!jr.ok) return toast(jr.why, true);
      const sm = G.startRallyMarch({ rid: r.id, aid: G.S.alliance.id, leader: r.leader, giant: r.giant, lx: r.lx, ly: r.ly, endsAt: r.endsAt / 1000 }, tr, heroes);
      if (!sm.ok) return toast(sm.why, true);
      toast(`🤝 Ralliye katıldın! Birliklerin ${r.leaderName} şehrinde toplanacak`); sfx('horn');
    }
    atk.rally = null; atk.init = false; $('modal').classList.remove('open'); $('modalBox').innerHTML = ''; lastModalKey = ''; refreshWorldUI(); updateTop(); syncSoon();
  } finally { rallyBusy = false; }
}
// süre dolunca son katılımcı listesini sunucudan al (sonuç her istemcide aynı hesaplanır)
setInterval(() => {
  for (const m of G.S.marches) {
    if (m.kind !== 'rally' || !m.needFinal || m.fetching) continue;
    m.fetching = true;
    getRally(m.aid, m.rid).then((r) => {
      m.fetching = false; m.needFinal = false;
      m.final = r ? Object.values(r.members || {}).map((q) => ({ name: q.name, power: q.power || 0 })) : [{ name: G.S.name, power: m.power }];
      if (r && m.leader === online.uid) setRallyStatus(m.aid, m.rid, m.final.length >= 2 ? 'done' : 'cancelled');
      G.tick();
    });
  }
}, 2000);
// ---- Teklif paketleri ----
function skinSheetHtml() {
  const cur = G.S.skin;
  return `<div class="sk-box"><div class="sk-h"><b>✨ Belediye Kostümleri</b><small>Belediye binan seçtiğin kostüme bürünür; şehrinde ve dünya haritasında görünür</small></div>
    <div class="sk-grid">${SKIN_ORDER.map((id) => { const s = SKINS[id], own = !!G.S.skins[id], on = cur === id;
      return `<button class="sk-tile ${on ? 'on' : ''} ${own ? '' : 'lock'}" style="--sc:${s.color}" data-skin="${id}"><span class="sk-img" style="background-image:url(${UI('sk_' + id)})">${s.model || s.flip ? `<img src="${UI('thc_' + id)}" alt="">` : ''}</span><b>${s.name}</b><em>${on ? '✓ Aktif' : own ? 'Kullan' : s.vip ? '👑 VIP ' + s.vip : '🎁 Teklifte'}</em></button>`; }).join('')}</div>
    ${cur ? '<button class="w-btn" style="width:100%;margin-top:6px" data-skin="">Kostümü çıkar</button>' : ''}</div>`;
}
function offersUI() {
  const chip = (img, txt, cls = '') => `<span class="of-it ${cls}">${img}<b>${txt}</b></span>`;
  const cards = OFFERS.map((o) => {
    const left = G.offerLeft(o), items = [];
    if (o.hero5) items.push(chip('<img src="' + UI('ic_summon') + '" alt="">', `${o.hero5}× 5★ Kahraman`, 'hero'));
    for (const f of o.frames || []) items.push(chip(`<img class="of-fr" src="${UI('fr_' + f)}" alt="">`, FRAME_BY_ID[f].name + ' çerçevesi', 'frame'));
    for (const k of SPEED_ORDER.slice().reverse()) if (o.items?.[k]) items.push(chip(spIcon(k, 34), `${o.items[k]}× ${SPEEDUPS[k].short}`));
    if (o.gold) items.push(chip(resImg('gold', 30), G.fmt(o.gold)));
    for (const r in o.res || {}) items.push(chip(resImg(r, 30), G.fmt(o.res[r])));
    if (o.skin) items.unshift(chip(`<img class="of-sk${SKINS[o.skin].model || SKINS[o.skin].flip ? ' th' : ''}" src="${UI((SKINS[o.skin].model || SKINS[o.skin].flip ? 'thc_' : 'sk_') + o.skin)}" alt="">`, (SKINS[o.skin].model ? 'Belediye kostümü: ' : 'Belediye efekti: ') + SKINS[o.skin].name, 'skin'));
    return `<div class="of-card t${o.tier} ${o.skin ? 'skin' : ''} ${left ? '' : 'done'}" ${o.skin ? `style="--sc:${SKINS[o.skin].color}"` : ''}>${o.tag ? `<span class="of-tag">${o.tag}</span>` : ''}
      ${o.skin ? `<div class="of-skin" style="background-image:url(${UI('sk_' + o.skin)})"><span>✨ ${SKINS[o.skin].name}</span><small>${SKINS[o.skin].desc}</small></div>` : ''}
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
  return head('Savaş Raporları', '📜') + G.S.reports.map((r, i) => r.kind === 'pyramid' ? `<div class="rep ${r.captured ? '' : r.win === false ? 'lose' : ''}"><span class="t">${ago(r.t)}</span><b>🔺 ${r.rally ? 'Ralli • ' : ''}${r.enemy}: ${r.captured ? 'ELE GEÇİRİLDİ!' : 'HASAR'}</b><div class="ln">Verilen hasar: ⚔ ${G.fmt(r.dmg)}${r.hp != null ? ` • Kalan can: ${G.fmt(r.hp)}` : ''}${r.why ? ` • ${r.why}` : ''}</div><div class="ln">Kayıpların: ${tot(r.aLoss)} (🤕 ${tot(r.wounded)} yaralı)${r.members ? ` • Katılan: ${r.members.length}` : ''}</div></div>` : r.kind === 'rally' ? `<div class="rep ${r.win ? '' : 'lose'}"><span class="t">${ago(r.t)}</span><b>📯 Ralli: ${r.win ? 'ZAFER' : 'YENİLGİ'}</b> — ${r.enemy}<div class="ln">👥 ${(r.members || []).join(', ')} • ⚔ ${G.fmt(r.total)} / ${G.fmt(r.need)}</div>${r.win ? `<div class="ln">Ödül: 🌾${G.fmt(r.loot.food || 0)} 🪵${G.fmt(r.loot.wood || 0)} 🪨${G.fmt(r.loot.stone || 0)} ${(r.items || []).map((it) => `⏩${SPEEDUPS[it.id].short}×${it.n}`).join(' ')}</div>` : ''}</div>` : r.kind === 'gather' ? `<div class="rep gather"><span class="t">${ago(r.t)}</span><b>⛏ Kazım tamamlandı</b> — ${r.enemy}<div class="ln">${Object.entries(r.loot || {}).map(([k, v]) => RES[k].icon + ' +' + G.fmt(v)).join(' ')} • ${(r.hrs || 0).toFixed(1)} saat</div></div>` : r.kind === 'scout' ? `<div class="rep scout ${r.failed ? 'lose' : ''}" data-scoutrep="${i}"><span class="t">${ago(r.t)}</span>
    <b>👁 Gözetleme: ${r.failed ? 'BAŞARISIZ' : 'RAPOR'}</b> — ${r.enemy}
    <div class="ln">${r.failed ? r.why : `Yağmalanabilir: 🌾${G.fmt(r.loot.food)} 🪵${G.fmt(r.loot.wood)} 🪨${G.fmt(r.loot.stone)} • Asker: ${tot(r.troops)} • <u>Ayrıntılar ›</u>`}</div></div>` : `<div class="rep ${r.win ? '' : 'lose'}"><span class="t">${ago(r.t)}</span>
    <b>${r.kind === 'attack' ? '⚔ Saldırı' : '🛡️ Savunma'}: ${r.win ? 'ZAFER' : 'YENİLGİ'}</b> — ${r.enemy}
    <div class="ln">Kayıpların: ${tot(r.aLoss)} (🤕 ${tot(r.wounded)} yaralı, 💀 ${tot(r.dead)} ölü) • Düşman kaybı: ${tot(r.dLoss)}</div>
    ${r.kind === 'attack' && r.win ? `<div class="ln">Ganimet: 🌾${G.fmt(r.loot.food || 0)} 🪵${G.fmt(r.loot.wood || 0)} 🪨${G.fmt(r.loot.stone || 0)}${r.zombie ? '' : ' 🪙' + (r.loot.gold || 0)}${r.items ? ' ' + r.items.map((it) => `⏩${SPEEDUPS[it.id].short}${it.n > 1 ? '×' + it.n : ''}`).join(' ') : ''}</div>` : ''}
    ${r.kind === 'defense' && !r.win ? `<div class="ln">Yağmalanan: 🌾${G.fmt(r.loot.food || 0)} 🪵${G.fmt(r.loot.wood || 0)} 🪨${G.fmt(r.loot.stone || 0)}</div>` : ''}</div>`).join('');
}
// ---- Çanta: görev/etkinlik ödülleri, hızlandırmalar, enerji ----
const BAG = { tab: 'all', sel: null, n: 1 };
const BAG_ICON = { food: '🌾', wood: '🪵', stone: '🪨', gold: '🪙', energy: '⚡' };
const BAG_ORDER = ['food', 'wood', 'stone', 'gold', 'energy'];
const bagImg = (k) => UI(k === 'energy' ? 'ic_energy' : 'res_' + k);
const bagAmt = (a) => (a >= 1e6 ? a / 1e6 + 'M' : a >= 1000 ? a / 1000 + (LANG === 'en' ? 'K' : 'B') : String(a));
function bagList(tab) {
  const out = [];
  if (tab === 'all' || tab === 'res' || tab === 'energy') for (const k of BAG_ORDER) {
    if ((tab === 'res' && k === 'energy') || (tab === 'energy' && k !== 'energy')) continue;
    for (const d of BAG_DENOM[k]) { const id = `bg_${k}_${d}`; if (G.S.items[id] > 0) out.push(id); }
  }
  if (tab === 'all' || tab === 'speed') for (const k of SPEED_ORDER.slice().reverse()) if (G.S.items[k] > 0) out.push(k);
  return out;
}
function bagCell(id) {
  const n = G.S.items[id], on = BAG.sel === id ? ' on' : '';
  if (SPEEDUPS[id]) return `<button class="bg-cell sp${on}" data-bgsel="${id}">${spIcon(id, 58)}<em>×${G.fmt(n)}</em></button>`;
  const b = G.bagParse(id);
  return `<button class="bg-cell ${b.k}${on}" data-bgsel="${id}"><img src="${bagImg(b.k)}" alt=""><b>${bagAmt(b.amt)}</b><em>×${G.fmt(n)}</em></button>`;
}
// aktif zamanlayıcılar (hızlandırma kullanılabilecek her şey)
function activeTimers() {
  const out = [];
  for (const p of PLOTS) { const tg = 'b:' + p.id; if (G.timerLeft(tg) > 0) out.push([tg, `${BUILDINGS[p.key].name} Sv.${G.lvl(p.id) + 1}`]); }
  for (const tg of ['train', 'tank', 'research', 'heal', 'tlv']) if (G.timerLeft(tg) > 0) out.push([tg, SP_NAMES[tg]]);
  for (const m of G.S.marches) { const tg = 'm:' + m.id; if (G.timerLeft(tg) > 0) out.push([tg, `${m.phase === 'go' ? 'Sefer' : 'Dönüş'} • ${m.tname || ''}`]); }
  return out;
}
function bagDetail() {
  const id = BAG.sel, n = G.S.items[id] || 0;
  if (!id || !n) return `<div class="bg-detail empty">Kullanmak istediğin eşyaya dokun.</div>`;
  if (SPEEDUPS[id]) {
    const d = SPEEDUPS[id], tm = activeTimers();
    return `<div class="bg-detail"><div class="bg-dh">${spIcon(id, 56)}<div><b>${d.name}</b><small>Sende: ${G.fmt(n)} • ${SPEED_TIER[d.tier]}</small></div></div>
      <p class="bg-desc">İnşaat, eğitim, araştırma, iyileştirme ve seferlerin süresini kısaltır. Hızlandırmak istediğin işi seç:</p>
      ${tm.length ? `<div class="bg-timers">${tm.map(([tg, nm]) => `<button class="bg-tm" data-bgspd="${tg}"><span>${nm}</span><b>⏱ ${G.fmtTime(G.timerLeft(tg))}</b><i>Hızlandır ›</i></button>`).join('')}</div>` : '<p class="bg-desc dim">Şu an süren bir iş yok.</p>'}</div>`;
  }
  const b = G.bagParse(id), nm = b.k === 'energy' ? `${b.amt} Enerji` : `${b.amt.toLocaleString(LANG === 'en' ? 'en-US' : 'tr-TR')} ${BAG_NAMES[b.k]}`;
  const desc = b.k === 'energy' ? 'Kullanınca enerji barına eklenir. Enerji 200 sınırını aşabilir.' : 'Kullanınca depona eklenir. Çantadaki kaynaklar yağmalanamaz.';
  BAG.n = Math.max(1, Math.min(BAG.n, n));
  return `<div class="bg-detail"><div class="bg-dh"><span class="bg-big ${b.k}"><img src="${bagImg(b.k)}" alt=""></span><div><b>${nm}</b><small>Sende: ${G.fmt(n)}</small></div></div>
    <p class="bg-desc">${desc}</p>
    <div class="bg-qty${n < 2 ? ' one' : ''}"><button class="w-btn" data-bgstep="-1" ${BAG.n <= 1 ? 'disabled' : ''}>−</button><input id="bgRange" type="range" min="1" max="${n}" value="${BAG.n}" ${n < 2 ? 'disabled' : ''}><button class="w-btn" data-bgstep="1" ${BAG.n >= n ? 'disabled' : ''}>＋</button><button class="w-btn gold" data-bgstep="max" ${BAG.n >= n ? 'disabled' : ''}>Maks</button></div>
    ${n < 2 ? '<p class="bg-one">Bu eşyadan 1 tane var, adet seçmeye gerek yok.</p>' : ''}
    <div class="bg-sum"><span>Adet: <b id="bgN">${G.fmt(BAG.n)}</b></span><span>Toplam: <b id="bgTot">+${G.fmt(BAG.n * b.amt)}</b> <img src="${bagImg(b.k)}" alt=""></span></div>
    <button class="w-btn green bg-use" data-bguse>Kullan</button></div>`;
}
function bagSyncQty(fromRange) {
  const id = BAG.sel, b = G.bagParse(id); if (!b) return;
  const r = $('bgRange'); if (r && !fromRange) r.value = BAG.n;
  const n = $('bgN'), t = $('bgTot'); if (n) n.textContent = G.fmt(BAG.n); if (t) t.textContent = '+' + G.fmt(BAG.n * b.amt);
  const max = G.S.items[id] || 0, q = (v) => document.querySelector(`[data-bgstep="${v}"]`);
  if (q('-1')) q('-1').disabled = BAG.n <= 1; if (q('1')) q('1').disabled = BAG.n >= max; if (q('max')) q('max').disabled = BAG.n >= max;
}
function bagUI() {
  const list = bagList(BAG.tab); if (BAG.sel && !list.includes(BAG.sel)) BAG.sel = null;
  if (!BAG.sel && list.length) BAG.sel = list[0];
  const tabs = [{ id: 'all', label: 'Tümü', icon: 'em_bag' }, { id: 'res', label: 'Kaynak', icon: 'res_food' }, { id: 'speed', label: 'Hızlandırma', icon: 'sp_t2' }, { id: 'energy', label: 'Enerji', icon: 'ic_energy' }];
  return head('Çanta', 'em_bag', tabs, BAG.tab) + (list.length
    ? `<div class="bg-grid">${list.map(bagCell).join('')}</div>${bagDetail()}`
    : `<div class="bg-empty"><img src="${UI('em_bag')}" alt=""><p>Burada eşya yok.<br><small>Görev, etkinlik, giriş ödülü ve VIP kutusundan kazandıkların çantaya düşer.</small></p></div>`);
}
function updateBagDot() { const d = $('bagDot'); if (d) d.classList.toggle('hidden', !(G.bagCount() > (G.S.bagSeen || 0))); }
// ---- Hızlandırma penceresi ----
let speedTarget = null;
const spTotal = () => SPEED_ORDER.reduce((a, k) => a + (G.S.items[k] || 0), 0);
const spCountTxt = () => { const n = spTotal(); return n ? `<small class="spn">${G.fmt(n)}</small>` : ''; };
const SP_NAMES = { tlv: 'Talimhane eğitimi', train: 'Asker eğitimi', tank: 'Tank üretimi', research: 'Araştırma', heal: 'İyileştirme' };
function openSpeed(tg) { speedTarget = tg; modalKind = 'speed'; lastModalKey = ''; sfx('open'); renderModal(); }
function speedUI() {
  const tg = speedTarget, left = G.timerLeft(tg);
  const name = tg && tg.startsWith('m:') ? (() => { const m = G.S.marches.find((q) => q.id === tg.slice(2)); return m ? `${m.phase === 'go' ? '⚔ Sefer' : '↩ Dönüş'} • ${m.tname}` : 'Sefer'; })() : tg && tg.startsWith('b:') ? (() => { const p = PLOTS.find((q) => q.id === tg.slice(2)); return `${BUILDINGS[p.key].name} Sv.${G.lvl(p.id) + 1}`; })() : SP_NAMES[tg] || '';
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
    ${h ? `<div class="sc-hero"><img src="assets/heroes/${h.id}_a.webp?v=2611201530" alt=""><div><b>${h.name}</b><span>${'★'.repeat(h.rarity)} • Bonus +%${r.hero.bonus}</span></div></div>` : r.hero ? `<div class="sc-hero"><div><b>Bilinmeyen komutan</b><span>Bonus +%${r.hero.bonus}</span></div></div>` : '<div class="sc-hero none">Şehirde komutan yok</div>'}
    <h4 class="sc-h">🏹 Okçu kuleleri</h4>
    <div class="sc-hero none">${r.tower ? `Kule hasarı: <b>${G.fmt(r.tower)}</b>` : 'Kule savunması yok'}</div>
    <div class="sc-btns"><button class="w-btn" data-m="close">Kapat</button>${target && worldOpen() ? `<button class="w-btn red" data-scoutatk="${r.target}">⚔ Saldır</button>` : ''}</div>`;
}
export function openScoutReport(r) { scoutRep = r; modalKind = 'scout'; lastModalKey = ''; renderModal(); }
// ---------------------------------------------------------------------
// Profil kartı: kendi profilin ve başka oyuncuların profili aynı şablonu kullanır
//  p = { name, pid, cmd, frame, th, power, stats{wins,losses,kills,pulls}, badges[k], showcase[{id,lv,ups}], alliance{tag,name} }
const PF = { edit: false, sel: [] };
function showcaseHtml(list, me) {
  const cells = [];
  for (let i = 0; i < G.SHOWCASE_N; i++) {
    const s = list[i], h = s && HERO_BY_ID[s.id];
    cells.push(h ? `<div class="pf-h" style="--rc:${RARITY[h.rarity].color}"><img src="assets/heroes/${h.id}.webp?v=2611201530" alt="" loading="lazy"><span class="pf-st">${starsHtml(h, s.ups || 0, 10)}</span><span class="pf-lv">Sv.${s.lv || 1}</span><b class="pf-hn">${esc(h.name)}</b></div>`
      : `<div class="pf-h pf-empty" ${me ? 'data-pfedit' : ''}>${me ? '＋' : ''}</div>`);
  }
  return `<div class="w-card pf-card"><h4><img src="${UI('nav_heroes')}">${me ? 'Kahramanlarım' : 'Kahramanları'}${me ? '<button class="pf-edit" data-pfedit>✎ Düzenle</button>' : ''}</h4><div class="pf-heroes">${cells.join('')}</div></div>`;
}
function profileCard(p, o = {}) {
  const st = p.stats || {}, own = new Set(p.badges || []), sc = (p.showcase || []).filter((x) => HERO_BY_ID[x.id]);
  const al = p.alliance?.tag ? `<div class="pf-al">🛡️ [${esc(p.alliance.tag)}] ${esc(p.alliance.name || '')}</div>` : '';
  return `<div class="w-banner" style="background-image:url(${UI('banner_profile')});min-height:140px;align-items:center">
      <div class="w-prof"><div class="w-prof-av">${frameHtml(p.cmd || 'emre', p.frame, 70)}</div><div><div class="nm">${esc(p.name || 'Oyuncu')}</div><div class="sub">ID: ${esc(p.pid || '—')}${HERO_BY_ID[p.cmd] ? ' • Komutan: ' + esc(HERO_BY_ID[p.cmd].name) : ''}</div>${al}
      <div class="w-xp"><span class="lvl">${p.th || 1}</span><div class="bar"><span style="width:${Math.min(100, (p.th || 1) * 10)}%"></span></div></div></div></div></div>
      ${o.actions || ''}
      <div class="w-stats">
        <div class="w-stat"><img src="${UI('nav_heroes')}"><div><small>Güç</small><b>${G.fmt(p.power || 0)}</b></div></div>
        <div class="w-stat"><img src="${UI('ic_trophy')}"><div><small>Zafer / Yenilgi</small><b>${st.wins ?? '—'} / ${st.losses ?? '—'}</b></div></div>
        <div class="w-stat"><img src="${UI('nav_world')}"><div><small>Öldürülen düşman</small><b>${st.kills != null ? G.fmt(st.kills) : '—'}</b></div></div>
        <div class="w-stat"><img src="${UI('ic_summon')}"><div><small>Toplam çağırma</small><b>${st.pulls ?? '—'}</b></div></div></div>
      ${showcaseHtml(sc, o.me)}
      <div class="w-card"><h4><img src="${UI('ic_trophy')}">${o.me ? 'Rozetlerim' : 'Rozetleri'}</h4><div class="w-badges">${G.BADGES.map((b) => `<div class="w-badge ${own.has(b.k) ? '' : 'off'}"><img src="${UI(b.i)}" alt="">${b.n}</div>`).join('')}</div></div>`;
}
function showcaseEditor() {
  const ids = Object.keys(G.S.heroes).filter((id) => HERO_BY_ID[id]).sort((a, b) => G.heroPower(b) - G.heroPower(a));
  return `<div class="w-card pf-card"><h4><img src="${UI('nav_heroes')}">Vitrin kahramanları <span class="pf-cnt">${PF.sel.length}/${G.SHOWCASE_N}</span></h4>
      <p class="pf-tip">Profilinde görünecek en fazla ${G.SHOWCASE_N} kahramanı sırayla seç.</p>
      <div class="pf-pick">${ids.map((id) => { const h = HERO_BY_ID[id], o = G.S.heroes[id], n = PF.sel.indexOf(id);
        return `<button class="pf-h ${n >= 0 ? 'on' : ''}" style="--rc:${RARITY[h.rarity].color}" data-pfpick="${id}"><img src="assets/heroes/${id}.webp?v=2611201530" alt="" loading="lazy"><span class="pf-st">${starsHtml(h, o.ups || 0, 9)}</span><span class="pf-lv">Sv.${o.level || 1}</span>${n >= 0 ? `<em class="pf-n">${n + 1}</em>` : ''}<b class="pf-hn">${esc(h.name)}</b></button>`; }).join('')}</div>
      <div class="pf-btns"><button class="w-btn" data-pfauto>En güçlü 5</button><button class="w-btn" data-pfcancel>Vazgeç</button><button class="w-btn gold" data-pfsave>Kaydet</button></div></div>`;
}
// Başka bir oyuncunun profili (sohbet, arkadaşlar, sıralama, ittifak, harita)
const PV = { uid: null, p: null, loading: false, back: null };
function openPlayer(uid, hint = {}) {
  if (!uid) return;
  if (uid === online.uid || uid === 'me') { profTab = 'me'; PF.edit = false; modalKind = 'profile'; setNav(''); return renderModal(); }
  PV.back = modalKind && modalKind !== 'player' && $('modal').classList.contains('open') ? modalKind : PV.back;
  PV.uid = uid; PV.p = { name: hint.name, cmd: hint.hero, frame: hint.frame, pid: hint.pid }; PV.loading = true; PV.err = false;
  modalKind = 'player'; setNav(''); renderModal();
  getPlayer(uid).then((p) => { if (PV.uid !== uid) return; PV.loading = false; if (p) PV.p = { ...p, cmd: p.cmd || p.hero?.id || hint.hero, stats: p.stats || (p.wins != null ? { wins: p.wins } : null) }; else PV.err = true; if (modalKind === 'player') renderModal(); });
}
window.__dsViewPlayer = (uid, hint) => openPlayer(uid, hint);
function playerUI() {
  const p = PV.p || {}, fr = friendOf(PV.uid);
  const acts = `<div class="pf-acts">${PV.back ? '<button class="w-btn" data-pvback>‹ Geri</button>' : ''}${online.ready ? (fr ? '<button class="w-btn" data-pvmsg>💬 Mesaj</button>' : '<button class="w-btn green" data-pvadd>＋ Arkadaş ekle</button>') : ''}</div>`;
  const note = PV.loading ? '<div class="pf-load">Profil yükleniyor…</div>' : PV.err && !p.power ? '<div class="pf-load">Profil bilgileri alınamadı.</div>' : '';
  return head('Oyuncu Profili', 'nav_heroes') + note + profileCard(p, { actions: acts });
}
// ---- VIP penceresi ----
let vipView = 0;
const VIP_ITEM_TXT = (b) => Object.entries(b.items || {}).map(([k, n]) => `${spIcon(k, 40, n)}`).join('') + (b.energy ? `<span class="vp-chip"><img src="${UI('ic_energy')}" alt="">${b.energy}</span>` : '') + (b.gold ? `<span class="vp-chip"><img src="${UI('res_gold')}" alt="">${b.gold}</span>` : '');
function vipUI() {
  const cur = G.S.vip || 0, L = vipView || Math.min(VIP_MAX, cur + 1) || 1, d = VIP[L], ready = G.vipBoxReady();
  const lv = Array.from({ length: VIP_MAX }, (_, i) => i + 1).map((n) => `<button class="vp-lv ${n <= cur ? 'own' : ''} ${n === L ? 'on' : ''}" data-viplv="${n}"><img src="${UI('vip_badge')}" alt=""><b>${n}</b></button>`).join('');
  const perks = [`<li>⛏ Madenlerden <b>+%${d.mine}</b> verim</li>`, `<li>🎁 Her <b>${d.every} günde bir</b> VIP kutusu: <span class="vp-box">${VIP_ITEM_TXT(d.box)}</span></li>`];
  if (d.skin) perks.push(`<li class="vp-sk"><img src="${UI('thc_' + d.skin)}" alt=""><span>🏰 Özel animasyonlu belediye kostümü: <b>${SKINS[d.skin].name}</b></span></li>`);
  if (d.frame) perks.push(`<li class="vp-fr">${frameHtml(G.S.commander, d.frame, 40)}<span>Özel hareketli avatar çerçevesi: <b>VIP İmparator</b></span></li>`);
  const next = cur + 1, buyBtn = cur >= VIP_MAX ? '<div class="vp-max">👑 En yüksek VIP seviyesindesin</div>' : L === next ? `<button class="w-btn gold vp-buy" data-vipbuy>VIP ${next}'i aç • <img src="${UI('res_gold')}" alt=""> ${G.fmt(VIP[next].cost)}</button>` : L > next ? `<div class="vp-lock">🔒 Önce VIP ${next}'i açmalısın</div>` : '<div class="vp-own">✓ Bu seviye açık</div>';
  return head('VIP', 'vip_badge') + `<div class="w-banner vp-ban" style="background-image:url(${UI('banner_vip')})"><div><div class="bt">VIP ${cur}</div><div class="bs">${cur ? 'Ayrıcalıkların aktif' : 'VIP ayrıcalıklarını aç'}</div></div><span class="vp-en"><img src="${UI('ic_energy')}" alt="">${G.fmt(G.S.energy || 0)}</span></div>
    ${cur ? `<div class="w-card vp-claim"><h4>🎁 VIP ${cur} kutusu</h4><div class="vp-box">${VIP_ITEM_TXT(VIP[cur].box)}</div>${ready ? '<button class="w-btn green" data-vipclaim>Topla</button>' : `<small>Sonraki kutu: <b>${G.fmtTime(G.vipBoxIn())}</b></small>`}</div>` : ''}
    <div class="vp-lvs">${lv}</div>
    <div class="w-card"><h4><img src="${UI('vip_badge')}" alt="">VIP ${L} ayrıcalıkları</h4><ul class="vp-perks">${perks.join('')}</ul></div>
    ${buyBtn}`;
}
let profTab = 'me';
function profileUI() {
  const h = HERO_BY_ID[G.S.commander], th = G.thLevel();
  const id = (G.S.created * 7919 % 90000000 + 10000000) | 0;
  let body = '';
  if (profTab === 'me') {
    if (PF.edit) body = showcaseEditor();
    else body = profileCard({ name: G.S.name, pid: online.ready ? shortId(online.uid) : String(id), cmd: G.S.commander, frame: G.S.frame, th, power: G.cityPower(),
      stats: { wins: G.S.stats.wins, losses: G.S.stats.losses, kills: G.S.stats.kills, pulls: G.S.totalPulls }, badges: G.myBadges(),
      showcase: G.showcaseIds().map((hid) => ({ id: hid, lv: G.S.heroes[hid].level || 1, ups: G.S.heroes[hid].ups || 0 })), alliance: G.S.alliance }, { me: true });
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
      <div class="w-card"><h4><img src="${UI('nav_world')}">Dil / Language</h4><div class="row"><button class="w-btn ${LANG === 'tr' ? 'gold' : ''}" style="flex:1" data-lang="tr">🇹🇷 Türkçe</button><button class="w-btn ${LANG === 'en' ? 'gold' : ''}" style="flex:1" data-lang="en">🇬🇧 English</button></div></div>
      <div class="w-card"><h4><img src="${UI('nav_reports')}">Ses</h4><div class="row"><button class="w-btn" style="flex:1" data-m="sound">${audioState().sfxOn ? '🔊 Efekt açık' : '🔇 Efekt kapalı'}</button><button class="w-btn" style="flex:1" data-m="music">${audioState().musicOn ? '🎵 Müzik açık' : '🔇 Müzik kapalı'}</button></div></div>
      <button class="w-btn red" style="width:100%;padding:12px" data-m="reset">Oyunu sıfırla</button>`;
  }
  return head('Profil', 'nav_heroes', [{ id: 'me', label: 'Profilim', icon: 'nav_heroes' }, { id: 'frame', label: 'Çerçeve', icon: 'crown' }, { id: 'set', label: 'Ayarlar', icon: 'nav_quest' }], profTab) + body;
}
$('modalBox').addEventListener('input', (e) => {
  if (e.target.id === 'bgRange') { BAG.n = +e.target.value; return bagSyncQty(true); }
  const s = e.target.dataset.slider;
  if (s) { atk.troops[s] = +e.target.value; const box = $('modalBox'), y = box.scrollTop; clearTimeout(soon); soon = setTimeout(() => { renderModal(); $('modalBox').scrollTop = y; }, 60); }
});
$('modalBox').addEventListener('click', (e) => {
  // oyuncu profili: her listede ad/avatara dokununca aç
  const pv = e.target.closest('[data-pview]');
  if (pv && !e.target.closest('[data-chaddu], [data-almem] .rk-more')) { e.stopPropagation(); sfx('open'); return openPlayer(pv.dataset.pview, { name: pv.dataset.pvname, hero: pv.dataset.pvhero, frame: pv.dataset.pvframe, pid: pv.dataset.pvpid }); }
  if (e.target.closest('[data-pvback]')) { const b = PV.back; PV.back = null; modalKind = b || 'profile'; return renderModal(); }
  if (e.target.closest('[data-pvadd]')) { const p = PV.p || {}; addFriendLocal({ uid: PV.uid, name: p.name || 'Oyuncu', pid: p.pid || '', hero: p.cmd || null, frame: p.frame || null }); sfx('reveal'); toast(`🤝 ${p.name || 'Oyuncu'} arkadaş listene eklendi`); return renderModal(); }
  if (e.target.closest('[data-pvmsg]')) { const f = friendOf(PV.uid); PV.back = null; CH.tab = 'friends'; modalKind = 'chat'; if (f) openDm(f); else openChat('friends'); return; }
  const fd = e.target.closest('[data-fyday]'); if (fd) { fyView = +fd.dataset.fyday; return renderModal(); }
  const fc = e.target.closest('[data-fyclaim]'); if (fc) { const r = G.claimFy(+fc.dataset.fyclaim); if (!r.ok) return toast(r.why, true); sfx('coin'); toast('🎁 Görev ödülü çantana eklendi!'); updateTop(); return renderModal(); }
  const fb = e.target.closest('[data-fybonus]'); if (fb) { const r = G.claimFyBonus(+fb.dataset.fybonus); if (!r.ok) return toast(r.why, true); sfx('reveal'); const rr = r.reward, parts = [rr.energy ? `⚡${rr.energy} enerji` : '', rr.gold ? `${rr.gold} altın` : '', ...Object.entries(rr.items || {}).map(([k, n]) => `${n}× ${SPEEDUPS[k].short} hızlandırma`)].filter(Boolean); toast(`🏆 Gün sandığı açıldı: ${parts.join(', ')} → 🎒 Çantada`); updateTop(); return renderModal(); }
  const vl = e.target.closest('[data-viplv]'); if (vl) { vipView = +vl.dataset.viplv; return renderModal(); }
  if (e.target.closest('[data-vipbuy]')) { const r = G.buyVip(); if (!r.ok) { toast(r.why, true); if (r.needGold) { closeModal(); navigate('shop'); } return; } sfx('reveal'); toast(`👑 VIP ${r.level} açıldı!${VIP[r.level].skin ? ' Özel kostümün belediye binasında!' : ''}`); vipView = 0; updateTop(); updateVipBadge(); syncSoon(); return renderModal(); }
  if (e.target.closest('[data-vipclaim]')) { const r = G.claimVipBox(); if (!r.ok) return toast(r.why, true); sfx('coin'); toast('🎁 VIP kutusu çantana eklendi!'); updateTop(); updateVipBadge(); return renderModal(); }
  // profil vitrini düzenleme
  if (e.target.closest('[data-pfedit]')) { PF.edit = true; PF.sel = G.S.showcase ? G.showcaseIds() : []; return renderModal(); }
  const pk = e.target.closest('[data-pfpick]');
  if (pk) { const id = pk.dataset.pfpick, n = PF.sel.indexOf(id); if (n >= 0) PF.sel.splice(n, 1); else if (PF.sel.length < G.SHOWCASE_N) PF.sel.push(id); else toast(`En fazla ${G.SHOWCASE_N} kahraman seçebilirsin`, true); return renderModal(); }
  if (e.target.closest('[data-pfauto]')) { G.setShowcase(null); PF.edit = false; toast('Vitrinde en güçlü 5 kahramanın gösteriliyor'); syncSoon(); return renderModal(); }
  if (e.target.closest('[data-pfcancel]')) { PF.edit = false; return renderModal(); }
  if (e.target.closest('[data-pfsave]')) { G.setShowcase(PF.sel.slice()); PF.edit = false; sfx('reveal'); toast(PF.sel.length ? '✨ Vitrin kaydedildi' : 'Vitrinde en güçlü 5 kahramanın gösteriliyor'); syncSoon(); return renderModal(); }
  // çanta
  const bs = e.target.closest('[data-bgsel]'); if (bs) { BAG.sel = bs.dataset.bgsel; BAG.n = 1; sfx('click'); return renderModal(); }
  const bst = e.target.closest('[data-bgstep]'); if (bst) { const v = bst.dataset.bgstep, max = G.S.items[BAG.sel] || 0; BAG.n = v === 'max' ? max : Math.max(1, Math.min(max, BAG.n + +v)); return bagSyncQty(); }
  if (e.target.closest('[data-bguse]')) { const r = G.bagUse(BAG.sel, BAG.n); if (!r.ok) return toast(r.why, true);
    toast(r.k === 'energy' ? `⚡ +${G.fmt(r.tot)} enerji` : `${BAG_ICON[r.k]} +${G.fmt(r.tot)} ${BAG_NAMES[r.k].toLowerCase()} depoya eklendi`); sfx(r.k === 'energy' ? 'reveal' : 'coin');
    if (!G.S.items[BAG.sel]) BAG.sel = null; BAG.n = 1; G.S.bagSeen = G.bagCount(); updateTop(); return renderModal(); }
  const bsp = e.target.closest('[data-bgspd]'); if (bsp) { openSpeed(bsp.dataset.bgspd); return; }
  const wt = e.target.closest('[data-wtab]');
  if (wt && modalKind === 'bag') { BAG.tab = wt.dataset.wtab; BAG.sel = null; return renderModal(); }
  if (wt && modalKind === 'chat') { CH.tab = wt.dataset.wtab; if (CH.tab === 'friends') refreshFriends(); if (CH.tab !== 'friends' && CH.dmUnsub) { CH.dmUnsub(); CH.dmUnsub = null; CH.dm = null; } chatMarkSeen(); renderModal(); const nb = $('chList'); if (nb) nb.scrollTop = nb.scrollHeight; chatUpdate('tab'); return; }
  if (wt) { const v = wt.dataset.wtab; if (modalKind === 'quests' || modalKind === 'login') { questTab = v; modalKind = 'quests'; } else if (modalKind === 'heroes') heroTab = v; else if (modalKind === 'shop') shopTab = v; else if (modalKind === 'profile') profTab = v; else if (modalKind === 'ranking') rankTab = v; else if (modalKind === 'alliance') { if (v !== 'chat' && v !== 'rally') alStopChat(); else if (AL.tab !== v) alStopChat(); AL.tab = v; AL.err = ''; if (v === 'find') alRefresh(); } return renderModal(); }
  const gq = e.target.closest('[data-goq]');
  if (gq) { const v = gq.dataset.goq; const q = QUESTS.find((x) => x.id === v); closeModal();
    if (q && q.t[0] === 'bld') { const p = PLOTS.find((x) => x.key === q.t[1]); if (p) { openBuilding(p.id); focusOn(p.x, p.z); } return; }
    if (v.includes('trained') || (q && q.t[1] === 'trained')) { openBuilding('barracks'); focusOn(-17, 2); return; }
    if (q && q.t[1] === 'tanks') { openBuilding('tankyard'); focusOn(-14, 28); return; }
    if (v.includes('wins') || (q && q.t[1] === 'wins')) return navigate('world');
    if (v.includes('summons') || (q && q.t[1] === 'summons')) return navigate('summon');
    if (v.includes('heals')) { openBuilding('hospital'); return; }
    if (q && q.t[0] === 'cnt') { const k = q.t[1];
      if (['zombies', 'giants', 'rallies', 'gathers', 'scouts', 'kills', 'energy'].includes(k)) return navigate('world');
      if (k === 'heals') { openBuilding('hospital'); return; }
      if (k === 'speedups') return navigate('bag');
      if (k === 'upgrades') { const p = PLOTS.filter((x) => G.lvl(x.id) > 0).sort((a, b) => G.lvl(a.id) - G.lvl(b.id))[0]; if (p) { openBuilding(p.id); focusOn(p.x, p.z); } return; }
    }
    return; }
  const qt = e.target.closest('[data-qtab]'); if (qt) { questTab = qt.dataset.qtab; return renderModal(); }
  if (e.target.closest('[data-claimall]')) { const r = G.claimAllQuests(); if (r.n) { rewardFx(r.reward, `✅ ${r.n} görev:`); updateTop(); updateQuestUI(); } return renderModal(); }
  const lg = e.target.closest('[data-lang]'); if (lg) { if (lg.dataset.lang !== LANG) { G.save(); setLang(lg.dataset.lang); } return; }
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
  if (modalKind === 'chat') {
    if (e.target.closest('[data-chsend]')) return chatSend();
    if (e.target.closest('[data-chadd]')) return chatAddById();
    if (e.target.closest('[data-chcopy]')) { const id = shortId(online.uid); navigator.clipboard?.writeText(id).then(() => toast('📋 ID kopyalandı: ' + id), () => toast('ID: ' + id)); return; }
    if (e.target.closest('[data-chback]')) { if (CH.dmUnsub) CH.dmUnsub(); CH.dmUnsub = null; CH.dm = null; return renderModal(); }
    const fb = e.target.closest('[data-chfriend]'); if (fb) { const f = friendOf(fb.dataset.chfriend); if (f) { sfx('click'); openDm(f); const nb = $('chList'); if (nb) nb.scrollTop = nb.scrollHeight; } return; }
    const au = e.target.closest('[data-chaddu]'); if (au) { const uid = au.dataset.chaddu; if (uid === online.uid) return; if (friendOf(uid)) return toast('Zaten arkadaşın'); const src = [...(CH.global || []), ...(CH.server || [])].reverse().find((m) => m.uid === uid) || {}; addFriendLocal({ uid, name: au.dataset.chname || 'Oyuncu', hero: src.hero, frame: src.frame }); sfx('reveal'); return toast(`🤝 ${au.dataset.chname} arkadaş listene eklendi`); }
  }
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
    if (kk) return doKick(kk.dataset.alkick);
    const ag = e.target.closest('[data-algo]'); if (ag) { const v = ag.dataset.algo; if (v !== 'chat' && v !== 'rally') alStopChat(); else if (AL.tab !== v) alStopChat(); AL.tab = v; sfx('click'); return renderModal(); }
    if (e.target.closest('[data-alann]')) { AL.annOpen = !AL.annOpen; return renderModal(); }
    const hp = e.target.closest('[data-alhelp]'); if (hp) { const d = HELP.list.find((q) => q.id === hp.dataset.alhelp); if (d) doHelp([d]); return; }
    if (e.target.closest('[data-alhelpall]')) return doHelp(helpPending());
    const mm = e.target.closest('[data-almem]'); if (mm) { AL.sel = mm.dataset.almem; sfx('click'); return renderRankPop(); }
    const sb = e.target.closest('[data-alshop]'); if (sb) { const r = G.buyAlShop(sb.dataset.alshop, +sb.dataset.n || 1); if (!r.ok) { if (r.needGold) return needGold(); return toast(r.why, true); } sfx('coin'); toast(`🛒 Satın alındı${r.n > 1 ? ' ×' + r.n : ''}`); updateTop(); return renderModal(); }
    if (e.target.closest('[data-alsave]')) return alAction(async () => { const d = ($('alEditDesc')?.value || '').trim().slice(0, 140); const r = await editAlliance(AL.doc.id, { desc: d }); if (!r.ok) toast(r.why, true); else { toast('💾 Kaydedildi'); await alRefresh(); } });
    if (e.target.closest('[data-altoggle]')) return alAction(async () => { const r = await editAlliance(AL.doc.id, { open: !AL.doc.open }); if (!r.ok) toast(r.why, true); else await alRefresh(); });
    if (e.target.closest('[data-rnew]')) { closeModal(); setNav('world'); sfx('open'); openWorldMap({ search: 'giant' }); return; }
    const rj = e.target.closest('[data-rjoin]');
    if (rj) { const r = (AL.rallies || []).find((q) => q.id === rj.dataset.rjoin); if (!r) return; const g = { id: 'rg_' + r.id, giant: true, rallyJoin: true, level: r.giant.level, name: `Dev Sv.${r.giant.level}`, lord: 'Ralli: ' + r.leaderName, th: r.giant.level, power: r.giant.power, mapX: r.giant.mapX, mapY: r.giant.mapY, troops: {}, tower: 0, res: {}, shieldUntil: 0 };
      G.ONLINE.rallyGiants = G.ONLINE.rallyGiants.filter((q) => q.id !== g.id).concat([g]); atk.init = false; atk.rally = { mode: 'join', r }; worldSel = g.id; modalKind = 'attack'; alStopChat(); return renderModal(); }
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
  if (a === 'login') { const r = G.claimLogin(); if (r) { toast(`📅 Gün ${r.day}: ` + rewardTxt(r.reward) + '  → 🎒 Çantada'); sfx('built'); updateTop(); } closeModal(); }
  if (a === 'world') { if (atk.rally?.mode === 'join') { atk.rally = null; modalKind = 'alliance'; AL.tab = 'rally'; return renderModal(); } atk.rally = null;
  }
  if (a === 'world') { if (worldOpen()) { $('modal').classList.remove('open'); $('modalBox').innerHTML = ''; atk.init = false; return; } modalKind = 'world'; renderModal(); }
  if (a === 'toattack') { modalKind = 'attack'; atk.init = false; renderModal(); tutEvent('attackOpen'); }
  if (a === 'march' && atk.rally) { doRally(); return; }
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
  if (ev === 'skin') { applySkin(); if (sheetId === 'townhall') renderSheet(); }
  if (ev === 'trained') toast(`⚔ ${data.n} ${TROOPS[data.type].name} hazır!`);
  if (ev === 'healed') toast(`💚 ${G.totalTroops(data.counts)} asker iyileşti`);
  if (ev === 'battle') { $('repDot').classList.remove('hidden'); if (data.win && data.kind === 'attack') pushNews(`<u>${G.S.name}</u> <em>${data.enemy}</em> krallığını fethetti!`); }
  if (ev === 'quests') { updateQuestUI(); }
  if (ev === 'pyrHit' || ev === 'pyrRally') { pyrApply(ev, data); return; }
  if (ev === 'marchArrived') {
    const { r, m } = data; if (r.enemy.real) { sendAttack(r.enemy.uid, { name: G.S.name, win: r.res.win, loot: r.rep.loot, sent: r.sent, aLoss: r.res.aLoss, dLoss: r.res.dLoss, dmg: r.dmg || 0 }); if (r.cityDoc) writeCity(r.enemy.server || G.S.server || 1, r.enemy.uid, r.cityDoc); }
    if (r.dmg) toast(r.razed ? `🔥 ${r.enemy.name} yıkıldı! Şehir haritada başka yere taşınıyor` : `🔥 ${r.enemy.name} yanıyor • şehir canı %${r.rep.cityHp} (−%${r.dmg})${G.canReattack(m) ? ' • dönerken tanka dokunup tekrar saldırabilirsin' : ''}`);
    else if (!r.res.win && !r.rep.zombie) toast('💨 Ordun yenildi, tank dumanlar içinde eve dönüyor', true);
    lastBattle = r; sfx(r.res.win ? 'win' : 'lose');
    if (r.rep.zombie) { if (r.res.win) toast(`🧟 Zombi Sv.${r.rep.zombie} öldürüldü! ` + (r.rep.items || []).map((it) => `⏩ ${SPEEDUPS[it.id].short}${it.n > 1 ? ' ×' + it.n : ''}`).join(' ')); else toast(`🧟 Zombi Sv.${r.rep.zombie} çok güçlüydü! Ordun yenildi`, true); }
    showBattleBanner(r); refreshWorldUI(); syncSoon();
  }
  if (ev === 'scout') { sfx('click'); refreshWorldUI(); }
  if (ev === 'scoutArrived') { if (!data.report?.failed) toast(`👁 Helikopter ${data.tname} şehrini gözetliyor…`); refreshWorldUI(); }
  if (ev === 'scoutHome') { refreshWorldUI(); updateTop(); $('repDot').classList.remove('hidden'); if (data.report?.failed) toast('🚁 Gözetleme başarısız: ' + data.report.why, true); else { sfx('reveal'); openScoutReport(data.report); } }
  if (ev === 'gatherStart') { toast(`⛏ Birliğin ${G.MINE_TYPES[data.mtype].name} Sv.${data.mlevel}'de kazıma başladı`); refreshWorldUI(); }
  if (ev === 'gatherDone') { refreshWorldUI(); $('repDot').classList.remove('hidden'); }
  if (ev === 'gatherHome') { const [k, v] = Object.entries(data.loot || {})[0] || []; toast(k ? `⛏ Kazım birliği döndü: ${RES[k].icon} +${G.fmt(v)}` : '↩ Kazım birliği döndü'); sfx('coin'); refreshWorldUI(); updateTop(); }
  if (ev === 'rallyMuster') { toast(`📯 Ralli birliklerin lider şehrinde toplanıyor (30 sn)`); refreshWorldUI(); }
  if (ev === 'rallyCancel') { toast('🏳️ Ralliye kimse katılmadı, ralli iptal edildi. Askerler döndü.', true); refreshWorldUI(); updateTop(); }
  if (ev === 'rallyGo') { toast(`🗿 Ralli yola çıktı! ${data.final.length} kişi, ⚔ ${G.fmt(data.final.reduce((t, q) => t + q.power, 0))}`); sfx('horn'); refreshWorldUI(); }
  if (ev === 'rallyDone') { const R = data.result; $('repDot').classList.remove('hidden'); if (R.win) { sfx('win'); toast(`🏆 Dev Sv.${data.giant.level} kesildi! ` + rewardTxt({ ...R.rew.res, _items: R.rew.items })); } else { sfx('lose'); toast(`💀 Dev çok güçlüydü! (⚔ ${G.fmt(R.total)} / ${G.fmt(R.need)})`, true); } refreshWorldUI(); updateTop(); }
  if (ev === 'marchHome') { toast('↩ Ordun şehre döndü'); refreshWorldUI(); updateTop(); }
  if (ev === 'marchBlocked') { toast(data.razed ? '🔥 Hedef şehir yıkılmış, ordu geri dönüyor' : 'Hedef bulunamadı, ordu geri dönüyor', true); refreshWorldUI(); }
  if (ev === 'marchStayEnd') { refreshWorldUI(); }
  if (ev === 'fire') { updateFireUI(); syncSoon(); }
  if (ev === 'teleport') { updateLabels(true); }
  if (ev === 'energy' || ev === 'fy') updateEnergy();
  if (ev === 'tlvDone') { toast(`🎯 ${TROOPS[data.t].short} Sv.${data.to} oldu! Hasar, savunma ve can arttı`); sfx('built'); updateTop(); if (sheetId === 'drill' || sheetId === 'barracks') renderSheet(); }
  if (ev === 'researched') { toast(`🔬 ${RESEARCH[data].name} Sv.${G.S.research.levels[data]} tamamlandı!`); sfx('built'); }
});
let lastBattle = null;
function showBattleBanner(r) {
  let b = $('battleBanner'); if (!b) { b = document.createElement('div'); b.id = 'battleBanner'; document.body.appendChild(b); }
  const loot = r.rep.loot || {};
  b.className = 'bb ' + (r.res.win ? 'win' : 'lose');
  b.innerHTML = `<i>${r.res.win ? '🏆' : '💀'}</i><div><b>${r.res.win ? 'Zafer!' : 'Yenilgi'} • ${r.enemy.name}</b><small>${r.res.win ? `🌾${G.fmt(loot.food || 0)} 🪵${G.fmt(loot.wood || 0)} 🪨${G.fmt(loot.stone || 0)} 🪙${loot.gold || 0}${r.dmg ? ` <em class="bb-dmg">🔥 −%${r.dmg} → %${r.rep.cityHp}</em>` : ''}` : 'Ordun geri çekiliyor 💨'}</small></div><button id="bbWatch">İzle ▶</button><button id="bbX">✕</button>`;
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
  if (skinFX) skinFX.userData.update(tAcc, dt);
  if (thFire) { if (fireOut > 0) { fireOut -= dt * 0.7; thFire.setStrength(Math.max(0, fireOut)); if (fireOut <= 0) { thFire.dispose(); thFire = null; } } if (thFire) thFire.update(tAcc, dt); }
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
    updateFireUI(); updateEnergy();
    G.tick();
    for (const id in holders) refreshPlot(id);
    updateTop(); updateQuestUI();
    if (sheetId && !document.activeElement?.classList.contains('slider')) renderSheet();
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
const setLoad = (p, txt) => { $('loadBar').style.width = p + '%'; const pc = $('loadPct'); if (pc) pc.textContent = Math.round(p) + '%'; if (txt) $('loadTxt').textContent = txt.replace(/\s*%\d+$/, ''); };
const frame = () => new Promise((r) => setTimeout(r, 16));
// ---------------------------------------------------------------------
//  Çevrimiçi: giriş, bulut kayıt, rakipler, gelen saldırılar
// ---------------------------------------------------------------------
let lastSync = 0, syncTimer = 0;
async function syncNow() { if (!online.ready) return false; lastSync = Date.now(); return saveCloud(G.exportSave(), { ...G.publicProfile(), pid: shortId(online.uid) }); }
// ---- Mısır piramitleri: sunucu durumu ve vuruşlar ----
let pyrUnsub = null, pyrServer = 0;
function pyrWatch() {
  if (!online.ready || !G.S.server || (pyrUnsub && pyrServer === G.S.server)) return;
  if (pyrUnsub) pyrUnsub(); pyrServer = G.S.server;
  pyrUnsub = watchPyramids(G.S.server, (o) => { if (!o) return; G.ONLINE.pyr = o; refreshPyramids(); });
}
async function pyrApply(ev, data) {
  const q = data.pid === 'throne' ? G.THRONE_TARGET : G.PYRAMIDS.find((x) => x.id === data.pid), rep = data.rep;
  if (ev === 'pyrRally' && data.m.leader !== online.uid) { toast(`🔺 Ralli Piramit Sv.${data.level}'e ⚔ ${G.fmt(data.dmg)} hasar verdi`); $('repDot').classList.remove('hidden'); return; }
  if (!q || !G.S.alliance || !online.ready) { rep.why = 'Sunucuya bağlı değilsin, hasar işlenemedi'; G.save(); toast('🔺 ' + rep.why, true); return; }
  const a = G.S.alliance, r = await hitPyramid(G.S.server, q.id, q.power, { aid: a.id, tag: a.tag, name: a.name, color: a.color ?? 1 }, data.dmg, G.PYR_RESET * 1000);
  if (!r.ok) { rep.why = r.why; G.save(); toast('🔺 ' + r.why, true); return; }
  rep.hp = r.hp; rep.captured = !!(r.captured && r.captured.aid === a.id); if (r.captured && !rep.captured) rep.why = `[${r.captured.tag}] en çok hasarı verdiği için piramidi aldı`;
  G.save(); $('repDot').classList.remove('hidden');
  const nm = q.throne ? 'DEMİR TAHT' : `Piramit Sv.${q.level}`;
  if (rep.captured) { sfx('win'); toast(`🏆 [${a.tag}] ${nm}'i ele geçirdi!`); sendChat(a.id, `🏆 ${q.throne ? '👑' : '🔺'} ${nm} artık [${a.tag}] ittifakının!`, G.myMember()); }
  else if (r.captured) { sfx('lose'); toast(`${nm}'i [${r.captured.tag}] aldı (en çok hasar onlarda)`, true); }
  else toast(`${q.throne ? '👑' : '🔺'} ${nm}'e ⚔ ${G.fmt(data.dmg)} hasar! Kalan can ${G.fmt(r.hp)}`);
}
// =====================================================================
//  Sohbet: Dünya (tüm sunucular), Sunucu, Arkadaşlar (oyuncu kimliği ile)
// =====================================================================
const CH = { tab: 'global', global: null, server: null, dmList: [], dm: null, dmMsgs: null, dmUnsub: null, started: false, errs: {}, busy: false, fresh: {} };
const CH_SRC = { global: 'Dünya sohbeti', server: 'Sunucu sohbeti', dm: 'Arkadaş sohbeti', dmMsgs: 'Özel mesajlar' };
const chErr = (src, e) => { CH.errs[src] = e ? `${CH_SRC[src]}: ${/izni yok|permission/i.test(e) ? 'Firebase izin vermiyor. Son mesajdaki kuralların TAMAMINI Firebase › Firestore › Kurallar sayfasına yapıştırıp Yayınla\'ya bas.' : e}` : ''; };
const pvAttr = (uid, name, hero, frame, pid) => (uid ? `data-pview="${esc(uid)}" data-pvname="${esc(name || '')}" data-pvhero="${esc(hero || '')}" data-pvframe="${esc(frame || '')}" data-pvpid="${esc(pid || '')}"` : '');
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function chatSeen() { G.S.chatSeen ||= { global: 0, server: 0, dm: {} }; G.S.chatSeen.dm ||= {}; return G.S.chatSeen; }
function chatStart() {
  if (CH.started || !online.ready) return; CH.started = true;
  if (G.S.friends) G.S.friends = G.S.friends.filter((f) => f.uid !== online.uid);
  watchWorldChat('global', 0, (m, e) => { if (m) { CH.global = m; chErr('global'); } else chErr('global', e); chatUpdate('global'); });
  watchWorldChat('server', G.S.server || 1, (m, e) => { if (m) { CH.server = m; chErr('server'); } else chErr('server', e); chatUpdate('server'); });
  watchDmList((l, e) => { if (l) { CH.dmList = l; chErr('dm'); } else chErr('dm', e); for (const d of CH.dmList) { const fu = d.members.find((u) => u !== online.uid); if (fu && !friendOf(fu)) addFriendLocal({ uid: fu, name: d.names?.[fu] || 'Oyuncu' }); } chatUpdate('dm'); });
  $('chatBar').classList.remove('hidden');
}
const friendOf = (uid) => (G.S.friends || []).find((f) => f.uid === uid);
// arkadaşın güncel adını, avatarını, çerçevesini ve ID'sini oyuncu profilinden çek (10 dk'da bir)
async function refreshFriends(force) {
  const now = Date.now(); let changed = false;
  for (const f of G.S.friends || []) {
    if (!force && CH.fresh[f.uid] && now - CH.fresh[f.uid] < 600000) continue; CH.fresh[f.uid] = now;
    const p = await getPlayer(f.uid); if (!p) continue;
    const upd = { name: p.name || f.name, hero: p.hero?.id || p.hero || f.hero || null, frame: p.frame || f.frame || null, pid: p.pid || f.pid || '' };
    if (upd.name !== f.name || upd.hero !== f.hero || upd.frame !== f.frame || upd.pid !== f.pid) { Object.assign(f, upd); changed = true; }
  }
  if (changed) { G.save(); if (modalKind === 'chat' && $('modal').classList.contains('open')) chatRerender('fr'); }
}
function addFriendLocal(f) { G.S.friends ||= []; if (!friendOf(f.uid)) { G.S.friends.push({ uid: f.uid, name: f.name, pid: f.pid || '', hero: f.hero || null, frame: f.frame || null }); G.save(); CH.fresh[f.uid] = 0; refreshFriends(); } }
const dmUnread = () => CH.dmList.filter((d) => d.lastBy && d.lastBy !== online.uid && (d.lastAt || 0) > (chatSeen().dm[d.id] || 0)).length;
function chatUnread() { const s = chatSeen(), mine = (l) => (l || []).filter((m) => m.uid !== online.uid && m.t > 0); return { global: mine(CH.global).filter((m) => m.t > s.global).length, server: mine(CH.server).filter((m) => m.t > s.server).length, dm: dmUnread() }; }
function chatUpdate(src) {
  // şerit: en yeni mesaj
  const cands = [];
  const lg = CH.global?.[CH.global.length - 1], ls = CH.server?.[CH.server.length - 1], ld = CH.dmList[0];
  if (lg) cands.push({ t: lg.t, html: `<b class="cb-k g">Dünya</b> <u>${esc(lg.name)}:</u> ${esc(lg.text)}` });
  if (ls) cands.push({ t: ls.t, html: `<b class="cb-k s">Sunucu</b> <u>${esc(ls.name)}:</u> ${esc(ls.text)}` });
  if (ld && ld.lastAt) cands.push({ t: ld.lastAt, html: `<b class="cb-k f">Arkadaş</b> <u>${esc(ld.names?.[ld.lastBy] || '')}:</u> ${esc(ld.last)}` });
  cands.sort((a, b) => b.t - a.t);
  $('chatBarTxt').innerHTML = cands[0]?.html || 'Sohbete katıl: dünya, sunucu ve arkadaşlar';
  const u = chatUnread(); $('chatDot').classList.toggle('hidden', !(u.global + u.server + u.dm));
  if (modalKind === 'chat' && $('modal').classList.contains('open')) chatRerender(src);
}
function chatRerender(src) {
  const inp = $('chIn'), v = inp?.value, add = $('chAddIn')?.value;
  const box = $('chList'), atBottom = !box || box.scrollHeight - box.scrollTop - box.clientHeight < 60;
  renderModal();
  if (v && $('chIn')) $('chIn').value = v; if (add && $('chAddIn')) $('chAddIn').value = add;
  const nb = $('chList'); if (nb && (atBottom || src === 'open')) nb.scrollTop = nb.scrollHeight;
}
function chatMarkSeen() {
  const s = chatSeen(), now = Date.now();
  if (CH.tab === 'global') s.global = now; else if (CH.tab === 'server') s.server = now; else if (CH.dm) s.dm[pairId(online.uid, CH.dm.uid)] = now;
  G.save();
}
function openChat(tab) { CH.tab = tab || CH.tab; modalKind = 'chat'; setNav(''); chatMarkSeen(); renderModal(); const nb = $('chList'); if (nb) nb.scrollTop = nb.scrollHeight; chatUpdate('open'); }
$('chatBar').addEventListener('click', () => { sfx('open'); closeSheet(); openChat(); });
function chatMsgs(list, opts = {}) {
  const tm = (t) => { const d = new Date(t), today = new Date().toDateString() === d.toDateString(); return today ? d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }); };
  if (list === null) return '<div class="al-off">Yükleniyor…</div>';
  if (!list.length) return `<div class="al-off">${opts.empty || 'Henüz mesaj yok. İlk mesajı sen yaz! 👋'}</div>`;
  const av = (m) => (m.uid === online.uid ? [G.S.commander, G.S.frame] : opts.friend && m.uid === opts.friend.uid ? [opts.friend.hero || m.hero, opts.friend.frame || m.frame] : [m.hero, m.frame]);
  const nm = (m) => (m.uid === online.uid ? G.S.name : opts.friend && m.uid === opts.friend.uid ? opts.friend.name || m.name : m.name);
  return list.map((m) => `<div class="al-msg ${m.uid === online.uid ? 'me' : ''}"><span class="ch-av" ${pvAttr(m.uid, nm(m), av(m)[0], av(m)[1])}>${frameHtml(...av(m), 32)}</span><div class="al-bub"><b>${m.tag ? `<em class="ch-tag">[${esc(m.tag)}]</em> ` : ''}<u class="ch-nm" ${pvAttr(m.uid, nm(m), av(m)[0], av(m)[1])}>${esc(nm(m))}</u>${opts.server && m.server ? ` <i class="ch-srv">#${m.server}</i>` : ''} <small>${tm(m.t)}</small>${m.uid !== online.uid && !opts.dm ? `<button class="ch-add" data-chaddu="${m.uid}" data-chname="${esc(m.name)}" title="Arkadaş ekle">＋</button>` : ''}</b><span>${esc(m.text)}</span></div></div>`).join('');
}
function chatUI() {
  const u = chatUnread();
  const H = (b) => head('Sohbet', 'nav_quest', [{ id: 'global', label: 'Dünya', icon: 'nav_world', dot: u.global > 0 && CH.tab !== 'global' }, { id: 'server', label: 'Sunucu', icon: 'ic_castle', dot: u.server > 0 && CH.tab !== 'server' }, { id: 'friends', label: 'Arkadaş', icon: 'nav_heroes', dot: u.dm > 0 }], CH.tab) + b;
  if (!online.ready) return H('<div class="al-off">🌐 Sohbet için çevrimiçi olmalısın.</div>');
  const input = (ph) => `<div class="al-send"><input id="chIn" maxlength="200" placeholder="${ph}" autocomplete="off"><button class="w-btn gold" data-chsend>Gönder</button></div>`;
  const errBox = (k) => (CH.errs[k] ? `<div class="why">⚠️ ${esc(CH.errs[k])}</div>` : '');
  if (CH.tab === 'global') return H(errBox('global') + `<div class="ch-h">🌍 <b>Dünya sohbeti</b><small>Tüm sunuculardaki oyuncular</small></div><div class="al-chat ch-list" id="chList">${chatMsgs(CH.global, { server: true })}</div>${input('Dünyaya yaz…')}`);
  if (CH.tab === 'server') return H(errBox('server') + `<div class="ch-h">🏰 <b>Sunucu #${G.S.server || 1} sohbeti</b><small>Yalnızca bu sunucudaki oyuncular</small></div><div class="al-chat ch-list" id="chList">${chatMsgs(CH.server)}</div>${input('Sunucuya yaz…')}`);
  // arkadaşlar
  if (CH.dm) {
    const f = CH.dm;
    return H(errBox('dmMsgs') + `<div class="ch-dmh"><button class="w-btn" data-chback>‹ Geri</button><span class="ch-av" ${pvAttr(f.uid, f.name, f.hero, f.frame, f.pid)}>${frameHtml(f.hero, f.frame, 34)}</span><div ${pvAttr(f.uid, f.name, f.hero, f.frame, f.pid)}><b>${esc(f.name)}</b><small>ID: ${esc(f.pid || '—')}</small></div></div>
      <div class="al-chat ch-list" id="chList">${chatMsgs(CH.dmMsgs, { dm: true, friend: f, empty: 'Henüz mesaj yok. Selam ver! 👋' })}</div>${input(`${esc(f.name)} kişisine yaz…`)}`);
  }
  const fr = (G.S.friends || []).map((f) => { const d = CH.dmList.find((x) => x.id === pairId(online.uid, f.uid)), unread = d && d.lastBy && d.lastBy !== online.uid && (d.lastAt || 0) > (chatSeen().dm[d.id] || 0); return { f, d, unread }; }).sort((a, b) => (b.d?.lastAt || 0) - (a.d?.lastAt || 0));
  return H(`<div class="ch-me"><div><small>Senin oyuncu ID'n</small><b id="chMyId">${shortId(online.uid)}</b></div><button class="w-btn" data-chcopy>📋 Kopyala</button></div>
    <div class="ch-addrow"><input id="chAddIn" maxlength="8" placeholder="Oyuncu ID'si (8 hane)" autocomplete="off" style="text-transform:uppercase"><button class="w-btn green" data-chadd ${CH.busy ? 'disabled' : ''}>＋ Ekle</button></div>
    ${errBox('dm')}
    <h4 class="rl-h">Arkadaşların (${fr.length})</h4>
    ${fr.length ? `<div class="ch-fr">${fr.map(({ f, d, unread }) => `<button class="ch-frow ${unread ? 'new' : ''}" data-chfriend="${f.uid}"><span class="ch-av" ${pvAttr(f.uid, f.name, f.hero, f.frame, f.pid)}>${frameHtml(f.hero, f.frame, 40)}</span><div><b>${esc(f.name)}</b><small>${d?.last ? esc((d.lastBy === online.uid ? 'Sen: ' : '') + d.last) : 'ID: ' + esc(f.pid || '—')}</small></div>${unread ? '<em class="ch-new">Yeni</em>' : '<i>›</i>'}</button>`).join('')}</div>` : '<div class="al-off">Henüz arkadaşın yok. Bir oyuncunun ID\'sini yazıp ekle ya da sohbette adının yanındaki ＋ butonuna bas.</div>'}`);
}
function openDm(f) {
  CH.fresh[f.uid] = 0; refreshFriends();
  CH.dm = f; CH.dmMsgs = null; if (CH.dmUnsub) CH.dmUnsub();
  CH.dmUnsub = watchDm(pairId(online.uid, f.uid), (m, e) => { if (m) { CH.dmMsgs = m; chErr('dmMsgs'); } else { chErr('dmMsgs', e); CH.dmMsgs = CH.dmMsgs || []; } if (CH.dm === f) { chatMarkSeen(); chatRerender('dm'); } });
  chatMarkSeen(); renderModal();
}
async function chatSend() {
  const inp = $('chIn'), t = inp?.value.trim(); if (!t) return; inp.value = '';
  const me = { ...G.myMember(), tag: G.S.alliance?.tag || null };
  const r = CH.tab === 'friends' && CH.dm ? await sendDm(CH.dm, t, me) : await sendWorldChat(CH.tab === 'global' ? 'global' : 'server', G.S.server || 1, t, me);
  if (!r.ok) { toast(r.why, true); if ($('chIn')) $('chIn').value = t; }
}
async function chatAddById() {
  const id = ($('chAddIn')?.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (id.length !== 8) return toast('Oyuncu ID\'si 8 hane olmalı', true);
  if (id === shortId(online.uid)) return toast('Kendini ekleyemezsin 🙂', true);
  CH.busy = true; renderModal();
  const p = await findPlayerById(id); CH.busy = false;
  if (!p) { toast('Bu ID ile oyuncu bulunamadı', true); return renderModal(); }
  if (friendOf(p.uid)) { toast(`${p.name} zaten arkadaşın`); return renderModal(); }
  addFriendLocal({ uid: p.uid, name: p.name || 'Oyuncu', pid: id, hero: p.hero?.id || null, frame: p.frame || null }); sfx('reveal'); toast(`🤝 ${p.name} arkadaş listene eklendi`);
  if ($('chAddIn')) $('chAddIn').value = ''; renderModal();
}
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'chIn') chatSend(); if (e.key === 'Enter' && e.target.id === 'chAddIn') chatAddById(); });
function syncSoon() { clearTimeout(syncTimer); syncTimer = setTimeout(syncNow, 3000); }
// kendi şehrimin sunucu kaydı: biri şehrimi yıktıysa yeni konuma taşı; yedek taşımayı da sunucuya yaz
async function pullMyCity(doc) {
  if (!online.ready) return;
  if (doc === undefined) doc = await getMyCity(G.S.server || 1);
  const mv = G.applyCityDoc(doc);
  if (mv) { toast(`🔥 Şehrin yıkıldı ve X:${mv.x} Y:${mv.y} konumuna taşındı. Yangını söndür!`, true); writeCity(G.S.server || 1, online.uid, { ...G.myCityDoc(), moved: true }); updateLabels(true); syncSoon(); }
}
async function refreshRivals(force) {
  if (!online.ready || (!force && Date.now() - G.ONLINE.rivalsAt < 90000)) return;
  G.ONLINE.rivalsAt = Date.now();
  const [list, cities] = await Promise.all([serverPlayers(G.S.server || 1, 200), getCities(G.S.server || 1)]);
  G.ONLINE.cities = cities;
  G.ONLINE.enemies = list.map(G.rivalToEnemy);
  pullMyCity(cities[online.uid]);
  if (modalKind === 'world' && $('modal').classList.contains('open')) renderModal();
}
async function processInbox() {
  if (!online.ready) return;
  const items = await fetchInbox(); if (!items.length) return;
  for (const it of items) { const r = G.applyIncoming(it); toast(r.win ? `🛡️ ${r.enemy} saldırdı, savunman kazandı!` : r.moved ? `🔥 ${r.enemy} şehrini yıktı!` : `🔥 ${r.enemy} şehrini yağmaladı ve ateşe verdi! Şehir canı %${r.cityHp}`, !r.win); }
  $('repDot').classList.remove('hidden');
  await clearInbox(items.map((x) => x.id)); updateTop(); syncSoon(); pullMyCity();
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
  pyrWatch(); chatStart();
  await syncNow();
  await processInbox(); refreshRivals(true);
  if (G.S.alliance) alRefresh(); // üyeliği doğrula, gücü güncelle
  setInterval(() => { if (G.S.alliance) alRefresh(); }, 300000);
  setInterval(() => refreshRivals(), 90000); // rakip şehirler ve kendi şehir kaydım (yıkıldıysam taşınma)
  setInterval(helpCleanup, 10000);
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
  initScenes({ baseDpr: renderer.getPixelRatio(), renderer, toast, sfx, closeModal, navigate, onSceneClosed, fillPortraits, needGold, updateTop, makeEnv, event: tutEvent });
  initCampaign({ toast, sfx, openBattle, updateTop, navigate });
  const onAttack = (id) => { worldSel = id; atk.init = false; atk.rally = null; modalKind = 'attack'; renderModal(); };
  window.__dsAttack = onAttack;
  initWorldMap({ renderer, toast, sfx, online, serverPlayers, onAttack, onRally: openRally, onScoutReport: openScoutReport, onSpeed: openSpeed, onTeleport: () => syncNow() });
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  applyCam();
  setLoad(95, 'Son dokunuşlar…'); await frame();
  renderer.compile(city, camera);
  setLoad(100);
  document.querySelectorAll('[data-ico]').forEach((el) => { el.innerHTML = icon(el.dataset.ico, +(el.dataset.s || 22)); });
  ['top', 'side', 'nav', 'rside', 'bottomHud'].forEach((id) => $(id).classList.remove('hidden'));
  updateTop();
  $('loading').style.opacity = 0; setTimeout(() => $('loading').remove(), 500);
  // (toplu kahraman ön yüklemesi kaldırıldı: telefonda bellek taşırıp sayfayı kapattırıyordu)
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
window.__ds = { closeSheet, renderer, openHeroViewer, openSummon, openBattle, online, G, cam, navigate, holders, openBuilding, createTank, closeModal, toast, get grass() { return grassField; } };
