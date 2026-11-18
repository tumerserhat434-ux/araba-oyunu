// =====================================================================
//  DEMİR SANCAK — 3D krallık haritası (v3)
//  - Akıcı kamera: parmağın altındaki nokta sabit kalır, bırakınca kayar
//    (atalet), iki parmakla parmakların ortasına yakınlaşır, yaklaştıkça
//    kamera eğilir, şehre dokununca kamera oraya süzülür.
//  - Ortada Demir Taht kalesi; şehirlerin renkli bölgeleri; barbar kampları,
//    kaynak noktaları ve haritada sürekli yürüyen ordular (parlayan oklar).
//  - Seferler: ordu haritada yürür, varınca savaşır, geri döner.
// =====================================================================
import * as THREE from 'three';
import * as A from './assets.js?v=2611182229';
import { createSkinFX, SKINS } from './skins.js?v=2611182229';
import * as BLD from './buildings.js?v=2611182229';
import * as G from './state.js?v=2611182229';
import { SPEEDUPS } from './data.js?v=2611182229';
import { createSoldier, animateUnit } from './units.js?v=2611182229';
import { openScene, closeScene, sceneOverlay as ov, freeSkeletons, freeScene } from './scenes.js?v=2611182229';

const $ = (id) => document.getElementById(id);
const UI = (n) => `assets/ui/${n}.webp`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const agoS = (t) => { const s = Date.now() / 1000 - t; return s < 60 ? 'az önce' : s < 3600 ? Math.floor(s / 60) + ' dk önce' : Math.floor(s / 3600) + ' sa önce'; };
const fmtT = (s) => { s = Math.max(0, Math.ceil(s)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, p2 = (v) => String(v).padStart(2, '0'); return h ? `${h}:${p2(m)}:${p2(s % 60)}` : m ? `${m}:${p2(s % 60)}` : `${s}sn`; };
let C = null; // { renderer, toast, sfx, onAttack(id), online, serverPlayers, onTeleport }
let W = null; // açık harita durumu

export function initWorldMap(ctx) { C = ctx; }
export const worldOpen = () => !!W;

const MAP = G.MAP_SIZE, MIN_D = 80, MAX_D = 950;
// ittifak renkleri (main.js AL_COLORS ile aynı)
const ALLY_COLORS = ['#c8281a', '#2a5ad8', '#2a9a3a', '#8a3ad8', '#e0a020', '#2a2a3a'];
const TH = G.THRONE; // { x, y, r }
const HOUSES = ['building_home_A_blue', 'building_home_B_blue', 'building_well_blue', 'building_home_A_blue', 'building_tavern_blue'];
const COL = { me: 0xffc83a, real: 0x3a9cff, bot: 0xff4a32, ally: 0x3aff7a, throne: 0xff3a2a };
const isAlly = (c) => !!(c.alliance && G.S.alliance && c.alliance.id === G.S.alliance.id);

// ---------------------------------------------------------------------
// yardımcılar
const canvasTex = (w, h, draw, srgb = true) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
let glowT = null;
const glowTex = () => glowT || (glowT = canvasTex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }, false));
const glow = (color, size, op = 0.9) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(size); return s; };
// zemine yatık yumuşak ışık lekesi (sprite'tan ucuz, kameraya dönmez)
let discT = null;
const discTex = () => discT || (discT = canvasTex(128, 128, (x) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(0.5, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }, false));
const discGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const groundGlow = (color, size, op = 0.5) => { const m = new THREE.Mesh(discGeo, new THREE.MeshBasicMaterial({ map: discTex(), color, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending })); m.scale.set(size, 1, size); return m; };

function instancify(proto, matrices, scene) {
  if (!matrices.length) return;
  proto.updateMatrixWorld(true);
  proto.traverse((m) => {
    if (!m.isMesh) return;
    const im = new THREE.InstancedMesh(m.geometry, m.material, matrices.length); im.castShadow = false; im.receiveShadow = false;
    const tmp = new THREE.Matrix4(); matrices.forEach((M, i) => { tmp.multiplyMatrices(M, m.matrixWorld); im.setMatrixAt(i, tmp); });
    im.computeBoundingSphere(); scene.add(im);
  });
}
const mat4 = (x, y, z, ry, s, sy = s) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(s, sy, s));

const thKey = (L) => (L >= 30 ? 'townhall4' : L >= 20 ? 'townhall3' : L >= 10 ? 'townhall2' : 'townhall');
function cityModel(L) {
  let k = thKey(L); if (!A.hasHF(k)) { A.ensureHF(k); k = 'townhall'; }
  const m = A.hfModel(k); if (!m) return new THREE.Group();
  const sz = A.hfSize(k); m.scale.setScalar(13 / Math.max(sz.x, sz.z)); return m;
}

// ---------------------------------------------------------------------
// Zemin: tek büyük boyalı doku (toprak lekeleri, yollar, taht meydanı)
function paintGround(list, lakes, seed) {
  const N = 2048, k = N / MAP;
  let sd = seed; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  return canvasTex(N, N, (x) => {
    // taban: ortası biraz daha açık, kenarlara doğru koyulaşan serin yeşil
    const bg = x.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N * 0.75); bg.addColorStop(0, '#467a40'); bg.addColorStop(0.6, '#36603a'); bg.addColorStop(1, '#24442e'); x.fillStyle = bg; x.fillRect(0, 0, N, N);
    // büyük doğal lekeler: çayır, taşlık, kuru toprak
    for (let i = 0; i < 300; i++) { const r = 30 + rnd() * 170, g = x.createRadialGradient(0, 0, 0, 0, 0, r); const col = ['70,110,60', '40,76,52', '72,88,84', '58,96,50', '84,98,72'][i % 5]; g.addColorStop(0, `rgba(${col},.45)`); g.addColorStop(1, `rgba(${col},0)`); x.save(); x.translate(rnd() * N, rnd() * N); x.scale(1, 0.6 + rnd() * 0.8); x.fillStyle = g; x.fillRect(-r, -r, 2 * r, 2 * r); x.restore(); }
    // ince doku: çim tutamları ve çakıl
    for (let i = 0; i < 34000; i++) { x.fillStyle = ['#4a7a44', '#2e5238', '#5a8a4c', '#26402e', '#6a7a60'][i % 5]; x.globalAlpha = 0.25 + rnd() * 0.35; x.fillRect(rnd() * N, rnd() * N, 1 + rnd() * 2.5, 1 + rnd() * 2.5); }
    x.globalAlpha = 1;
    // yollar: her şehirden tahta ve en yakın komşuya yumuşak toprak yol
    const road = (ax, ay, bx, by, w) => {
      const mx = (ax + bx) / 2 + (rnd() - 0.5) * 70, my = (ay + by) / 2 + (rnd() - 0.5) * 70;
      for (const [col, ww] of [['rgba(10,16,12,.45)', w + 7], ['#7a6c50', w], ['rgba(170,150,110,.45)', w * 0.35]]) { x.strokeStyle = col; x.lineWidth = ww; x.lineCap = 'round'; x.beginPath(); x.moveTo(ax * k, ay * k); x.quadraticCurveTo(mx * k, my * k, bx * k, by * k); x.stroke(); }
    };
    const pts = list.map((c) => [c.mapX, c.mapY]);
    pts.forEach((p, i) => {
      const nn = pts.map((q, j) => [Math.hypot(q[0] - p[0], q[1] - p[1]), j]).filter((d) => d[1] !== i).sort((a, b) => a[0] - b[0]);
      nn.slice(0, 1).forEach(([, j]) => road(p[0], p[1], pts[j][0], pts[j][1], 5));
      const a = Math.atan2(p[1] - TH.y, p[0] - TH.x); road(p[0], p[1], TH.x + Math.cos(a) * TH.r, TH.y + Math.sin(a) * TH.r, 6);
    });
    // piramitlerin çevresi: çöl kumu, taş döşeme ve çatlaklar
    for (const q of G.PYRAMIDS) {
      const px = q.mapX * k, py = q.mapY * k, R2 = q.r * 2.3 * k;
      const sg = x.createRadialGradient(px, py, 0, px, py, R2); sg.addColorStop(0, '#d8b070'); sg.addColorStop(0.55, '#c49a58'); sg.addColorStop(0.85, 'rgba(176,138,80,.55)'); sg.addColorStop(1, 'rgba(160,130,80,0)');
      x.fillStyle = sg; x.beginPath(); x.arc(px, py, R2, 0, 7); x.fill();
      for (let i = 0; i < 260; i++) { const a = rnd() * 6.28, rr = Math.sqrt(rnd()) * R2 * 0.9; x.fillStyle = ['#e8c888', '#b08850', '#d0a868'][i % 3]; x.globalAlpha = 0.5; x.fillRect(px + Math.cos(a) * rr, py + Math.sin(a) * rr, 2 + rnd() * 3, 1 + rnd() * 2); }
      x.globalAlpha = 1; x.strokeStyle = 'rgba(120,90,50,.35)'; x.lineWidth = 1.5;
      for (let i = 0; i < 10; i++) { const a = rnd() * 6.28, r0 = q.r * 1.1 * k, r1 = R2 * (0.6 + rnd() * 0.3); x.beginPath(); x.moveTo(px + Math.cos(a) * r0, py + Math.sin(a) * r0); x.lineTo(px + Math.cos(a + (rnd() - 0.5) * 0.3) * r1, py + Math.sin(a + (rnd() - 0.5) * 0.3) * r1); x.stroke(); }
    }
    // göl kıyıları
    for (const l of lakes) { x.fillStyle = 'rgba(96,88,68,.9)'; x.beginPath(); x.ellipse(l.x * k, l.z * k, (l.r + 4) * k, (l.r * 0.7 + 4) * k, l.a, 0, 7); x.fill(); }
    // taht meydanı: koyu taş halka ve ışınsal taş döşeme
    const cx = TH.x * k, cy = TH.y * k, R = (TH.r + 10) * k;
    const pg = x.createRadialGradient(cx, cy, 0, cx, cy, R); pg.addColorStop(0, '#5a5a62'); pg.addColorStop(0.8, '#4a4a54'); pg.addColorStop(1, 'rgba(60,60,70,0)'); x.fillStyle = pg; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.fill();
    x.strokeStyle = 'rgba(30,30,36,.45)'; x.lineWidth = 2;
    for (let r = 14; r < TH.r; r += 9) { x.beginPath(); x.arc(cx, cy, r * k, 0, 7); x.stroke(); }
    for (let a = 0; a < 48; a++) { const an = a / 48 * Math.PI * 2; x.beginPath(); x.moveTo(cx + Math.cos(an) * 14 * k, cy + Math.sin(an) * 14 * k); x.lineTo(cx + Math.cos(an) * TH.r * k, cy + Math.sin(an) * TH.r * k); x.stroke(); }
    // şehir meydanları
    for (const c of list) { const g = x.createRadialGradient(c.mapX * k, c.mapY * k, 0, c.mapX * k, c.mapY * k, 16 * k); g.addColorStop(0, 'rgba(92,86,74,.95)'); g.addColorStop(1, 'rgba(92,86,74,0)'); x.fillStyle = g; x.beginPath(); x.arc(c.mapX * k, c.mapY * k, 16 * k, 0, 7); x.fill(); }
  });
}

// ---------------------------------------------------------------------
// Zemin: keskin, tekrar eden çim/toprak/kum dokuları + karışım haritası (splat)
//  - splat (R: toprak/yol, G: kum, B: taş meydan) haritadaki yerlerini belirler
//  - macro: büyük ölçekli açık/koyu lekeler (doğallık)
// ---------------------------------------------------------------------
const GT = {};
function groundTex(name) {
  if (GT[name]) return GT[name];
  const t = new THREE.TextureLoader().load('assets/ui/gt_' + name + '.webp');
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return (GT[name] = t);
}
function paintSplat(list, lakes, seed) {
  const N = 1024, k = N / MAP;
  let sd = seed; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  const splat = canvasTex(N, N, (x) => {
    x.fillStyle = '#000'; x.fillRect(0, 0, N, N);
    x.globalCompositeOperation = 'lighter';
    // toprak lekeleri (doğallık)
    for (let i = 0; i < 90; i++) { const cx = rnd() * N, cy = rnd() * N, r = (8 + rnd() * 26) * k * 2; const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, 'rgba(150,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); }
    // yollar: her şehirden tahta ve en yakın komşuya
    const road = (ax, ay, bx, by, w) => {
      const mx = (ax + bx) / 2 + (rnd() - 0.5) * 70, my = (ay + by) / 2 + (rnd() - 0.5) * 70;
      x.strokeStyle = 'rgba(255,0,0,1)'; x.lineWidth = w * k; x.lineCap = 'round'; x.beginPath(); x.moveTo(ax * k, ay * k); x.quadraticCurveTo(mx * k, my * k, bx * k, by * k); x.stroke();
    };
    const pts = list.map((c) => [c.mapX, c.mapY]);
    pts.forEach((p, i) => {
      const nn = pts.map((q, j) => [Math.hypot(q[0] - p[0], q[1] - p[1]), j]).filter((d) => d[1] !== i).sort((a, b) => a[0] - b[0]);
      nn.slice(0, 1).forEach(([, j]) => road(p[0], p[1], pts[j][0], pts[j][1], 5));
      const d = Math.hypot(p[0] - TH.x, p[1] - TH.y); if (d < 420) { const a = Math.atan2(p[1] - TH.y, p[0] - TH.x); road(p[0], p[1], TH.x + Math.cos(a) * TH.r, TH.y + Math.sin(a) * TH.r, 5); }
    });
    // şehir meydanları ve göl kıyıları
    for (const c of list) { const g = x.createRadialGradient(c.mapX * k, c.mapY * k, 0, c.mapX * k, c.mapY * k, 17 * k); g.addColorStop(0, 'rgba(255,0,0,1)'); g.addColorStop(0.7, 'rgba(200,0,0,.8)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.beginPath(); x.arc(c.mapX * k, c.mapY * k, 17 * k, 0, 7); x.fill(); }
    for (const l of lakes) { x.fillStyle = 'rgba(255,0,0,1)'; x.beginPath(); x.ellipse(l.x * k, l.z * k, (l.r + 5) * k, (l.r * 0.7 + 5) * k, l.a, 0, 7); x.fill(); }
    // piramit çölleri (G)
    for (const q of G.PYRAMIDS) { const R2 = q.r * 2.4 * k, g = x.createRadialGradient(q.mapX * k, q.mapY * k, 0, q.mapX * k, q.mapY * k, R2); g.addColorStop(0, 'rgba(0,255,0,1)'); g.addColorStop(0.65, 'rgba(0,255,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.beginPath(); x.arc(q.mapX * k, q.mapY * k, R2, 0, 7); x.fill(); }
    // taht meydanı (B)
    const g = x.createRadialGradient(TH.x * k, TH.y * k, 0, TH.x * k, TH.y * k, (TH.r + 12) * k); g.addColorStop(0, 'rgba(0,0,255,1)'); g.addColorStop(0.85, 'rgba(0,0,255,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.beginPath(); x.arc(TH.x * k, TH.y * k, (TH.r + 12) * k, 0, 7); x.fill();
    x.globalCompositeOperation = 'source-over';
  }, false);
  // büyük ölçekli açık/koyu lekeler
  const macro = canvasTex(256, 256, (x) => {
    x.fillStyle = '#808080'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 260; i++) { const cx = rnd() * 256, cy = rnd() * 256, r = 6 + rnd() * 30, v = rnd() < 0.5 ? 255 : 0, g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, `rgba(${v},${v},${v},.22)`); g.addColorStop(1, `rgba(${v},${v},${v},0)`); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); }
    // kenarlara doğru koyulaşma
    const v = x.createRadialGradient(128, 128, 60, 128, 128, 182); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.35)'); x.fillStyle = v; x.fillRect(0, 0, 256, 256);
  }, false);
  splat.colorSpace = THREE.NoColorSpace; macro.colorSpace = THREE.NoColorSpace;
  return { splat, macro };
}
function groundMaterial(list, lakes, seed) {
  const { splat, macro } = paintSplat(list, lakes, seed);
  const mat = new THREE.MeshLambertMaterial({ map: splat });
  const U = { tGrass: { value: groundTex('grass') }, tDirt: { value: groundTex('dirt') }, tSand: { value: groundTex('sand') }, tMacro: { value: macro }, rep: { value: MAP / 22 } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = 'uniform sampler2D tGrass, tDirt, tSand, tMacro; uniform float rep;\n' + sh.fragmentShader.replace('#include <map_fragment>', `
      vec4 sp = texture2D(map, vMapUv);
      vec2 tu = vMapUv * rep;
      // dokunun tekrarı göze batmasın: iki ölçeği karıştır
      vec3 gC = mix(texture2D(tGrass, tu).rgb, texture2D(tGrass, tu * 0.37 + 0.23).rgb, 0.35);
      vec3 dC = texture2D(tDirt, tu * 1.4).rgb, sC = texture2D(tSand, tu * 0.9).rgb;
      vec3 c = mix(gC, dC, smoothstep(0.15, 0.85, sp.r));
      c = mix(c, sC, smoothstep(0.1, 0.9, sp.g));
      c = mix(c, dC * vec3(0.55, 0.56, 0.62), smoothstep(0.1, 0.9, sp.b));
      float m = texture2D(tMacro, vMapUv).r;
      c = mix(c, vec3(dot(c, vec3(0.3, 0.59, 0.11))), 0.2) * 0.8; // gece haritasıyla uyum: biraz soluk ve koyu
      diffuseColor.rgb *= c * (0.45 + m * 1.1);
    `);
  };
  mat.customProgramCacheKey = () => 'groundSplat';
  return mat;
}

// bölge dokusu: kenarı belirgin, içi hafif dolu daire
let terrT = null;
const terrTex = () => terrT || (terrT = canvasTex(256, 256, (x) => {
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, 'rgba(255,255,255,.10)'); g.addColorStop(0.86, 'rgba(255,255,255,.22)'); g.addColorStop(0.9, 'rgba(255,255,255,.95)'); g.addColorStop(0.94, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
}, false));
// taht rün halkası
let runeT = null;
const runeTex = () => runeT || (runeT = canvasTex(512, 512, (x) => {
  x.translate(256, 256); x.strokeStyle = '#fff'; x.fillStyle = '#fff';
  x.lineWidth = 6; x.beginPath(); x.arc(0, 0, 240, 0, 7); x.stroke(); x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 214, 0, 7); x.stroke();
  for (let i = 0; i < 36; i++) { x.save(); x.rotate(i / 36 * Math.PI * 2); x.fillRect(-3, -238, 6, 22); if (i % 3 === 0) { x.beginPath(); x.moveTo(0, -206); x.lineTo(8, -192); x.lineTo(0, -178); x.lineTo(-8, -192); x.closePath(); x.fill(); } x.restore(); }
}, false));
// akan ok şeridi dokusu
let arrowT = null;
const arrowTex = () => {
  if (arrowT) return arrowT;
  arrowT = canvasTex(128, 64, (x) => {
    x.shadowColor = '#fff'; x.shadowBlur = 10; x.fillStyle = '#fff';
    x.beginPath(); x.moveTo(30, 10); x.lineTo(78, 32); x.lineTo(30, 54); x.lineTo(44, 32); x.closePath(); x.fill();
    x.globalAlpha = 0.55; x.fillRect(0, 28, 128, 8);
  }, false);
  arrowT.wrapS = THREE.RepeatWrapping; return arrowT;
};
// A→B arasında zemine yatık, uçtan uca akan oklu şerit
function ribbon(ax, az, bx, bz, color, w = 2.6, op = 0.95) {
  const L = Math.max(1, Math.hypot(bx - ax, bz - az));
  const geo = new THREE.PlaneGeometry(L, w).rotateX(-Math.PI / 2);
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * L / (w * 1.6));
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: arrowTex(), color, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.position.set((ax + bx) / 2, 0.45, (az + bz) / 2); m.rotation.y = -Math.atan2(bz - az, bx - ax);
  return m;
}

// ---------------------------------------------------------------------
// Gözetleme helikopteri (prosedürel): mavi gövde, cam kokpit, kuyruk, kızaklar, dönen pervaneler
function makeHeli() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.35, ...o });
  const blue = M(0x2a5ad8), dark = M(0x1a2236), gold = M(0xe0b040, { metalness: 0.7, roughness: 0.3 });
  const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), blue); hull.scale.set(1.25, 1.1, 2.1); body.add(hull);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), M(0x9ae4ff, { emissive: 0x2a8ac8, emissiveIntensity: 0.7, roughness: 0.1 })); glass.scale.set(1.05, 0.95, 1.2); glass.rotation.x = Math.PI / 2.4; glass.position.set(0, 0.25, 1.05); body.add(glass);
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.09, 6, 24), gold); stripe.rotation.y = Math.PI / 2; stripe.scale.set(1, 0.95, 1.75); body.add(stripe);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.42, 3.6, 10), blue); boom.rotation.x = Math.PI / 2; boom.position.set(0, 0.35, -3.2); body.add(boom);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.3, 0.8), blue); fin.position.set(0, 0.95, -4.8); body.add(fin);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.45), blue); wing.position.set(0, 0.4, -4.3); body.add(wing);
  for (const sx of [-1, 1]) { const sk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.4, 6), dark); sk.rotation.x = Math.PI / 2; sk.position.set(sx * 0.95, -1.35, 0.1); body.add(sk); for (const z of [-0.8, 0.9]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 5), dark); st.position.set(sx * 0.85, -1.0, z); st.rotation.z = sx * 0.35; body.add(st); } }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.55, 8), dark); mast.position.y = 1.3; body.add(mast);
  const rotor = new THREE.Group(); rotor.position.y = 1.6; body.add(rotor);
  for (let i = 0; i < 4; i++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 4.2), dark); bl.position.z = 2.1; const arm = new THREE.Group(); arm.rotation.y = i * Math.PI / 2; arm.add(bl); rotor.add(arm); }
  const blur = new THREE.Mesh(new THREE.CircleGeometry(4.3, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.14, depthWrite: false })); blur.position.y = 1.62; body.add(blur);
  const tail = new THREE.Group(); tail.position.set(0.12, 1.0, -4.8); body.add(tail);
  for (let i = 0; i < 2; i++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.5, 0.16), dark); bl.rotation.x = i * Math.PI / 2; tail.add(bl); }
  const beacon = glow(0xff4030, 2.2, 1); beacon.position.set(0, 1.25, -4.85); body.add(beacon);
  g.scale.setScalar(1.15);
  g.userData = { body, rotor, tail, beacon };
  return g;
}

export function openWorldMap(opts = {}) {
  const scene = new THREE.Scene();
  const SKY = 0x0b1430;
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 300, 900);
  const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 1, 2200);
  scene.add(new THREE.HemisphereLight(0xa8bcf8, 0x22342a, 2.15));
  const moon = new THREE.DirectionalLight(0xc8d6ff, 2.2); moon.position.set(-200, 340, 160); scene.add(moon);
  const rim = new THREE.DirectionalLight(0xffc890, 0.45); rim.position.set(220, 160, -200); scene.add(rim);
  scene.add(new THREE.AmbientLight(0x3a4a80, 0.55));

  const S = G.S, myServer = S.server || 1, server = opts.server || myServer, home = server === myServer;
  // şehirler
  const list = [];
  if (home) list.push({ id: 'me', me: true, name: S.name, th: G.thLevel(), power: G.cityPower(), mapX: S.mapX, mapY: S.mapY, shieldUntil: (S.pvpShield || 0) / 1000 });
  const bots = home ? S.enemies : (G.ONLINE.foreign = G.foreignBots(server));
  for (const e of bots) list.push(e);
  const realList = home ? G.ONLINE.enemies.filter((e) => (e.server || 1) === server) : G.ONLINE.enemies.filter((e) => e.server === server);
  for (const e of realList) list.push(e);

  let seed = server * 131 + 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const nearCity = (x, z, r) => list.some((c) => Math.hypot(c.mapX - x, c.mapY - z) < r);
  const inThrone = (x, z, pad) => Math.hypot(x - TH.x, z - TH.y) < TH.r + pad;
  const free = (x, z, r) => !nearCity(x, z, r) && !inThrone(x, z, r * 0.6) && !G.nearPyramid(x, z, r * 0.8 + 6) && x > 20 && x < MAP - 20 && z > 20 && z < MAP - 20;

  // göller
  const lakes = []; for (let i = 0; i < 12; i++) { const l = { x: 80 + rnd() * (MAP - 160), z: 80 + rnd() * (MAP - 160), r: 16 + rnd() * 22, a: rnd() * 3 }; if (free(l.x, l.z, l.r + 26)) lakes.push(l); }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(MAP, MAP).rotateX(-Math.PI / 2), groundMaterial(list, lakes, server * 977 + 3));
  ground.material.map.anisotropy = 4; ground.position.set(MAP / 2, 0, MAP / 2); scene.add(ground);
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x1c3024 })); outer.position.set(MAP / 2, -0.3, MAP / 2); scene.add(outer);
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x2a5a9a, roughness: 0.1, metalness: 0.4, emissive: 0x0e2a6a, emissiveIntensity: 0.9 });
  for (const l of lakes) { const w = new THREE.Mesh(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), waterMat); w.scale.set(l.r, 1, l.r * 0.7); w.rotation.y = -l.a; w.position.set(l.x, 0.12, l.z); scene.add(w); }

  // ormanlar: kümeler halinde, şehir ve tahttan uzak; harita kenarında daha sık
  for (let v = 0; v < 3; v++) {
    const ms = []; let tries = 0;
    while (ms.length < 820 && tries++ < 9000) {
      const edge = rnd() < 0.45, cx = edge ? (rnd() < 0.5 ? rnd() * 90 : MAP - rnd() * 90) : rnd() * MAP, cz = rnd() * MAP;
      const [ax, az] = rnd() < 0.5 ? [cx, cz] : [cz, cx];
      for (let j = 0; j < 9 && ms.length < 820; j++) { const x = ax + (rnd() - 0.5) * 48, z = az + (rnd() - 0.5) * 48; if (!free(x, z, 20) || lakes.some((l) => Math.hypot(l.x - x, l.z - z) < l.r + 4)) continue; const s = 1.1 + rnd() * 0.8; ms.push(mat4(x, 0, z, rnd() * 6.28, s, s * 1.15)); }
    }
    instancify(BLD.createTree(v === 2 ? 3 : v), ms, scene);
  }
  // küçük çalılar: zemine derinlik (tek seferde çizilir)
  { const ms = []; for (let i = 0; i < 1400; i++) { const x = rnd() * MAP, z = rnd() * MAP; if (!free(x, z, 12) || lakes.some((l) => Math.hypot(l.x - x, l.z - z) < l.r + 3)) continue; const sc = 0.32 + rnd() * 0.28; ms.push(mat4(x, 0, z, rnd() * 6.28, sc, sc * 0.75)); } instancify(BLD.createTree(1), ms, scene); }
  // dağlar: haritayı çevreleyen sıra + içeride birkaç tane
  const mts = ['mountain_A_grass_trees', 'mountain_B_grass_trees', 'mountain_C_grass_trees', 'hills_A_trees'];
  for (let i = 0; i < 80; i++) {
    const side = i % 4, t = rnd() * MAP, off = -30 - rnd() * 40;
    const [x, z] = side === 0 ? [t, off] : side === 1 ? [t, MAP - off] : side === 2 ? [off, t] : [MAP - off, t];
    const m = A.model(mts[i % 4]); if (!m) continue; m.scale.setScalar(26 + rnd() * 20); m.position.set(x, -0.5, z); m.rotation.y = rnd() * 6; scene.add(m);
  }
  for (let i = 0; i < 20; i++) { const x = rnd() * MAP, z = rnd() * MAP; if (!free(x, z, 55)) continue; const m = A.model(mts[i % 4]); if (!m) continue; m.scale.setScalar(14 + rnd() * 10); m.position.set(x, -0.5, z); m.rotation.y = rnd() * 6; scene.add(m); }
  { const ms = []; for (let i = 0; i < 150; i++) { const x = rnd() * MAP, z = rnd() * MAP; if (free(x, z, 18)) ms.push(mat4(x, 0, z, rnd() * 6, 2.5 + rnd() * 3)); } const r = A.model('rock_single_A'); if (r) instancify(r, ms, scene); }

  // canlı alevler (titreşim için listede tutulur)
  const flames = [];
  const flame = (x, y, z, s = 1, parent = scene) => { const f = glow(0xff8a24, 5 * s, 0.85), c = glow(0xffe07a, 1.8 * s, 1); f.position.set(x, y, z); c.position.set(x, y, z); parent.add(f, c); flames.push({ f, s, ph: rnd() * 6 }); };

  // kaynak noktaları (çiftlik, kereste, taş) — dekor, kümeler halinde
  const RES = [['resource_lumber', 4.5], ['resource_stone', 4.5], ['building_grain', 5.5], ['sack', 6]];
  for (const [n, sc] of RES) {
    const ms = []; for (let i = 0; i < 48; i++) { const x = 40 + rnd() * (MAP - 80), z = 40 + rnd() * (MAP - 80); if (!free(x, z, 26)) continue; ms.push(mat4(x, 0, z, rnd() * 6, sc)); if (n === 'building_grain') ms.push(mat4(x + 4, 0, z + 1, rnd() * 6, sc)); }
    const p = A.model(n); if (p) instancify(p, ms, scene);
  }
  // barbar kampları: çadırlar, kırmızı bayrak, kamp ateşi
  const camps = [];
  { const tents = [], flags = [];
    for (let i = 0; i < 34; i++) { const x = 50 + rnd() * (MAP - 100), z = 50 + rnd() * (MAP - 100); if (!free(x, z, 30)) continue; camps.push([x, z]); for (let j = 0; j < 3; j++) { const a = j / 3 * 6.28 + rnd(); tents.push(mat4(x + Math.cos(a) * 4.5, 0, z + Math.sin(a) * 4.5, -a + 1.57, 4.2)); } flags.push(mat4(x + 2, 0, z - 2, rnd() * 6, 4.2)); flame(x, 1.2, z, 0.9); const gg = groundGlow(0xff7a2a, 14, 0.4); gg.position.set(x, 0.3, z); scene.add(gg); }
    const t = A.model('tent'); if (t) instancify(t, tents, scene); const f = A.model('flag_red'); if (f) instancify(f, flags, scene);
  }

  // ---- Demir Taht: merkezdeki dev kale ----
  const throne = new THREE.Group(); throne.position.set(TH.x, 0, TH.y); scene.add(throne);
  const zone = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: terrTex(), color: COL.throne, transparent: true, opacity: 0.85, depthWrite: false })); zone.scale.set(TH.r * 2.3, 1, TH.r * 2.3); zone.position.y = 0.2; throne.add(zone);
  const rune = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: runeTex(), color: 0xffb040, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); rune.scale.set(60, 1, 60); rune.position.y = 0.3; throne.add(rune);
  const tGlow = groundGlow(0xff5a2a, 120, 0.35); tGlow.position.y = 0.25; throne.add(tGlow);
  { // sur halkası
    const ws = A.modelSize('wall_straight'), R = 34, n = 22;
    if (ws) { const ms = []; for (let i = 0; i < n; i++) { if (i % (n / 2) === 0) continue; const a = i / n * Math.PI * 2; const sc = (2 * Math.PI * R / n) / ws.x * 1.04; ms.push(new THREE.Matrix4().compose(new THREE.Vector3(TH.x + Math.cos(a) * R, 0, TH.y + Math.sin(a) * R), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a + Math.PI / 2, 0)), new THREE.Vector3(sc, sc * 1.3, sc))); } const w = A.tinted('wall_straight', 0x8a8a98); if (w) instancify(w, ms, scene); }
    const tn = 'building_tower_B_blue', ts = A.modelSize(tn);
    if (ts) for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; const m = A.tinted(tn, 0x9a9aa8); if (!m) break; const sc = 11 / Math.max(ts.x, ts.z); m.scale.setScalar(sc); m.position.set(Math.cos(a) * 34, 0, Math.sin(a) * 34); throne.add(m); flame(Math.cos(a) * 34, ts.y * sc + 1.6, Math.sin(a) * 34, 1.5, throne); }
    for (const a of [0, Math.PI]) { const gx = Math.cos(a) * 34, gz = Math.sin(a) * 34; flame(gx + Math.sin(a) * 4, 4, gz + Math.cos(a) * 4, 1, throne); flame(gx - Math.sin(a) * 4, 4, gz - Math.cos(a) * 4, 1, throne); }
  }
  let throneModel = null, throneKey = '';
  const setThroneModel = () => {
    const k = ['townhall4', 'townhall3', 'townhall2', 'townhall'].find((q) => A.hasHF(q)); if (!k || k === throneKey) return;
    if (throneModel) throne.remove(throneModel);
    const m = A.hfModel(k), sz = A.hfSize(k); m.scale.setScalar(36 / Math.max(sz.x, sz.z)); throne.add(m); throneModel = m; throneKey = k;
  };
  A.ensureHF('townhall4'); setThroneModel();
  const crown = glow(0xffc040, 40, 0.5); crown.position.y = 34; throne.add(crown);
  const tagTex = (tag, color) => canvasTex(256, 128, (x) => {
    x.fillStyle = 'rgba(10,8,20,.72)'; x.strokeStyle = color; x.lineWidth = 8; x.beginPath(); x.roundRect(10, 18, 236, 92, 22); x.fill(); x.stroke();
    x.font = '900 64px Lilita One, Arial Black, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = color; x.shadowBlur = 18; x.fillStyle = '#fff'; x.fillText(tag, 128, 66);
  });
  const throneCity = G.THRONE_TARGET;
  // taht kalkanı (kubbe) ve sahip ittifak sancağı
  const tShieldMat = new THREE.MeshStandardMaterial({ color: 0x7ac8ff, transparent: true, opacity: 0.2, emissive: 0x2a6aff, emissiveIntensity: 0.8, depthWrite: false, side: THREE.DoubleSide });
  const tShield = new THREE.Mesh(new THREE.SphereGeometry(TH.r - 6, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), tShieldMat); throne.add(tShield);
  const tRingMat = new THREE.MeshBasicMaterial({ color: 0x8ad8ff, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const tRing = new THREE.Mesh(new THREE.TorusGeometry(TH.r - 6, 0.6, 6, 80), tRingMat); tRing.rotation.x = Math.PI / 2; tRing.position.y = 0.6; throne.add(tRing);
  const tBanner = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false })); tBanner.scale.set(34, 17, 1); tBanner.position.y = 52; tBanner.visible = false; throne.add(tBanner);
  let tKey = '';


  // ---- şehirler ----
  const hitMat = new THREE.MeshBasicMaterial({ visible: false }), hits = [];
  const shieldMat = new THREE.MeshStandardMaterial({ color: 0x7ac8ff, transparent: true, opacity: 0.22, emissive: 0x2a6aff, emissiveIntensity: 0.6, depthWrite: false, side: THREE.DoubleSide });
  const baseMat = new THREE.MeshLambertMaterial({ color: 0x8a8478 }), baseGeo = new THREE.CylinderGeometry(9.6, 10.4, 0.8, 32);
  const labels = $('wmLabels') || (() => { const d = document.createElement('div'); d.id = 'wmLabels'; document.body.appendChild(d); return d; })();
  labels.innerHTML = ''; labels.classList.remove('hidden');
  const kind = (c) => (c.me ? 'me' : isAlly(c) ? 'ally' : c.real ? 'real' : 'bot');
  const skinFxs = [];
  const makeCity = (c) => {
    if (inThrone(c.mapX, c.mapY, 10)) { const a = Math.atan2(c.mapY - TH.y, c.mapX - TH.x) || 1; c.mapX = TH.x + Math.cos(a) * (TH.r + 24); c.mapY = TH.y + Math.sin(a) * (TH.r + 24); }
    const col = COL[kind(c)];
    const g = new THREE.Group(); g.position.set(c.mapX, 0, c.mapY); scene.add(g);
    const terr = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: terrTex(), color: col, transparent: true, opacity: 0.8, depthWrite: false })); terr.scale.set(c.me ? 44 : 38, 1, c.me ? 44 : 38); terr.position.y = 0.18 + (c.me ? 0.02 : 0); g.add(terr);
    const base = new THREE.Mesh(baseGeo, baseMat); base.position.y = 0.4; g.add(base);
    const cm = cityModel(c.th || 1); cm.position.y = 0.8; if (c.me) cm.scale.multiplyScalar(1.2); g.add(cm);
    const gg = groundGlow(0xffa040, 32, 0.6); gg.position.y = 0.3; g.add(gg);
    // belediye efekti (benim ya da efekti olan gerçek oyuncular)
    const sk = c.me ? G.S.skin : c.skin; let fx = null;
    if (sk && SKINS[sk]) { fx = createSkinFX(sk, { R: c.me ? 8.5 : 7.5, H: c.me ? 13 : 11, base: cm }); fx.position.y = 0.8; g.add(fx); skinFxs.push(fx); }
    { let h = 0; for (const ch of String(c.id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; const hr = () => ((h = (h * 16807) % 2147483647) / 2147483647);
      const n = c.me ? 8 : 6;
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + hr() * 0.4 + 0.3; if (Math.abs(Math.sin(a) - 1) < 0.25 && c.me) continue; const nm = HOUSES[Math.floor(hr() * HOUSES.length)], m = A.model(nm); if (!m) break; const rr = 14 + hr() * 3; m.scale.setScalar(3.3 + hr() * 0.6); m.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr); m.rotation.y = -a + Math.PI / 2; g.add(m); }
      for (let i = 0; i < 3; i++) { const a = hr() * 6.28, m = A.model(i ? 'barrel' : 'crate_A_big'); if (!m) break; m.scale.setScalar(3); m.position.set(Math.cos(a) * 11, 0.8, Math.sin(a) * 11); g.add(m); } }
    flame(-7.5, 3.2, 7.5, 0.8, g); flame(7.5, 3.2, 7.5, 0.8, g);
    if (c.me) for (const sx of [-1, 1]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 12, 6), new THREE.MeshStandardMaterial({ color: 0xd8a830, metalness: 0.6, roughness: 0.4 })); pole.position.set(sx * 11, 6, 6); g.add(pole); const fl = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 5.4), new THREE.MeshStandardMaterial({ color: 0x2a4ab8, side: THREE.DoubleSide, emissive: 0x0a1a5a })); fl.position.set(sx * 11 + sx * 1.8, 9, 6); g.add(fl); flame(sx * 11, 12.6, 6, 1, g); }
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 16, 10), hitMat); hit.position.y = 8; hit.userData.city = c; g.add(hit); hits.push(hit);
    let shield = null;
    if (c.shieldUntil > Date.now() / 1000) { shield = new THREE.Mesh(new THREE.SphereGeometry(13, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), shieldMat); g.add(shield); }
    const el = document.createElement('div'); el.className = 'wm-l ' + kind(c);
    const tg = c.me ? G.S.alliance?.tag : c.alliance?.tag;
    el.innerHTML = `<b>${c.th || 1}</b><span>${tg ? `<em class="wm-tag">[${tg}]</em> ` : ''}${c.me ? (G.S.name || 'Krallığım') : (isAlly(c) ? '🤝 ' : c.real ? '🌐 ' : '') + c.name}</span>${shield ? '<i>🛡️</i>' : ''}`;
    labels.appendChild(el);
    return { c, g, el, shield, terr, y: 0 };
  };
  const cities = list.map(makeCity);
  // taht etiketi ve dokunma alanı
  const tHit = new THREE.Mesh(new THREE.CylinderGeometry(30, 30, 40, 12), hitMat); tHit.position.set(TH.x, 20, TH.y); tHit.userData.city = throneCity; scene.add(tHit); hits.push(tHit);
  const tEl = document.createElement('div'); tEl.className = 'wm-l throne'; tEl.innerHTML = '<b>👑</b><span>Demir Taht</span><small>Tarafsız</small>'; labels.appendChild(tEl);
  const tLabel = { c: throneCity, g: throne, el: tEl, y: 46 };

  // ---- Mısır piramitleri: Sv.1 dışta → Sv.5 tahta yakın; sahibi ittifakın renginde, üstünde [ETİKET] ----
  A.ensureHF('pyramid');

  const pyrMesh = (q) => { if (!A.hasHF('pyramid')) { const m = new THREE.Mesh(new THREE.ConeGeometry(q.r * 0.95, q.r * 1.2, 4), new THREE.MeshStandardMaterial({ color: 0xd8b070, roughness: 0.8 })); m.position.y = q.r * 0.6; m.rotation.y = Math.PI / 4; return m; } const m = A.hfModel('pyramid'), sz = A.hfSize('pyramid'); m.scale.setScalar((26 + q.level * 3) / Math.max(sz.x, sz.z)); return m; }; // Demir Taht (~36) boyunda: Sv.1 29 → Sv.5 41
  const pyrObjs = new Map();
  const buildPyr = (q) => {
    const g = new THREE.Group(); g.position.set(q.mapX, 0, q.mapY); scene.add(g);
    const terr = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: terrTex(), color: 0xd8b070, transparent: true, opacity: 0.85, depthWrite: false })); terr.scale.set(q.r * 2.9, 1, q.r * 2.9); terr.position.y = 0.22; g.add(terr);
    const body = new THREE.Group(); g.add(body); body.add(pyrMesh(q));
    const cap = glow(0xffd060, 10 + q.level * 3, 0.55); cap.position.y = (26 + q.level * 3) * 0.62; g.add(cap);
    for (const [dx, dz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) flame(dx * q.r * 1.05, 3.5, dz * q.r * 1.05, 0.9 + q.level * 0.08, g);
    const banner = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false })); banner.scale.set(20 + q.level * 2, 10 + q.level, 1); banner.position.y = (26 + q.level * 3) * 0.95; banner.visible = false; g.add(banner);
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(q.r, q.r, q.r * 1.4, 10), hitMat); hit.position.y = q.r * 0.65; hit.userData.city = q; g.add(hit); hits.push(hit);
    const el = document.createElement('div'); el.className = 'wm-l pyr'; labels.appendChild(el);
    return { c: q, g, body, terr, cap, banner, el, hf: A.hasHF('pyramid'), key: '', y: q.r * 1.9 };
  };
  const syncPyr = () => {
    { const st = G.pyrState(throneCity), own = st.owner, col = own ? ALLY_COLORS[own.color] || ALLY_COLORS[1] : null, up = G.throneShield(), key = (own ? own.aid + own.tag + own.color : '-') + up;
      if (key !== tKey) { tKey = key; tShield.visible = tRing.visible = up; zone.material.color.set(own ? col : COL.throne); if (own) { tBanner.material.map?.dispose(); tBanner.material.map = tagTex(own.tag || '???', col); tBanner.material.needsUpdate = true; tBanner.visible = true; } else tBanner.visible = false; }
      tEl.innerHTML = `<b>👑</b><span>${own ? `<em class="wm-tag" style="color:${col}">[${own.tag}]</em> ` : ''}Demir Taht</span><small>${up ? '🛡️ Kalkanlı' : own ? 'Sahipli' : 'Tarafsız'}</small>`; }
    for (const q of G.PYRAMIDS) {
      let o = pyrObjs.get(q.id); if (!o) { o = buildPyr(q); pyrObjs.set(q.id, o); }
      if (!o.hf && A.hasHF('pyramid')) { o.body.clear(); o.body.add(pyrMesh(q)); o.hf = true; o.key = ''; }
      const st = G.pyrState(q), own = st.owner, col = own ? ALLY_COLORS[own.color] || ALLY_COLORS[1] : null, mine = own && G.S.alliance && own.aid === G.S.alliance.id;
      const key = (own ? own.aid + own.tag + own.color : '-') + o.hf;
      if (o.key !== key) {
        o.key = key;
        o.terr.material.color.set(own ? col : '#d8b070');
        o.body.traverse((m) => { if (m.isMesh && m.material) { if (!m.userData.base) { m.material = m.material.clone(); m.userData.base = m.material.color.clone(); } if (!m.userData.baseE) m.userData.baseE = m.material.emissive ? m.material.emissive.clone() : null; m.material.color.copy(m.userData.base); if (m.userData.baseE) m.material.emissive.copy(m.userData.baseE); if (own) { m.material.color.lerp(new THREE.Color(col), 0.45); if (m.material.emissive) m.material.emissive.lerp(new THREE.Color(col), 0.55); } } });
        if (own) { o.banner.material.map?.dispose(); o.banner.material.map = tagTex(own.tag || '???', col); o.banner.material.needsUpdate = true; o.banner.visible = true; } else o.banner.visible = false;
      }
      const hpPct = Math.round(st.hp / q.power * 100), fight = st.hp < q.power;
      o.el.className = 'wm-l pyr' + (mine ? ' mine' : own ? ' owned' : '') + (sel === q ? ' sel' : '');
      o.el.innerHTML = `<b>${q.level}</b><span>${own ? `<em class="wm-tag" style="color:${col}">[${own.tag}]</em> ` : ''}🔺 Piramit</span>${fight ? `<i class="pyr-hp"><u style="width:${hpPct}%"></u></i>` : ''}`;
    }
  };

  // ---- haritada sürekli dolaşan ordular (canlılık) ----
  const ambient = [];
  { const ends = list.map((c) => [c.mapX, c.mapY]).concat(camps);
    const n = Math.min(9, 3 + ends.length);
    for (let i = 0; i < n; i++) {
      let a = ends[Math.floor(rnd() * ends.length)] || [rnd() * MAP, rnd() * MAP];
      if (!ends.length || rnd() < 0.3) { const an = rnd() * 6.28, d = 180 + rnd() * 260; a = [clamp(TH.x + Math.cos(an) * d, 40, 960), clamp(TH.y + Math.sin(an) * d, 40, 960)]; }
      let b;
      if (rnd() < 0.55) { const an = Math.atan2(a[1] - TH.y, a[0] - TH.x) + (rnd() - 0.5) * 0.6; b = [TH.x + Math.cos(an) * (TH.r - 6), TH.y + Math.sin(an) * (TH.r - 6)]; }
      else b = camps.length ? camps[Math.floor(rnd() * camps.length)] : [rnd() * MAP, rnd() * MAP];
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 60) continue;
      const enemy = rnd() < 0.55, col = enemy ? 0xff3a2a : 0x3ae0ff;
      const line = ribbon(a[0], a[1], b[0], b[1], col, 2.2, 0.75); scene.add(line);
      const army = new THREE.Group();
      for (let j = 0; j < 3; j++) { const u = createSoldier(j === 1 ? 'cavalry' : 'infantry', enemy ? 'red' : 'blue'); u.scale.setScalar(2.2); u.position.set((j - 1) * 2, 0, (j % 2) * -1.5); army.add(u); }
      scene.add(army);
      ambient.push({ a: new THREE.Vector3(a[0], 0, a[1]), b: new THREE.Vector3(b[0], 0, b[1]), army, line, dur: 40 + rnd() * 50, t0: rnd() });
    }
  }

  // ---- oyuncunun seferleri: oklu şerit + yürüyen ordu ----
  const marchObjs = new Map();
  const syncMarches = () => {
    for (const [id, o] of marchObjs) if (!S.marches.find((m) => m.id === id)) { scene.remove(o.line, o.army); freeSkeletons(o.army); o.line.geometry.dispose(); o.el.remove(); marchObjs.delete(id); }
    for (const m of S.marches) {
      if (marchObjs.has(m.id) || !home || m.foreign) continue;
      const a = new THREE.Vector3(S.mapX, 0, S.mapY), b = new THREE.Vector3(m.tx, 0, m.ty), c = m.kind === 'rally' ? new THREE.Vector3(m.lx, 0, m.ly) : null;
      const line = c ? ribbon(c.x, c.z, b.x, b.z, 0xff6a3a, 3.4, 1) : ribbon(a.x, a.z, b.x, b.z, 0xffd040, 3.2, 1); scene.add(line);
      const army = new THREE.Group();
      for (let i = 0; i < 3; i++) { const u = createSoldier(i === 1 ? 'cavalry' : 'infantry', 'blue'); u.scale.setScalar(2.6); u.position.set((i - 1) * 2.2, 0, (i % 2) * -1.6); army.add(u); }
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), new THREE.MeshBasicMaterial({ color: 0x2a6ae0, side: THREE.DoubleSide })); flag.position.set(0, 7, 0); army.add(flag);
      scene.add(army);
      const el = document.createElement('div'); el.className = 'wm-m'; labels.appendChild(el);
      marchObjs.set(m.id, { line, army, el, a, b, c });
    }
  };
  syncMarches();

  // ---- gözetleme helikopterleri ----
  const scoutObjs = new Map();
  const shadowMat = new THREE.MeshBasicMaterial({ map: discTex(), color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false });
  const syncScouts = () => {
    for (const [id, o] of scoutObjs) if (!S.scouts.find((q) => q.id === id)) { scene.remove(o.heli, o.line, o.shadow); o.el.remove(); scoutObjs.delete(id); }
    for (const sc of S.scouts) {
      if (scoutObjs.has(sc.id) || !home || sc.foreign) continue;
      const a = new THREE.Vector3(S.mapX, 0, S.mapY), b = new THREE.Vector3(sc.tx, 0, sc.ty);
      const line = ribbon(a.x, a.z, b.x, b.z, 0x4ad0ff, 1.6, 0.7); scene.add(line);
      const heli = makeHeli(); scene.add(heli);
      const shadow = new THREE.Mesh(discGeo, shadowMat); shadow.scale.set(9, 1, 9); scene.add(shadow);
      const el = document.createElement('div'); el.className = 'wm-heli'; labels.appendChild(el);
      scoutObjs.set(sc.id, { heli, line, shadow, el, a, b });
    }
  };
  syncScouts();

  // ---- zombiler ----
  const zombieObjs = new Map();
  A.ensureHF('zombie');
  const zRing = new THREE.MeshBasicMaterial({ map: terrTex(), color: 0x6aff3a, transparent: true, opacity: 0.6, depthWrite: false });
  const zombieMesh = (L) => {
    let m = A.hasHF('zombie') ? A.hfModel('zombie') : null, h = 1;
    if (m) { const sz = A.hfSize('zombie'); h = sz.y; m.scale.setScalar((7 + Math.min(L, 100) * 0.04) / h); }
    else { m = createSoldier('infantry', 'red'); m.scale.setScalar(2.6); m.traverse((o) => { if (o.isMesh && o.material) { o.material = o.material.clone(); o.material.color?.multiply(new THREE.Color(0x7aff6a)); } }); }
    return m;
  };
  const buildZombie = (z) => {
    const g = new THREE.Group(); g.position.set(z.mapX, 0, z.mapY); scene.add(g);
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), zRing); ring.scale.set(16, 1, 16); ring.position.y = 0.2; g.add(ring);
    const gg = groundGlow(0x5aff3a, 18, 0.35); gg.position.y = 0.3; g.add(gg);
    const body = new THREE.Group(); g.add(body); body.add(zombieMesh(z.level));
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 12, 8), hitMat); hit.position.y = 6; hit.userData.city = z; g.add(hit); hits.push(hit);
    const el = document.createElement('div'); el.className = 'wm-l zombie'; labels.appendChild(el);
    return { z, c: z, g, body, el, hit, ph: Math.random() * 6, hf: A.hasHF('zombie'), lock: null };
  };
  const syncZombies = () => {
    if (!home) return;
    for (const [id, o] of zombieObjs) if (!S.zombies.includes(o.z)) { scene.remove(o.g); freeSkeletons(o.g); o.el.remove(); hits.splice(hits.indexOf(o.hit), 1); zombieObjs.delete(id); if (sel === o.z) select(null); }
    for (const z of S.zombies) {
      let o = zombieObjs.get(z.id);
      if (!o) { o = buildZombie(z); zombieObjs.set(z.id, o); }
      if (!o.hf && A.hasHF('zombie')) { o.body.clear(); o.body.add(zombieMesh(z.level)); o.hf = true; }
      const lock = !G.zombieUnlocked(z.level);
      if (o.lock !== lock) { o.lock = lock; o.el.classList.toggle('locked', lock); o.el.innerHTML = `<b>${z.level}</b><span>${lock ? '🔒 ' : ''}Zombi</span>`; }
    }
  };
  syncZombies();

  // ---- madenler (buğday, kereste, taş, altın) ----
  const mineObjs = new Map();
  const MCOL = { food: 0xffd04a, wood: 0x8ad04a, stone: 0xb8c0d0, gold: 0xffc020 };
  const mProp = (n, x, z, sc, ry = 0, tint) => { const m = tint && A.tinted ? A.tinted(n, tint) : A.model(n); if (!m) return null; m.scale.setScalar(sc); m.position.set(x, 0, z); m.rotation.y = ry; return m; };
  const buildMine = (q) => {
    const g = new THREE.Group(); g.position.set(q.mapX, 0, q.mapY); scene.add(g);
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: terrTex(), color: MCOL[q.type], transparent: true, opacity: 0.55, depthWrite: false })); ring.scale.set(17, 1, 17); ring.position.y = 0.2; g.add(ring);
    const s2 = 1 + q.level * 0.03, parts = [];
    if (q.type === 'food') parts.push(mProp('building_grain', -2.6, 0, 5.2 * s2), mProp('building_grain', 2.6, 0.6, 5.2 * s2, 0.3), mProp('sack', 0, 4, 5), mProp('wheelbarrow', -4, 4, 4.4, 0.6));
    if (q.type === 'wood') parts.push(mProp('resource_lumber', 0, 1.5, 5.4 * s2), mProp('trees_A_medium', -4, -2.5, 4.2), mProp('trees_B_medium', 3.8, -3, 4.2), mProp('resource_lumber', 3, 3.5, 4, 1.2));
    if (q.type === 'stone') parts.push(mProp('resource_stone', 0, 1, 5.6 * s2), mProp('rock_single_B', -3.6, -2.2, 4.6), mProp('rock_single_C', 3.6, -2, 4.2), mProp('wheelbarrow', 3.4, 3.4, 4.2, -0.6));
    if (q.type === 'gold') { parts.push(mProp('building_mine_blue', 0, -1.5, 5.4 * s2, 0, 0xc8a060), mProp('resource_stone', -3.4, 3, 4.4, 0.5, 0xffd060), mProp('resource_stone', 3.2, 3.2, 3.8, 1.4, 0xffd060)); const gw = glow(0xffc040, 12, 0.55); gw.position.y = 3; g.add(gw); }
    for (const m of parts) if (m) g.add(m);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), new THREE.MeshBasicMaterial({ color: 0x2a6ae0, side: THREE.DoubleSide })); flag.position.set(0, 8, 0); flag.visible = false; g.add(flag);
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 8.5, 10, 8), hitMat); hit.position.y = 5; hit.userData.city = q; g.add(hit); hits.push(hit);
    const el = document.createElement('div'); el.className = 'wm-l mine ' + q.type; labels.appendChild(el);
    return { z: q, c: q, g, el, hit, flag, key: '' };
  };
  const syncMines = () => {
    if (!home) return;
    for (const [id, o] of mineObjs) if (!S.mines.includes(o.z)) { scene.remove(o.g); o.el.remove(); hits.splice(hits.indexOf(o.hit), 1); mineObjs.delete(id); if (sel === o.z) select(null); }
    for (const q of S.mines) {
      let o = mineObjs.get(q.id); if (!o) { o = buildMine(q); mineObjs.set(q.id, o); }
      const lock = !G.mineUnlocked(q.type, q.level), busy = !!q.busy && S.marches.some((m) => m.id === q.busy), key = lock + ':' + busy;
      if (o.key !== key) { o.key = key; o.flag.visible = busy; o.el.classList.toggle('locked', lock); o.el.classList.toggle('busy', busy); o.el.innerHTML = `<b>${q.level}</b><span>${busy ? '⛏ ' : lock ? '🔒 ' : ''}${G.MINE_TYPES[q.type].icon}</span>`; }
    }
  };
  syncMines();

  // ---- devler: büyük, haritada yürüyen; yalnızca ralliyle kesilir ----
  const giantObjs = new Map();
  A.ensureHF('giant');
  const gRing = new THREE.MeshBasicMaterial({ map: terrTex(), color: 0xff7a2a, transparent: true, opacity: 0.6, depthWrite: false });
  const giantMesh = () => { if (A.hasHF('giant')) { const m = A.hfModel('giant'), sz = A.hfSize('giant'); m.scale.setScalar(15 / sz.y); return m; } const m = createSoldier('infantry', 'red'); m.scale.setScalar(5.5); return m; };
  const buildGiant = (q) => {
    const g = new THREE.Group(); g.position.set(q.mapX, 0, q.mapY); scene.add(g);
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), gRing); ring.scale.set(24, 1, 24); ring.position.y = 0.22; g.add(ring);
    const gg = groundGlow(0xff6a2a, 26, 0.35); gg.position.y = 0.3; g.add(gg);
    const body = new THREE.Group(); g.add(body); body.add(giantMesh());
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 18, 8), hitMat); hit.position.y = 9; hit.userData.city = q; g.add(hit); hits.push(hit);
    const el = document.createElement('div'); el.className = 'wm-l giant'; labels.appendChild(el);
    return { z: q, c: q, g, body, el, hit, hf: A.hasHF('giant'), key: '', px: q.mapX, py: q.mapY, ph: Math.random() * 6 };
  };
  const syncGiants = () => {
    if (!home) return;
    for (const [id, o] of giantObjs) if (!S.giants.includes(o.z)) { scene.remove(o.g); freeSkeletons(o.g); o.el.remove(); hits.splice(hits.indexOf(o.hit), 1); giantObjs.delete(id); if (sel === o.z) select(null); }
    for (const q of S.giants) {
      let o = giantObjs.get(q.id); if (!o) { o = buildGiant(q); giantObjs.set(q.id, o); }
      if (!o.hf && A.hasHF('giant')) { o.body.clear(); o.body.add(giantMesh()); o.hf = true; }
      const lock = !G.giantUnlocked(q.level), key = lock + ':' + !!q.frozen;
      if (o.key !== key) { o.key = key; o.el.classList.toggle('locked', lock); o.el.innerHTML = `<b>${q.level}</b><span>${q.frozen ? '📯 ' : lock ? '🔒 ' : ''}Dev</span>`; }
    }
  };
  syncGiants();

  // =====================================================================
  //  Kamera
  // =====================================================================
  const startC = opts.focus ? list.find((c) => c.id === opts.focus) : list.find((c) => c.me) || list[0];
  const cam = { tx: startC ? startC.mapX : TH.x, tz: startC ? startC.mapY : TH.y, d: 520, dT: 230, vx: 0, vz: 0, fly: null, anchor: null };
  const pitchOf = (d) => lerp(0.68, 1.15, clamp((d - MIN_D) / (MAX_D - MIN_D), 0, 1)); // 39° → 66°
  const placeCam = () => {
    const p = pitchOf(cam.d);
    camera.position.set(cam.tx, cam.d * Math.sin(p), cam.tz + cam.d * Math.cos(p));
    camera.lookAt(cam.tx, 0, cam.tz); camera.updateMatrixWorld();
  };
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), ray = new THREE.Raycaster(), v2 = new THREE.Vector2(), hitP = new THREE.Vector3();
  const pick = (sx, sy) => { v2.set(sx / innerWidth * 2 - 1, -(sy / innerHeight) * 2 + 1); ray.setFromCamera(v2, camera); return ray.ray.intersectPlane(plane, hitP) ? { x: hitP.x, z: hitP.z } : null; };
  const clampCam = () => { cam.tx = clamp(cam.tx, -20, MAP + 20); cam.tz = clamp(cam.tz, -20, MAP + 20); };
  // ekrandaki (sx,sy) noktasının altındaki dünya noktasını sabit tutarak zoom
  const zoomAt = (newD, sx, sy) => {
    placeCam(); const before = pick(sx, sy);
    cam.d = clamp(newD, MIN_D, MAX_D); placeCam(); const after = pick(sx, sy);
    if (before && after) { cam.tx += before.x - after.x; cam.tz += before.z - after.z; }
    clampCam();
  };
  placeCam();

  const cv = C.renderer.domElement, pts = new Map();
  let downAt = null, moved = 0, pinch = null, lastMove = 0, samples = [];
  const pd = (e) => {
    if (e.target !== cv) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    cam.vx = cam.vz = 0; cam.fly = null; cam.anchor = null; cam.dT = cam.d; samples = [];
    if (pts.size === 1) { downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; moved = 0; }
    if (pts.size === 2) { const [p1, p2] = [...pts.values()]; pinch = { dist: Math.hypot(p1.x - p2.x, p1.y - p2.y), d: cam.d, mx: (p1.x + p2.x) / 2, my: (p1.y + p2.y) / 2 }; moved = 99; }
  };
  const pm = (e) => {
    const p = pts.get(e.pointerId); if (!p) return;
    const px = p.x, py = p.y; p.x = e.clientX; p.y = e.clientY;
    if (pts.size >= 2 && pinch) {
      const [p1, p2] = [...pts.values()], mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2, dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      // iki parmakla kaydırma: önceki orta noktanın altındaki yer yeni orta noktaya gelsin
      placeCam(); const a = pick(pinch.mx, pinch.my), b = pick(mx, my); if (a && b) { cam.tx += a.x - b.x; cam.tz += a.z - b.z; }
      zoomAt(pinch.d * pinch.dist / Math.max(20, dist), mx, my); cam.dT = cam.d;
      pinch.mx = mx; pinch.my = my; return;
    }
    moved += Math.abs(e.clientX - px) + Math.abs(e.clientY - py);
    placeCam(); const a = pick(px, py), b = pick(e.clientX, e.clientY); if (!a || !b) return;
    const dx = a.x - b.x, dz = a.z - b.z; cam.tx += dx; cam.tz += dz; clampCam();
    const now = performance.now(); samples.push({ t: now, dx, dz }); while (samples.length && now - samples[0].t > 110) samples.shift(); lastMove = now;
  };
  const pu = (e) => {
    if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId);
    if (pts.size === 1) { pinch = null; samples = []; return; }
    if (pts.size > 0) return;
    pinch = null;
    const now = performance.now();
    // atalet: son ~90 ms'deki hızla kaymaya devam et
    if (samples.length && now - lastMove < 120) { const span = Math.max(16, now - samples[0].t); let sx = 0, sz = 0; for (const s of samples) { sx += s.dx; sz += s.dz; } cam.vx = sx / span * 1000; cam.vz = sz / span * 1000; const sp = Math.hypot(cam.vx, cam.vz), mx = cam.d * 6; if (sp > mx) { cam.vx *= mx / sp; cam.vz *= mx / sp; } }
    samples = [];
    if (downAt && moved < 10) tap(e.clientX, e.clientY);
    downAt = null;
  };
  const wh = (e) => { cam.dT = clamp(cam.dT * (1 + Math.sign(e.deltaY) * 0.16), MIN_D, MAX_D); cam.anchor = { x: e.clientX, y: e.clientY }; cam.fly = null; };
  cv.addEventListener('pointerdown', pd); addEventListener('pointermove', pm); addEventListener('pointerup', pu); addEventListener('pointercancel', pu); cv.addEventListener('wheel', wh, { passive: true });
  const flyTo = (x, z, d) => { cam.fly = { x0: cam.tx, z0: cam.tz, d0: cam.d, x, z, d: d ?? cam.d, t: 0 }; cam.vx = cam.vz = 0; cam.anchor = null; };
  const tap = (sx, sy) => {
    placeCam(); v2.set(sx / innerWidth * 2 - 1, -(sy / innerHeight) * 2 + 1); ray.setFromCamera(v2, camera);
    const hit = ray.intersectObjects(hits)[0];
    if (hit) { const c = hit.object.userData.city; select(c); flyTo(c.mapX, c.mapY + (c.throne ? 0 : c.pyr ? c.r * 0.4 : 14), Math.min(cam.d, c.throne ? 260 : c.pyr ? 150 + c.r * 2 : 200)); return; }
    const gp = pick(sx, sy);
    select(gp && home && !inThrone(gp.x, gp.z, 0) ? { ground: true, id: 'g', mapX: gp.x, mapY: gp.z } : null);
  };

  // =====================================================================
  //  Arayüz
  // =====================================================================
  let sel = null, search = opts.search ? { kind: opts.search, lv: 999 } : null; // search: { lv } arama penceresi açıkken
  const render = () => {
    const c = sel;
    let card = '';
    // ortak parçalar: süslü pencere, istatistik kutuları, metalik butonlar
    const B = (cls, id, icon, label, extra = '', dis = false) => `<button class="wm-btn ${cls}" id="${id}" ${dis ? 'disabled' : ''}><i>${icon}</i><span>${label}</span>${extra}</button>`;
    const cost = (ic, v) => `<em class="wm-cost">${ic}${v}</em>`;
    const win = (title, badge, body, kind = '') => `<div class="wm-card ${kind}"><div class="wm-crown"></div><div class="wm-ch"><b>${title}</b>${badge ? `<span class="wm-badge">${badge}</span>` : ''}</div>${body}</div>`;
    const stat = (ic, label, val, sub = '') => `<div class="wm-st"><i>${ic}</i><div><small>${label}</small><b>${val}</b>${sub}</div></div>`;
    if (c && c.pyr) {
      const st = G.pyrState(c), acc = G.pyrAccess(c), own = st.owner, col = own ? ALLY_COLORS[own.color] || ALLY_COLORS[1] : '#d8b070', full = G.S.marches.length >= G.MAX_MARCHES;
      const pct = st.hp / c.power * 100, top = Object.entries(st.dmg).sort((a, b) => b[1] - a[1]).slice(0, 3);
      const hs = own && st.ownedAt ? (Date.now() - st.ownedAt) / 1000 : 0, held = hs >= 86400 ? `${Math.floor(hs / 86400)} gün ${Math.floor(hs % 86400 / 3600)} sa` : hs ? G.fmtTime(hs) : '';
      const shieldUp = c.throne && G.throneShield();
      card = win(c.throne ? '👑 Demir Taht' : `🔺 Piramit Sv.${c.level}`, own ? `<span style="color:${col}">[${own.tag}]</span>` : 'Sahipsiz', `
        ${c.throne ? `<div class="wm-shield ${shieldUp ? '' : 'ok'}">${shieldUp ? '🛡️ Taht kalkanı açık: bir ittifak Sv.5 piramidi 5 gün elinde tutunca kalkan iner' : '⚔️ Taht kalkanı indi! Sv.5 piramidi 5 gündür tutan ittifaklar saldırabilir'}</div>` : ''}
        <div class="pyr-own" style="--pc:${col}">${own ? `<b>[${own.tag}] ${String(own.name || '').replace(/</g, '')}</b><small>${held} süredir elinde</small>` : (c.throne ? '<b>Tarafsız taht</b><small>Canını eriten ittifaklar arasında en çok hasar veren tahtın sahibi olur</small>' : '<b>Sahipsiz piramit</b><small>Canını ilk eriten değil, en çok hasar veren ittifak sahip olur</small>')}</div>
        <div class="pyr-hpbar"><i style="width:${pct.toFixed(1)}%"></i><span>❤️ ${G.fmt(st.hp)} / ${G.fmt(c.power)}</span></div>
        ${top.length ? `<div class="pyr-dmg"><small>Savaştaki ittifaklar (hasar)</small>${top.map(([aid, d], i) => { const n = st.names[aid] || {}; return `<div><em>${i + 1}.</em><b style="color:${ALLY_COLORS[n.color] || '#fff'}">[${n.tag || '?'}]</b><span>${G.fmt(d)}</span></div>`; }).join('')}</div>` : ''}
        <div class="wm-cs">${stat(c.throne ? '👑' : '🔺', c.throne ? 'Taht gücü' : 'Piramit gücü', G.fmt(c.power))}${stat('⚔️', 'Ordu gücün', G.fmt(G.armyPower(G.S.troops)))}</div>
        ${acc.ok ? `<div class="wm-shield ok">⚔️ İttifakın ${c.throne ? 'Demir Taht\'a' : 'bu piramide'} savaş açabilir. Saldır ya da ralli aç!</div>` : `<div class="wm-shield zl">🔒 ${acc.why}</div>`}
        <div class="wm-cb">${B('steel', 'wmClose', '✖', 'Kapat')}${B('gold', 'wmAtk', '⚔', 'Saldır', '', !acc.ok || full)}${B('crimson', 'wmRally', '📯', 'Ralli aç', '', !acc.ok || full)}</div>`, 'pyr');
    } else if (c && c.giant) {
      const L = c.level, lock = !G.giantUnlocked(L), rw = G.giantRewards(L), full = G.S.marches.length >= G.MAX_MARCHES, ally = !!G.S.alliance;
      card = win(`🗿 Dev Sv.${L}`, '👥 Ralli • en fazla 5', `
        <div class="wm-cs">${stat('💀', 'Dev gücü', G.fmt(c.power))}${stat('⚔️', 'Ordu gücün', G.fmt(G.armyPower(G.S.troops)))}</div>
        <div class="wm-zrw"><small>Ödüller (her katılana eşit)</small><div><span>🌾🪵 ${G.fmt(rw.res.food)}</span><span>🪨 ${G.fmt(rw.res.stone)}</span>${rw.items.map((it) => `<span>⏩ ${SPEEDUPS[it.id].short} ×${it.n}</span>`).join('')}</div></div>
        ${lock ? `<div class="wm-shield zl">🔒 Önce <b>Sv.${L - 1}</b> devi kesmelisiniz. En yüksek: Sv.${G.S.giantMax || 0}</div>` : c.frozen ? '<div class="wm-shield">📯 Bu deve ralli açıldı</div>' : !ally ? '<div class="wm-shield zl">🛡️ Devler yalnızca ittifak rallisiyle kesilir. Önce bir ittifaka katıl.</div>' : full ? '<div class="wm-shield zl">🚩 3 birliğin de dışarıda.</div>' : ''}
        <div class="wm-cb">${B('steel', 'wmClose', '✖', 'Kapat')}${B('crimson', 'wmRally', '📯', 'Ralli aç', '', lock || c.frozen || !ally || full)}</div>`, 'giant');
    } else if (c && c.mine) {
      const MT = G.MINE_TYPES[c.type], L = c.level, lock = !G.mineUnlocked(c.type, L), busy = c.busy && G.S.marches.find((m) => m.id === c.busy), t = G.marchTime(c, G.S.troops), full = G.marchesFull?.() ?? G.S.marches.length >= G.MAX_MARCHES;
      card = win(`${MT.icon} ${MT.name} Sv.${L}`, `⏱ ${fmtT(t)}`, `
        <div class="wm-cs">${stat(MT.icon, 'Saatlik verim (tam)', G.fmt(G.mineRate(c.type, L)))}${stat('⏳', 'En fazla kazım', G.mineHours(L) + ' saat')}</div>
        <div class="wm-cs">${stat('⚔️', 'Tam verim gücü', G.fmt(G.mineRefPower(L)))}${stat('🚩', 'Birlikler', `${G.S.marches.length}/${G.MAX_MARCHES}`)}</div>
        ${lock ? `<div class="wm-shield zl">🔒 Önce <b>Sv.${L - 1}</b> ${MT.name} kazmalısın. En yüksek: Sv.${G.S.mineMax[c.type] || 0}</div>` : busy ? `<div class="wm-shield">⛏ Birliğin burada ${busy.phase === 'gather' ? 'kazıyor • kalan ' + fmtT(busy.gEnd - Date.now() / 1000) : 'yolda'}</div>` : full ? '<div class="wm-shield zl">🚩 3 birliğin de dışarıda. Biri dönünce gönderebilirsin.</div>' : ''}
        <div class="wm-cb">${B('steel', 'wmClose', '✖', 'Kapat')}${busy ? B('violet', 'wmRecallMine', '↩', 'Geri çağır') : B('gold', 'wmAtk', '⛏', 'Kaz', '', lock || full)}</div>`, 'mine m-' + c.type);
    } else if (c && c.zombie) {
      const L = c.level, lock = !G.zombieUnlocked(L), need = G.zombiePower(L), mine = G.armyPower(G.S.troops), [lo, hi] = G.zombieLootRange(L), t = G.marchTime(c, G.S.troops), going = G.S.marches.some((m) => m.target === c.id);
      const ok = mine >= need * 1.1 ? ['Kolay', 'easy'] : mine >= need ? ['Orta', 'mid'] : mine >= need * 0.75 ? ['Zor', 'hard'] : ['Çok zor', 'vhard'];
      card = win(`🧟 Zombi Sv.${L}`, `⏱ ${fmtT(t)}`, `
        <div class="wm-cs">${stat('💀', 'Gereken güç', G.fmt(need))}${stat('⚔️', 'Ordu gücün', G.fmt(mine), `<em class="wm-diff ${ok[1]}">${ok[0]}</em>`)}</div>
        <div class="wm-zrw"><small>Ödüller</small><div><span>🌾🪵🪨 ${G.fmt(lo)}–${G.fmt(hi)}</span><span>⏩ 1dk${L >= 20 ? ' ×' + (1 + Math.floor(L / 20)) : ''}</span><span>⏩ 5dk <i>şans</i></span></div></div>
        ${lock ? `<div class="wm-shield zl">🔒 Önce <b>Sv.${L - 1}</b> zombiyi öldürmelisin. En yüksek: Sv.${G.S.zombieMax || 0}</div>` : ''}
        <div class="wm-cb">${B('steel', 'wmClose', '✖', 'Kapat')}${B('crimson', 'wmAtk', going ? '🚩' : '⚔', going ? 'Yolda…' : 'Saldır', '', lock || going)}</div>`, 'zombie');
    } else if (c && !c.me && !c.ground) {
      const scouting = G.S.scouts.some((q) => q.target === c.id), last = G.lastScout(c.id), st = G.scoutTime(c);
      const t = G.marchTime(c, G.S.troops), sh = c.shieldUntil > Date.now() / 1000, ratio = c.power / Math.max(1, G.cityPower());
      const diff = ratio < 0.6 ? ['Kolay', 'easy'] : ratio < 1 ? ['Orta', 'mid'] : ratio < 1.5 ? ['Zor', 'hard'] : ['Çok zor', 'vhard'];
      card = win(`${c.alliance?.tag ? '[' + c.alliance.tag + '] ' : ''}${c.real ? '🌐 ' : '🏰 '}${c.name}`, `🏛️ Belediye Sv.${c.th || 1}`, `
        <div class="wm-cs">${stat('⚔️', c.real ? 'Gerçek oyuncu' : c.lord, G.fmt(c.power), `<em class="wm-diff ${diff[1]}">${diff[0]}</em>`)}${stat('📍', 'Konum', `X:${Math.round(c.mapX)} Y:${Math.round(c.mapY)}`, `<em class="wm-times"><span>⏱ ${fmtT(t)}</span><span>🚁 ${fmtT(st)}</span></em>`)}</div>
        ${sh ? `<div class="wm-shield">🛡️ Kalkan aktif: ${G.fmtTime(c.shieldUntil - Date.now() / 1000)}</div>` : ''}
        <div class="wm-cb">${B('steel', 'wmClose', '✖', 'Kapat')}${B('violet', 'wmScout', scouting ? '🚁' : '👁', scouting ? 'Yolda…' : 'Gözetle', scouting ? '' : cost('🌾', G.SCOUT_COST.food), sh || scouting)}${isAlly(c) ? B('steel', 'wmAlly', '🤝', 'Müttefik', '', true) : B('crimson', 'wmAtk', '⚔', 'Saldır', '', sh)}</div>
        ${last ? `<div class="wm-cb">${B('gold wide', 'wmLastRep', '📜', `Son gözetleme raporu <small>(${agoS(last.t)})</small>`)}</div>` : ''}
        ${home ? `<div class="wm-cb">${B('sapphire wide', 'wmTpNear', '📍', 'Yanına Işınlan', cost('🪙', G.TELEPORT_COST))}</div>` : ''}`, 'enemy');
    } else if (c && c.ground) {
      const okSpot = G.spotFree(c.mapX, c.mapY);
      card = win('📍 Boş alan', `X:${Math.round(c.mapX)} Y:${Math.round(c.mapY)}`, `<p class="wm-desc">${okSpot ? 'Şehrini buraya ışınlayabilirsin. Komşularına yakın ol, ittifak kur ya da saldırıya hazırlan!' : 'Burası başka bir şehre çok yakın, ışınlanamazsın.'}</p>
        <div class="wm-cb">${B('steel', 'wmClose', '✖', 'Kapat')}${B('sapphire', 'wmTpHere', '📍', 'Buraya Işınlan', cost('🪙', G.TELEPORT_COST), !okSpot)}</div>`);
    } else if (c && c.me) card = win(`🏰 ${G.S.name}`, `🏛️ Belediye Sv.${G.thLevel()}`, `<div class="wm-cs">${stat('⚔️', 'Güç', G.fmt(G.cityPower()))}${stat('📍', 'Konum', `X:${G.S.mapX} Y:${G.S.mapY}`)}</div>
        <div class="wm-cb">${B('steel', 'wmClose', '✖', 'Kapat')}${B('gold', 'wmCity', '🏰', 'Şehre Gir')}</div>`, 'mine');
    if (search && home) {
      const isG = search.kind === 'giant', isZ = search.kind === 'zombie' || isG, MT = isZ ? null : G.MINE_TYPES[search.kind];
      const mx = isG ? Math.min(G.GIANT_MAX_LEVEL, (G.S.giantMax || 0) + 1) : isZ ? Math.min(G.ZOMBIE_MAX_LEVEL, (G.S.zombieMax || 0) + 1) : Math.min(G.MINE_MAX_LEVEL, (G.S.mineMax[search.kind] || 0) + 1), L = search.lv = Math.max(1, Math.min(mx, search.lv));
      const here = isG ? G.S.giants.filter((z) => z.level === L && !z.frozen).length : isZ ? G.S.zombies.filter((z) => z.level === L).length : G.S.mines.filter((q) => q.type === search.kind && q.level === L && !q.busy).length, need = isG ? G.giantPower(L) : isZ ? G.zombiePower(L) : G.mineRate(search.kind, L);
      const kinds = [['giant', '🗿', 'Dev'], ['zombie', '🧟', 'Zombi'], ['food', '🌾', 'Buğday'], ['wood', '🪵', 'Kereste'], ['stone', '🪨', 'Taş'], ['gold', '🪙', 'Altın']].map(([k, i, n]) => `<button class="zs-kind ${k === search.kind ? 'on' : ''}" data-zkind="${k}"><i>${i}</i><span>${n}</span></button>`).join('');
      const chips = [...new Set([1, Math.max(1, mx - 5), Math.max(1, mx - 2), Math.max(1, mx - 1), mx])].map((v) => `<button class="zs-chip ${v === L ? 'on' : ''}" data-zlv="${v}">Sv.${v}${v === mx ? ' ★' : ''}</button>`).join('');
      card = win('🔍 Haritada Ara', `En yüksek: Sv.${isG ? G.S.giantMax || 0 : isZ ? G.S.zombieMax || 0 : G.S.mineMax[search.kind] || 0}`, `
        <div class="zs-kinds">${kinds}</div>
        <div class="zs-pick"><button class="zs-step" id="zsMinus">−</button><div class="zs-lv"><img src="${UI('ic_search')}" alt=""><div><small>${isG ? 'Dev seviyesi' : isZ ? 'Zombi seviyesi' : MT.name}</small><b>Sv.${L}</b></div></div><button class="zs-step" id="zsPlus">+</button></div>
        <input class="zs-range" id="zsRange" type="range" min="1" max="${mx}" value="${L}">
        <div class="zs-chips">${chips}</div>
        <div class="wm-cs">${isZ ? stat('💀', 'Gereken güç', G.fmt(need)) : stat(MT.icon, 'Saatlik verim', G.fmt(need))}${stat('📍', 'Haritada', here ? `${here} adet` : 'Yok (oluşur)')}</div>
        <div class="wm-cb">${B('steel', 'wmZsClose', '✖', 'Kapat')}${B('gold', 'wmZsGo', '🔍', 'Ara')}</div>`, 'zombie search');
    }
    const marches = G.S.marches.map((m) => `<div class="wm-mr ${m.kind === 'gather' ? 'ga' : ''}" data-mid="${m.id}"><i>${m.kind === 'gather' ? (m.phase === 'back' ? '↩' : '⛏') : m.phase === 'go' ? '⚔' : '↩'}</i><span>${m.phase === 'gather' ? 'Kazıyor • ' : ''}${m.tname}</span><b data-mt="${m.id}">${fmtT((m.phase === 'gather' ? m.gEnd : m.arrive) - Date.now() / 1000)}</b>${m.phase === 'go' || m.phase === 'gather' ? `<button data-recall="${m.id}">Geri çağır</button>` : ''}</div>`).join('');
    const scoutsRows = G.S.scouts.map((q) => `<div class="wm-mr sc"><i>🚁</i><span>${q.phase === 'go' ? 'Gözetleme' : 'Dönüyor'} • ${q.tname}</span><b data-st="${q.id}">${fmtT(q.arrive - Date.now() / 1000)}</b></div>`).join('');
    ov().innerHTML = `<div class="wm-vig"></div><div class="wm-top"><button class="wm-srv" id="wmSrv"><i>🌐</i><span>Sunucu #${server}${home ? '' : ' <small>(yabancı)</small>'}</span><em>⇄</em></button><span class="wm-xy"><i>📍</i><b id="wmXY">X:${Math.round(cam.tx)} Y:${Math.round(cam.tz)}</b></span><button class="wm-x" id="wmX">✕</button></div>
      ${home ? '' : '<div class="wm-war">⚔ Krallıklar arası savaş: bu sunucudaki krallıklara saldırabilirsin (yürüyüş uzun sürer).</div>'}
      <div class="wm-side">${home ? `<button id="wmSearch" class="wm-orb emerald ${search ? 'on' : ''}"><img src="${UI('ic_search')}" alt=""><span>Ara</span></button>` : ''}<button id="wmHome" class="wm-orb sapphire"><img src="${UI('ic_castle')}" alt=""><span>Şehrim</span></button><button id="wmThrone" class="wm-orb ruby"><img src="${UI('ic_throne')}" alt=""><span>Taht</span></button></div>
      <div class="wm-bottom">${marches || scoutsRows ? `<div class="wm-ms">${scoutsRows}${marches}</div>` : ''}${card}</div>`;
    $('wmX').onclick = closeWorld;
    const defLv = (k) => (k === 'giant' ? Math.min(G.GIANT_MAX_LEVEL, (G.S.giantMax || 0) + 1) : k === 'zombie' ? Math.min(G.ZOMBIE_MAX_LEVEL, (G.S.zombieMax || 0) + 1) : Math.min(G.MINE_MAX_LEVEL, (G.S.mineMax[k] || 0) + 1));
    if ($('wmSearch')) $('wmSearch').onclick = () => { if (search) search = null; else { search = { kind: 'zombie', lv: defLv('zombie') }; sel = null; } C.sfx('click'); render(); };
    if (search) {
      const setLv = (v) => { search.lv = v; render(); };
      if ($('zsMinus')) $('zsMinus').onclick = () => setLv(search.lv - 1);
      if ($('zsPlus')) $('zsPlus').onclick = () => setLv(search.lv + 1);
      if ($('zsRange')) $('zsRange').oninput = (e) => { search.lv = +e.target.value; const b = ov().querySelector('.zs-lv b'); if (b) b.textContent = 'Sv.' + search.lv; };
      if ($('zsRange')) $('zsRange').onchange = () => render();
      ov().querySelectorAll('[data-zlv]').forEach((b) => (b.onclick = () => setLv(+b.dataset.zlv)));
      ov().querySelectorAll('[data-zkind]').forEach((b) => (b.onclick = () => { search.kind = b.dataset.zkind; search.lv = defLv(search.kind); C.sfx('click'); render(); }));
      $('wmZsClose').onclick = () => { search = null; render(); };
      $('wmZsGo').onclick = () => { if (search.kind === 'giant') { const r = G.findGiant(search.lv); if (!r.ok) return C.toast(r.why, true); search = null; syncGiants(); C.sfx(r.created ? 'reveal' : 'click'); C.toast(`🗿 Dev Sv.${r.giant.level} bulundu!`); flyTo(r.giant.mapX, r.giant.mapY + 16, Math.min(cam.d, 170)); select(r.giant); return; }
        if (search.kind !== 'zombie') { const r = G.findMine(search.kind, search.lv); if (!r.ok) return C.toast(r.why, true); search = null; syncMines(); C.sfx(r.created ? 'reveal' : 'click'); C.toast(`${G.MINE_TYPES[r.mine.type].icon} ${r.mine.name} bulundu!`); flyTo(r.mine.mapX, r.mine.mapY + 14, Math.min(cam.d, 150)); select(r.mine); return; }
        const r = G.findZombie(search.lv); if (!r.ok) return C.toast(r.why, true); search = null; syncZombies(); C.sfx(r.created ? 'reveal' : 'click'); C.toast(r.created ? `🧟 Sv.${r.zombie.level} zombi bulundu! (yakınında belirdi)` : `🧟 Sv.${r.zombie.level} zombi bulundu!`); flyTo(r.zombie.mapX, r.zombie.mapY + 14, Math.min(cam.d, 150)); select(r.zombie); };
    }
    $('wmHome').onclick = () => { const me = list.find((q) => q.me); if (me) flyTo(me.mapX, me.mapY, 230); else closeWorld(); };
    $('wmThrone').onclick = () => { flyTo(TH.x, TH.y + 10, 300); select(throneCity); };
    $('wmSrv').onclick = () => { const next = server === myServer ? myServer + 1 : myServer; closeWorld(true); openWorldMap({ server: next }); C.toast(next === myServer ? '🏠 Kendi sunucuna döndün' : `🌐 Sunucu #${next} görüntüleniyor`); };
    if ($('wmClose')) $('wmClose').onclick = () => select(null);
    if ($('wmAtk')) $('wmAtk').onclick = () => C.onAttack(sel.id);
    if ($('wmRally')) $('wmRally').onclick = () => C.onRally(sel.id);
    if ($('wmRecallMine')) $('wmRecallMine').onclick = () => { G.recallMarch(sel.busy); C.toast('↩ Kazım birliği geri çağrıldı'); syncMines(); render(); };
    if ($('wmScout')) $('wmScout').onclick = () => { const r = G.startScout(sel.id); if (!r.ok) return C.toast(r.why, true); C.sfx('horn'); C.toast(`🚁 Helikopter havalandı • ${fmtT(r.scout.dur * 2)} sonra rapor`); syncScouts(); render(); };
    if ($('wmLastRep')) $('wmLastRep').onclick = () => C.onScoutReport(G.lastScout(sel.id));
    const doTp = (x, y) => { const r = G.teleport(x, y); if (!r.ok) { C.toast(r.why, true); return; } C.sfx('reveal'); C.toast('📍 Şehrin ışınlandı!'); C.onTeleport?.(); closeWorld(); openWorldMap({}); };
    if ($('wmTpNear')) $('wmTpNear').onclick = () => { const sp = G.spotNear(sel.mapX, sel.mapY); if (!sp) return C.toast('Yakında boş yer yok', true); doTp(sp[0], sp[1]); };
    if ($('wmTpHere')) $('wmTpHere').onclick = () => doTp(sel.mapX, sel.mapY);
    if ($('wmCity')) $('wmCity').onclick = closeWorld;
    ov().querySelectorAll('[data-recall]').forEach((b) => (b.onclick = () => { G.recallMarch(b.dataset.recall); render(); }));
  };
  const select = (c) => { sel = c; if (c) search = null; giantObjs.forEach((o) => o.el.classList.toggle('sel', o.z === c)); zombieObjs.forEach((o) => o.el.classList.toggle('sel', o.z === c)); mineObjs.forEach((o) => o.el.classList.toggle('sel', o.z === c)); if (c) C.sfx('click'); cities.forEach((o) => o.el.classList.toggle('sel', o.c === c)); tEl.classList.toggle('sel', c === throneCity); render(); };
  W = { scene, render, select, syncMarches, syncScouts, syncPyr, cities, list, server, home };
  syncPyr();
  window.__wmSelect = select; window.__wmCam = cam;
  render();

  // canlı oyuncular: açılışta ve her 30 sn'de bir (yeni katılanlar hemen görünür)
  const addReal = (ps) => {
    if (!W || W.scene !== scene) return;
    for (const p of ps) {
      const e = G.rivalToEnemy(p); e.server = p.server || 1;
      const old = cities.find((o) => o.c.id === e.id);
      if (old) { if (Math.hypot(old.c.mapX - e.mapX, old.c.mapY - e.mapY) > 1) { old.c.mapX = e.mapX; old.c.mapY = e.mapY; old.g.position.set(e.mapX, 0, e.mapY); } continue; }
      if (home) { if (!G.ONLINE.enemies.find((q) => q.id === e.id)) G.ONLINE.enemies.push(e); } else G.ONLINE.foreign.push(e);
      list.push(e); cities.push(makeCity(e));
    }
  };
  let lastFetch = 0;
  const fetchReal = () => { if (C.online.ready) { lastFetch = performance.now(); C.serverPlayers(server).then(addReal); } };
  fetchReal();

  // =====================================================================
  //  Kare döngüsü
  // =====================================================================
  const _v = new THREE.Vector3(); let lastUi = 0;
  const putLabel = (o, y, dz = 0) => {
    _v.set(o.c.mapX, y, o.c.mapY + dz).project(camera);
    if (_v.z > 1 || Math.abs(_v.x) > 1.2 || Math.abs(_v.y) > 1.2) { o.el.style.display = 'none'; return false; }
    o.el.style.display = ''; o.el.style.transform = `translate3d(${((_v.x + 1) / 2 * innerWidth).toFixed(1)}px,${((1 - _v.y) / 2 * innerHeight).toFixed(1)}px,0) translate(-50%,0)`;
    return true;
  };
  const update = (dt, t) => {
    dt = Math.min(dt, 0.05);
    // kamera: süzülme, atalet, tekerlek zoom'u
    if (cam.fly) {
      const f = cam.fly; f.t = Math.min(1, f.t + dt / 0.55); const k = 1 - Math.pow(1 - f.t, 3);
      cam.tx = lerp(f.x0, f.x, k); cam.tz = lerp(f.z0, f.z, k); cam.d = cam.dT = lerp(f.d0, f.d, k); if (f.t >= 1) cam.fly = null;
    } else if (!pts.size) {
      if (cam.vx || cam.vz) { cam.tx += cam.vx * dt; cam.tz += cam.vz * dt; const fr = Math.exp(-dt * 4.2); cam.vx *= fr; cam.vz *= fr; if (Math.hypot(cam.vx, cam.vz) < 2) cam.vx = cam.vz = 0; clampCam(); }
      if (Math.abs(cam.dT - cam.d) > 0.05) { const nd = lerp(cam.d, cam.dT, Math.min(1, dt * 10)); if (cam.anchor) zoomAt(nd, cam.anchor.x, cam.anchor.y); else cam.d = nd; }
    }
    placeCam();
    const near = clamp(1 - (cam.d - 120) / 380, 0, 1); // 1: yakın, 0: uzak
    scene.fog.near = cam.d * 1.15; scene.fog.far = cam.d * 3.4 + 300;
    for (const f of flames) { const q = 0.85 + Math.sin(t * 11 + f.ph) * 0.1 + Math.sin(t * 6.3 + f.ph) * 0.07; f.f.scale.setScalar(5 * f.s * q); }
    rune.rotation.y = t * 0.12; crown.material.opacity = 0.42 + Math.sin(t * 1.6) * 0.1;
    arrowTex().offset.x = -t * 0.9;
    if (!throneModel || throneKey !== 'townhall4') setThroneModel();
    // etiketler: uzakta yalnızca seviye rozeti, yakında isim de
    labels.classList.toggle('far', cam.d > 420);
    labels.style.setProperty('--wm-s', (0.82 + near * 0.3).toFixed(3));
    const lod = 1 + clamp((cam.d - 200) / 320, 0, 1) * 1.1; // uzakta şehirler ~2 kat büyük görünür
    for (const fx of skinFxs) if (fx.parent?.visible) fx.userData.update(t, dt);
    for (const o of cities) {
      const d = Math.hypot(o.c.mapX - cam.tx, o.c.mapY - cam.tz); o.g.visible = d < cam.d * 2.6 + 120;
      if (o.g.scale.x !== lod) o.g.scale.setScalar(lod);
      if (!o.g.visible) { o.el.style.display = 'none'; continue; }
      putLabel(o, -3 * lod);
      if (o.shield) o.shield.material.opacity = 0.18 + Math.sin(t * 2) * 0.06;
      if (o.c === sel) o.terr.material.opacity = 0.75 + Math.sin(t * 6) * 0.2; else o.terr.material.opacity = 0.8;
    }
    putLabel(tLabel, 0, 40);
    for (const o of pyrObjs.values()) { const d = Math.hypot(o.c.mapX - cam.tx, o.c.mapY - cam.tz), vis = d < cam.d * 2.8 + 200; o.g.visible = vis; if (!vis) { o.el.style.display = 'none'; continue; } putLabel(o, 0, o.c.r * 1.25); o.cap.material.opacity = 0.4 + Math.sin(t * 2 + o.c.level) * 0.15; if (o.c === sel) o.terr.material.opacity = 0.7 + Math.sin(t * 6) * 0.2; else o.terr.material.opacity = 0.85; }
    if (t - (W._zs || 0) > 0.5) { W._zs = t; syncZombies(); syncMines(); syncGiants(); syncPyr(); }
    for (const o of giantObjs.values()) {
      const [gx, gy] = G.giantPos(o.z, Date.now() / 1000); o.z.mapX = gx; o.z.mapY = gy; o.g.position.set(gx, 0, gy);
      const dx = gx - o.px, dy = gy - o.py; if (Math.abs(dx) + Math.abs(dy) > 0.001) { o.body.rotation.y = Math.atan2(dx, dy); o.px = gx; o.py = gy; }
      const d = Math.hypot(gx - cam.tx, gy - cam.tz), vis = d < cam.d * 2.6 + 140; o.g.visible = vis; if (!vis) { o.el.style.display = 'none'; continue; }
      if (o.g.scale.x !== lod) o.g.scale.setScalar(lod);
      const w = o.z.frozen ? 0 : 1; o.body.position.y = Math.abs(Math.sin(t * 2.2 + o.ph)) * 0.5 * w; o.body.rotation.z = Math.sin(t * 2.2 + o.ph) * 0.05 * w;
      putLabel(o, -2 * lod);
    }
    for (const o of mineObjs.values()) { const d = Math.hypot(o.z.mapX - cam.tx, o.z.mapY - cam.tz), vis = d < cam.d * 2.6 + 120; o.g.visible = vis; if (!vis) { o.el.style.display = 'none'; continue; } if (o.g.scale.x !== lod) o.g.scale.setScalar(lod); putLabel(o, -2 * lod); }
    for (const o of zombieObjs.values()) {
      const d = Math.hypot(o.z.mapX - cam.tx, o.z.mapY - cam.tz), vis = d < cam.d * 2.6 + 120; o.g.visible = vis;
      if (!vis) { o.el.style.display = 'none'; continue; }
      if (o.g.scale.x !== lod) o.g.scale.setScalar(lod);
      o.body.rotation.z = Math.sin(t * 1.6 + o.ph) * 0.06; o.body.position.y = Math.abs(Math.sin(t * 1.6 + o.ph)) * 0.3; o.body.rotation.y = Math.sin(t * 0.4 + o.ph) * 0.6;
      putLabel(o, -2 * lod);
    }
    zone.material.opacity = sel === throneCity ? 0.75 + Math.sin(t * 6) * 0.2 : 0.85;
    if (tShield.visible) { tShieldMat.opacity = 0.16 + Math.sin(t * 1.6) * 0.05; tRing.rotation.z = t * 0.3; tRingMat.opacity = 0.35 + Math.sin(t * 3) * 0.15; }
    // dolaşan ordular
    for (const a of ambient) {
      const k = ((t / a.dur + a.t0) % 1), from = a.a, to = a.b;
      a.army.position.lerpVectors(from, to, k); a.army.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
      const vis = Math.hypot(a.army.position.x - cam.tx, a.army.position.z - cam.tz) < cam.d * 1.8;
      a.army.visible = vis; if (vis && cam.d < 420) a.army.children.forEach((u) => u.userData && animateUnit(u, 'run', t, dt));
    }
    // oyuncunun seferleri
    syncMarches();
    const now = Date.now() / 1000;
    for (const m of G.S.marches) {
      const o = marchObjs.get(m.id); if (!o) continue;
      if (m.kind === 'rally') {
        const k = clamp((now - m.start) / Math.max(1, m.arrive - m.start), 0, 1);
        const [from, to] = m.phase === 'wait' ? [o.a, o.a] : m.phase === 'muster' ? [o.a, o.c] : m.phase === 'go' ? [o.c, o.b] : [o.b, o.a];
        o.army.position.lerpVectors(from, to, m.phase === 'wait' ? 0 : k); o.army.visible = m.phase !== 'wait'; if (from !== to) o.army.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
        o.army.children.forEach((u) => u.userData && animateUnit(u, 'run', t, dt));
        _v.set(o.army.position.x, 9, o.army.position.z).project(camera);
        o.el.style.transform = `translate3d(${((_v.x + 1) / 2 * innerWidth).toFixed(1)}px,${((1 - _v.y) / 2 * innerHeight).toFixed(1)}px,0) translate(-50%,-100%)`;
        o.el.textContent = m.phase === 'wait' || m.phase === 'muster' ? `📯 ${fmtT(m.endsAt - now)}` : `${m.phase === 'go' ? '🗿' : '↩'} ${fmtT(m.arrive - now)}`;
        continue;
      }
      const gat = m.phase === 'gather', k = gat ? 1 : clamp((now - m.start) / Math.max(1, m.arrive - m.start), 0, 1), from = m.phase === 'go' || gat ? o.a : o.b, to = m.phase === 'go' || gat ? o.b : o.a;
      o.army.position.lerpVectors(from, to, k); if (gat) o.army.position.x += 5; o.army.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
      o.army.children.forEach((u) => u.userData && animateUnit(u, gat ? 'idle' : 'run', t, dt));
      _v.set(o.army.position.x, 9, o.army.position.z).project(camera);
      o.el.style.transform = `translate3d(${((_v.x + 1) / 2 * innerWidth).toFixed(1)}px,${((1 - _v.y) / 2 * innerHeight).toFixed(1)}px,0) translate(-50%,-100%)`;
      o.el.textContent = m.phase === 'gather' ? `⛏ ${fmtT(m.gEnd - now)}` : `${m.kind === 'gather' ? '⛏' : m.phase === 'go' ? '⚔' : '↩'} ${fmtT(m.arrive - now)}`;
    }
    // gözetleme helikopterleri: kalkış, hızlı uçuş, hedefte kısa tur, iniş
    syncScouts();
    for (const sc of G.S.scouts) {
      const o = scoutObjs.get(sc.id); if (!o) continue;
      const k = clamp((now - sc.start) / Math.max(1, sc.arrive - sc.start), 0, 1), from = sc.phase === 'go' ? o.a : o.b, to = sc.phase === 'go' ? o.b : o.a;
      const e = k * k * (3 - 2 * k), alt = 22 * Math.min(1, Math.min(k, 1 - k) * 7) + 1.6;
      o.heli.position.lerpVectors(from, to, e); o.heli.position.y = alt + Math.sin(t * 3) * 0.4;
      o.heli.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
      const ud = o.heli.userData, spd = Math.sin(k * Math.PI);
      ud.body.rotation.x = 0.28 * spd; ud.rotor.rotation.y += dt * 38; ud.tail.rotation.x += dt * 50; ud.beacon.material.opacity = Math.sin(t * 8) > 0 ? 1 : 0.15;
      o.shadow.position.set(o.heli.position.x, 0.35, o.heli.position.z); o.shadow.material.opacity = 0.45 * (1 - alt / 40);
      _v.set(o.heli.position.x, o.heli.position.y + 8, o.heli.position.z).project(camera);
      o.el.style.transform = `translate3d(${((_v.x + 1) / 2 * innerWidth).toFixed(1)}px,${((1 - _v.y) / 2 * innerHeight).toFixed(1)}px,0) translate(-50%,-100%)`;
      o.el.textContent = `🚁 ${sc.phase === 'go' ? '' : '↩ '}${fmtT(sc.arrive - now)}`;
    }
    if (performance.now() - lastFetch > 30000) fetchReal();
    if (t - lastUi > 0.25) {
      lastUi = t;
      const xy = $('wmXY'); if (xy) xy.textContent = `X:${Math.round(cam.tx)} Y:${Math.round(cam.tz)}`;
      ov().querySelectorAll('[data-st]').forEach((el) => { const q = G.S.scouts.find((z) => z.id === el.dataset.st); if (q) el.textContent = fmtT(q.arrive - now); });
      ov().querySelectorAll('[data-mt]').forEach((el) => { const m = G.S.marches.find((q) => q.id === el.dataset.mt); if (m) el.textContent = fmtT((m.phase === 'gather' ? m.gEnd : m.arrive) - now); });
      const sig = G.S.marches.map((m) => m.id + m.phase).join() + '|' + G.S.scouts.length;
      if (sig !== W._sig) { W._sig = sig; render(); }
    }
  };
  const dispose = () => {
    cv.removeEventListener('pointerdown', pd); removeEventListener('pointermove', pm); removeEventListener('pointerup', pu); removeEventListener('pointercancel', pu); cv.removeEventListener('wheel', wh);
    labels.innerHTML = ''; labels.classList.add('hidden'); labels.classList.remove('far'); W = null;
  };
  openScene({ scene, camera, update, dispose, freeOnClose: true, world: true }, 'city');
}
function closeWorld() { if (!W) return; closeScene(); }
export function closeWorldMap() { closeWorld(); }
export function refreshWorldUI() { W?.render(); }
export function refreshPyramids() { W?.syncPyr?.(); W?.render(); }
