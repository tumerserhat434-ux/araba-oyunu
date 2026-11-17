// =====================================================================
//  DEMİR SANCAK — prosedürel 3D binalar, çevre ve dekor
// =====================================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as A from './assets.js';

export const FOOTPRINT = { townhall: 11, barracks: 8, archery: 5, hospital: 8, potion: 6, heroes: 8, summon: 8, farm: 7, lumber: 7, quarry: 7, warehouse: 7, academy: 8 };

const rand = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;

// ---------------------------------------------------------------------
//  Dokular (canvas) — bir kez üretilir
// ---------------------------------------------------------------------
function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, srgb = true) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function normalFrom(c, strength = 2) {
  const w = c.width, h = c.height, src = c.getContext('2d').getImageData(0, 0, w, h).data;
  const [o, ctx] = cnv(w, h), img = ctx.createImageData(w, h), d = img.data;
  const L = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (L(x + 1, y) - L(x - 1, y)) * strength, dy = (L(x, y + 1) - L(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return tex(o, false);
}
function noise(ctx, w, h, n, a0, a1, cols) {
  for (let i = 0; i < n; i++) { ctx.globalAlpha = rand(a0, a1); ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(Math.random() * w, Math.random() * h, rand(1, 3), rand(1, 3)); }
  ctx.globalAlpha = 1;
}
const T = {};
function textures() {
  if (T.ready) return T;
  // taş bloklar
  {
    const [c, x] = cnv(256, 256), [hc, hx] = cnv(256, 256);
    x.fillStyle = '#6a645a'; x.fillRect(0, 0, 256, 256); hx.fillStyle = '#000'; hx.fillRect(0, 0, 256, 256);
    const rows = 8, rh = 256 / rows;
    for (let r = 0; r < rows; r++) {
      let xx = r % 2 ? -rand(10, 30) : 0;
      while (xx < 256) {
        const bw = rand(36, 70), v = rand(120, 175), tint = rand(-12, 12);
        x.fillStyle = `rgb(${v + tint},${v - 4},${v - 14 - tint})`;
        x.fillRect(xx + 2, r * rh + 2, bw - 4, rh - 4);
        const g = hx.createLinearGradient(0, r * rh, 0, r * rh + rh); g.addColorStop(0, '#bbb'); g.addColorStop(0.5, '#fff'); g.addColorStop(1, '#999');
        hx.fillStyle = g; hx.fillRect(xx + 2, r * rh + 2, bw - 4, rh - 4);
        xx += bw;
      }
    }
    noise(x, 256, 256, 6000, 0.05, 0.25, ['#000', '#fff', '#3a5a2a']);
    noise(hx, 256, 256, 3000, 0.1, 0.3, ['#000', '#fff']);
    T.stone = tex(c); T.stoneN = normalFrom(hc, 3);
  }
  // sıva
  { const [c, x] = cnv(128, 128); x.fillStyle = '#e8dcc4'; x.fillRect(0, 0, 128, 128); noise(x, 128, 128, 2500, 0.05, 0.2, ['#c8b898', '#fff', '#b8a888']); T.plaster = tex(c); }
  // ahşap tahta
  {
    const [c, x] = cnv(128, 256), [hc, hx] = cnv(128, 256);
    for (let i = 0; i < 6; i++) {
      const v = rand(95, 130); x.fillStyle = `rgb(${v},${v * 0.68},${v * 0.42})`; x.fillRect(i * 21.33, 0, 21.33, 256);
      hx.fillStyle = '#fff'; hx.fillRect(i * 21.33 + 1, 0, 19.33, 256);
      for (let k = 0; k < 30; k++) { x.strokeStyle = `rgba(40,25,10,${rand(0.1, 0.3)})`; x.beginPath(); const px = i * 21.33 + rand(2, 19); x.moveTo(px, 0); x.lineTo(px + rand(-3, 3), 256); x.stroke(); }
    }
    T.plank = tex(c); T.plankN = normalFrom(hc, 2);
  }
  // kiremit
  {
    const mk = (base, dark) => {
      const [c, x] = cnv(256, 256), [hc, hx] = cnv(256, 256);
      x.fillStyle = dark; x.fillRect(0, 0, 256, 256); hx.fillStyle = '#000'; hx.fillRect(0, 0, 256, 256);
      const rows = 10, rh = 256 / rows, cols = 8, cw = 256 / cols;
      for (let r = 0; r < rows; r++) for (let k = -1; k <= cols; k++) {
        const cx = k * cw + (r % 2 ? cw / 2 : 0), cy = r * rh;
        const v = rand(0.82, 1.12);
        const g = x.createLinearGradient(0, cy, 0, cy + rh); g.addColorStop(0, shade(base, v * 0.75)); g.addColorStop(1, shade(base, v * 1.05));
        x.fillStyle = g; x.beginPath(); x.moveTo(cx + 1, cy); x.lineTo(cx + cw - 1, cy); x.lineTo(cx + cw - 1, cy + rh * 0.7); x.quadraticCurveTo(cx + cw / 2, cy + rh * 1.15, cx + 1, cy + rh * 0.7); x.fill();
        const hg = hx.createLinearGradient(0, cy, 0, cy + rh); hg.addColorStop(0, '#333'); hg.addColorStop(1, '#fff');
        hx.fillStyle = hg; hx.beginPath(); hx.moveTo(cx + 1, cy); hx.lineTo(cx + cw - 1, cy); hx.lineTo(cx + cw - 1, cy + rh * 0.7); hx.quadraticCurveTo(cx + cw / 2, cy + rh * 1.15, cx + 1, cy + rh * 0.7); hx.fill();
      }
      return [tex(c), normalFrom(hc, 3)];
    };
    [T.roofRed, T.roofRedN] = mk('#b0462a', '#3a1a10');
    [T.roofBlue, T.roofBlueN] = mk('#3a5a8a', '#141e30');
    [T.roofPurple, T.roofPurpleN] = mk('#6a3a9a', '#20102e');
  }
  // saman çatı
  {
    const [c, x] = cnv(128, 128); x.fillStyle = '#b8964a'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i++) { x.strokeStyle = `rgba(${rand(80, 230)},${rand(60, 190)},${rand(20, 90)},.6)`; x.beginPath(); const px = Math.random() * 128, py = Math.random() * 128; x.moveTo(px, py); x.lineTo(px + rand(-2, 2), py + rand(8, 18)); x.stroke(); }
    T.thatch = tex(c);
  }
  // toprak
  { const [c, x] = cnv(128, 128); x.fillStyle = '#7a5e3e'; x.fillRect(0, 0, 128, 128); noise(x, 128, 128, 4000, 0.1, 0.4, ['#5a4228', '#9a7a52', '#6a5a3a', '#8a8070']); T.dirt = tex(c); }
  // sancak
  {
    const [c, x] = cnv(128, 192);
    x.fillStyle = '#2f6fe0'; x.fillRect(0, 0, 128, 192);
    x.fillStyle = '#1e4ab0'; x.fillRect(0, 0, 10, 192); x.fillRect(118, 0, 10, 192);
    x.fillStyle = '#f3c24a'; x.fillRect(0, 0, 128, 10);
    starPath(x, 64, 80, 34, 14); x.fill();
    x.beginPath(); x.moveTo(0, 192); x.lineTo(64, 160); x.lineTo(128, 192); x.fillStyle = 'rgba(0,0,0,0)'; x.globalCompositeOperation = 'destination-out'; x.fill(); x.globalCompositeOperation = 'source-over';
    T.banner = tex(c); T.banner.wrapS = T.banner.wrapT = THREE.ClampToEdgeWrapping;
  }
  // rün dairesi
  {
    const [c, x] = cnv(256, 256); x.clearRect(0, 0, 256, 256); x.strokeStyle = '#fff'; x.lineWidth = 5;
    for (const r of [120, 98, 60]) { x.beginPath(); x.arc(128, 128, r, 0, TAU); x.stroke(); }
    x.lineWidth = 3; x.beginPath(); for (let i = 0; i <= 5; i++) { const a = (i / 5) * TAU * 2 - Math.PI / 2; const px = 128 + Math.cos(a) * 98, py = 128 + Math.sin(a) * 98; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke();
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; x.fillStyle = '#fff'; x.fillRect(128 + Math.cos(a) * 109 - 3, 128 + Math.sin(a) * 109 - 3, 6, 6); }
    T.rune = new THREE.CanvasTexture(c); T.rune.colorSpace = THREE.SRGBColorSpace;
  }
  // yumuşak parıltı
  { const [c, x] = cnv(64, 64); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); T.glow = new THREE.CanvasTexture(c); }
  // şifa amblemi (yaprak)
  {
    const [c, x] = cnv(128, 128); x.fillStyle = '#f4efe2'; x.beginPath(); x.arc(64, 64, 62, 0, TAU); x.fill();
    x.fillStyle = '#2f9a4a'; x.beginPath(); x.moveTo(64, 18); x.bezierCurveTo(110, 40, 100, 100, 64, 112); x.bezierCurveTo(28, 100, 18, 40, 64, 18); x.fill();
    x.strokeStyle = '#d8f8d0'; x.lineWidth = 4; x.beginPath(); x.moveTo(64, 30); x.lineTo(64, 104); x.stroke();
    for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(64, 48 + i * 14); x.lineTo(64 + 18 - i * 2, 38 + i * 14); x.moveTo(64, 48 + i * 14); x.lineTo(64 - 18 + i * 2, 38 + i * 14); x.stroke(); }
    T.heal = new THREE.CanvasTexture(c); T.heal.colorSpace = THREE.SRGBColorSpace;
  }
  T.ready = true;
  return T;
}
function shade(hex, k) { const c = new THREE.Color(hex).multiplyScalar(k); return '#' + c.getHexString(); }
function starPath(x, cx, cy, R, r) { x.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU - Math.PI / 2, rr = i % 2 ? r : R; i ? x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : x.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); }

// ---------------------------------------------------------------------
//  Malzemeler
// ---------------------------------------------------------------------
const M = {};
function mats() {
  if (M.ready) return M;
  const t = textures();
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o });
  M.stone = std({ map: t.stone, normalMap: t.stoneN, roughness: 0.9 });
  M.stoneDark = std({ map: t.stone, normalMap: t.stoneN, color: 0x9a948a, roughness: 0.9 });
  M.plaster = std({ map: t.plaster, roughness: 0.95 });
  M.timber = std({ color: 0x4a301c, roughness: 0.8 });
  M.plank = std({ map: t.plank, normalMap: t.plankN, roughness: 0.85 });
  M.roofRed = std({ map: t.roofRed, normalMap: t.roofRedN, roughness: 0.7 });
  M.roofBlue = std({ map: t.roofBlue, normalMap: t.roofBlueN, roughness: 0.55, metalness: 0.1 });
  M.roofPurple = std({ map: t.roofPurple, normalMap: t.roofPurpleN, roughness: 0.55 });
  M.thatch = std({ map: t.thatch, roughness: 1 });
  M.gold = std({ color: 0xe0b040, metalness: 1, roughness: 0.28 });
  M.iron = std({ color: 0x3a3a40, metalness: 0.9, roughness: 0.45 });
  M.window = new THREE.MeshStandardMaterial({ color: 0x2a1a08, emissive: 0xffa040, emissiveIntensity: 1.1, roughness: 0.4 });
  M.dark = std({ color: 0x141010, roughness: 1 });
  M.dirt = std({ map: t.dirt, roughness: 1 });
  M.hay = std({ color: 0xd8b860, roughness: 1 });
  M.wheat = std({ color: 0xe0c058, roughness: 0.9 });
  M.cloth = std({ color: 0xf0ead8, roughness: 1, side: THREE.DoubleSide });
  M.blue = std({ color: 0x2f6fe0, roughness: 0.9, side: THREE.DoubleSide });
  M.red = std({ color: 0xb8302a, roughness: 0.9 });
  M.leaf = std({ color: 0x4a8a34, roughness: 0.9, flatShading: true });
  M.leafDark = std({ color: 0x2f6a2a, roughness: 0.9, flatShading: true });
  M.leafLight = std({ color: 0x7ab048, roughness: 0.9, flatShading: true });
  M.pine = std({ color: 0x2a5a32, roughness: 0.9, flatShading: true });
  M.bark = std({ color: 0x5a4030, roughness: 1 });
  M.birch = std({ color: 0xe8e4da, roughness: 0.9 });
  M.rock = std({ color: 0x8a8880, roughness: 0.95, flatShading: true });
  M.marble = std({ color: 0xf0ebe0, roughness: 0.4 });
  M.water = std({ color: 0x3a8ab0, roughness: 0.1, metalness: 0.2 });
  M.crystal = new THREE.MeshStandardMaterial({ color: 0xb08aff, emissive: 0x8a4aff, emissiveIntensity: 1.6, roughness: 0.1, metalness: 0.1 });
  M.greenGlow = new THREE.MeshStandardMaterial({ color: 0x40ff80, emissive: 0x30ff70, emissiveIntensity: 1.4, roughness: 0.2 });
  M.banner = std({ map: t.banner, roughness: 0.9, side: THREE.DoubleSide, alphaTest: 0.5 });
  M.heal = std({ map: t.heal, roughness: 0.8 });
  M.runeMat = new THREE.MeshBasicMaterial({ map: t.rune, color: new THREE.Color(1.6, 0.8, 3.0), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  M.ready = true;
  return M;
}

// ---------------------------------------------------------------------
//  Geometri birleştirici
// ---------------------------------------------------------------------
class Kit {
  constructor() { this.parts = {}; this.group = new THREE.Group(); this.anims = []; }
  add(geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz)));
    (this.parts[mat] ||= []).push(g);
    return this;
  }
  build(height) {
    if (CUR) { levelExtras(this, CUR.key, CUR.L, height); CUR = null; }
    const m = mats();
    for (const k in this.parts) {
      const mesh = new THREE.Mesh(mergeGeometries(this.parts[k]), m[k]);
      mesh.castShadow = !['window', 'runeMat', 'greenGlow'].includes(k); mesh.receiveShadow = true;
      this.group.add(mesh);
      this.parts[k].forEach((g) => g.dispose());
    }
    const anims = this.anims;
    this.group.userData.update = (t, dt) => { for (const a of anims) a(t, dt); };
    this.group.userData.height = height;
    return this.group;
  }
}
// Dünya ölçeğinde UV'li kutu
function boxUV(w, h, d, s = 2) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / s, uv.getY(k) * dims[f][1] / s); }
  return g;
}
function cylUV(rt, rb, h, seg = 16, s = 2, open = false) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), uv = g.attributes.uv;
  const circ = TAU * Math.max(rt, rb);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * circ / s, uv.getY(i) * h / s);
  return g;
}
// Beşik çatı (üçgen prizma) — X boyunca uzanır
function gableRoof(w, d, h, over = 0.4) {
  const hw = d / 2 + over;
  const sh = new THREE.Shape(); sh.moveTo(-hw, 0); sh.lineTo(hw, 0); sh.lineTo(0, h); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: w + over * 2, bevelEnabled: false });
  g.translate(0, 0, -(w + over * 2) / 2);
  g.rotateY(Math.PI / 2);
  // UV: dünya ölçeği (kiremitler)
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (Math.abs(n.getY(i)) > 0.2) uv.setXY(i, x / 2.2, (Math.hypot(z, y)) / 2.2 * (z >= 0 ? 1 : -1));
    else uv.setXY(i, z / 2.2, y / 2.2);
  }
  return g;
}
// Gable duvarı (üçgen alın) — Z yüzlü
function gableWall(d, h, t = 0.2) {
  const sh = new THREE.Shape(); sh.moveTo(-d / 2, 0); sh.lineTo(d / 2, 0); sh.lineTo(0, h); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false }); g.translate(0, 0, -t / 2);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 2, p.getY(i) / 2);
  return g;
}
const G = {};
function geos() {
  if (G.ready) return G;
  G.cyl8 = new THREE.CylinderGeometry(1, 1, 1, 8);
  G.cyl12 = new THREE.CylinderGeometry(1, 1, 1, 12);
  G.cone8 = new THREE.ConeGeometry(1, 1, 8);
  G.cone16 = new THREE.ConeGeometry(1, 1, 16);
  G.sphere = new THREE.SphereGeometry(1, 12, 8);
  G.hemi = new THREE.SphereGeometry(1, 14, 8, 0, TAU, 0, Math.PI / 2);
  G.box = new THREE.BoxGeometry(1, 1, 1);
  G.ico = new THREE.IcosahedronGeometry(1, 1);
  G.torus = new THREE.TorusGeometry(1, 0.1, 6, 20);
  G.ready = true;
  return G;
}
function blob(r, amt = 0.3, detail = 1) {
  const g = new THREE.IcosahedronGeometry(r, detail), p = g.attributes.position, seed = Math.random() * 100;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + Math.sin(x * 3.1 + seed) * Math.cos(y * 2.7 + seed) * Math.sin(z * 2.3) * amt;
    p.setXYZ(i, x * k, y * k, z * k);
  }
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------------
//  Ortak yapı parçaları
// ---------------------------------------------------------------------
// Pencere: koyu çerçeve + parlayan cam (yüz +Z)
function windowAt(k, x, y, z, ry = 0, w = 0.55, h = 0.8, arched = false) {
  const g = geos(), c = Math.cos(ry), s = Math.sin(ry);
  const off = (dz) => [x + s * dz, z + c * dz];
  let [px, pz] = off(0.02);
  k.add(g.box, 'window', px, y, pz, 0, ry, 0, w, h, 0.06);
  [px, pz] = off(0.06);
  k.add(g.box, 'timber', px, y + h / 2 + 0.05, pz, 0, ry, 0, w + 0.2, 0.1, 0.12);
  k.add(g.box, 'timber', px, y - h / 2 - 0.05, pz, 0, ry, 0, w + 0.25, 0.1, 0.16);
  k.add(g.box, 'timber', px, y, pz, 0, ry, 0, 0.06, h, 0.08);
  k.add(g.box, 'timber', px, y, pz, 0, ry, 0, w, 0.05, 0.08);
  if (arched) k.add(new THREE.CylinderGeometry(w / 2, w / 2, 0.06, 12, 1, false, -Math.PI / 2, Math.PI), 'window', ...off(0.02).flatMap((v, i) => (i ? [y + h / 2, v] : [v])), Math.PI / 2, ry, 0);
}
function doorAt(k, x, z, ry = 0, w = 1.2, h = 1.9, matDoor = 'plank') {
  const g = geos(), c = Math.cos(ry), s = Math.sin(ry);
  k.add(boxUV(w, h, 0.12, 1), matDoor, x + s * 0.03, h / 2, z + c * 0.03, 0, ry, 0);
  k.add(new THREE.CylinderGeometry(w / 2, w / 2, 0.12, 14, 1, false, -Math.PI / 2, Math.PI), matDoor, x + s * 0.03, h, z + c * 0.03, Math.PI / 2, ry, 0);
  k.add(g.box, 'stoneDark', x + s * 0.06, h / 2, z + c * 0.06, 0, ry, 0, w + 0.35, 0.12, 0.2);
  k.add(g.box, 'iron', x + s * 0.1 + c * w * 0.25, h * 0.5, z + c * 0.1 - s * w * 0.25, 0, ry, 0, 0.08, 0.08, 0.05);
  for (const hy of [0.4, 1.3]) k.add(g.box, 'iron', x + s * 0.1, hy, z + c * 0.1, 0, ry, 0, w * 0.9, 0.06, 0.03);
}
// Yarı ahşap (timber frame) duvar kutusu
function timberHouse(k, w, h, d, x = 0, y = 0, z = 0, opts = {}) {
  const g = geos();
  k.add(boxUV(w, h, d, 2), opts.wall || 'plaster', x, y + h / 2, z);
  const bt = 0.16;
  // köşe ve kat kirişleri
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(g.box, 'timber', x + sx * (w / 2), y + h / 2, z + sz * (d / 2), 0, 0, 0, bt + 0.04, h, bt + 0.04);
  for (const yy of [0.08, h - 0.08, h * 0.5]) {
    k.add(g.box, 'timber', x, y + yy, z + d / 2 + 0.02, 0, 0, 0, w + 0.05, bt, 0.06);
    k.add(g.box, 'timber', x, y + yy, z - d / 2 - 0.02, 0, 0, 0, w + 0.05, bt, 0.06);
    k.add(g.box, 'timber', x + w / 2 + 0.02, y + yy, z, 0, 0, 0, 0.06, bt, d + 0.05);
    k.add(g.box, 'timber', x - w / 2 - 0.02, y + yy, z, 0, 0, 0, 0.06, bt, d + 0.05);
  }
  // çapraz kirişler
  const nx = Math.max(1, Math.round(w / 1.6));
  for (let i = 0; i < nx; i++) {
    const cx = x - w / 2 + (i + 0.5) * (w / nx), ang = Math.atan2(h * 0.5, w / nx) * (i % 2 ? 1 : -1);
    for (const sz of [-1, 1]) k.add(g.box, 'timber', cx, y + h * 0.75, z + sz * (d / 2 + 0.025), 0, 0, ang, Math.hypot(w / nx, h * 0.5) * 0.95, 0.1, 0.05);
  }
}
function crenellations(k, w, d, y, x = 0, z = 0, mat = 'stone', step = 0.9) {
  const g = geos();
  for (let xx = -w / 2 + step / 2; xx <= w / 2 - step / 2 + 0.01; xx += step) {
    k.add(boxUV(step * 0.55, 0.6, 0.45, 2), mat, x + xx, y + 0.3, z + d / 2 - 0.22);
    k.add(boxUV(step * 0.55, 0.6, 0.45, 2), mat, x + xx, y + 0.3, z - d / 2 + 0.22);
  }
  for (let zz = -d / 2 + step / 2; zz <= d / 2 - step / 2 + 0.01; zz += step) {
    k.add(boxUV(0.45, 0.6, step * 0.55, 2), mat, x + w / 2 - 0.22, y + 0.3, z + zz);
    k.add(boxUV(0.45, 0.6, step * 0.55, 2), mat, x - w / 2 + 0.22, y + 0.3, z + zz);
  }
}
function roundCren(k, r, y, x = 0, z = 0, n = 12, mat = 'stone') {
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU; k.add(boxUV(0.5, 0.55, 0.4, 2), mat, x + Math.cos(a) * r, y + 0.27, z + Math.sin(a) * r, 0, -a + Math.PI / 2, 0); }
}
function tower(k, x, z, r, h, opts = {}) {
  const g = geos(), m = opts.mat || 'stone';
  k.add(cylUV(r, r * 1.08, h, 16, 2), m, x, h / 2, z);
  k.add(cylUV(r * 1.18, r * 1.18, 0.35, 16, 2), m, x, h + 0.17, z);
  if (opts.roof !== false) {
    const rh = r * (opts.roofK || 2.2);
    k.add(g.cone16, opts.roofMat || 'roofBlue', x, h + 0.35 + rh / 2, z, 0, 0, 0, r * 1.35, rh, r * 1.35);
    if (opts.gold) { k.add(g.sphere, 'gold', x, h + 0.35 + rh + 0.15, z, 0, 0, 0, 0.18, 0.18, 0.18); k.add(g.cyl8, 'gold', x, h + 0.35 + rh + 0.55, z, 0, 0, 0, 0.04, 0.8, 0.04); }
  } else roundCren(k, r * 1.1, h + 0.35, x, z, Math.max(8, Math.round(r * 7)), m);
  for (let i = 0; i < (opts.windows ?? 2); i++) { const a = (i / 2) * Math.PI + Math.PI / 2 + (opts.wa || 0); windowAt(k, x + Math.cos(a) * r * 1.0, h * (0.45 + i * 0.25), z + Math.sin(a) * r * 1.0, Math.PI / 2 - a + Math.PI, 0.3, 0.6); }
}
// Dalgalanan sancak
function addBanner(k, x, y, z, w = 0.9, h = 1.4, ry = 0, pole = true) {
  const g = geos();
  if (pole) { k.add(g.cyl8, 'timber', x, y - h * 0.4, z, 0, 0, 0, 0.05, h * 2.2, 0.05); k.add(g.sphere, 'gold', x, y + h * 0.7, z, 0, 0, 0, 0.09, 0.09, 0.09); }
  const geo = new THREE.PlaneGeometry(w, h, 8, 6); geo.translate(w / 2, 0, 0);
  const base = geo.attributes.position.array.slice();
  const mesh = new THREE.Mesh(geo, mats().banner); mesh.position.set(x + 0.05, y, z); mesh.rotation.y = ry; mesh.castShadow = true;
  k.group.add(mesh);
  const ph = Math.random() * 6;
  k.anims.push((t) => {
    const p = geo.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) { const u = base[i] / w; p[i + 2] = Math.sin(t * 3.2 + base[i] * 3.5 + ph) * 0.12 * u + Math.sin(t * 5 + base[i + 1] * 2) * 0.03 * u; }
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
  });
}
function addSmoke(k, x, y, z) {
  const sprites = [];
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: textures().glow, color: 0xb8b0a8, transparent: true, depthWrite: false, opacity: 0 }));
    k.group.add(s); sprites.push({ s, o: i / 5 });
  }
  k.anims.push((t) => { for (const p of sprites) { const u = (t * 0.25 + p.o) % 1; p.s.position.set(x + u * 0.8, y + u * 3, z + Math.sin(u * 6) * 0.2); p.s.scale.setScalar(0.4 + u * 1.4); p.s.material.opacity = Math.sin(u * Math.PI) * 0.45; } });
}
function fence(k, x0, z0, x1, z1, mat = 'timber') {
  const g = geos(), len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(len / 1.2)), ang = Math.atan2(z1 - z0, x1 - x0);
  for (let i = 0; i <= n; i++) { const u = i / n; k.add(g.cyl8, mat, x0 + (x1 - x0) * u, 0.45, z0 + (z1 - z0) * u, 0, 0, 0, 0.06, 0.9, 0.06); }
  for (const yy of [0.35, 0.7]) k.add(g.box, mat, (x0 + x1) / 2, yy, (z0 + z1) / 2, 0, -ang, 0, len, 0.07, 0.05);
}
function barrel(k, x, z, s = 1) { const g = geos(); k.add(cylUV(0.3 * s, 0.26 * s, 0.75 * s, 12, 1), 'plank', x, 0.375 * s, z); for (const yy of [0.12, 0.62]) k.add(g.cyl12, 'iron', x, yy * s, z, 0, 0, 0, 0.29 * s, 0.04, 0.29 * s); }
function crate(k, x, z, s = 0.7, ry = 0, y = 0) { k.add(boxUV(s, s, s, 1), 'plank', x, y + s / 2, z, 0, ry, 0); k.add(geos().box, 'timber', x, y + s / 2, z, 0, ry, Math.PI / 4, s * 1.3, 0.06, s + 0.02); }
function platform(k, w, d, h = 0.35, mat = 'stone') { k.add(boxUV(w, h, d, 2), mat, 0, h / 2, 0); k.add(boxUV(w + 0.5, h * 0.5, d + 0.5, 2), 'stoneDark', 0, h * 0.25, 0); }
function lantern(k, x, y, z) { const g = geos(); k.add(g.cyl8, 'iron', x, y / 2, z, 0, 0, 0, 0.05, y, 0.05); k.add(g.box, 'window', x, y + 0.15, z, 0, 0, 0, 0.18, 0.25, 0.18); k.add(g.cone8, 'iron', x, y + 0.36, z, 0, 0, 0, 0.16, 0.16, 0.16); }


// ---------------------------------------------------------------------
//  Seviyeye göre eklenen ayrıntılar (her seviye görünür biçimde değişir)
// ---------------------------------------------------------------------
let CUR = null;
const SPOTS = {
  townhall: null, archery: [[-1.9, 1.9], [1.9, 1.9], [-1.9, -1.9], [1.9, -1.9], [-2.1, 0], [2.1, 0]],
};
function planter(k, x, z) { const g = geos(); k.add(boxUV(0.9, 0.35, 0.45, 1), 'plank', x, 0.18, z); k.add(boxUV(0.8, 0.05, 0.38, 1), 'dirt', x, 0.36, z); for (let i = 0; i < 3; i++) k.add(g.ico, ['red', 'leafLight', 'gold'][i % 3] === 'gold' ? 'hay' : ['red', 'leafLight'][i % 2], x - 0.28 + i * 0.28, 0.45, z, 0, i, 0, 0.12, 0.1, 0.12); }
function hut(k, x, z, roof) { timberHouse(k, 1.4, 1.2, 1.2, x, 0, z, { wall: 'plank' }); k.add(gableRoof(1.4, 1.2, 0.8, 0.15), roof, x, 1.2, z); k.add(gableWall(1.2, 0.8, 0.1), 'plank', x + 0.7, 1.2, z, 0, Math.PI / 2, 0); k.add(gableWall(1.2, 0.8, 0.1), 'plank', x - 0.7, 1.2, z, 0, Math.PI / 2, 0); }
function statue(k, x, z, mat) {
  const g = geos();
  k.add(boxUV(0.7, 0.8, 0.7, 1), 'stone', x, 0.4, z); k.add(boxUV(0.85, 0.12, 0.85, 1), 'stoneDark', x, 0.84, z);
  k.add(g.cyl8, mat, x - 0.08, 1.2, z, 0, 0, 0.04, 0.07, 0.65, 0.07); k.add(g.cyl8, mat, x + 0.08, 1.2, z, 0, 0, -0.04, 0.07, 0.65, 0.07);
  k.add(new THREE.CylinderGeometry(0.17, 0.12, 0.6, 10), mat, x, 1.8, z); k.add(g.sphere, mat, x, 2.22, z, 0, 0, 0, 0.11, 0.13, 0.11);
  k.add(g.cyl8, mat, x + 0.22, 2.05, z, -0.3, 0, -0.4, 0.05, 0.5, 0.05); k.add(g.box, mat, x + 0.34, 2.6, z + 0.15, -0.3, 0, -0.4, 0.05, 0.9, 0.025);
}
function brazier(k, x, z) {
  const g = geos();
  k.add(g.cyl8, 'gold', x, 0.55, z, 0, 0, 0, 0.06, 1.1, 0.06);
  k.add(new THREE.CylinderGeometry(0.28, 0.14, 0.25, 12, 1, true), 'gold', x, 1.2, z);
  const fire = new THREE.Sprite(new THREE.SpriteMaterial({ map: textures().glow, color: 0xff9030, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  fire.position.set(x, 1.45, z); k.group.add(fire);
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: textures().glow, color: 0xffe080, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  core.position.set(x, 1.35, z); k.group.add(core);
  const ph = Math.random() * 6;
  k.anims.push((t) => { const f = 0.85 + Math.sin(t * 13 + ph) * 0.1 + Math.sin(t * 7.3 + ph) * 0.08; fire.scale.set(0.8 * f, 1.1 * f, 1); core.scale.setScalar(0.4 * f); });
}
function crest(k, y) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.07, 8, 32), mats().gold);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), new THREE.MeshStandardMaterial({ color: 0x6ab0ff, emissive: 0x3a8aff, emissiveIntensity: 1.8, roughness: 0.1 }));
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: textures().glow, color: 0xffd060, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.7 }));
  glow.scale.setScalar(2.4);
  const holder = new THREE.Group(); holder.add(ring, gem, glow); holder.position.y = y; k.group.add(holder);
  k.anims.push((t) => { holder.position.y = y + Math.sin(t * 1.5) * 0.2; ring.rotation.y = t * 1.2; gem.rotation.y = -t * 2; glow.material.opacity = 0.55 + Math.sin(t * 3) * 0.2; });
}
function levelExtras(k, key, L, height) {
  const fp = FOOTPRINT[key] || 7, c = fp * 0.45;
  const sp = SPOTS[key] || (key === 'townhall' ? [[-4.1, 3.6], [4.1, 3.6], [-4.6, -4.4], [4.6, -4.4], [-4.8, 0.6], [4.8, 0.6]] : [[-c, c], [c, c], [-c, -c], [c, -c], [-c, 0], [c, 0]]);
  if (L >= 2) { lantern(k, sp[0][0] * 0.92, 1.5, sp[0][1]); lantern(k, sp[1][0] * 0.92, 1.5, sp[1][1]); }
  if (L >= 3 && key !== 'archery') { planter(k, sp[4][0], sp[4][1] + 0.6); planter(k, sp[5][0], sp[5][1] + 0.6); }
  if (L >= 4) addBanner(k, sp[2][0], 3.2, sp[2][1], 0.6, 0.9);
  if (L >= 5 && key !== 'archery') hut(k, sp[3][0] * 0.95, sp[3][1] * 0.95, L >= 8 ? 'roofBlue' : 'roofRed');
  if (L >= 6) { barrel(k, sp[4][0], sp[4][1] - 0.6); crate(k, sp[5][0], sp[5][1] - 0.6, 0.55, 0.4); }
  if (L >= 7 && key !== 'archery') { const g = geos(); for (const sx of [-1, 1]) k.add(boxUV(fp * 0.32, 0.55, 0.3, 1), 'stone', sx * fp * 0.27, 0.27, -fp * 0.49); }
  if (L >= 8) statue(k, sp[0][0] * 0.72, sp[0][1] + (key === 'archery' ? 0 : 0.2), L >= 9 ? 'gold' : 'stoneDark');
  if (L >= 9) { brazier(k, sp[1][0] * 0.72, sp[1][1] + 0.2); brazier(k, sp[2][0] * 0.8, sp[2][1] * 0.8); }
  if (L >= 10) crest(k, height + 1.4);
}
// ---------------------------------------------------------------------
//  BİNALAR
// ---------------------------------------------------------------------
function tier(level) { return level >= 8 ? 3 : level >= 4 ? 2 : 1; }

function townhall(L) {
  const k = new Kit(), g = geos();
  const P = 7.6 + L * 0.28;
  platform(k, P, P, 0.3 + L * 0.03);
  const py = 0.3 + L * 0.03;
  for (let i = 0; i < 3; i++) k.add(boxUV(3.2 - i * 0.2, 0.13, 0.5, 1), 'stone', 0, 0.06 + i * py / 3, P / 2 + 0.3 - i * 0.3);
  let top;
  if (L <= 3) {
    const W = 5.2 + L * 0.5, H = 2.6 + L * 0.25, D = 4.2 + L * 0.3;
    timberHouse(k, W, H, D, 0, py, -0.5);
    let ry = py + H;
    if (L >= 3) { timberHouse(k, W - 0.8, 1.8, D - 0.6, 0, ry, -0.5); ry += 1.8; }
    const roofM = L >= 3 ? 'roofRed' : 'thatch';
    k.add(gableRoof(L >= 3 ? W - 0.8 : W, L >= 3 ? D - 0.6 : D, 2.2), roofM, 0, ry, -0.5);
    for (const sx of [-1, 1]) k.add(gableWall(L >= 3 ? D - 0.6 : D, 2.2), 'plaster', sx * (L >= 3 ? W - 0.8 : W) / 2, ry, -0.5, 0, Math.PI / 2, 0);
    doorAt(k, 0, D / 2 - 0.5 + 0.02, 0, 1.3, 2.0);
    for (const x of [-W / 2 + 1, W / 2 - 1]) windowAt(k, x, py + 1.6, D / 2 - 0.48);
    if (L >= 3) for (const x of [-1.2, 1.2]) windowAt(k, x, ry - 0.9, (D - 0.6) / 2 - 0.48);
    if (L >= 2) tower(k, W / 2 - 0.2, D / 2 - 0.6, 0.85, H + 2.2 + (L - 2) * 0.6, { mat: 'plank', roofMat: L >= 3 ? 'roofRed' : 'thatch', windows: 1 });
    addBanner(k, -W / 2 + 0.2, py + H + 1.4, D / 2 - 0.4);
    k.add(boxUV(0.6, 1.6, 0.6, 1), 'stone', -W / 4, ry + 0.9, -1.4); addSmoke(k, -W / 4, ry + 2.0, -1.4);
    top = ry + 3;
  } else {
    const s4 = L - 4;
    const W = 5.6 + s4 * 0.35, H = 4 + s4 * 0.45, D = 4.8 + s4 * 0.25, z0 = -0.6;
    const roof = L >= 6 ? 'roofBlue' : 'roofRed', gold = L >= 9;
    k.add(boxUV(W, H, D, 2), 'stone', 0, py + H / 2, z0);
    k.add(boxUV(W + 0.2, 0.25, D + 0.2, 2), 'stoneDark', 0, py + 1.2, z0);
    if (L >= 5) crenellations(k, W, D, py + H, 0, z0);
    k.add(boxUV(W - 1.4, 1.2, D - 1.4, 2), 'stone', 0, py + H + 0.6, z0);
    k.add(gableRoof(W - 1.4, D - 1.4, 2.3 + s4 * 0.12), roof, 0, py + H + 1.2, z0);
    for (const sx of [-1, 1]) k.add(gableWall(D - 1.4, 2.3 + s4 * 0.12, 0.2), 'stone', sx * (W - 1.4) / 2, py + H + 1.2, z0, 0, Math.PI / 2, 0);
    doorAt(k, 0, z0 + D / 2 + 0.01, 0, 1.5, 2.3);
    const rows = H > 5.5 ? [2.0, 3.8, 5.4] : [2.0, 3.6];
    for (const y of rows) for (const x of [-W / 2 + 1.1, W / 2 - 1.1]) windowAt(k, x, py + y, z0 + D / 2 + 0.02, 0, 0.5, 0.85, true);
    if (L >= 6) windowAt(k, 0, py + H - 1.0, z0 + D / 2 + 0.02, 0, 0.75, 1.0, true);
    const tr = 0.95 + s4 * 0.06, th = H + 1.6 + s4 * 0.3;
    const T = [];
    if (L >= 4) T.push([1, 1]);
    if (L >= 5) T.push([-1, 1]);
    if (L >= 8) T.push([-1, -1], [1, -1]);
    for (const [sx, sz] of T) tower(k, sx * W / 2, z0 + sz * D / 2, tr, th, { gold, roofMat: roof, wa: sx > 0 ? 0 : Math.PI });
    if (L >= 6) { // kapı kulesi (gatehouse)
      const gz = z0 + D / 2 + 1.1;
      for (const sx of [-1, 1]) k.add(boxUV(1.0, 3.4, 1.4, 2), 'stone', sx * 1.25, py + 1.7, gz);
      k.add(boxUV(3.5, 1.0, 1.4, 2), 'stone', 0, py + 3.0, gz);
      crenellations(k, 3.5, 1.4, py + 3.5, 0, gz, 'stone', 0.7);
      k.add(new THREE.TorusGeometry(0.75, 0.12, 6, 14, Math.PI), 'stoneDark', 0, py + 2.4, gz + 0.71);
      for (const sx of [-1, 1]) addBanner(k, sx * 1.25, py + 2.8, gz + 0.72, 0.6, 1.2, 0, false);
    }
    if (L >= 7) tower(k, 0, z0 - D / 2 + 0.4, 1.15, H + 3.5 + s4 * 0.3, { gold, roofMat: roof, roofK: 2.5, windows: 2 });
    if (L >= 10) { // büyük merkez kulesi + altın kubbe
      const ch = H + 6.5;
      k.add(cylUV(1.3, 1.45, ch, 16, 2), 'stone', 0, ch / 2 + py, z0);
      roundCren(k, 1.5, ch + py, 0, z0, 12);
      k.add(new THREE.SphereGeometry(1.25, 16, 10, 0, TAU, 0, Math.PI / 2), 'gold', 0, ch + py + 0.3, z0);
      k.add(g.cyl8, 'gold', 0, ch + py + 1.9, z0, 0, 0, 0, 0.05, 1.4, 0.05);
      k.add(g.sphere, 'gold', 0, ch + py + 2.7, z0, 0, 0, 0, 0.2, 0.2, 0.2);
      for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + Math.PI / 4; windowAt(k, Math.cos(a) * 1.35, ch * 0.75 + py, z0 + Math.sin(a) * 1.35, Math.PI / 2 - a, 0.4, 0.8, true); }
    }
    if (gold) {
      k.add(g.box, 'gold', 0, py + H - 0.3, z0 + D / 2 + 0.03, 0, 0, 0, W + 0.1, 0.14, 0.06);
      k.add(g.box, 'gold', 0, py + 1.2, z0 + D / 2 + 0.12, 0, 0, 0, W + 0.25, 0.08, 0.04);
      k.add(g.torus, 'gold', 0, py + H + 1.9, z0 + (D - 1.4) / 2 + 0.06, 0, 0, 0, 0.45, 0.45, 0.45);
      k.add(g.cyl12, 'marble', 0, py + H + 1.9, z0 + (D - 1.4) / 2 + 0.04, Math.PI / 2, 0, 0, 0.42, 0.05, 0.42);
    }
    for (const sx of [-1, 1]) addBanner(k, sx * 1.6, py + H - 0.8, z0 + D / 2 + 0.06, 0.75, 1.5, 0, false);
    addBanner(k, 0, py + H + 4.6 + s4 * 0.2, z0 - D / 2 - 0.3, 1.0, 1.4, 0, true);
    top = L >= 10 ? H + 10 : L >= 7 ? H + 6 : H + 4.5;
  }
  for (const sx of [-1, 1]) { barrel(k, sx * (P / 2 - 0.7), P / 2 - 1.2); crate(k, sx * (P / 2 - 0.8), P / 2 - 2.1, 0.6, 0.3); }
  return k.build(top);
}

function barracks(L) {
  const k = new Kit(), g = geos(), t = tier(L);
  k.add(new THREE.PlaneGeometry(7.6, 7.6).rotateX(-Math.PI / 2), 'dirt', 0, 0.02, 0);
  if (t === 1) {
    timberHouse(k, 6, 2.6, 2.8, 0, 0, -2.2, { wall: 'plank' });
    k.add(gableRoof(6, 2.8, 1.6), 'thatch', 0, 2.6, -2.2);
  } else {
    k.add(boxUV(6.4, 3.0, 3, 2), 'stone', 0, 1.5, -2.2);
    k.add(boxUV(6.4, 0.4, 3.1, 2), 'timber', 0, 3.0, -2.2);
    k.add(gableRoof(6.4, 3, 1.8), t === 3 ? 'roofBlue' : 'roofRed', 0, 3.2, -2.2);
    for (const sx of [-1, 1]) k.add(gableWall(3, 1.8, 0.2), 'stone', sx * 3.2, 3.2, -2.2, 0, Math.PI / 2, 0);
    if (t === 3) for (const sx of [-1, 1]) tower(k, sx * 3.4, -2.2, 0.8, 4.4, { roofMat: 'roofBlue', gold: true, windows: 1 });
  }
  doorAt(k, 0, -0.78, 0, 1.2, 1.9);
  for (const x of [-2, 2]) windowAt(k, x, 1.5, -0.77);
  // eğitim alanı çiti
  fence(k, -3.6, -0.4, -3.6, 3.6); fence(k, 3.6, -0.4, 3.6, 3.6); fence(k, -3.6, 3.6, -1.2, 3.6); fence(k, 1.2, 3.6, 3.6, 3.6);
  // idman kuklaları
  for (const [x, z] of [[-2.4, 1.3], [2.4, 1.3]]) {
    k.add(g.cyl8, 'timber', x, 0.9, z, 0, 0, 0, 0.07, 1.8, 0.07);
    k.add(g.cyl8, 'timber', x, 1.45, z, 0, 0, Math.PI / 2, 0.05, 1.0, 0.05);
    k.add(cylUV(0.22, 0.25, 0.7, 10, 1), 'hay', x, 1.1, z);
    k.add(g.sphere, 'hay', x, 1.68, z, 0, 0, 0, 0.17, 0.19, 0.17);
  }
  // silah rafı
  k.add(g.box, 'timber', -3.0, 0.6, -0.2, 0, 0, 0, 1.4, 0.08, 0.1); k.add(g.box, 'timber', -3.0, 1.2, -0.2, 0, 0, 0, 1.4, 0.08, 0.1);
  for (let i = 0; i < 4; i++) { k.add(g.cyl8, 'timber', -3.5 + i * 0.33, 1.1, -0.1, 0.15, 0, 0, 0.025, 2.2, 0.025); k.add(g.cone8, 'iron', -3.5 + i * 0.33, 2.25, 0.06, 0.15, 0, 0, 0.05, 0.25, 0.05); }
  // hedef tahtası
  k.add(g.cyl12, 'hay', 2.9, 1.0, -0.25, Math.PI / 2, 0, 0, 0.55, 0.15, 0.55);
  k.add(g.cyl12, 'red', 2.9, 1.0, -0.17, Math.PI / 2, 0, 0, 0.3, 0.02, 0.3);
  k.add(g.cyl12, 'cloth', 2.9, 1.0, -0.155, Math.PI / 2, 0, 0, 0.15, 0.02, 0.15);
  barrel(k, 3.1, 2.8); crate(k, -3.0, 2.9, 0.55);
  addBanner(k, 2.6, 2.4 + (t > 1 ? 1.4 : 0.6), -0.7, 0.7, 1.1);
  return k.build(t === 3 ? 7.5 : 4.6);
}

function archery(L) {
  const k = new Kit(), g = geos(), t = tier(L);
  let topY;
  if (t === 1) {
    const H = 5.2 + L * 0.3;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.add(g.cyl8, 'timber', sx * 1.2, H / 2, sz * 1.2, sz * -0.04, 0, sx * 0.04, 0.16, H, 0.16);
    for (let y = 1.2; y < H; y += 1.6) { k.add(g.box, 'timber', 0, y, 1.2, 0, 0, 0.6, 3.0, 0.08, 0.08); k.add(g.box, 'timber', 0, y, -1.2, 0, 0, -0.6, 3.0, 0.08, 0.08); }
    k.add(boxUV(3.2, 0.2, 3.2, 1), 'plank', 0, H, 0);
    for (const s of [-1, 1]) { k.add(boxUV(3.2, 0.7, 0.1, 1), 'plank', 0, H + 0.45, s * 1.55); k.add(boxUV(0.1, 0.7, 3.2, 1), 'plank', s * 1.55, H + 0.45, 0); }
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.add(g.cyl8, 'timber', sx * 1.5, H + 1.3, sz * 1.5, 0, 0, 0, 0.06, 1.8, 0.06);
    k.add(g.cone8, 'thatch', 0, H + 2.6, 0, 0, Math.PI / 8, 0, 2.4, 1.2, 2.4);
    topY = H + 0.1;
  } else {
    const H = 6 + L * 0.35, r = t === 3 ? 1.9 : 1.7;
    k.add(cylUV(r, r * 1.15, H, 18, 2), 'stone', 0, H / 2, 0);
    k.add(cylUV(r * 1.25, r * 1.05, 0.6, 18, 2), 'stone', 0, H + 0.3, 0);
    roundCren(k, r * 1.18, H + 0.6, 0, 0, 14);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.4; k.add(g.box, 'dark', Math.cos(a) * r * 1.02, H * (0.4 + (i % 2) * 0.25), Math.sin(a) * r * 1.02, 0, -a, 0, 0.12, 0.7, 0.14); }
    doorAt(k, 0, r * 1.1, 0, 0.9, 1.6);
    if (t === 3) { k.add(g.torus, 'gold', 0, H + 0.62, 0, Math.PI / 2, 0, 0, r * 1.25, r * 1.25, 1); }
    topY = H + 0.6;
  }
  addBanner(k, t === 1 ? 1.5 : 1.5, topY + 2.2, t === 1 ? 1.5 : 0.8, 0.7, 1.0);
  const grp = k.build(topY + 2.5);
  grp.userData.topY = topY;
  return grp;
}

function hospital(L) {
  const k = new Kit(), g = geos(), t = tier(L);
  const W = t === 3 ? 6.4 : 5.6, H = t === 1 ? 2.8 : 3.4;
  if (t >= 2) k.add(boxUV(W + 0.4, 0.5, 4.4, 2), 'stone', 0, 0.25, -1.4);
  const y0 = t >= 2 ? 0.5 : 0;
  timberHouse(k, W, H, 4, 0, y0, -1.4);
  k.add(gableRoof(W, 4, 1.9), 'roofRed', 0, y0 + H, -1.4);
  for (const sx of [-1, 1]) k.add(gableWall(4, 1.9), 'plaster', sx * W / 2, y0 + H, -1.4, 0, Math.PI / 2, 0);
  doorAt(k, 0, 0.62, 0, 1.2, 1.9);
  for (const x of [-1.8, 1.8]) windowAt(k, x, y0 + 1.5, 0.63);
  // amblem
  k.add(g.cyl12, 'heal', 0, y0 + H + 0.75, 0.62, Math.PI / 2, Math.PI, 0, 0.55, 0.05, 0.55);
  // tente ve yataklar
  k.add(g.box, 'cloth', -2.2, 1.8, 2.0, -0.25, 0, 0, 3.0, 0.04, 2.2);
  for (const [x, z] of [[-3.5, 1.0], [-0.9, 1.0], [-3.5, 3.0], [-0.9, 3.0]]) k.add(g.cyl8, 'timber', x, 0.9, z, 0, 0, 0, 0.05, 1.9 - (z - 1) * 0.25, 0.05);
  for (const x of [-3.1, -1.4]) { k.add(g.box, 'timber', x, 0.3, 2.0, 0, 0, 0, 0.7, 0.1, 1.6); k.add(g.box, 'cloth', x, 0.4, 2.0, 0, 0, 0, 0.62, 0.1, 1.5); k.add(g.box, 'cloth', x, 0.47, 1.35, 0, 0, 0, 0.5, 0.08, 0.25); }
  // şifalı ot bahçesi
  for (let i = 0; i < 3; i++) { k.add(boxUV(0.6, 0.2, 2.2, 1), 'dirt', 1.4 + i * 0.85, 0.1, 2.2); for (let j = 0; j < 4; j++) k.add(g.ico, j % 2 ? 'leaf' : 'leafLight', 1.4 + i * 0.85, 0.32, 1.3 + j * 0.6, 0, j, 0, 0.22, 0.2, 0.22); }
  if (t === 3) tower(k, W / 2 + 0.4, -2.6, 0.9, 5.6, { roofMat: 'roofRed', gold: true, windows: 1 });
  addSmoke(k, -1.5, y0 + H + 2.2, -2.4); k.add(boxUV(0.5, 1.2, 0.5, 1), 'stone', -1.5, y0 + H + 1.4, -2.4);
  return k.build(y0 + H + 2.4);
}

function potion(L) {
  const k = new Kit(), g = geos(), t = tier(L);
  const r = t === 3 ? 2.1 : 1.8, H = t === 1 ? 3 : 3.8;
  k.add(cylUV(r, r * 1.05, H, 18, 2), t === 1 ? 'plank' : 'stone', 0, H / 2, -0.8);
  k.add(g.cone16, t === 3 ? 'roofPurple' : 'roofBlue', 0, H + 1.4, -0.8, 0, 0, 0, r * 1.3, 2.8, r * 1.3);
  if (t === 3) { k.add(g.sphere, 'crystal', 0, H + 3.0, -0.8, 0, 0, 0, 0.3, 0.45, 0.3); }
  doorAt(k, 0, -0.8 + r * 1.02, 0, 1.0, 1.7);
  windowAt(k, -r * 0.72, 2.1, -0.8 + r * 0.72, -Math.PI / 4 + Math.PI / 2 - Math.PI / 2 + 0.0 - 0.78, 0.4, 0.6);
  // raf ve şişeler
  k.add(g.box, 'timber', 1.9, 0.5, 1.4, 0, -0.5, 0, 1.4, 0.06, 0.4); k.add(g.box, 'timber', 1.9, 1.0, 1.4, 0, -0.5, 0, 1.4, 0.06, 0.4);
  for (const sx of [-1, 1]) k.add(g.box, 'timber', 1.9 + Math.cos(0.5) * sx * 0.68, 0.55, 1.4 + Math.sin(0.5) * sx * 0.68, 0, -0.5, 0, 0.06, 1.1, 0.4);
  const colsBottle = ['greenGlow', 'crystal', 'window'];
  for (let i = 0; i < 8; i++) { const sh = i % 2, u = (i >> 1) / 3 - 0.5; const x = 1.9 + Math.cos(0.5) * u * 1.1, z = 1.4 + Math.sin(0.5) * u * 1.1; k.add(g.sphere, colsBottle[i % 3], x, 0.62 + sh * 0.5, z, 0, 0, 0, 0.09, 0.11, 0.09); k.add(g.cyl8, colsBottle[i % 3], x, 0.75 + sh * 0.5, z, 0, 0, 0, 0.03, 0.1, 0.03); }
  // kazan
  const cx = -1.5, cz = 1.6;
  k.add(g.hemi, 'iron', cx, 0.75, cz, Math.PI, 0, 0, 0.75, 0.65, 0.75);
  k.add(g.torus, 'iron', cx, 0.75, cz, Math.PI / 2, 0, 0, 0.75, 0.75, 0.6);
  for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; k.add(g.cyl8, 'iron', cx + Math.cos(a) * 0.5, 0.2, cz + Math.sin(a) * 0.5, 0, 0, 0, 0.05, 0.4, 0.05); }
  k.add(g.cyl12, 'greenGlow', cx, 0.68, cz, 0, 0, 0, 0.68, 0.04, 0.68);
  for (let i = 0; i < 5; i++) k.add(g.box, 'timber', cx + rand(-0.4, 0.4), 0.08, cz + rand(-0.4, 0.4), 0, rand(0, 3), 0, 0.6, 0.08, 0.08);
  // kristaller
  for (let i = 0; i < 4; i++) k.add(new THREE.OctahedronGeometry(1, 0), 'crystal', 2.2 + rand(-0.4, 0.4), 0.3, -1.8 + rand(-0.5, 0.5), rand(-0.3, 0.3), rand(0, 3), rand(-0.3, 0.3), 0.15, 0.4, 0.15);
  const grp = k.build(H + 3);
  // köpüren kabarcıklar
  const bubbles = [];
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(g.sphere, mats().greenGlow); b.scale.setScalar(0.06); grp.add(b); bubbles.push({ b, o: Math.random(), x: cx + rand(-0.4, 0.4), z: cz + rand(-0.4, 0.4) }); }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: textures().glow, color: 0x60ff90, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6 })); glow.position.set(cx, 1.0, cz); glow.scale.setScalar(2.2); grp.add(glow);
  const old = grp.userData.update;
  grp.userData.update = (t2, dt) => { old(t2, dt); for (const p of bubbles) { const u = (t2 * 0.7 + p.o) % 1; p.b.position.set(p.x, 0.7 + u * 0.5, p.z); p.b.scale.setScalar(0.05 + u * 0.05); } glow.material.opacity = 0.45 + Math.sin(t2 * 3) * 0.15; };
  return grp;
}

function heroes(L) {
  const k = new Kit(), g = geos(), t = tier(L);
  const W = t === 3 ? 7.2 : 6.4, D = 5.2, colH = t === 1 ? 2.8 : 3.4;
  for (let i = 0; i < 3; i++) k.add(boxUV(W + 0.8 - i * 0.4, 0.2, D + 0.8 - i * 0.4, 2), i === 2 ? 'marble' : 'stone', 0, 0.1 + i * 0.2, -0.6);
  const y0 = 0.6;
  k.add(boxUV(W - 1.2, colH, D - 1.6, 2), t === 1 ? 'plaster' : 'marble', 0, y0 + colH / 2, -1.2);
  const nc = 6;
  for (let i = 0; i < nc; i++) {
    const x = -W / 2 + 0.5 + i * ((W - 1) / (nc - 1));
    k.add(cylUV(0.22, 0.26, colH, 14, 1), t === 1 ? 'plank' : 'marble', x, y0 + colH / 2, D / 2 - 0.9);
    k.add(g.box, t === 1 ? 'timber' : 'marble', x, y0 + 0.08, D / 2 - 0.9, 0, 0, 0, 0.6, 0.16, 0.6);
    k.add(g.box, t === 3 ? 'gold' : t === 1 ? 'timber' : 'marble', x, y0 + colH - 0.08, D / 2 - 0.9, 0, 0, 0, 0.6, 0.16, 0.6);
  }
  k.add(boxUV(W, 0.5, D - 0.6, 2), t === 1 ? 'timber' : 'marble', 0, y0 + colH + 0.25, -0.75);
  if (t === 3) k.add(g.box, 'gold', 0, y0 + colH + 0.3, D / 2 - 0.42, 0, 0, 0, W + 0.02, 0.12, 0.04);
  k.add(gableRoof(W, D - 0.6, 1.4, 0.2), t === 1 ? 'roofRed' : 'roofBlue', 0, y0 + colH + 0.5, -0.75);
  k.add(gableWall(D - 0.6 + 0.4, 1.4, 0.22), t === 1 ? 'plaster' : 'marble', W / 2 + 0.2, y0 + colH + 0.5, -0.75, 0, Math.PI / 2, 0);
  k.add(gableWall(D - 0.6 + 0.4, 1.4, 0.22), t === 1 ? 'plaster' : 'marble', -W / 2 - 0.2, y0 + colH + 0.5, -0.75, 0, Math.PI / 2, 0);
  // altın kapı
  k.add(boxUV(1.4, 2.2, 0.1, 1), t >= 2 ? 'gold' : 'plank', 0, y0 + 1.1, D / 2 - 2.0 + 0.01);
  // heykeller (kılıçlı savaşçı silüeti)
  for (const sx of [-1, 1]) {
    const x = sx * (W / 2 + 0.2), z = D / 2 + 0.3, m = t === 3 ? 'gold' : 'stoneDark';
    k.add(boxUV(0.8, 0.9, 0.8, 1), 'stone', x, 0.45, z);
    k.add(g.cyl8, m, x - 0.1, 1.3, z, 0, 0, 0.05, 0.09, 0.8, 0.09); k.add(g.cyl8, m, x + 0.1, 1.3, z, 0, 0, -0.05, 0.09, 0.8, 0.09);
    k.add(new THREE.CylinderGeometry(0.2, 0.15, 0.7, 10), m, x, 2.0, z);
    k.add(g.sphere, m, x, 2.5, z, 0, 0, 0, 0.13, 0.15, 0.13);
    k.add(g.cyl8, m, x - 0.25, 2.05, z + 0.05, 0.3, 0, 0.2, 0.06, 0.55, 0.06);
    k.add(g.cyl8, m, x + 0.28, 2.3, z + 0.1, -0.4, 0, -0.3, 0.06, 0.5, 0.06);
    k.add(g.box, m, x + 0.4, 2.9, z + 0.25, -0.4, 0, -0.3, 0.06, 1.1, 0.03);
    k.add(g.cyl12, m, x - 0.3, 1.9, z + 0.2, Math.PI / 2, 0, 0, 0.28, 0.05, 0.28);
  }
  for (const sx of [-1, 1]) { lantern(k, sx * 1.4, 1.4, D / 2 + 0.6); }
  addBanner(k, -W / 2 + 0.3, y0 + colH + 2.5, -2.8, 0.8, 1.3);
  addBanner(k, W / 2 - 0.3, y0 + colH + 2.5, -2.8, 0.8, 1.3);
  return k.build(y0 + colH + 2.2);
}

function summon(L) {
  const k = new Kit(), g = geos(), t = tier(L);
  const H = 5.5 + t * 1.2;
  // altıgen kaide
  k.add(new THREE.CylinderGeometry(2.6, 2.8, 0.5, 6), 'stone', 0, 0.25, -1.6);
  k.add(cylUV(1.5, 1.8, H, 6, 2), 'stoneDark', 0, 0.5 + H / 2, -1.6);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + Math.PI / 6; k.add(g.box, 'crystal', Math.cos(a) * 1.68, 0.5 + H * 0.55, -1.6 + Math.sin(a) * 1.68, 0, -a, 0, 0.08, H * 0.6, 0.1); }
  k.add(new THREE.CylinderGeometry(1.95, 1.95, 0.35, 6), 'stone', 0, 0.5 + H + 0.17, -1.6);
  k.add(new THREE.ConeGeometry(2.1, 3.2, 6), 'roofPurple', 0, 0.5 + H + 1.95, -1.6);
  k.add(g.sphere, 'gold', 0, 0.5 + H + 3.65, -1.6, 0, 0, 0, 0.2, 0.2, 0.2);
  doorAt(k, 0, -1.6 + 1.56, 0, 1.0, 1.8, t >= 2 ? 'gold' : 'plank');
  windowAt(k, 0, 0.5 + H * 0.7, -1.6 + 1.5, 0, 0.45, 0.8, true);
  // kemer portal
  k.add(new THREE.TorusGeometry(1.2, 0.18, 8, 24, Math.PI), 'stone', 0, 0.3, 2.2);
  for (const sx of [-1, 1]) k.add(boxUV(0.4, 0.4, 0.4, 1), 'stone', sx * 1.2, 0.2, 2.2);
  const grp = k.build(0.5 + H + 3.9);
  // parlayan rün dairesi ve portal
  const rune = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2).rotateX(-Math.PI / 2), mats().runeMat); rune.position.set(0, 0.06, 2.0); grp.add(rune);
  const portal = new THREE.Mesh(new THREE.CircleGeometry(1.05, 24, 0, Math.PI), new THREE.MeshBasicMaterial({ map: textures().glow, color: new THREE.Color(1.4, 0.6, 2.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); portal.position.set(0, 0.3, 2.2); grp.add(portal);
  const crystals = [];
  for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), mats().crystal); c.scale.set(1, 1.8, 1); c.castShadow = true; grp.add(c); crystals.push(c); }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: textures().glow, color: 0xa060ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 })); halo.position.set(0, 1.4, 2.0); halo.scale.setScalar(4); grp.add(halo);
  const old = grp.userData.update;
  grp.userData.update = (tt, dt) => {
    old(tt, dt);
    rune.rotation.y = tt * 0.3;
    crystals.forEach((c, i) => { const a = tt * 0.8 + (i / 4) * TAU; c.position.set(Math.cos(a) * 1.6, 2.4 + Math.sin(tt * 2 + i) * 0.3, 2.0 + Math.sin(a) * 1.6); c.rotation.y = tt * 2; });
    halo.material.opacity = 0.45 + Math.sin(tt * 2.2) * 0.15;
  };
  return grp;
}

function farm(L) {
  const k = new Kit(), g = geos(), t = tier(L);
  timberHouse(k, 2.8, 2.2, 2.4, -2.0, 0, -2.0, { wall: t === 1 ? 'plank' : 'plaster' });
  k.add(gableRoof(2.8, 2.4, 1.4), t === 1 ? 'thatch' : 'roofRed', -2.0, 2.2, -2.0);
  for (const sx of [-1, 1]) k.add(gableWall(2.4, 1.4), t === 1 ? 'plank' : 'plaster', -2.0 + sx * 1.4, 2.2, -2.0, 0, Math.PI / 2, 0);
  doorAt(k, -2.0, -0.78, 0, 0.8, 1.5);
  addSmoke(k, -2.8, 4.2, -2.4); k.add(boxUV(0.35, 1.2, 0.35, 1), 'stone', -2.8, 3.2, -2.4);
  // tarla
  k.add(new THREE.PlaneGeometry(6.4, 3.6).rotateX(-Math.PI / 2), 'dirt', 0, 0.03, 1.4);
  fence(k, -3.3, -0.4, -3.3, 3.3); fence(k, 3.3, -0.4, 3.3, 3.3); fence(k, -3.3, 3.3, 3.3, 3.3);
  for (let i = 0; i < 2; i++) k.add(cylUV(0.4, 0.4, 0.7, 12, 1), 'hay', 1.0 + i * 0.9, 0.4, -2.2, Math.PI / 2, 0.3, 0);
  // korkuluk
  k.add(g.cyl8, 'timber', 2.4, 0.9, -1.2, 0, 0, 0, 0.05, 1.8, 0.05); k.add(g.cyl8, 'timber', 2.4, 1.4, -1.2, 0, 0, Math.PI / 2, 0.04, 1.0, 0.04); k.add(g.sphere, 'hay', 2.4, 1.85, -1.2, 0, 0, 0, 0.16, 0.18, 0.16); k.add(g.cone8, 'thatch', 2.4, 2.1, -1.2, 0, 0, 0, 0.3, 0.25, 0.3); k.add(g.box, 'red', 2.4, 1.35, -1.2, 0, 0, 0, 0.4, 0.5, 0.2);
  // yel değirmeni gövdesi
  k.add(new THREE.CylinderGeometry(0.5, 0.75, 3.4, 10), t === 1 ? 'plank' : 'plaster', 2.75, 1.7, -2.75);
  k.add(new THREE.ConeGeometry(0.75, 0.9, 10), t === 1 ? 'thatch' : 'roofRed', 2.75, 3.85, -2.75);
  k.add(geos().box, 'timber', 2.75, 0.6, -2.24, 0, 0, 0, 0.4, 0.9, 0.05);
  const grp = k.build(5.2);
  const mill = new THREE.Group(); mill.position.set(2.75, 3.3, -2.15); grp.add(mill);
  const bladeM = mats().plank, clothM = mats().cloth;
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group(); arm.rotation.z = (i / 4) * TAU; mill.add(arm);
    const pole = new THREE.Mesh(geos().box, bladeM); pole.scale.set(0.07, 2.1, 0.05); pole.position.y = 1.05; arm.add(pole);
    const sail = new THREE.Mesh(geos().box, clothM); sail.scale.set(0.42, 1.5, 0.02); sail.position.set(0.24, 1.25, 0.02); arm.add(sail);
    pole.castShadow = sail.castShadow = true;
  }
  const hub = new THREE.Mesh(geos().sphere, mats().timber); hub.scale.setScalar(0.14); mill.add(hub);
  // sallanan buğday
  const wheatGeo = new THREE.ConeGeometry(0.09, 0.9, 4); wheatGeo.translate(0, 0.45, 0);
  const n = 7 * 5 * 3, im = new THREE.InstancedMesh(wheatGeo, mats().wheat, n); im.castShadow = true;
  const base = [], m4 = new THREE.Matrix4();
  let idx = 0;
  for (let r = 0; r < 7; r++) for (let c = 0; c < 15; c++) { base.push([-2.8 + c * 0.4 + rand(-0.08, 0.08), 0, 0.0 + r * 0.45 + rand(-0.08, 0.08), rand(0.8, 1.15)]); idx++; }
  grp.add(im);
  const old = grp.userData.update;
  const q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
  let acc = 1;
  grp.userData.update = (tt, dt) => {
    old(tt, dt); mill.rotation.z = -tt * 1.1; acc += dt; if (acc < 0.1) return; acc = 0;
    base.forEach(([x, y, z, k2], i) => { e.set(Math.sin(tt * 1.8 + x * 0.8) * 0.12, 0, Math.sin(tt * 1.3 + z) * 0.08); q.setFromEuler(e); m4.compose(v.set(x, 0, z), q, s.set(k2, k2 * (0.6 + L * 0.04), k2)); im.setMatrixAt(i, m4); });
    im.instanceMatrix.needsUpdate = true;
  };
  grp.userData.update(0, 1);
  return grp;
}

function lumber(L) {
  const k = new Kit(), g = geos(), t = tier(L);
  // açık hangar
  for (const [x, z] of [[-2.6, -2.8], [0.4, -2.8], [-2.6, -0.4], [0.4, -0.4]]) k.add(g.cyl8, 'timber', x, 1.3, z, 0, 0, 0, 0.12, 2.6, 0.12);
  k.add(gableRoof(3.0, 2.4, 1.2), t === 1 ? 'thatch' : 'roofRed', -1.1, 2.6, -1.6);
  k.add(boxUV(2.2, 0.8, 0.8, 1), 'plank', -1.1, 0.4, -1.6);
  k.add(g.cyl12, 'iron', -1.1, 0.95, -1.6, 0, 0, Math.PI / 2, 0.4, 0.04, 0.4);
  // kütük yığınları
  for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) k.add(cylUV(0.22, 0.22, 2.4, 10, 1), 'bark', 2.0, 0.22 + r * 0.38, -2.2 + i * 0.46 + r * 0.23, 0, 0, Math.PI / 2);
  for (let i = 0; i < 3; i++) k.add(cylUV(0.26, 0.26, 2.2, 10, 1), 'bark', -2.2 + i * 0.1, 0.26, 1.4 + i * 0.55, 0, 0.1 * i, Math.PI / 2);
  // kesim kütüğü ve balta
  k.add(cylUV(0.35, 0.4, 0.5, 12, 1), 'bark', 1.4, 0.25, 1.6); k.add(g.cyl8, 'timber', 1.5, 0.75, 1.6, 0, 0, 0.6, 0.03, 0.7, 0.03); k.add(g.box, 'iron', 1.65, 1.0, 1.6, 0, 0, 0.6, 0.06, 0.18, 0.25);
  // su değirmeni kanalı
  k.add(boxUV(0.8, 0.3, 4.5, 1), 'plank', 3.0, 0.15, 1.3); k.add(new THREE.PlaneGeometry(0.6, 4.4).rotateX(-Math.PI / 2), 'water', 3.0, 0.31, 1.3);
  const grp = k.build(4);
  // su çarkı
  const wheel = new THREE.Group(); wheel.position.set(3.0, 1.2, 1.0);
  const wm = mats().plank, wt = mats().timber;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.07, 6, 20), wt); rim.rotation.y = Math.PI / 2; wheel.add(rim);
  for (let i = 0; i < 8; i++) { const sp = new THREE.Mesh(g.box, wm); sp.scale.set(0.06, 2.0, 0.08); sp.rotation.x = (i / 8) * Math.PI; wheel.add(sp); const pd = new THREE.Mesh(g.box, wm); const a = (i / 8) * TAU; pd.position.set(0, Math.cos(a) * 1.0, Math.sin(a) * 1.0); pd.rotation.x = a; pd.scale.set(0.5, 0.06, 0.3); wheel.add(pd); }
  wheel.traverse((m) => { m.castShadow = true; });
  grp.add(wheel);
  const saw = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.02, 20), mats().iron); saw.rotation.x = Math.PI / 2; saw.position.set(-1.1, 1.0, -1.6); saw.castShadow = true; grp.add(saw);
  const plankM = new THREE.Mesh(boxUV(1.8, 0.12, 0.35, 1), mats().plank); plankM.castShadow = true; grp.add(plankM);
  const old = grp.userData.update;
  grp.userData.update = (tt, dt) => { old(tt, dt); wheel.rotation.x = tt * 0.8; saw.rotation.y = tt * 12; const u = (tt * 0.25) % 1; plankM.position.set(-2.4 + u * 2.6, 0.88, -1.6); };
  return grp;
}

function quarry(L) {
  const k = new Kit(), g = geos(), t = tier(L);
  k.add(new THREE.CircleGeometry(3.2, 20).rotateX(-Math.PI / 2), 'dirt', 0, 0.025, 0);
  // kaya duvarları
  for (let i = 0; i < 7; i++) { const a = Math.PI * 0.85 + (i / 6) * Math.PI * 1.3; k.add(blob(1, 0.35), 'rock', Math.cos(a) * 3.0, 0.6, Math.sin(a) * 3.0, 0, a, 0, rand(0.9, 1.4), rand(0.8, 1.5), rand(0.8, 1.2)); }
  // kesme taş blokları
  for (let i = 0; i < 6; i++) k.add(boxUV(0.7, 0.5, 0.5, 1), 'stone', 1.6 + (i % 3) * 0.75, 0.25 + Math.floor(i / 3) * 0.5, 1.8, 0, rand(-0.1, 0.1), 0);
  for (let i = 0; i < 3; i++) k.add(boxUV(0.6, 0.45, 0.5, 1), 'stone', -1.8 + i * 0.7, 0.23, 2.3, 0, rand(-0.3, 0.3), 0);
  // vinç
  k.add(g.cyl8, 'timber', -0.6, 1.8, 0.2, 0, 0, 0, 0.12, 3.6, 0.12);
  k.add(g.cyl8, 'timber', 0.4, 3.4, 0.2, 0, 0, -1.2, 0.08, 2.6, 0.08);
  for (const s of [-1, 1]) k.add(g.cyl8, 'timber', -0.6 + s * 0.5, 0.6, 0.2 + s * 0.4, s * 0.4, 0, s * 0.3, 0.06, 1.4, 0.06);
  // el arabası
  k.add(boxUV(1.0, 0.35, 0.6, 1), 'plank', -1.6, 0.55, 0.8); for (const s of [-1, 1]) k.add(g.cyl12, 'timber', -1.6, 0.3, 0.8 + s * 0.35, Math.PI / 2, 0, 0, 0.3, 0.06, 0.3);
  k.add(g.ico, 'rock', -1.6, 0.8, 0.8, 0, 0, 0, 0.3, 0.2, 0.25);
  if (t >= 2) { k.add(boxUV(1.6, 1.6, 1.4, 2), 'plank', -2.2, 0.8, -1.2); k.add(gableRoof(1.6, 1.4, 0.8, 0.2), 'roofRed', -2.2, 1.6, -1.2); }
  const grp = k.build(4.2);
  const blk = new THREE.Mesh(boxUV(0.55, 0.42, 0.55, 1), mats().stone); blk.castShadow = true; grp.add(blk);
  const rope = new THREE.Mesh(geos().cyl8, mats().iron); rope.scale.set(0.012, 1, 0.012); grp.add(rope);
  const old = grp.userData.update;
  grp.userData.update = (tt, dt) => { old(tt, dt); const y = 1.6 + Math.sin(tt * 0.9) * 0.9; blk.position.set(1.5, y, 0.2); rope.position.set(1.5, (y + 3.3) / 2, 0.2); rope.scale.y = 3.3 - y; blk.rotation.y = Math.sin(tt * 0.5) * 0.3; };
  return grp;
}

function warehouse(L) {
  const k = new Kit(), g = geos(), t = tier(L);
  const W = 5.6, H = t === 1 ? 2.8 : 3.4, D = 4.2;
  if (t === 1) k.add(boxUV(W, H, D, 2), 'plank', 0, H / 2, -0.8);
  else { k.add(boxUV(W, 1.0, D, 2), 'stone', 0, 0.5, -0.8); k.add(boxUV(W - 0.1, H - 1, D - 0.1, 2), 'plank', 0, 1 + (H - 1) / 2, -0.8); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(g.box, 'timber', sx * W / 2, H / 2, -0.8 + sz * D / 2, 0, 0, 0, 0.2, H, 0.2);
  k.add(gableRoof(W, D, 2.0), t === 3 ? 'roofBlue' : 'roofRed', 0, H, -0.8);
  for (const sx of [-1, 1]) k.add(gableWall(D, 2.0), 'plank', sx * W / 2, H, -0.8, 0, Math.PI / 2, 0);
  // büyük ambar kapısı
  k.add(boxUV(2.2, 2.4, 0.1, 1), 'plank', 0, 1.2, -0.8 + D / 2 + 0.03);
  k.add(g.box, 'timber', 0, 1.2, -0.8 + D / 2 + 0.09, 0, 0, Math.atan2(2.4, 2.2), Math.hypot(2.2, 2.4), 0.12, 0.05);
  k.add(g.box, 'timber', 0, 1.2, -0.8 + D / 2 + 0.09, 0, 0, -Math.atan2(2.4, 2.2), Math.hypot(2.2, 2.4), 0.12, 0.05);
  windowAt(k, 0, H + 0.7, -0.8 + D / 2 + 0.02, 0, 0.5, 0.5);
  for (let i = 0; i < 3; i++) crate(k, -2.4 + i * 0.75, 2.2, 0.65, rand(-0.2, 0.2));
  crate(k, -2.0, 2.2, 0.55, 0.4, 0.65);
  for (let i = 0; i < 3; i++) barrel(k, 1.6 + i * 0.7, 2.2);
  for (let i = 0; i < 2; i++) k.add(g.sphere, 'cloth', 2.2 + i * 0.5, 0.25, 1.4, 0, 0, 0, 0.28, 0.3, 0.22);
  return k.build(H + 2.2);
}


function academy(L) {
  const k = new Kit(), g = geos(), t = tier(L);
  const r = 1.9 + L * 0.05, H = 3.6 + L * 0.35;
  for (let i = 0; i < 2; i++) k.add(new THREE.CylinderGeometry(r + 1.0 - i * 0.4, r + 1.1 - i * 0.4, 0.22, 20), i ? 'marble' : 'stone', 0, 0.11 + i * 0.22, -0.8);
  k.add(cylUV(r, r * 1.04, H, 20, 2), t === 1 ? 'plaster' : 'stone', 0, 0.44 + H / 2, -0.8);
  // sütun halkası
  const nc = t === 1 ? 6 : 10;
  for (let i = 0; i < nc; i++) { const a = (i / nc) * TAU; k.add(cylUV(0.14, 0.16, H * 0.7, 10, 1), t === 1 ? 'timber' : 'marble', Math.cos(a) * (r + 0.35), 0.44 + H * 0.35, -0.8 + Math.sin(a) * (r + 0.35)); }
  k.add(new THREE.TorusGeometry(r + 0.35, 0.12, 6, 28), t === 3 ? 'gold' : 'stoneDark', 0, 0.44 + H * 0.7, -0.8, Math.PI / 2, 0, 0);
  k.add(new THREE.CylinderGeometry(r + 0.55, r + 0.55, 0.2, 24), t === 1 ? 'timber' : 'marble', 0, 0.44 + H * 0.7 + 0.12, -0.8);
  // kubbe
  k.add(new THREE.SphereGeometry(r * 0.98, 20, 10, 0, TAU, 0, Math.PI / 2), t === 3 ? 'gold' : t === 2 ? 'roofBlue' : 'roofRed', 0, 0.44 + H, -0.8);
  k.add(cylUV(0.35, 0.4, 0.8, 12, 1), 'stone', 0, 0.44 + H + r * 0.98 - 0.1, -0.8);
  k.add(g.cone16, t === 3 ? 'gold' : 'roofBlue', 0, 0.44 + H + r * 0.98 + 0.6, -0.8, 0, 0, 0, 0.45, 0.6, 0.45);
  // teleskop
  if (L >= 3) { k.add(g.cyl8, 'gold', 0.9, 0.44 + H + r * 0.6, -0.4, 0.9, 0, -0.4, 0.09, 1.3, 0.09); k.add(g.cyl8, 'iron', 0.75, 0.44 + H + r * 0.45, -0.55, 0, 0, 0, 0.04, 0.6, 0.04); }
  doorAt(k, 0, -0.8 + r + 0.02, 0, 1.0, 1.8, t >= 2 ? 'gold' : 'plank');
  for (let i = 0; i < 4; i++) { const a = Math.PI / 2 + (i - 1.5) * 0.5; if (Math.abs(i - 1.5) < 0.6) continue; windowAt(k, Math.cos(a) * r * 1.01, 0.44 + H * 0.55, -0.8 + Math.sin(a) * r * 1.01, Math.PI / 2 - a, 0.4, 0.9, true); }
  // dışarıda kitap rafı, masa ve parşömenler
  k.add(boxUV(1.2, 1.3, 0.35, 1), 'plank', -2.6, 0.65, 2.1, 0, 0.5, 0);
  const bookCols = ['red', 'blue', 'hay', 'leafDark', 'timber'];
  for (let sh = 0; sh < 3; sh++) for (let i = 0; i < 6; i++) k.add(g.box, bookCols[(i + sh) % 5], -2.6 + Math.cos(0.5) * (-0.45 + i * 0.18), 0.25 + sh * 0.4, 2.1 - Math.sin(0.5) * (-0.45 + i * 0.18) + 0.08, 0, 0.5, 0, 0.12, 0.3, 0.22);
  k.add(boxUV(1.0, 0.08, 0.6, 1), 'plank', 2.4, 0.75, 2.2); for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(g.cyl8, 'timber', 2.4 + sx * 0.4, 0.37, 2.2 + sz * 0.22, 0, 0, 0, 0.04, 0.74, 0.04);
  k.add(g.cyl8, 'cloth', 2.3, 0.84, 2.2, 0, 0.3, Math.PI / 2, 0.06, 0.5, 0.06); k.add(g.sphere, 'crystal', 2.65, 0.9, 2.15, 0, 0, 0, 0.12, 0.12, 0.12);
  addBanner(k, -r - 0.8, 3.4, -0.8, 0.6, 1.0);
  return k.build(0.44 + H + r + 1.4);
}


// =====================================================================
//  KAYKIT MODELLERİ İLE BİNALAR (yüklendiyse bunlar kullanılır)
// =====================================================================
const KB = (n) => 'building_' + n + '_blue';
const KKMAP = {
  townhall: { m: () => KB('castle'), smoke: [0.25, 0.92, -0.2] },
  barracks: { m: () => KB('barracks') },
  archery: { m: (L) => (L >= 7 ? KB('tower_catapult') : L >= 4 ? KB('tower_B') : KB('tower_A')), fill: 0.62 },
  hospital: { m: () => KB('church') },
  potion: { m: () => KB('blacksmith'), smoke: [0.18, 0.95, -0.15], glow: 0x50ff90 },
  heroes: { m: () => KB('tavern') },
  summon: { m: () => KB('tower_B'), tint: 0xc8a0ff, fill: 0.5 },
  farm: { m: () => KB('windmill'), fill: 0.55 },
  lumber: { m: () => KB('lumbermill'), fill: 0.62 },
  quarry: { m: () => KB('mine') },
  warehouse: { m: () => KB('market') },
  academy: { m: () => KB('home_B'), fill: 0.5 },
};
const PROP_S = 4.2;
const HF_SMOKE = { potion: [0.18, 0.9, -0.1], farm: [-0.15, 0.75, -0.05], lumber: [-0.3, 0.85, -0.15], hospital: [-0.25, 0.8, -0.2] };
const HF_FILL = { townhall: 0.9, archery: 0.78, summon: 0.82, farm: 0.92, quarry: 0.92 };
function prop(name, x, z, ry = 0, s = 1, parent) { const m = A.model(name); if (!m) return null; m.position.set(x, 0, z); m.rotation.y = ry; m.scale.setScalar(PROP_S * s); parent.add(m); return m; }
function kkBuilding(key, L) {
  const def = KKMAP[key]; if (!def || !(A.ready.models || A.hasHF(key))) return null;
  const isHF = A.hasHF(key);
  const name = def.m(L);
  const base = isHF ? A.hfModel(key) : def.tint ? A.tinted(name, def.tint) : A.model(name);
  if (!base) return null;
  const fp = FOOTPRINT[key] || 7;
  const k = new Kit();
  const size = isHF ? A.hfSize(key) : A.modelSize(name);
  const fill = (isHF ? (HF_FILL[key] || 0.86) : (def.fill || 0.7)) + (L - 1) * (isHF ? 0.016 : 0.022);
  const sc = fp * fill / Math.max(size.x, size.z);
  base.scale.setScalar(sc);
  k.group.add(base);
  const h = size.y * sc;
  const c = fp * 0.42, r2 = (n) => n * Math.PI / 2;
  // --- binaya özel ekler ---
  if (key === 'farm' && !isHF) {
    const fields = L >= 8 ? 3 : L >= 4 ? 2 : 1;
    const spots = [[-fp * 0.27, fp * 0.2], [fp * 0.27, fp * 0.22], [-fp * 0.27, -fp * 0.24]];
    for (let i = 0; i < fields; i++) { const g = A.model('building_grain'); if (!g) break; const gs = A.modelSize('building_grain'); g.scale.setScalar(fp * 0.36 / Math.max(gs.x, gs.z)); g.position.set(spots[i][0], 0, spots[i][1]); k.group.add(g); }
    base.position.set(fp * 0.18, 0, -fp * 0.12);
  }
  if (key === 'lumber') { for (let i = 0; i < 1 + Math.floor(L / 3); i++) prop('resource_lumber', -c + i * 1.3, c, 0.3 * i, 0.9, k.group); }
  if (key === 'quarry') { for (let i = 0; i < 1 + Math.floor(L / 3); i++) prop('resource_stone', c - i * 1.4, c, 0.5 * i, 0.9, k.group); }
  if (key === 'barracks') { prop('target', -c, c, 0.4, 1, k.group); if (L >= 3) prop('weaponrack', c, c, -0.3, 1, k.group); if (L >= 6) prop('target', -c + 1.4, c + 0.2, 0.2, 1, k.group); }
  if (key === 'heroes') { prop('barrel', c, c, 0, 1, k.group); if (L >= 4) prop('barrel', c - 0.9, c + 0.2, 0.5, 1, k.group); }
  if (key === 'hospital' && L >= 3) prop('tent', -c, c - 0.4, 0.4, 0.9, k.group);
  if (key === 'potion') { prop('bucket_water', c, c, 0, 1, k.group); if (L >= 3) prop('crate_open', c - 1, c + 0.1, 0.3, 1, k.group); }
  if (key === 'warehouse') { prop('crate_A_big', -c, c, 0.2, 1, k.group); prop('sack', -c + 0.9, c + 0.2, 0, 1, k.group); if (L >= 5) prop('crate_long_A', c, c, -0.4, 1, k.group); }
  if (key === 'townhall' && L >= 5) {
    const tw = A.model(KB('tower_A')), ts = A.modelSize(KB('tower_A'));
    const tS = fp * (0.16 + L * 0.008) / Math.max(ts.x, ts.z);
    for (const [sx, sz] of L >= 8 ? [[-1, -1], [1, -1], [-1, 1], [1, 1]] : [[-1, -1], [1, -1]]) { const t = A.model(KB('tower_A')); t.scale.setScalar(tS); t.position.set(sx * fp * 0.42, 0, sz * fp * 0.4); k.group.add(t); }
    if (L >= 7) for (const sx of [-1, 1]) { const w = A.model('wall_straight'); if (!w) break; const ws = A.modelSize('wall_straight'); w.scale.setScalar(fp * 0.34 / Math.max(ws.x, ws.z)); w.position.set(sx * fp * 0.42, 0, 0); w.rotation.y = Math.PI / 2; k.group.add(w); }
  }
  // --- seviyeye göre genel ekler ---
  const spots = [[-c, c], [c, c], [-c, -c], [c, -c]];
  if (L >= 2 && !['lumber', 'quarry', 'warehouse', 'barracks', 'heroes'].includes(key)) prop('barrel', spots[0][0] * 0.95, spots[0][1], 0, 1, k.group);
  if (L >= 3) for (const i of [2, 3]) { const f = prop('flag_blue', spots[i][0], spots[i][1], 0, 1.1, k.group); if (f) { const ph = Math.random() * 6; k.anims.push((t) => { f.rotation.y = Math.sin(t * 1.3 + ph) * 0.25; }); } }
  if (L >= 4 && key !== 'farm') prop('sack', spots[1][0] * 0.9, spots[1][1] * 1.02, 0.4, 1, k.group);
  if (L >= 5 && !['townhall', 'farm'].includes(key)) prop('crate_A_small', spots[0][0] * 0.75, spots[0][1] * 1.05, 0.5, 1, k.group);
  if (L >= 6) for (const sx of [-1, 1]) { const f = A.model('fence_wood_straight'); if (!f) break; const fs = A.modelSize('fence_wood_straight'); f.scale.setScalar(fp * 0.3 / Math.max(fs.x, fs.z)); f.position.set(sx * fp * 0.3, 0, fp * 0.49); k.group.add(f); }
  if (L >= 7 && key !== 'farm') prop('wheelbarrow', spots[3][0] * 0.7, spots[3][1] * 0.95 + 0.5, 0.8, 1, k.group);
  if (L >= 8) for (const sz of [-1]) { const f = A.model('fence_stone_straight'); if (!f) break; const fs = A.modelSize('fence_stone_straight'); f.scale.setScalar(fp * 0.5 / Math.max(fs.x, fs.z)); f.position.set(0, 0, sz * fp * 0.5); k.group.add(f); }
  if (L >= 9) for (const i of [0, 1]) prop('flag_blue', spots[i][0] * 1.02, spots[i][1] * 1.02, 0, 1.2, k.group);
  // --- hareketli parçalar (makine gibi) ---
  const fan = base.getObjectByName('building_windmill_top_fan_blue'), top = base.getObjectByName('building_windmill_top_blue');
  if (fan) k.anims.push((t) => { fan.rotation.z = -t * 1.4; });
  if (top) k.anims.push((t) => { top.rotation.y = Math.sin(t * 0.15) * 0.25; });
  const saw = base.getObjectByName('building_lumbermill_saw_blue');
  if (saw) k.anims.push((t) => { saw.rotation.x = t * 8; });
  const arm = base.getObjectByName('catapult_arm_blue'), turret = base.getObjectByName('catapult_turret_blue');
  if (arm) k.anims.push((t) => { const u = (t * 0.35) % 1; arm.rotation.x = u < 0.15 ? -(u / 0.15) * 1.2 : -1.2 + Math.min(1, (u - 0.15) / 0.85) * 1.2; });
  if (turret) k.anims.push((t) => { turret.rotation.y = Math.sin(t * 0.3) * 0.8; });
  if (def.smoke && !isHF) addSmoke(k, def.smoke[0] * size.x * sc, def.smoke[1] * h, def.smoke[2] * size.z * sc);
  if (isHF && HF_SMOKE[key]) { const [sx, sy, sz] = HF_SMOKE[key]; addSmoke(k, sx * size.x * sc, sy * h, sz * size.z * sc); }
  if (def.glow) {
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: textures().glow, color: def.glow, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6 }));
    gl.position.set(0.25 * size.x * sc, h * 0.35, 0.3 * size.z * sc); gl.scale.setScalar(fp * 0.4); k.group.add(gl);
    k.anims.push((t) => { gl.material.opacity = 0.45 + Math.sin(t * 3) * 0.2 + Math.sin(t * 11) * 0.05; });
  }
  if (key === 'summon') {
    const rune = new THREE.Mesh(new THREE.PlaneGeometry(fp * 0.55, fp * 0.55).rotateX(-Math.PI / 2), mats().runeMat); rune.position.set(0, 0.06, fp * 0.28); k.group.add(rune);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: textures().glow, color: 0xa060ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5 })); halo.position.set(0, h * 0.6, 0); halo.scale.setScalar(fp * 0.7); k.group.add(halo);
    const crystals = [];
    for (let i = 0; i < 4; i++) { const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), mats().crystal); cr.scale.set(1, 1.8, 1); cr.castShadow = true; k.group.add(cr); crystals.push(cr); }
    k.anims.push((t) => { rune.rotation.y = t * 0.3; halo.material.opacity = 0.4 + Math.sin(t * 2.2) * 0.15; crystals.forEach((cr, i) => { const a = t * 0.8 + (i / 4) * TAU; cr.position.set(Math.cos(a) * fp * 0.36, h * 0.55 + Math.sin(t * 2 + i) * 0.4, Math.sin(a) * fp * 0.36); cr.rotation.y = t * 2; }); });
  }
  if (L >= 10) crest(k, h + 1.6);
  const grp = k.build(h + 0.5);
  if (key === 'archery') grp.userData.topY = isHF ? h * 0.66 : h * (L >= 7 ? 0.62 : 0.78);
  return grp;
}

const BUILDERS = { academy, townhall, barracks, archery, hospital, potion, heroes, summon, farm, lumber, quarry, warehouse };
export function createBuilding(key, level) {
  mats(); geos();
  const kg = kkBuilding(key, Math.max(1, level));
  if (kg) return kg;
  const f = BUILDERS[key];
  CUR = { key, L: Math.max(1, level) };
  const grp = f ? f(Math.max(1, level)) : new THREE.Group();
  CUR = null;
  // seviye büyüdükçe hafif ölçek artışı (ayak izi içinde)
  const s = 0.9 + Math.min(level, 10) * 0.012;
  grp.scale.setScalar(s);
  grp.userData.height = (grp.userData.height || 5) * s;
  if (grp.userData.topY) grp.userData.topY *= s;
  return grp;
}

export function createConstructionSite(size) {
  mats();
  if (A.ready.models && A.hasModel('building_scaffolding')) {
    const k = new Kit(), st = A.model('building_stage_B'), sc = A.model('building_scaffolding'), ss = A.modelSize('building_scaffolding');
    const s2 = size * 0.62 / Math.max(ss.x, ss.z);
    if (st) { st.scale.setScalar(s2); k.group.add(st); }
    sc.scale.setScalar(s2); k.group.add(sc);
    prop('resource_lumber', size * 0.38, size * 0.36, 0.3, 0.8, k.group); prop('resource_stone', -size * 0.38, size * 0.36, 0.2, 0.8, k.group); prop('ladder', size * 0.3, -size * 0.2, 0.5, 1, k.group);
    return k.build(ss.y * s2);
  } const g = geos(), k = new Kit(), h = size * 0.5;
  k.add(new THREE.PlaneGeometry(size * 0.9, size * 0.9).rotateX(-Math.PI / 2), 'dirt', 0, 0.03, 0);
  k.add(boxUV(size * 0.7, 0.5, size * 0.7, 2), 'stone', 0, 0.25, 0);
  const n = 3;
  for (let i = 0; i <= n; i++) for (const s of [-1, 1]) {
    const x = -size * 0.38 + (i / n) * size * 0.76;
    k.add(g.cyl8, 'timber', x, h / 2, s * size * 0.38, 0, 0, 0, 0.06, h, 0.06);
    k.add(g.cyl8, 'timber', s * size * 0.38, h / 2, x, 0, 0, 0, 0.06, h, 0.06);
  }
  for (const yy of [h * 0.45, h * 0.9]) for (const s of [-1, 1]) { k.add(boxUV(size * 0.8, 0.06, 0.35, 1), 'plank', 0, yy, s * size * 0.38); k.add(boxUV(0.35, 0.06, size * 0.8, 1), 'plank', s * size * 0.38, yy, 0); }
  for (let i = 0; i < 4; i++) k.add(boxUV(1.6, 0.08, 0.3, 1), 'plank', size * 0.3, 0.1 + i * 0.09, size * 0.42, 0, 0.05 * i, 0);
  for (let i = 0; i < 3; i++) k.add(boxUV(0.5, 0.4, 0.4, 1), 'stone', -size * 0.3 + i * 0.55, 0.2, size * 0.45);
  // vinç
  k.add(g.cyl8, 'timber', -size * 0.35, h * 0.8, -size * 0.35, 0, 0, 0, 0.1, h * 1.6, 0.1);
  k.add(g.cyl8, 'timber', -size * 0.1, h * 1.6, -size * 0.35, 0, 0, Math.PI / 2, 0.07, size * 0.6, 0.07);
  k.add(g.cyl8, 'iron', size * 0.15, h * 1.2, -size * 0.35, 0, 0, 0, 0.012, h * 0.8, 0.012);
  const grp = k.build(h * 1.7);
  const hook = new THREE.Mesh(g.box, mats().stone); hook.scale.set(0.5, 0.4, 0.4); hook.castShadow = true; grp.add(hook);
  const old = grp.userData.update;
  grp.userData.update = (t, dt) => { old(t, dt); hook.position.set(size * 0.15, h * 0.75 + Math.sin(t * 1.2) * h * 0.25, -size * 0.35); };
  return grp;
}

export function createPlot(size) {
  mats(); const g = geos(), k = new Kit();
  k.add(new THREE.PlaneGeometry(size * 0.85, size * 0.85).rotateX(-Math.PI / 2), 'dirt', 0, 0.035, 0);
  const s = size * 0.42;
  for (const [x, z] of [[-s, -s], [s, -s], [-s, s], [s, s]]) k.add(g.cyl8, 'timber', x, 0.35, z, 0, 0, 0, 0.06, 0.7, 0.06);
  for (const [x0, z0, x1, z1] of [[-s, -s, s, -s], [s, -s, s, s], [s, s, -s, s], [-s, s, -s, -s]]) k.add(g.box, 'hay', (x0 + x1) / 2, 0.55, (z0 + z1) / 2, 0, Math.atan2(z1 - z0, x1 - x0) === 0 ? 0 : Math.PI / 2, 0, Math.hypot(x1 - x0, z1 - z0), 0.025, 0.025);
  const grp = k.build(1.6);
  const plusMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 1.6, 0.6), transparent: true, opacity: 0.85 });
  const plus = new THREE.Group();
  const a = new THREE.Mesh(g.box, plusMat); a.scale.set(1.2, 0.08, 0.32); plus.add(a);
  const b = new THREE.Mesh(g.box, plusMat); b.scale.set(0.32, 0.08, 1.2); plus.add(b);
  grp.add(plus);
  grp.userData.update = (t) => { plus.position.y = 0.4 + Math.sin(t * 2.5) * 0.15; plus.rotation.y = t * 0.6; plusMat.opacity = 0.6 + Math.sin(t * 2.5) * 0.25; };
  return grp;
}

export function createTree(variant = 0) {
  mats();
  if (A.ready.models) { const n = ['trees_A_large', 'trees_B_large', 'trees_A_medium', 'tree_single_A'][variant % 4]; const m = A.model(n); if (m) { const g = new THREE.Group(); m.scale.setScalar(variant === 3 ? 3.2 : 4.2); g.add(m); g.userData.height = 5; return g; } } const g = geos(), k = new Kit();
  if (variant === 0) { // meşe
    k.add(new THREE.CylinderGeometry(0.22, 0.38, 2.6, 8), 'bark', 0, 1.3, 0);
    k.add(new THREE.CylinderGeometry(0.08, 0.14, 1.4, 6), 'bark', 0.5, 2.6, 0, 0, 0, -0.8);
    for (const [x, y, z, s, m] of [[0, 3.6, 0, 1.6, 'leaf'], [0.9, 3.2, 0.3, 1.1, 'leafDark'], [-0.8, 3.3, -0.2, 1.15, 'leaf'], [0.1, 4.4, -0.3, 1.05, 'leafLight'], [-0.3, 3.0, 0.8, 0.9, 'leafDark']]) k.add(blob(1, 0.18), m, x, y, z, 0, Math.random() * 3, 0, s, s * 0.85, s);
    return k.build(5.4);
  }
  if (variant === 1) { // çam
    k.add(new THREE.CylinderGeometry(0.14, 0.24, 2, 7), 'bark', 0, 1, 0);
    for (let i = 0; i < 4; i++) k.add(new THREE.ConeGeometry(1.5 - i * 0.3, 1.8, 9), 'pine', 0, 1.6 + i * 1.0, 0, 0, i, 0);
    return k.build(6);
  }
  if (variant === 2) { // huş
    k.add(new THREE.CylinderGeometry(0.12, 0.18, 3.6, 8), 'birch', 0, 1.8, 0);
    for (let i = 0; i < 5; i++) k.add(g.box, 'dark', 0, 0.6 + i * 0.6, 0.15, 0, i, 0, 0.12, 0.04, 0.05);
    for (const [x, y, z, s] of [[0, 3.9, 0, 1.0], [0.5, 3.4, 0.2, 0.75], [-0.4, 3.5, -0.2, 0.8], [0, 4.6, 0, 0.7]]) k.add(blob(1, 0.2), 'leafLight', x, y, z, 0, 0, 0, s, s * 1.15, s);
    return k.build(5.2);
  }
  // çalı kümesi
  for (let i = 0; i < 4; i++) k.add(blob(1, 0.2), i % 2 ? 'leaf' : 'leafDark', rand(-0.6, 0.6), 0.45, rand(-0.6, 0.6), 0, 0, 0, rand(0.5, 0.8), rand(0.45, 0.65), rand(0.5, 0.8));
  return k.build(1.2);
}
export function createRock(scale = 1) {
  mats();
  if (A.ready.models) { const m = A.model(['rock_single_A', 'rock_single_B', 'rock_single_C', 'rock_single_D'][Math.floor(Math.random() * 4)]); if (m) { const g = new THREE.Group(); m.scale.setScalar(3.4 * scale); g.add(m); g.userData.height = scale; return g; } } const k = new Kit();
  k.add(blob(1, 0.3), 'rock', 0, 0.35 * scale, 0, 0, 0, 0, scale * 1.2, scale * 0.75, scale);
  if (scale > 0.8) k.add(blob(1, 0.3), 'rock', scale * 0.9, 0.2 * scale, scale * 0.3, 0, 1, 0, scale * 0.5, scale * 0.4, scale * 0.45);
  return k.build(scale);
}
export function createWall(length, level) {
  mats();
  if (A.ready.models && A.hasModel('wall_straight') && level >= 4) {
    const g = new THREE.Group(), ws = A.modelSize('wall_straight'), seg = 4.6, n = Math.max(1, Math.round(length / seg)), sc = (length / n) / ws.x;
    for (let i = 0; i < n; i++) { const w = A.model('wall_straight'); w.scale.set(sc, sc * 0.8, sc); w.position.x = -length / 2 + (i + 0.5) * (length / n); g.add(w); }
    g.userData.height = ws.y * sc * 0.8; g.userData.update = () => {}; return g;
  } const g = geos(), k = new Kit(), t = tier(level);
  if (t === 1) {
    const n = Math.max(2, Math.round(length / 0.42));
    for (let i = 0; i < n; i++) { const x = -length / 2 + (i + 0.5) * (length / n), h = 2.6 + Math.sin(i * 7.3) * 0.2; k.add(cylUV(0.22, 0.24, h, 7, 1), 'bark', x, h / 2, 0); k.add(g.cone8, 'bark', x, h + 0.25, 0, 0, 0, 0, 0.22, 0.5, 0.22); }
    k.add(g.box, 'timber', 0, 1.2, -0.25, 0, 0, 0, length, 0.14, 0.1);
    k.add(g.box, 'timber', 0, 2.0, -0.25, 0, 0, 0, length, 0.14, 0.1);
    return k.build(3);
  }
  const H = t === 3 ? 4.2 : 3.4;
  k.add(boxUV(length, H, 1.6, 2), 'stone', 0, H / 2, 0);
  k.add(boxUV(length, 0.3, 1.9, 2), 'stoneDark', 0, H, 0);
  const step = 0.9;
  for (let x = -length / 2 + step / 2; x <= length / 2 - step / 2 + 0.01; x += step) { k.add(boxUV(step * 0.55, 0.6, 0.35, 2), 'stone', x, H + 0.45, 0.78); k.add(boxUV(step * 0.55, 0.45, 0.3, 2), 'stone', x, H + 0.38, -0.8); }
  if (t === 3) k.add(g.box, 'gold', 0, H - 0.6, 0.81, 0, 0, 0, length, 0.1, 0.02);
  return k.build(H + 0.8);
}
export function createWallTower(level) {
  mats();
  if (A.ready.models && level >= 4) { const n = level >= 8 ? KB('tower_B') : KB('tower_A'); const m = A.model(n); if (m) { const g = new THREE.Group(), ts = A.modelSize(n); m.scale.setScalar(3.6 / Math.max(ts.x, ts.z)); g.add(m); g.userData.height = ts.y * 3.6 / Math.max(ts.x, ts.z); g.userData.update = () => {}; return g; } } const g = geos(), k = new Kit(), t = tier(level);
  if (t === 1) {
    const H = 4.2;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.add(g.cyl8, 'bark', sx * 0.9, H / 2, sz * 0.9, 0, 0, 0, 0.16, H, 0.16);
    k.add(boxUV(2.4, 0.18, 2.4, 1), 'plank', 0, H, 0);
    for (const s of [-1, 1]) { k.add(boxUV(2.4, 0.6, 0.1, 1), 'plank', 0, H + 0.4, s * 1.15); k.add(boxUV(0.1, 0.6, 2.4, 1), 'plank', s * 1.15, H + 0.4, 0); }
    k.add(g.cone8, 'thatch', 0, H + 1.6, 0, 0, Math.PI / 8, 0, 1.9, 1.3, 1.9);
    return k.build(H + 2.3);
  }
  const H = t === 3 ? 6.4 : 5.4, r = 1.7;
  k.add(cylUV(r, r * 1.1, H, 16, 2), 'stone', 0, H / 2, 0);
  k.add(cylUV(r * 1.2, r * 1.05, 0.5, 16, 2), 'stone', 0, H + 0.25, 0);
  roundCren(k, r * 1.12, H + 0.5, 0, 0, 12);
  k.add(g.cone16, t === 3 ? 'roofBlue' : 'roofRed', 0, H + 2.2, 0, 0, 0, 0, r * 1.25, 2.6, r * 1.25);
  if (t === 3) k.add(g.sphere, 'gold', 0, H + 3.6, 0, 0, 0, 0, 0.18, 0.18, 0.18);
  for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; k.add(g.box, 'dark', Math.cos(a) * r * 1.02, H * 0.6, Math.sin(a) * r * 1.02, 0, -a, 0, 0.1, 0.6, 0.12); }
  addBanner(k, 0, H + 4.2, 0, 0.6, 0.9);
  return k.build(H + 4);
}
