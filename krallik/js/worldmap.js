// =====================================================================
//  DEMİR SANCAK — 3D krallık haritası
//  Sunucudaki tüm şehirler (gerçek oyuncular 🌐 + bilgisayar krallıkları)
//  geniş bir haritada; kaydır/yakınlaştır, şehre dokun → sefer,
//  ordular haritada yürür, varınca savaşır, geri döner.
// =====================================================================
import * as THREE from 'three';
import * as A from './assets.js';
import * as BLD from './buildings.js';
import * as G from './state.js';
import { createSoldier, animateUnit } from './units.js';
import { openScene, closeScene, sceneOverlay as ov } from './scenes.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmtT = (s) => { s = Math.max(0, Math.ceil(s)); const m = Math.floor(s / 60); return m ? `${m}:${String(s % 60).padStart(2, '0')}` : `${s}sn`; };
let C = null; // { renderer, toast, sfx, onAttack(id), onWatch(m), online, serverPlayers }
let W = null; // açık harita durumu

export function initWorldMap(ctx) { C = ctx; }
export const worldOpen = () => !!W;

function grassTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
  x.fillStyle = '#6a9e3c'; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) { x.fillStyle = ['#5a8e30', '#7cb04a', '#6aa23a', '#8cbc58', '#4e8028'][i % 5]; x.globalAlpha = 0.25 + Math.random() * 0.5; x.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 3, 2 + Math.random() * 3); }
  for (let i = 0; i < 40; i++) { const g = x.createRadialGradient(0, 0, 0, 0, 0, 60); g.addColorStop(0, 'rgba(120,150,60,.35)'); g.addColorStop(1, 'rgba(120,150,60,0)'); x.save(); x.translate(Math.random() * 512, Math.random() * 512); x.globalAlpha = 1; x.fillStyle = g; x.fillRect(-60, -60, 120, 120); x.restore(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(70, 70); t.anisotropy = 4; return t;
}
function instancify(proto, matrices, scene) {
  proto.updateMatrixWorld(true);
  proto.traverse((m) => {
    if (!m.isMesh) return;
    const im = new THREE.InstancedMesh(m.geometry, m.material, matrices.length); im.castShadow = false; im.receiveShadow = true;
    const tmp = new THREE.Matrix4(); matrices.forEach((M, i) => { tmp.multiplyMatrices(M, m.matrixWorld); im.setMatrixAt(i, tmp); });
    im.computeBoundingSphere(); scene.add(im);
  });
}
const thKey = (L) => (L >= 30 ? 'townhall4' : L >= 20 ? 'townhall3' : L >= 10 ? 'townhall2' : 'townhall');
function cityModel(L) {
  let k = thKey(L); if (!A.hasHF(k)) { A.ensureHF(k); k = 'townhall'; }
  const m = A.hfModel(k); if (!m) return new THREE.Group();
  const sz = A.hfSize(k); m.scale.setScalar(13 / Math.max(sz.x, sz.z)); return m;
}

// ---------------------------------------------------------------------
// Gece haritası zemini: tek büyük boyalı doku (yollar, toprak, göl kıyıları) — tohumlu
function nightGround(list, lakes, seed) {
  const N = 2048, k = N / 1000, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d');
  let sd = seed; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  x.fillStyle = '#2c4636'; x.fillRect(0, 0, N, N);
  for (let i = 0; i < 260; i++) { const r = 30 + rnd() * 160, g = x.createRadialGradient(0, 0, 0, 0, 0, r); const col = ['58,92,62', '40,66,66', '64,78,88', '50,82,56'][i % 4]; g.addColorStop(0, `rgba(${col},.55)`); g.addColorStop(1, `rgba(${col},0)`); x.save(); x.translate(rnd() * N, rnd() * N); x.fillStyle = g; x.fillRect(-r, -r, 2 * r, 2 * r); x.restore(); }
  for (let i = 0; i < 26000; i++) { x.fillStyle = ['#2e5440', '#36584e', '#22402e', '#40644e', '#2a4636'][i % 5]; x.globalAlpha = 0.35 + rnd() * 0.4; x.fillRect(rnd() * N, rnd() * N, 1 + rnd() * 3, 1 + rnd() * 3); }
  x.globalAlpha = 1;
  // yollar: her şehirden en yakın iki şehre kıvrımlı taş yol + rastgele patikalar
  const road = (ax, ay, bx, by, w) => {
    const mx = (ax + bx) / 2 + (rnd() - 0.5) * 60, my = (ay + by) / 2 + (rnd() - 0.5) * 60;
    for (const [col, ww] of [['rgba(18,22,20,.6)', w + 8], ['#6e6a5e', w], ['rgba(150,142,120,.55)', w * 0.4]]) { x.strokeStyle = col; x.lineWidth = ww; x.lineCap = 'round'; x.beginPath(); x.moveTo(ax * k, ay * k); x.quadraticCurveTo(mx * k, my * k, bx * k, by * k); x.stroke(); }
  };
  const pts = list.map((c) => [c.mapX, c.mapY]);
  for (let i = 0; i < 18; i++) pts.push([60 + rnd() * 880, 60 + rnd() * 880]);
  pts.forEach((p, i) => { pts.map((q, j) => [Math.hypot(q[0] - p[0], q[1] - p[1]), j]).filter((d) => d[1] !== i).sort((a, b) => a[0] - b[0]).slice(0, 2).forEach(([, j]) => { if (j > i) road(p[0], p[1], pts[j][0], pts[j][1], 9); }); });
  // göl kıyıları
  for (const l of lakes) { x.fillStyle = 'rgba(70,74,90,.9)'; x.beginPath(); x.ellipse(l.x * k, l.z * k, (l.r + 5) * k, (l.r * 0.7 + 5) * k, l.a, 0, 7); x.fill(); }
  // şehir meydanları
  for (const c of list) { const g = x.createRadialGradient(c.mapX * k, c.mapY * k, 0, c.mapX * k, c.mapY * k, 26 * k); g.addColorStop(0, 'rgba(90,86,96,.9)'); g.addColorStop(1, 'rgba(90,86,96,0)'); x.fillStyle = g; x.beginPath(); x.arc(c.mapX * k, c.mapY * k, 26 * k, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
let glowT = null;
function glowTex() { if (glowT) return glowT; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); glowT = new THREE.CanvasTexture(c); return glowT; }
const glow = (color, size, op = 0.9) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(size); return s; };

export function openWorldMap(opts = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1226);
  scene.fog = new THREE.Fog(0x0a1226, 380, 820);
  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 1, 1600);
  scene.add(new THREE.HemisphereLight(0xb0c0f0, 0x2a3424, 1.7));
  const moon = new THREE.DirectionalLight(0xc8d4ff, 1.9); moon.position.set(-160, 300, 120); scene.add(moon);
  scene.add(new THREE.AmbientLight(0x30406a, 0.6));

  const S = G.S, myServer = S.server || 1, server = opts.server || myServer, home = server === myServer;
  // şehirler
  const list = [];
  if (home) list.push({ id: 'me', me: true, name: S.name, th: G.thLevel(), power: G.cityPower(), mapX: S.mapX, mapY: S.mapY, shieldUntil: (S.pvpShield || 0) / 1000 });
  const bots = home ? S.enemies : (G.ONLINE.foreign = G.foreignBots(server));
  for (const e of bots) list.push(e);
  const realList = home ? G.ONLINE.enemies.filter((e) => (e.server || 1) === server) : G.ONLINE.enemies.filter((e) => e.server === server);
  for (const e of realList) list.push(e);

  let seed = server * 131 + 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const free = (x, z, r) => list.every((c) => Math.hypot(c.mapX - x, c.mapY - z) > r);
  // göller
  const lakes = []; for (let i = 0; i < 7; i++) { const l = { x: 80 + rnd() * 840, z: 80 + rnd() * 840, r: 18 + rnd() * 26, a: rnd() * 3 }; if (free(l.x, l.z, l.r + 26)) lakes.push(l); }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: nightGround(list, lakes, server * 977 + 3), roughness: 1 }));
  ground.position.set(500, 0, 500); scene.add(ground);
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x14222e, roughness: 1 })); outer.position.set(500, -0.4, 500); scene.add(outer);
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x1e4a7a, roughness: 0.15, metalness: 0.4, emissive: 0x0a2050, emissiveIntensity: 0.5 });
  for (const l of lakes) { const w = new THREE.Mesh(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), waterMat); w.scale.set(l.r, 1, l.r * 0.7); w.rotation.y = -l.a; w.position.set(l.x, 0.15, l.z); scene.add(w); const sh = glow(0x5a9aff, l.r * 0.9, 0.1); sh.position.set(l.x, 1, l.z); scene.add(sh); }
  // orman kümeleri (çam)
  for (let v = 0; v < 3; v++) {
    const ms = []; let tries = 0;
    while (ms.length < 800 && tries++ < 9000) {
      const cx = rnd() * 1000, cz = rnd() * 1000;
      for (let j = 0; j < 10 && ms.length < 800; j++) { const x = cx + (rnd() - 0.5) * 56, z = cz + (rnd() - 0.5) * 56; if (!free(x, z, 15) || lakes.some((l) => Math.hypot(l.x - x, l.z - z) < l.r + 4)) continue; const s = 1.2 + rnd() * 0.9; ms.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rnd() * 6.28, 0)), new THREE.Vector3(s, s * 1.15, s))); }
    }
    instancify(BLD.createTree(v === 2 ? 3 : v), ms, scene);
  }
  // kayalık uçurumlar ve dağlar
  const mts = ['mountain_A_grass_trees', 'mountain_B_grass_trees', 'mountain_C_grass_trees', 'hills_A_trees'];
  for (let i = 0; i < 18; i++) { const x = rnd() * 1000, z = rnd() * 1000; if (!free(x, z, 50)) continue; const m = A.model(mts[i % 4]); if (!m) continue; m.scale.setScalar(16 + rnd() * 14); m.position.set(x, -0.5, z); m.rotation.y = rnd() * 6; scene.add(m); }
  for (let i = 0; i < 40; i++) { const x = rnd() * 1000, z = rnd() * 1000; if (!free(x, z, 22)) continue; const r = BLD.createRock(3 + rnd() * 5); r.position.set(x, 0, z); r.rotation.y = rnd() * 6; scene.add(r); }
  // meşaleler, gözetleme kuleleri, harabeler, kristaller
  const flames = [];
  const torch = (x, z, h = 2.6, s = 1) => { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * s, 0.24 * s, h, 6), new THREE.MeshStandardMaterial({ color: 0x3a2a1a })); post.position.set(x, h / 2, z); scene.add(post); const f = glow(0xff9a30, 3.4 * s), c = glow(0xffe070, 1.4 * s, 1); f.position.set(x, h + 0.5, z); c.position.copy(f.position); scene.add(f, c); flames.push({ f, c, s, ph: rnd() * 6 }); };
  const KT = (n) => 'building_' + n + '_blue';
  for (let i = 0; i < 26; i++) {
    const x = 60 + rnd() * 880, z = 60 + rnd() * 880; if (!free(x, z, 30)) continue;
    const tn = rnd() < 0.5 ? KT('tower_A') : KT('tower_B'), m = A.tinted ? A.tinted(tn, 0x8a8aa0) : A.model(tn), ts = A.modelSize(tn); if (!m || !ts) continue;
    m.scale.setScalar(9 / Math.max(ts.x, ts.z)); m.position.set(x, 0, z); scene.add(m);
    const top = ts.y * 9 / Math.max(ts.x, ts.z); const f = glow(0xff8a20, 7), c = glow(0xffe080, 3, 1); f.position.set(x, top + 1.2, z); c.position.copy(f.position); scene.add(f, c); flames.push({ f, c, s: 2, ph: rnd() * 6 });
    const fl = A.model('flag_red'); if (fl) { fl.scale.setScalar(5); fl.position.set(x + 2, top - 1, z); scene.add(fl); }
    torch(x + 6, z + 5); torch(x - 6, z + 5);
  }
  for (let i = 0; i < 16; i++) {
    const x = 60 + rnd() * 880, z = 60 + rnd() * 880; if (!free(x, z, 28)) continue;
    const ws = A.modelSize('wall_straight'); if (!ws) break;
    for (let j = 0; j < 3; j++) { const w = A.tinted('wall_straight', 0x9a94a0); if (!w) break; w.scale.setScalar(7 / ws.x); const a = rnd() * 6; w.position.set(x + Math.cos(a) * 5, -rnd() * 1.5, z + Math.sin(a) * 5); w.rotation.y = a + 1.57; w.rotation.z = (rnd() - 0.5) * 0.3; scene.add(w); }
    torch(x, z, 1.6, 1.4);
  }
  const crysMat = new THREE.MeshStandardMaterial({ color: 0x6ab8ff, emissive: 0x2a7aff, emissiveIntensity: 1.6, roughness: 0.2 });
  for (let i = 0; i < 26; i++) { const x = rnd() * 1000, z = rnd() * 1000; if (!free(x, z, 18)) continue; for (let j = 0; j < 4; j++) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), crysMat); m.scale.set(0.9, 2.2 + rnd() * 2, 0.9); m.position.set(x + (rnd() - 0.5) * 4, 1.5, z + (rnd() - 0.5) * 4); m.rotation.set((rnd() - 0.5) * 0.5, rnd() * 3, (rnd() - 0.5) * 0.5); scene.add(m); } const g = glow(0x4a9aff, 14, 0.5); g.position.set(x, 3, z); scene.add(g); }
  for (let i = 0; i < 420; i++) { const x = rnd() * 1000, z = rnd() * 1000; if (!free(x, z, 14)) continue; torch(x, z); }
  for (const c of list) for (let j = 0; j < 4; j++) { const a = j / 4 * Math.PI * 2 + 0.4; torch(c.mapX + Math.cos(a) * 13.5, c.mapY + Math.sin(a) * 13.5, 2.2); }
  // bulutlar
  const clouds = [];
  for (let i = 0; i < 16; i++) { const c = A.model(i % 2 ? 'cloud_big' : 'cloud_small'); if (!c) continue; c.scale.setScalar(26 + rnd() * 20); c.position.set(rnd() * 1000, 70 + rnd() * 40, rnd() * 1000); c.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.35; o.material.color.setHex(0x3a4a7a); o.material.depthWrite = false; } }); scene.add(c); clouds.push(c); }

  // şehir nesneleri
  const hitMat = new THREE.MeshBasicMaterial({ visible: false }), hits = [];
  const ringGeo = new THREE.RingGeometry(8.5, 9.6, 48).rotateX(-Math.PI / 2);
  const shieldMat = new THREE.MeshStandardMaterial({ color: 0x7ac8ff, transparent: true, opacity: 0.22, emissive: 0x2a6aff, emissiveIntensity: 0.6, depthWrite: false, side: THREE.DoubleSide });
  const labels = $('wmLabels') || (() => { const d = document.createElement('div'); d.id = 'wmLabels'; document.body.appendChild(d); return d; })();
  labels.innerHTML = ''; labels.classList.remove('hidden');
  const makeCity = (c) => {
    const g = new THREE.Group(); g.position.set(c.mapX, 0, c.mapY); scene.add(g);
    const base = new THREE.Mesh(new THREE.CircleGeometry(9.4, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x4a4656, roughness: 1 })); base.position.y = 0.05; g.add(base);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(c.me ? 0xffd040 : c.real ? 0x4aa0ff : 0xff4a2a).multiplyScalar(1.6), transparent: true, opacity: 0.95 })); ring.position.y = 0.1; g.add(ring);
    const rg = glow(c.me ? 0xffc040 : c.real ? 0x3a8aff : 0xff4020, 26, 0.35); rg.position.y = 0.5; g.add(rg);
    const cm = cityModel(c.th || 1); if (c.me) cm.scale.multiplyScalar(1.25); g.add(cm);
    if (c.me) for (const sx of [-1, 1]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 12, 6), new THREE.MeshStandardMaterial({ color: 0xd8a830, metalness: 0.6, roughness: 0.4 })); pole.position.set(sx * 11, 6, 6); g.add(pole); const fl = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 5.4), new THREE.MeshStandardMaterial({ color: 0x2a4ab8, side: THREE.DoubleSide, emissive: 0x0a1a5a })); fl.position.set(sx * 11 + sx * 1.8, 9, 6); g.add(fl); const f = glow(0xffa040, 5); f.position.set(sx * 11, 12.6, 6); g.add(f); }
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 14, 10), hitMat); hit.position.y = 7; hit.userData.city = c; g.add(hit); hits.push(hit);
    let shield = null;
    if (c.shieldUntil > Date.now() / 1000) { shield = new THREE.Mesh(new THREE.SphereGeometry(12, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), shieldMat); g.add(shield); }
    const el = document.createElement('div'); el.className = 'wm-l' + (c.me ? ' me' : c.real ? ' real' : '');
    el.innerHTML = `<b>${c.th || 1}</b><span>${c.me ? 'Krallığım' : c.real ? '🌐 ' + c.name : c.name}</span>${shield ? '<i>🛡️</i>' : ''}`;
    labels.appendChild(el);
    return { c, g, el, shield };
  };
  const cities = list.map(makeCity);

  // seferler: yol çizgisi + yürüyen ordu
  const marchObjs = new Map();
  const dashMat = new THREE.LineDashedMaterial({ color: 0x4ad0ff, dashSize: 4, gapSize: 3, transparent: true, opacity: 0.95 });
  const syncMarches = () => {
    for (const [id, o] of marchObjs) if (!S.marches.find((m) => m.id === id)) { scene.remove(o.line, o.army); o.el.remove(); marchObjs.delete(id); }
    for (const m of S.marches) {
      if (marchObjs.has(m.id) || !home || m.foreign) continue;
      const a = new THREE.Vector3(S.mapX, 0.6, S.mapY), b = new THREE.Vector3(m.tx, 0.6, m.ty);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), dashMat); line.computeLineDistances(); scene.add(line);
      const army = new THREE.Group();
      for (let i = 0; i < 3; i++) { const u = createSoldier(i === 1 ? 'cavalry' : 'infantry', 'blue'); u.scale.setScalar(2.4); u.position.set((i - 1) * 2.2, 0, (i % 2) * -1.6); army.add(u); }
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), new THREE.MeshBasicMaterial({ color: 0x2a6ae0, side: THREE.DoubleSide })); flag.position.set(0, 7, 0); army.add(flag);
      scene.add(army);
      const el = document.createElement('div'); el.className = 'wm-m'; labels.appendChild(el);
      marchObjs.set(m.id, { line, army, el, a, b });
    }
  };
  syncMarches();

  // kamera ve kontroller
  const startC = opts.focus ? list.find((c) => c.id === opts.focus) : list.find((c) => c.me) || list[0];
  const cam = { tx: startC ? startC.mapX : 500, tz: startC ? startC.mapY : 500, h: 260, ht: 190 };
  const cv = C.renderer.domElement, pts = new Map(); let downAt = null, moved = 0, pinch0 = 0, h0 = 0;
  const pd = (e) => { if (e.target !== cv) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 1) { downAt = { x: e.clientX, y: e.clientY }; moved = 0; } if (pts.size === 2) { const [p1, p2] = [...pts.values()]; pinch0 = Math.hypot(p1.x - p2.x, p1.y - p2.y); h0 = cam.ht; } };
  const pm = (e) => {
    const p = pts.get(e.pointerId); if (!p) return;
    if (pts.size === 2) { p.x = e.clientX; p.y = e.clientY; const [p1, p2] = [...pts.values()]; const d = Math.hypot(p1.x - p2.x, p1.y - p2.y); cam.ht = clamp(h0 * pinch0 / Math.max(20, d), 70, 420); moved = 99; return; }
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
    const k = cam.h / innerHeight * 1.25; cam.tx = clamp(cam.tx - dx * k, 0, 1000); cam.tz = clamp(cam.tz - dy * k, 0, 1000);
  };
  const ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
  const pu = (e) => {
    if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId);
    if (pts.size === 0 && downAt && moved < 10) { v2.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(v2, camera); const hit = ray.intersectObjects(hits)[0]; if (hit) select(hit.object.userData.city); else { const gh = ray.intersectObject(ground)[0]; select(gh && home ? { ground: true, id: 'g', mapX: gh.point.x, mapY: gh.point.z } : null); } }
  };
  const wh = (e) => { cam.ht = clamp(cam.ht * (1 + Math.sign(e.deltaY) * 0.12), 70, 420); };
  cv.addEventListener('pointerdown', pd); addEventListener('pointermove', pm); addEventListener('pointerup', pu); addEventListener('pointercancel', pu); cv.addEventListener('wheel', wh, { passive: true });

  // arayüz
  let sel = null;
  const render = () => {
    const c = sel;
    let card = '';
    if (c && !c.me) {
      const t = G.marchTime(c, G.S.troops), sh = c.shieldUntil > Date.now() / 1000, mine = c.power, ratio = mine / Math.max(1, G.cityPower());
      const diff = ratio < 0.6 ? ['Kolay', '#7dff9a'] : ratio < 1 ? ['Orta', '#ffe68a'] : ratio < 1.5 ? ['Zor', '#ffaa6a'] : ['Çok zor', '#ff6a5a'];
      card = `<div class="wm-card"><div class="wm-ch"><b>${c.real ? '🌐 ' : ''}${c.name}</b><span>Belediye Sv.${c.th || 1}</span></div>
        <div class="wm-cs"><div><small>${c.real ? 'Gerçek oyuncu' : c.lord}</small><b>⚔ ${G.fmt(c.power)}</b><em style="color:${diff[1]}">${diff[0]}</em></div><div><small>Konum</small><b>X:${Math.round(c.mapX)} Y:${Math.round(c.mapY)}</b><em>⏱ ${fmtT(t)}</em></div></div>
        ${sh ? `<div class="why">🛡️ Kalkan aktif: ${G.fmtTime(c.shieldUntil - Date.now() / 1000)}</div>` : ''}
        <div class="wm-cb"><button class="btn gray" id="wmClose">Kapat</button><button class="btn red" id="wmAtk" ${sh ? 'disabled' : ''}>⚔ Saldır</button></div>
        ${home ? `<button class="btn blue wm-tp" id="wmTpNear">📍 Yanına ışınlan • 🪙 ${G.TELEPORT_COST}</button>` : ''}</div>`;
    } else if (c && c.ground) {
      const okSpot = G.spotFree(c.mapX, c.mapY);
      card = `<div class="wm-card"><div class="wm-ch"><b>📍 Boş alan</b><span>X:${Math.round(c.mapX)} Y:${Math.round(c.mapY)}</span></div>
        <p class="desc" style="margin:0 0 8px">${okSpot ? 'Şehrini buraya ışınlayabilirsin. Komşularına yakın ol, ittifak kur ya da saldırıya hazırlan!' : 'Burası başka bir şehre çok yakın, ışınlanamazsın.'}</p>
        <div class="wm-cb"><button class="btn gray" id="wmClose">Kapat</button><button class="btn blue" id="wmTpHere" ${okSpot ? '' : 'disabled'}>📍 Buraya ışınlan • 🪙 ${G.TELEPORT_COST}</button></div></div>`;
    } else if (c && c.me) card = `<div class="wm-card"><div class="wm-ch"><b>🏰 ${G.S.name}</b><span>Belediye Sv.${G.thLevel()}</span></div><div class="wm-cs"><div><small>Güç</small><b>⚔ ${G.fmt(G.cityPower())}</b></div><div><small>Konum</small><b>X:${G.S.mapX} Y:${G.S.mapY}</b></div></div><div class="wm-cb"><button class="btn gold" id="wmCity">🏰 Şehre gir</button></div></div>`;
    const marches = G.S.marches.map((m) => `<div class="wm-mr" data-mid="${m.id}"><span>${m.phase === 'go' ? '⚔' : '↩'} ${m.tname}</span><b data-mt="${m.id}">${fmtT(m.arrive - Date.now() / 1000)}</b>${m.phase === 'go' ? `<button data-recall="${m.id}">Geri çağır</button>` : ''}</div>`).join('');
    ov().innerHTML = `<div class="wm-top"><button class="wm-srv" id="wmSrv">🌐 Sunucu #${server}${home ? '' : ' (yabancı)'} ⇄</button><span class="wm-xy" id="wmXY"></span><button class="x" id="wmX">✕</button></div>
      ${home ? '' : '<div class="wm-war">⚔ Krallıklar arası savaş: bu sunucudaki krallıklara saldırabilirsin (yürüyüş uzun sürer).</div>'}
      <div class="wm-side"><button id="wmHome" title="Şehrim">🏰</button></div>
      <div class="wm-bottom">${marches ? `<div class="wm-ms">${marches}</div>` : ''}${card}</div>`;
    $('wmX').onclick = closeWorld; $('wmHome').onclick = () => { const me = list.find((q) => q.me); if (me) { cam.tx = me.mapX; cam.tz = me.mapY; } else closeWorld(); };
    $('wmSrv').onclick = () => { const next = server === myServer ? myServer + 1 : myServer; closeWorld(true); openWorldMap({ server: next }); C.toast(next === myServer ? '🏠 Kendi sunucuna döndün' : `🌐 Sunucu #${next} görüntüleniyor`); };
    if ($('wmClose')) $('wmClose').onclick = () => select(null);
    if ($('wmAtk')) $('wmAtk').onclick = () => C.onAttack(sel.id);
    const doTp = (x, y) => { const r = G.teleport(x, y); if (!r.ok) { C.toast(r.why, true); return; } C.sfx('reveal'); C.toast('📍 Şehrin ışınlandı!'); C.onTeleport?.(); closeWorld(); openWorldMap({}); };
    if ($('wmTpNear')) $('wmTpNear').onclick = () => { const sp = G.spotNear(sel.mapX, sel.mapY); if (!sp) return C.toast('Yakında boş yer yok', true); doTp(sp[0], sp[1]); };
    if ($('wmTpHere')) $('wmTpHere').onclick = () => doTp(sel.mapX, sel.mapY);
    if ($('wmCity')) $('wmCity').onclick = closeWorld;
    ov().querySelectorAll('[data-recall]').forEach((b) => (b.onclick = () => { G.recallMarch(b.dataset.recall); render(); }));
  };
  const select = (c) => { sel = c; if (c) C.sfx('click'); cities.forEach((o) => o.el.classList.toggle('sel', o.c === c)); render(); };
  W = { scene, render, select, syncMarches, cities, list, server, home };
  window.__wmSelect = select;
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


  const _v = new THREE.Vector3(); let lastUi = 0;
  const update = (dt, t) => {
    cam.h += (cam.ht - cam.h) * Math.min(1, dt * 6);
    for (const f of flames) { const q = 0.85 + Math.sin(t * 11 + f.ph) * 0.1 + Math.sin(t * 6.3 + f.ph) * 0.07; f.f.scale.setScalar(3.4 * f.s * q); }
    for (const c of clouds) { c.position.x += dt * 2; if (c.position.x > 1100) c.position.x = -100; }
    camera.position.set(cam.tx, cam.h, cam.tz + cam.h * 0.55); camera.lookAt(cam.tx, 0, cam.tz);
    // etiketler
    for (const o of cities) {
      const d = Math.hypot(o.c.mapX - cam.tx, o.c.mapY - cam.tz); o.g.visible = d < 480;
      if (!o.g.visible || cam.h > 340 && !o.c.me && !o.c.real) { o.el.style.display = 'none'; continue; }
      _v.set(o.c.mapX, 15, o.c.mapY).project(camera);
      if (_v.z > 1) { o.el.style.display = 'none'; continue; }
      o.el.style.display = ''; o.el.style.transform = `translate3d(${((_v.x + 1) / 2 * innerWidth).toFixed(0)}px,${((1 - _v.y) / 2 * innerHeight).toFixed(0)}px,0) translate(-50%,-100%)`;
      if (o.shield) o.shield.material.opacity = 0.18 + Math.sin(t * 2) * 0.06;
    }
    // seferler
    syncMarches();
    const now = Date.now() / 1000;
    for (const m of G.S.marches) {
      const o = marchObjs.get(m.id); if (!o) continue;
      const k = clamp((now - m.start) / Math.max(1, m.arrive - m.start), 0, 1), from = m.phase === 'go' ? o.a : o.b, to = m.phase === 'go' ? o.b : o.a;
      o.army.position.lerpVectors(from, to, k); o.army.position.y = 0; o.army.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
      o.army.children.forEach((u) => u.userData && animateUnit(u, 'run', t, dt));
      dashMat.dashOffset = -t * 6;
      _v.set(o.army.position.x, 9, o.army.position.z).project(camera);
      o.el.style.transform = `translate3d(${((_v.x + 1) / 2 * innerWidth).toFixed(0)}px,${((1 - _v.y) / 2 * innerHeight).toFixed(0)}px,0) translate(-50%,-100%)`;
      o.el.textContent = `${m.phase === 'go' ? '⚔' : '↩'} ${fmtT(m.arrive - now)}`;
    }
    if (performance.now() - lastFetch > 30000) fetchReal();
    if (t - lastUi > 0.5) {
      lastUi = t;
      const xy = $('wmXY'); if (xy) xy.textContent = `X:${Math.round(cam.tx)} Y:${Math.round(cam.tz)}`;
      ov().querySelectorAll('[data-mt]').forEach((el) => { const m = G.S.marches.find((q) => q.id === el.dataset.mt); if (m) el.textContent = fmtT(m.arrive - now); });
      if (ov().querySelectorAll('.wm-mr').length !== G.S.marches.length) render();
    }
  };
  const dispose = () => {
    cv.removeEventListener('pointerdown', pd); removeEventListener('pointermove', pm); removeEventListener('pointerup', pu); removeEventListener('pointercancel', pu); cv.removeEventListener('wheel', wh);
    labels.innerHTML = ''; labels.classList.add('hidden'); W = null;
  };
  openScene({ scene, camera, update, dispose }, 'city');
}
function closeWorld(keep) { if (!W) return; closeScene(); }
export function closeWorldMap() { closeWorld(); }
export function refreshWorldUI() { W?.render(); }
