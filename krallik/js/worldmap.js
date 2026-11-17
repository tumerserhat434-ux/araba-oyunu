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
export function openWorldMap(opts = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9cc4e8);
  scene.fog = new THREE.Fog(0x9cc4e8, 420, 900);
  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 1, 1400);
  scene.add(new THREE.HemisphereLight(0xdfeeff, 0x5a7a30, 1.5));
  const sun = new THREE.DirectionalLight(0xfff2dc, 2.2); sun.position.set(120, 260, 160); scene.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: grassTexture(), roughness: 1 }));
  ground.position.set(500, 0, 500); scene.add(ground);
  // harita kenarı: su
  const water = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3a7ab8, roughness: 0.2, metalness: 0.2 })); water.position.set(500, -0.6, 500); scene.add(water);

  const S = G.S, server = opts.server || S.server || 300, home = server === (S.server || 300);
  // şehirler
  const list = [];
  if (home) list.push({ id: 'me', me: true, name: S.name, th: G.thLevel(), power: G.cityPower(), mapX: S.mapX, mapY: S.mapY, shieldUntil: (S.pvpShield || 0) / 1000 });
  const bots = home ? S.enemies : (G.ONLINE.foreign = G.foreignBots(server));
  for (const e of bots) list.push(e);
  const realList = home ? G.ONLINE.enemies : G.ONLINE.enemies.filter((e) => e.server === server);
  for (const e of realList) list.push(e);

  // orman ve kayalar (şehirlerden uzak, tohumlu)
  let seed = server * 131; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const free = (x, z, r) => list.every((c) => Math.hypot(c.mapX - x, c.mapY - z) > r);
  for (let v = 0; v < 3; v++) {
    const ms = []; let tries = 0;
    while (ms.length < 260 && tries++ < 4000) {
      const cx = rnd() * 1000, cz = rnd() * 1000; // küme merkezi
      for (let j = 0; j < 6 && ms.length < 260; j++) { const x = cx + (rnd() - 0.5) * 40, z = cz + (rnd() - 0.5) * 40; if (!free(x, z, 13)) continue; const s = 1.3 + rnd() * 0.9; ms.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rnd() * 6.28, 0)), new THREE.Vector3(s, s, s))); }
    }
    instancify(BLD.createTree(v), ms, scene);
  }
  const mts = ['mountain_A_grass_trees', 'mountain_B_grass_trees', 'hills_A_trees', 'hills_B_trees'];
  for (let i = 0; i < 26; i++) { const x = rnd() * 1000, z = rnd() * 1000; if (!free(x, z, 45)) continue; const m = A.model(mts[i % 4]); if (!m) continue; m.scale.setScalar(18 + rnd() * 16); m.position.set(x, -0.5, z); m.rotation.y = rnd() * 6; scene.add(m); }

  // şehir nesneleri
  const hitMat = new THREE.MeshBasicMaterial({ visible: false }), hits = [];
  const ringGeo = new THREE.RingGeometry(8.5, 9.6, 48).rotateX(-Math.PI / 2);
  const shieldMat = new THREE.MeshStandardMaterial({ color: 0x7ac8ff, transparent: true, opacity: 0.22, emissive: 0x2a6aff, emissiveIntensity: 0.6, depthWrite: false, side: THREE.DoubleSide });
  const labels = $('wmLabels') || (() => { const d = document.createElement('div'); d.id = 'wmLabels'; document.body.appendChild(d); return d; })();
  labels.innerHTML = ''; labels.classList.remove('hidden');
  const cities = list.map((c) => {
    const g = new THREE.Group(); g.position.set(c.mapX, 0, c.mapY); scene.add(g);
    const base = new THREE.Mesh(new THREE.CircleGeometry(9.4, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 1 })); base.position.y = 0.05; g.add(base);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: c.me ? 0xffd040 : c.real ? 0x4aa0ff : 0xd04a3a, transparent: true, opacity: 0.9 })); ring.position.y = 0.1; g.add(ring);
    g.add(cityModel(c.th || 1));
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 14, 10), hitMat); hit.position.y = 7; hit.userData.city = c; g.add(hit); hits.push(hit);
    let shield = null;
    if (c.shieldUntil > Date.now() / 1000) { shield = new THREE.Mesh(new THREE.SphereGeometry(12, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), shieldMat); g.add(shield); }
    const el = document.createElement('div'); el.className = 'wm-l' + (c.me ? ' me' : c.real ? ' real' : '');
    el.innerHTML = `<b>${c.th || 1}</b><span>${c.me ? 'Krallığım' : c.real ? '🌐 ' + c.name : c.name}</span>${shield ? '<i>🛡️</i>' : ''}`;
    labels.appendChild(el);
    return { c, g, el, shield };
  });

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
  const cam = { tx: startC ? startC.mapX : 500, tz: startC ? startC.mapY : 500, h: 300, ht: 230 };
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
    if (pts.size === 0 && downAt && moved < 10) { v2.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(v2, camera); const hit = ray.intersectObjects(hits)[0]; select(hit ? hit.object.userData.city : null); }
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
        <div class="wm-cb"><button class="btn gray" id="wmClose">Kapat</button><button class="btn red" id="wmAtk" ${sh ? 'disabled' : ''}>⚔ Saldır</button></div></div>`;
    } else if (c && c.me) card = `<div class="wm-card"><div class="wm-ch"><b>🏰 ${G.S.name}</b><span>Belediye Sv.${G.thLevel()}</span></div><div class="wm-cs"><div><small>Güç</small><b>⚔ ${G.fmt(G.cityPower())}</b></div><div><small>Konum</small><b>X:${G.S.mapX} Y:${G.S.mapY}</b></div></div><div class="wm-cb"><button class="btn gold" id="wmCity">🏰 Şehre gir</button></div></div>`;
    const marches = G.S.marches.map((m) => `<div class="wm-mr" data-mid="${m.id}"><span>${m.phase === 'go' ? '⚔' : '↩'} ${m.tname}</span><b data-mt="${m.id}">${fmtT(m.arrive - Date.now() / 1000)}</b>${m.phase === 'go' ? `<button data-recall="${m.id}">Geri çağır</button>` : ''}</div>`).join('');
    ov().innerHTML = `<div class="wm-top"><button class="wm-srv" id="wmSrv">🌐 Sunucu #${server}${home ? '' : ' (yabancı)'} ⇄</button><span class="wm-xy" id="wmXY"></span><button class="x" id="wmX">✕</button></div>
      ${home ? '' : '<div class="wm-war">⚔ Krallıklar arası savaş: bu sunucudaki krallıklara saldırabilirsin (yürüyüş uzun sürer).</div>'}
      <div class="wm-side"><button id="wmHome" title="Şehrim">🏰</button></div>
      <div class="wm-bottom">${marches ? `<div class="wm-ms">${marches}</div>` : ''}${card}</div>`;
    $('wmX').onclick = closeWorld; $('wmHome').onclick = () => { const me = list.find((q) => q.me); if (me) { cam.tx = me.mapX; cam.tz = me.mapY; } else closeWorld(); };
    $('wmSrv').onclick = () => { const next = server === (G.S.server || 300) ? server + 1 : (G.S.server || 300); closeWorld(true); openWorldMap({ server: next }); C.toast(next === (G.S.server || 300) ? '🏠 Kendi sunucuna döndün' : `🌐 Sunucu #${next} görüntüleniyor`); };
    if ($('wmClose')) $('wmClose').onclick = () => select(null);
    if ($('wmAtk')) $('wmAtk').onclick = () => C.onAttack(sel.id);
    if ($('wmCity')) $('wmCity').onclick = closeWorld;
    ov().querySelectorAll('[data-recall]').forEach((b) => (b.onclick = () => { G.recallMarch(b.dataset.recall); render(); }));
  };
  const select = (c) => { sel = c; if (c) C.sfx('click'); cities.forEach((o) => o.el.classList.toggle('sel', o.c === c)); render(); };
  W = { scene, render, select, syncMarches, cities, list, server, home };
  window.__wmSelect = select;
  render();

  // canlı oyuncuları sonradan ekle
  if (C.online.ready) C.serverPlayers(server).then((ps) => {
    if (!W || W.scene !== scene) return;
    const known = new Set(list.map((c) => c.id));
    for (const p of ps) {
      const e = G.rivalToEnemy(p); e.server = p.server || 300; if (known.has(e.id)) continue;
      if (home) { if (!G.ONLINE.enemies.find((q) => q.id === e.id)) G.ONLINE.enemies.push(e); } else G.ONLINE.foreign.push(e);
      list.push(e);
      const g = new THREE.Group(); g.position.set(e.mapX, 0, e.mapY); scene.add(g);
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x4aa0ff })); ring.position.y = 0.1; g.add(ring); g.add(cityModel(e.th || 1));
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 14, 10), hitMat); hit.position.y = 7; hit.userData.city = e; g.add(hit); hits.push(hit);
      const el = document.createElement('div'); el.className = 'wm-l real'; el.innerHTML = `<b>${e.th || 1}</b><span>🌐 ${e.name}</span>`; labels.appendChild(el);
      cities.push({ c: e, g, el });
    }
  });

  const _v = new THREE.Vector3(); let lastUi = 0;
  const update = (dt, t) => {
    cam.h += (cam.ht - cam.h) * Math.min(1, dt * 6);
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
