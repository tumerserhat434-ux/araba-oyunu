// =====================================================================
//  DEMİR SANCAK — 3D katman sahneleri: savaş, çağırma, kahraman görüntüleyici
// =====================================================================
import * as THREE from 'three';
import * as BLD from './buildings.js?v=2611191911';
import * as A from './assets.js?v=2611191911';
import { createSoldier, createHero, animateUnit, playHeroMove } from './units.js?v=2611191911';
import { SPEEDUPS, TROOPS, HEROES, HERO_BY_ID, RARITY, SUMMON, heroBonus, heroLevelCost, heroAtk, heroDef, HERO_MAX_LEVEL, heroStars, nextStarCost, STAR_PATH } from './data.js?v=2611191911';
import * as G from './state.js?v=2611191911';
import { setTheme, playVoice } from './audio.js?v=2611191911';

let C = null; // main.js bağlamı
let active = null; // { scene, camera, update(dt,t), close() }
const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => t * t * (3 - 2 * t);
const stars = (n) => '★'.repeat(n);
// kahramanın yıldızları: altın yıldızlar, Yüce seviyede onların yerine parlayan Yüce yıldızlar
export const starsHtml = (h, ups = 0, sz = 18) => { const st = heroStars(h, ups); return st.asc ? `<span class="st-asc" style="--z:${sz}px">${'<img src="assets/ui/st_asc.webp?v=2611191911" alt="">'.repeat(st.asc)}</span>` : `<span class="st-gold" style="color:${RARITY[st.gold].color}">${stars(st.gold)}</span>`; };
const ov = () => $('overlay');

export function initScenes(ctx) { C = ctx; }
export { open as openScene, close as closeScene, ov as sceneOverlay };
export const sceneActive = () => !!active;
export function renderActive(dt, t) {
  if (!active) return false;
  active.update(dt, t);
  C.renderer.render(active.scene, active.camera);
  return true;
}
const HI_DPR = Math.min(devicePixelRatio || 1, 3);
function open(obj, theme = 'city') {
  setTheme(theme);
  if (obj.hiDpr) { C.renderer.setPixelRatio(HI_DPR); } else if (obj.dpr) { C.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, obj.dpr)); } else if (C.baseDpr) C.renderer.setPixelRatio(C.baseDpr);
  if (active) { active.dispose?.(); if (active.scene !== obj.scene) freeLater(active); }
  active = obj;
  document.body.dataset.scene = obj.world ? 'world' : theme;
  ['top', 'side', 'nav', 'labels', 'rside', 'bottomHud'].forEach((id) => $(id).classList.add('hidden'));
  ov().classList.remove('hidden');
  addEventListener('resize', onResize);
  onResize();
}
// Tek seferlik sahneleri (dünya haritası, savaş) kapanınca ekran kartı belleğinden sil.
// Paylaşılan model parçaları da silinebilir: three.js gerektiğinde yeniden yükler.
const TEX_KEYS = ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'alphaMap', 'bumpMap', 'lightMap', 'envMap'];
export function freeScene(scene) {
  const seen = new Set(), freeTex = (t) => { if (t && t.isTexture && !seen.has(t)) { seen.add(t); t.dispose(); } };
  scene.traverse((o) => {
    if (o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); }
    if (o.isInstancedMesh) o.dispose?.();
    if (o.isSkinnedMesh && o.skeleton && !seen.has(o.skeleton)) { seen.add(o.skeleton); o.skeleton.dispose(); }
    for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) { if (seen.has(m)) continue; seen.add(m); for (const k of TEX_KEYS) freeTex(m[k]); m.dispose(); }
  });
  if (scene.background?.isTexture) freeTex(scene.background);
  if (scene.environment?.isTexture) freeTex(scene.environment);
  scene.clear();
}
export const freeSkeletons = (obj) => { const seen = new Set(); obj?.traverse((o) => { if (o.isSkinnedMesh && o.skeleton && !seen.has(o.skeleton)) { seen.add(o.skeleton); o.skeleton.dispose(); } }); };
const freeLater = (o) => { if (o && o.freeOnClose) { const sc = o.scene; setTimeout(() => freeScene(sc), 0); } };
function close() {
  if (!active) return;
  freeLater(active);
  if (C.baseDpr) C.renderer.setPixelRatio(C.baseDpr);
  active.dispose?.();
  active = null;
  ov().classList.add('hidden'); ov().innerHTML = '';
  delete document.body.dataset.scene;
  ['top', 'side', 'nav', 'labels', 'rside', 'bottomHud'].forEach((id) => $(id).classList.remove('hidden'));
  removeEventListener('resize', onResize);
  setTheme('city');
  C.onSceneClosed();
}
function onResize() { if (active) { active.camera.aspect = innerWidth / innerHeight; active.camera.updateProjectionMatrix(); } }

function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
let glowTex = null;
function glow() {
  if (!glowTex) glowTex = canvasTex(128, 128, (ctx) => { const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128); }, false);
  return glowTex;
}
function sprite(color, scale, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity }));
  s.scale.setScalar(scale); return s;
}
function disposeScene(scene) {
  scene.traverse((o) => { if (o.isSprite) o.material.dispose(); });
}

// =====================================================================
//  SAVAŞ
// =====================================================================
let grassTex = null;
let dirtTex = null, fadeTex = null;
const battleBgs = new Map();
function battleBackground(path = 'assets/ui/bg_battle.webp?v=2611191911') {
  let t = battleBgs.get(path);
  if (!t) { t = new THREE.TextureLoader().load(path); t.colorSpace = THREE.SRGBColorSpace; battleBgs.set(path, t); }
  return t;
}
// Görev diyarlarının zemin dokuları (renk paletine göre)
const themeTex = new Map();
function themeGround(TH) {
  if (themeTex.has(TH.key)) return themeTex.get(TH.key);
  const g = canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = TH.grass[0]; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 7000; i++) { ctx.fillStyle = TH.grass[i % 5]; ctx.globalAlpha = rand(0.25, 0.8); ctx.fillRect(Math.random() * w, Math.random() * h, rand(1, 3), rand(2, 4)); }
    ctx.globalAlpha = 1;
  });
  g.repeat.set(26, 26);
  const d = canvasTex(1024, 1024, (ctx, w, h) => {
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.scale(1, 0.66);
    const gr = ctx.createRadialGradient(0, 0, w * 0.2, 0, 0, w * 0.5); gr.addColorStop(0, TH.dirt[0]); gr.addColorStop(0.8, TH.dirt[1]); gr.addColorStop(0.93, TH.dirt[2] + 'd8'); gr.addColorStop(1, TH.dirt[2] + '00');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, w * 0.5, 0, 7); ctx.fill(); ctx.restore();
    ctx.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < 9000; i++) { ctx.fillStyle = TH.dirt[i % 5]; ctx.globalAlpha = rand(0.15, 0.55); const r = rand(1, 4); ctx.fillRect(Math.random() * w, Math.random() * h, r, r); }
    for (let i = 0; i < 26; i++) { const x = Math.random() * w, y = Math.random() * h, r = rand(30, 90); const sg = ctx.createRadialGradient(x, y, 0, x, y, r); sg.addColorStop(0, 'rgba(20,14,10,.55)'); sg.addColorStop(1, 'rgba(20,14,10,0)'); ctx.fillStyle = sg; ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
    for (let i = 0; i < 50; i++) { ctx.strokeStyle = TH.dirt[4]; ctx.globalAlpha = 0.3; ctx.lineWidth = rand(2, 5); ctx.beginPath(); const x = Math.random() * w, y = Math.random() * h; ctx.moveTo(x, y); ctx.quadraticCurveTo(x + rand(-60, 60), y + rand(-20, 20), x + rand(-120, 120), y + rand(-30, 30)); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }, false);
  const o = { grass: g, dirt: d }; themeTex.set(TH.key, o); return o;
}
// arka plan resmini ekranın üst kısmına "cover" gibi yerleştir (ufuk çizgisi ≈ ekranın %70'i)
function fitBattleBg(tex) {
  const W = innerWidth, H = innerHeight, IA = 1344 / 752;
  const dispH = Math.max(H * 0.5, W / IA * 0.98), dispW = dispH * IA;
  tex.repeat.set(Math.min(1, W / dispW), H / dispH);
  tex.offset.set(Math.max(0, Math.min(1 - tex.repeat.x, 0.56 - tex.repeat.x / 2)), 1 - tex.repeat.y);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.needsUpdate = true;
}

// ---------------------------------------------------------------------
//  Görev savaş alanı süsleri: yanan enkaz, duman, sancaklar, çadırlar,
//  yere saplanmış mızraklar, kalkanlar ve diyara özel parçacıklar
// ---------------------------------------------------------------------
let scorchTex = null;
function warDecor(scene, TH, camSide, AX, AZ, braziers, redSign) {
  const put = (name, h, x, z, ry = 0, tint = null) => {
    const sz = A.modelSize(name), m = sz && A.model(name); if (!m) return null;
    m.scale.setScalar(h / Math.max(0.01, sz.y)); m.position.set(x, 0, z); m.rotation.y = ry;
    if (tint) m.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.multiply(new THREE.Color(tint)); } });
    scene.add(m); return m;
  };
  const far = (x) => !(Math.sign(x) === camSide && Math.abs(x) > AX * 0.45); // kameranın önünü kapatma
  // yanık izleri
  if (!scorchTex) scorchTex = canvasTex(128, 128, (ctx) => { const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(12,8,6,.85)'); g.addColorStop(0.6, 'rgba(20,14,10,.4)'); g.addColorStop(1, 'rgba(20,14,10,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128); }, false);
  const scMat = new THREE.MeshBasicMaterial({ map: scorchTex, transparent: true, depthWrite: false }), scGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(scGeo, scMat); const s = rand(2.5, 6); m.scale.set(s, 1, s * rand(0.6, 1)); m.position.set(rand(-AX, AX) * 0.8, 0.03, rand(-AZ, AZ) * 0.8); m.renderOrder = -1; scene.add(m); }
  // yanan enkaz yığınları + duman sütunları
  const smokes = [], smokeMat = () => new THREE.SpriteMaterial({ map: glow(), color: TH.fx === 'fog' ? 0x3a3048 : 0x2a2420, transparent: true, depthWrite: false, opacity: 0 });
  const firePile = (x, z, big) => {
    const k = big ? 1.4 : 1;
    put('crate_A_big', 0.9 * k, x - 0.5, z + 0.2, rand(0, 6), 0x3a3030); put('barrel', 0.8 * k, x + 0.5, z - 0.3, rand(0, 6), 0x4a3a30); put('crate_open', 0.6 * k, x, z - 0.6, rand(0, 6), 0x3a3030);
    const f1 = sprite(0xff7a20, 1.8, 0.95), f2 = sprite(0xffd060, 0.9, 1); f1.position.set(x, 1.1 * k, z); f2.position.set(x, 1.0 * k, z); scene.add(f1, f2);
    braziers.push({ f1, f2, ph: Math.random() * 6, k: 1.3 * k });
    const L = new THREE.PointLight(0xff8a30, 6 * k, 9, 2); L.position.set(x, 1.6, z); scene.add(L);
    for (let i = 0; i < 6; i++) { const s = new THREE.Sprite(smokeMat()); scene.add(s); smokes.push({ s, x, z, t: i / 6, sp: rand(0.18, 0.26), k }); }
  };
  const piles = [[0.5, 1], [-0.5, 1], [Math.PI - 0.6, 1], [Math.PI + 0.6, 1], [Math.PI / 2 + 0.25, 0], [-Math.PI / 2 - 0.25, 0]];
  for (const [a, big] of piles) { const ang = camSide > 0 ? Math.PI - a : a; const x = Math.cos(ang) * (AX + 2.5), z = Math.sin(ang) * (AZ + 2.5); if (!far(x)) continue; firePile(x, z, big); }
  // düşman kampı: çadırlar, sancaklar, silah rafları (düşmanın arkasında)
  const rx = redSign * (AX + 3.5);
  for (const z of [-9, 0, 9]) put('tent', 2.6, rx + redSign * rand(0, 2), z + rand(-1.5, 1.5), redSign > 0 ? -Math.PI / 2 : Math.PI / 2, TH.key === 'golge' ? 0x8a7aa0 : null);
  for (const z of [-13, -5, 5, 13]) put('flag_red', 3.4, redSign * (AX + 0.5), z, rand(-0.3, 0.3));
  put('weaponrack', 1.4, rx - redSign * 1.5, -4.5, redSign > 0 ? -Math.PI / 2 : Math.PI / 2); put('weaponrack', 1.4, rx - redSign * 1.5, 4.5, redSign > 0 ? -Math.PI / 2 : Math.PI / 2);
  // bizim sancaklar (kamera tarafında, yanlarda)
  for (const z of [-1, 1]) put('flag_blue', 3.4, -redSign * (AX - 2), z * (AZ + 1.5), 0);
  // dağınık sandık, çuval, kırık el arabası
  for (let i = 0; i < 10; i++) { const a = rand(0, 6.28), x = Math.cos(a) * (AX + rand(1, 6)), z = Math.sin(a) * (AZ + rand(1, 6)); if (!far(x)) continue; put(['crate_A_small', 'sack', 'barrel', 'crate_B_big', 'wheelbarrow'][i % 5], rand(0.5, 0.9), x, z, rand(0, 6), 0x8a7a6a); }
  // yere saplanmış mızraklar ve düşmüş kalkanlar
  const shaftGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 5), tipGeo = new THREE.ConeGeometry(0.09, 0.32, 5);
  const shaftMat = new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.9 }), tipMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.6, roughness: 0.4 });
  for (let i = 0; i < 22; i++) {
    const g = new THREE.Group(), sh = new THREE.Mesh(shaftGeo, shaftMat), tp = new THREE.Mesh(tipGeo, tipMat); sh.position.y = 1.1; tp.position.y = 2.3; g.add(sh, tp);
    const a = rand(0, 6.28), r = rand(0.7, 1.15); g.position.set(Math.cos(a) * AX * r, -0.3, Math.sin(a) * AZ * r); if (!far(g.position.x)) continue;
    g.rotation.set(rand(-0.5, 0.5), rand(0, 6), rand(-0.5, 0.5)); sh.castShadow = true; scene.add(g);
  }
  const shGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.08, 14), shMats = [0x8a2a20, 0x2a4a8a, 0x6a5a40].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, metalness: 0.2 }));
  for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(shGeo, shMats[i % 3]); const a = rand(0, 6.28), r = rand(0.75, 1.1); m.position.set(Math.cos(a) * AX * r, 0.06, Math.sin(a) * AZ * r); m.rotation.set(rand(-0.25, 0.25), 0, rand(-0.25, 0.25)); scene.add(m); }
  // kayalar ve ağaçlar
  for (let i = 0; i < 18; i++) { const a = rand(0, 6.28); const rk = BLD.createRock(rand(0.4, 1.2)); rk.position.set(Math.cos(a) * (AX + rand(3, 9)), 0, Math.sin(a) * (AZ + rand(3, 9))); if (!far(rk.position.x)) continue; scene.add(rk); }
  if (TH.trees) for (let i = 0; i < 18; i++) { const side = i % 2 ? 1 : -1, x = rand(-AX - 10, AX + 4), z = side * rand(AZ + 7, AZ + 22); const t = BLD.createTree(Math.floor(Math.random() * 4)); t.position.set(x, 0, z); t.rotation.y = rand(0, 6); t.scale.setScalar(rand(0.9, 1.3)); scene.add(t); }
  // diyar parçacıkları (kar, kor, toz, sis)
  let pts = null, vel = null; const N = TH.fx === 'snow' ? 260 : TH.fx === 'embers' ? 140 : TH.fx === 'dust' ? 90 : TH.fx === 'fog' ? 0 : 60;
  if (N) {
    const pos = new Float32Array(N * 3); vel = new Float32Array(N);
    for (let i = 0; i < N; i++) { pos[i * 3] = rand(-AX - 8, AX + 8); pos[i * 3 + 1] = rand(0, 14); pos[i * 3 + 2] = rand(-AZ - 8, AZ + 8); vel[i] = rand(0.6, 1.4); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const col = { snow: 0xffffff, embers: 0xff8a30, dust: 0xe8b878, smoke: 0xffb060 }[TH.fx];
    const mat = new THREE.PointsMaterial({ map: glow(), color: col, size: TH.fx === 'snow' ? 0.32 : TH.fx === 'dust' ? 0.5 : 0.22, transparent: true, depthWrite: false, opacity: TH.fx === 'dust' ? 0.45 : 0.95, blending: TH.fx === 'snow' || TH.fx === 'dust' ? THREE.NormalBlending : THREE.AdditiveBlending });
    pts = new THREE.Points(geo, mat); scene.add(pts);
  }
  const fogs = [];
  if (TH.fx === 'fog') for (let i = 0; i < 16; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color: i % 2 ? 0x6aff9a : 0xa070ff, transparent: true, depthWrite: false, opacity: 0.12 })); s.position.set(rand(-AX - 6, AX + 6), rand(0.4, 1.4), rand(-AZ - 4, AZ + 4)); s.scale.set(rand(9, 16), rand(2.5, 4), 1); scene.add(s); fogs.push({ s, v: rand(-0.6, 0.6) }); }
  return (dt, t) => {
    for (const m of smokes) {
      m.t += dt * m.sp; if (m.t > 1) m.t -= 1;
      m.s.position.set(m.x + Math.sin(m.t * 5 + m.x) * 0.6 + m.t * 1.5, 1.6 + m.t * 9 * m.k, m.z);
      m.s.scale.setScalar((1.6 + m.t * 5) * m.k); m.s.material.opacity = Math.sin(m.t * Math.PI) * 0.55;
    }
    if (pts) {
      const p = pts.geometry.attributes.position.array;
      for (let i = 0; i < N; i++) {
        const j = i * 3;
        if (TH.fx === 'snow') { p[j + 1] -= vel[i] * 2.2 * dt; p[j] += Math.sin(t + i) * 0.4 * dt; if (p[j + 1] < 0) p[j + 1] = 14; }
        else if (TH.fx === 'dust') { p[j] += vel[i] * 3 * dt; p[j + 1] = 0.5 + Math.abs(Math.sin(t * 0.5 + i)) * 2.5; if (p[j] > AX + 8) p[j] = -AX - 8; }
        else { p[j + 1] += vel[i] * 1.6 * dt; p[j] += Math.sin(t * 2 + i) * 0.5 * dt; if (p[j + 1] > 14) p[j + 1] = 0; }
      }
      pts.geometry.attributes.position.needsUpdate = true;
    }
    for (const f of fogs) { f.s.position.x += f.v * dt; if (f.s.position.x > AX + 8) f.s.position.x = -AX - 8; if (f.s.position.x < -AX - 8) f.s.position.x = AX + 8; f.s.material.opacity = 0.1 + Math.sin(t * 0.7 + f.v * 9) * 0.04; }
  };
}
const RES_IMG = (r, sz = 22) => `<img src="assets/ui/res_${r}.webp?v=2611191911" width="${sz}" height="${sz}" alt="">`;
export function rewardsHtml(rew) {
  if (!rew) return '';
  const res = Object.entries(rew.res).filter(([, v]) => v > 0).map(([r, v]) => `<span class="rw">${RES_IMG(r)}<b>${G.fmt(v)}</b></span>`).join('');
  const it = (rew.items || []).map((x) => `<span class="rw"><img src="assets/ui/sp_t${SPEEDUPS[x.id].tier}.webp?v=2611191911" width="22" height="22" alt=""><b>${SPEEDUPS[x.id].short} ×${x.n}</b></span>`).join('');
  return res + it;
}
function campResultHtml(r, win, tot) {
  return `<div class="modal-box cp-result ${win ? 'win' : 'lose'}">
    ${win ? '<img class="cp-chest" src="assets/ui/ic_chest.webp?v=2611191911" alt="">' : ''}<h2 class="cinzel">${win ? 'ZAFER!' : 'YENİLGİ'}</h2>
    <div class="stats">
      <div class="stat"><small>Kayıpların</small><b>0</b><br><small>Görev savaşında asker ölmez</small></div>
      <div class="stat"><small>Düşman kaybı</small><b>${tot(r.dLoss)}</b></div>
    </div>
    ${win ? `<div class="cp-rw-h">Ödüller</div><div class="cp-rws">${rewardsHtml({ res: r.loot, items: r.items })}</div>` : '<p class="desc" style="text-align:center;margin:4px 0 10px">Ordun yeterince güçlü değil. Asker eğit, kahramanlarını ve binalarını yükselt, sonra tekrar dene.</p>'}
    <button class="btn gold" style="width:100%" id="bBack">${win ? '🚩 Devam' : '↩ Görevlere dön'}</button></div>`;
}
export function openBattle(opts) {
  const scene = new THREE.Scene();
  const TH = opts.theme || null; // görev diyarı (yoksa klasik arena)
  const soft = (c, k = 0.45) => new THREE.Color(c).lerp(new THREE.Color(0xffffff), k); // askerler diyar rengine boğulmasın
  const bg = battleBackground(TH ? TH.bg : undefined); fitBattleBg(bg); scene.background = bg;
  scene.environment = TH ? C.makeEnv(TH.sky, TH.sun, TH.ground, false) : C.makeEnv(0x8ab8ff, 0xd8e8ff, 0x4a6a2a, false);
  scene.environmentIntensity = 0.6;
  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.5, 400);
  const sun = new THREE.DirectionalLight(TH ? soft(TH.sun) : 0xfff0d8, 2.6); sun.position.set(18, 40, 26); sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 5, far: 120 }); sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005;
  scene.add(sun, TH ? new THREE.HemisphereLight(soft(TH.sky, 0.55), soft(TH.ground, 0.3), 1.25) : new THREE.HemisphereLight(0xbfdcff, 0x5a7a30, 1.25));
  // zemin: kenarları saydamlaşan çim + ortada oval toprak arena
  if (!grassTex) {
    grassTex = canvasTex(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#6aa23a'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 7000; i++) { ctx.fillStyle = ['#5a9230', '#82bc4a', '#6aa836', '#9acc5a', '#5a8a2a'][i % 5]; ctx.globalAlpha = rand(0.25, 0.8); ctx.fillRect(Math.random() * w, Math.random() * h, rand(1, 3), rand(2, 4)); }
      ctx.globalAlpha = 1;
    });
    grassTex.repeat.set(26, 26);
  }
  if (!dirtTex) {
    dirtTex = canvasTex(1024, 1024, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.save(); ctx.translate(w / 2, h / 2); ctx.scale(1, 0.66);
      const g = ctx.createRadialGradient(0, 0, w * 0.2, 0, 0, w * 0.5); g.addColorStop(0, '#c8955a'); g.addColorStop(0.8, '#b07d48'); g.addColorStop(0.93, 'rgba(150,110,60,.85)'); g.addColorStop(1, 'rgba(120,100,50,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, w * 0.5, 0, 7); ctx.fill(); ctx.restore();
      ctx.globalCompositeOperation = 'source-atop';
      for (let i = 0; i < 9000; i++) { ctx.fillStyle = ['#9a6a3a', '#d8aa70', '#a87848', '#e0b880', '#7a5a34'][i % 5]; ctx.globalAlpha = rand(0.15, 0.55); const r = rand(1, 4); ctx.fillRect(Math.random() * w, Math.random() * h, r, r); }
      for (let i = 0; i < 70; i++) { ctx.fillStyle = '#8a8a80'; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.ellipse(Math.random() * w, Math.random() * h, rand(3, 7), rand(2, 4), rand(0, 3), 0, 7); ctx.fill(); }
      for (let i = 0; i < 40; i++) { ctx.strokeStyle = '#8a6034'; ctx.globalAlpha = 0.25; ctx.lineWidth = rand(2, 5); ctx.beginPath(); const x = Math.random() * w, y = Math.random() * h; ctx.moveTo(x, y); ctx.quadraticCurveTo(x + rand(-60, 60), y + rand(-20, 20), x + rand(-120, 120), y + rand(-30, 30)); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }, false);
    dirtTex.colorSpace = THREE.SRGBColorSpace;
    fadeTex = canvasTex(256, 256, (ctx, w, h) => { const g = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.5); g.addColorStop(0, '#fff'); g.addColorStop(1, '#000'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }, false);
    fadeTex.colorSpace = THREE.NoColorSpace;
  }
  const TG = TH ? themeGround(TH) : null;
  const ground = new THREE.Mesh(new THREE.CircleGeometry(48, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: TG ? TG.grass : grassTex, alphaMap: fadeTex, transparent: true, depthWrite: false, roughness: 1 }));
  ground.receiveShadow = true; ground.renderOrder = -2; scene.add(ground);
  const AX = 23, AZ = 15; // arena yarıçapları (x: iki ordu ekseni)
  const dirt = new THREE.Mesh(new THREE.PlaneGeometry(AX * 2.25, AX * 2.25).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: TG ? TG.dirt : dirtTex, transparent: true, depthWrite: false, roughness: 1 }));
  dirt.scale.z = AZ / AX; if (TH) dirt.scale.multiplyScalar(1.3); dirt.position.y = 0.02; dirt.receiveShadow = true; dirt.renderOrder = -1; scene.add(dirt);
  // çit, mangallar, kuleler (kameranın olduğu yakın kenar boş bırakılır)
  const camSide = opts.mode === 'attack' ? -1 : 1; // mavi tarafın işareti
  const fireMat = new THREE.MeshStandardMaterial({ color: 0x6a6a72, roughness: 0.8 }), rimMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.7, metalness: 0.3 });
  const braziers = [];
  let warTick = null;
  if (TH) warTick = warDecor(scene, TH, camSide, AX, AZ, braziers, opts.mode === 'attack' ? 1 : -1);
  const fenceLen = !TH && A.modelSize('fence_wood_straight');
  const nF = 34;
  for (let i = 0; i < nF; i++) {
    const a0 = (i / nF) * Math.PI * 2, a1 = ((i + 1) / nF) * Math.PI * 2;
    const x0 = Math.cos(a0) * (AX + 1.6), z0 = Math.sin(a0) * (AZ + 1.6), x1 = Math.cos(a1) * (AX + 1.6), z1 = Math.sin(a1) * (AZ + 1.6);
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    if (Math.sign(mx) === camSide && Math.abs(mx) > AX * 0.35) continue; // kamera tarafı açık
    const len = Math.hypot(x1 - x0, z1 - z0);
    const f = fenceLen && A.model('fence_wood_straight');
    if (f) { f.scale.setScalar(len / Math.max(fenceLen.x, fenceLen.z) * 1.04); f.position.set(mx, 0, mz); f.rotation.y = -Math.atan2(z1 - z0, x1 - x0) + (fenceLen.z > fenceLen.x ? Math.PI / 2 : 0); scene.add(f); }
  }
  const brazierAt = (x, z) => {
    const b = new THREE.Group(); b.position.set(x, 0, z);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 1.1, 10), fireMat); base.position.y = 0.55; base.castShadow = true; b.add(base);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.55, 0.45, 12), rimMat); bowl.position.y = 1.3; b.add(bowl);
    const f1 = sprite(0xff8a20, 1.8, 0.95), f2 = sprite(0xffe070, 0.9, 1); f1.position.y = f2.position.y = 1.9; b.add(f1, f2);
    scene.add(b); braziers.push({ f1, f2, ph: Math.random() * 6 });
  };
  if (!TH) for (const [a, k] of [[0.42, 1], [-0.42, 1], [Math.PI - 0.55, 1], [Math.PI + 0.55, 1], [Math.PI / 2, 1], [-Math.PI / 2, 1]]) {
    const ang = camSide > 0 ? Math.PI - a : a; // yakın taraftaki iki mangal kameraya göre ayarlanır
    const x = Math.cos(ang) * (AX + 3) * k, z = Math.sin(ang) * (AZ + 3) * k;
    if (Math.sign(x) === camSide && Math.abs(x) > AX * 0.5) continue;
    brazierAt(x, z);
  }
  if (!TH) for (const z of [-1, 1]) { // uzak köşelerde süs kuleleri
    const tw = BLD.createBuilding('archery', 3); tw.position.set(-camSide * (AX + 2), 0, z * (AZ + 5)); tw.rotation.y = camSide * Math.PI / 2; scene.add(tw);
  }
  if (!TH) for (let i = 0; i < 26; i++) { // yanlarda ağaçlar
    const side = i % 2 ? 1 : -1, x = rand(-AX - 10, AX + 4) * 1, z = side * rand(AZ + 6, AZ + 22);
    const t = BLD.createTree(Math.floor(Math.random() * 4)); t.position.set(x, 0, z); t.rotation.y = rand(0, 6); t.scale.setScalar(rand(0.9, 1.3)); scene.add(t);
  }
  if (!TH) for (let i = 0; i < 16; i++) { const a = Math.random() * 6.28; const rk = BLD.createRock(rand(0.4, 1.1)); rk.position.set(Math.cos(a) * (AX + rand(3, 7)), 0, Math.sin(a) * (AZ + rand(3, 7))); if (Math.sign(rk.position.x) === camSide && Math.abs(rk.position.x) > AX * 0.6) continue; scene.add(rk); }

  // tarafları belirle: oyuncu her zaman mavi
  const blueIsAtt = opts.mode === 'attack';
  const sides = {
    blue: { troops: blueIsAtt ? opts.attacker.troops : opts.defender.troops, sign: blueIsAtt ? -1 : 1, remain: blueIsAtt ? opts.result.aRemainRatio : opts.result.dRemainRatio },
    red: { troops: blueIsAtt ? opts.defender.troops : opts.attacker.troops, sign: blueIsAtt ? 1 : -1, remain: blueIsAtt ? opts.result.dRemainRatio : opts.result.aRemainRatio },
  };
  const defenderTeam = blueIsAtt ? 'red' : 'blue';
  const towerLvl = Math.round(opts.defender.tower || 0);
  const towers = [];
  if (towerLvl > 0) {
    for (const z of [-7, 7]) {
      const tw = BLD.createBuilding('archery', clamp(towerLvl, 1, 10)); tw.position.set(sides[defenderTeam].sign * 20, 0, z); tw.rotation.y = -sides[defenderTeam].sign * Math.PI / 2; scene.add(tw);
      towers.push({ obj: tw, top: new THREE.Vector3(tw.position.x, (tw.userData.topY || 8) + 1.5, z), cd: rand(0.5, 1.5) });
    }
  }
  if (!blueIsAtt) { // kendi surlarımız arkada
    const w = BLD.createWall(30, Math.max(1, G.thLevel())); w.position.set(24, 0, 0); w.rotation.y = Math.PI / 2; scene.add(w);
  }

  // birimler
  const teamRingGeo = new THREE.RingGeometry(0.42, 0.56, 24);
  const teamRingBlue = new THREE.MeshBasicMaterial({ color: 0x3a8aff, transparent: true, opacity: 0.85, depthWrite: false });
  const teamRingRed = new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.85, depthWrite: false });
  const units = [];
  const MAXU = 24;
  for (const team of ['blue', 'red']) {
    const s = sides[team], tot = G.totalTroops(s.troops) || 1, W = (t) => (t === 'tank' ? 8 : 1);
    const wtot = Object.entries(s.troops).reduce((a, [t, n]) => a + n * W(t), 0) || 1;
    const N = clamp(Math.round(Math.sqrt(tot) * 1.6), 4, MAXU);
    const counts = {}; let used = 0;
    for (const t in s.troops) { counts[t] = s.troops[t] > 0 ? Math.min(t === 'tank' ? Math.min(8, s.troops[t]) : 99, Math.max(1, Math.round(N * s.troops[t] * W(t) / wtot))) : 0; used += counts[t]; }
    let row = 0;
    for (const t of ['infantry', 'spearman', 'cavalry', 'tank', 'archer']) {
      for (let i = 0; i < counts[t]; i++) {
        let x, z;
        const col = i % 6, r = Math.floor(i / 6);
        const push = counts.tank ? 3.2 : 0;
        if (t === 'archer') { x = s.sign * (15 + push + r * 1.6); z = (col - 2.5) * 2.0; }
        else if (t === 'tank') { x = s.sign * (8 + Math.floor(i / 4) * 3.2); const nr = Math.min(4, counts.tank - Math.floor(i / 4) * 4); z = ((i % 4) - (nr - 1) / 2) * 3.6; }
        else if (t === 'cavalry') { const side = i % 2 ? 1 : -1; x = s.sign * (11 + push + Math.floor(i / 2) % 2 * 2.5); z = side * (8 + Math.floor(i / 4) * 2.6); }
        else { x = s.sign * (9 + push + (row + r) * 1.6); z = (col - 2.5) * 1.9; }
        const o = createSoldier(t, team);
        const ring = new THREE.Mesh(teamRingGeo, team === 'blue' ? teamRingBlue : teamRingRed); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; ring.scale.setScalar(t === 'tank' ? 2.6 : t === 'cavalry' ? 1.5 : 1); o.add(ring);
        o.position.set(x + rand(-0.3, 0.3), 0, z + rand(-0.3, 0.3));
        o.rotation.y = -s.sign * Math.PI / 2;
        scene.add(o);
        units.push({ obj: o, team, type: t, alive: true, state: 'idle', phase: rand(0, 5), target: null, cd: rand(0.3, 1.5), ranged: t === 'archer' || t === 'tank' });
      }
      if (t === 'infantry' && counts[t]) row += Math.ceil(counts[t] / 6);
    }
  }
  const N0 = { blue: units.filter((u) => u.team === 'blue').length, red: units.filter((u) => u.team === 'red').length };
  const T0 = { blue: G.totalTroops(sides.blue.troops), red: G.totalTroops(sides.red.troops) };

  // oklar
  const arrows = [];
  const arrowGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.9, 4).rotateX(Math.PI / 2);
  const arrowMat = new THREE.MeshStandardMaterial({ color: 0x5a4028 });
  const shoot = (from, toObj) => {
    const m = new THREE.Mesh(arrowGeo, arrowMat); scene.add(m);
    const to = toObj.position.clone(); to.y = 1.1;
    arrows.push({ m, from: from.clone(), to, t: 0, d: 0.7 + from.distanceTo(to) * 0.02 });
  };
  // top gülleleri ve patlamalar
  const balls = [], booms = [];
  const ballGeo = new THREE.SphereGeometry(0.22, 10, 8), ballMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, metalness: 0.6, roughness: 0.4 });
  const cannon = (from, toObj) => {
    const m = new THREE.Mesh(ballGeo, ballMat); scene.add(m);
    const to = toObj.position.clone(); to.y = 0.5;
    balls.push({ m, from: from.clone(), to, t: 0, d: 0.55 + from.distanceTo(to) * 0.025 });
    const fl = sprite(0xffc060, 2.2, 1); fl.position.copy(from); scene.add(fl); booms.push({ s: fl, life: 0.18, max: 0.18, sc: 2.2 });
    if (Math.random() < 0.6) C.sfx('clash');
  };
  const boom = (p) => { for (const [c, sc, l] of [[0xff9a30, 4.5, 0.45], [0xffe090, 2.2, 0.3], [0x3a3030, 5, 0.9]]) { const s = sprite(c, sc, 1); if (c === 0x3a3030) s.material.blending = THREE.NormalBlending; s.position.set(p.x, 0.9, p.z); scene.add(s); booms.push({ s, life: l, max: l, sc }); } };
  // toz/kıvılcım
  const sparks = [];
  for (let i = 0; i < 24; i++) { const s = sprite(0xffd890, 0.5, 0); scene.add(s); sparks.push({ s, life: 0 }); }
  const spark = (p) => { const f = sparks.find((q) => q.life <= 0); if (!f) return; f.s.position.copy(p); f.s.position.y = 1.2; f.life = 0.25; };

  // arayüz
  const win = opts.mode === 'attack' ? opts.result.win : !opts.result.win;
  const myHero = opts.mode === 'attack' ? opts.attacker.hero : opts.defender.hero;
  const pw = (tr, team) => G.fmt(opts.powers ? opts.powers[team] : G.armyPower(tr || {}));
  const camp = opts.report?.kind === 'campaign';
  ov().innerHTML = `<div class="bt-top">
      <div class="bt-side blue"><img class="bt-ava" src="assets/heroes/${myHero || G.S.commander || 'emre'}_a.webp?v=2611191911" alt=""><div><b>${G.S.name}</b><span>⚔ ${pw(sides.blue.troops, 'blue')}</span></div></div>
      <div class="bt-vs"><span>⚔</span></div>
      <div class="bt-side red"><div><b>${opts.title}</b><span>⚔ ${pw(sides.red.troops, 'red')}</span></div><img class="bt-ava${opts.enemyAva ? ' own' : ''}" src="${opts.enemyAva || 'assets/heroes/oguz_a.webp?v=2611191911'}" alt=""></div>
    </div>
    <div class="bt-plaque">${opts.plaque || (opts.mode === 'attack' ? 'Savaş Alanı' : 'Şehir Savunması')}</div>
    <div class="ov-bottom bt-bottom" id="bHud">
      <div class="bt-ctrl" id="bCtrl"><div class="bt-units"><i>👥</i><div><small>Birlikler</small><b>${G.fmt(T0.blue)}</b></div></div>
        <button class="bt-start" id="bStart"><i>⚔</i><span>Savaşı Başlat</span></button>
        <button class="bt-skip" id="bSkip" title="Geç"><i>⏭</i><span>Geç</span></button></div>
      <div class="bt-bars hidden" id="bBars">
        <div class="armybar blue"><span>🔵 <b id="bBlue">${T0.blue}</b></span><div class="hp"><span id="bBlueHp" style="width:100%"></span></div></div>
        <div class="armybar red"><span>🔴 <b id="bRed">${T0.red}</b></span><div class="hp"><span id="bRedHp" style="width:100%"></span></div></div>
      </div>
    </div>`;
  let T = 0, done = false, started = false;
  const finish = () => {
    if (done) return; done = true;
    C.sfx(win ? 'win' : 'lose');
    const r = opts.report, tot = (o) => G.fmt(G.totalTroops(o || {}));
    const loot = r.loot || {};
    if (camp) { $('bHud').innerHTML = campResultHtml(r, win, tot); $('bBack').onclick = () => { close(); opts.onClose?.(); }; return; }
    $('bHud').innerHTML = `<div class="modal-box" style="max-width:none;animation:pop .3s">
      <h2 class="cinzel" style="margin:0 0 6px;text-align:center;font-size:30px;color:${win ? 'var(--gold)' : '#ff7a6a'}">${win ? 'ZAFER!' : 'YENİLGİ'}</h2>
      <div class="stats">
        <div class="stat"><small>Kayıpların</small><b>${tot(r.aLoss)}</b><br><small>🤕 ${tot(r.wounded)} yaralı • 💀 ${tot(r.dead)} ölü</small></div>
        <div class="stat"><small>Düşman kaybı</small><b>${tot(r.dLoss)}</b></div>
      </div>
      ${r.kind === 'attack' && win ? `<div class="cost" style="justify-content:center">🌾 ${G.fmt(loot.food || 0)} 🪵 ${G.fmt(loot.wood || 0)} 🪨 ${G.fmt(loot.stone || 0)} 🪙 ${loot.gold || 0}</div>` : ''}
      ${r.kind === 'defense' && !win ? `<div class="why" style="text-align:center">Yağmalanan: 🌾 ${G.fmt(loot.food || 0)} 🪵 ${G.fmt(loot.wood || 0)} 🪨 ${G.fmt(loot.stone || 0)}</div>` : ''}
      ${G.totalTroops(r.wounded) ? '<p class="desc" style="text-align:center;margin:4px 0 8px">Yaralılar hastanede. İyileştirmeyi unutma!</p>' : ''}
      <button class="btn gold" style="width:100%" id="bBack">🏰 Şehre dön</button></div>`;
    $('bBack').onclick = close;
  };
  const begin = () => { if (started) return; started = true; C.sfx('horn'); $('bCtrl')?.classList.add('hidden'); $('bBars')?.classList.remove('hidden'); };
  $('bStart').onclick = begin;
  $('bSkip').onclick = () => { begin(); T = 11; };
  const autoStart = setTimeout(begin, 9000); // dokunulmazsa kendiliğinden başlar

  const camAng = { a: 0 };
  let lastW = 0, lastH = 0;
  const update = (dt, t) => {
    if (started) T += dt;
    if (innerWidth !== lastW || innerHeight !== lastH) { lastW = innerWidth; lastH = innerHeight; fitBattleBg(bg); }
    camAng.a += dt * 0.05;
    const ca = Math.sin(camAng.a) * 0.12, bs = sides.blue.sign;
    const portrait = innerWidth < innerHeight;
    const cd = portrait ? 31 : 25, ch = portrait ? 15 : 13;
    camera.position.set(bs * cd, ch, Math.sin(ca) * 4);
    camera.lookAt(-bs * (portrait ? 7 : 4), 0, Math.sin(ca) * 1.5);
    if (warTick) warTick(dt, t, camera);
    for (const b of braziers) { const q = 0.85 + Math.sin(t * 13 + b.ph) * 0.1 + Math.sin(t * 7.3 + b.ph) * 0.08; const k = b.k || 1; b.f1.scale.set(1.5 * q * k, 2.1 * q * k, 1); b.f2.scale.setScalar(0.85 * q * k); }
    const p = clamp((T - 2.6) / 7, 0, 1), ep = ease(p);
    // ölüm kontrolü
    for (const team of ['blue', 'red']) {
      const want = Math.round(N0[team] * lerp(1, sides[team].remain, ep));
      let alive = units.filter((u) => u.team === team && u.alive);
      while (alive.length > want && T > 2.6) {
        const engaged = alive.filter((u) => u.state === 'attack');
        const pool = engaged.length ? engaged : alive;
        const u = pool[Math.floor(Math.random() * pool.length)];
        u.alive = false; u.state = 'die';
        alive = alive.filter((v) => v !== u);
      }
      const shown = Math.round(lerp(T0[team], T0[team] * sides[team].remain, ep));
      const el = $(team === 'blue' ? 'bBlue' : 'bRed'); if (el) el.textContent = G.fmt(shown);
      const hp = $(team === 'blue' ? 'bBlueHp' : 'bRedHp'); if (hp) hp.style.width = (lerp(1, sides[team].remain, ep) * 100) + '%';
    }
    // birim davranışı
    for (const u of units) {
      if (u.alive && T > 1.2 && T < 10.5) {
        const foes = units.filter((v) => v.team !== u.team && v.alive);
        if (!foes.length) { u.state = 'idle'; }
        else {
          if (!u.target || !u.target.alive) {
            let best = null, bd = 1e9;
            for (const f of foes) { const d = f.obj.position.distanceToSquared(u.obj.position); if (d < bd) { bd = d; best = f; } }
            u.target = best;
          }
          const tp = u.target.obj.position, me = u.obj.position;
          const dx = tp.x - me.x, dz = tp.z - me.z, d = Math.hypot(dx, dz);
          u.obj.rotation.y = Math.atan2(dx, dz);
          if (u.type === 'tank') {
            if (d > 16) { me.x += dx / d * 2.4 * dt; me.z += dz / d * 2.4 * dt; u.state = 'walk'; }
            else {
              u.state = 'attack'; u.cd -= dt;
              if (u.cd <= 0) { u.cd = rand(1.6, 2.4); u.obj.userData.recoil = 1; cannon(new THREE.Vector3(me.x + dx / d * 1.4, 1.3, me.z + dz / d * 1.4), u.target.obj); }
            }
          } else if (u.ranged) {
            u.state = 'attack'; u.cd -= dt;
            if (u.cd <= 0 && d < 40) { u.cd = rand(1.0, 1.6); shoot(new THREE.Vector3(me.x, 1.5, me.z), u.target.obj); }
          } else if (d > (u.type === 'cavalry' ? 2.2 : 1.4)) {
            const sp = u.type === 'cavalry' ? 7 : 3.4;
            me.x += dx / d * sp * dt; me.z += dz / d * sp * dt;
            u.state = u.type === 'cavalry' || d > 6 ? 'run' : 'walk';
          } else {
            u.state = 'attack'; u.cd -= dt;
            if (u.cd <= 0) { u.cd = rand(0.6, 1.1); spark(tp.clone().lerp(me, 0.5)); if (Math.random() < 0.25) C.sfx('clash'); }
          }
        }
      } else if (u.alive && T >= 10.5) {
        const winnerTeam = win ? 'blue' : 'red';
        u.state = u.team === winnerTeam ? 'cheer' : 'idle';
      }
      animateUnit(u.obj, u.state, t + u.phase, dt);
    }
    // kuleler
    for (const tw of towers) {
      tw.obj.userData.update?.(t, dt);
      if (T < 1.2 || T > 10.5) continue;
      tw.cd -= dt;
      if (tw.cd <= 0) {
        tw.cd = rand(0.4, 0.9);
        const foes = units.filter((v) => v.team !== defenderTeam && v.alive);
        if (foes.length) shoot(tw.top, foes[Math.floor(Math.random() * foes.length)].obj);
      }
    }
    // oklar
    for (let i = arrows.length - 1; i >= 0; i--) {
      const a = arrows[i]; a.t += dt / a.d;
      if (a.t >= 1) { scene.remove(a.m); arrows.splice(i, 1); continue; }
      const pos = a.from.clone().lerp(a.to, a.t); pos.y += Math.sin(a.t * Math.PI) * (2 + a.from.distanceTo(a.to) * 0.12);
      const nxt = a.from.clone().lerp(a.to, Math.min(1, a.t + 0.02)); nxt.y += Math.sin(Math.min(1, a.t + 0.02) * Math.PI) * (2 + a.from.distanceTo(a.to) * 0.12);
      a.m.position.copy(pos); a.m.lookAt(nxt);
    }
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i]; b.t += dt / b.d;
      if (b.t >= 1) { scene.remove(b.m); balls.splice(i, 1); boom(b.to); continue; }
      b.m.position.copy(b.from).lerp(b.to, b.t); b.m.position.y += Math.sin(b.t * Math.PI) * (1.5 + b.from.distanceTo(b.to) * 0.08);
    }
    for (let i = booms.length - 1; i >= 0; i--) {
      const f = booms[i]; f.life -= dt;
      if (f.life <= 0) { scene.remove(f.s); booms.splice(i, 1); continue; }
      const k = 1 - f.life / f.max; f.s.material.opacity = (1 - k) * 0.95; f.s.scale.setScalar(f.sc * (0.6 + k * 0.9)); f.s.position.y += dt * 0.8;
    }
    for (const f of sparks) { if (f.life > 0) { f.life -= dt; f.s.material.opacity = Math.max(0, f.life * 4); f.s.scale.setScalar(0.4 + (0.25 - f.life) * 4); } }
    if (T > 11.2) finish();
  };
  open({ scene, camera, update, freeOnClose: true, dispose: () => { clearTimeout(autoStart); } }, 'battle');
}

// =====================================================================
//  ÇAĞIRMA ATÖLYESİ
// =====================================================================
let summonCtx = null;
function fitCover(tex, IA, cx = 0.5) {
  const SA = innerWidth / innerHeight;
  if (SA < IA) { tex.repeat.set(SA / IA, 1); tex.offset.set((1 - SA / IA) * cx, 0); } else { tex.repeat.set(1, IA / SA); tex.offset.set(0, (1 - IA / SA) * 0.5); }
  tex.needsUpdate = true;
}
let swirlT = null;
function swirlTex() {
  if (swirlT) return swirlT;
  swirlT = canvasTex(512, 512, (x) => {
    const g = x.createRadialGradient(256, 256, 0, 256, 256, 256); g.addColorStop(0, 'rgba(255,245,255,1)'); g.addColorStop(0.25, 'rgba(210,140,255,.95)'); g.addColorStop(0.7, 'rgba(110,40,220,.75)'); g.addColorStop(1, 'rgba(40,0,120,0)');
    x.fillStyle = g; x.fillRect(0, 0, 512, 512);
    x.lineCap = 'round';
    for (let arm = 0; arm < 5; arm++) { x.strokeStyle = `rgba(255,255,255,${0.35 + (arm % 2) * 0.3})`; x.lineWidth = 10 - arm; x.beginPath(); for (let t = 0; t < 1; t += 0.01) { const a = arm * 1.2566 + t * 7.5, r = t * 240; const px = 256 + Math.cos(a) * r, py = 256 + Math.sin(a) * r; t ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); }
  }, false);
  return swirlT;
}
function buildSummonScene() {
  const scene = new THREE.Scene();
  const bg = new THREE.TextureLoader().load('assets/ui/bg_summon.webp?v=2611191911'); bg.colorSpace = THREE.SRGBColorSpace; fitCover(bg, 768 / 1366);
  scene.background = bg;
  scene.environment = C.makeEnv(0x8a6aff, 0x3a2a70, 0x140a28, false);
  scene.environmentIntensity = 1.0;
  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 200);
  camera.position.set(0, 2.2, 7.5); camera.lookAt(0, 1.3, 0);
  scene.add(new THREE.HemisphereLight(0xc8b8ff, 0x2a1a40, 1.3));
  const key = new THREE.SpotLight(0xfff0e0, 55, 22, 0.6, 0.6, 1.2); key.position.set(2.5, 8, 5); key.target.position.set(0, 1, 0); key.castShadow = true; scene.add(key, key.target);
  const rim = new THREE.PointLight(0xb06bff, 40, 12, 1.5); rim.position.set(0, 2.8, -1.8); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xf0e8ff, 1.3); fill.position.set(0, 3, 8); scene.add(fill);
  const face = new THREE.SpotLight(0xfff4ea, 0, 14, 0.45, 0.7, 1.2); face.position.set(0, 2.6, 4.5); face.target.position.set(0, 1.3, -0.45); scene.add(face, face.target);
  // gölge yakalayıcı zemin
  const floor = new THREE.Mesh(new THREE.CircleGeometry(12, 48).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.45 }));
  floor.receiveShadow = true; scene.add(floor);
  // zeminde dönen rün dairesi
  const rune = canvasTex(512, 512, (ctx) => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
    for (const r of [244, 214]) { ctx.beginPath(); ctx.arc(256, 256, r, 0, 7); ctx.stroke(); }
    ctx.font = 'bold 26px serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    const glyphs = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; ctx.save(); ctx.translate(256 + Math.cos(a) * 229, 256 + Math.sin(a) * 229); ctx.rotate(a + Math.PI / 2); ctx.fillText(glyphs[i], 0, 9); ctx.restore(); }
  }, false);
  const runeMat = new THREE.MeshBasicMaterial({ map: rune, color: new THREE.Color(0.9, 0.5, 2.2), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
  const runeMesh = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 7.2).rotateX(-Math.PI / 2), runeMat); runeMesh.position.set(0, 0.02, -0.4); scene.add(runeMesh);
  // Higgsfield portal modeli
  const portal = new THREE.Group(); portal.position.set(0, 0, -0.6); scene.add(portal);
  const PH = 4.8; let P = { ringY: PH * 0.56, ringR: PH * 0.27, daisY: PH * 0.12 };
  const pm = A.hfModel('p_portal');
  if (pm) {
    const sz = A.hfSize('p_portal'); const k = PH / sz.y; pm.scale.setScalar(k);
    pm.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material.map) { o.material.emissiveMap = o.material.map; o.material.emissive = new THREE.Color(0x2a2240); } } });
    portal.add(pm);
  }
  // halkanın içindeki girdap
  const swMat = new THREE.MeshBasicMaterial({ map: swirlTex(), color: new THREE.Color(0.75, 0.45, 1.4), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7 });
  const ring = new THREE.Mesh(new THREE.CircleGeometry(P.ringR, 48), swMat); ring.position.set(0, P.ringY, -0.05); portal.add(ring);
  const ring2 = new THREE.Mesh(new THREE.CircleGeometry(P.ringR * 0.8, 48), swMat.clone()); ring2.material.color = new THREE.Color(0.6, 0.8, 1.6); ring2.material.opacity = 0.5; ring2.position.set(0, P.ringY, -0.02); portal.add(ring2);
  const disc = sprite(0xb070ff, P.ringR * 3.2, 0.6); disc.position.set(0, P.ringY, 0.05); portal.add(disc);
  const pedRim = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.03, 8, 48).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 1.2, 2.6), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })); pedRim.position.set(0, P.daisY + 0.03, 0.15); portal.add(pedRim);
  // kristal ışıltıları (modeldeki kristallerin üstünde)
  const crystals = [];
  for (const [x, y] of [[-0.42, 0.2], [0.42, 0.2], [0, 0.96], [-0.12, 0.92], [0.12, 0.92]]) { const g = sprite(0xc080ff, 0.9, 0.5); g.position.set(x * PH * 0.98, y * PH, 0.3); portal.add(g); crystals.push({ m: g, ph: Math.random() * 6 }); }
  let heroBase = P.daisY + 0.02;
  if (pm) { portal.updateMatrixWorld(true); const rc = new THREE.Raycaster(new THREE.Vector3(0, PH * 0.26, -0.45), new THREE.Vector3(0, -1, 0)); const hit = rc.intersectObject(pm, true)[0]; if (hit && hit.point.y > 0.05) heroBase = hit.point.y + 0.01; }
  // parçacıklar
  const PN = 300, pg = new THREE.BufferGeometry(), pp = new Float32Array(PN * 3);
  for (let i = 0; i < PN; i++) { pp[i * 3] = rand(-6, 6); pp[i * 3 + 1] = rand(0, 7); pp[i * 3 + 2] = rand(-6, 4); }
  pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const parts = new THREE.Points(pg, new THREE.PointsMaterial({ map: glow(), color: new THREE.Color(1.2, 0.8, 2.4), size: 0.12, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(parts);
  // ışık sütunu
  const beamTex = canvasTex(128, 512, (x, w, h) => {
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { const px = rand(0, w), len = rand(40, 220), py = rand(-len, h), g = x.createLinearGradient(0, py, 0, py + len); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(255,255,255,${rand(0.25, 0.9)})`); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(px, py, rand(1, 4), len); }
    const v = x.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(0.35, 'rgba(0,0,0,0)'); v.addColorStop(0.85, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.6)'); x.fillStyle = v; x.fillRect(0, 0, w, h);
  }, true);
  beamTex.colorSpace = THREE.NoColorSpace;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.15, 12, 40, 1, true), new THREE.MeshBasicMaterial({ map: beamTex, color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.set(0, 6, -0.6); scene.add(beam);
  const beam2 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 12, 32, 1, true), beam.material.clone()); beam2.position.copy(beam.position); scene.add(beam2);
  // dönen arcane girdap (yapay zekâ dokusu, siyah zemin → toplamsal karışım)
  const vxTex = new THREE.TextureLoader().load('assets/ui/fx_vortex.webp?v=2611191911'); vxTex.colorSpace = THREE.SRGBColorSpace;
  const vortex = new THREE.Sprite(new THREE.SpriteMaterial({ map: vxTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); vortex.position.set(0, P.ringY, -0.5); vortex.scale.set(3.2, 5.7, 1); scene.add(vortex);
  const vortex2 = new THREE.Sprite(vortex.material.clone()); vortex2.position.copy(vortex.position); vortex2.scale.set(2.2, 3.9, 1); scene.add(vortex2);
  const flash = sprite(0xffffff, 0.1, 0); flash.position.set(0, 1.5, 0); scene.add(flash);
  const aura = sprite(0xffffff, 4, 0); aura.position.set(0, 1.2, -0.3); scene.add(aura);
  return { scene, camera, portal, ring, ring2, disc, crystals, parts, beam, beam2, vortex, vortex2, flash, aura, runeMesh, rim, bg, heroBase, face, heroSlot: null, spin: 0 };
}
export function openSummon() {
  if (!summonCtx) summonCtx = buildSummonScene();
  const S = summonCtx;
  if (S.heroSlot) { S.scene.remove(S.heroSlot); freeSkeletons(S.heroSlot); S.heroSlot = null; }
  let phase = 'idle', pT = 0, queue = [], results = [], idx = 0;
  const ui = () => {
    const free = G.freePullAvailable();
    ov().innerHTML = `<div class="ov-top"><div class="ov-title">🔮 Çağırma Atölyesi</div><div class="row" style="align-items:center"><div class="res gold" id="sGold"><i>🪙</i><span>${G.fmt(G.S.res.gold)}</span><b>+</b></div><button class="x" id="sClose">✕</button></div></div>
      <div class="ov-bottom">
        <div style="text-align:center;font-weight:900;text-shadow:0 2px 4px #000;font-size:13px">5★ garantiye: <span style="color:var(--r5)">${SUMMON.pity5 - G.S.pity5}</span> çağırma • Her 10 çağırmada en az 1 adet 4★</div>
        <div style="text-align:center;font-size:12px;color:#d8c8f0;text-shadow:0 1px 3px #000"><span style="color:var(--r5)">5★ %0,6</span> • <span style="color:var(--r4)">4★ %5,4</span> • <span style="color:var(--r3)">3★ %26</span> • <span style="color:var(--r2)">2★ %68</span></div>
        ${free ? '<button class="btn" id="sFree">🎁 Günlük ücretsiz çağırma</button>' : ''}
        <div class="row"><button class="btn purple" id="s1">1x Çağır<br>🪙 ${SUMMON.cost1}</button><button class="btn gold" id="s10">10x Çağır<br>🪙 ${SUMMON.cost10}</button></div>
      </div>`;
    $('sClose').onclick = close;
    $('sGold').onclick = () => { close(); C.navigate('shop'); };
    $('s1').onclick = () => pull(1, false);
    $('s10').onclick = () => pull(10, false);
    if (free) $('sFree').onclick = () => pull(1, true);
  };
  const pull = (n, free) => {
    if (phase !== 'idle') return;
    const r = G.summon(n, free);
    if (!r.ok) { C.toast(r.why, true); if (r.needGold) setTimeout(() => { close(); C.navigate('shop'); }, 600); return; }
    results = r.results; queue = results.filter((x) => n === 1 || x.rarity >= 4).sort((a, b) => b.rarity - a.rarity); idx = 0;
    const best = Math.max(...results.map((x) => x.rarity));
    phase = 'charge'; pT = 0;
    S.bestColor = new THREE.Color(RARITY[best].color);
    S.best = best;
    if (S.heroSlot) { S.scene.remove(S.heroSlot); freeSkeletons(S.heroSlot); S.heroSlot = null; }
    ov().innerHTML = `<div class="ov-top"><div class="ov-title">🔮 Çağırılıyor…</div><button class="btn gray" id="sSkip" style="padding:8px 12px;font-size:13px">Geç ⏭</button></div>`;
    $('sSkip').onclick = () => { queue = []; showGrid(); };
    C.sfx('summon');
    C.updateTop();
    setTimeout(() => C.event?.('summoned'), 300);
  };
  const showHero = (r) => {
    const h = HERO_BY_ID[r.id];
    if (S.heroSlot) { S.scene.remove(S.heroSlot); freeSkeletons(S.heroSlot); }
    const m = createHero(h); m.position.set(0, S.heroBase, -0.45); m.rotation.y = 0;
    S.scene.add(m); S.heroSlot = m; S.heroState = 'cheer'; S.heroT = 0; S.wantMove = r.id;
    S.aura.material.color.set(RARITY[r.rarity].color); S.aura.material.opacity = 0.35;
    C.sfx(r.rarity >= 4 ? 'reveal5' : 'reveal');
    const RC = RARITY[r.rarity].color, roleTxt = { infantry: '🗡️ Piyade', archer: '🏹 Okçu', cavalry: '🐎 Süvari', tank: '⚙️ Tank' }[h.role];
    ov().innerHTML = `<div class="rv-top" style="--rc:${RC}">
        <div class="rv-plate"><div class="rv-stars">${'★'.repeat(r.rarity)}</div><div class="rv-name">${h.name}</div>
        <div class="rv-sub"><span class="rv-rar">${RARITY[r.rarity].name}</span><span>${h.title}</span></div></div>
        ${r.isNew ? '<div class="rv-tag new">YENİ KAHRAMAN!</div>' : `<div class="rv-tag dup">Kopya • ${G.S.heroes[h.id]?.copies || 0} kopya</div>`}
      </div>
      <div class="ov-bottom"><div class="rv-info" style="--rc:${RC}"><div class="rv-role">${roleTxt} komutanı • ⚔ ${h.atk} • 🛡 ${h.def}</div><div class="rv-skill">✨ ${h.skill}</div></div>
        <button class="btn gold" id="sNext">${idx < queue.length - 1 || results.length > 1 ? 'Devam ▶' : 'Tamam'}</button></div>`;
    $('sNext').onclick = () => { idx++; if (idx < queue.length) showHero(queue[idx]); else if (results.length > 1) showGrid(); else { phase = 'idle'; ui(); } };
  };
  const showGrid = () => {
    phase = 'grid';
    if (S.heroSlot) { S.scene.remove(S.heroSlot); freeSkeletons(S.heroSlot); S.heroSlot = null; }
    S.aura.material.opacity = 0; S.beam.material.opacity = 0; S.beam2.material.opacity = 0;
    const cards = results.map((r, i) => { const h = HERO_BY_ID[r.id]; return `<div class="hcard" style="--rc:${RARITY[r.rarity].color};animation-delay:${i * 0.08}s"><div class="ph" data-portrait="${r.id}">⏳</div><span class="st">${stars(r.rarity)}</span>${r.isNew ? '<span class="lv" style="background:#c0302a">YENİ</span>' : ''}<div class="hn">${h.name}</div></div>`; }).join('');
    ov().innerHTML = `<div class="res10"><div class="hgrid">${cards}</div></div><div class="ov-bottom"><button class="btn gold" id="sOk">Tamam</button></div>`;
    C.fillPortraits(ov());
    $('sOk').onclick = () => { phase = 'idle'; ui(); };
  };
  ui();
  const update = (dt, t) => {
    pT += dt;
    const speed = phase === 'charge' ? 1 + pT * 8 : 1;
    S.spin += dt * speed;
    S.ring.rotation.z = -S.spin * 0.9; S.ring2.rotation.z = S.spin * 1.4; S.runeMesh.rotation.y = S.spin * 0.2;
    S.vortex.material.rotation = -S.spin * 1.1; S.vortex2.material.rotation = S.spin * 1.7; S.beam.material.map.offset.y = -t * 0.35; S.beam2.material.map.offset.y = -t * 0.6; S.beam.rotation.y = t * 0.4;
    const dim = S.heroSlot ? 0.35 : 1; S.disc.material.opacity = (0.22 + Math.sin(t * 2) * 0.08) * dim + (phase === 'charge' ? pT * 0.3 : 0); S.ring.material.opacity = 0.7 * dim; S.ring2.material.opacity = 0.5 * dim;
    S.crystals.forEach((c) => { c.m.material.opacity = 0.35 + Math.sin(t * 2.2 + c.ph) * 0.2 + (phase === 'charge' ? pT * 0.3 : 0); });
    if (innerWidth !== S.lw || innerHeight !== S.lh) { S.lw = innerWidth; S.lh = innerHeight; fitCover(S.bg, 768 / 1366); }
    const pa = S.parts.geometry.attributes.position.array;
    for (let i = 0; i < pa.length; i += 3) { pa[i + 1] += dt * (0.3 + (phase === 'charge' ? pT * 3 : 0)); if (pa[i + 1] > 7) pa[i + 1] = 0; }
    S.parts.geometry.attributes.position.needsUpdate = true;
    if (phase === 'charge') {
      const k2 = Math.min(1, pT / 1.6);
      S.vortex.material.opacity = Math.min(0.95, pT * 0.8); S.vortex2.material.opacity = Math.min(0.7, pT * 0.6);
      S.vortex.scale.set(3.2 + k2 * 2.2, 5.7 + k2 * 3.6, 1); S.vortex2.scale.set(2.2 + k2 * 1.4, 3.9 + k2 * 2.2, 1);
      S.vortex2.material.color.copy(S.bestColor).lerp(new THREE.Color(1, 1, 1), 0.4);
      if (pT > 0.9) { S.beam.material.color.copy(S.bestColor).multiplyScalar(0.9); S.beam.material.opacity = Math.min(0.55, (pT - 0.9) * 0.9); S.beam2.material.color.copy(S.bestColor).lerp(new THREE.Color(1, 1, 1), 0.5); S.beam2.material.opacity = Math.min(0.45, (pT - 0.9) * 0.8); }
      S.rim.color.lerp(S.bestColor, dt * 2);
      if (pT > 2.0) {
        S.flash.material.color.copy(S.bestColor); S.flash.material.opacity = 0.75; S.flash.scale.setScalar(9);
        phase = 'reveal'; pT = 0;
        if (queue.length) showHero(queue[0]); else showGrid();
      }
    } else {
      S.beam.material.opacity = Math.max(0, S.beam.material.opacity - dt * 0.8); S.beam2.material.opacity = Math.max(0, S.beam2.material.opacity - dt * 0.8);
      S.vortex.material.opacity = Math.max(S.heroSlot ? 0 : 0.18, S.vortex.material.opacity - dt * 0.9); S.vortex2.material.opacity = Math.max(0, S.vortex2.material.opacity - dt * 0.9);
      if (!S.heroSlot) { S.vortex.scale.set(3.2, 5.7, 1); }
      S.rim.color.lerp(new THREE.Color(0xb06bff), dt);
    }
    if (S.flash.material.opacity > 0) { S.flash.material.opacity = Math.max(0, S.flash.material.opacity - dt * 1.5); S.flash.scale.setScalar(14 + (1 - S.flash.material.opacity) * 6); }
    if (S.heroSlot) {
      S.heroT += dt;
      const sig = String(!!S.heroSlot.userData.h3);
      if (S.heroT < 0.6 || sig !== S.heroSlot.userData.gsig) { S.heroSlot.userData.gsig = sig; S.heroSlot.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(S.heroSlot); if (isFinite(bb.min.y)) S.heroSlot.position.y += S.heroBase - bb.min.y; }
      S.heroSlot.rotation.y = Math.sin(S.heroT * 0.5) * 0.25;
      if (S.wantMove && S.heroSlot.userData.h3) { playHeroMove(S.heroSlot); playVoice(S.wantMove); S.wantMove = null; }
      animateUnit(S.heroSlot, 'idle', t, dt);
      S.aura.material.opacity = 0.25 + Math.sin(t * 3) * 0.08;
      S.face.intensity = Math.min(28, S.face.intensity + dt * 60);
    } else { S.aura.material.opacity = Math.max(0, S.aura.material.opacity - dt); S.face.intensity = Math.max(0, S.face.intensity - dt * 140); }
    const mounted = S.heroSlot && S.heroSlot.userData.mounted;
    const ty = mounted ? 1.5 : 1.15;
    const k = innerWidth < innerHeight ? Math.min(2.1, 0.85 / (innerWidth / innerHeight)) : 1;
    S.camera.position.set(Math.sin(t * 0.15) * 0.6, S.heroSlot ? 2.0 + (mounted ? 0.5 : 0) : 2.6, (S.heroSlot ? (mounted ? 6.8 : 5.4) : 8.5) * k);
    S.camera.lookAt(0, S.heroSlot ? S.heroBase + ty + (k > 1 ? 0.75 : 0.2) : 1.9, 0);
  };
  open({ scene: S.scene, camera: S.camera, update, hiDpr: true }, 'summon');
}

// =====================================================================
//  KAHRAMAN GÖRÜNTÜLEYİCİ
// =====================================================================
let hallCtx = null;
function buildHall() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1208);
  scene.fog = new THREE.Fog(0x1a1208, 10, 30);
  scene.environment = C.makeEnv(0x8a6a40, 0x4a3420, 0x1a1008, true);
  scene.environmentIntensity = 0.9;
  const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xffe8c8, 0x2a1a0a, 0.7));
  const key = new THREE.SpotLight(0xfff0d8, 80, 20, 0.5, 0.5, 1.2); key.position.set(3, 7, 5); key.target.position.set(0, 1, 0); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xfff4e8, 1.6); fill.position.set(0, 2, 8); scene.add(fill);
  const rim = new THREE.SpotLight(0x9ab8ff, 50, 20, 0.6, 0.5, 1.2); rim.position.set(-3, 5, -4); rim.target.position.set(0, 1, 0); scene.add(rim, rim.target);
  const floorTex = canvasTex(512, 512, (ctx) => {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const v = rand(60, 90); ctx.fillStyle = `rgb(${v + 10},${v},${v - 12})`; ctx.fillRect(x * 64 + 1, y * 64 + 1, 62, 62); }
  });
  floorTex.repeat.set(6, 6);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(20, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.5, metalness: 0.1 }));
  floor.receiveShadow = true; scene.add(floor);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 0.3, 40), new THREE.MeshStandardMaterial({ color: 0x5a4a38, roughness: 0.35, metalness: 0.4 }));
  ped.position.y = 0.15; ped.receiveShadow = ped.castShadow = true; scene.add(ped);
  const trim = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.035, 8, 64).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xd8a83a, metalness: 1, roughness: 0.25 })); trim.position.y = 0.3; scene.add(trim);
  // sütunlar
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI + Math.PI, c = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 7, 16), new THREE.MeshStandardMaterial({ color: 0x8a7a64, roughness: 0.6 }));
    c.position.set(Math.cos(a) * 6, 3.5, Math.sin(a) * 4 - 2); c.castShadow = true; scene.add(c);
    const f = sprite(0xffa040, 1.2, 0.8); f.position.set(c.position.x * 0.92, 3.2, c.position.z + 0.5); scene.add(f);
    const pl = new THREE.PointLight(0xff9a40, 4, 6, 1.5); pl.position.copy(f.position); scene.add(pl);
  }
  const aura = sprite(0xffffff, 4, 0); aura.position.set(0, 1.2, -0.4); scene.add(aura);
  return { scene, camera, aura, model: null };
}
export function openHeroViewer(id) {
  if (!hallCtx) hallCtx = buildHall();
  const H = hallCtx;
  const list = HEROES.filter((h) => G.S.heroes[h.id]).concat(HEROES.filter((h) => !G.S.heroes[h.id]));
  let cur = list.findIndex((h) => h.id === id); if (cur < 0) cur = 0;
  let rot = 0, vel = 0, dragX = null, anim = 'idle', animT = 0, want = false, downX = 0, downT = 0;
  const setHero = () => {
    const h = list[cur];
    if (H.model) { H.scene.remove(H.model); freeSkeletons(H.model); const seen = new Set(); H.model.traverse((o) => { const m = o.material; if (m && m.map && !seen.has(m.map)) { seen.add(m.map); m.map.dispose(); } }); }
    H.model = createHero(h); H.model.position.y = 0.3; H.scene.add(H.model);
    H.aura.material.color.set(RARITY[h.rarity].color).multiplyScalar(1.4);
    H.aura.material.opacity = h.rarity >= 4 ? 0.7 : 0.25;
    want = true; animT = 0;
    renderUI();
  };
  const renderUI = () => {
    const h = list[cur], o = G.S.heroes[h.id];
    const ups = o?.ups || 0, st = heroStars(h, ups), effR = st.gold, RC = st.asc ? '#ff7ae0' : RARITY[effR].color;
    const bonus = o ? heroBonus(h, o.level, o.copies, ups) : heroBonus(h, 1, 0);
    const sc = o ? nextStarCost(h, ups) : null, canUp = o && sc != null && o.copies >= sc;
    const cost = o ? heroLevelCost(o.level) : null;
    const maxed = o && o.level >= G.heroMaxLevel();
    const roleTxt = { infantry: '🗡️ Piyade komutanı', archer: '🏹 Okçu komutanı', cavalry: '🐎 Süvari komutanı', tank: '⚙️ Tank komutanı' }[h.role];
    const rimg = (r) => `<img src="assets/ui/res_${r}.webp?v=2611191911" alt="">`;
    ov().innerHTML = `<div class="hv-top">
        <button class="hv-nav" id="hPrev">◀</button>
        <div class="hv-plate" style="--rc:${RC}"><div class="hv-stars">${starsHtml(h, ups, 20)}</div><div class="hv-name">${h.name}</div>
          <div class="hv-sub">${st.asc ? `<span class="asc-tag">✦ Yüce ${st.asc}</span>` : `<span class="hv-rar">${RARITY[effR].name}</span>`}<span>${h.title}</span></div></div>
        <button class="hv-nav" id="hNext">▶</button><button class="hv-x" id="hClose">✕</button></div>
      <div class="hv-hint">👆 Dokun: özel hareket • sürükle: döndür</div>
      <div class="ov-bottom"><div class="hv-panel">
        <div class="hv-role">${roleTxt}</div>
        <div class="hv-stats">
          <div><i>📈</i><small>Seviye</small><b>${o ? o.level : '-'}<em>/${G.heroMaxLevel()}</em></b></div>
          <div><i>⚔️</i><small>Saldırı</small><b>${heroAtk(h, o ? o.level : 1, ups)}${o && !maxed ? `<em class="up">→${heroAtk(h, o.level + 1, ups)}</em>` : ''}</b></div>
          <div><i>🛡️</i><small>Savunma</small><b>${heroDef(h, o ? o.level : 1, ups)}</b></div>
          <div><i>✨</i><small>Bonus</small><b>+${bonus.toFixed(0)}%</b></div></div>
        <div class="hv-skill"><b>${h.skill.split(':')[0]}</b>${h.skill.includes(':') ? ':' + h.skill.split(':').slice(1).join(':') : ''}</div>
        ${o && maxed && o.level < HERO_MAX_LEVEL ? '<div class="hv-warn">Daha yüksek seviye: Karakter Deposu\'nu yükselt (+15)</div>' : ''}
        ${o ? `<div class="hv-asc ${canUp ? 'ready' : ''}"><img src="assets/ui/st_asc.webp?v=2611191911" alt=""><div class="hv-ai"><b>${sc == null ? 'En yüksek yıldız!' : st.gold < 5 ? `${st.gold + 1}★ yükseltme` : `Yüce ${st.asc + 1}`}</b><div class="asc-bar"><i style="width:${sc ? Math.min(100, o.copies / sc * 100) : 100}%"></i></div><small>Kopya ${o.copies}/${sc ?? '—'} • güç +%15</small></div>
            <button class="hv-btn asc" id="hAsc" ${canUp ? '' : 'disabled'}>✦ Yükselt</button></div>
          <div class="hv-row">
            <button class="hv-btn green" id="hLvl" ${maxed ? 'disabled' : ''}>${maxed ? 'Sınırda' : `<span>⬆ Seviye</span><small>${rimg('food')}${G.fmt(cost.food)} ${rimg('stone')}${G.fmt(cost.stone)}</small>`}</button>
            ${maxed ? '' : '<button class="hv-btn blue sq" id="hLvl10">x10</button>'}
            <button class="hv-btn ${G.S.commander === h.id ? 'steel' : 'gold'}" id="hCmd"><img src="assets/ui/crown.webp?v=2611191911" alt="">${G.S.commander === h.id ? 'Komutan' : 'Komutan yap'}</button></div>`
        : `<button class="hv-btn violet wide" id="hGo">🔒 Henüz sahip değilsin — Çağır</button>`}
      </div></div>`;
    $('hClose').onclick = close;
    $('hPrev').onclick = () => { cur = (cur - 1 + list.length) % list.length; setHero(); };
    $('hNext').onclick = () => { cur = (cur + 1) % list.length; setHero(); };
    if ($('hLvl')) $('hLvl').onclick = () => { const r = G.levelUpHero(h.id); if (!r.ok) C.toast(r.why, true); else { C.toast('⬆ Seviye atladı!'); C.sfx('reveal'); want = true; } renderUI(); };
    if ($('hLvl10')) $('hLvl10').onclick = () => { let n = 0; while (n < 10 && G.levelUpHero(h.id).ok) n++; if (!n) C.toast('Yetersiz kaynak', true); else { C.toast(`⬆ ${n} seviye atladı!`); C.sfx('reveal'); want = true; } renderUI(); };
    if ($('hAsc')) $('hAsc').onclick = () => { const r = G.ascendHero(h.id); if (!r.ok) return C.toast(r.why, true); const s2 = heroStars(h, r.ups); C.sfx('reveal5'); C.toast(s2.asc ? `✦ ${h.name} Yüce ${s2.asc} oldu! Güç +%15` : `⭐ ${h.name} ${s2.gold}★ oldu! Güç +%15`); want = true; renderUI(); };
    if ($('hCmd')) $('hCmd').onclick = () => { G.setCommander(h.id); C.toast('👑 Yeni komutan: ' + h.name); renderUI(); };
    if ($('hGo')) $('hGo').onclick = () => { close(); openSummon(); };
  };
  const cv = C.renderer.domElement;
  const pd = (e) => { dragX = e.clientX; downX = e.clientX; downT = performance.now(); };
  const pm = (e) => { if (dragX !== null) { vel = (e.clientX - dragX) * 0.01; rot += vel; dragX = e.clientX; } };
  const pu = (e) => { if (dragX !== null && Math.abs((e.clientX ?? downX) - downX) < 8 && performance.now() - downT < 400) want = true; dragX = null; };
  cv.addEventListener('pointerdown', pd); addEventListener('pointermove', pm); addEventListener('pointerup', pu);
  setHero();
  const update = (dt, t) => {
    if (dragX === null) { rot += vel; vel *= Math.exp(-4 * dt); if (Math.abs(vel) < 0.002) rot += (Math.sin(t * 0.35) * 0.22 - rot) * Math.min(1, dt * 1.5); }
    animT += dt;
    if (H.model) {
      if (want && H.model.userData.h3) { want = false; playHeroMove(H.model); playVoice(list[cur].id); }
      H.model.rotation.y = rot; animateUnit(H.model, 'idle', t, dt);
    }
    H.aura.material.opacity *= 1; H.aura.scale.setScalar(4 + Math.sin(t * 2) * 0.3);
    const mounted = H.model && H.model.userData.mounted;
    const ty = mounted ? 1.6 : 1.05;
    const portrait = innerHeight > innerWidth;
    H.camera.position.set(0, ty + 0.9, (mounted ? 9.5 : 7.4) * (portrait ? 1.2 : 1));
    H.camera.lookAt(0, ty - (portrait ? 0.15 : 0), 0);
  };
  open({ scene: H.scene, camera: H.camera, update, hiDpr: true, dispose: () => { cv.removeEventListener('pointerdown', pd); removeEventListener('pointermove', pm); removeEventListener('pointerup', pu); } });
}

// =====================================================================
//  PORTRELER (kahraman kartları için küçük görüntüler)
// =====================================================================
const portraitCache = {};
let pr = null;
function portraitRenderer() {
  if (pr) return pr;
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(240, 320, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  scene.environment = (() => { const pm = new THREE.PMREMGenerator(renderer); const es = new THREE.Scene(); es.add(new THREE.Mesh(new THREE.SphereGeometry(10), new THREE.MeshBasicMaterial({ color: 0x6a5a4a, side: THREE.BackSide }))); const l = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 6, 5) })); l.position.set(4, 5, 6); es.add(l); const t = pm.fromScene(es, 0.04).texture; pm.dispose(); return t; })();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a2a1a, 1.2));
  const key = new THREE.DirectionalLight(0xfff2e0, 2.6); key.position.set(2, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9ab8ff, 1.8); rim.position.set(-3, 3, -4); scene.add(rim);
  const camera = new THREE.PerspectiveCamera(30, 240 / 320, 0.1, 50);
  pr = { renderer, scene, camera, canvas };
  return pr;
}
export function getPortrait(id) { return Promise.resolve('assets/heroes/' + id + '.webp?v=2611191911'); }
export function getAvatar(id) { return Promise.resolve('assets/heroes/' + id + '_a.webp?v=2611191911'); }
export function getPortrait3d(id) {
  if (portraitCache[id]) return portraitCache[id];
  portraitCache[id] = new Promise((resolve) => {
    setTimeout(() => {
      const R = portraitRenderer(), h = HERO_BY_ID[id];
      const col = new THREE.Color(RARITY[h.rarity].color);
      R.scene.background = new THREE.Color(0x1a1008).lerp(col, 0.28);
      const m = createHero(h);
      m.rotation.y = 0.35;
      R.scene.add(m);
      animateUnit(m, 'idle', 0.5, 0.016);
      m.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(m);
      const top = box.max.y, mounted = m.userData.mounted;
      const focusY = top - (mounted ? 0.75 : 0.55);
      R.camera.position.set(0.5, focusY + 0.1, mounted ? 3.6 : 2.6);
      R.camera.lookAt(0, focusY - 0.05, 0);
      R.renderer.render(R.scene, R.camera);
      const url = R.canvas.toDataURL('image/jpeg', 0.85);
      R.scene.remove(m);
      resolve(url);
    }, 0);
  });
  return portraitCache[id];
}

// =====================================================================
//  BİNA PORTRELERİ (panel başlığı için)
// =====================================================================
const bPortraits = {};
export function getBuildingPortrait(key, level) {
  const id = key + ':' + level;
  if (bPortraits[id]) return bPortraits[id];
  bPortraits[id] = new Promise((resolve) => {
    setTimeout(() => {
      const R = portraitRenderer();
      R.renderer.setSize(220, 220, false);
      R.camera.aspect = 1; R.camera.updateProjectionMatrix();
      const bg = new THREE.Color(0x4a8ad0);
      R.scene.background = bg;
      const m = BLD.createBuilding(key, Math.max(1, level));
      m.userData.update?.(1.0, 0.016);
      R.scene.add(m);
      m.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(m), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
      const d = Math.max(sz.x, sz.y * 1.1, sz.z) * 1.65;
      R.camera.position.set(c.x + d * 0.62, c.y + d * 0.42, c.z + d * 0.72);
      R.camera.lookAt(c.x, c.y - sz.y * 0.05, c.z);
      R.renderer.render(R.scene, R.camera);
      const url = R.canvas.toDataURL('image/jpeg', 0.88);
      R.scene.remove(m);
      R.renderer.setSize(240, 320, false); R.camera.aspect = 240 / 320; R.camera.updateProjectionMatrix();
      resolve(url);
    }, 0);
  });
  return bPortraits[id];
}
