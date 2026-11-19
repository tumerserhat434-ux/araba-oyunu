// =====================================================================
//  DEMİR SANCAK — Belediye binası efektleri (teklif paketleriyle satılır)
//  Şehirde ve dünya haritasındaki şehirde görünür. createSkinFX(id, { R, H })
//  R: binanın yarıçapı, H: yüksekliği. Dönen grubun userData.update(t, dt) her karede çağrılır.
// =====================================================================
import * as THREE from 'three';
import * as A from './assets.js?v=2611191836';
import { rigQueen, poseQueen } from './queenrig.js?v=2611191836';

export const SKINS = {
  fireworks: { name: 'Havai Fişek Şöleni', desc: 'Belediye binasının üstünde rengârenk havai fişekler patlar.', color: '#d070ff' },
  crown: { name: 'Altın Taç Sarayı', desc: 'Belediye binan altın kubbeli, dev taçlı bir saraya dönüşür; rün halkaları hızlanır, tepeden altın sikke ve mücevher fışkırır.', color: '#ffd060', model: 'th_crown', pulse: 0.1 },
  xmas: { name: 'Yılbaşı Şatosu', desc: 'Belediye binan karlı bir yılbaşı şatosuna dönüşür; Noel Baba ren geyikli kızağıyla etrafında uçup hediye yağdırır.', color: '#ff5a5a', model: 'th_xmas', pulse: 0.14 },
  aurora: { name: 'Buz Sarayı', desc: 'Belediye binan bir buz sarayına dönüşür; Buz Kraliçesi büyü yapar, bulutlardan kar yağar, yerden buz dikenleri fışkırır.', color: '#6affc8', model: 'th_aurora' },
  dragon: { name: 'Ejder Kalesi', desc: 'Belediye binan volkanik bir kaleye dönüşür; tepesindeki dev ejderha kanat çırpar, kükreyip göğe ateş püskürtür, duvarlardan lav akar.', color: '#ff6a2a', flip: { video: 'assets/ui/fv_dragon.mp4?v=2611191836', k: 1.65 } },
  vip7: { name: 'Ametist Gök Kalesi', desc: 'VIP 7 ayrıcalığı: belediye binan uçan bir ametist kristal kalesine dönüşür; altında büyü girdabı döner, kristaller etrafında uçuşur.', color: '#b070ff', flip: { video: 'assets/ui/fv_vip7.mp4?v=2611191836' }, vip: 7 },
  vip8: { name: 'Altın Dünya', desc: 'VIP 8 ayrıcalığı: belediye binan dev, alevli bir altın küreye dönüşür; küre döner, gökkuşağı halkaları etrafında akar, altın kıvılcımlar savrulur.', color: '#ffb030', flip: { video: 'assets/ui/fv_vip8.mp4?v=2611191836' }, vip: 8 },
  shuttle: { name: 'Galaksi Üssü', desc: 'Belediye binan bir uzay üssüne dönüşür; 3-2-1 geri sayımla mekik fırlatılır, yörüngede döner ve rampaya geri iner.', color: '#5ad8ff', model: 'th_shuttle' },
};
export const SKIN_ORDER = ['vip8', 'vip7', 'shuttle', 'dragon', 'aurora', 'xmas', 'crown', 'fireworks'];

let glowT = null;
function glowTex() {
  if (glowT) return glowT;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); glowT = new THREE.CanvasTexture(c); return glowT;
}
const spr = (color, s, op = 1, add = true) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity: op, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending })); m.scale.setScalar(s); return m; };
function points(n, color, size, add = true) {
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const col = new Float32Array(n * 3); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({ map: glowTex(), size, vertexColors: true, color, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, sizeAttenuation: true }));
  p.frustumCulled = false; return p;
}
const rnd = (a, b) => a + Math.random() * (b - a);
// HF modeli hazır olunca gruba ekle (ilk kez gerekirse yüklenir)
function lateModel(key, onReady) {
  A.ensureHF(key); let done = false;
  return () => { if (done || !A.hasHF(key)) return; done = true; const m = A.hfModel(key); if (m) onReady(m); };
}
function fitModel(m, h) { const b = new THREE.Box3().setFromObject(m), s = b.getSize(new THREE.Vector3()); m.scale.setScalar(h / Math.max(0.01, s.y)); return m; }

// Videolu kostüm (Higgsfield videosu, yeşil zemin): bina gizlenir, yerine kameraya bakan bir kart konur,
// video 24 kare/sn döngüde oynar; yeşil zemin shader'da anlık temizlenir (önceden işlenmiş zengin animasyon).
const vidCache = new Map();
function costumeVideo(src) {
  let c = vidCache.get(src); if (c) return c;
  const v = document.createElement('video'); v.src = src; v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', ''); v.crossOrigin = 'anonymous'; v.preload = 'auto'; v.autoplay = true;
  v.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none;z-index:-1'; document.body.appendChild(v); // iOS: sayfadaki video güvenilir oynar
  const play = () => { if (v.paused) v.play().catch(() => {}); }; play();
  // iOS: ilk dokunuşta oynatmayı garanti et; sekme geri gelince devam
  ['pointerdown', 'touchend'].forEach((ev) => addEventListener(ev, play, { passive: true }));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) play(); });
  const t = new THREE.VideoTexture(v); t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
  c = { v, t, play }; vidCache.set(src, c); return c;
}
function chromaMat(tex) {
  const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }); // zemin altına girip kesilmesin
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      { vec3 c = diffuseColor.rgb; float mx = max(c.r, c.b), d = c.g - mx;
        float a = 1.0 - smoothstep(0.08, 0.26, d);
        a *= 1.0 - step(0.55, c.g) * step(c.r, 0.45) * step(c.b, 0.45);
        vec2 eu = vMapUv; float ed = min(min(eu.x, 1.0 - eu.x), min(eu.y, 1.0 - eu.y)); a *= smoothstep(0.0, 0.07, ed); // kenara değen kanat/ateş keskin kesilmesin
        c.g = min(c.g, mx + max(d, 0.0) * 0.12);
        diffuseColor = vec4(c, diffuseColor.a * a);
        if (diffuseColor.a < 0.04) discard; }`);
  };
  m.customProgramCacheKey = () => 'chroma';
  return m;
}
function flipbook(g, F, base, R, H, world) {
  const { t, play } = costumeVideo(F.video); play();
  const sp = new THREE.Sprite(chromaMat(t)); sp.center.set(0.5, (F.cy ?? 0.1) + (world ? 0.17 / (F.k || 1) : 0)); sp.renderOrder = 3; // dünya haritasında kamera daha tepeden bakar: taban daha aşağı
  let W = R * 3.2;
  if (base) { const b = new THREE.Box3().setFromObject(base), s0 = b.getSize(new THREE.Vector3()); W = Math.max(s0.x, s0.z) * (world ? 2.0 : 1.5) * (F.k || 1); base.visible = false; } // şehirde komşu binalara taşmasın
  sp.scale.set(W, W, 1); sp.position.y = 0.05; g.add(sp);
  g.userData.restore = () => { if (base) base.visible = true; };
  let pop = 0;
  return (time, dt) => {
    play();
    if (pop < 1) { pop = Math.min(1, pop + dt * 2.2); const e = pop * (1 + Math.sin(pop * Math.PI) * 0.12); sp.scale.set(W * e, W * e, 1); }
  };
}
// Kostüm: binanın kendisi temalı modelle değişir (base gizlenir), malzemeler tema renginde nabız gibi parlar
function costume(g, id, base, R, H) {
  const sk = SKINS[id]; if (!sk?.model || !base) return () => {};
  const glowCol = new THREE.Color(sk.color), mats = []; sk.pulse ??= 0.3;
  const add = lateModel(sk.model, (m) => {
    const b0 = new THREE.Box3().setFromObject(base), s0 = b0.getSize(new THREE.Vector3());
    const b = new THREE.Box3().setFromObject(m), s = b.getSize(new THREE.Vector3());
    const k = Math.min((Math.max(s0.x, s0.z) * 1.5) / Math.max(s.x, s.z), (s0.y * 1.35) / s.y);
    m.scale.multiplyScalar(k);
    m.traverse((o) => { if (o.isMesh && o.material) { o.material = o.material.clone(); o.material.emissive = glowCol.clone(); o.material.emissiveIntensity = 0.15; mats.push(o.material); o.castShadow = o.receiveShadow = true; } });
    const wrap = new THREE.Group(); wrap.add(m); g.add(wrap); g.userData.costume = wrap;
    base.visible = false; wrap.scale.setScalar(0.01); wrap.userData.pop = 0;
  });
  g.userData.restore = () => { base.visible = true; };
  return (t, dt) => {
    add();
    const w = g.userData.costume; if (!w) return;
    if (w.userData.pop < 1) { w.userData.pop = Math.min(1, w.userData.pop + dt * 2.2); const p = w.userData.pop, e = 1 + Math.sin(p * Math.PI) * 0.12; w.scale.setScalar(p * e); }
    const pulse = sk.pulse * (0.35 + (Math.sin(t * 2.2) * 0.5 + 0.5) * 0.65); for (const m of mats) m.emissiveIntensity = pulse;
  };
}

// ---------------------------------------------------------------------
//  Kostüm animasyonları için yardımcılar
// ---------------------------------------------------------------------
const _bx = new THREE.Vector3(), _by = new THREE.Vector3(), _bz = new THREE.Vector3(), _bm = new THREE.Matrix4(), _bq = new THREE.Quaternion();
// nesnenin yerel +x eksenini dir yönüne yumuşakça çevir (üst yön ipucuyla)
function aimX(obj, dir, upHint, k = 1) {
  _bx.copy(dir).normalize(); _by.copy(upHint).addScaledVector(_bx, -upHint.dot(_bx));
  if (_by.lengthSq() < 1e-6) _by.set(0, 0, 1).addScaledVector(_bx, -_bx.z);
  _by.normalize(); _bz.crossVectors(_bx, _by); _bm.makeBasis(_bx, _by, _bz); _bq.setFromRotationMatrix(_bm);
  obj.quaternion.slerp(_bq, Math.min(1, k));
}
function bez(a, b, c, d, t) { const u = 1 - t; return new THREE.Vector3().addScaledVector(a, u * u * u).addScaledVector(b, 3 * u * u * t).addScaledVector(c, 3 * u * t * t).addScaledVector(d, t * t * t); }
const sstep = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
// duman / toz havuzu (normal karışımlı yumuşak lekeler)
function smokePool(parent, n, color, add = false) {
  const P = [];
  for (let i = 0; i < n; i++) { const s = spr(color, 1, 0, add); parent.add(s); P.push({ s, life: 0, max: 1, v: new THREE.Vector3(), s0: 1, s1: 2, op: 0.6 }); }
  return {
    spawn(pos, vel, s0, s1, life, op = 0.6) { const p = P.find((q) => q.life <= 0); if (!p) return; p.s.position.copy(pos); p.v.copy(vel); p.s0 = s0; p.s1 = s1; p.life = p.max = life; p.op = op; },
    update(dt, drag = 0.96, lift = 0) {
      for (const p of P) { if (p.life <= 0) { p.s.material.opacity = 0; continue; } p.life -= dt; const k = 1 - p.life / p.max; p.s.position.addScaledVector(p.v, dt); p.v.multiplyScalar(drag); p.v.y += lift * dt; p.s.scale.setScalar(p.s0 + (p.s1 - p.s0) * k); p.s.material.opacity = Math.sin(Math.min(1, k * 1.2) * Math.PI) * p.op; }
    },
  };
}
// metin sprite'ı (geri sayım vb.)
function textSprite(txt, color = '#7af0ff') {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
  x.font = '900 92px Lilita One, Arial Black, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = color; x.shadowBlur = 24; x.fillStyle = '#ffffff'; x.fillText(txt, 128, 68); x.shadowBlur = 0; x.lineWidth = 4; x.strokeStyle = color; x.strokeText(txt, 128, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false })); s.renderOrder = 10; return s;
}
// modeli en uzun yatay ekseni L olacak biçimde ölçekle ve merkezle
function fitLen(m, L) { const b = new THREE.Box3().setFromObject(m), s = b.getSize(new THREE.Vector3()); m.scale.multiplyScalar(L / Math.max(s.x, s.z)); const b2 = new THREE.Box3().setFromObject(m), c = b2.getCenter(new THREE.Vector3()); m.position.sub(c); return m; }
// rigged karakter (heroes3d klasöründen), yüklenince çağrılır
function lateHero(key, onReady) {
  let st = 0;
  return () => { if (st === 2) return; if (st === 0) { st = 1; A.loadHero3d(key).then((ok) => { if (ok) { onReady(); st = 2; } else st = 2; }); } };
}

export function createSkinFX(id, { R = 6, H = 10, base = null, world = false } = {}) {
  const g = new THREE.Group(); g.name = 'skinfx'; let tick = () => {};
  const costumeTick = costume(g, id, base, R, H);
  if (id === 'fireworks') {
    // fırlayan roket → patlama (yerçekimi ve sönme)
    const N = 110, bursts = [], COLS = [0xff4a6a, 0xffd04a, 0x4affb0, 0x5ab0ff, 0xd070ff, 0xff8a2a];
    for (let k = 0; k < 5; k++) { const p = points(N, 0xffffff, H * 0.22); g.add(p); bursts.push({ p, v: new Float32Array(N * 3), life: 0, rocket: null, cd: k * 0.45 }); }
    const sparkle = points(40, 0xffe8a0, H * 0.12); g.add(sparkle);
    const sp = sparkle.geometry.attributes.position.array, sc = sparkle.geometry.attributes.color.array;
    for (let i = 0; i < 40; i++) { sc[i * 3] = 1; sc[i * 3 + 1] = 0.85; sc[i * 3 + 2] = 0.5; }
    tick = (t, dt) => {
      for (const b of bursts) {
        const pos = b.p.geometry.attributes.position.array, col = b.p.geometry.attributes.color.array;
        if (b.life <= 0 && !b.rocket) { b.cd -= dt; if (b.cd <= 0) b.rocket = { x: rnd(-R, R) * 0.6, z: rnd(-R, R) * 0.6, y: H * 0.6, top: H * rnd(1.1, 1.7), s: spr(0xffe0a0, H * 0.25) }, g.add(b.rocket.s); }
        if (b.rocket) {
          const r = b.rocket; r.y += dt * H * 2.2; r.s.position.set(r.x, r.y, r.z);
          if (r.y >= r.top) {
            g.remove(r.s); r.s.material.dispose(); b.rocket = null; b.life = 1.6;
            const c = new THREE.Color(COLS[Math.floor(Math.random() * COLS.length)]), c2 = new THREE.Color(COLS[Math.floor(Math.random() * COLS.length)]);
            for (let i = 0; i < N; i++) { pos[i * 3] = r.x; pos[i * 3 + 1] = r.y; pos[i * 3 + 2] = r.z; const th = Math.random() * 6.28, ph = Math.acos(rnd(-1, 1)), sp2 = H * rnd(0.6, 1.1); b.v[i * 3] = Math.sin(ph) * Math.cos(th) * sp2; b.v[i * 3 + 1] = Math.cos(ph) * sp2; b.v[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * sp2; const cc = i % 3 ? c : c2; col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b; }
          }
        }
        if (b.life > 0) {
          b.life -= dt; const k = Math.max(0, b.life / 1.6);
          for (let i = 0; i < N; i++) { b.v[i * 3 + 1] -= H * 0.5 * dt; b.v[i * 3] *= 0.985; b.v[i * 3 + 2] *= 0.985; pos[i * 3] += b.v[i * 3] * dt; pos[i * 3 + 1] += b.v[i * 3 + 1] * dt; pos[i * 3 + 2] += b.v[i * 3 + 2] * dt; }
          b.p.material.opacity = k; b.p.geometry.attributes.position.needsUpdate = true; b.p.geometry.attributes.color.needsUpdate = true;
          if (b.life <= 0) { b.cd = rnd(0.1, 0.8); for (let i = 0; i < N * 3; i++) pos[i] = 0; b.p.material.opacity = 0; }
        }
      }
      for (let i = 0; i < 40; i++) { const a = i * 2.4 + t * 0.6, rr = R * (0.9 + (i % 5) * 0.08); sp[i * 3] = Math.cos(a) * rr; sp[i * 3 + 1] = H * 0.2 + ((t * 0.4 + i * 0.37) % 1) * H * 0.9; sp[i * 3 + 2] = Math.sin(a) * rr; }
      sparkle.geometry.attributes.position.needsUpdate = true;
    };
  } else if (id === 'crown') {
    // KRALİYET HAZİNESİ: rün halkaları hızlanır, ışık sütunu parlar, tepeden altın sikke ve mücevher fışkırır,
    // dönerek yere yağar, sekip parıldayarak kaybolur; tepede dönen altın ışık hüzmeleri
    const top = H * 1.3, CYC = 12;
    const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'); x.translate(256, 256);
    x.strokeStyle = '#ffd860'; x.shadowColor = '#ffb020'; x.shadowBlur = 16;
    for (const [r, w] of [[240, 6], [222, 2], [170, 4], [150, 2]]) { x.lineWidth = w; x.beginPath(); x.arc(0, 0, r, 0, 7); x.stroke(); }
    x.font = 'bold 30px serif'; x.fillStyle = '#ffe890'; const RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
    for (let i = 0; i < 24; i++) { x.save(); x.rotate(i / 24 * Math.PI * 2); x.fillText(RUNES[i], -10, -186); x.restore(); }
    for (let i = 0; i < 6; i++) { x.save(); x.rotate(i / 6 * Math.PI * 2); x.beginPath(); x.moveTo(0, -150); x.lineTo(130, 75); x.stroke(); x.restore(); }
    const rt = new THREE.CanvasTexture(c); rt.colorSpace = THREE.SRGBColorSpace;
    const rm = new THREE.MeshBasicMaterial({ map: rt, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0.8 });
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(R * 3, R * 3).rotateX(-Math.PI / 2), rm); ring.position.y = 0.15; g.add(ring);
    // dönen ışık hüzmeleri (tepede yelpaze)
    const rc = document.createElement('canvas'); rc.width = rc.height = 256; const rx = rc.getContext('2d'); rx.translate(128, 128);
    for (let i = 0; i < 16; i++) { rx.save(); rx.rotate(i / 16 * Math.PI * 2); const gr = rx.createLinearGradient(0, 0, 0, -128); gr.addColorStop(0, 'rgba(255,230,140,.9)'); gr.addColorStop(1, 'rgba(255,200,80,0)'); rx.fillStyle = gr; rx.beginPath(); rx.moveTo(0, 0); rx.lineTo(-9, -128); rx.lineTo(9, -128); rx.fill(); rx.restore(); }
    const rayT = new THREE.CanvasTexture(rc); rayT.colorSpace = THREE.SRGBColorSpace;
    const rays = new THREE.Sprite(new THREE.SpriteMaterial({ map: rayT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); rays.position.y = top * 1.02; g.add(rays);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xffc840, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.3, R * 0.75, H * 2.2, 24, 1, true), beamMat); beam.position.y = H * 1.1; g.add(beam);
    const halo = spr(0xffd060, H * 1.0, 0.6); halo.position.y = top; g.add(halo);
    // sikkeler ve mücevherler (InstancedMesh)
    const NC = 70, coinGeo = new THREE.CylinderGeometry(R * 0.11, R * 0.11, R * 0.025, 16);
    const coinMat = new THREE.MeshStandardMaterial({ color: 0xffc830, metalness: 0.85, roughness: 0.25, emissive: 0x6a4a00, emissiveIntensity: 0.6 });
    const coins = new THREE.InstancedMesh(coinGeo, coinMat, NC); coins.frustumCulled = false; g.add(coins);
    const NG = 14, gemGeo = new THREE.OctahedronGeometry(R * 0.09, 0), gems = new THREE.InstancedMesh(gemGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.3, roughness: 0.1, emissive: 0x222222 }), NG); gems.frustumCulled = false; g.add(gems);
    const GC = [0xff2a4a, 0x2a8aff, 0x2aff8a, 0xc04aff]; for (let i = 0; i < NG; i++) gems.setColorAt(i, new THREE.Color(GC[i % 4]));
    const mk = (n) => Array.from({ length: n }, () => ({ p: new THREE.Vector3(0, -99, 0), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), life: 0, b: 0 }));
    const CO = mk(NC), GE = mk(NG), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), sc = new THREE.Vector3();
    const launch = (o) => { const a = rnd(0, 6.28), sp = R * rnd(0.9, 1.9); o.p.set(rnd(-0.3, 0.3) * R, top * 1.02, rnd(-0.3, 0.3) * R); o.v.set(Math.cos(a) * sp, H * rnd(0.9, 1.5), Math.sin(a) * sp); o.r.set(rnd(0, 6), rnd(0, 6), rnd(0, 6)); o.w.set(rnd(-9, 9), rnd(-9, 9), rnd(-9, 9)); o.life = rnd(3.2, 4.2); o.b = 0; };
    const sparkle = smokePool(g, 40, 0xfff0a0, true);
    const N = 50, dust = points(N, 0xffd870, H * 0.12); g.add(dust); const dp = dust.geometry.attributes.position.array, dc = dust.geometry.attributes.color.array, seeds = [];
    for (let i = 0; i < N; i++) { seeds.push([rnd(0, 6.28), rnd(0.2, 1.3), rnd(0, 1)]); dc[i * 3] = 1; dc[i * 3 + 1] = rnd(0.7, 0.9); dc[i * 3 + 2] = 0.35; }
    const L = new THREE.PointLight(0xffc040, 10, R * 5, 1.6); L.position.y = top; g.add(L);
    let acc = 0;
    const step = (arr, mesh, dt, gscale) => {
      arr.forEach((o, i) => {
        if (o.life > 0) {
          o.life -= dt; o.v.y -= H * 2.2 * dt; o.p.addScaledVector(o.v, dt); o.r.x += o.w.x * dt; o.r.y += o.w.y * dt; o.r.z += o.w.z * dt;
          if (o.p.y < 0.1 && o.v.y < 0) { o.p.y = 0.1; if (o.b < 2) { o.v.y *= -0.38; o.v.x *= 0.5; o.v.z *= 0.5; o.w.multiplyScalar(0.5); o.b++; if (o.b === 1 && Math.random() < 0.5) sparkle.spawn(o.p.clone().add(new THREE.Vector3(0, 0.3, 0)), new THREE.Vector3(0, H * 0.3, 0), R * 0.3, R * 0.05, 0.5, 0.9); } else { o.v.set(0, 0, 0); o.w.set(0, 0, 0); } }
        }
        const s = o.life > 0 ? Math.min(1, o.life / 0.6) * gscale : 0;
        q.setFromEuler(o.r); sc.copy(one).multiplyScalar(s); m4.compose(o.p, q, sc); mesh.setMatrixAt(i, m4);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };
    tick = (t, dt) => {
      dt = Math.min(dt, 0.05);
      const cc = t % CYC, charge = sstep((cc - 0.5) / 1.5) * (1 - sstep((cc - 6) / 1.5)), burst = cc >= 2 && cc < 5.5;
      ring.rotation.y += dt * (0.25 + charge * 2.5); rm.opacity = 0.55 + charge * 0.45;
      beamMat.opacity = 0.05 + charge * 0.09 + Math.sin(t * 2) * 0.02;
      rays.material.opacity = charge * 0.55; rays.material.rotation = t * 0.6; rays.scale.setScalar(H * (1.2 + charge * 0.8));
      halo.material.opacity = 0.25 + charge * 0.3 + Math.sin(t * 3) * 0.08; halo.scale.setScalar(H * (0.8 + charge * 0.4));
      L.intensity = 6 + charge * 14;
      if (burst) { acc += dt * 22; while (acc > 1) { acc--; const o = CO.find((z) => z.life <= 0); if (o) launch(o); if (Math.random() < 0.2) { const e = GE.find((z) => z.life <= 0); if (e) launch(e); } } }
      step(CO, coins, dt, 1); step(GE, gems, dt, 1.2); if (gems.instanceColor) gems.instanceColor.needsUpdate = false;
      sparkle.update(dt, 0.9);
      for (let i = 0; i < N; i++) { const [a, r, o] = seeds[i], k = (t * 0.25 + o) % 1; dp[i * 3] = Math.cos(a + t * 0.3) * R * r; dp[i * 3 + 1] = k * H * 2; dp[i * 3 + 2] = Math.sin(a + t * 0.3) * R * r; }
      dust.geometry.attributes.position.needsUpdate = true;
    };
  } else if (id === 'xmas') {
    // NOEL BABA: ren geyikli kızak şatonun etrafında dalgalanarak uçar, arkasında altın sim bırakır,
    // hediye paketleri atar; paketler dönerek düşer, sekip yere oturur, parıldayıp kaybolur. Işıklar ve kar.
    const top = H * 1.3;
    const N = 120, bulbGeo = new THREE.SphereGeometry(Math.max(0.12, R * 0.035), 8, 6);
    const bulbs = new THREE.InstancedMesh(bulbGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), N); const m4 = new THREE.Matrix4(), col = new THREE.Color();
    const PAL = [0xff3a3a, 0x3aff6a, 0xffd03a, 0x3a9aff, 0xff6ad0];
    for (let i = 0; i < N; i++) { const k = i / N, a = k * Math.PI * 2 * 5, r = R * (0.95 - k * 0.25); m4.makeTranslation(Math.cos(a) * r, 0.4 + k * H * 0.95, Math.sin(a) * r); bulbs.setMatrixAt(i, m4); bulbs.setColorAt(i, col.set(PAL[i % 5])); }
    g.add(bulbs);
    const star = spr(0xffe060, H * 0.45, 1); star.position.y = H * 1.32; g.add(star);
    const SN = 160, snow = points(SN, 0xffffff, H * 0.08, false); g.add(snow); const sp = snow.geometry.attributes.position.array, sc = snow.geometry.attributes.color.array;
    for (let i = 0; i < SN; i++) { sp[i * 3] = rnd(-R * 2.5, R * 2.5); sp[i * 3 + 1] = rnd(0, H * 2.2); sp[i * 3 + 2] = rnd(-R * 2.5, R * 2.5); sc[i * 3] = sc[i * 3 + 1] = sc[i * 3 + 2] = 1; }
    const L = new THREE.PointLight(0xff8a60, 14, R * 4, 1.6); L.position.y = H * 0.6; g.add(L);
    // kızak
    const sleigh = new THREE.Group(); g.add(sleigh); const body = new THREE.Group(); sleigh.add(body);
    const addSleigh = lateModel('fx_sleigh', (m) => { fitLen(m, H * 0.75); body.add(m); });
    const nose = spr(0xff3020, H * 0.12, 0.9); nose.position.set(H * 0.38, H * 0.06, 0); body.add(nose); // Rudolf'un burnu
    const sim = smokePool(g, 60, 0xffe080, true);
    // hediyeler
    const GCOL = [0xd8202a, 0x2a8a3a, 0x2a5ad8, 0xb03ad8, 0xf0b020];
    const ribMat = new THREE.MeshStandardMaterial({ color: 0xffe070, metalness: 0.5, roughness: 0.3, emissive: 0x403000 });
    const gifts = []; for (let i = 0; i < 10; i++) {
      const gg = new THREE.Group(), s = H * rnd(0.08, 0.12);
      const box = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), new THREE.MeshStandardMaterial({ color: GCOL[i % 5], roughness: 0.5 })); gg.add(box);
      const r1 = new THREE.Mesh(new THREE.BoxGeometry(s * 1.02, s * 1.02, s * 0.18), ribMat), r2 = new THREE.Mesh(new THREE.BoxGeometry(s * 0.18, s * 1.02, s * 1.02), ribMat); gg.add(r1, r2);
      const bow = new THREE.Mesh(new THREE.TorusGeometry(s * 0.18, s * 0.06, 6, 12), ribMat); bow.position.y = s * 0.55; gg.add(bow);
      gg.visible = false; gg.traverse((o) => { if (o.isMesh) o.castShadow = true; }); g.add(gg); gifts.push({ g: gg, s, life: 0, v: new THREE.Vector3(), w: new THREE.Vector3(), b: 0 });
    }
    const sparkle = smokePool(g, 30, 0xfff4c0, true);
    let dropT = 0, prev = new THREE.Vector3(), first = true;
    const UP = new THREE.Vector3(0, 1, 0);
    tick = (t, dt) => {
      addSleigh(); dt = Math.min(dt, 0.05);
      const sh = Math.floor(t * 6);
      for (let i = 0; i < N; i++) bulbs.setColorAt(i, col.set(PAL[(i + sh) % 5]).multiplyScalar((i + sh) % 7 === 0 ? 0.25 : 1));
      bulbs.instanceColor.needsUpdate = true;
      star.material.opacity = 0.75 + Math.sin(t * 4) * 0.25; star.scale.setScalar(H * (0.4 + Math.sin(t * 4) * 0.05));
      for (let i = 0; i < SN; i++) { sp[i * 3 + 1] -= dt * H * 0.18; sp[i * 3] += Math.sin(t + i) * dt * 0.4; if (sp[i * 3 + 1] < 0) sp[i * 3 + 1] = H * 2.2; }
      snow.geometry.attributes.position.needsUpdate = true;
      // kızak yolu: binanın etrafında, yükselip alçalan dalgalı daire (arada şatonun üstünden geçer)
      const a = t * 0.45, r = R * (1.75 + Math.sin(t * 0.3) * 0.25), y = top * 0.82 + Math.sin(t * 0.9) * H * 0.18;
      const pos = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
      const vel = first ? new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)) : pos.clone().sub(prev); prev.copy(pos); first = false;
      sleigh.position.copy(pos); aimX(sleigh, vel.lengthSq() > 1e-8 ? vel : new THREE.Vector3(1, 0, 0), UP, dt * 5);
      body.rotation.z = Math.sin(t * 7) * 0.07; body.position.y = Math.abs(Math.sin(t * 7)) * H * 0.03; body.rotation.x = -0.12; // dörtnala sallanma, içe yatış
      nose.material.opacity = 0.6 + Math.sin(t * 6) * 0.4;
      const back = new THREE.Vector3(-1, 0, 0).applyQuaternion(sleigh.quaternion);
      if (Math.random() < dt * 40) sim.spawn(pos.clone().addScaledVector(back, H * 0.35).add(new THREE.Vector3(rnd(-1, 1), rnd(-0.5, 0.5), rnd(-1, 1)).multiplyScalar(H * 0.04)), new THREE.Vector3(0, -H * 0.05, 0), H * 0.07, H * 0.01, rnd(0.8, 1.4), 0.95);
      sim.update(dt, 0.98);
      // hediye at
      dropT -= dt; if (dropT <= 0) { dropT = rnd(1.1, 1.9); const gf = gifts.find((q) => q.life <= 0); if (gf) { gf.life = 5.5; gf.b = 0; gf.g.visible = true; gf.g.position.copy(pos).addScaledVector(back, H * 0.2); gf.v.copy(vel).multiplyScalar(0.3 / Math.max(dt, 0.016)).multiplyScalar(0.25).add(new THREE.Vector3(0, H * 0.15, 0)); gf.v.x -= pos.x * 0.15; gf.v.z -= pos.z * 0.15; gf.w.set(rnd(-6, 6), rnd(-6, 6), rnd(-6, 6)); gf.g.scale.setScalar(1); } }
      for (const gf of gifts) {
        if (gf.life <= 0) continue; gf.life -= dt;
        if (gf.b < 3) {
          gf.v.y -= H * 1.6 * dt; gf.g.position.addScaledVector(gf.v, dt); gf.g.rotation.x += gf.w.x * dt; gf.g.rotation.y += gf.w.y * dt; gf.g.rotation.z += gf.w.z * dt;
          const fl = gf.s * 0.5; if (gf.g.position.y < fl && gf.v.y < 0) { gf.g.position.y = fl; gf.b++; if (gf.b < 3) { gf.v.y *= -0.35; gf.v.x *= 0.4; gf.v.z *= 0.4; gf.w.multiplyScalar(0.4); } else { gf.v.set(0, 0, 0); gf.g.rotation.set(0, gf.g.rotation.y, 0); } }
        }
        if (gf.life < 0.5) { gf.g.scale.setScalar(Math.max(0.01, gf.life / 0.5 * 1.25)); if (gf.life < 0.45 && gf.life + dt >= 0.45) for (let k = 0; k < 8; k++) sparkle.spawn(gf.g.position.clone(), new THREE.Vector3(rnd(-1, 1), rnd(0.3, 1.2), rnd(-1, 1)).multiplyScalar(H * 0.4), H * 0.1, H * 0.01, 0.7, 1); }
        if (gf.life <= 0) gf.g.visible = false;
      }
      sparkle.update(dt, 0.92);
    };
  } else if (id === 'aurora') {
    // BUZ KRALİÇESİ: sarayın önünde süzülür, büyü yapar; tepede kar bulutları toplanır ve kar yağdırır,
    // büyünün doruğunda yerden buz dikenleri fışkırır, buz dalgası halka halinde yayılır, mavi şimşek çakar
    const top = H * 1.3, CYC = 8;
    const QY = top * 0.5, QS = H * 0.52; // süzülme yüksekliği, kraliçe boyu
    const queen = new THREE.Group(); queen.position.set(0, QY, R * 1.15); g.add(queen);
    const qL = new THREE.PointLight(0xbfefff, 18, H * 1.5, 1.4); qL.position.set(0, H * 0.5, H * 0.35); queen.add(qL);
    // Modelin kendi iskeleti yanlış bağlı (hazır animasyon elbiseyi parçalıyordu); queenrig.js kodla yeni
    // iskelet kurar: kollar ve baş hareket eder, etek ve pelerin gövdeye sabit kalır.
    let qBody = null, qRig = null;
    const addQueen = lateHero('fx_queen', () => { const h = A.hero3d('fx_queen', QS); if (!h) return; h.scene.rotation.y = Math.PI / 2; qRig = rigQueen(h.scene); queen.add(h.scene); qBody = h.scene; });
    const qGlow = spr(0x7ae8ff, H * 0.5, 0.7); qGlow.position.y = 0.1; queen.add(qGlow);
    const orbs = []; for (let i = 0; i < 6; i++) { const s = spr(i % 2 ? 0xbff8ff : 0x6ad0ff, H * 0.09, 0.9); queen.add(s); orbs.push(s); }
    // kar bulutları
    const clouds = []; for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2, r = i === 0 ? 0 : R * rnd(0.5, 1.1), s = spr(i % 3 ? 0xe8f4ff : 0xb8cce8, H * rnd(0.4, 0.6), 0.5, false); s.position.set(Math.cos(a) * r, top + H * rnd(0.22, 0.34), Math.sin(a) * r); g.add(s); clouds.push({ s, a, r, y: s.position.y, ph: rnd(0, 6) }); }
    const SN = 220, snow = points(SN, 0xffffff, H * 0.07, false); g.add(snow); const sp = snow.geometry.attributes.position.array, scl = snow.geometry.attributes.color.array;
    const cloudY = top + H * 0.25;
    for (let i = 0; i < SN; i++) { const a = rnd(0, 6.28), r = R * Math.sqrt(Math.random()) * 1.5; sp[i * 3] = Math.cos(a) * r; sp[i * 3 + 1] = rnd(0, cloudY); sp[i * 3 + 2] = Math.sin(a) * r; scl[i * 3] = scl[i * 3 + 1] = scl[i * 3 + 2] = 1; }
    // buz dalgası halkası ve buz dikenleri
    const novaMat = new THREE.MeshBasicMaterial({ color: 0x8af0ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const nova = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 64).rotateX(-Math.PI / 2), novaMat); nova.position.y = 0.2; g.add(nova);
    const spikeMat = new THREE.MeshStandardMaterial({ color: 0xc8f6ff, emissive: 0x3ab8ff, emissiveIntensity: 0.9, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.92 });
    const spikes = []; for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(new THREE.ConeGeometry(R * 0.12, H * 0.5, 5), spikeMat); const a = i / 16 * Math.PI * 2 + rnd(-0.1, 0.1), r = R * rnd(1.25, 1.55); m.position.set(Math.cos(a) * r, -H * 0.3, Math.sin(a) * r); m.rotation.set(rnd(-0.25, 0.25), rnd(0, 6), rnd(-0.25, 0.25)); m.userData.d = rnd(0, 0.4); g.add(m); spikes.push(m); }
    const crysMat = new THREE.MeshStandardMaterial({ color: 0xbff4ff, emissive: 0x3ac8ff, emissiveIntensity: 1.1, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.9 });
    const crys = []; for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(R * 0.13, 0), crysMat); m.scale.y = 1.8; g.add(m); crys.push(m); }
    const flash = new THREE.PointLight(0x8ad8ff, 0, R * 6, 1.4); flash.position.y = top + H * 0.5; g.add(flash);
    const L = new THREE.PointLight(0x5affd0, 12, R * 5, 1.6); L.position.y = H; g.add(L);
    const ice = smokePool(g, 40, 0xbff4ff, true);
    tick = (t, dt) => {
      addQueen(); dt = Math.min(dt, 0.05);
      const c = t % CYC, cast = sstep((c - 2.5) / 1.5) * (1 - sstep((c - 5.5) / 1)), peak = c >= 4 && c < 4.05 + dt;
      queen.position.y = QY + Math.sin(t * 1.5) * H * 0.03 + cast * H * 0.06; qL.intensity = 14 + cast * 20; queen.rotation.y = Math.sin(t * 0.4) * 0.25;
      if (qBody) { poseQueen(qRig, t, cast); qBody.rotation.z = Math.sin(t * 1.1) * 0.03; qBody.scale.setScalar(1 + cast * 0.04 + (peak ? 0.03 : 0)); }
      qGlow.material.opacity = 0.5 + cast * 0.5; qGlow.scale.setScalar(H * (0.45 + cast * 0.35));
      orbs.forEach((s, i) => { const a = t * (2 + cast * 3) + i / 6 * Math.PI * 2, r = H * (0.16 + cast * 0.1); s.position.set(Math.cos(a) * r, H * (0.3 + Math.sin(t * 3 + i) * 0.08 + cast * 0.15), Math.sin(a) * r); });
      clouds.forEach((cl) => { cl.a += dt * 0.06; cl.s.position.set(Math.cos(cl.a) * cl.r, cl.y + Math.sin(t * 0.7 + cl.ph) * H * 0.03 - cast * H * 0.06, Math.sin(cl.a) * cl.r); cl.s.material.opacity = 0.42 + cast * 0.18; });
      const fall = H * (0.16 + cast * 0.2);
      for (let i = 0; i < SN; i++) { sp[i * 3 + 1] -= dt * fall * (0.7 + (i % 5) * 0.12); sp[i * 3] += Math.sin(t * 0.8 + i) * dt * 0.3; if (sp[i * 3 + 1] < 0) { const a = rnd(0, 6.28), r = R * Math.sqrt(Math.random()) * 1.5; sp[i * 3] = Math.cos(a) * r; sp[i * 3 + 1] = cloudY; sp[i * 3 + 2] = Math.sin(a) * r; } }
      snow.geometry.attributes.position.needsUpdate = true;
      // buz dalgası: büyünün doruğundan sonra yayılır
      const nk = (c - 4) / 1.6;
      if (nk >= 0 && nk <= 1) { const r = R * (0.6 + nk * 2.4); nova.scale.set(r, 1, r); novaMat.opacity = (1 - nk) * 0.85; } else novaMat.opacity = 0;
      spikes.forEach((m) => { const k = (c - 4 - m.userData.d) / 2.6; const up = k < 0 ? 0 : k < 0.15 ? k / 0.15 : k < 0.75 ? 1 : Math.max(0, 1 - (k - 0.75) / 0.25); m.position.y = -H * 0.3 + up * H * 0.5; m.visible = up > 0; });
      flash.intensity = c >= 4 && c < 4.35 ? 60 * (1 - (c - 4) / 0.35) : c >= 4.6 && c < 4.75 ? 35 : 0;
      if (c >= 4 && c < 4.6 && Math.random() < dt * 50) { const a = rnd(0, 6.28); ice.spawn(new THREE.Vector3(Math.cos(a) * R * 0.5, 0.4, Math.sin(a) * R * 0.5), new THREE.Vector3(Math.cos(a) * R * 2.2, H * rnd(0.2, 0.6), Math.sin(a) * R * 2.2), H * 0.12, H * 0.02, 1, 0.9); }
      ice.update(dt, 0.95);
      crys.forEach((m, i) => { const a = i / 6 * Math.PI * 2 + t * 0.35; m.position.set(Math.cos(a) * R * 1.35, H * 0.6 + Math.sin(t * 1.4 + i) * H * 0.12, Math.sin(a) * R * 1.35); m.rotation.y = t * 1.5 + i; });
      L.intensity = 10 + cast * 12;
    };
  } else if (id === 'shuttle') {
    // FIRLATMA: rampada bekler → 3-2-1 geri sayım, alt kısımda buhar → ateşlenip dikine kalkar (duman izi)
    // → yatay yörüngeye girer, binanın etrafında döner → yukarıdan gelip dikine, ters itkiyle rampaya iner
    const top = H * 1.3, Ls = H * 0.42, padY = top + Ls * 0.3, CYC = 26;
    const ship = new THREE.Group(); g.add(ship); // yerel +x = burun
    const addShip = lateModel('fx_shuttle', (m) => { fitLen(m, Ls); ship.add(m); });
    // motor alevi (kuyrukta, -x yönünde)
    const thr = new THREE.Group(); thr.position.x = -Ls * 0.5; ship.add(thr);
    const fl = [[0xffffff, 0.22, 0], [0xffe080, 0.32, -0.12], [0xff9a30, 0.42, -0.3], [0xff5a20, 0.36, -0.52], [0x5ac8ff, 0.5, -0.05]].map(([c, s, x]) => { const p = spr(c, Ls * s, 0.9); p.position.x = Ls * x; thr.add(p); p.userData.s = s; return p; });
    const smoke = smokePool(g, 70, 0xd8d8e0), fire = smokePool(g, 30, 0xff8a30, true);
    const shipL = new THREE.PointLight(0xffa040, 0, R * 4, 1.6); ship.add(shipL); shipL.position.x = -Ls * 0.7;
    // geri sayım yazıları ve ikaz ışıkları
    const nums = ['3', '2', '1', 'KALKIŞ!'].map((s, i) => { const m = textSprite(s, i === 3 ? '#ffb040' : '#7af0ff'); m.scale.set(H * (i === 3 ? 1.4 : 0.9), H * (i === 3 ? 0.7 : 0.45), 1); m.position.y = top + H * 0.35; m.visible = false; g.add(m); return m; });
    const warn = []; for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4, s = spr(0xff3020, R * 0.35, 0); s.position.set(Math.cos(a) * R * 0.55, top * 0.95, Math.sin(a) * R * 0.55); g.add(s); warn.push(s); }
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x5ad8ff, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const rings = [1.5, 1.15].map((k, i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(R * k, R * 0.012, 6, 64), ringMat); m.rotation.x = Math.PI / 2; m.position.y = H * (0.25 + i * 0.75); g.add(m); return m; });
    const SN = 80, stars = points(SN, 0xffffff, H * 0.1); g.add(stars); const sp = stars.geometry.attributes.position.array, sc = stars.geometry.attributes.color.array;
    for (let i = 0; i < SN; i++) { const a = rnd(0, 6.28), r = R * rnd(1, 2.2); sp[i * 3] = Math.cos(a) * r; sp[i * 3 + 1] = rnd(H * 0.3, H * 2.3); sp[i * 3 + 2] = Math.sin(a) * r; const c = new THREE.Color().setHSL(rnd(0.5, 0.7), 0.8, 0.75); sc[i * 3] = c.r; sc[i * 3 + 1] = c.g; sc[i * 3 + 2] = c.b; }
    const PAD = new THREE.Vector3(0, padY, 0), LE = new THREE.Vector3(0, padY + H * 0.75, 0), HOV = new THREE.Vector3(0, padY + H * 0.55, 0), UP = new THREE.Vector3(0, 1, 0);
    const orb = (c) => { const a = 0.4 + (c - 12.5) * 0.85, r = R * 1.6; return new THREE.Vector3(Math.cos(a) * r, top * 0.8 + Math.sin(c * 1.3) * H * 0.08, Math.sin(a) * r); };
    const tan = (c) => orb(c + 0.01).sub(orb(c - 0.01)).normalize();
    const path = (c) => {
      if (c < 6) return PAD.clone().add(c > 5 ? new THREE.Vector3(rnd(-1, 1), 0, rnd(-1, 1)).multiplyScalar(Ls * 0.012) : new THREE.Vector3());
      if (c < 10) { const k = (c - 6) / 4; return new THREE.Vector3(0, padY + H * 0.75 * k * k, 0); }
      if (c < 12.5) { const o = orb(12.5); return bez(LE, LE.clone().add(new THREE.Vector3(0, H * 0.35, 0)), o.clone().addScaledVector(tan(12.5), -R * 1.6), o, sstep((c - 10) / 2.5) * 0.6 + (c - 10) / 2.5 * 0.4); }
      if (c < 20) return orb(c);
      if (c < 23) { const o = orb(20); return bez(o, o.clone().addScaledVector(tan(20), R * 1.6), HOV.clone().add(new THREE.Vector3(0, H * 0.4, 0)), HOV, sstep((c - 20) / 3)); }
      const k = sstep((c - 23) / 2.6); return HOV.clone().lerp(PAD, k);
    };
    let lastC = 0;
    tick = (t, dt) => {
      addShip(); dt = Math.min(dt, 0.05);
      const c = t % CYC; if (c < lastC) ship.quaternion.identity(); lastC = c;
      const p = path(c); ship.position.copy(p);
      const v = path(Math.min(CYC - 0.001, c + 0.05)).sub(path(Math.max(0, c - 0.05)));
      const vertical = c < 7 || c > 23;
      aimX(ship, vertical ? UP : v.lengthSq() > 1e-6 ? v : UP, vertical ? new THREE.Vector3(0, 0, 1) : UP, vertical && c < 7 ? 1 : dt * 4);
      // itki seviyesi
      const thrust = c < 5 ? 0 : c < 6 ? 0.25 + Math.random() * 0.2 : c < 10 ? 1 : c < 12.5 ? 0.85 : c < 20 ? 0.55 : c < 23 ? 0.45 : c < 25.6 ? 0.75 - (c - 23) / 2.6 * 0.5 : 0;
      fl.forEach((f, i) => { const q = thrust * (0.85 + Math.random() * 0.3); f.scale.setScalar(Ls * f.userData.s * (0.25 + q * (i === 4 ? 1.2 : 1))); f.material.opacity = Math.min(1, q * 1.2); f.position.x = Ls * [0, -0.12, -0.3, -0.52, -0.05][i] * (0.6 + thrust * 0.6); });
      shipL.intensity = thrust * 40;
      const tail = thr.getWorldPosition(new THREE.Vector3()); g.worldToLocal(tail);
      const back = new THREE.Vector3(-1, 0, 0).applyQuaternion(ship.quaternion);
      // buhar / duman
      if (c >= 3 && c < 6 && Math.random() < dt * 30) { const a = rnd(0, 6.28); smoke.spawn(new THREE.Vector3(Math.cos(a) * R * 0.3, top * 0.97, Math.sin(a) * R * 0.3), new THREE.Vector3(Math.cos(a), 0.15, Math.sin(a)).multiplyScalar(R * rnd(0.8, 1.6)), H * 0.12, H * 0.5, rnd(1.2, 2), 0.55); }
      if (c >= 6 && c < 10 && Math.random() < dt * 45) smoke.spawn(tail, back.clone().multiplyScalar(H * 0.6).add(new THREE.Vector3(rnd(-1, 1), 0, rnd(-1, 1)).multiplyScalar(R * 0.4)), H * 0.15, H * 0.75, rnd(1.6, 2.6), 0.6);
      if (c >= 6 && c < 7.5 && Math.random() < dt * 40) { const a = rnd(0, 6.28); smoke.spawn(new THREE.Vector3(Math.cos(a) * R * 0.25, top * 0.98, Math.sin(a) * R * 0.25), new THREE.Vector3(Math.cos(a), 0.05, Math.sin(a)).multiplyScalar(R * 2.2), H * 0.2, H * 0.8, 2.2, 0.6); }
      if (c >= 10 && c < 23 && Math.random() < dt * 14) smoke.spawn(tail, back.clone().multiplyScalar(H * 0.2), H * 0.06, H * 0.28, 1.1, 0.35);
      if (c >= 23 && c < 25.6 && Math.random() < dt * 20) smoke.spawn(tail, back.clone().multiplyScalar(H * 0.5), H * 0.1, H * 0.45, 1.2, 0.5);
      if (c >= 25.2 && c < 25.7 && Math.random() < dt * 60) { const a = rnd(0, 6.28); smoke.spawn(new THREE.Vector3(Math.cos(a) * R * 0.2, top * 0.98, Math.sin(a) * R * 0.2), new THREE.Vector3(Math.cos(a), 0.1, Math.sin(a)).multiplyScalar(R * 1.8), H * 0.15, H * 0.6, 1.6, 0.55); }
      if (thrust > 0.5 && Math.random() < dt * 25) fire.spawn(tail, back.clone().multiplyScalar(H * 0.9).add(new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(H * 0.08)), Ls * 0.18, Ls * 0.05, 0.35, 0.8);
      smoke.update(dt, 0.95, H * 0.05); fire.update(dt, 0.9);
      // geri sayım, ikaz ışıkları
      nums.forEach((m, i) => { const on = c >= 3 + i && c < 4 + i - (i === 3 ? 0.2 : 0); m.visible = on; if (on) { const k = (c - 3 - i); m.material.opacity = Math.min(1, (1 - k) * 3); const sc0 = i === 3 ? 1.4 : 0.9; m.scale.set(H * sc0 * (1.3 - k * 0.3), H * sc0 * 0.5 * (1.3 - k * 0.3), 1); } });
      const blink = c >= 3 && c < 6.5 ? (Math.sin(t * 18) > 0 ? 0.95 : 0.1) : Math.sin(t * 2) > 0.7 ? 0.5 : 0;
      warn.forEach((s) => { s.material.opacity = blink; });
      rings[0].rotation.z = t * 0.6; rings[1].rotation.z = -t * 0.9; rings[1].position.y = H * (0.9 + Math.sin(t * 1.2) * 0.25);
      ringMat.opacity = (c >= 6 && c < 10 ? 0.5 : 0.22) + Math.sin(t * 3) * 0.08;
      stars.rotation.y = t * 0.08; stars.material.opacity = 0.7 + Math.sin(t * 2) * 0.3;
    };
  }
  if (SKINS[id]?.flip) tick = flipbook(g, SKINS[id].flip, base, R, H, world);
  g.userData.update = (t, dt) => { costumeTick(t, dt); tick(t, dt); };
  return g;
}
