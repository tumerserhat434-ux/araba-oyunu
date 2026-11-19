// =====================================================================
//  DEMİR SANCAK — şehir hayatı: köylüler, öküz arabaları, kuşlar,
//  çeşme, fenerler, pazar tezgâhları, çalılar
// =====================================================================
import * as THREE from 'three';
import { createCitizen, animateUnit } from './units.js?v=2611191831';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const MC = new Map();
const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!MC.has(k)) MC.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o })); return MC.get(k); };
const GC = new Map();
const geo = (k, f) => { if (!GC.has(k)) GC.set(k, f()); return GC.get(k); };
function M(g, m, p, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.scale.set(sx, sy, sz); o.castShadow = true; p.add(o); return o; }
const taper = (rt, rb, l) => geo(`t${rt}${rb}${l}`, () => new THREE.CylinderGeometry(rt, rb, l, 8).translate(0, -l / 2, 0));
const sph = () => geo('s', () => new THREE.SphereGeometry(1, 10, 8));
const box = () => geo('b', () => new THREE.BoxGeometry(1, 1, 1));

// ---------------------------------------------------------------------
//  Köylü
// ---------------------------------------------------------------------
const TUNICS = ['#8a3a2a', '#3a5a8a', '#5a7a3a', '#8a6a3a', '#6a4a7a', '#a08a5a', '#4a6a6a', '#b0704a'];
const SKIN = ['#e0b090', '#c99a74', '#d6a882', '#a87650'];
export function createVillager(opts = {}) {
  const root = new THREE.Group();
  const tunic = mat(opts.tunic || pick(TUNICS)), skin = mat(pick(SKIN), { roughness: 0.6 }), pants = mat(pick(['#4a3a2a', '#3a3a3a', '#5a4a3a'])), shoe = mat('#2a1a10');
  const female = opts.female ?? Math.random() < 0.4;
  const hips = new THREE.Group(); hips.position.y = 0.88; root.add(hips);
  const body = new THREE.Group(); hips.add(body);
  M(geo('torso' + female, () => new THREE.LatheGeometry([[0, -0.02], [0.14, 0], [0.13, 0.12], [0.15, 0.3], [0.16, 0.4], [0.12, 0.47], [0.05, 0.5]].map(([a, b]) => new THREE.Vector2(a, b)), 12)), tunic, body, 0, 0, 0, 0, 0, 0, 1, 1, 0.75);
  M(geo('skirt' + female, () => new THREE.CylinderGeometry(0.15, female ? 0.27 : 0.2, female ? 0.62 : 0.28, 12, 1, true).translate(0, female ? -0.31 : -0.14, 0)), tunic, body, 0, 0.02, 0, 0, 0, 0, 1, 1, 0.8).material.side = THREE.DoubleSide;
  M(geo('belt', () => new THREE.TorusGeometry(0.145, 0.015, 4, 14).rotateX(Math.PI / 2)), mat('#3a2414'), body, 0, 0.06, 0, 0, 0, 0, 1, 1, 0.78);
  const head = new THREE.Group(); head.position.y = 0.62; body.add(head);
  M(sph(), skin, head, 0, 0, 0, 0, 0, 0, 0.1, 0.115, 0.105);
  M(taper(0.04, 0.045, 0.08), skin, head, 0, -0.08, 0);
  const hair = mat(pick(['#2a1a10', '#4a2a14', '#6a4020', '#1a1410', '#8a6a40']));
  const hat = opts.hat ?? pick(['straw', 'cap', 'none', 'hood', 'scarf']);
  if (hat === 'straw') { M(geo('straw', () => new THREE.ConeGeometry(0.22, 0.12, 14)), mat('#d8b860'), head, 0, 0.12, 0); }
  else if (hat === 'cap') { M(geo('cap', () => new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2)), mat(pick(['#8a2a2a', '#2a4a8a', '#4a4a2a'])), head, 0, 0.03, -0.01, -0.2, 0, 0, 0.11, 0.09, 0.115); }
  else if (hat === 'hood') { M(geo('hood', () => new THREE.SphereGeometry(0.125, 10, 8, Math.PI / 2 + 0.9, Math.PI * 2 - 1.8, 0, Math.PI * 0.7)), tunic, head, 0, 0.01, -0.01).material.side = THREE.DoubleSide; }
  else if (hat === 'scarf' || female) { M(geo('hairf', () => new THREE.SphereGeometry(1, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6)), hair, head, 0, 0.02, -0.01, -0.3, 0, 0, 0.108, 0.12, 0.115); M(sph(), hair, head, 0, -0.08, -0.1, 0, 0, 0, 0.05, 0.08, 0.04); }
  else M(geo('hairm', () => new THREE.SphereGeometry(1, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5)), hair, head, 0, 0.02, -0.01, -0.25, 0, 0, 0.105, 0.11, 0.11);
  const arms = [], legs = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.17, 0.44, 0); body.add(sh);
    M(taper(0.045, 0.038, 0.28), tunic, sh);
    const el = new THREE.Group(); el.position.y = -0.27; sh.add(el);
    M(taper(0.035, 0.03, 0.24), skin, el); M(sph(), skin, el, 0, -0.26, 0, 0, 0, 0, 0.035, 0.045, 0.03);
    arms.push({ sh, el });
    const hp = new THREE.Group(); hp.position.set(s * 0.08, -0.02, 0); hips.add(hp);
    M(taper(0.06, 0.045, 0.43), pants, hp);
    const kn = new THREE.Group(); kn.position.y = -0.42; hp.add(kn);
    M(taper(0.045, 0.035, 0.4), pants, kn);
    M(geo('shoe', () => { const g = new THREE.SphereGeometry(1, 8, 6); g.translate(0, 0, 0.4); return g; }), shoe, kn, 0, -0.42, 0, 0, 0, 0, 0.045, 0.035, 0.1);
    legs.push({ hp, kn });
  }
  // taşınan eşya
  const carry = opts.carry ?? pick(['none', 'none', 'sack', 'logs', 'basket', 'tool']);
  let tool = null;
  if (carry === 'sack') M(sph(), mat('#c8b080'), body, 0.12, 0.52, -0.06, 0, 0, 0.4, 0.15, 0.12, 0.13);
  else if (carry === 'logs') { for (let i = 0; i < 3; i++) M(geo('log', () => new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6).rotateZ(Math.PI / 2)), mat('#6a4a2a'), body, 0, 0.55 + i * 0.03, -0.12 + i * 0.07); }
  else if (carry === 'basket') M(geo('basket', () => new THREE.CylinderGeometry(0.12, 0.09, 0.14, 10)), mat('#a07a40'), arms[1].el, 0, -0.32, 0.05);
  else if (carry === 'tool' || opts.work) {
    tool = new THREE.Group(); arms[0].el.add(tool); tool.position.y = -0.28;
    M(geo('handle', () => new THREE.CylinderGeometry(0.015, 0.015, 0.45, 5).translate(0, -0.15, 0)), mat('#7a5a34'), tool, 0, 0, 0, 0, 0, 0);
    M(box(), mat('#5a5a60', { metalness: 0.8, roughness: 0.4 }), tool, 0, -0.36, 0.03, 0, 0, 0, 0.05, 0.08, 0.13);
    tool.rotation.x = -1.2;
  }
  root.userData = { hips, body, head, arms, legs, carry, ph: Math.random() * 10 };
  return root;
}
export function animVillager(v, state, t) {
  const u = v.userData, ph = t * 7 + u.ph, s = Math.sin(ph);
  const [aR, aL] = u.arms, [lR, lL] = u.legs;
  if (state === 'walk') {
    lR.hp.rotation.x = -s * 0.55; lL.hp.rotation.x = s * 0.55;
    lR.kn.rotation.x = Math.max(0, s) * 0.8 + 0.05; lL.kn.rotation.x = Math.max(0, -s) * 0.8 + 0.05;
    u.hips.position.y = 0.88 + Math.abs(Math.cos(ph)) * 0.025;
    const carrying = u.carry === 'sack' || u.carry === 'logs';
    aR.sh.rotation.x = carrying ? -2.6 : s * 0.5; aL.sh.rotation.x = u.carry === 'basket' ? -0.3 : -s * 0.5;
    aR.el.rotation.x = carrying ? -0.6 : -0.3; aL.el.rotation.x = u.carry === 'basket' ? -1.3 : -0.3;
    u.body.rotation.x = 0.04;
  } else if (state === 'work') {
    const w = (t * 1.6 + u.ph) % 1, k = w < 0.6 ? w / 0.6 : 1 - (w - 0.6) / 0.4;
    aR.sh.rotation.x = -0.6 - k * 2.0; aR.el.rotation.x = -0.4; aL.sh.rotation.x = -0.4; aL.el.rotation.x = -0.8;
    u.body.rotation.x = 0.25 - k * 0.15; lR.hp.rotation.x = -0.25; lL.hp.rotation.x = 0.2; lR.kn.rotation.x = 0.3; lL.kn.rotation.x = 0.1;
    u.hips.position.y = 0.85;
  } else {
    for (const L of [lR, lL]) { L.hp.rotation.x *= 0.8; L.kn.rotation.x *= 0.8; }
    aR.sh.rotation.x = u.carry === 'sack' || u.carry === 'logs' ? -2.6 : Math.sin(t * 1.3 + u.ph) * 0.05;
    aL.sh.rotation.x = Math.sin(t * 1.1 + u.ph) * 0.05; u.body.rotation.x = 0; u.head.rotation.y = Math.sin(t * 0.6 + u.ph) * 0.5;
    u.hips.position.y = 0.88 + Math.sin(t * 2 + u.ph) * 0.005;
  }
}

// ---------------------------------------------------------------------
//  Öküz arabası
// ---------------------------------------------------------------------
function createCart(cargo) {
  const g = new THREE.Group();
  const wood = mat('#7a5634'), dark = mat('#4a3420'), ox = mat('#8a6a4a');
  M(box(), wood, g, 0, 0.75, -0.9, 0, 0, 0, 1.1, 0.12, 1.6);
  for (const s of [-1, 1]) M(box(), wood, g, s * 0.55, 0.95, -0.9, 0, 0, 0, 0.06, 0.35, 1.6);
  M(box(), wood, g, 0, 0.95, -1.7, 0, 0, 0, 1.1, 0.35, 0.06);
  const wheels = [];
  for (const s of [-1, 1]) { const w = M(geo('wheel', () => new THREE.CylinderGeometry(0.42, 0.42, 0.08, 14).rotateZ(Math.PI / 2)), dark, g, s * 0.62, 0.42, -0.9); wheels.push(w); M(geo('hub', () => new THREE.TorusGeometry(0.38, 0.03, 4, 14).rotateY(Math.PI / 2)), wood, w); }
  for (const s of [-1, 1]) M(box(), wood, g, s * 0.25, 0.7, 0.4, 0.1, 0, 0, 0.06, 0.06, 1.6);
  if (cargo === 'hay') M(geo('hay', () => new THREE.SphereGeometry(1, 10, 6)), mat('#d8b860'), g, 0, 1.15, -0.9, 0, 0, 0, 0.5, 0.35, 0.75);
  else if (cargo === 'logs') { for (let i = 0; i < 5; i++) M(geo('clog', () => new THREE.CylinderGeometry(0.14, 0.14, 1.5, 8).rotateX(Math.PI / 2)), mat('#6a4a2a'), g, -0.3 + (i % 3) * 0.3, 0.95 + Math.floor(i / 3) * 0.25, -0.9); }
  else { for (let i = 0; i < 4; i++) M(box(), mat('#9a948a', { flatShading: true }), g, -0.25 + (i % 2) * 0.5, 0.98, -1.3 + Math.floor(i / 2) * 0.7, 0, rand(0, 1), 0, 0.4, 0.3, 0.4); }
  // öküz
  const o = new THREE.Group(); o.position.set(0, 0, 1.4); g.add(o);
  M(geo('oxb', () => new THREE.CapsuleGeometry(0.32, 0.8, 4, 10).rotateX(Math.PI / 2)), ox, o, 0, 0.85, 0, 0, 0, 0, 0.9, 1, 1);
  const head = new THREE.Group(); head.position.set(0, 0.95, 0.7); o.add(head);
  M(sph(), ox, head, 0, 0, 0.1, 0, 0, 0, 0.2, 0.2, 0.28); M(sph(), mat('#d8c8b0'), head, 0, -0.06, 0.32, 0, 0, 0, 0.13, 0.1, 0.1);
  for (const s of [-1, 1]) M(geo('horn', () => new THREE.ConeGeometry(0.03, 0.22, 5)), mat('#e8e0d0'), head, s * 0.16, 0.14, 0.05, 0, 0, -s * 1.1);
  const legs = [];
  for (const [x, z] of [[-0.18, 0.4], [0.18, 0.4], [-0.18, -0.4], [0.18, -0.4]]) { const L = new THREE.Group(); L.position.set(x, 0.7, z); o.add(L); M(taper(0.08, 0.05, 0.7), ox, L); legs.push(L); }
  M(box(), wood, o, 0, 1.2, 0.55, 0, 0, 0, 0.8, 0.08, 0.08);
  g.userData = { wheels, legs, head };
  return g;
}

// ---------------------------------------------------------------------
//  Kuşlar
// ---------------------------------------------------------------------
function createBird() {
  const g = new THREE.Group(), m2 = mat('#2a2a30', { side: THREE.DoubleSide });
  M(geo('bbody', () => new THREE.ConeGeometry(0.12, 0.6, 5).rotateX(Math.PI / 2)), m2, g);
  const wings = [];
  for (const s of [-1, 1]) { const w = new THREE.Group(); g.add(w); M(geo('wing', () => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.7, -0.1); sh.lineTo(0.5, 0.18); sh.lineTo(0, 0.2); return new THREE.ShapeGeometry(sh).rotateX(Math.PI / 2); }), m2, w, 0, 0, 0, 0, 0, 0, s, 1, 1); wings.push(w); }
  g.userData.wings = wings;
  return g;
}

// ---------------------------------------------------------------------
//  Çeşme, fener, tezgâh
// ---------------------------------------------------------------------
function createFountain(stoneMat) {
  const g = new THREE.Group();
  const st = stoneMat || mat('#b8b0a0');
  M(geo('fbase', () => new THREE.CylinderGeometry(1.7, 1.8, 0.5, 20)), st, g, 0, 0.25, 0);
  M(geo('fwater', () => new THREE.CylinderGeometry(1.5, 1.5, 0.05, 20)), mat('#4aa0d0', { roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.85 }), g, 0, 0.46, 0);
  M(geo('fcol', () => new THREE.CylinderGeometry(0.18, 0.25, 1.2, 10)), st, g, 0, 0.9, 0);
  M(geo('fbowl', () => new THREE.CylinderGeometry(0.7, 0.35, 0.25, 16)), st, g, 0, 1.5, 0);
  M(geo('ftop', () => new THREE.SphereGeometry(0.16, 10, 8)), mat('#e0b040', { metalness: 1, roughness: 0.3 }), g, 0, 1.8, 0);
  // su damlaları (parçacık)
  const n = 60, pg = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), dat = [];
  for (let i = 0; i < n; i++) dat.push({ a: Math.random() * 6.28, o: Math.random(), v: rand(0.9, 1.3) });
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xd8f0ff, size: 0.09, transparent: true, opacity: 0.85 }));
  g.add(pts);
  g.userData.update = (t) => {
    for (let i = 0; i < n; i++) { const d = dat[i], u = (t * 0.9 * d.v + d.o) % 1, r = 0.15 + u * 0.75; pos[i * 3] = Math.cos(d.a) * r; pos[i * 3 + 1] = 1.85 + u * 0.6 - u * u * 1.85; pos[i * 3 + 2] = Math.sin(d.a) * r; }
    pg.attributes.position.needsUpdate = true;
  };
  return g;
}
function createStall(color) {
  const g = new THREE.Group(), wood = mat('#7a5634'), cloth = mat(color, { side: THREE.DoubleSide });
  M(box(), wood, g, 0, 0.45, 0, 0, 0, 0, 1.8, 0.9, 0.8);
  for (const [x, z] of [[-0.85, -0.35], [0.85, -0.35], [-0.85, 0.5], [0.85, 0.5]]) M(geo('spost', () => new THREE.CylinderGeometry(0.04, 0.04, 2, 6)), wood, g, x, 1.0, z);
  const aw = M(geo('awn', () => new THREE.PlaneGeometry(2.1, 1.3, 6, 1)), cloth, g, 0, 2.0, 0.1, -Math.PI / 2 + 0.35, 0, 0);
  for (let i = 0; i < 6; i++) M(sph(), mat(pick(['#e83a3a', '#f0c030', '#7ac040', '#e8823a', '#8a3ac0'])), g, -0.7 + i * 0.28, 0.98, rand(-0.2, 0.2), 0, 0, 0, 0.1);
  M(box(), mat('#c8a060'), g, 0.5, 1.0, 0.1, 0, 0.3, 0, 0.3, 0.2, 0.3);
  return g;
}

// ---------------------------------------------------------------------
//  Kurulum
// ---------------------------------------------------------------------
export function createLife(scene, { roads, plotsCenter, mobile = false, makeLamp, makeBush, fountainAt, stalls }) {
  const out = { update: () => {} };
  const villagers = [], carts = [], flocks = [];
  // yol grafiği: her yol [merkez → ... → arsa]
  const paths = roads.map((L) => L.map(([x, z]) => new THREE.Vector2(x, z)));
  const pathLen = (P) => { let l = 0; for (let i = 0; i < P.length - 1; i++) l += P[i].distanceTo(P[i + 1]); return l; };
  const at = (P, d, off) => {
    let acc = 0;
    for (let i = 0; i < P.length - 1; i++) {
      const l = P[i].distanceTo(P[i + 1]);
      if (acc + l >= d || i === P.length - 2) {
        const u = Math.min(1, Math.max(0, (d - acc) / l)), dx = P[i + 1].x - P[i].x, dz = P[i + 1].y - P[i].y, n = Math.hypot(dx, dz) || 1;
        return { x: P[i].x + dx * u - (dz / n) * off, z: P[i].y + dz * u + (dx / n) * off, dir: Math.atan2(dx, dz) };
      }
      acc += l;
    }
    return { x: 0, z: 0, dir: 0 };
  };
  const startD = 10.6;
  const NV = mobile ? 12 : 18;
  for (let i = 0; i < NV; i++) {
    const v = createCitizen(i) || createVillager(); scene.add(v);
    const P = pick(paths);
    villagers.push({ v, P, L: pathLen(P), d: rand(startD, pathLen(P)), dirSign: Math.random() < 0.5 ? 1 : -1, off: rand(-0.7, 0.7), speed: rand(1.1, 1.4), wait: 0, plaza: null });
  }
  const cartRoads = paths.filter((P) => { const e = P[P.length - 1]; return Math.abs(e.x) > 20; });
  for (let i = 0; i < 0; i++) {
    const P = cartRoads[i % cartRoads.length], e = P[P.length - 1];
    const cargo = Math.abs(e.y) > 18 ? 'stone' : e.x < 0 ? 'hay' : 'logs';
    const c = createCart(cargo); scene.add(c);
    const driver = createVillager({ carry: 'none', hat: 'straw' }); driver.position.set(-0.75, 0, 1.1); c.add(driver);
    carts.push({ c, driver, P, L: pathLen(P), d: rand(startD, pathLen(P)), dirSign: 1, speed: 1.6, wait: 0 });
  }
  for (let f = 0; f < 2; f++) {
    const birds = [];
    for (let i = 0; i < 5; i++) { const b = createBird(); scene.add(b); birds.push({ b, ox: (i % 3 - 1) * 1.6, oz: -Math.abs(i - 2) * 1.4, ph: Math.random() * 6 }); }
    flocks.push({ birds, r: rand(35, 60), h: rand(22, 32), sp: rand(0.05, 0.09) * (f ? -1 : 1), a: Math.random() * 6.28 });
  }
  // çeşme, fenerler, tezgâhlar, çalılar
  let fountain = null;
  if (fountainAt) { fountain = createFountain(); fountain.position.set(fountainAt[0], 0, fountainAt[1]); scene.add(fountain); }
  for (const [x, z, col, ry] of stalls || []) { const s = createStall(col); s.position.set(x, 0, z); s.rotation.y = ry; scene.add(s); }
  const lampSpots = [], bushSpots = [];
  for (const P of paths) {
    const L = pathLen(P);
    for (let d = startD + 3; d < L - 6; d += 8.5) { const side = (Math.round(d / 8.5) % 2 ? 1 : -1); const p = at(P, d, side * 1.85); lampSpots.push([p.x, p.z]); }
    for (let d = startD + 6; d < L - 7; d += rand(3, 6)) { if (Math.random() < 0.5) continue; const side = Math.random() < 0.5 ? 1 : -1; const p = at(P, d, side * 2.1); bushSpots.push([p.x, p.z]); }
  }
  if (makeLamp) scene.add(makeLamp(lampSpots));
  if (makeBush) scene.add(makeBush(bushSpots));

  out.update = (t, dt) => {
    for (const w of villagers) {
      const anim = (st) => (w.v.userData.kk ? animateUnit(w.v, st, t, dt) : animVillager(w.v, st, t));
      if (w.wait > 0) { w.wait -= dt; anim('idle'); continue; }
      w.d += w.dirSign * w.speed * dt;
      if (w.d >= w.L - 3.5) { w.d = w.L - 3.5; w.dirSign = -1; w.wait = rand(1.5, 5); }
      if (w.d <= startD) { // meydana ulaştı: başka yola geç
        w.P = pick(paths); w.L = pathLen(w.P); w.d = startD + 0.01; w.dirSign = 1; w.off = rand(-0.7, 0.7); if (Math.random() < 0.3) w.wait = rand(1, 3);
      }
      const p = at(w.P, w.d, w.off * w.dirSign);
      w.v.position.set(p.x, 0, p.z); w.v.rotation.y = p.dir + (w.dirSign < 0 ? Math.PI : 0);
      anim('walk');
    }
    for (const c of carts) {
      if (c.wait > 0) { c.wait -= dt; animVillager(c.driver, 'idle', t); continue; }
      c.d += c.dirSign * c.speed * dt;
      if (c.d >= c.L - 5) { c.d = c.L - 5; c.dirSign = -1; c.wait = 3; }
      if (c.d <= startD + 2) { c.d = startD + 2; c.dirSign = 1; c.wait = 3; }
      const p = at(c.P, c.d, 0.6 * c.dirSign);
      c.c.position.set(p.x, 0, p.z); c.c.rotation.y = p.dir + (c.dirSign < 0 ? Math.PI : 0);
      for (const wl of c.c.userData.wheels) wl.rotation.x += c.speed * dt / 0.42;
      c.c.userData.legs.forEach((L, i) => { L.rotation.x = Math.sin(t * 5 + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.35; });
      c.c.userData.head.rotation.x = Math.sin(t * 2.5) * 0.08;
      animVillager(c.driver, 'walk', t);
    }
    for (const f of flocks) {
      f.a += f.sp * dt;
      const cx = Math.cos(f.a) * f.r, cz = Math.sin(f.a) * f.r, dir = Math.atan2(-Math.sin(f.a) * Math.sign(f.sp), Math.cos(f.a) * Math.sign(f.sp));
      for (const b of f.birds) {
        const c = Math.cos(dir), s = Math.sin(dir);
        b.b.position.set(cx + b.ox * c + b.oz * s, f.h + Math.sin(t + b.ph) * 0.5, cz - b.ox * s + b.oz * c);
        b.b.rotation.y = dir;
        const fl = Math.sin(t * 8 + b.ph) * 0.6;
        b.b.userData.wings[0].rotation.z = fl; b.b.userData.wings[1].rotation.z = -fl;
      }
    }
    if (fountain) fountain.userData.update(t);
  };
  return out;
}
