// =====================================================================
//  DEMİR SANCAK — prosedürel 3D askerler, atlar ve kahramanlar
//  Gerçekçi oranlar (≈7.5 baş boy), zincir zırh, plaka zırh, tabard,
//  kalkan amblemleri, silahlar ve iskelet tabanlı animasyon.
// =====================================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as A from './assets.js?v=2611191932';

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));

// ---------------------------------------------------------------------
//  Önbellekler
// ---------------------------------------------------------------------
const GC = new Map(), MC = new Map(), TC = new Map();
const gm = (k, f) => { if (!GC.has(k)) GC.set(k, f()); return GC.get(k); };
const mm = (k, f) => { if (!MC.has(k)) MC.set(k, f()); return MC.get(k); };
const tm = (k, f) => { if (!TC.has(k)) TC.set(k, f()); return TC.get(k); };
export function disposeUnitCaches() { GC.forEach((g) => g.dispose()); MC.forEach((m) => m.dispose()); TC.forEach((t) => t.dispose()); GC.clear(); MC.clear(); TC.clear(); }

function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function toTex(c, srgb = true, rep = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; }
function heightNormal(c, s = 2) {
  const w = c.width, h = c.height, d = c.getContext('2d').getImageData(0, 0, w, h).data;
  const [o, x] = cnv(w, h), img = x.createImageData(w, h);
  const L = (i, j) => d[(((j + h) % h) * w + ((i + w) % w)) * 4] / 255;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const dx = (L(i + 1, j) - L(i - 1, j)) * s, dy = (L(i, j + 1) - L(i, j - 1)) * s, l = Math.hypot(dx, dy, 1), k = (j * w + i) * 4;
    img.data[k] = (-dx / l * 0.5 + 0.5) * 255; img.data[k + 1] = (dy / l * 0.5 + 0.5) * 255; img.data[k + 2] = (0.5 / l + 0.5) * 255; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return toTex(o, false);
}

// --- Dokular ---
const texMail = () => tm('mail', () => {
  const [c, x] = cnv(64, 64), [hc, hx] = cnv(64, 64);
  x.fillStyle = '#2a2a2e'; x.fillRect(0, 0, 64, 64); hx.fillStyle = '#000'; hx.fillRect(0, 0, 64, 64);
  x.lineWidth = 2.2; hx.lineWidth = 2.6;
  for (let r = 0; r < 9; r++) for (let k = -1; k < 9; k++) {
    const cx = k * 8 + (r % 2 ? 4 : 0), cy = r * 8;
    x.strokeStyle = `rgb(${170 + rand(-20, 20)},${172 + rand(-20, 20)},${178})`; x.beginPath(); x.arc(cx, cy, 3.6, 0, TAU); x.stroke();
    hx.strokeStyle = '#fff'; hx.beginPath(); hx.arc(cx, cy, 3.6, 0, TAU); hx.stroke();
  }
  return { map: toTex(c), normal: heightNormal(hc, 3) };
});
const texQuilt = () => tm('quilt', () => {
  const [c, x] = cnv(128, 128), [hc, hx] = cnv(128, 128);
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 128); hx.fillStyle = '#fff'; hx.fillRect(0, 0, 128, 128);
  x.strokeStyle = 'rgba(0,0,0,.28)'; x.lineWidth = 2; hx.strokeStyle = '#000'; hx.lineWidth = 3;
  for (let i = -128; i < 256; i += 21) { for (const ctx of [x, hx]) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 128, 128); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i + 128, 0); ctx.lineTo(i, 128); ctx.stroke(); } }
  for (let i = 0; i < 1500; i++) { x.fillStyle = `rgba(0,0,0,${rand(0.02, 0.08)})`; x.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }
  return { map: toTex(c), normal: heightNormal(hc, 1.5) };
});
const texLeather = () => tm('leather', () => {
  const [c, x] = cnv(128, 128), [hc, hx] = cnv(128, 128);
  x.fillStyle = '#fff'; x.fillRect(0, 0, 128, 128); hx.fillStyle = '#888'; hx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 2500; i++) { const v = rand(0, 0.12); x.fillStyle = `rgba(0,0,0,${v})`; const px = Math.random() * 128, py = Math.random() * 128; x.fillRect(px, py, rand(1, 4), rand(1, 2)); hx.fillStyle = Math.random() < 0.5 ? '#777' : '#999'; hx.fillRect(px, py, 2, 2); }
  return { map: toTex(c), normal: heightNormal(hc, 1) };
});
const texCloth = () => tm('cloth', () => {
  const [c, x] = cnv(64, 64); x.fillStyle = '#fff'; x.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 64; i += 2) { x.fillStyle = 'rgba(0,0,0,.05)'; x.fillRect(i, 0, 1, 64); x.fillRect(0, i, 64, 1); }
  return toTex(c);
});
const texWood = () => tm('wood', () => {
  const [c, x] = cnv(32, 128); x.fillStyle = '#7a5434'; x.fillRect(0, 0, 32, 128);
  for (let i = 0; i < 40; i++) { x.strokeStyle = `rgba(${rand(30, 60)},${rand(18, 35)},10,${rand(0.2, 0.5)})`; x.beginPath(); const px = Math.random() * 32; x.moveTo(px, 0); x.bezierCurveTo(px + rand(-4, 4), 40, px + rand(-4, 4), 80, px, 128); x.stroke(); }
  return toTex(c);
});
// Amblem: mavi = altın yıldız-güneş, kırmızı = altın kule
function drawEmblem(x, cx, cy, s, team, gold = '#f3c24a') {
  x.fillStyle = gold; x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = s * 0.04;
  x.beginPath();
  if (team === 'blue') {
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU - Math.PI / 2, r = i % 2 ? s * 0.42 : s; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    x.closePath(); x.fill(); x.stroke();
    x.fillStyle = shadeHex(teamColor(team), 0.8); x.beginPath(); x.arc(cx, cy, s * 0.28, 0, TAU); x.fill();
    x.fillStyle = gold; x.beginPath(); x.arc(cx, cy, s * 0.16, 0, TAU); x.fill();
  } else {
    const w = s * 0.9, h = s * 1.3;
    x.moveTo(cx - w / 2, cy + h / 2); x.lineTo(cx - w / 2, cy - h / 4);
    for (let i = 0; i < 3; i++) { const bx = cx - w / 2 + (i / 3) * w; x.lineTo(bx, cy - h / 2); x.lineTo(bx + w / 6, cy - h / 2); x.lineTo(bx + w / 6, cy - h / 4 - h * 0.08); x.lineTo(bx + w / 3, cy - h / 4 - h * 0.08); }
    x.lineTo(cx + w / 2, cy - h / 2); x.lineTo(cx + w / 2, cy + h / 2); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = '#1a0a08'; x.beginPath(); x.arc(cx, cy + h * 0.2, w * 0.16, Math.PI, 0); x.rect(cx - w * 0.16, cy + h * 0.2, w * 0.32, h * 0.3); x.fill();
  }
}
const TEAM = { blue: '#2f62c8', red: '#b8302a' };
const teamColor = (t) => TEAM[t] || t;
function shadeHex(hex, k) { return '#' + new THREE.Color(hex).multiplyScalar(k).getHexString(); }
const texTabard = (team, col, trim) => tm('tab' + team + col + trim, () => {
  const [c, x] = cnv(256, 256);
  x.fillStyle = col; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2000; i++) { x.fillStyle = `rgba(0,0,0,${rand(0.02, 0.07)})`; x.fillRect(Math.random() * 256, Math.random() * 256, 2, 1); }
  x.fillStyle = trim; x.fillRect(0, 238, 256, 18); x.fillRect(0, 0, 256, 8);
  drawEmblem(x, 128, 112, 54, team === 'blue' || team === 'red' ? team : 'blue', trim);
  return toTex(c, true, false);
});
const texShield = (team) => tm('shield' + team, () => {
  const [c, x] = cnv(256, 256), col = teamColor(team);
  const g = x.createRadialGradient(128, 110, 10, 128, 128, 140); g.addColorStop(0, shadeHex(col, 1.2)); g.addColorStop(1, shadeHex(col, 0.7));
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  x.strokeStyle = '#f3c24a'; x.lineWidth = 10; x.beginPath(); x.arc(128, 128, 112, 0, TAU); x.stroke();
  for (let i = 0; i < 1500; i++) { x.fillStyle = `rgba(0,0,0,${rand(0.03, 0.1)})`; x.fillRect(Math.random() * 256, Math.random() * 256, rand(1, 5), 1); }
  drawEmblem(x, 128, 128, 62, team);
  return toTex(c, true, false);
});

// --- Malzemeler ---
const METALS = { steel: [0xc8ccd2, 0.95, 0.3], dark: [0x4a4c54, 0.9, 0.38], gold: [0xe0b040, 1, 0.25], bronze: [0xb07a3a, 0.95, 0.35] };
const matMetal = (k) => mm('metal' + k, () => { const [c, m, r] = METALS[k] || METALS.steel; return new THREE.MeshStandardMaterial({ color: c, metalness: m, roughness: r }); });
const matMail = (k = 'steel') => mm('mail' + k, () => { const t = texMail(); const [c] = METALS[k] || METALS.steel; const m = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normal, color: c, metalness: 0.85, roughness: 0.45 }); return m; });
const matCloth = (col) => mm('cloth' + col, () => new THREE.MeshStandardMaterial({ map: texCloth(), color: col, roughness: 0.92 }));
const matQuilt = (col) => mm('quilt' + col, () => { const t = texQuilt(); return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normal, color: col, roughness: 0.95 }); });
const matLeather = (col) => mm('leather' + col, () => { const t = texLeather(); return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normal, color: col, roughness: 0.7 }); });
const matSkin = (col) => mm('skin' + col, () => new THREE.MeshStandardMaterial({ color: col, roughness: 0.62 }));
const matHair = (col) => mm('hair' + col, () => new THREE.MeshStandardMaterial({ color: col, roughness: 0.75 }));
const matWood = () => mm('wood', () => new THREE.MeshStandardMaterial({ map: texWood(), roughness: 0.7 }));
const matTabard = (team, col, trim) => mm('tabm' + team + col + trim, () => new THREE.MeshStandardMaterial({ map: texTabard(team, col, trim), roughness: 0.9, side: THREE.DoubleSide }));
const matShield = (team) => mm('shm' + team, () => new THREE.MeshStandardMaterial({ map: texShield(team), roughness: 0.6, metalness: 0.05 }));
const matBasic = (k, col, o = {}) => mm(k, () => new THREE.MeshStandardMaterial({ color: col, roughness: 0.6, ...o }));
const matEye = () => mm('eye', () => new THREE.MeshStandardMaterial({ color: 0xf4f0ea, roughness: 0.2 }));
const matIris = () => mm('iris', () => new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.15 }));
const matStrapDark = () => matLeather('#3a2414');

// --- Geometri yardımcıları ---
const taper = (rt, rb, len, seg = 10) => gm(`tp${rt}_${rb}_${len}_${seg}`, () => new THREE.CylinderGeometry(rt, rb, len, seg, 1).translate(0, -len / 2, 0));
const sph = (seg = 12, rings = 9) => gm('sph' + seg + '_' + rings, () => new THREE.SphereGeometry(1, seg, rings));
const box = () => gm('box', () => new THREE.BoxGeometry(1, 1, 1));
const lathe = (key, pts, seg = 16, ps = 0, pl = TAU) => gm('la' + key, () => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg, ps, pl));
function mesh(geo, mat, parent, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

// ---------------------------------------------------------------------
//  Silahlar (tutma noktası orijinde, ucu -Y yönünde)
// ---------------------------------------------------------------------
function bladeGeo(len, w, key) {
  return gm('blade' + key, () => {
    const g = new THREE.BoxGeometry(w, len, 0.012, 1, 4, 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), t = (y + len / 2) / len; const k = t < 0.15 ? t / 0.15 : 1; p.setX(i, p.getX(i) * (0.35 + 0.65 * k)); if (Math.abs(p.getX(i)) > w * 0.2) p.setZ(i, p.getZ(i) * 0.25); }
    g.computeVertexNormals(); g.translate(0, -len / 2, 0); return g;
  });
}
function makeWeapon(kind, metal = 'steel', team = 'blue', accent = null) {
  const w = new THREE.Group(), mt = matMetal(metal), steel = matMetal('steel'), wood = matWood(), lea = matStrapDark();
  if (kind === 'sword') {
    mesh(sph(8, 6), mt, w, 0, 0.08, 0, 0, 0, 0, 0.028);
    mesh(taper(0.017, 0.017, 0.11, 8), lea, w, 0, 0.065, 0);
    mesh(box(), mt, w, 0, -0.05, 0, 0, 0, 0, 0.19, 0.022, 0.035);
    const b = mesh(bladeGeo(0.78, 0.048, 's'), steel, w, 0, -0.06, 0);
    if (accent) { b.material = accent; }
  } else if (kind === 'axe') {
    mesh(taper(0.019, 0.022, 0.85, 8), wood, w, 0, 0.12, 0);
    const sh = new THREE.Shape(); sh.moveTo(0, 0.05); sh.quadraticCurveTo(0.12, 0.09, 0.2, 0.15); sh.quadraticCurveTo(0.24, 0, 0.2, -0.15); sh.quadraticCurveTo(0.12, -0.09, 0, -0.05); sh.closePath();
    const hg = gm('axehead', () => new THREE.ExtrudeGeometry(sh, { depth: 0.018, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.005, bevelSegments: 1 }).translate(0, 0, -0.009));
    mesh(hg, accent || steel, w, 0.01, -0.62, 0, 0, Math.PI / 2, 0);
    mesh(box(), mt, w, 0, -0.62, 0, 0, 0, 0, 0.05, 0.1, 0.05);
  } else if (kind === 'hammer') {
    mesh(taper(0.02, 0.024, 0.95, 8), wood, w, 0, 0.12, 0);
    mesh(box(), accent || mt, w, 0, -0.76, 0, 0, 0, 0, 0.12, 0.13, 0.26);
    mesh(box(), mt, w, 0, -0.76, 0, 0, 0, 0, 0.14, 0.04, 0.28);
    mesh(new THREE.ConeGeometry(0.03, 0.12, 6), mt, w, 0, -0.86, 0, Math.PI);
  } else if (kind === 'spear') {
    mesh(taper(0.017, 0.019, 2.35, 7), wood, w, 0, 0.9, 0);
    const head = gm('spearhead', () => new THREE.LatheGeometry([[0, 0], [0.032, 0.05], [0.02, 0.24], [0, 0.3]].map(([r, y]) => new THREE.Vector2(r, y)), 6).rotateX(Math.PI).scale(1, 1, 0.35));
    mesh(head, accent || steel, w, 0, -1.43, 0);
    mesh(taper(0.024, 0.02, 0.07, 8), mt, w, 0, -1.4, 0);
    mesh(taper(0.022, 0.022, 0.05, 8), mt, w, 0, 0.92, 0);
  } else if (kind === 'lance') {
    const lg = gm('lance', () => new THREE.LatheGeometry([[0.03, 0.45], [0.035, 0.0], [0.06, -0.05], [0.03, -0.2], [0.012, -2.9], [0, -3.05]].map(([r, y]) => new THREE.Vector2(r, y)), 8));
    mesh(lg, matCloth(team === 'red' ? '#e8d8c8' : '#e8e4d8'), w);
    mesh(gm('vamp', () => new THREE.ConeGeometry(0.12, 0.22, 12, 1, true).rotateX(Math.PI)), mt, w, 0, -0.12, 0);
    const pg = gm('pennant', () => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.42, -0.08); s.lineTo(0, -0.22); s.closePath(); return new THREE.ShapeGeometry(s); });
    mesh(pg, matBasic('pen' + team, teamColor(team), { side: THREE.DoubleSide, roughness: 0.9 }), w, 0.01, -2.35, 0, 0, Math.PI / 2, 0);
  } else if (kind === 'bow') {
    const bg = gm('bow', () => { const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16 * 2 - 1; pts.push(new THREE.Vector3(0, -0.13 * (1 - t * t) + 0.03 * Math.pow(Math.abs(t), 6), t * 0.78)); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.014, 6); });
    mesh(bg, wood, w);
    mesh(gm('bowstring', () => new THREE.CylinderGeometry(0.0025, 0.0025, 1.56, 3).rotateX(Math.PI / 2)), matBasic('string', 0xe8e0c8), w, 0, 0.0, 0);
    mesh(taper(0.02, 0.02, 0.12, 8), lea, w, 0, -0.12, 0.06, Math.PI / 2);
  }
  w.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return w;
}
function makeShield(kind, team, metal = 'steel') {
  const s = new THREE.Group(), mt = matMetal(metal);
  if (kind === 'round') {
    const face = gm('roundface', () => { const g = new THREE.CylinderGeometry(0.33, 0.33, 0.035, 28, 1); g.rotateX(Math.PI / 2); return g; });
    const m = mesh(face, [matBasic('shwood', 0x6a4a2a, { roughness: 0.8 }), matShield(team), matBasic('shwood', 0x6a4a2a)], s);
    m.material = [matBasic('shedge', 0x5a3a20), matShield(team), matBasic('shback', 0x4a3420)];
    mesh(gm('boss', () => new THREE.SphereGeometry(0.075, 14, 8, 0, TAU, 0, Math.PI / 2).rotateX(Math.PI / 2)), mt, s, 0, 0, 0.017);
    mesh(gm('rim', () => new THREE.TorusGeometry(0.33, 0.014, 6, 32)), mt, s);
  } else {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0.32); sh.quadraticCurveTo(0.27, 0.32, 0.27, 0.12); sh.quadraticCurveTo(0.24, -0.3, 0, -0.62); sh.quadraticCurveTo(-0.24, -0.3, -0.27, 0.12); sh.quadraticCurveTo(-0.27, 0.32, 0, 0.32);
    const g = gm('kite', () => { const e = new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.01, bevelSegments: 1, curveSegments: 10 }); const p = e.attributes.position, uv = e.attributes.uv; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, p.getZ(i) - x * x * 0.6); uv.setXY(i, (p.getX(i) + 0.3) / 0.6, (p.getY(i) + 0.62) / 0.94 * 0.94 + 0.03); } e.computeVertexNormals(); return e; });
    mesh(g, matShield(team), s);
    const rimG = gm('kiterim', () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sh.getPoints(24).map((p) => new THREE.Vector3(p.x, p.y, 0.04 - p.x * p.x * 0.6)), true), 48, 0.012, 5, true));
    mesh(rimG, mt, s);
  }
  return s;
}

// ---------------------------------------------------------------------
//  İnsan figürü
// ---------------------------------------------------------------------
const SKINS = ['#e0b090', '#c99a74', '#d6a882', '#a87650', '#e8c0a0'];
function buildHuman(o) {
  // o: { team, cloth, trim, skin, hair, beard, female, armor, helmet, metal, tabard, cape, plume, hero }
  const root = new THREE.Group();
  const inner = grp(root);
  const F = o.female, metal = o.metal || 'steel', mt = matMetal(metal);
  const HIP = F ? 0.93 : 0.96;
  const skin = matSkin(o.skin), hairM = matHair(o.hair || '#3a2414');
  const cloth = matCloth(o.cloth), pants = matCloth(o.pants || '#4a3a2a'), boot = matLeather(o.boot || '#3a2416'), lea = matLeather(o.leather || '#6a4422');
  const hips = grp(inner, 0, HIP, 0);
  // kalça
  mesh(lathe('pelvis' + F, [[0.0, -0.13], [0.12, -0.12], [0.155, -0.06], [0.15, 0.02], [0.13, 0.05]], 14), pants, hips, 0, 0, 0, 0, 0, 0, 1, 1, 0.78);
  const spine = grp(hips, 0, 0.02, 0);
  // gövde profili
  const tp = F ? [[0.12, 0], [0.115, 0.08], [0.135, 0.2], [0.155, 0.3], [0.15, 0.38], [0.12, 0.44], [0.05, 0.48]] : [[0.135, 0], [0.145, 0.08], [0.165, 0.2], [0.185, 0.31], [0.18, 0.39], [0.145, 0.45], [0.06, 0.49]];
  const torsoGeo = lathe('torso' + F, tp, 18);
  const armor = o.armor;
  const bodyMat = armor === 'mail' ? matMail(metal) : armor === 'gambeson' ? matQuilt(o.cloth) : armor === 'leather' ? lea : armor === 'plate' ? matMail(metal) : cloth;
  mesh(torsoGeo, bodyMat, spine, 0, 0, 0, 0, 0, 0, 1, 1, 0.72);
  // etek (zırh eteği)
  const skirtMat = armor === 'gambeson' ? matQuilt(o.cloth) : armor === 'leather' ? lea : matMail(metal);
  mesh(lathe('skirt' + F, [[0.15, 0.04], [0.16, -0.06], [0.19, -0.26], [0.215, -0.38]], 16, 0, TAU), skirtMat, hips, 0, 0, 0, 0, 0, 0, 1, 1, 0.8).material.side = THREE.DoubleSide;
  // plaka göğüslük
  if (armor === 'plate') {
    mesh(lathe('breast' + F, tp.map(([r, y]) => [r * 1.06 + 0.006, y]).slice(0, 6), 18, -1.2, 2.4), mt, spine, 0, 0, 0, 0, 0, 0, 1, 1, 0.78);
    mesh(lathe('back' + F, tp.map(([r, y]) => [r * 1.05 + 0.005, y]).slice(0, 6), 14, Math.PI - 1.1, 2.2), mt, spine, 0, 0, 0, 0, 0, 0, 1, 1, 0.76);
    for (let i = 0; i < 3; i++) mesh(lathe('fauld' + i, [[0.16 + i * 0.012, 0], [0.17 + i * 0.012, -0.06]], 16), mt, hips, 0, -0.01 - i * 0.055, 0, 0, 0, 0, 1, 1, 0.8);
  }
  // tabard / surcoat
  if (o.tabard) {
    const tm2 = matTabard(o.team, o.cloth, o.trim || '#f3c24a');
    const front = tp.map(([r, y]) => [r * 1.08 + 0.012, y]).slice(0, 6).concat([[0.06, 0.47]]);
    const tg = gm('tabtorso' + F, () => {
      const pts = [[0.2, -0.42], [0.19, -0.25], [0.17, -0.06], [0.16, 0.04], ...front.slice(1)];
      return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 10, -0.85, 1.7);
    });
    mesh(tg, tm2, spine, 0, 0, 0, 0, 0, 0, 1, 1, 0.8);
    mesh(tg, tm2, spine, 0, 0, 0, 0, Math.PI, 0, 1, 1, 0.8);
    // kemer
    mesh(gm('belt', () => new THREE.TorusGeometry(0.155, 0.018, 4, 20).rotateX(Math.PI / 2)), lea, hips, 0, 0.04, 0, 0, 0, 0, 1, 1, 0.82);
    mesh(box(), matMetal('gold'), hips, 0, 0.04, 0.13, 0, 0, 0, 0.04, 0.035, 0.012);
  } else {
    mesh(gm('belt', () => new THREE.TorusGeometry(0.155, 0.018, 4, 20).rotateX(Math.PI / 2)), lea, hips, 0, 0.04, 0, 0, 0, 0, 1, 1, 0.82);
    mesh(box(), matMetal('bronze'), hips, 0, 0.04, 0.13, 0, 0, 0, 0.035, 0.03, 0.012);
  }
  // boyun ve baş
  const neck = grp(spine, 0, 0.48, 0);
  mesh(taper(0.045, 0.052, 0.1, 10), skin, neck, 0, 0.1, 0);
  const head = grp(neck, 0, 0.13, 0.005);
  buildHead(head, o, skin, hairM, mt);
  // omuzlar ve kollar
  const arms = [];
  for (const side of [-1, 1]) { // -1 = sağ (silah), +1 = sol
    const sh = grp(spine, side * (F ? 0.165 : 0.19), 0.415, 0);
    const sleeve = armor === 'leather' || armor === 'gambeson' ? (armor === 'gambeson' ? matQuilt(o.cloth) : cloth) : matMail(metal);
    mesh(sph(10, 8), sleeve, sh, 0, -0.01, 0, 0, 0, 0, F ? 0.06 : 0.068);
    mesh(taper(F ? 0.05 : 0.058, F ? 0.042 : 0.048, 0.29), sleeve, sh, 0, -0.01, 0);
    if (armor === 'plate' || o.pauldrons) {
      const pd = gm('pauldron', () => new THREE.SphereGeometry(1, 12, 8, 0, TAU, 0, Math.PI * 0.55));
      mesh(pd, mt, sh, side * 0.01, 0.0, 0, 0, 0, -side * 0.35, 0.095, 0.08, 0.09);
      mesh(pd, mt, sh, side * 0.025, -0.06, 0, 0, 0, -side * 0.5, 0.088, 0.06, 0.085);
    }
    const el = grp(sh, 0, -0.29, 0);
    mesh(sph(8, 6), armor === 'plate' ? mt : sleeve, el, 0, 0, 0, 0, 0, 0, F ? 0.044 : 0.05);
    const fore = armor === 'leather' ? lea : armor === 'plate' ? mt : skin;
    mesh(taper(F ? 0.04 : 0.046, F ? 0.032 : 0.036, 0.25), fore, el, 0, 0, 0);
    if (armor !== 'plate' && armor !== 'leather') mesh(taper(0.05, 0.046, 0.09), lea, el, 0, -0.15, 0);
    const hand = grp(el, 0, -0.26, 0);
    const handMat = armor === 'plate' ? mt : (o.gloves ? lea : skin);
    mesh(sph(8, 6), handMat, hand, 0, -0.035, 0.005, 0, 0, 0, 0.038, 0.055, 0.03);
    mesh(taper(0.014, 0.012, 0.05, 5), handMat, hand, side * -0.025, -0.02, 0.02, -0.6, 0, side * 0.3);
    arms.push({ sh, el, hand });
  }
  // bacaklar
  const legs = [];
  for (const side of [-1, 1]) {
    const hp = grp(hips, side * (F ? 0.085 : 0.092), -0.06, 0);
    const legMat = armor === 'plate' ? mt : pants;
    mesh(taper(F ? 0.072 : 0.078, 0.055, 0.44, 10), armor === 'plate' ? matMail(metal) : pants, hp, 0, 0, 0);
    if (armor === 'plate') mesh(taper(0.084, 0.062, 0.3, 10), mt, hp, 0, -0.05, 0.004, 0, 0, 0, 1, 1, 1);
    const kn = grp(hp, 0, -0.44, 0);
    mesh(sph(8, 6), armor === 'plate' ? mt : legMat, kn, 0, 0, 0.01, 0, 0, 0, 0.056);
    mesh(taper(0.054, 0.04, 0.42, 10), armor === 'plate' ? mt : pants, kn, 0, 0, 0);
    // çizme
    mesh(taper(0.056, 0.05, 0.26, 10), boot, kn, 0, -0.18, 0);
    mesh(gm('foot', () => { const g = new THREE.SphereGeometry(1, 10, 6); g.translate(0, 0, 0.4); return g; }), boot, kn, 0, -0.43, 0.0, 0, 0, 0, 0.05, 0.04, 0.12);
    legs.push({ hp, kn });
  }
  // pelerin (segmentli)
  let cape = null;
  if (o.cape) {
    cape = [];
    let parent = grp(spine, 0, 0.44, -0.11);
    const cm = matBasic('cape' + o.cape, o.cape, { roughness: 0.85, side: THREE.DoubleSide });
    const segs = 6, segL = 0.17;
    for (let i = 0; i < segs; i++) {
      const w = 0.36 + i * 0.03;
      const g = gm('capeseg' + i, () => new THREE.PlaneGeometry(w, segL).translate(0, -segL / 2, 0));
      mesh(g, cm, parent, 0, 0, 0);
      const nxt = grp(parent, 0, -segL, 0);
      cape.push(parent);
      parent = nxt;
    }
    mesh(gm('capecollar', () => new THREE.TorusGeometry(0.13, 0.025, 6, 16, Math.PI).rotateX(Math.PI / 2)), matMetal(o.metal || 'gold'), spine, 0, 0.45, -0.02, 0, Math.PI, 0);
  }
  return { root, inner, rig: { hips, spine, neck, head, armR: arms[0], armL: arms[1], legR: legs[0], legL: legs[1], cape } };
}
function buildHead(head, o, skin, hairM, mt) {
  const F = o.female;
  // kafatası + çene
  mesh(sph(16, 12), skin, head, 0, 0.02, 0, 0, 0, 0, F ? 0.096 : 0.102, F ? 0.112 : 0.118, F ? 0.104 : 0.11);
  mesh(sph(12, 8), skin, head, 0, -0.035, 0.018, 0, 0, 0, F ? 0.075 : 0.085, 0.065, 0.08);
  // burun
  mesh(gm('nose', () => { const g = new THREE.ConeGeometry(0.018, 0.045, 4); g.rotateX(-Math.PI * 0.42); return g; }), skin, head, 0, -0.005, 0.105);
  // gözler
  for (const s of [-1, 1]) {
    mesh(sph(8, 6), matEye(), head, s * 0.035, 0.018, 0.088, 0, 0, 0, 0.015, 0.011, 0.01);
    mesh(sph(6, 4), matIris(), head, s * 0.035, 0.018, 0.096, 0, 0, 0, 0.008, 0.008, 0.005);
    mesh(box(), hairM, head, s * 0.036, 0.042, 0.094, 0, 0, s * -0.12, 0.034, 0.007, 0.012);
    mesh(sph(6, 5), skin, head, s * 0.1, 0.005, 0.0, 0, 0, 0, 0.016, 0.028, 0.018);
  }
  mesh(box(), matBasic('lip', 0x8a4a3a), head, 0, -0.05, 0.094, 0, 0, 0, 0.03, 0.007, 0.01);
  if (o.beard) {
    mesh(gm('beard', () => new THREE.SphereGeometry(1, 12, 8, -0.3, Math.PI + 0.6, Math.PI * 0.45, Math.PI * 0.45)), hairM, head, 0, -0.01, 0.01, 0, 0, 0, 0.098, 0.13, 0.1);
    mesh(box(), hairM, head, 0, -0.03, 0.098, 0, 0, 0, 0.05, 0.012, 0.012);
  }
  const helmet = o.helmet || 'none';
  const hairVisible = helmet === 'none' || helmet === 'crown' || helmet === 'kettle';
  if (hairVisible || F) {
    mesh(gm('hair', () => new THREE.SphereGeometry(1, 14, 10, 0, TAU, 0, Math.PI * 0.55)), hairM, head, 0, 0.03, -0.008, -0.2, 0, 0, 0.108, 0.118, 0.115);
    if (F) for (let i = 0; i < 5; i++) mesh(sph(8, 6), hairM, head, 0, -0.05 - i * 0.065, -0.1 - i * 0.012, 0, 0, 0, 0.03 - i * 0.003, 0.04, 0.03 - i * 0.003);
  }
  const plume = o.plume;
  if (helmet === 'nasal' || helmet === 'winged') {
    const dome = lathe('nasal', [[0.122, -0.01], [0.124, 0.04], [0.116, 0.09], [0.092, 0.14], [0.05, 0.175], [0.0, 0.19]], 16);
    mesh(dome, mt, head, 0, 0.058, -0.005, 0, 0, 0, 1, 1, 1.04);
    mesh(gm('band', () => new THREE.TorusGeometry(0.123, 0.012, 5, 22).rotateX(Math.PI / 2)), mt, head, 0, 0.05, -0.005, 0, 0, 0, 1, 1, 1.04);
    mesh(box(), mt, head, 0, 0.02, 0.126, 0, 0, 0, 0.02, 0.07, 0.012);
    // zincir başlık (aventail)
    mesh(lathe('coif', [[0.124, 0.05], [0.128, -0.02], [0.118, -0.1], [0.16, -0.19], [0.2, -0.24]], 14, Math.PI * 0.32, Math.PI * 1.36), matMail(o.metal || 'steel'), head, 0, 0.0, 0, 0, 0, 0).material.side = THREE.DoubleSide;
    if (helmet === 'winged') for (const s of [-1, 1]) {
      const wg = gm('wing', () => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(0.1, 0.05, 0.16, 0.18); sh.lineTo(0.12, 0.12); sh.lineTo(0.1, 0.17); sh.lineTo(0.07, 0.1); sh.lineTo(0.04, 0.13); sh.quadraticCurveTo(0.02, 0.05, 0, 0.03); return new THREE.ExtrudeGeometry(sh, { depth: 0.01, bevelEnabled: false }); });
      mesh(wg, matMetal(o.metal === 'gold' ? 'steel' : 'gold'), head, s * 0.11, 0.07, -0.02, 0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0, 1, 1, 1);
    }
  } else if (helmet === 'kettle') {
    mesh(lathe('kdome', [[0.12, -0.0], [0.122, 0.05], [0.1, 0.12], [0.05, 0.16], [0, 0.17]], 16), mt, head, 0, 0.055, 0);
    mesh(gm('kbrim', () => new THREE.CylinderGeometry(0.2, 0.21, 0.012, 22)), mt, head, 0, 0.06, 0, -0.06);
  } else if (helmet === 'open') {
    mesh(lathe('odome', [[0.122, -0.01], [0.124, 0.05], [0.11, 0.11], [0.06, 0.165], [0, 0.18]], 16), mt, head, 0, 0.058, 0);
    for (const s of [-1, 1]) mesh(box(), mt, head, s * 0.108, -0.01, 0.02, 0, s * 0.3, 0, 0.012, 0.11, 0.07);
    mesh(gm('band', () => new THREE.TorusGeometry(0.123, 0.012, 5, 22).rotateX(Math.PI / 2)), mt, head, 0, 0.05, 0);
    mesh(lathe('coif', [[0.124, 0.05], [0.128, -0.02], [0.118, -0.1], [0.16, -0.19], [0.2, -0.24]], 14, Math.PI * 0.32, Math.PI * 1.36), matMail(o.metal || 'steel'), head, 0, 0, 0, 0, 0, 0);
  } else if (helmet === 'great') {
    mesh(gm('ghelm', () => new THREE.CylinderGeometry(0.128, 0.135, 0.28, 18, 1)), mt, head, 0, 0.0, 0.0);
    mesh(gm('gtop', () => new THREE.SphereGeometry(0.128, 18, 6, 0, TAU, 0, Math.PI * 0.32)), mt, head, 0, 0.1, 0, 0, 0, 0, 1, 0.9, 1);
    mesh(box(), matBasic('slit', 0x050505), head, 0, 0.035, 0.124, 0, 0, 0, 0.17, 0.013, 0.02);
    mesh(box(), mt, head, 0, 0.0, 0.132, 0, 0, 0, 0.025, 0.24, 0.012);
    mesh(box(), matMetal(o.metal === 'gold' ? 'gold' : 'bronze'), head, 0, 0.045, 0.133, 0, 0, 0, 0.2, 0.012, 0.012);
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) mesh(box(), matBasic('slit', 0x050505), head, s * (0.03 + i * 0.022), -0.04, 0.128, 0, s * 0.25, 0, 0.008, 0.008, 0.01);
  } else if (helmet === 'hood') {
    const hoodMat = matCloth(o.hood || o.cloth);
    hoodMat.side = THREE.DoubleSide;
    mesh(gm('hood', () => new THREE.SphereGeometry(0.13, 16, 12, Math.PI / 2 + 0.85, TAU - 1.7, 0, Math.PI * 0.72)), hoodMat, head, 0, 0.02, -0.01, 0, 0, 0, 1, 1.08, 1.06);
    mesh(gm('hoodtip', () => new THREE.ConeGeometry(0.05, 0.16, 8).rotateX(-1.9)), hoodMat, head, 0, 0.09, -0.14);
    mesh(gm('mantle', () => new THREE.CylinderGeometry(0.11, 0.27, 0.2, 18, 1, true)), hoodMat, head, 0, -0.17, -0.01, 0, 0, 0, 1, 1, 0.8);
  } else if (helmet === 'crown') {
    const gold = matMetal('gold');
    mesh(gm('crownband', () => new THREE.CylinderGeometry(0.112, 0.108, 0.04, 20, 1, true)), gold, head, 0, 0.1, -0.005);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; mesh(gm('crownpt', () => new THREE.ConeGeometry(0.016, 0.055, 4)), gold, head, Math.sin(a) * 0.11, 0.145, Math.cos(a) * 0.11 - 0.005); }
    mesh(sph(6, 4), matBasic('ruby', 0xd01020, { metalness: 0.2, roughness: 0.1, emissive: 0x400000 }), head, 0, 0.1, 0.11, 0, 0, 0, 0.016);
  }
  if (plume && (helmet === 'great' || helmet === 'nasal' || helmet === 'open')) {
    const pm = matBasic('plume' + plume, plume, { roughness: 0.95 });
    const y0 = helmet === 'great' ? 0.15 : 0.2;
    for (let i = 0; i < 5; i++) mesh(sph(8, 6), pm, head, 0, y0 + Math.sin(i * 0.5) * 0.05, 0.04 - i * 0.05, 0, 0, 0, 0.03, 0.05 + i * 0.006, 0.04);
  }
}

// ---------------------------------------------------------------------
//  At
// ---------------------------------------------------------------------
function buildHorse(team, coat = '#5a3a22', barding = null, gold = false) {
  const root = new THREE.Group(), inner = grp(root);
  const hide = matBasic('coat' + coat, coat, { roughness: 0.55 }), dark = matBasic('hoof', 0x1a1410, { roughness: 0.6 });
  const mane = matHair(coat === '#e8e4dc' ? '#d8d0c0' : '#1a120c');
  const body = grp(inner, 0, 1.15, 0);
  mesh(gm('hbarrel', () => new THREE.CapsuleGeometry(0.31, 0.9, 6, 16).rotateX(Math.PI / 2)), hide, body, 0, 0, 0, 0, 0, 0, 0.88, 1, 1);
  mesh(sph(14, 10), hide, body, 0, 0.04, 0.5, 0, 0, 0, 0.28, 0.33, 0.32);
  mesh(sph(14, 10), hide, body, 0, 0.06, -0.52, 0, 0, 0, 0.3, 0.32, 0.32);
  // boyun ve baş
  const neck = grp(body, 0, 0.2, 0.6); neck.rotation.x = 0.72;
  mesh(gm('hneck', () => new THREE.CylinderGeometry(0.13, 0.22, 0.8, 12, 1).translate(0, 0.33, 0)), hide, neck, 0, 0, 0, 0, 0, 0, 0.82, 1, 1);
  mesh(gm('hmane', () => new THREE.BoxGeometry(0.05, 0.75, 0.1).translate(0, 0.35, 0)), mane, neck, 0, 0.0, -0.14);
  const head = grp(neck, 0, 0.72, 0); head.rotation.x = 1.15;
  mesh(gm('hhead', () => new THREE.CylinderGeometry(0.075, 0.115, 0.52, 10, 1).translate(0, 0.24, 0)), hide, head, 0, 0, 0, 0, 0, 0, 0.82, 1, 1);
  mesh(sph(10, 8), hide, head, 0, 0.0, 0.0, 0, 0, 0, 0.11, 0.13, 0.12);
  mesh(sph(10, 8), hide, head, 0, 0.47, 0.02, 0, 0, 0, 0.075, 0.07, 0.085);
  for (const s of [-1, 1]) {
    mesh(gm('hear', () => new THREE.ConeGeometry(0.03, 0.12, 6)), hide, head, s * 0.05, -0.04, -0.09, -0.6, 0, s * 0.2);
    mesh(sph(6, 4), matIris(), head, s * 0.085, 0.08, 0.04, 0, 0, 0, 0.022);
    mesh(sph(5, 4), dark, head, s * 0.03, 0.52, 0.06, 0, 0, 0, 0.012);
  }
  // dizgin
  mesh(gm('bridle', () => new THREE.TorusGeometry(0.095, 0.008, 4, 16)), matStrapDark(), head, 0, 0.36, 0.01, Math.PI / 2, 0, 0);
  // kuyruk
  const tail = grp(body, 0, 0.18, -0.82); tail.rotation.x = -0.5;
  mesh(gm('htail', () => new THREE.ConeGeometry(0.08, 0.7, 8).rotateX(Math.PI).translate(0, -0.35, 0)), mane, tail, 0, 0, 0, 0, 0, 0, 1, 1, 0.7);
  // bacaklar
  const legs = [];
  for (const [x, z, front] of [[-0.16, 0.48, 1], [0.16, 0.48, 1], [-0.16, -0.5, 0], [0.16, -0.5, 0]]) {
    const up = grp(body, x, -0.12, z);
    mesh(taper(front ? 0.085 : 0.1, 0.055, 0.48, 10), hide, up, 0, 0, 0);
    const kn = grp(up, 0, -0.46, 0);
    mesh(sph(8, 6), hide, kn, 0, 0, 0, 0, 0, 0, 0.055);
    mesh(taper(0.042, 0.038, 0.42, 8), hide, kn, 0, 0, 0);
    mesh(taper(0.05, 0.06, 0.08, 10), dark, kn, 0, -0.41, 0.0);
    legs.push({ up, kn, front });
  }
  // eyer ve örtü
  mesh(gm('saddle', () => new THREE.CylinderGeometry(0.33, 0.33, 0.5, 12, 1, true, -1.0, 2.0).rotateX(Math.PI / 2)), matLeather('#4a2a16'), body, 0, 0.02, -0.05);
  mesh(box(), matLeather('#3a2010'), body, 0, 0.36, 0.15, -0.2, 0, 0, 0.18, 0.08, 0.05);
  const capCol = barding || teamColor(team);
  const capM = matTabard(team, capCol, gold ? '#f3c24a' : '#e8d8b0');
  const cg = gm('caparison', () => {
    const g = new THREE.CylinderGeometry(0.35, 0.41, 1.45, 18, 3, true, Math.PI * 0.5 - 1.2 + Math.PI, 2.3);
    g.rotateX(Math.PI / 2);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < 0) p.setY(i, y - 0.1); uv.setXY(i, uv.getX(i), uv.getY(i)); }
    g.computeVertexNormals(); return g;
  });
  if (barding) { for (const s of [-1, 1]) mesh(cg, capM, body, 0, 0.02, 0, 0, 0, 0, s, 1, 1); }
  else mesh(gm('blanket', () => new THREE.CylinderGeometry(0.335, 0.335, 0.62, 16, 1, true, Math.PI - 1.35, 2.7).rotateX(Math.PI / 2)), matBasic('blanket' + team, teamColor(team), { roughness: 0.9, side: THREE.DoubleSide }), body, 0, 0.0, -0.05);
  if (gold) mesh(gm('chanfron', () => new THREE.CylinderGeometry(0.06, 0.1, 0.4, 8, 1, true, -1.2, 2.4).translate(0, 0.25, 0)), matMetal('gold'), head, 0, 0, 0.02);
  return { root, inner, body, neck, head, tail, legs };
}

// ---------------------------------------------------------------------
//  Birim montajı
// ---------------------------------------------------------------------
function assemble(h, weapon, shieldKind, team, metal, opts = {}) {
  const r = h.rig;
  if (weapon) {
    const w = makeWeapon(weapon, metal, team, opts.accent);
    const holder = weapon === 'bow' ? r.armL.hand : r.armR.hand;
    holder.add(w);
    w.position.set(0, -0.04, 0.01);
    r.weapon = w; r.weaponKind = weapon;
  }
  if (shieldKind) {
    const s = makeShield(shieldKind, team, metal);
    r.armL.hand.add(s);
    s.position.set(0.0, -0.06, 0.0);
    s.rotation.set(Math.PI / 2, 0, 0);
    if (shieldKind === 'kite') s.position.y = -0.0;
    r.shield = s;
  }
  if (weapon === 'bow' || opts.quiver) {
    const q = grp(r.spine, 0.08, 0.28, -0.15); q.rotation.set(0.3, 0, -0.35);
    mesh(taper(0.055, 0.045, 0.5, 10), matLeather('#5a3418'), q, 0, 0.25, 0);
    for (let i = 0; i < 5; i++) {
      mesh(taper(0.005, 0.005, 0.12, 4), matWood(), q, rand(-0.025, 0.025), 0.37, rand(-0.025, 0.025));
      mesh(box(), matBasic('fletch', i % 2 ? 0xe8e0d0 : 0xb03020, { side: THREE.DoubleSide }), q, rand(-0.025, 0.025), 0.32, rand(-0.025, 0.025), 0, rand(0, 3), 0, 0.03, 0.07, 0.002);
    }
    if (weapon !== 'bow') q.visible = true;
  }
  if (opts.sidearm) {
    const sw = makeWeapon('sword', metal, team);
    const sc = grp(r.hips, 0.17, 0.0, 0.02); sc.rotation.set(0.35, 0, 0.1); sc.add(sw); sw.scale.setScalar(0.75);
    mesh(taper(0.025, 0.02, 0.62, 6), matStrapDark(), sc, 0, -0.06, 0, 0, 0, 0, 1, 1, 0.5);
  }
}
// Aynı kemik grubundaki, aynı malzemeli parçaları tek ağa birleştir (çizim çağrısını ~%60 azaltır)
const MERGE_CACHE = new Map();
function optimize(root) {
  const groups = [];
  root.traverse((o) => { if (!o.isMesh && !o.isSprite) groups.push(o); });
  for (const g of groups) {
    const leaves = g.children.filter((c) => c.isMesh && !c.children.length && !Array.isArray(c.material) && !c.userData.keep);
    const byMat = new Map();
    for (const m of leaves) { const k = m.material.uuid; if (!byMat.has(k)) byMat.set(k, []); byMat.get(k).push(m); }
    for (const [, list] of byMat) {
      if (list.length < 2) continue;
      list.forEach((m) => m.updateMatrix());
      const key = list[0].material.uuid + '|' + list.map((m) => m.geometry.uuid + ':' + m.matrix.elements.map((e) => e.toFixed(3)).join(',')).join(';');
      let geo = MERGE_CACHE.get(key);
      if (!geo) {
        const parts = list.map((m) => {
          let gg = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
          for (const a of Object.keys(gg.attributes)) if (!['position', 'normal', 'uv'].includes(a)) gg.deleteAttribute(a);
          if (!gg.attributes.uv) gg.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(gg.attributes.position.count * 2), 2));
          gg.clearGroups();
          return gg.applyMatrix4(m.matrix);
        });
        geo = mergeGeometries(parts);
        parts.forEach((pp) => pp.dispose());
        if (!geo) continue;
        MERGE_CACHE.set(key, geo);
      }
      const merged = new THREE.Mesh(geo, list[0].material);
      merged.castShadow = true; merged.receiveShadow = true;
      list.forEach((m) => g.remove(m));
      g.add(merged);
    }
  }
}
function finalize(obj, kind, h, horse) {
  optimize(obj);
  obj.userData.kind = kind;
  obj.userData.rig = h.rig;
  obj.userData.inner = h.inner;
  obj.userData.horse = horse || null;
  obj.userData.mounted = !!horse;
  obj.userData.cur = {};
  obj.userData.phase = Math.random() * 10;
  obj.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return obj;
}
function mount(h, horse) {
  const obj = new THREE.Group();
  obj.add(horse.root);
  horse.body.add(h.root);
  h.root.position.set(0, 0.36 - 0.93, -0.05);
  return obj;
}


// =====================================================================
//  KAYKIT ANİMASYONLU KARAKTERLER
// =====================================================================
const KKCFG = {
  blue: {
    infantry: ['Knight', ['1H_Sword', 'Badge_Shield', 'Knight_Helmet'], '1h'],
    spearman: ['Knight', ['2H_Sword', 'Knight_Helmet'], '2h'],
    archer: ['Rogue_Hooded', ['2H_Crossbow', 'Rogue_Cape'], 'bow'],
    cavalry: ['Knight', ['1H_Sword', 'Rectangle_Shield', 'Knight_Helmet'], '1h'],
  },
  red: {
    infantry: ['Barbarian', ['1H_Axe', 'Barbarian_Round_Shield', 'Barbarian_Hat', 'Barbarian_Cape'], '1h'],
    spearman: ['Barbarian', ['2H_Axe', 'Barbarian_Hat', 'Barbarian_Cape'], '2h'],
    archer: ['Rogue', ['2H_Crossbow', 'Rogue_Cape'], 'bow'],
    cavalry: ['Barbarian', ['1H_Axe', 'Barbarian_Round_Shield', 'Barbarian_Hat', 'Barbarian_Cape'], '1h'],
  },
};
const CLIPS = {
  '1h': { idle: 'Idle', walk: 'Walking_A', run: 'Running_A', attack: '1H_Melee_Attack_Chop', cheer: 'Cheer', die: 'Death_A', work: '1H_Melee_Attack_Chop' },
  '2h': { idle: '2H_Melee_Idle', walk: 'Walking_A', run: 'Running_A', attack: '2H_Melee_Attack_Chop', cheer: 'Cheer', die: 'Death_A', work: '2H_Melee_Attack_Chop' },
  bow: { idle: 'Idle', walk: 'Walking_A', run: 'Running_A', attack: '2H_Ranged_Shoot', cheer: 'Cheer', die: 'Death_A', work: 'Use_Item' },
  none: { idle: 'Idle', walk: 'Walking_A', run: 'Running_A', attack: 'Use_Item', cheer: 'Cheer', die: 'Death_A', work: 'Use_Item' },
};
const PART_RE = /_(Body|Head|ArmLeft|ArmRight|LegLeft|LegRight)$|Head_Hooded$/;
const KK_H = 1.85; // hedef boy
const kkScale = new Map();
export function kkUnit(charName, show, style, opts = {}) {
  if (!A.ready.chars || !A.hasChar(charName)) return null;
  const c = A.character(charName);
  const root = new THREE.Group(), inner = new THREE.Group(); root.add(inner);
  const sc = c.scene;
  sc.traverse((o) => { if (o.isMesh) { o.visible = PART_RE.test(o.name) || show.includes(o.name); o.frustumCulled = false; o.castShadow = true; } });
  if (!kkScale.has(charName)) { const b = new THREE.Box3().setFromObject(sc); kkScale.set(charName, KK_H / Math.max(0.5, b.max.y - b.min.y)); }
  sc.scale.setScalar(kkScale.get(charName) * (opts.scale || 1));
  if (opts.tint) sc.traverse((o) => { if (o.isMesh && PART_RE.test(o.name)) { o.material = o.material.clone(); o.material.color.multiply(new THREE.Color(opts.tint)); } });
  let horse = null, obj = root;
  if (opts.mounted) {
    horse = buildHorse(opts.team || 'blue', opts.coat || '#5a3a22', opts.barding || null, !!opts.gold);
    obj = new THREE.Group(); obj.add(horse.root);
    horse.body.add(root); root.position.set(0, -0.02, -0.08); root.scale.setScalar(0.92);
  }
  inner.add(sc);
  const mixer = new THREE.AnimationMixer(sc), acts = {};
  for (const cl of c.clips) acts[cl.name] = mixer.clipAction(cl);
  obj.userData = { kk: true, mixer, acts, style, clips: CLIPS[style] || CLIPS.none, cur: null, inner, horse, mounted: !!opts.mounted, phase: Math.random() * 10, kind: style };
  // tüm parçaları gölge yapsın
  obj.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  kkPlay(obj, opts.mounted ? 'sit' : 'idle', 0);
  mixer.update(Math.random() * 2);
  return obj;
}
function kkPlay(obj, state, fade = 0.25) {
  const ud = obj.userData;
  let name = state === 'sit' ? 'Sit_Chair_Idle' : ud.clips[state] || ud.clips.idle;
  if (ud.mounted) name = state === 'die' ? 'Death_A' : state === 'cheer' ? 'Cheer' : 'Sit_Chair_Idle';
  if (ud.curName === name) return;
  const next = ud.acts[name]; if (!next) return;
  const once = state === 'die';
  next.reset(); next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); next.clampWhenFinished = once;
  next.timeScale = state === 'run' ? 1.1 : state === 'attack' ? 0.9 + Math.random() * 0.25 : 1;
  if (ud.curAct) next.crossFadeFrom(ud.curAct, fade, false);
  next.play();
  ud.curAct = next; ud.curName = name;
}
export function kkAnimate(obj, state, t, dt) {
  const ud = obj.userData;
  kkPlay(obj, state);
  ud.mixer.update(Math.min(dt || 0.016, 0.1));
  if (ud.horse) {
    if (state === 'die') { ud.dieT = (ud.dieT || 0) + dt; const k = Math.min(1, ud.dieT / 0.7); ud.horse.inner.rotation.z = k * 1.35; }
    else animateHorse(ud.horse, state === 'attack' ? 'run' : state, t, dt, { kind: 'lance' });
  }
  if (ud.fx) ud.fx(t);
}
export function createCitizen(kind = Math.floor(Math.random() * 4), opts = {}) {
  const list = [['Mage', ['Spellbook'], 'none'], ['Rogue', [], 'none'], ['Barbarian', ['Mug'], 'none'], ['Rogue_Hooded', [], 'none'], ['Barbarian', ['1H_Axe'], '1h'], ['Knight', ['1H_Sword'], '1h']];
  const [n, show, st] = list[kind % list.length];
  return kkUnit(n, opts.tool ? (n === 'Barbarian' ? ['1H_Axe', 'Barbarian_Hat'] : show) : show, opts.tool ? '1h' : st, { scale: 0.92 });
}
function addAura(obj, R, mounted) {
  if (R < 4) return;
  const auraTex = tm('aura', () => { const [c, x] = cnv(128, 128); const g = x.createRadialGradient(64, 64, 20, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.55, 'rgba(255,255,255,.55)'); g.addColorStop(0.7, 'rgba(255,255,255,.2)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); });
  const col = R === 5 ? new THREE.Color(2.2, 1.6, 0.5) : new THREE.Color(1.4, 0.8, 2.4);
  const ring = new THREE.Mesh(gm('auraplane', () => new THREE.PlaneGeometry(1.9, 1.9).rotateX(-Math.PI / 2)), new THREE.MeshBasicMaterial({ map: auraTex, color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.position.y = 0.03; obj.add(ring);
  const spTex = tm('spark', () => { const [c, x] = cnv(32, 32); const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); });
  const sparks = [];
  for (let i = 0; i < 12; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: spTex, color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); sp.scale.setScalar(0.09); obj.add(sp); sparks.push({ sp, a: Math.random() * TAU, o: Math.random(), r: rand(0.45, 0.75) }); }
  obj.userData.fx = (t) => { ring.rotation.y = t * 0.5; ring.material.opacity = 0.7 + Math.sin(t * 3) * 0.25; for (const p of sparks) { const u = (t * 0.35 + p.o) % 1; p.sp.position.set(Math.cos(p.a + t * 0.6) * p.r, u * (mounted ? 2.7 : 2.0), Math.sin(p.a + t * 0.6) * p.r); p.sp.material.opacity = Math.sin(u * Math.PI); } };
}
function kkHero(def) {
  const L = def.look || {}, R = def.rarity || 2, role = def.role, w = L.weapon || 'sword';
  let n, show, st;
  if (role === 'archer') { n = L.female ? 'Rogue_Hooded' : 'Rogue'; show = ['2H_Crossbow', 'Rogue_Cape']; st = 'bow'; }
  else if (w === 'axe' || w === 'hammer') { n = 'Barbarian'; show = w === 'hammer' ? ['2H_Axe', 'Barbarian_Cape'] : ['1H_Axe', 'Barbarian_Round_Shield', 'Barbarian_Hat', 'Barbarian_Cape']; st = w === 'hammer' ? '2h' : '1h'; }
  else if (w === 'spear' && role !== 'cavalry') { n = 'Knight'; show = ['2H_Sword', 'Knight_Cape', ...(L.helmet && L.helmet !== 'none' ? ['Knight_Helmet'] : [])]; st = '2h'; }
  else { n = 'Knight'; show = ['1H_Sword', R >= 3 ? 'Badge_Shield' : 'Round_Shield', ...(R >= 3 ? ['Knight_Cape'] : []), ...(L.helmet && L.helmet !== 'none' && L.helmet !== 'crown' ? ['Knight_Helmet'] : [])]; st = '1h'; }
  if (L.female && role !== 'archer') { n = 'Rogue_Hooded'; show = ['1H_Crossbow', 'Knife', 'Rogue_Cape']; st = '1h'; }
  const obj = kkUnit(n, show, st, { scale: 1 + (R - 2) * 0.04, mounted: role === 'cavalry', team: 'blue', coat: R === 5 ? '#e8e4dc' : R === 4 ? '#2a2420' : '#6a4428', barding: L.primary, gold: R >= 4 });
  if (!obj) return null;
  addAura(obj, R, role === 'cavalry');
  obj.userData.hero = true;
  return obj;
}

function attachHero3d(obj, def) {
  const swap = () => {
    if (obj.userData.disposed) return;
    const h = A.hero3d(def.id, 1.9 + (def.rarity - 2) * 0.06); if (!h) return;
    const ud = obj.userData;
    // KayKit gövdesini (ve atı) gizle, yeni modeli ekle
    obj.children.forEach((c) => { if (!c.isSprite && !(c.isMesh && c.geometry && c.geometry.type === 'PlaneGeometry')) c.visible = false; });
    obj.add(h.scene);
    // Hazır iskelet animasyonu bu modellerde gövdeyi bozuyor: model temiz duruşunda kalır,
    // nefes/bakış hareketleri kemiklere küçük açılarla koddan verilir.
    const bones = {};
    h.inner.traverse((o) => { if (o.isBone) bones[o.name] = o; });
    const B = {}, rest = new Map();
    for (const [k, n] of [['spine', 'Spine01'], ['chest', 'Spine02'], ['neck', 'neck'], ['head', 'Head'], ['lArm', 'LeftArm'], ['rArm', 'RightArm'], ['hips', 'Hips']]) if (bones[n]) { B[k] = bones[n]; rest.set(bones[n], bones[n].rotation.clone()); }
    ud.h3 = { root: h.scene, inner: h.inner, t: Math.random() * 10, B, rest, id: def.id };
    ud.mounted = false;
  };
  A.loadHero3d(def.id).then((ok) => { if (ok) swap(); });
}
// ---------------------------------------------------------------------
//  Kahraman özel hareketleri ve efektleri
// ---------------------------------------------------------------------
export const HERO_MOVES = {
  tugrul: ['charge', 0xffd060], elara: ['shot', 0xc8ffd8], baran: ['slam', 0xffc840], kaan: ['charge', 0x6ab0ff], lara: ['shot', 0xffa050],
  oguz: ['slam', 0xb8b8c8], aybike: ['slash', 0xff6a5a], emre: ['roar', 0x6aa8ff], defne: ['shot', 0x9aff6a], burak: ['charge', 0xd8a060],
  mert: ['slam', 0xd8d070], ali: ['slash', 0xf0f0ff], zeynep: ['shot', 0xa0ff80], cem: ['spin', 0xe0b070], hasan: ['slam', 0xc0b0a0],
  kerem: ['roar', 0xffd040], selin: ['shot', 0x9ad8ff], bora: ['thunder', 0x60e8ff], nilufer: ['dawn', 0xffb060], doruk: ['steam', 0xff8a30],
  tolga: ['slam', 0x8ae070], ece: ['poison', 0x7aff4a], arda: ['steam', 0xffc060],
};
let fxTex = null;
function fxGlow() {
  if (fxTex) return fxTex;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  fxTex = new THREE.CanvasTexture(c); return fxTex;
}
let boltTex = null;
function fxBolt() {
  if (boltTex) return boltTex;
  const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d');
  g.strokeStyle = '#fff'; g.lineWidth = 5; g.shadowColor = '#9ff'; g.shadowBlur = 12; g.beginPath(); let x = 32; g.moveTo(x, 0);
  for (let y = 16; y <= 256; y += 16) { x = 32 + (Math.random() - 0.5) * 40; g.lineTo(x, y); } g.stroke();
  boltTex = new THREE.CanvasTexture(c); return boltTex;
}
let rayTex = null;
function fxRays() {
  if (rayTex) return rayTex;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.translate(128, 128); for (let i = 0; i < 16; i++) { g.rotate(Math.PI / 8); const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(-6, 0); g.lineTo(6, 0); g.lineTo(18, 128); g.lineTo(-18, 128); g.fill(); }
  rayTex = new THREE.CanvasTexture(c); return rayTex;
}
function fxSprite(color, size, add = true, map = fxGlow()) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, opacity: 0 })); s.scale.setScalar(size); return s; }
function fxRing(color) { const m = new THREE.Mesh(new THREE.RingGeometry(0.75, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); return m; }
export function playHeroMove(obj) {
  const ud = obj.userData; if (!ud.h3) return false;
  const [type, color] = HERO_MOVES[ud.h3.id] || ['roar', 0xffd060];
  stopMove(obj);
  ud.move = { type, color: new THREE.Color(color), t: 0, dur: { charge: 1.15, slash: 1.0, shot: 1.15, slam: 1.35, spin: 1.05, roar: 1.3, thunder: 1.4, dawn: 1.5, poison: 1.2, steam: 1.4 }[type], fx: [], fired: {} };
  return true;
}
function stopMove(obj) { const m = obj.userData.move; if (!m) return; for (const f of m.fx) { obj.remove(f.o); f.o.material?.dispose?.(); f.o.geometry?.type === 'RingGeometry' && f.o.geometry.dispose(); } obj.userData.move = null; }
// efekt: o = nesne, life = ömür, step(k, f) her karede (k: 0..1)
function addFx(obj, m, o, life, step) { obj.add(o); m.fx.push({ o, life, t: 0, step }); }
const ease = (x) => x * x * (3 - 2 * x);
function stepMove(obj, ud, H, dt) {
  const m = ud.move, u = Math.min(1, m.t / m.dur), R = H.root, c = m.color, once = (k) => (m.fired[k] ? false : (m.fired[k] = true));
  m.t += dt;
  R.position.set(0, 0, 0); R.rotation.set(0, 0, 0); R.scale.setScalar(1);
  const bell = Math.sin(Math.PI * u);
  if (m.type === 'charge') {
    R.position.z = bell * 0.9; R.rotation.x = bell * 0.16;
    if (u < 0.55 && Math.random() < 0.6) { const d = fxSprite(0xc8b090, 0.4, false); d.position.set((Math.random() - 0.5) * 0.6, 0.1, R.position.z - 0.2); addFx(obj, m, d, 0.6, (k, f) => { f.o.material.opacity = (1 - k) * 0.5; f.o.scale.setScalar(0.4 + k * 0.6); f.o.position.y += 0.004; }); }
    if (once('glow')) { const g = fxSprite(c, 2.6); g.position.set(0, 1.1, 0.4); addFx(obj, m, g, 0.9, (k, f) => { f.o.material.opacity = Math.sin(Math.PI * k) * 0.6; f.o.position.z = 0.4 + R.position.z; }); }
  } else if (m.type === 'slash') {
    R.rotation.y = u < 0.3 ? -0.55 * ease(u / 0.3) : -0.55 + 1.35 * ease(Math.min(1, (u - 0.3) / 0.25)) * (1 - Math.max(0, (u - 0.6) / 0.4));
    R.position.z = u > 0.3 ? Math.sin(Math.PI * Math.min(1, (u - 0.3) / 0.7)) * 0.35 : 0;
    if (u > 0.32 && once('arc')) { const ring = fxRing(c); ring.position.set(0, 1.05, 0.35); ring.rotation.z = 0.25; addFx(obj, m, ring, 0.45, (k, f) => { f.o.material.opacity = (1 - k) * 0.9; f.o.scale.setScalar(0.5 + k * 0.9); }); for (let i = 0; i < 8; i++) { const sp = fxSprite(c, 0.18); const a = Math.random() * 6.28; sp.position.set(Math.cos(a) * 0.6, 1.05 + Math.sin(a) * 0.3, 0.6); addFx(obj, m, sp, 0.5, (k, f) => { f.o.material.opacity = 1 - k; f.o.position.y += 0.01; }); } }
  } else if (m.type === 'shot' || m.type === 'poison') {
    R.rotation.x = u < 0.35 ? -0.1 * ease(u / 0.35) : -0.1 * (1 - ease(Math.min(1, (u - 0.35) / 0.3)));
    if (u > 0.35 && once('fire')) {
      const fl = fxSprite(c, 1.2); fl.position.set(0.15, 1.3, 0.35); addFx(obj, m, fl, 0.3, (k, f) => { f.o.material.opacity = 1 - k; f.o.scale.setScalar(1.2 + k); });
      const ar = fxSprite(c, 0.5); addFx(obj, m, ar, 0.55, (k, f) => { f.o.position.set(0.15 + k * 1.6, 1.3 + k * 0.9, 0.35 + k * 3.5); f.o.material.opacity = 1 - k * 0.6; });
      for (let i = 0; i < 6; i++) { const tr = fxSprite(c, 0.28); const d = i * 0.05; addFx(obj, m, tr, 0.55 + d, (k, f) => { const kk = Math.max(0, k - d * 1.5); f.o.position.set(0.15 + kk * 1.6, 1.3 + kk * 0.9, 0.35 + kk * 3.5); f.o.material.opacity = (1 - k) * 0.6; }); }
    }
    if (m.type === 'poison' && Math.random() < 0.5) { const b = fxSprite(c, 0.16); b.position.set((Math.random() - 0.5) * 0.9, 0.3 + Math.random() * 0.5, (Math.random() - 0.5) * 0.6); addFx(obj, m, b, 1, (k, f) => { f.o.position.y += 0.012; f.o.material.opacity = Math.sin(Math.PI * k) * 0.9; }); }
  } else if (m.type === 'slam' || m.type === 'steam') {
    const up = Math.min(1, u / 0.55);
    R.position.y = u >= 0.55 ? 0 : up < 0.7 ? Math.sin(Math.PI / 2 * up / 0.7) * 0.55 : 0.55 * (1 - (up - 0.7) / 0.3);
    if (u >= 0.55) { const s2 = Math.max(0, 1 - (u - 0.55) / 0.2); R.scale.set(1 + s2 * 0.06, 1 - s2 * 0.08, 1 + s2 * 0.06); }
    if (u >= 0.55 && once('boom')) {
      for (let i = 0; i < 2; i++) { const ring = fxRing(c); ring.position.y = 0.04; addFx(obj, m, ring, 0.6 + i * 0.2, (k, f) => { f.o.material.opacity = (1 - k) * 0.9; f.o.scale.setScalar(0.3 + k * (2.2 + i)); }); }
      for (let i = 0; i < 10; i++) { const d = fxSprite(m.type === 'steam' ? 0xd0d0d8 : 0xc8b090, 0.5, false); const a = (i / 10) * 6.28; addFx(obj, m, d, 0.8, (k, f) => { f.o.position.set(Math.cos(a) * (0.3 + k * 1.2), 0.15 + k * 0.3, Math.sin(a) * (0.3 + k * 1.2)); f.o.material.opacity = (1 - k) * 0.55; f.o.scale.setScalar(0.4 + k * 0.6); }); }
      const fl = fxSprite(c, 2.2); fl.position.y = 0.3; addFx(obj, m, fl, 0.35, (k, f) => { f.o.material.opacity = 1 - k; });
    }
    if (m.type === 'steam' && Math.random() < 0.55) { const p = fxSprite(0xe0e0e8, 0.35, false); p.position.set(-0.2 + Math.random() * 0.4, 1.5 + R.position.y, -0.25); addFx(obj, m, p, 1.1, (k, f) => { f.o.position.y += 0.012; f.o.material.opacity = Math.sin(Math.PI * k) * 0.5; f.o.scale.setScalar(0.35 + k * 0.7); }); if (Math.random() < 0.4) { const sp = fxSprite(c, 0.12); sp.position.set((Math.random() - 0.5) * 0.8, 0.9, 0.3); addFx(obj, m, sp, 0.5, (k, f) => { f.o.position.y += 0.02; f.o.material.opacity = 1 - k; }); } }
  } else if (m.type === 'spin') {
    R.rotation.y = ease(u) * Math.PI * 2; R.position.y = bell * 0.2;
    if (Math.random() < 0.7) { const a = Math.random() * 6.28, sp = fxSprite(c, 0.22); addFx(obj, m, sp, 0.6, (k, f) => { const aa = a + k * 4; f.o.position.set(Math.cos(aa) * 0.8, 0.4 + k * 1.2, Math.sin(aa) * 0.8); f.o.material.opacity = 1 - k; }); }
  } else if (m.type === 'roar') {
    R.scale.setScalar(1 + bell * 0.06); R.rotation.x = -bell * 0.08;
    if (once('aura')) { const g = fxSprite(c, 3.2); g.position.y = 1.1; addFx(obj, m, g, 1.2, (k, f) => { f.o.material.opacity = Math.sin(Math.PI * k) * 0.55; f.o.scale.setScalar(2.6 + k * 1.2); }); }
    if (m.t > 0.15 * (Object.keys(m.fired).length) && Object.keys(m.fired).length < 4 && once('r' + Object.keys(m.fired).length)) { const ring = fxRing(c); addFx(obj, m, ring, 0.9, (k, f) => { f.o.position.y = 0.1 + k * 1.8; f.o.scale.setScalar(0.9 - k * 0.3); f.o.material.opacity = (1 - k) * 0.8; }); }
  } else if (m.type === 'thunder') {
    R.position.y = bell * 0.18;
    if (Math.random() < 0.25 && u < 0.8) { const bl = fxSprite(c, 1, true, fxBolt()); bl.scale.set(0.5, 2.6, 1); bl.position.set((Math.random() - 0.5) * 1.6, 1.3, (Math.random() - 0.5) * 0.8); addFx(obj, m, bl, 0.18, (k, f) => { f.o.material.opacity = Math.random() < 0.5 ? 1 : 0.3; }); }
    if (once('flash')) { const g = fxSprite(c, 3.4); g.position.y = 1.1; addFx(obj, m, g, 1.3, (k, f) => { f.o.material.opacity = (0.3 + Math.random() * 0.4) * (1 - k); }); }
  } else if (m.type === 'dawn') {
    R.position.y = bell * 0.15;
    if (once('rays')) { const r = fxSprite(c, 3.6, true, fxRays()); r.position.set(0, 1.2, -0.3); addFx(obj, m, r, 1.5, (k, f) => { f.o.material.opacity = Math.sin(Math.PI * k) * 0.7; f.o.material.rotation = k * 1.2; f.o.scale.setScalar(2.4 + k * 1.6); }); }
    if (Math.random() < 0.45) { const sp = fxSprite(0xfff0a0, 0.15); sp.position.set((Math.random() - 0.5) * 1.2, 0.2, (Math.random() - 0.5) * 0.8); addFx(obj, m, sp, 1, (k, f) => { f.o.position.y += 0.015; f.o.material.opacity = Math.sin(Math.PI * k); }); }
  }
  for (let i = m.fx.length - 1; i >= 0; i--) { const f = m.fx[i]; f.t += dt; const k = f.t / f.life; if (k >= 1) { obj.remove(f.o); m.fx.splice(i, 1); continue; } f.step(k, f); }
  if (u >= 1 && !m.fx.length) { R.position.set(0, 0, 0); R.rotation.set(0, 0, 0); R.scale.setScalar(1); ud.move = null; }
}
function heroIdle(H) {
  const t = H.t, B = H.B, r = (b) => H.rest.get(b);
  if (B.chest) B.chest.rotation.x = r(B.chest).x + Math.sin(t * 1.7) * 0.022;
  if (B.spine) B.spine.rotation.z = r(B.spine).z + Math.sin(t * 0.6) * 0.02;
  if (B.head) { B.head.rotation.y = r(B.head).y + Math.sin(t * 0.45) * 0.14; B.head.rotation.x = r(B.head).x + Math.sin(t * 0.9 + 1) * 0.035; }
  if (B.lArm) B.lArm.rotation.x = r(B.lArm).x + Math.sin(t * 1.7) * 0.03;
  if (B.rArm) B.rArm.rotation.x = r(B.rArm).x - Math.sin(t * 1.7) * 0.03;
}
const PANTS = { blue: '#2a3448', red: '#3a2a24' };
// ---- Demir Tank (Higgsfield modeli) ----
const tankMats = new Map();
export function createTank(team = 'blue', len = 2.7) {
  const m = A.hfModel('u_tank'); if (!m) return null;
  const sz = A.hfSize('u_tank'), k = len / Math.max(sz.x, sz.z);
  m.scale.setScalar(k);
  m.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    const key = o.material.uuid + team; if (!tankMats.has(key)) { const mt = o.material.clone(); mt.color = team === 'red' ? new THREE.Color(1.15, 0.58, 0.52) : new THREE.Color(0.78, 0.9, 1.25); tankMats.set(key, mt); } o.material = tankMats.get(key);
  });
  const obj = new THREE.Group(), inner = new THREE.Group(); inner.add(m); obj.add(inner);
  obj.userData = { tank: true, inner, h: sz.y * k, len, recoil: 0 };
  return obj;
}
function animateTank(obj, state, t, dt) {
  const ud = obj.userData, I = ud.inner; dt = Math.min(dt || 0.016, 0.1);
  if (state === 'die') {
    ud.dieT = (ud.dieT || 0) + dt; const e = Math.min(1, ud.dieT / 1.2);
    I.rotation.z = e * 0.28; I.rotation.x = -e * 0.12; I.position.y = -e * ud.h * 0.25;
    if (!ud.dark) { ud.dark = true; I.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.multiplyScalar(0.35); } }); }
    return;
  }
  ud.recoil = Math.max(0, ud.recoil - dt * 3);
  const moving = state === 'walk' || state === 'run';
  I.position.y = moving ? Math.abs(Math.sin(t * 14)) * 0.035 : state === 'cheer' ? Math.abs(Math.sin(t * 5)) * 0.25 : I.position.y * 0.85;
  I.rotation.x = moving ? Math.sin(t * 7) * 0.015 - 0.02 : -ud.recoil * 0.12;
  I.position.z = -ud.recoil * 0.35;
}
export function createSoldier(type, team = 'blue') {
  if (type === 'tank') { const tk = createTank(team); if (tk) return tk; type = 'cavalry'; }
  { const cfg = (KKCFG[team] || KKCFG.blue)[type]; if (cfg) { const o = kkUnit(cfg[0], cfg[1], cfg[2], { mounted: type === 'cavalry', team, coat: ['#5a3a22', '#3a2416', '#7a5a3a', '#2a2420'][Math.floor(Math.random() * 4)] }); if (o) return o; } }
  const col = teamColor(team), skin = SKINS[Math.floor(Math.random() * SKINS.length)];
  const hair = ['#2a1a10', '#4a2a14', '#1a1410', '#6a4020', '#8a6a40'][Math.floor(Math.random() * 5)];
  const beard = Math.random() < 0.55;
  if (type === 'infantry') {
    const h = buildHuman({ team, cloth: col, trim: '#f3c24a', skin, hair, beard, armor: 'mail', helmet: 'nasal', metal: 'steel', tabard: true, pants: PANTS[team], gloves: true });
    assemble(h, 'sword', 'round', team, 'steel');
    return finalize(h.root, 'sword', h);
  }
  if (type === 'spearman') {
    const h = buildHuman({ team, cloth: team === 'blue' ? '#3a5a9a' : '#9a3a2a', trim: '#e8d8a8', skin, hair, beard, armor: 'gambeson', helmet: 'open', metal: 'steel', tabard: false, pants: PANTS[team], plume: null });
    assemble(h, 'spear', 'kite', team, 'steel');
    return finalize(h.root, 'spear', h);
  }
  if (type === 'archer') {
    const h = buildHuman({ team, cloth: team === 'blue' ? '#3a4a6a' : '#6a3a2a', hood: team === 'blue' ? '#24407a' : '#7a2420', skin, hair, beard: beard && Math.random() < 0.5, armor: 'leather', leather: '#6a4424', helmet: 'hood', tabard: false, pants: '#3a3020', gloves: true });
    assemble(h, 'bow', null, team, 'steel', { sidearm: true });
    return finalize(h.root, 'bow', h);
  }
  // süvari şövalye
  const h = buildHuman({ team, cloth: col, trim: '#f3c24a', skin, hair, armor: 'plate', helmet: 'great', metal: 'steel', tabard: true, plume: team === 'blue' ? '#f0f0f0' : '#1a1a1a', pauldrons: true });
  assemble(h, 'lance', 'kite', team, 'steel');
  const horse = buildHorse(team, ['#5a3a22', '#3a2416', '#7a5a3a', '#2a2420'][Math.floor(Math.random() * 4)]);
  const obj = mount(h, horse);
  return finalize(obj, 'lance', h, horse);
}

export function createHero(def) {
  const o = kkHero(def);
  if (o) { attachHero3d(o, def); return o; }
  const L = def.look || {}, R = def.rarity || 2;
  const metal = L.metal || 'steel';
  const team = 'blue';
  const role = def.role;
  const armor = role === 'archer' ? 'leather' : R >= 4 || role === 'cavalry' ? 'plate' : 'mail';
  const skin = L.female ? '#e8c0a0' : SKINS[(def.id || '').length % SKINS.length];
  const h = buildHuman({
    team: 'blue', cloth: L.primary || '#2f62c8', trim: L.secondary || '#f3c24a', skin, hair: L.hair, beard: L.beard, female: L.female,
    armor, helmet: L.helmet || 'none', metal, tabard: role !== 'archer' || R >= 4, pants: '#2a2420', hood: L.primary,
    cape: R >= 4 ? (L.secondary && R === 5 ? L.primary : L.primary) : R === 3 ? L.primary : null,
    plume: role === 'cavalry' && L.helmet === 'great' ? L.secondary : null, pauldrons: R >= 3, gloves: true, leather: '#5a3a22',
  });
  // kahraman tabardı amblemli: kendi rengini kullan
  let accent = null;
  if (R === 5) accent = mm('accent5', () => new THREE.MeshStandardMaterial({ color: 0xffe8a0, emissive: 0xffa020, emissiveIntensity: 0.9, metalness: 0.9, roughness: 0.2 }));
  else if (R === 4) accent = mm('accent4', () => new THREE.MeshStandardMaterial({ color: 0xd8c0ff, emissive: 0x8a3aff, emissiveIntensity: 0.7, metalness: 0.9, roughness: 0.2 }));
  const wpn = L.weapon || 'sword';
  const shield = role === 'infantry' && (wpn === 'sword' || wpn === 'spear' || wpn === 'axe') ? (wpn === 'spear' ? 'kite' : 'round') : role === 'cavalry' && wpn !== 'lance' ? 'kite' : null;
  assemble(h, wpn, shield, team, metal, { accent, sidearm: role === 'archer' });
  // nadirlik süslemeleri
  if (R >= 4) {
    const trimM = matMetal(R === 5 ? 'gold' : 'steel');
    mesh(gm('gorget', () => new THREE.TorusGeometry(0.095, 0.02, 6, 18).rotateX(Math.PI / 2)), trimM, h.rig.spine, 0, 0.47, 0.0, 0, 0, 0, 1, 1, 0.85);
  }
  let obj, horse = null;
  if (role === 'cavalry') {
    horse = buildHorse(team, R === 5 ? '#e8e4dc' : R === 4 ? '#2a2420' : '#6a4428', L.primary, R >= 4);
    obj = mount(h, horse);
  } else obj = h.root;
  // aura
  if (R >= 4) {
    const auraTex = tm('aura', () => { const [c, x] = cnv(128, 128); const g = x.createRadialGradient(64, 64, 20, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.55, 'rgba(255,255,255,.55)'); g.addColorStop(0.7, 'rgba(255,255,255,.2)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); });
    const col = R === 5 ? new THREE.Color(2.2, 1.6, 0.5) : new THREE.Color(1.4, 0.8, 2.4);
    const ring = new THREE.Mesh(gm('auraplane', () => new THREE.PlaneGeometry(1.8, 1.8).rotateX(-Math.PI / 2)), new THREE.MeshBasicMaterial({ map: auraTex, color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring.position.y = 0.02; obj.add(ring);
    const sparks = [];
    const spTex = tm('spark', () => { const [c, x] = cnv(32, 32); const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); });
    for (let i = 0; i < 10; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: spTex, color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); s.scale.setScalar(0.08); obj.add(s); sparks.push({ s, a: Math.random() * TAU, o: Math.random(), r: rand(0.4, 0.7) }); }
    obj.userData.fx = (t) => { ring.rotation.y = t * 0.5; ring.material.opacity = 0.7 + Math.sin(t * 3) * 0.25; for (const p of sparks) { const u = (t * 0.35 + p.o) % 1; p.s.position.set(Math.cos(p.a + t * 0.6) * p.r, u * (horse ? 2.6 : 1.9), Math.sin(p.a + t * 0.6) * p.r); p.s.material.opacity = Math.sin(u * Math.PI); } };
  }
  finalize(obj, wpn, h, horse);
  obj.userData.hero = true;
  return obj;
}

// ---------------------------------------------------------------------
//  Animasyon
// ---------------------------------------------------------------------
const POSE_KEYS = ['hipsY', 'spX', 'spY', 'spZ', 'nkX', 'nkY', 'rsX', 'rsY', 'rsZ', 'reX', 'lsX', 'lsY', 'lsZ', 'leX', 'rhX', 'rkX', 'lhX', 'lkX', 'rhZ', 'lhZ', 'wX', 'wY', 'wZ'];
function basePose(kind) {
  // nötr duruş: silah tutuşu
  const p = { hipsY: 0, spX: 0, spY: 0, spZ: 0, nkX: 0, nkY: 0, rsX: 0.05, rsY: 0, rsZ: -0.12, reX: -0.35, lsX: 0.05, lsY: 0, lsZ: 0.12, leX: -0.35, rhX: 0, rkX: 0, lhX: 0, lkX: 0, rhZ: 0, lhZ: 0, wX: -1.0, wY: 0, wZ: 0 };
  if (kind === 'sword' || kind === 'axe' || kind === 'hammer') { p.rsX = 0.0; p.reX = -0.75; p.wX = -1.15; p.lsX = -0.35; p.lsZ = 0.15; p.leX = -1.3; p.lsY = 0.2; }
  if (kind === 'spear') { p.rsX = 0.05; p.reX = -1.2; p.wX = -2.0; p.rsZ = -0.2; p.lsX = -0.35; p.lsZ = 0.15; p.leX = -1.3; p.lsY = 0.2; }
  if (kind === 'lance') { p.rsX = -0.35; p.reX = -1.2; p.wX = 0.35; p.lsX = -0.5; p.lsZ = 0.2; p.leX = -1.1; }
  if (kind === 'bow') { p.lsX = -0.35; p.leX = -0.6; p.wX = -1.1; p.wZ = 0; p.rsX = 0.05; p.reX = -0.4; }
  return p;
}
const ridePose = (p) => { p.rhX = -1.35; p.lhX = -1.35; p.rkX = 1.45; p.lkX = 1.45; p.rhZ = 0.32; p.lhZ = -0.32; return p; };
function computePose(kind, state, t, mounted) {
  const p = basePose(kind);
  const breathe = Math.sin(t * 1.8) * 0.025;
  p.spX += breathe;
  if (state === 'idle') {
    p.nkY = Math.sin(t * 0.4) * 0.15; p.spY = Math.sin(t * 0.3) * 0.05;
    p.rhZ = 0.03; p.lhZ = -0.03;
  } else if (state === 'walk' || state === 'run') {
    const run = state === 'run', f = run ? 9.5 : 6, A = run ? 0.85 : 0.5, ph = t * f, s = Math.sin(ph);
    p.rhX = -s * A; p.lhX = s * A;
    p.rkX = Math.max(0, s) * (run ? 1.5 : 0.9) + 0.1; p.lkX = Math.max(0, -s) * (run ? 1.5 : 0.9) + 0.1;
    p.hipsY = Math.abs(Math.cos(ph)) * (run ? 0.05 : 0.025);
    p.spX += run ? 0.18 : 0.05; p.spY = s * 0.06;
    if (kind === 'bow') { p.rsX = s * 0.5; p.lsX = -0.3 - s * 0.2; }
    else p.rsX += s * 0.2;
  } else if (state === 'attack') {
    const per = kind === 'bow' ? 1.6 : kind === 'spear' || kind === 'lance' ? 1.0 : 1.1;
    const u = ((t % per) + per) % per / per;
    if (kind === 'sword' || kind === 'axe' || kind === 'hammer') {
      // kurulum → hızlı vuruş → toparlanma
      const k = u < 0.45 ? u / 0.45 : u < 0.6 ? 1 - (u - 0.45) / 0.15 : 0;
      const strike = u >= 0.45 && u < 0.75 ? 1 - Math.abs(u - 0.55) / 0.2 : 0;
      p.rsX = -0.6 - k * 2.3 + strike * 0.4; p.reX = -0.5 - k * 0.6; p.rsZ = -0.25 - k * 0.2; p.wX = -0.4 - k * 0.4;
      p.spY = 0.35 * k - 0.4 * strike; p.spX = 0.1 + strike * 0.2;
      p.lsX = -0.6; p.leX = -1.1; p.lsY = 0.3;
      p.rhX = -0.35; p.lhX = 0.25; p.rkX = 0.3; p.lkX = 0.15;
    } else if (kind === 'spear') {
      const th = u < 0.35 ? -u / 0.35 * 0.35 : u < 0.55 ? (u - 0.35) / 0.2 : 1 - (u - 0.55) / 0.45;
      p.rsX = -1.1 - th * 0.35; p.reX = -0.6 + th * 0.55; p.wX = 0.1; p.spX = 0.15 + th * 0.15; p.spY = -0.25 * th;
      p.lsX = -0.6; p.leX = -1.1; p.lsY = 0.3; p.rhX = -0.4; p.lhX = 0.3; p.rkX = 0.35; p.lkX = 0.1;
    } else if (kind === 'lance') {
      p.rsX = -0.3; p.reX = -1.1; p.wX = 0.45 + Math.sin(t * 9) * 0.05; p.spX = 0.25;
    } else if (kind === 'bow') {
      const draw = u < 0.55 ? u / 0.55 : u < 0.62 ? 1 : 0;
      p.lsX = -1.55; p.lsY = 0.05; p.lsZ = 0.15; p.leX = -0.05; p.wX = 0.0; p.wZ = 0.0;
      p.rsX = -1.45; p.rsY = 0.2 + draw * 0.35; p.reX = -1.0 - draw * 1.3; p.rsZ = -0.1;
      p.spY = 0.45; p.nkY = -0.4; p.rhX = -0.2; p.lhX = 0.25;
    }
  } else if (state === 'cheer') {
    const b = Math.abs(Math.sin(t * 4));
    p.rsX = -2.9 + b * 0.25; p.reX = -0.2; p.wX = -0.3 + 0.0; p.rsZ = -0.15; p.hipsY = b * 0.04;
    p.lsX = -0.4; p.lsZ = 0.35; p.leX = -1.2; p.nkX = -0.2; p.spX = -0.08;
    if (kind === 'bow') { p.lsX = -2.8; p.leX = -0.2; p.lsZ = 0.2; p.rsX = -0.2; p.reX = -0.6; p.wX = -0.6; }
  }
  if (mounted) ridePose(p);
  return p;
}
function applyRig(r, c) {
  r.hips.position.y = (r._hipY ??= r.hips.position.y) + c.hipsY;
  r.spine.rotation.set(c.spX, c.spY, c.spZ);
  r.neck.rotation.set(c.nkX, c.nkY, 0);
  r.armR.sh.rotation.set(c.rsX, c.rsY, c.rsZ); r.armR.el.rotation.x = c.reX;
  r.armL.sh.rotation.set(c.lsX, c.lsY, c.lsZ); r.armL.el.rotation.x = c.leX;
  r.legR.hp.rotation.set(c.rhX, 0, c.rhZ); r.legR.kn.rotation.x = c.rkX;
  r.legL.hp.rotation.set(c.lhX, 0, c.lhZ); r.legL.kn.rotation.x = c.lkX;
  if (r.weapon) r.weapon.rotation.set(c.wX, c.wY, c.wZ);
}
function animateHorse(hs, state, t, dt, ud) {
  const moving = state === 'walk' || state === 'run' || (state === 'attack' && ud.kind === 'lance');
  const gallop = state === 'run' || (state === 'attack' && ud.kind === 'lance');
  const f = gallop ? 9 : 5.5, A = gallop ? 0.75 : 0.35, ph = t * f;
  for (let i = 0; i < 4; i++) {
    const L = hs.legs[i], off = gallop ? (L.front ? 0 : Math.PI * 0.9) + (i % 2) * 0.35 : [0, Math.PI, Math.PI * 1.5, Math.PI * 0.5][i];
    const s = moving ? Math.sin(ph + off) : 0;
    L.up.rotation.x = damp(L.up.rotation.x, s * A * (L.front ? -1 : 1), 16, dt);
    const bend = moving ? Math.max(0, L.front ? Math.sin(ph + off + 0.8) : -Math.sin(ph + off + 0.8)) * (gallop ? 1.3 : 0.7) * (L.front ? -1 : 1) : 0;
    L.kn.rotation.x = damp(L.kn.rotation.x, -bend, 16, dt);
  }
  hs.body.rotation.x = damp(hs.body.rotation.x, moving ? Math.sin(ph * (gallop ? 1 : 2)) * (gallop ? 0.07 : 0.02) : 0, 10, dt);
  hs.body.position.y = 1.15 + (moving ? Math.abs(Math.sin(ph)) * (gallop ? 0.1 : 0.03) : 0);
  hs.neck.rotation.x = 0.72 + (moving ? Math.sin(ph + 1) * (gallop ? 0.12 : 0.05) : Math.sin(t * 0.7) * 0.04);
  hs.head.rotation.x = 1.15 + (state === 'idle' ? Math.sin(t * 0.5) * 0.08 : 0);
  hs.tail.rotation.x = -0.5 + Math.sin(t * (moving ? 6 : 1.5)) * 0.12;
  hs.tail.rotation.z = Math.sin(t * 1.3) * 0.15;
}
export function animateUnit(obj, state, t, dt) {
  const ud = obj.userData;
  if (ud.tank) return animateTank(obj, state, t, dt);
  if (ud.h3) {
    const H = ud.h3; dt = Math.min(dt || 0.016, 0.1); H.t += dt;
    heroIdle(H);
    if (state === 'cheer' && !ud.moved) { ud.moved = true; playHeroMove(obj); }
    if (ud.move) stepMove(obj, ud, H, dt);
    else { H.root.position.y = Math.sin(H.t * 1.7) * 0.008; }
    if (ud.fx) ud.fx(t);
    return;
  }
  if (ud.kk) return kkAnimate(obj, state, t, dt);
  if (!ud.rig) return;
  dt = Math.min(dt || 0.016, 0.1);
  if (ud.fx) ud.fx(t);
  const r = ud.rig, kind = ud.kind;
  // ölüm
  if (state === 'die') {
    if (ud.dieT === undefined) ud.dieT = 0;
    ud.dieT += dt;
    const k = Math.min(1, ud.dieT / 0.7), e = k * k * (3 - 2 * k);
    const inner = ud.inner;
    if (ud.mounted) {
      const hs = ud.horse;
      hs.inner.rotation.z = e * 1.35; hs.inner.position.y = -e * 0.15;
      r.spine.rotation.x = -e * 0.6;
    } else {
      inner.rotation.x = -e * (Math.PI / 2 - 0.08); inner.position.y = e * 0.12; inner.position.z = -e * 0.2;
      r.armR.sh.rotation.x = damp(r.armR.sh.rotation.x, -2.6, 6, dt); r.armL.sh.rotation.x = damp(r.armL.sh.rotation.x, -2.2, 6, dt);
      r.legR.kn.rotation.x = damp(r.legR.kn.rotation.x, 0.4, 6, dt);
    }
    return;
  }
  if (ud.dieT !== undefined) { ud.dieT = undefined; ud.inner.rotation.set(0, 0, 0); ud.inner.position.set(0, 0, 0); if (ud.horse) { ud.horse.inner.rotation.set(0, 0, 0); ud.horse.inner.position.set(0, 0, 0); } }
  const target = computePose(kind, state, t, ud.mounted);
  const c = ud.cur;
  const L = state === 'attack' ? 22 : 12;
  for (const k of POSE_KEYS) c[k] = c[k] === undefined ? target[k] : damp(c[k], target[k], L, dt);
  applyRig(r, c);
  if (ud.horse) animateHorse(ud.horse, state, t, dt, ud);
  // pelerin dalgası
  if (r.cape) {
    const moving = state === 'walk' || state === 'run' || ud.mounted && state !== 'idle';
    r.cape.forEach((seg, i) => { seg.rotation.x = (i === 0 ? 0.12 : 0.06) + (moving ? 0.12 : 0) + Math.sin(t * 2.4 - i * 0.7) * (0.04 + i * 0.012); });
  }
}
