// =====================================================================
//  ORMAN KAÇIŞI — Yağmur ormanında gece geçen sonsuz koşu oyunu
//  Three.js ile prosedürel grafik + WebAudio ile prosedürel ses
// =====================================================================
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------------------------------------------------------------------
//  Yardımcılar
// ---------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, l, dt) => lerp(a, b, 1 - Math.exp(-l * dt));
const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const hsh = (x, y, z) => { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); };

const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && Math.min(innerWidth, innerHeight) < 900);

const store = {
  get(k, d) { try { const v = localStorage.getItem('ok_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('ok_' + k, JSON.stringify(v)); } catch (e) { /* yok say */ } },
};

// ---------------------------------------------------------------------
//  Oyun sabitleri
// ---------------------------------------------------------------------
const LANE_W = 2.2;
const laneX = (l) => (l - 1) * LANE_W;
const CH = 42;              // sahne parçası uzunluğu (m)
const NCH = 7;              // sahne parça sayısı
const GRAVITY = 40;
const JUMP_V = 12.8;
const ROLL_T = 0.62;
const STEP = 0.55;
const H_STAND = 1.75, H_ROLL = 0.85;
const BASE_SPEED = 15, MAX_SPEED = 33, SPEED_DIST = 3200;
const BEAR_TIME = 7.0;
const TRUNK_TOP = 2.2;
const RAMP_LEN = 5.5;

// ---------------------------------------------------------------------
//  Renderer / sahne
// ---------------------------------------------------------------------
const canvasEl = $('game');
const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.45;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const maxAniso = renderer.capabilities.getMaxAnisotropy();

let quality = store.get('quality', isMobile ? 'medium' : 'high');
const QUALITY = {
  low: { pr: 1.0, bloom: false, rain: 700, samples: 0, shadow: 1024, label: 'Düşük' },
  medium: { pr: 1.5, bloom: true, rain: 1300, samples: 0, shadow: 1024, label: 'Orta' },
  high: { pr: 2.0, bloom: true, rain: 2200, samples: 4, shadow: 2048, label: 'Yüksek' },
};

const scene = new THREE.Scene();
const FOG_COLOR = new THREE.Color(0x0e2a28);
scene.background = FOG_COLOR.clone();
scene.fog = new THREE.FogExp2(FOG_COLOR, 0.021);

const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 210);
camera.position.set(0, 3.6, 7);

// Ortam yansıması (ıslak yüzeyler için ay ışıklı gökyüzü)
{
  const pm = new THREE.PMREMGenerator(renderer);
  const es = new THREE.Scene();
  const sg = new THREE.SphereGeometry(10, 32, 16);
  const cols = [];
  const pos = sg.attributes.position;
  const top = new THREE.Color(0x1d4250), hor = new THREE.Color(0x0b1c1a), bot = new THREE.Color(0x030605), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 10;
    if (y > 0) c.copy(hor).lerp(top, Math.pow(y, 0.7)); else c.copy(hor).lerp(bot, Math.min(1, -y * 3));
    cols.push(c.r, c.g, c.b);
  }
  sg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  es.add(new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 5.6, 6.5) }));
  moon.position.set(-3, 6.5, -6);
  es.add(moon);
  scene.environment = pm.fromScene(es, 0.03).texture;
  scene.environmentIntensity = 0.55;
  pm.dispose();
}

// Işıklar
const hemi = new THREE.HemisphereLight(0x7aa6c8, 0x1c3322, 1.25);
scene.add(hemi);
const moonLight = new THREE.DirectionalLight(0xa9c4ff, 1.9);
moonLight.castShadow = true;
moonLight.shadow.camera.left = -16; moonLight.shadow.camera.right = 16;
moonLight.shadow.camera.top = 22; moonLight.shadow.camera.bottom = -14;
moonLight.shadow.camera.near = 1; moonLight.shadow.camera.far = 70;
moonLight.shadow.bias = -0.0006; moonLight.shadow.normalBias = 0.03;
scene.add(moonLight, moonLight.target);
const fillLight = new THREE.PointLight(0xa8e0cf, 7, 14, 1.6); // oyuncu çevresinde hafif biyolüminesan dolgu
scene.add(fillLight);

// ---------------------------------------------------------------------
//  Prosedürel dokular
// ---------------------------------------------------------------------
function makeNoise(px, py = px) {
  const g = new Float32Array(px * py);
  for (let i = 0; i < g.length; i++) g[i] = Math.random();
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const x0 = ((xi % px) + px) % px, y0 = ((yi % py) + py) % py, x1 = (x0 + 1) % px, y1 = (y0 + 1) % py;
    return lerp(lerp(g[y0 * px + x0], g[y0 * px + x1], u), lerp(g[y1 * px + x0], g[y1 * px + x1], u), v);
  };
}
function fbm(octs, ws, ax = 1, ay = 1) {
  const ns = octs.map((p) => makeNoise(Math.max(1, Math.round(p * ax)), Math.max(1, Math.round(p * ay))));
  return (x, y) => { let s = 0; for (let i = 0; i < ns.length; i++) s += ns[i](x * Math.max(1, Math.round(octs[i] * ax)), y * Math.max(1, Math.round(octs[i] * ay))) * ws[i]; return s; };
}
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function toTex(c, { srgb = true, repeat = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, maxAniso);
  return t;
}
function heightToNormal(h, W, H, strength, wrapX) {
  const [c, ctx] = mkCanvas(W, H);
  const img = ctx.createImageData(W, H), d = img.data;
  const at = (x, y) => {
    y = (y + H) % H;
    x = wrapX ? (x + W) % W : clamp(x, 0, W - 1);
    return h[y * W + x];
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
    const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
    let nx = -dx, ny = dy, nz = 1;
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * W + x) * 4;
    d[i] = (nx * 0.5 + 0.5) * 255; d[i + 1] = (ny * 0.5 + 0.5) * 255; d[i + 2] = (nz * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// Eliptik "damga" — dikeyde sarmalı
function stamp(W, H, cx, cy, rx, ry, rot, fn, wrapX = false) {
  const R = Math.max(rx, ry) + 1;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  for (let yy = Math.floor(cy - R); yy <= cy + R; yy++) for (let xx = Math.floor(cx - R); xx <= cx + R; xx++) {
    const dx = xx - cx, dy = yy - cy;
    const lx = (dx * cs + dy * sn) / rx, ly = (-dx * sn + dy * cs) / ry;
    const r2 = lx * lx + ly * ly;
    if (r2 > 1) continue;
    let x = xx; if (wrapX) x = (x + W) % W; else if (x < 0 || x >= W) continue;
    const y = (yy + H) % H;
    fn(y * W + x, r2);
  }
}

function genPathTextures() {
  const S = 512, M = 14; // 14m x 14m
  const n = fbm([4, 8, 16, 32, 64], [0.38, 0.26, 0.17, 0.11, 0.08]);
  const n2 = fbm([2, 4, 8], [0.55, 0.3, 0.15]);
  const n3 = fbm([3, 6, 12], [0.5, 0.3, 0.2]);
  const col = new Float32Array(S * S * 3), hgt = new Float32Array(S * S), rgh = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S, xm = (u - 0.5) * M, i = y * S + x;
    const nn = n(u, v);
    const edge = 4.25 + (n2(u, v) - 0.5) * 2.4;
    const m = 1 - smooth(edge - 0.7, edge + 0.5, Math.abs(xm));
    const pdN = n3(u + 0.31, v);
    const pd = smooth(0.66, 0.71, pdN) * smooth(3.9, 3.0, Math.abs(xm));
    // çamur
    let mr = 64 * (0.55 + nn * 0.8), mg = 46 * (0.55 + nn * 0.8), mb = 33 * (0.55 + nn * 0.75);
    // lane izleri (hafif tekerlek/ayak izi koyuluğu)
    const tr = Math.min(Math.abs(xm - 0), Math.abs(xm - 2.2), Math.abs(xm + 2.2));
    const track = smooth(0.55, 0.0, tr) * 0.18;
    mr *= 1 - track; mg *= 1 - track; mb *= 1 - track;
    // orman zemini
    const fr = 30 * (0.45 + nn * 1.0), fg = 38 * (0.45 + nn * 1.0), fb = 22 * (0.45 + nn * 0.9);
    let r = lerp(fr, mr, m), g = lerp(fg, mg, m), b = lerp(fb, mb, m);
    r = lerp(r, 30, pd * 0.7); g = lerp(g, 38, pd * 0.7); b = lerp(b, 44, pd * 0.7);
    col[i * 3] = r; col[i * 3 + 1] = g; col[i * 3 + 2] = b;
    hgt[i] = nn * 0.9 - pd * 0.7 + (1 - m) * 0.3;
    rgh[i] = lerp(lerp(0.9, 0.6, m), 0.14, pd);
  }
  // taşlar
  for (let k = 0; k < 90; k++) {
    const onPath = Math.random() < 0.7;
    const xm = onPath ? rand(-4, 4) : rand(-7, 7) ;
    const cx = (xm / M + 0.5) * S, cy = rand(S), rr = rand(2.2, onPath ? 6 : 9);
    const shade = rand(0.6, 1.1);
    stamp(S, S, cx, cy, rr, rr * rand(0.6, 1), rand(Math.PI), (i, r2) => {
      const dome = Math.sqrt(1 - r2);
      col[i * 3] = lerp(col[i * 3], 112 * shade, 0.8); col[i * 3 + 1] = lerp(col[i * 3 + 1], 106 * shade, 0.8); col[i * 3 + 2] = lerp(col[i * 3 + 2], 96 * shade, 0.8);
      hgt[i] += dome * 0.8; rgh[i] = 0.7;
    });
  }
  // dökülmüş yapraklar
  const leafCols = [[92, 60, 26], [70, 48, 22], [46, 66, 28], [110, 74, 30], [38, 52, 26]];
  for (let k = 0; k < 900; k++) {
    let xm = rand(-7, 7);
    if (Math.abs(xm) < 3.6 && Math.random() < 0.75) continue;
    const cx = (xm / M + 0.5) * S, cy = rand(S), rr = rand(3, 7);
    const lc = pick(leafCols), sh = rand(0.6, 1.15);
    stamp(S, S, cx, cy, rr, rr * 0.38, rand(Math.PI), (i, r2) => {
      col[i * 3] = lc[0] * sh; col[i * 3 + 1] = lc[1] * sh; col[i * 3 + 2] = lc[2] * sh;
      hgt[i] += 0.25 * (1 - r2);
    });
  }
  const [cc, cx] = mkCanvas(S, S), img = cx.createImageData(S, S);
  const [rc, rx] = mkCanvas(S, S), rimg = rx.createImageData(S, S);
  for (let i = 0; i < S * S; i++) {
    img.data[i * 4] = col[i * 3]; img.data[i * 4 + 1] = col[i * 3 + 1]; img.data[i * 4 + 2] = col[i * 3 + 2]; img.data[i * 4 + 3] = 255;
    const rv = rgh[i] * 255; rimg.data[i * 4] = rv; rimg.data[i * 4 + 1] = rv; rimg.data[i * 4 + 2] = rv; rimg.data[i * 4 + 3] = 255;
  }
  cx.putImageData(img, 0, 0); rx.putImageData(rimg, 0, 0);
  const map = toTex(cc), rough = toTex(rc, { srgb: false }), norm = toTex(heightToNormal(hgt, S, S, 1.3, false), { srgb: false });
  for (const t of [map, rough, norm]) { t.wrapS = THREE.ClampToEdgeWrapping; t.repeat.set(1, CH / M); }
  return { map, rough, norm };
}

function genFloorTexture() {
  const S = 256;
  const n = fbm([4, 8, 16, 32], [0.4, 0.3, 0.18, 0.12]);
  const col = new Float32Array(S * S * 3), hgt = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x, nn = n(x / S, y / S);
    col[i * 3] = 26 * (0.4 + nn); col[i * 3 + 1] = 36 * (0.4 + nn); col[i * 3 + 2] = 20 * (0.4 + nn * 0.9);
    hgt[i] = nn;
  }
  const leafCols = [[80, 54, 24], [56, 40, 20], [40, 62, 26], [96, 66, 28], [30, 46, 22]];
  for (let k = 0; k < 520; k++) {
    const lc = pick(leafCols), sh = rand(0.5, 1.1), rr = rand(2.5, 6);
    stamp(S, S, rand(S), rand(S), rr, rr * 0.4, rand(Math.PI), (i, r2) => {
      col[i * 3] = lc[0] * sh; col[i * 3 + 1] = lc[1] * sh; col[i * 3 + 2] = lc[2] * sh; hgt[i] += 0.3 * (1 - r2);
    }, true);
  }
  const [c, ctx] = mkCanvas(S, S), img = ctx.createImageData(S, S);
  for (let i = 0; i < S * S; i++) { img.data[i * 4] = col[i * 3]; img.data[i * 4 + 1] = col[i * 3 + 1]; img.data[i * 4 + 2] = col[i * 3 + 2]; img.data[i * 4 + 3] = 255; }
  ctx.putImageData(img, 0, 0);
  const map = toTex(c), norm = toTex(heightToNormal(hgt, S, S, 2.5, true), { srgb: false });
  for (const t of [map, norm]) t.repeat.set(33 / 7, CH / 7);
  return { map, norm };
}

function genBarkTexture() {
  const W = 256, H = 256;
  const n = fbm([2, 4, 8, 16], [0.4, 0.3, 0.2, 0.1], 6, 0.6);
  const n2 = fbm([4, 8], [0.6, 0.4]);
  const hgt = new Float32Array(W * H);
  const [c, ctx] = mkCanvas(W, H), img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, u = x / W, v = y / H;
    const s = n(u, v), m = n2(u, v);
    const groove = Math.pow(Math.abs(Math.sin((u * 14 + s * 1.6) * Math.PI)), 0.35);
    const val = 0.45 + groove * 0.4 + s * 0.3;
    hgt[i] = groove + s * 0.5;
    img.data[i * 4] = 120 * val * (0.9 + m * 0.2); img.data[i * 4 + 1] = 104 * val; img.data[i * 4 + 2] = 86 * val * (0.85 + m * 0.2); img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return { map: toTex(c), norm: toTex(heightToNormal(hgt, W, H, 3, true), { srgb: false }) };
}

function genRingTexture() {
  const S = 256, [c, ctx] = mkCanvas(S, S), img = ctx.createImageData(S, S);
  const n = fbm([4, 8], [0.6, 0.4]);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x / S - 0.5, dy = y / S - 0.5, r = Math.hypot(dx, dy) * 2;
    const a = Math.atan2(dy, dx);
    const ring = 0.5 + 0.5 * Math.sin((r + n((a / Math.PI + 1) * 0.5, r) * 0.08) * 70);
    let R = 168 - ring * 40 - r * 30, G = 128 - ring * 32 - r * 28, B = 86 - ring * 22 - r * 20;
    if (r > 0.9) { R = 70; G = 56; B = 44; }
    const i = (y * S + x) * 4;
    img.data[i] = R; img.data[i + 1] = G; img.data[i + 2] = B; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return toTex(c, { repeat: false });
}

function genLeafAtlas() {
  const [c, ctx] = mkCanvas(1024, 512);
  ctx.clearRect(0, 0, 1024, 512);
  // --- Sol: eğrelti yaprağı ---
  ctx.lineCap = 'round';
  const N = 22;
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 1; i < N; i++) {
      const t = i / N, y = 500 - t * 485, len = 215 * (1 - t * 0.88) * Math.min(1, t * 6);
      ctx.save();
      ctx.translate(256 + Math.sin(t * 3) * 6, y);
      ctx.rotate(side * (1.15 - t * 0.25));
      const g = ctx.createLinearGradient(0, 0, 0, -len);
      g.addColorStop(0, '#2c6a2a'); g.addColorStop(1, `rgb(${70 + rand(20)},${140 + rand(30)},${60 + rand(20)})`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(len * 0.16, -len * 0.5, 0, -len);
      ctx.quadraticCurveTo(-len * 0.16, -len * 0.5, 0, 0);
      ctx.fill();
      ctx.strokeStyle = 'rgba(160,220,140,.35)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -len * 0.9); ctx.stroke();
      ctx.restore();
    }
  }
  ctx.strokeStyle = '#3d6b2b'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(256, 512); ctx.quadraticCurveTo(262, 260, 256, 12); ctx.stroke();
  // --- Sağ: fil kulağı (büyük kalp) yaprak ---
  const cx = 768;
  ctx.strokeStyle = '#3f6e2c'; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(cx, 512); ctx.lineTo(cx, 330); ctx.stroke();
  const lg = ctx.createRadialGradient(cx, 260, 20, cx, 200, 260);
  lg.addColorStop(0, '#5aa646'); lg.addColorStop(0.6, '#2f7a33'); lg.addColorStop(1, '#1b4d22');
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.moveTo(cx, 335);
  ctx.bezierCurveTo(cx - 70, 360, cx - 245, 300, cx - 225, 150);
  ctx.bezierCurveTo(cx - 200, 40, cx - 60, 10, cx, 8);
  ctx.bezierCurveTo(cx + 60, 10, cx + 200, 40, cx + 225, 150);
  ctx.bezierCurveTo(cx + 245, 300, cx + 70, 360, cx, 335);
  ctx.fill();
  ctx.strokeStyle = 'rgba(190,240,160,.45)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(cx, 335); ctx.lineTo(cx, 20); ctx.stroke();
  ctx.lineWidth = 2.2;
  for (let i = 0; i < 7; i++) {
    const y = 300 - i * 42;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(cx, y);
      ctx.quadraticCurveTo(cx + s * 90, y - 30, cx + s * (190 - i * 18), y - 80 - i * 4);
      ctx.stroke();
    }
  }
  const t = toTex(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

function genGlowTexture() {
  const [c, ctx] = mkCanvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.2, 'rgba(255,255,255,.65)');
  g.addColorStop(0.5, 'rgba(255,255,255,.18)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  return toTex(c, { repeat: false });
}
function genBeamTexture() {
  const [c, ctx] = mkCanvas(64, 256);
  const img = ctx.createImageData(64, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 64; x++) {
    const u = x / 63 - 0.5, v = y / 255;
    const a = Math.exp(-u * u * 18) * Math.pow(Math.sin(v * Math.PI), 1.4) * (1 - v * 0.45);
    const i = (y * 64 + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = a * 255;
  }
  ctx.putImageData(img, 0, 0);
  return toTex(c, { repeat: false });
}
function genWaterNormal() {
  const S = 256, n = fbm([4, 8, 16], [0.5, 0.3, 0.2]);
  const h = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) h[y * S + x] = n(x / S, y / S);
  const t = toTex(heightToNormal(h, S, S, 6, true), { srgb: false });
  t.repeat.set(3, 1);
  return t;
}
function emojiTexture(txt, bg) {
  const [c, ctx] = mkCanvas(128, 128);
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(64, 64, 58, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.stroke();
  ctx.font = 'bold 64px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
  ctx.fillText(txt, 64, 70);
  return toTex(c, { repeat: false });
}

// ---------------------------------------------------------------------
//  Malzemeler (yükleme sırasında oluşturulur)
// ---------------------------------------------------------------------
const timeU = { value: 0 };
const MAT = {};
const TEX = {};

function addWind(mat, amp = 0.06) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = timeU;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float wk = clamp(transformed.y - 0.15, 0.0, 2.2);
      float sw = sin(uTime * 1.7 + transformed.x * 0.45 + transformed.z * 0.31) * ${amp.toFixed(3)} + sin(uTime * 3.3 + transformed.z * 1.7 + transformed.x) * 0.018;
      transformed.x += sw * wk; transformed.z += sw * 0.6 * wk;`);
  };
}

function buildMaterials() {
  TEX.path = genPathTextures();
  TEX.floor = genFloorTexture();
  TEX.bark = genBarkTexture();
  TEX.ring = genRingTexture();
  TEX.leaf = genLeafAtlas();
  TEX.glow = genGlowTexture();
  TEX.beam = genBeamTexture();
  TEX.water = genWaterNormal();

  MAT.path = new THREE.MeshStandardMaterial({ map: TEX.path.map, normalMap: TEX.path.norm, roughnessMap: TEX.path.rough, roughness: 1, metalness: 0.05, normalScale: new THREE.Vector2(1.3, 1.3), envMapIntensity: 1.3 });
  MAT.floor = new THREE.MeshStandardMaterial({ map: TEX.floor.map, normalMap: TEX.floor.norm, roughness: 0.92, envMapIntensity: 0.4 });
  MAT.bark = new THREE.MeshStandardMaterial({ map: TEX.bark.map, normalMap: TEX.bark.norm, vertexColors: true, roughness: 0.88, envMapIntensity: 0.5 });
  MAT.plain = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, flatShading: true, envMapIntensity: 0.6 });
  MAT.leaf = new THREE.MeshStandardMaterial({ map: TEX.leaf, vertexColors: true, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.55, envMapIntensity: 0.9 });
  addWind(MAT.leaf);
  MAT.glow = new THREE.MeshBasicMaterial({ vertexColors: true });
  MAT.beam = new THREE.MeshBasicMaterial({ map: TEX.beam, color: 0x8fb6ff, transparent: true, opacity: 0.055, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  MAT.ring = new THREE.MeshStandardMaterial({ map: TEX.ring, color: 0xb0a090, roughness: 0.9 });
  MAT.moss = new THREE.MeshStandardMaterial({ color: 0x2c4f22, map: TEX.bark.map, normalMap: TEX.bark.norm, roughness: 0.95, envMapIntensity: 0.4 });
  MAT.trunkBark = new THREE.MeshStandardMaterial({ map: TEX.bark.map, normalMap: TEX.bark.norm, color: 0x9a8670, roughness: 0.85, envMapIntensity: 0.6 });
  MAT.water = new THREE.MeshStandardMaterial({ color: 0x0c2a33, roughness: 0.05, metalness: 0.2, normalMap: TEX.water, normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: 2.2, emissive: 0x03181c });
  MAT.mud = new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.4, envMapIntensity: 1.2 });
}

// ---------------------------------------------------------------------
//  Geometri yardımcıları (birleştirilmiş, vertex renkli parçalar)
// ---------------------------------------------------------------------
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
function mtx(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  return new THREE.Matrix4().compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
}
const _c = new THREE.Color();
function bake(geo, m, color, fn = null, vary = 0.1) {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  g.applyMatrix4(m);
  const p = g.attributes.position, nrm = g.attributes.normal, n = p.count, a = new Float32Array(n * 3);
  const base = new THREE.Color(color);
  const f0 = 1 + (Math.random() - 0.5) * vary * 2;
  for (let i = 0; i < n; i++) {
    _c.copy(base);
    if (fn) fn(p.getX(i), p.getY(i), p.getZ(i), nrm.getX(i), nrm.getY(i), nrm.getZ(i), _c);
    a[i * 3] = _c.r * f0; a[i * 3 + 1] = _c.g * f0; a[i * 3 + 2] = _c.b * f0;
  }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
function blobGeo(r, detail, amt) {
  const g = new THREE.IcosahedronGeometry(r, detail);
  const p = g.attributes.position, seed = Math.random() * 100;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + (hsh(Math.round(x * 1000) + seed, Math.round(y * 1000), Math.round(z * 1000)) - 0.5) * amt;
    p.setXYZ(i, x * k, y * k, z * k);
  }
  g.computeVertexNormals();
  return g;
}
function frondGeo(len, width, a0, bend, right = false, seg = 5) {
  const g = new THREE.PlaneGeometry(width, len, 1, seg);
  const pos = g.attributes.position, uv = g.attributes.uv;
  const pts = []; let y = 0, z = 0;
  for (let i = 0; i <= seg; i++) { pts.push([y, z]); const th = a0 + bend * (i / seg); y += Math.cos(th) * len / seg; z += Math.sin(th) * len / seg; }
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) + len / 2) / len, idx = Math.round(t * seg);
    pos.setXYZ(i, pos.getX(i) * (1 - t * 0.25), pts[idx][0], pts[idx][1]);
    uv.setX(i, uv.getX(i) * 0.5 + (right ? 0.5 : 0));
  }
  g.computeVertexNormals();
  return g;
}
// Paylaşılan temel geometriler
const GEO = {};
function buildBaseGeos() {
  GEO.cyl = new THREE.CylinderGeometry(0.75, 1, 1, 10, 1, true);
  GEO.cylSolid = new THREE.CylinderGeometry(1, 1, 1, 8);
  GEO.thin = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true);
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(1, 0); sh.quadraticCurveTo(0.25, 0.25, 0, 1); sh.lineTo(0, 0);
  GEO.fin = new THREE.ExtrudeGeometry(sh, { depth: 0.16, bevelEnabled: false, curveSegments: 3 });
  GEO.fin.translate(0, 0, -0.08);
  GEO.cap = new THREE.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2);
  GEO.ico = new THREE.IcosahedronGeometry(1, 1);
}

const leafTint = () => new THREE.Color().setHSL(rand(0.22, 0.32), rand(0.3, 0.55), rand(0.62, 0.85));
const GLOW_COLS = [new THREE.Color(0.3, 2.6, 2.2), new THREE.Color(0.5, 1.4, 3.2), new THREE.Color(1.8, 0.6, 3.0), new THREE.Color(0.8, 3.0, 1.0)];

function addTree(G, x, z, r, h) {
  const moss = new THREE.Color(0x4a7038), bark = new THREE.Color(0x857463), tmp = new THREE.Color();
  const colFn = (px, py, pz, nx, ny, nz, c) => { tmp.copy(moss).lerp(bark, smooth(0.2, 4 + hsh(px, 0, pz) * 3, py)); c.copy(tmp).multiplyScalar(0.8 + hsh(px, py, pz) * 0.35); };
  G.bark.push(bake(GEO.cyl, mtx(x, h / 2, z, rand(-0.03, 0.03), rand(6), rand(-0.03, 0.03), r, h, r), 0xffffff, colFn));
  // destek kökleri
  const nf = randi(4, 6), a0 = rand(6);
  for (let i = 0; i < nf; i++) {
    const a = a0 + (i / nf) * Math.PI * 2 + rand(-0.3, 0.3);
    const L = r * rand(1.6, 2.8), H = r * rand(2.2, 4.2);
    const m = new THREE.Matrix4().makeTranslation(x + Math.cos(a) * r * 0.55, 0, z - Math.sin(a) * r * 0.55)
      .multiply(new THREE.Matrix4().makeRotationY(a)).multiply(new THREE.Matrix4().makeScale(L, H, r * 0.9));
    G.bark.push(bake(GEO.fin, m, 0xffffff, colFn));
  }
  // taç
  const nc = randi(2, 4);
  for (let i = 0; i < nc; i++) {
    const s = rand(2.5, 4.5);
    const cx = x + rand(-3, 3), cy = h - rand(3, 7), cz = z + rand(-3, 3);
    if (Math.abs(x) < 13) addLeafCluster(G, cx, cy - s * 0.4, cz, s * 0.45);
    G.plain.push(bake(blobGeo(1, 1, 0.45), mtx(cx, cy, cz, 0, rand(6), 0, s, s * 0.6, s), 0x2a5634, (px, py, pz, nx, ny, nz, c) => {
      if (ny < 0) c.setHex(0x14301e); c.multiplyScalar(0.8 + hsh(px, py, pz) * 0.4);
    }));
  }
}
function addFern(G, x, z, s) {
  const n = randi(6, 9), tint = leafTint();
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + rand(-0.3, 0.3), len = rand(1.1, 1.7) * s;
    G.leaf.push(bake(frondGeo(len, len * 0.5, rand(0.3, 0.75), rand(0.7, 1.2)), mtx(x, 0.02, z, 0, ang, 0), tint));
  }
}
function addBigLeaf(G, x, z, s) {
  const n = randi(3, 5), tint = leafTint().offsetHSL(0, 0, 0.05);
  for (let i = 0; i < n; i++) {
    const ang = rand(6.28), len = rand(1.4, 2.2) * s;
    G.leaf.push(bake(frondGeo(len, len * 0.62, rand(0.15, 0.45), rand(0.6, 1.1), true), mtx(x, 0, z, 0, ang, 0), tint));
  }
}
function addBush(G, x, z, s) {
  for (let i = 0; i < randi(2, 3); i++) {
    G.plain.push(bake(blobGeo(1, 1, 0.5), mtx(x + rand(-0.6, 0.6) * s, s * 0.45, z + rand(-0.6, 0.6) * s, 0, rand(6), 0, s * rand(0.6, 1), s * rand(0.45, 0.7), s * rand(0.6, 1)), 0x2b5a30, (px, py, pz, nx, ny, nz, c) => {
      c.multiplyScalar(0.6 + ny * 0.3 + hsh(px, py, pz) * 0.4);
    }));
  }
}
function addRock(G, x, z, s) {
  G.plain.push(bake(blobGeo(1, 1, 0.5), mtx(x, s * 0.3, z, rand(6), rand(6), 0, s * rand(1, 1.5), s * rand(0.6, 0.9), s), 0x55585a, (px, py, pz, nx, ny, nz, c) => {
    if (ny > 0.35 + hsh(px, py, pz) * 0.3) c.setHex(0x3e6a2c);
    c.multiplyScalar(0.65 + hsh(px, py, pz) * 0.45);
  }));
}
function addMushrooms(G, x, z, s = 1) {
  const gc = pick(GLOW_COLS);
  for (let i = 0; i < randi(3, 7); i++) {
    const mx = x + rand(-0.45, 0.45), mz = z + rand(-0.45, 0.45), h = rand(0.08, 0.28) * s, r = rand(0.05, 0.13) * s;
    G.plain.push(bake(GEO.thin, mtx(mx, h / 2, mz, 0, 0, 0, r * 0.25, h, r * 0.25), 0xd8d2c0));
    G.glow.push(bake(GEO.cap, mtx(mx, h, mz, 0, 0, 0, r, r * 0.55, r), 0xffffff, (px, py, pz, nx, ny, nz, c) => c.copy(gc).multiplyScalar(0.7 + ny * 0.4)));
  }
}
function addVine(G, x, z, top = rand(10, 14)) {
  const L = rand(4, 10), th = rand(0.025, 0.05);
  G.plain.push(bake(GEO.thin, mtx(x, top - L / 2, z, rand(-0.05, 0.05), 0, rand(-0.05, 0.05), th, L, th), 0x2e4a22));
  for (let k = 0; k < randi(2, 5); k++) {
    const y = top - rand(0.5, L);
    G.leaf.push(bake(frondGeo(0.45, 0.32, 1.2, 0.8, true, 2), mtx(x, y, z, 0, rand(6.28), 0), leafTint()));
  }
}
function addGlowMoss(G, x, z) {
  // yerde parlayan biyolüminesan yosun lekeleri
  const gc = GLOW_COLS[0];
  for (let i = 0; i < randi(5, 10); i++) {
    G.glow.push(bake(GEO.ico, mtx(x + rand(-0.7, 0.7), 0.01, z + rand(-0.7, 0.7), 0, 0, 0, rand(0.03, 0.06)), 0xffffff, (px, py, pz, nx, ny, nz, c) => c.copy(gc).multiplyScalar(0.6)));
  }
}

function addLeafCluster(G, x, y, z, s = 1) {
  // aşağı sarkan büyük yaprak kümesi (orman tavanı)
  const n = randi(9, 14);
  for (let i = 0; i < n; i++) {
    const right = Math.random() < 0.6, len = rand(1.8, 3.2) * s;
    G.leaf.push(bake(frondGeo(len, len * (right ? 0.62 : 0.5), rand(1.5, 2.3), rand(0.4, 0.9), right), mtx(x + rand(-0.6, 0.6) * s, y + rand(-0.4, 0.4), z + rand(-0.6, 0.6) * s, 0, rand(6.28), 0), leafTint().multiplyScalar(0.8)));
  }
}

// Sahne parçası (chunk)
function buildChunk() {
  const G = { bark: [], plain: [], leaf: [], glow: [] };
  for (const side of [-1, 1]) {
    let z = rand(0, 5);
    while (z < CH) { addTree(G, side * rand(7.5, 19), -z, rand(0.6, 1.35), rand(18, 26)); z += rand(7, 12); }
    for (let k = 0; k < 5; k++) addTree(G, side * rand(21, 38), -rand(CH), rand(0.8, 1.6), rand(20, 28));
    z = rand(0, 2);
    while (z < CH) { addFern(G, side * rand(4.7, 9.5), -z, rand(0.75, 1.35)); z += rand(1.6, 3.2); }
    for (let k = 0; k < 6; k++) addFern(G, side * rand(9, 18), -rand(CH), rand(1, 1.6));
    for (let k = 0; k < 4; k++) addBigLeaf(G, side * rand(5.4, 12), -rand(CH), rand(0.85, 1.5));
    for (let k = 0; k < 5; k++) addBush(G, side * rand(7, 17), -rand(CH), rand(0.8, 1.8));
    for (let k = 0; k < 3; k++) addRock(G, side * rand(5.2, 14), -rand(CH), rand(0.35, 1.1));
    for (let k = 0; k < randi(2, 4); k++) addMushrooms(G, side * rand(4.7, 8), -rand(CH));
    for (let k = 0; k < 2; k++) addGlowMoss(G, side * rand(4.8, 9), -rand(CH));
    for (let k = 0; k < 7; k++) addVine(G, side * rand(3.9, 13), -rand(CH));
    for (let k = 0; k < 3; k++) addLeafCluster(G, side * rand(3.5, 8), rand(8, 11.5), -rand(CH), rand(0.9, 1.4));
  }
  const grp = new THREE.Group();
  const add = (arr, mat, cast = false) => {
    if (!arr.length) return;
    const m = new THREE.Mesh(mergeGeometries(arr), mat);
    m.castShadow = cast; m.receiveShadow = false; m.matrixAutoUpdate = false; m.updateMatrix();
    grp.add(m);
    arr.forEach((g) => g.dispose());
  };
  add(G.bark, MAT.bark, quality === 'high');
  add(G.plain, MAT.plain);
  add(G.leaf, MAT.leaf);
  add(G.glow, MAT.glow);
  // zemin
  const path = new THREE.Mesh(new THREE.PlaneGeometry(14, CH).rotateX(-Math.PI / 2).translate(0, 0, -CH / 2), MAT.path);
  path.receiveShadow = true; grp.add(path);
  for (const s of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(33, CH).rotateX(-Math.PI / 2).translate(s * 23.5, -0.01, -CH / 2), MAT.floor);
    f.receiveShadow = true; grp.add(f);
  }
  // ay ışığı huzmeleri
  for (let k = 0; k < randi(1, 2); k++) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(rand(2.5, 4.5), 16), MAT.beam);
    b.position.set(rand(-9, 9), 7, -rand(CH)); b.rotation.z = rand(0.25, 0.45); b.renderOrder = 2;
    grp.add(b);
  }
  return grp;
}

// ---------------------------------------------------------------------
//  Oyuncu modeli (kaşif — kafa lambası ile)
// ---------------------------------------------------------------------
function stdMat(color, opts = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...opts }); }
function cap(r, len, mat) { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), mat); m.castShadow = true; return m; }
function buildPlayer() {
  const M = {
    skin: stdMat(0xc68a64, { roughness: 0.6 }), shirt: stdMat(0x6f7f45, { roughness: 0.85 }), shirt2: stdMat(0x5d6b3a),
    pants: stdMat(0x3a3127, { roughness: 0.9 }), boot: stdMat(0x2a1d13, { roughness: 0.6 }), pack: stdMat(0xd2601c, { roughness: 0.75 }),
    hat: stdMat(0x8c6a3c, { roughness: 0.9 }), band: stdMat(0xb8302a), hair: stdMat(0x2a1a10), dark: stdMat(0x111111),
    lamp: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2c0, emissiveIntensity: 4 }), roll: stdMat(0x2d5a8a),
  };
  const root = new THREE.Group();
  const body = new THREE.Group(); body.position.y = 0.55; root.add(body);
  const hips = new THREE.Group(); hips.position.y = 0.4; body.add(hips);
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.22), M.pants); pelvis.castShadow = true; hips.add(pelvis);
  const spine = new THREE.Group(); spine.position.y = 0.06; hips.add(spine);
  const torso = cap(0.19, 0.3, M.shirt); torso.position.y = 0.3; torso.scale.set(1.12, 1, 0.78); spine.add(torso);
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 14), M.boot); belt.position.y = 0.06; belt.scale.z = 0.8; spine.add(belt);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.18), M.pack); pack.position.set(0, 0.34, 0.2); pack.castShadow = true; spine.add(pack);
  const bedroll = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.4, 10), M.roll); bedroll.rotation.z = Math.PI / 2; bedroll.position.set(0, 0.6, 0.2); spine.add(bedroll);
  const strap1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.02), M.boot); strap1.position.set(0.1, 0.34, -0.14); spine.add(strap1);
  const strap2 = strap1.clone(); strap2.position.x = -0.1; spine.add(strap2);
  const neck = new THREE.Group(); neck.position.y = 0.6; spine.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.135, 16, 12), M.skin); head.position.y = 0.1; head.castShadow = true; neck.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), M.hair); hair.position.y = 0.11; hair.rotation.x = 0.35; neck.add(hair);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.04, 16), M.band); band.position.y = 0.13; neck.add(band);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.025, 20), M.hat); brim.position.y = 0.19; brim.castShadow = true; neck.add(brim);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.145, 0.12, 16), M.hat); crown.position.y = 0.26; neck.add(crown);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.05, 12), M.lamp); lamp.rotation.x = Math.PI / 2; lamp.position.set(0, 0.15, -0.15); neck.add(lamp);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), M.dark); e.position.set(s * 0.05, 0.11, -0.125); neck.add(e); }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), M.skin); nose.position.set(0, 0.08, -0.135); neck.add(nose);
  // kollar
  const arms = [], legs = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.25, 0.5, 0); spine.add(sh);
    const ua = cap(0.065, 0.18, M.shirt2); ua.position.y = -0.14; sh.add(ua);
    const el = new THREE.Group(); el.position.y = -0.29; sh.add(el);
    const fa = cap(0.055, 0.17, M.skin); fa.position.y = -0.12; el.add(fa);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.058, 8, 8), M.skin); hand.position.y = -0.26; el.add(hand);
    arms.push({ sh, el });
    const hp = new THREE.Group(); hp.position.set(s * 0.1, -0.05, 0); hips.add(hp);
    const th = cap(0.085, 0.26, M.pants); th.position.y = -0.21; hp.add(th);
    const kn = new THREE.Group(); kn.position.y = -0.44; hp.add(kn);
    const sn = cap(0.075, 0.26, M.pants); sn.position.y = -0.19; kn.add(sn);
    const bt = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.12, 0.26), M.boot); bt.position.set(0, -0.42, -0.04); bt.castShadow = true; kn.add(bt);
    legs.push({ hp, kn });
  }
  // kafa lambası
  const spot = new THREE.SpotLight(0xffe6b8, 30, 40, 0.5, 0.7, 1.4);
  spot.position.set(0, 0.16, -0.18); neck.add(spot);
  const tgt = new THREE.Object3D(); tgt.position.set(0, -1.2, -8); neck.add(tgt); spot.target = tgt;
  const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: 0xfff0c0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.9 }));
  lampGlow.scale.set(0.5, 0.5, 0.5); lampGlow.position.set(0, 0.15, -0.2); neck.add(lampGlow);
  scene.add(root);
  return { root, body, hips, spine, neck, arms, legs, spot, glow: lampGlow };
}

// ---------------------------------------------------------------------
//  Ayı modeli
// ---------------------------------------------------------------------
function buildBear() {
  const fur = stdMat(0x38231a, { roughness: 0.85 }), fur2 = stdMat(0x4c3122, { roughness: 0.85 }), muz = stdMat(0x6a4e36, { roughness: 0.9 });
  const black = stdMat(0x0a0806, { roughness: 0.3 }), claw = stdMat(0xdcd2bc, { roughness: 0.4 });
  const eye = new THREE.MeshStandardMaterial({ color: 0x331100, emissive: 0xff8a1a, emissiveIntensity: 3.5 });
  const mouthM = stdMat(0x5a0c0c, { roughness: 0.6 }), tooth = stdMat(0xf2ecd8, { roughness: 0.3 });
  const sp = (r, mat, x, y, z, sx = 1, sy = 1, sz = 1, parent) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; parent.add(m); return m; };
  const root = new THREE.Group();
  const body = new THREE.Group(); body.position.set(0, 0, 0.55); root.add(body); // dönme ekseni arka bacaklarda
  const tb = new THREE.Group(); tb.position.set(0, 0, -0.55); body.add(tb);
  sp(0.7, fur, 0, 1.08, 0, 0.88, 0.82, 1.35, tb);
  sp(0.48, fur2, 0, 1.48, -0.38, 1, 0.8, 1.1, tb);
  sp(0.58, fur, 0, 1.05, 0.58, 0.95, 0.9, 0.9, tb);
  const head = new THREE.Group(); head.position.set(0, 1.42, -1.08); tb.add(head);
  sp(0.36, fur2, 0, 0, 0, 1, 0.9, 1.1, head);
  sp(0.21, muz, 0, -0.08, -0.33, 0.85, 0.7, 1.15, head);
  sp(0.075, black, 0, -0.02, -0.56, 1.2, 0.8, 1, head);
  for (const s of [-1, 1]) { sp(0.11, fur, s * 0.23, 0.27, 0.05, 1, 1, 0.6, head); sp(0.045, eye, s * 0.15, 0.09, -0.28, 1, 1, 1, head); }
  const jaw = new THREE.Group(); jaw.position.set(0, -0.15, -0.2); head.add(jaw);
  sp(0.17, muz, 0, -0.03, -0.17, 0.85, 0.45, 1.1, jaw);
  const mouth = sp(0.14, mouthM, 0, 0.02, -0.17, 0.8, 0.3, 1.05, jaw);
  for (const s of [-1, 1]) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 6), tooth); t.position.set(s * 0.08, 0.06, -0.28); jaw.add(t); }
  const legs = [];
  for (const [lx, lz, front] of [[-0.4, -0.62, 1], [0.4, -0.62, 1], [-0.4, 0.68, 0], [0.4, 0.68, 0]]) {
    const g = new THREE.Group(); g.position.set(lx, 1.0, lz); tb.add(g);
    const up = cap(0.18, 0.5, front ? fur2 : fur); up.position.y = -0.35; g.add(up);
    const paw = sp(0.2, fur, 0, -0.82, -0.05, 1, 0.55, 1.3, g);
    for (let k = -1; k <= 1; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.1, 5), claw); c.rotation.x = -Math.PI / 2; c.position.set(k * 0.07, -0.86, -0.3); g.add(c); }
    legs.push({ g, front, side: lx > 0 ? 1 : -1 });
  }
  root.scale.setScalar(0.95);
  root.visible = false;
  scene.add(root);
  return { root, body, head, jaw, legs, mouth };
}

// ---------------------------------------------------------------------
//  Engel şablonları
// ---------------------------------------------------------------------
function shadowAll(o) { o.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } }); return o; }
function glowMushroomMesh(n = 5, spread = 0.3, s = 1) {
  const G = { plain: [], glow: [] };
  const gc = pick(GLOW_COLS);
  for (let i = 0; i < n; i++) {
    const mx = rand(-spread, spread), mz = rand(-spread, spread), h = rand(0.06, 0.2) * s, r = rand(0.05, 0.11) * s;
    G.plain.push(bake(GEO.thin, mtx(mx, h / 2, mz, 0, 0, 0, r * 0.25, h, r * 0.25), 0xd8d2c0));
    G.glow.push(bake(GEO.cap, mtx(mx, h, mz, 0, 0, 0, r, r * 0.55, r), 0xffffff, (px, py, pz, nx, ny, nz, c) => c.copy(gc).multiplyScalar(0.7 + ny * 0.4)));
  }
  const g = new THREE.Group();
  g.add(new THREE.Mesh(mergeGeometries(G.plain), MAT.plain), new THREE.Mesh(mergeGeometries(G.glow), MAT.glow));
  return g;
}
function hangingVines(width, y, n) {
  const G = { plain: [], leaf: [] };
  for (let i = 0; i < n; i++) {
    const x = rand(-width / 2, width / 2), L = rand(0.25, 0.6);
    G.plain.push(bake(GEO.thin, mtx(x, y - L / 2, rand(-0.15, 0.15), 0, 0, 0, 0.02, L, 0.02), 0x3a5e28));
    G.leaf.push(bake(frondGeo(0.32, 0.26, 3.0, 0.3, true, 2), mtx(x, y - L + 0.05, 0, 0, rand(6.28), 0), leafTint()));
  }
  const g = new THREE.Group();
  g.add(new THREE.Mesh(mergeGeometries(G.plain), MAT.plain));
  const lm = new THREE.Mesh(mergeGeometries(G.leaf), MAT.leaf); g.add(lm);
  return g;
}
const TPL = {};
function buildTemplates() {
  // Alçak kütük (zıpla)
  const mkLog = (len, r) => {
    const g = new THREE.Group();
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, len, 16, 1, true), MAT.trunkBark); c.rotation.z = Math.PI / 2; c.position.y = r; g.add(c);
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.CircleGeometry(r, 16), MAT.ring); e.rotation.y = s * Math.PI / 2; e.position.set(s * len / 2, r, 0); g.add(e); }
    const moss = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.04, r * 1.08, len * 0.85, 14, 1, true, Math.PI / 2 - 0.9, 1.8), MAT.moss); moss.rotation.z = Math.PI / 2; moss.position.y = r; g.add(moss);
    const mu = glowMushroomMesh(5, 0.25); mu.position.set(rand(-len / 3, len / 3), r * 1.85, 0); g.add(mu);
    shadowAll(g); return g;
  };
  TPL.log = () => mkLog(1.95, 0.42);
  TPL.fullLog = () => {
    const g = mkLog(8.0, 0.46);
    for (const s of [-1, 1]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, 1.6, 7), MAT.trunkBark);
      b.position.set(s * rand(1.5, 3), 1.0, rand(-0.3, 0.3)); b.rotation.set(rand(-0.5, 0.5), 0, s * 0.6); g.add(b);
    }
    return shadowAll(g);
  };
  // Yüksek dal (kay)
  TPL.branch = () => {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 2.5, 12), MAT.trunkBark); b.rotation.z = Math.PI / 2; b.position.y = 1.78; g.add(b);
    const moss = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.34, 2.2, 12, 1, true, Math.PI / 2 - 0.9, 1.8), MAT.moss); moss.rotation.z = Math.PI / 2; moss.position.y = 1.8; g.add(moss);
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 2.0, 8), MAT.trunkBark); p.position.set(s * 1.12, 1.0, 0); p.rotation.z = s * 0.06; g.add(p);
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.7, 6), MAT.trunkBark); f.position.set(s * 1.3, 2.05, 0); f.rotation.z = -s * 0.6; g.add(f);
    }
    g.add(hangingVines(2.2, 1.6, 9));
    const mu = glowMushroomMesh(4, 0.15, 0.8); mu.position.set(rand(-0.6, 0.6), 2.08, 0); g.add(mu);
    return shadowAll(g);
  };
  TPL.fullBranch = () => {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 10.5, 14), MAT.trunkBark); b.rotation.z = Math.PI / 2 + 0.04; b.position.y = 1.9; g.add(b);
    const moss = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.54, 9.5, 14, 1, true, Math.PI / 2 - 1, 2), MAT.moss); moss.rotation.z = Math.PI / 2 + 0.04; moss.position.y = 1.92; g.add(moss);
    for (const s of [-1, 1]) {
      const rock = new THREE.Mesh(blobGeo(1, 1, 0.4), MAT.plain.clone()); rock.material.vertexColors = false; rock.material.color.setHex(0x4a4f4c);
      rock.scale.set(1.1, 1.3, 1.0); rock.position.set(s * 4.6, 0.9, 0); g.add(rock);
    }
    g.add(hangingVines(7.4, 1.55, 22));
    const mu = glowMushroomMesh(6, 0.3, 0.9); mu.position.set(rand(-2, 2), 2.35, 0); g.add(mu);
    return shadowAll(g);
  };
  // Kaya / kütük (şerit değiştir)
  TPL.rock = () => {
    const g = new THREE.Group();
    const geo = bake(blobGeo(1, 2, 0.35), mtx(0, 0, 0), 0x5b5f5e, (px, py, pz, nx, ny, nz, c) => {
      if (ny > 0.3 + hsh(px, py, pz) * 0.35) c.setHex(0x3f6e2c);
      c.multiplyScalar(0.65 + hsh(px, py, pz) * 0.4);
    });
    const m = new THREE.Mesh(geo, MAT.plain); m.scale.set(1.0, 1.12, 0.92); m.position.y = 1.05; g.add(m);
    const s2 = new THREE.Mesh(blobGeo(0.4, 1, 0.4), MAT.plain); s2.position.set(0.8, 0.25, 0.4); g.add(s2);
    const mu = glowMushroomMesh(6, 0.3); mu.position.set(-0.7, 0, 0.6); g.add(mu);
    return shadowAll(g);
  };
  TPL.stump = () => {
    const g = new THREE.Group();
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.08, 2.2, 14), MAT.trunkBark); c.position.y = 1.1; g.add(c);
    const top = new THREE.Mesh(new THREE.CircleGeometry(0.92, 14), MAT.ring); top.rotation.x = -Math.PI / 2; top.position.y = 2.201; g.add(top);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + rand(0.3);
      const f = new THREE.Mesh(GEO.fin, MAT.trunkBark); f.scale.set(0.8, 1.1, 1.2); f.position.set(Math.cos(a) * 0.85, 0, -Math.sin(a) * 0.85); f.rotation.y = a; g.add(f);
    }
    const mu = glowMushroomMesh(6, 0.35); mu.position.set(0.6, 0, 0.8); g.add(mu);
    const mu2 = glowMushroomMesh(4, 0.2, 0.8); mu2.position.set(-0.3, 2.2, 0.2); g.add(mu2);
    return shadowAll(g);
  };
  // Dere (zıpla)
  TPL.creek = () => {
    const g = new THREE.Group();
    const w = new THREE.Mesh(new THREE.PlaneGeometry(13, 3.4, 1, 1), MAT.water); w.rotation.x = -Math.PI / 2; w.position.y = 0.03; w.receiveShadow = true; g.add(w);
    for (const s of [-1, 1]) {
      const bank = new THREE.Mesh(new THREE.PlaneGeometry(13, 0.7), MAT.mud); bank.rotation.x = -Math.PI / 2; bank.position.set(0, 0.025, s * 1.9); g.add(bank);
      for (let k = 0; k < 3; k++) {
        const r = new THREE.Mesh(blobGeo(rand(0.3, 0.6), 1, 0.4), MAT.plain); r.position.set(s * rand(4.2, 6.2), 0.15, rand(-1.8, 1.8)); r.castShadow = true; g.add(r);
      }
      const mu = glowMushroomMesh(5, 0.3); mu.position.set(s * 4.6, 0, rand(-1.5, 1.5)); g.add(mu);
    }
    return g;
  };
}
function buildTrunk(L, ramp) {
  const g = new THREE.Group();
  const r = TRUNK_TOP / 2;
  const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.04, L, 18, 1, true), MAT.trunkBark);
  c.rotation.x = Math.PI / 2; c.position.set(0, r, -L / 2); g.add(c);
  c.material = MAT.trunkBark;
  for (const z of [0, -L]) { const e = new THREE.Mesh(new THREE.CircleGeometry(r, 18), MAT.ring); e.position.set(0, r, z); if (z < 0) e.rotation.y = Math.PI; g.add(e); }
  const moss = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.03, r * 1.06, L * 0.92, 16, 1, true, -0.75, 1.5), MAT.moss);
  moss.rotation.set(-Math.PI / 2, 0, 0); moss.position.set(0, r, -L / 2); g.add(moss);
  // yan dallar
  for (let k = 0; k < Math.floor(L / 6); k++) {
    const s = Math.random() < 0.5 ? -1 : 1;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.14, 1.2, 6), MAT.trunkBark);
    b.position.set(s * (r + 0.2), r + rand(-0.3, 0.3), -rand(1, L - 1)); b.rotation.z = -s * 1.1; g.add(b);
  }
  const mu = glowMushroomMesh(6, 0.3); mu.position.set(rand(-0.3, 0.3) + (Math.random() < 0.5 ? -1.0 : 1.0), 0.1, -rand(1, L - 1)); g.add(mu);
  if (ramp) {
    const len = Math.hypot(RAMP_LEN, TRUNK_TOP), ang = Math.atan2(TRUNK_TOP, RAMP_LEN), th = 0.28;
    const rp = new THREE.Mesh(new THREE.BoxGeometry(1.7, th, len), MAT.trunkBark);
    rp.rotation.x = ang;
    rp.position.set(0, TRUNK_TOP / 2 - Math.cos(ang) * th / 2, RAMP_LEN / 2 - Math.sin(ang) * th / 2);
    g.add(rp);
    const rm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.03, len * 0.9), MAT.moss);
    rm.rotation.x = ang; rm.position.set(0, TRUNK_TOP / 2 + 0.01, RAMP_LEN / 2); g.add(rm);
    for (const s of [-1, 1]) {
      const sup = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 1.2, 6), MAT.trunkBark); sup.position.set(s * 0.6, 0.55, 2.0); g.add(sup);
    }
  }
  return shadowAll(g);
}

// ---------------------------------------------------------------------
//  Parçacıklar: yağmur, ateşböcekleri, sıçramalar
// ---------------------------------------------------------------------
const RAIN_MAX = 2200;
let rain, rainPos, rainCount = 1300;
function buildRain() {
  const g = new THREE.BufferGeometry();
  rainPos = new Float32Array(RAIN_MAX * 6);
  for (let i = 0; i < RAIN_MAX; i++) resetDrop(i, true, 0, 0);
  g.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  rain = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x9cc2d4, transparent: true, opacity: 0.17, depthWrite: false }));
  rain.frustumCulled = false;
  scene.add(rain);
}
function resetDrop(i, init, cx, cz) {
  const x = cx + rand(-14, 14), y = init ? rand(0, 16) : rand(14, 17), z = cz + rand(-48, 4);
  const o = i * 6;
  rainPos[o] = x; rainPos[o + 1] = y; rainPos[o + 2] = z;
  rainPos[o + 3] = x + 0.08; rainPos[o + 4] = y + 0.7; rainPos[o + 5] = z + 0.05;
}
function updateRain(dt, cx, cz) {
  const vy = 24 * dt, vx = -2.2 * dt;
  for (let i = 0; i < rainCount; i++) {
    const o = i * 6;
    rainPos[o + 1] -= vy; rainPos[o + 4] -= vy; rainPos[o] += vx; rainPos[o + 3] += vx;
    if (rainPos[o + 1] < 0 || rainPos[o + 2] > cz + 5 || Math.abs(rainPos[o] - cx) > 15) resetDrop(i, rainPos[o + 2] > cz + 5, cx, cz);
  }
  rain.geometry.attributes.position.needsUpdate = true;
  rain.geometry.setDrawRange(0, rainCount * 2);
}

let flies, flyData;
const FLY_N = 140;
function buildFireflies() {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(FLY_N * 3), ph = new Float32Array(FLY_N);
  flyData = [];
  for (let i = 0; i < FLY_N; i++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const d = { x: side * rand(3.5, 16), y: rand(0.4, 5), z: rand(-90, 8), ph: rand(6.28), sp: rand(0.3, 0.9) };
    flyData.push(d); ph[i] = Math.random();
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: timeU, uPR: { value: renderer.getPixelRatio() }, uColor: { value: new THREE.Color(1.6, 2.6, 0.9) } },
    vertexShader: `attribute float aPhase; uniform float uTime; uniform float uPR; varying float vA;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv;
        float b = 0.5 + 0.5 * sin(uTime * (1.5 + aPhase) + aPhase * 6.28); vA = b * b;
        gl_PointSize = uPR * 46.0 * (0.55 + b * 0.45) / -mv.z; }`,
    fragmentShader: `uniform vec3 uColor; varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); a *= a;
        gl_FragColor = vec4(uColor * a * vA, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  flies = new THREE.Points(g, mat);
  flies.frustumCulled = false;
  scene.add(flies);
}
function updateFireflies(dt, t, pz) {
  const pos = flies.geometry.attributes.position.array;
  for (let i = 0; i < FLY_N; i++) {
    const d = flyData[i];
    if (d.z > pz + 8) { d.z -= rand(90, 100); d.x = (Math.random() < 0.5 ? -1 : 1) * rand(3.5, 16); }
    pos[i * 3] = d.x + Math.sin(t * d.sp + d.ph) * 0.8;
    pos[i * 3 + 1] = d.y + Math.sin(t * d.sp * 1.3 + d.ph * 2) * 0.5;
    pos[i * 3 + 2] = d.z + Math.cos(t * d.sp * 0.8 + d.ph) * 0.8;
  }
  flies.geometry.attributes.position.needsUpdate = true;
}

// Kıvılcım / sıçrama sprite havuzu
const fx = [];
function buildFx() {
  for (let i = 0; i < 40; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: 0xffd25a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    s.visible = false; scene.add(s);
    fx.push({ s, life: 0, max: 1, vx: 0, vy: 0, vz: 0, s0: 1, s1: 1 });
  }
}
function spawnFx(x, y, z, color, n = 1, spread = 0, s0 = 0.4, s1 = 1.6, life = 0.35, up = 0) {
  for (let k = 0; k < n; k++) {
    const f = fx.find((q) => q.life <= 0); if (!f) return;
    f.s.visible = true; f.s.material.color.set(color); f.s.position.set(x, y, z);
    f.life = f.max = life * rand(0.8, 1.2); f.s0 = s0; f.s1 = s1;
    f.vx = rand(-spread, spread); f.vy = up ? rand(up * 0.5, up) : rand(-spread, spread); f.vz = rand(-spread, spread);
  }
}
function updateFx(dt) {
  for (const f of fx) {
    if (f.life <= 0) continue;
    f.life -= dt;
    if (f.life <= 0) { f.s.visible = false; continue; }
    const t = 1 - f.life / f.max;
    f.s.position.x += f.vx * dt; f.s.position.y += f.vy * dt; f.s.position.z += f.vz * dt; f.vy -= 9 * dt * (f.vy !== 0 ? 1 : 0);
    const sc = lerp(f.s0, f.s1, t); f.s.scale.set(sc, sc, sc);
    f.s.material.opacity = 1 - t;
  }
}

// ---------------------------------------------------------------------
//  Altınlar (instanced)
// ---------------------------------------------------------------------
const COIN_MAX = 360;
let coinMesh; const coins = [];
function buildCoins() {
  const g = new THREE.CylinderGeometry(0.33, 0.33, 0.08, 24).rotateX(Math.PI / 2);
  const rim = new THREE.TorusGeometry(0.3, 0.035, 6, 24);
  const geo = mergeGeometries([g.toNonIndexed(), rim.toNonIndexed()].map((x) => { for (const k of Object.keys(x.attributes)) if (!['position', 'normal', 'uv'].includes(k)) x.deleteAttribute(k); return x; }));
  const m = new THREE.MeshStandardMaterial({ color: 0xffc83a, metalness: 1, roughness: 0.28, emissive: 0xff9a12, emissiveIntensity: 0.9, envMapIntensity: 1.6 });
  coinMesh = new THREE.InstancedMesh(geo, m, COIN_MAX);
  coinMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  coinMesh.count = 0; coinMesh.frustumCulled = false;
  scene.add(coinMesh);
}
function addCoin(x, y, z) { if (coins.length < COIN_MAX) coins.push({ x, y, z, ph: rand(6.28), mag: false }); }

// Güçlendiriciler
const PU_DEF = {
  magnet: { label: 'Mıknatıs', icon: '🧲', color: '#ff4d6d', dur: 10 },
  jump: { label: 'Süper Zıplama', icon: '👟', color: '#36e08a', dur: 10 },
  x2: { label: 'x2 Puan', icon: '⭐', color: '#b06bff', dur: 15 },
};
const pups = [];
const PU_TEX = {};
function buildPowerupMesh(type) {
  const d = PU_DEF[type];
  const g = new THREE.Group();
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: PU_TEX[type], depthWrite: false, transparent: true }));
  core.scale.set(0.9, 0.9, 0.9); g.add(core);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: new THREE.Color(d.color).multiplyScalar(2.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  halo.scale.set(2.4, 2.4, 2.4); g.add(halo);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 8, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(d.color).multiplyScalar(2.5) }));
  g.add(ring);
  g.userData.ring = ring;
  scene.add(g);
  return g;
}

// ---------------------------------------------------------------------
//  Ses motoru (tamamen prosedürel — dosya gerektirmez)
// ---------------------------------------------------------------------
class Sound {
  constructor() { this.ctx = null; this.enabled = store.get('sound', true); this.nextStep = 0; this.beat = 0; this.nextBeat = 0; this.music = false; this.intense = 0; this.nextCritter = 0; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const ctx = this.ctx = new C();
    this.master = ctx.createGain(); this.master.gain.value = this.enabled ? 1 : 0;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.sfx = ctx.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
    this.amb = ctx.createGain(); this.amb.gain.value = 0.75; this.amb.connect(this.master);
    this.mus = ctx.createGain(); this.mus.gain.value = 0.0; this.mus.connect(this.master);
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    // yağmur katmanları
    const r1 = this.noiseSrc(), hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), g1 = ctx.createGain();
    hp.type = 'highpass'; hp.frequency.value = 1100; lp.type = 'lowpass'; lp.frequency.value = 7500; g1.gain.value = 0.2;
    r1.connect(hp).connect(lp).connect(g1).connect(this.amb); r1.start();
    const r2 = this.noiseSrc(), bp = ctx.createBiquadFilter(), g2 = ctx.createGain();
    bp.type = 'lowpass'; bp.frequency.value = 420; g2.gain.value = 0.14;
    r2.connect(bp).connect(g2).connect(this.amb); r2.start(0, 0.7);
    const shaker = ctx.createWaveShaper(); const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 3); }
    shaker.curve = curve; this.dist = curve;
  }
  setEnabled(v) { this.enabled = v; store.set('sound', v); if (this.master) this.master.gain.setTargetAtTime(v ? 1 : 0, this.ctx.currentTime, 0.05); }
  noiseSrc() { const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.loop = true; return s; }
  env(param, t, a, peak, d, end = 0.0001) { param.cancelScheduledValues(t); param.setValueAtTime(0.0001, t); param.exponentialRampToValueAtTime(peak, t + a); param.exponentialRampToValueAtTime(end, t + a + d); }
  tone(type, f0, f1, dur, vol, dest = this.sfx, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    this.env(g.gain, t, 0.005, vol, dur); o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }
  burst(type, f0, f1, q, dur, vol, dest = this.sfx, delay = 0, attack = 0.005) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay, s = this.noiseSrc(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    this.env(g.gain, t, attack, vol, dur); s.connect(f).connect(g).connect(dest); s.start(t, rand(1.5)); s.stop(t + dur + attack + 0.05);
  }
  coin(streak) { const f = 1046 * Math.pow(2, (Math.min(streak, 12) % 13) / 24); this.tone('triangle', f, f, 0.09, 0.16); this.tone('sine', f * 1.5, f * 1.5, 0.14, 0.12, this.sfx, 0.05); }
  jump() { this.burst('bandpass', 500, 2200, 1.2, 0.22, 0.28); this.tone('sine', 300, 520, 0.12, 0.08); }
  roll() { this.burst('bandpass', 1800, 400, 1, 0.3, 0.3); }
  swipe() { this.burst('bandpass', 1400, 2600, 2, 0.1, 0.12); }
  land() { this.burst('lowpass', 700, 200, 1, 0.12, 0.35); }
  step() { this.burst('bandpass', rand(600, 900), 300, 1.5, 0.05, 0.1); }
  hit() { this.tone('sine', 150, 40, 0.3, 0.7); this.burst('lowpass', 1200, 100, 1, 0.25, 0.5); }
  crash() { this.tone('sine', 120, 30, 0.6, 0.9); this.burst('lowpass', 2500, 80, 0.8, 0.6, 0.8); this.burst('bandpass', 3000, 500, 1, 0.3, 0.3); }
  splash() { this.burst('bandpass', 2500, 600, 0.7, 0.45, 0.6); this.burst('lowpass', 900, 200, 1, 0.3, 0.4, this.sfx, 0.05); }
  power() { [0, 4, 7, 12].forEach((s, i) => this.tone('triangle', 523 * Math.pow(2, s / 12), 523 * Math.pow(2, s / 12), 0.18, 0.14, this.sfx, i * 0.06)); }
  roar(big = false) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime, dur = big ? 1.6 : 1.1;
    const out = ctx.createGain(); this.env(out.gain, t, 0.08, big ? 0.9 : 0.6, dur);
    const ws = ctx.createWaveShaper(); ws.curve = this.dist;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(1300, t); lp.frequency.exponentialRampToValueAtTime(400, t + dur);
    const fm = ctx.createBiquadFilter(); fm.type = 'bandpass'; fm.frequency.value = 560; fm.Q.value = 2;
    ws.connect(lp); lp.connect(out); ws.connect(fm); fm.connect(out); out.connect(this.sfx);
    for (const [f, typ] of [[78, 'sawtooth'], [117, 'sawtooth'], [52, 'square']]) {
      const o = ctx.createOscillator(); o.type = typ;
      o.frequency.setValueAtTime(f * 1.25, t); o.frequency.exponentialRampToValueAtTime(f * 0.8, t + dur);
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = rand(6, 9); lg.gain.value = f * 0.12;
      lfo.connect(lg).connect(o.frequency);
      const g = ctx.createGain(); g.gain.value = 0.5;
      o.connect(g).connect(ws); o.start(t); o.stop(t + dur + 0.1); lfo.start(t); lfo.stop(t + dur + 0.1);
    }
    this.burst('bandpass', 400, 250, 0.8, dur, big ? 0.7 : 0.45, this.sfx, 0, 0.08);
  }
  thunder(delay = 0, near = false) {
    if (!this.ctx) return;
    if (near) this.burst('bandpass', 3500, 600, 0.6, 0.35, 0.6, this.amb, delay);
    const ctx = this.ctx, t = ctx.currentTime + delay, s = this.noiseSrc(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'lowpass'; f.frequency.setValueAtTime(near ? 500 : 260, t); f.frequency.exponentialRampToValueAtTime(70, t + 4);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(near ? 1.2 : 0.7, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.8);
    g.gain.exponentialRampToValueAtTime(0.6, t + 1.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 4.2);
    s.connect(f).connect(g).connect(this.amb); s.start(t); s.stop(t + 4.5);
  }
  setMusic(on) { this.music = on; if (this.mus) this.mus.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.4); }
  update(state, speed, intense) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // gece böcekleri / kurbağalar
    if (now > this.nextCritter) {
      this.nextCritter = now + rand(0.15, 0.9);
      if (Math.random() < 0.7) {
        const f = rand(3800, 5200), n = randi(2, 4);
        for (let i = 0; i < n; i++) this.tone('sine', f, f * 0.98, 0.035, 0.022, this.amb, i * 0.06);
      } else {
        const f = rand(180, 320);
        this.tone('square', f, f * 0.7, 0.09, 0.03, this.amb); this.tone('square', f * 1.1, f * 0.8, 0.08, 0.025, this.amb, 0.13);
      }
    }
    // tribal davul döngüsü
    if (this.music) {
      const bpm = 108 + speed * 1.2, step = 60 / bpm / 2;
      if (this.nextBeat < now) this.nextBeat = now + 0.05;
      while (this.nextBeat < now + 0.12) {
        const b = this.beat % 16, d = this.nextBeat - now;
        const kick = [0, 3, 6, 8, 11, 14], tom = [4, 12], sh = [1, 3, 5, 7, 9, 11, 13, 15];
        if (kick.includes(b)) this.tone('sine', 120, 45, 0.22, 0.5, this.mus, d);
        if (tom.includes(b) || (intense && (b === 10 || b === 15))) this.tone('sine', 210, 120, 0.18, 0.32, this.mus, d);
        if (sh.includes(b)) this.burst('highpass', 7000, 6000, 1, 0.04, intense ? 0.12 : 0.07, this.mus, d);
        if (intense && b % 2 === 0) this.tone('triangle', 82, 60, 0.12, 0.18, this.mus, d);
        this.beat++; this.nextBeat += step;
      }
    }
  }
}
const sound = new Sound();

// ---------------------------------------------------------------------
//  Oyun durumu
// ---------------------------------------------------------------------
let state = 'loading';
let player, bear;
const chunks = [];
const obs = [];
let laneBusyTill = [Infinity, Infinity, Infinity];
let nextRowZ = -40, lastPowerZ = 0;
const P = { lane: 1, prevLane: 1, x: 0, y: 0, z: 0, vy: 0, grounded: true, rolling: 0, pendingRoll: false, jumpBuf: 0, stumble: 0, ground: 0, groundS: 0, phase: 0, hitCool: 0, deadT: 0, deathType: '', lastStepPh: 0, spin: 0 };
const B = { chasing: false, timer: 0, dist: 20, x: 0, y: 0, phase: 0, roarT: 0 };
const G = { speed: 0, dist: 0, score: 0, coins: 0, mult: 1, startT: 0, time: 0, slow: 1, streak: 0, streakT: 0, tutorial: false };
const powers = { magnet: 0, jump: 0, x2: 0 };
let best = store.get('best', 0), bank = store.get('bank', 0);
let camBlend = 0, shake = 0, lightning = 0, nextLightning = rand(6, 14), flashSeq = [];

// ---------------------------------------------------------------------
//  Post-process
// ---------------------------------------------------------------------
let composer = null, bloom = null, vignette = null;
const VignetteShader = {
  uniforms: { tDiffuse: { value: null }, uAmt: { value: 1.0 }, uRed: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uAmt; uniform float uRed; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 d = vUv - 0.5; float r = dot(d, d);
      float v = clamp(1.0 - r * 1.35 * uAmt, 0.0, 1.0); c.rgb *= mix(1.0, v, 0.95);
      c.rgb = mix(c.rgb, c.rgb * vec3(0.9, 1.03, 1.1), 0.6);
      c.rgb = mix(c.rgb, c.rgb * vec3(1.6, 0.55, 0.45) + vec3(0.05, 0.0, 0.0), uRed * smoothstep(0.12, 0.45, r));
      gl_FragColor = c; }`,
};
function setupComposer() {
  const q = QUALITY[quality];
  renderer.setPixelRatio(Math.min(devicePixelRatio, q.pr));
  renderer.setSize(innerWidth, innerHeight, false);
  if (composer) { composer.renderTarget1.dispose(); composer.renderTarget2.dispose(); composer = null; }
  if (q.bloom) {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: q.samples });
    composer = new EffectComposer(renderer, rt);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(innerWidth, innerHeight);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.8, 0.55, 0.78);
    composer.addPass(bloom);
    vignette = new ShaderPass(VignetteShader);
    composer.addPass(vignette);
    composer.addPass(new OutputPass());
  }
  moonLight.shadow.mapSize.set(q.shadow, q.shadow);
  if (moonLight.shadow.map) { moonLight.shadow.map.dispose(); moonLight.shadow.map = null; }
  rainCount = q.rain;
  if (flies) flies.material.uniforms.uPR.value = renderer.getPixelRatio();
  $('qualityBtn').textContent = '✨ Grafik: ' + q.label;
}
function onResize() {
  const a = innerWidth / innerHeight;
  camera.aspect = a;
  camera.userData.baseFov = a < 0.62 ? 74 : a < 1 ? 68 : 60;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
  if (composer) composer.setSize(innerWidth, innerHeight);
  $('rotate').classList.toggle('on', isMobile && a > 1.2);
}
addEventListener('resize', onResize);

// ---------------------------------------------------------------------
//  Dünya kurulumu / sıfırlama
// ---------------------------------------------------------------------
function clearWorld() {
  for (const o of obs) { scene.remove(o.mesh); if (o.dispose) o.mesh.traverse((c) => { if (c.isMesh && c.userData.own) c.geometry.dispose(); }); }
  obs.length = 0;
  coins.length = 0;
  for (const p of pups) scene.remove(p.mesh);
  pups.length = 0;
}
function resetWorld() {
  clearWorld();
  Object.assign(P, { lane: 1, prevLane: 1, x: 0, y: 0, z: 0, vy: 0, grounded: true, rolling: 0, pendingRoll: false, jumpBuf: 0, stumble: 0, ground: 0, groundS: 0, phase: 0, hitCool: 0, deadT: 0, deathType: '', spin: 0 });
  Object.assign(B, { chasing: false, timer: 0, dist: 20, x: 0, y: 0, phase: 0, roarT: 0 });
  Object.assign(G, { speed: 0, dist: 0, score: 0, coins: 0, mult: 1, startT: 0, time: 0, slow: 1, streak: 0, streakT: 0 });
  powers.magnet = powers.jump = powers.x2 = 0;
  laneBusyTill = [Infinity, Infinity, Infinity];
  nextRowZ = -45; lastPowerZ = -150;
  chunks.forEach((c, i) => { c.position.z = CH * 2 - i * CH; c.scale.x = Math.random() < 0.5 ? -1 : 1; });
  player.root.position.set(0, 0, 0); player.root.rotation.set(0, 0, 0);
  player.body.rotation.set(0, 0, 0);
  bear.root.visible = false;
  for (const f of fx) { f.life = 0; f.s.visible = false; }
  flyData.forEach((d) => { d.z = rand(-90, 8); });
}

// ---------------------------------------------------------------------
//  Engel üretimi
// ---------------------------------------------------------------------
function difficulty() { return clamp(G.dist / 2600, 0, 1); }
function surfaceAt(x, z) {
  let h = 0;
  for (const o of obs) {
    if (!o.walk || o.hit) continue;
    if (Math.abs(x - o.x) > o.halfW || z < o.zMin || z > o.zMax) continue;
    const s = o.ramp ? o.top * clamp((o.zMax - z) / (o.zMax - o.zMin), 0, 1) : o.top;
    if (s > h) h = s;
  }
  return h;
}
function addObs(o) { obs.push(o); scene.add(o.mesh); return o; }
function placeLog(lane, z) {
  const m = TPL.log(); m.position.set(laneX(lane), 0, z); m.rotation.y = rand(-0.06, 0.06);
  return addObs({ type: 'log', walk: true, deadly: false, x: laneX(lane), halfW: 1.0, zMin: z - 0.42, zMax: z + 0.42, top: 0.84, mesh: m });
}
function placeFullLog(z) {
  const m = TPL.fullLog(); m.position.set(0, 0, z);
  return addObs({ type: 'log', walk: true, deadly: false, x: 0, halfW: 3.9, zMin: z - 0.46, zMax: z + 0.46, top: 0.92, mesh: m });
}
function placeBranch(lane, z) {
  const m = TPL.branch(); m.position.set(laneX(lane), 0, z);
  return addObs({ type: 'branch', walk: false, deadly: false, xMin: laneX(lane) - 1.1, xMax: laneX(lane) + 1.1, zMin: z - 0.32, zMax: z + 0.32, yMin: 1.22, yMax: 2.2, mesh: m });
}
function placeFullBranch(z) {
  const m = TPL.fullBranch(); m.position.set(0, 0, z);
  return addObs({ type: 'branch', walk: false, deadly: false, xMin: -3.6, xMax: 3.6, zMin: z - 0.45, zMax: z + 0.45, yMin: 1.25, yMax: 2.5, mesh: m });
}
function placeRock(lane, z) {
  const stump = Math.random() < 0.45;
  const m = stump ? TPL.stump() : TPL.rock(); m.position.set(laneX(lane), 0, z); m.rotation.y = rand(6.28);
  return addObs({ type: 'rock', walk: true, deadly: true, x: laneX(lane), halfW: 0.95, zMin: z - 0.85, zMax: z + 0.85, top: 2.2, mesh: m });
}
function placeCreek(z) {
  const m = TPL.creek(); m.position.set(0, 0, z);
  return addObs({ type: 'creek', walk: false, zMin: z - 1.7, zMax: z + 1.7, mesh: m });
}
function placeTrunk(lane, zFront, L, ramp) {
  const m = buildTrunk(L, ramp);
  m.traverse((c) => { if (c.isMesh) c.userData.own = true; });
  const x = laneX(lane);
  const tz = ramp ? zFront - RAMP_LEN : zFront;
  m.position.set(x, 0, tz);
  addObs({ type: 'trunk', walk: true, deadly: true, x, halfW: 1.05, zMin: tz - L, zMax: tz, top: TRUNK_TOP, mesh: m, dispose: true });
  if (ramp) obs.push({ type: 'ramp', walk: true, deadly: false, ramp: true, x, halfW: 1.0, zMin: tz, zMax: zFront, top: TRUNK_TOP, mesh: new THREE.Group() });
  return tz - L;
}
function coinLine(lane, z0, n, sp = 2.4, arcOver = null) {
  const x = laneX(lane);
  for (let i = 0; i < n; i++) {
    const z = z0 - i * sp;
    let y = surfaceAt(x, z) + 0.95;
    if (arcOver !== null) { const d = Math.abs(z - arcOver); if (d < 4.5) y += Math.cos((d / 4.5) * Math.PI / 2) * 1.6; }
    addCoin(x, y, z);
  }
}
function placePowerup(lane, z) {
  const type = pick(Object.keys(PU_DEF));
  const mesh = buildPowerupMesh(type);
  const x = laneX(lane), y = surfaceAt(x, z) + 1.25;
  mesh.position.set(x, y, z);
  pups.push({ type, x, y, z, mesh });
}

function spawnRow(z) {
  const d = difficulty();
  const busy = [0, 1, 2].map((l) => z > laneBusyTill[l]);
  const free = [0, 1, 2].filter((l) => !busy[l]);
  let gap = lerp(30, 21, d) + rand(-3, 3);
  if (G.dist < 120 && z > -120) gap += 6;

  if (free.length === 0) {
    const l = randi(0, 2); coinLine(l, z, 4, 2.4);
    return gap * 0.7;
  }
  const r = Math.random();
  if (free.length === 3 && r < 0.14 + d * 0.06) {
    const k = Math.random();
    if (k < 0.36) { placeFullLog(z); coinLine(randi(0, 2), z + 4.8, 5, 2.4, z); }
    else if (k < 0.7) { placeFullBranch(z); coinLine(randi(0, 2), z + 4, 4, 2.2); }
    else { placeCreek(z); coinLine(randi(0, 2), z + 4.8, 5, 2.4, z); }
    return gap;
  }
  if (free.length === 3 && r < 0.36) {
    const n = Math.random() < 0.45 ? 1 : Math.random() < 0.65 ? 2 : 3;
    const lanes = shuffle([0, 1, 2]).slice(0, n);
    const L = rand(16, 30);
    let coinsDone = false;
    lanes.forEach((l, i) => {
      const ramp = (n === 3 && i === 0) || Math.random() < 0.55;
      const zf = z - (ramp ? 0 : RAMP_LEN);
      const back = placeTrunk(l, zf, L + rand(-3, 3), ramp);
      laneBusyTill[l] = back - 7;
      if (!coinsDone && ramp) { coinLine(l, zf - 0.5, Math.floor((L + RAMP_LEN) / 2.4), 2.4); coinsDone = true; }
    });
    const rest = [0, 1, 2].filter((l) => !lanes.includes(l));
    if (!coinsDone && rest.length) coinLine(pick(rest), z, 6, 2.4);
    return gap;
  }
  // karışık engel satırı
  shuffle(free);
  const k = Math.min(free.length, Math.random() < 0.3 + d * 0.4 ? 2 : 1);
  const types = [];
  for (let i = 0; i < k; i++) {
    let t = Math.random();
    t = free.length < 3 ? (t < 0.5 ? 'log' : 'branch') : t < 0.42 ? 'rock' : t < 0.71 ? 'log' : 'branch';
    types.push(t);
  }
  if (k === free.length && types.every((t) => t === 'rock')) types[k - 1] = Math.random() < 0.5 ? 'log' : 'branch';
  let logLane = -1;
  for (let i = 0; i < k; i++) {
    const l = free[i];
    if (types[i] === 'rock') placeRock(l, z);
    else if (types[i] === 'log') { placeLog(l, z); logLane = l; }
    else placeBranch(l, z);
  }
  const empty = free.slice(k);
  if (empty.length && Math.random() < 0.75) coinLine(pick(empty), z + 3, randi(5, 8), 2.4);
  else if (logLane >= 0 && Math.random() < 0.6) coinLine(logLane, z + 4.8, 5, 2.4, z);
  // güçlendirici
  if (empty.length && lastPowerZ - z > 320 && Math.random() < 0.25) { placePowerup(pick(empty), z - gap / 2); lastPowerZ = z; }
  return gap;
}
function updateSpawning() {
  while (nextRowZ > P.z - 190) nextRowZ -= spawnRow(nextRowZ);
  for (let i = obs.length - 1; i >= 0; i--) {
    const o = obs[i];
    if (o.zMin > P.z + 14) {
      scene.remove(o.mesh);
      if (o.dispose) o.mesh.traverse((c) => { if (c.isMesh && c.userData.own) c.geometry.dispose(); });
      obs.splice(i, 1);
    }
  }
  for (let i = pups.length - 1; i >= 0; i--) if (pups[i].z > P.z + 10) { scene.remove(pups[i].mesh); pups.splice(i, 1); }
}

// ---------------------------------------------------------------------
//  Girdi (kaydırma + klavye)
// ---------------------------------------------------------------------
function act(dir) {
  if (state !== 'playing' || P.deadT > 0) return;
  if (dir === 'left' || dir === 'right') {
    const nl = clamp(P.lane + (dir === 'left' ? -1 : 1), 0, 2);
    if (nl !== P.lane) { P.prevLane = P.lane; P.lane = nl; sound.swipe(); }
  } else if (dir === 'up') {
    if (P.grounded) doJump(); else P.jumpBuf = 0.18;
  } else if (dir === 'down') {
    if (!P.grounded) { P.vy = Math.min(P.vy, -26); P.pendingRoll = true; }
    else if (P.rolling <= 0) { P.rolling = ROLL_T; P.spin = 0; sound.roll(); }
  }
}
function doJump() {
  P.vy = JUMP_V * (powers.jump > 0 ? 1.38 : 1); P.grounded = false; P.rolling = 0; P.jumpBuf = 0; sound.jump();
}
const touch = { id: null, x: 0, y: 0, done: false };
addEventListener('pointerdown', (e) => {
  if (e.target.closest('button')) return;
  touch.id = e.pointerId; touch.x = e.clientX; touch.y = e.clientY; touch.done = false;
});
addEventListener('pointermove', (e) => {
  if (touch.id !== e.pointerId || touch.done) return;
  const dx = e.clientX - touch.x, dy = e.clientY - touch.y, th = Math.max(24, Math.min(innerWidth, innerHeight) * 0.05);
  if (Math.max(Math.abs(dx), Math.abs(dy)) > th) {
    touch.done = true;
    if (Math.abs(dx) > Math.abs(dy)) act(dx > 0 ? 'right' : 'left'); else act(dy > 0 ? 'down' : 'up');
  }
});
addEventListener('pointerup', (e) => { if (touch.id === e.pointerId) touch.id = null; });
addEventListener('pointercancel', () => { touch.id = null; });
addEventListener('keydown', (e) => {
  const k = e.key;
  if (['ArrowLeft', 'a', 'A'].includes(k)) act('left');
  else if (['ArrowRight', 'd', 'D'].includes(k)) act('right');
  else if (['ArrowUp', 'w', 'W', ' '].includes(k)) act('up');
  else if (['ArrowDown', 's', 'S'].includes(k)) act('down');
  else if (k === 'Escape' || k === 'p' || k === 'P') { if (state === 'playing') pauseGame(); else if (state === 'paused') resumeGame(); }
  else if (k === 'Enter') { if (state === 'menu') startGame(); else if (state === 'over') startGame(); }
  if (k.startsWith('Arrow') || k === ' ') e.preventDefault();
});
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing') pauseGame(); });

// ---------------------------------------------------------------------
//  Çarpışma ve olaylar
// ---------------------------------------------------------------------
function flashHit() { document.body.classList.remove('hit'); void document.body.offsetWidth; document.body.classList.add('hit'); }
function stumble() {
  if (P.hitCool > 0) return;
  P.hitCool = 0.9; P.stumble = 0.55; G.slow = 0.72; shake = 0.45;
  sound.hit(); flashHit();
  if (navigator.vibrate) navigator.vibrate(80);
  if (B.chasing && B.timer > 0) { die('caught'); return; }
  B.chasing = true; B.timer = BEAR_TIME; B.roarT = 0.15;
  setTimeout(() => sound.roar(), 120);
  toast('Dikkat! Ayı peşinde!', '#ff9a7a');
}
function sideHit() {
  if (P.lane !== P.prevLane) { const t = P.lane; P.lane = P.prevLane; P.prevLane = t; }
  stumble();
}
function die(type) {
  if (P.deadT > 0) return;
  P.deadT = 0.0001; P.deathType = type;
  state = 'dying';
  shake = 0.8;
  if (type === 'crash') { sound.crash(); flashHit(); }
  B.chasing = true; B.timer = 99;
  setTimeout(() => sound.roar(true), type === 'caught' ? 50 : 500);
  if (navigator.vibrate) navigator.vibrate([120, 60, 200]);
  sound.setMusic(false);
  $('bearWarn').classList.remove('show');
}
function collide(prevZ) {
  const px = P.x, pz = P.z, py = P.y, ph = P.rolling > 0 ? H_ROLL : H_STAND;
  let ground = 0;
  for (const o of obs) {
    if (o.hit || o.zMin > pz + 2 || o.zMax < pz - 2) continue;
    if (o.walk) {
      if (Math.abs(px - o.x) > o.halfW || pz < o.zMin || pz > o.zMax) continue;
      const h = o.ramp ? o.top * clamp((o.zMax - pz) / (o.zMax - o.zMin), 0, 1) : o.top;
      if (py >= h - STEP) { if (h > ground) ground = h; continue; }
      if (prevZ > o.zMax) {
        if (o.deadly) { P.z = o.zMax + 0.35; die('crash'); return ground; }
        o.hit = true; P.vy = 5; P.grounded = false; stumble();
      } else sideHit();
    } else if (o.type === 'creek') {
      if (pz < o.zMax - 0.35 && pz > o.zMin + 0.35 && py < 0.12) {
        o.hit = true; spawnFx(px, 0.3, pz, 0x9fe0ff, 10, 3, 0.2, 0.9, 0.5, 5); sound.splash(); stumble();
      }
    } else {
      if (px + 0.3 < o.xMin || px - 0.3 > o.xMax || pz + 0.3 < o.zMin || pz - 0.3 > o.zMax || py + ph < o.yMin || py > o.yMax) continue;
      if (prevZ - 0.3 > o.zMax - 0.02) { o.hit = true; stumble(); }
      else sideHit();
    }
  }
  return ground;
}

// ---------------------------------------------------------------------
//  Güncelleme döngüsü
// ---------------------------------------------------------------------
function updatePlayer(dt) {
  const d = difficulty();
  const startRamp = clamp(G.startT / 0.9, 0, 1);
  G.slow = damp(G.slow, 1, 1.4, dt);
  const target = Math.min(MAX_SPEED, BASE_SPEED + (MAX_SPEED - BASE_SPEED) * Math.min(1, G.dist / SPEED_DIST));
  G.speed = target * G.slow * (0.35 + 0.65 * startRamp);
  P.hitCool = Math.max(0, P.hitCool - dt);
  P.stumble = Math.max(0, P.stumble - dt);
  P.jumpBuf = Math.max(0, P.jumpBuf - dt);

  // alt adımlar (hızlıda tünellemeyi önlemek için)
  const move = G.speed * dt;
  const steps = Math.max(1, Math.ceil(move / 0.45));
  const sdt = dt / steps;
  for (let s = 0; s < steps && P.deadT === 0; s++) {
    const prevZ = P.z;
    P.z -= G.speed * sdt;
    P.x = damp(P.x, laneX(P.lane), 16, sdt);
    if (Math.abs(P.x - laneX(P.lane)) < 0.05) P.prevLane = P.lane;
    if (!P.grounded) { P.vy -= GRAVITY * sdt; P.y += P.vy * sdt; }
    const gnd = collide(prevZ);
    if (P.deadT > 0) break;
    P.ground = gnd;
    if (P.y <= gnd) {
      if (!P.grounded) {
        if (P.vy < -6) { sound.land(); spawnFx(P.x, gnd + 0.1, P.z, 0x9fb8c0, 3, 1.5, 0.3, 0.9, 0.35); }
        P.grounded = true;
        if (P.pendingRoll) { P.pendingRoll = false; P.rolling = ROLL_T; P.spin = 0; sound.roll(); }
        if (P.jumpBuf > 0) doJump();
      }
      if (P.grounded) { P.y = gnd; P.vy = 0; }
    } else if (P.grounded && P.y > gnd + 0.08) { P.grounded = false; P.vy = 0; }
  }
  if (P.rolling > 0) { P.rolling -= dt; P.spin += dt / ROLL_T; }

  if (P.deadT === 0) {
    G.dist += move;
    G.mult = powers.x2 > 0 ? 2 : 1;
    G.score += move * G.mult;
  }
  P.groundS = damp(P.groundS, P.ground, 5, dt);
}

function animatePlayer(dt, t) {
  const pl = player;
  pl.root.position.set(P.x, P.y, P.z);
  const [aL, aR] = pl.arms, [lL, lR] = pl.legs;
  pl.glow.material.opacity = state === 'menu' ? 0.25 : 0.9;
  const lean = (laneX(P.lane) - P.x) * -0.12;
  pl.root.rotation.z = damp(pl.root.rotation.z, lean, 10, dt);
  if (state === 'menu') {
    const br = Math.sin(t * 2) * 0.02;
    pl.body.rotation.set(0, 0, 0); pl.body.position.y = 0.55; pl.hips.position.y = 0.4 + br * 0.5;
    pl.spine.rotation.set(br, 0, 0); pl.neck.rotation.set(Math.sin(t * 0.6) * 0.08, Math.sin(t * 0.4) * 0.5, 0);
    aL.sh.rotation.set(0.1, 0, 0.15 + br); aR.sh.rotation.set(0.1, 0, -0.15 - br); aL.el.rotation.x = 0.3; aR.el.rotation.x = 0.3;
    lL.hp.rotation.set(0, 0, 0.04); lR.hp.rotation.set(0, 0, -0.04); lL.kn.rotation.x = 0; lR.kn.rotation.x = 0;
    return;
  }
  pl.root.rotation.y = 0;
  if (P.deadT > 0) {
    const k = clamp(P.deadT / 0.5, 0, 1);
    if (P.deathType === 'crash') { pl.body.rotation.x = lerp(0, 1.45, k); pl.body.position.y = lerp(0.55, 0.3, k); }
    else { pl.body.rotation.x = lerp(0, -1.4, k); pl.body.position.y = lerp(0.55, 0.28, k); }
    aL.sh.rotation.x = -2.2 * k; aR.sh.rotation.x = -2.5 * k; lL.hp.rotation.x = 0.4 * k; lR.hp.rotation.x = -0.2 * k;
    return;
  }
  const rate = 7 + G.speed * 0.42;
  if (P.grounded && P.rolling <= 0) P.phase += dt * rate;
  const ph = P.phase, s = Math.sin(ph);
  // adım sesi
  const stepIdx = Math.floor(ph / Math.PI);
  if (P.grounded && P.rolling <= 0 && stepIdx !== P.lastStepPh) { P.lastStepPh = stepIdx; sound.step(); }

  let tl = { tl: 0, tr: 0, kl: 0, kr: 0, al: 0, ar: 0, el: 1.1, er: 1.1, sp: -0.2, bx: 0, by: 0.55, hy: 0.4 };
  if (P.rolling > 0) {
    tl = { tl: 1.9, tr: 1.9, kl: -2.3, kr: -2.3, al: 0.9, ar: 0.9, el: 1.6, er: 1.6, sp: -0.9, bx: -Math.min(1, P.spin) * Math.PI * 2, by: 0.45, hy: 0.32 };
  } else if (!P.grounded) {
    const up = P.vy > 0;
    tl = { tl: up ? 1.1 : 0.5, tr: up ? 0.2 : 0.7, kl: -1.7, kr: up ? -0.6 : -1.2, al: -2.4, ar: up ? -1.6 : -2.0, el: 0.4, er: 0.6, sp: -0.15, bx: 0, by: 0.55, hy: 0.4 };
  } else {
    tl.tl = s * 0.95; tl.tr = -s * 0.95;
    tl.kl = -(0.25 + Math.max(0, -s) * 1.5); tl.kr = -(0.25 + Math.max(0, s) * 1.5);
    tl.al = -s * 0.85; tl.ar = s * 0.85;
    tl.hy = 0.4 + Math.abs(Math.cos(ph)) * 0.06;
  }
  if (P.stumble > 0) { const k = P.stumble / 0.55; tl.sp += Math.sin(P.stumble * 30) * 0.35 * k; tl.al = -2.5 * k; tl.ar = -2.0 * k; }
  const L = P.rolling > 0 || !P.grounded ? 22 : 30;
  lL.hp.rotation.x = damp(lL.hp.rotation.x, tl.tl, L, dt); lR.hp.rotation.x = damp(lR.hp.rotation.x, tl.tr, L, dt);
  lL.kn.rotation.x = damp(lL.kn.rotation.x, tl.kl, L, dt); lR.kn.rotation.x = damp(lR.kn.rotation.x, tl.kr, L, dt);
  aL.sh.rotation.x = damp(aL.sh.rotation.x, tl.al, L, dt); aR.sh.rotation.x = damp(aR.sh.rotation.x, tl.ar, L, dt);
  aL.sh.rotation.z = 0.12; aR.sh.rotation.z = -0.12;
  aL.el.rotation.x = damp(aL.el.rotation.x, tl.el, L, dt); aR.el.rotation.x = damp(aR.el.rotation.x, tl.er, L, dt);
  pl.spine.rotation.x = damp(pl.spine.rotation.x, tl.sp, 14, dt);
  pl.hips.position.y = damp(pl.hips.position.y, tl.hy, 20, dt);
  pl.body.position.y = damp(pl.body.position.y, tl.by, 20, dt);
  pl.body.rotation.x = P.rolling > 0 ? tl.bx : damp(pl.body.rotation.x, 0, 20, dt);
  pl.neck.rotation.set(0.12, 0, 0);
}

function updateBear(dt, t) {
  if (state === 'dying') {
    B.dist = damp(B.dist, P.deathType === 'caught' ? 1.6 : 2.3, 4, dt);
  } else {
    if (B.chasing) { B.timer -= dt; if (B.timer <= 0) { B.chasing = false; } }
    B.dist = damp(B.dist, B.chasing ? 2.3 : 22, B.chasing ? 2.2 : 0.7, dt);
  }
  $('bearWarn').classList.toggle('show', state === 'playing' && B.chasing && B.dist < 8);
  const vis = B.dist < 17;
  bear.root.visible = vis;
  if (!vis) return;
  const off = P.lane === 0 ? 1.15 : P.lane === 2 ? -1.15 : (P.x > 0 ? -1.15 : 1.15);
  B.x = damp(B.x, P.x + (state === 'dying' ? 0 : off), 5, dt);
  B.y = damp(B.y, state === 'dying' ? P.ground : P.groundS, 6, dt);
  const r = bear.root;
  r.position.set(B.x, B.y, P.z + B.dist);
  r.rotation.y = damp(r.rotation.y, state === 'dying' ? 0 : Math.sign(off) * 0.4, 4, dt);
  const running = state === 'playing' || (state === 'dying' && P.deadT < 0.7);
  if (running) B.phase += dt * (8 + G.speed * 0.3);
  const ph = B.phase;
  for (const l of bear.legs) {
    const o = l.front ? 0 : Math.PI;
    l.g.rotation.x = running ? Math.sin(ph + o + l.side * 0.35) * 0.85 : damp(l.g.rotation.x, 0, 6, dt);
  }
  let pitch = running ? Math.sin(ph * 1) * 0.08 : 0;
  let jaw = 0.15 + Math.max(0, Math.sin(t * 3)) * 0.15;
  if (state === 'dying' && P.deadT > 0.5) {
    pitch = -damp(-bear.body.rotation.x, 0.75, 4, dt);
    jaw = 0.55 + Math.sin(t * 25) * 0.08;
    bear.legs.forEach((l) => { if (l.front) l.g.rotation.x = -0.9 + Math.sin(t * 6 + l.side) * 0.3; });
  }
  if (B.roarT > 0) { B.roarT -= dt; }
  bear.body.rotation.x = state === 'dying' && P.deadT > 0.5 ? Math.max(pitch, 0) + 0.7 * clamp((P.deadT - 0.5) / 0.4, 0, 1) : pitch;
  bear.body.position.y = running ? Math.abs(Math.sin(ph)) * 0.12 : 0;
  bear.jaw.rotation.x = damp(bear.jaw.rotation.x, jaw, 10, dt);
  bear.head.rotation.x = running ? Math.sin(ph + 1) * 0.1 : -0.3;
}

const _camPos = new THREE.Vector3(), _camLook = new THREE.Vector3(), _menuPos = new THREE.Vector3(), _menuLook = new THREE.Vector3(), _curLook = new THREE.Vector3();
function updateCamera(dt, t) {
  const a = camera.aspect;
  const back = a < 0.62 ? 7.6 : a < 1 ? 7.0 : 6.4;
  const hgt = a < 0.62 ? 4.1 : 3.7;
  const cy = P.groundS + hgt + Math.max(0, P.y - P.groundS) * 0.35;
  _camPos.set(P.x * 0.8, cy, P.z + back);
  _camLook.set(P.x * 0.9, P.groundS + 1.1 + Math.max(0, P.y - P.groundS) * 0.3, P.z - 7);
  if (state === 'dying') {
    const k = clamp(P.deadT / 1.2, 0, 1);
    _camPos.set(lerp(P.x * 0.8, P.x + 2.6, k), lerp(cy, P.ground + 2.4, k), P.z + lerp(back, 5.5, k));
    _camLook.set(P.x, P.ground + 0.9, P.z + lerp(-7, 1.2, k));
  }
  _menuPos.set(1.5 + Math.sin(t * 0.25) * 0.4, 1.9 + Math.sin(t * 0.3) * 0.1, P.z - 5.2);
  _menuLook.set(-0.2, camera.aspect < 1 ? 0.15 : 0.9, P.z);
  const k = camBlend * camBlend * (3 - 2 * camBlend);
  const pos = _menuPos.clone().lerp(_camPos, k);
  const look = _menuLook.clone().lerp(_camLook, k);
  if (camera.userData.init) { camera.position.lerp(pos, 1 - Math.exp(-14 * dt)); _curLook.lerp(look, 1 - Math.exp(-14 * dt)); }
  else { camera.position.copy(pos); _curLook.copy(look); camera.userData.init = true; }
  if (shake > 0) { shake = Math.max(0, shake - dt); const s = shake * 0.35; camera.position.x += rand(-s, s); camera.position.y += rand(-s, s); }
  camera.lookAt(_curLook);
  const fov = (camera.userData.baseFov || 62) + (state === 'playing' ? (G.speed - BASE_SPEED) * 0.35 : 0) * k;
  if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = damp(camera.fov, fov, 3, dt); camera.updateProjectionMatrix(); }
}

function updateCoins(dt, t) {
  const px = P.x, py = P.y + 0.9, pz = P.z;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
  let n = 0;
  G.streakT -= dt; if (G.streakT <= 0) G.streak = 0;
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i];
    if (c.z > pz + 6) { coins[i] = coins[coins.length - 1]; coins.pop(); continue; }
    if (state === 'playing') {
      const dz = c.z - pz;
      if (powers.magnet > 0 && dz > -16 && dz < 2 && Math.abs(c.x - px) < 7) c.mag = true;
      if (c.mag) { const k = 1 - Math.exp(-12 * dt); c.x = lerp(c.x, px, k); c.y = lerp(c.y, py, k); c.z = lerp(c.z, pz - 0.3, k); }
      if (Math.abs(c.x - px) < 0.85 && Math.abs(c.z - pz) < 0.9 && Math.abs(c.y - py) < 1.25) {
        G.coins++; G.streak++; G.streakT = 0.6;
        sound.coin(G.streak);
        spawnFx(c.x, c.y, c.z, 0xffd25a, 1, 0, 0.3, 1.4, 0.28);
        coins[i] = coins[coins.length - 1]; coins.pop(); continue;
      }
    }
    if (c.z < pz - 120) continue;
    e.set(0, t * 3 + c.ph, 0); q.setFromEuler(e); v.set(c.x, c.y + Math.sin(t * 3 + c.ph) * 0.08, c.z);
    m.compose(v, q, sc); coinMesh.setMatrixAt(n++, m);
  }
  coinMesh.count = n;
  coinMesh.instanceMatrix.needsUpdate = true;
}
function updatePowerups(dt, t) {
  for (let i = pups.length - 1; i >= 0; i--) {
    const p = pups[i];
    p.mesh.position.y = p.y + Math.sin(t * 2.5) * 0.15;
    p.mesh.userData.ring.rotation.y = t * 2; p.mesh.userData.ring.rotation.x = Math.sin(t) * 0.4;
    if (state === 'playing' && Math.abs(p.x - P.x) < 1 && Math.abs(p.z - P.z) < 1.1 && Math.abs(p.y - (P.y + 0.9)) < 1.6) {
      powers[p.type] = PU_DEF[p.type].dur;
      sound.power(); toast(PU_DEF[p.type].icon + ' ' + PU_DEF[p.type].label + '!', PU_DEF[p.type].color);
      spawnFx(p.x, p.y, p.z, PU_DEF[p.type].color, 6, 2, 0.4, 2.2, 0.5);
      scene.remove(p.mesh); pups.splice(i, 1);
    }
  }
  for (const k in powers) if (powers[k] > 0) powers[k] = Math.max(0, powers[k] - dt);
}

function updateChunks() {
  const camZ = camera.position.z;
  for (const c of chunks) {
    if (c.position.z - CH > camZ + 4) {
      c.position.z -= NCH * CH;
      c.scale.x = Math.random() < 0.5 ? -1 : 1;
    }
  }
}

function updateLightning(dt) {
  nextLightning -= dt;
  if (nextLightning <= 0) {
    nextLightning = rand(9, 22);
    const near = Math.random() < 0.4;
    flashSeq = [[0, 1], [0.07, 0.15], [0.14, near ? 1.3 : 0.7], [0.3, 0]];
    lightning = 0.0001;
    sound.thunder(near ? rand(0.15, 0.4) : rand(0.8, 1.8), near);
  }
  let f = 0;
  if (lightning > 0) {
    lightning += dt;
    for (const [tt, v] of flashSeq) if (lightning >= tt) f = v;
    if (lightning > 0.6) { lightning = 0; f = 0; }
    f *= Math.max(0, 1 - (lightning - 0.15) * 2.5) + (lightning < 0.15 ? 0 : 0);
  }
  hemi.intensity = 1.25 + f * 3.2;
  moonLight.intensity = 1.9 + f * 4;
  scene.fog.density = 0.021 - f * 0.006;
}

// HUD
const ui = {
  score: $('score'), coins: $('coins'), mult: $('mult'), multPill: $('multPill'), pow: $('powerups'),
};
let lastHud = '';
function updateHud() {
  const s = Math.floor(G.score), c = G.coins, m = G.mult;
  const key = s + '|' + c + '|' + m + '|' + Object.values(powers).map((v) => Math.ceil(v * 4)).join(',');
  if (key === lastHud) return;
  lastHud = key;
  ui.score.textContent = s.toLocaleString('tr-TR');
  ui.coins.textContent = c;
  ui.mult.textContent = m;
  ui.multPill.classList.toggle('boost', m > 1);
  let html = '';
  for (const k in powers) {
    if (powers[k] <= 0) continue;
    const d = PU_DEF[k];
    html += `<div class="pu"><i style="background:${d.color}">${d.icon}</i><div class="bar"><span style="width:${(powers[k] / d.dur) * 100}%;background:${d.color}"></span></div></div>`;
  }
  ui.pow.innerHTML = html;
}
let toastT = null;
function toast(msg, color = '#fff') {
  const el = $('toast'); el.textContent = msg; el.style.color = color; el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 1400);
}
function tutorialUpdate() {
  if (!G.tutorial) return;
  const el = $('tutorial'), t = G.time;
  let msg = '';
  if (t > 1.2 && t < 4.4) msg = '⬅ ➡  Kaydır: Şerit değiştir';
  else if (t > 5 && t < 8.2) msg = '⬆  Kaydır: Zıpla';
  else if (t > 8.8 && t < 12) msg = '⬇  Kaydır: Altından kay';
  if (msg) { if (el.textContent !== msg) el.textContent = msg; el.classList.add('show'); } else el.classList.remove('show');
  if (t > 12.5) { G.tutorial = false; store.set('tut', true); el.classList.remove('show'); }
}

// ---------------------------------------------------------------------
//  Ekran akışı
// ---------------------------------------------------------------------
function show(id) { for (const s of ['menu', 'pause', 'over', 'loading']) $(s).classList.toggle('show', s === id); }
function updateMenuStats() { $('bestMenu').textContent = best.toLocaleString('tr-TR'); $('bankMenu').textContent = bank.toLocaleString('tr-TR'); }
function startGame() {
  sound.init();
  resetWorld();
  state = 'playing';
  show(null);
  $('hud').classList.remove('hidden');
  camBlend = state === 'playing' && camBlend > 0.99 ? 1 : 0;
  G.tutorial = !store.get('tut', false);
  // giriş: ayı başta kısa süre kovalar
  B.chasing = true; B.timer = 3.2; B.dist = 9;
  setTimeout(() => sound.roar(), 300);
  sound.setMusic(true);
  lastHud = '';
}
function pauseGame() { if (state !== 'playing') return; state = 'paused'; show('pause'); sound.setMusic(false); }
function resumeGame() { if (state !== 'paused') return; state = 'playing'; show(null); sound.init(); sound.setMusic(true); last = performance.now(); }
function gameOver() {
  state = 'over';
  const s = Math.floor(G.score);
  const nb = s > best;
  if (nb) { best = s; store.set('best', best); }
  bank += G.coins; store.set('bank', bank);
  $('overTitle').textContent = P.deathType === 'caught' ? 'AYI SENİ YAKALADI!' : 'ÇARPTIN! AYI YETİŞTİ!';
  $('finalScore').textContent = s.toLocaleString('tr-TR');
  $('finalCoins').textContent = G.coins;
  $('finalDist').textContent = Math.floor(G.dist) + ' m';
  $('bestOver').textContent = best.toLocaleString('tr-TR');
  $('newBest').classList.toggle('show', nb);
  $('hud').classList.add('hidden');
  show('over');
}
function toMenu() {
  resetWorld();
  state = 'menu'; camBlend = 0;
  $('hud').classList.add('hidden');
  sound.setMusic(false);
  updateMenuStats();
  show('menu');
}
$('playBtn').onclick = () => startGame();
$('retryBtn').onclick = () => startGame();
$('menuBtn').onclick = () => toMenu();
$('pauseBtn').onclick = () => pauseGame();
$('resumeBtn').onclick = () => resumeGame();
$('quitBtn').onclick = () => toMenu();
function soundLabel() { $('soundBtn').textContent = sound.enabled ? '🔊 Ses: Açık' : '🔇 Ses: Kapalı'; }
$('soundBtn').onclick = () => { sound.init(); sound.setEnabled(!sound.enabled); soundLabel(); };
$('qualityBtn').onclick = () => {
  quality = quality === 'high' ? 'low' : quality === 'low' ? 'medium' : 'high';
  store.set('quality', quality); setupComposer(); onResize();
};

// ---------------------------------------------------------------------
//  Ana döngü
// ---------------------------------------------------------------------
let last = performance.now();
const _mlTarget = new THREE.Vector3();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (state === 'loading' || window.__noLoop) return;
  if (state !== 'paused') tick(dt);
  render();
}
function tick(dt) {
  const t = (timeU.value += dt);

  if (state === 'playing') {
    G.time += dt; G.startT += dt;
    camBlend = Math.min(1, camBlend + dt / 1.0);
    updatePlayer(dt);
    updateSpawning();
    tutorialUpdate();
  } else if (state === 'dying') {
    P.deadT += dt;
    G.speed = damp(G.speed, 0, 5, dt);
    P.z -= G.speed * dt;
    if (!P.grounded) { P.vy -= GRAVITY * dt; P.y = Math.max(P.ground, P.y + P.vy * dt); if (P.y <= P.ground) P.grounded = true; }
    if (P.deadT > 2.1) gameOver();
  } else if (state === 'menu') {
    camBlend = 0;
  }
  animatePlayer(dt, t);
  if (state !== 'menu') updateBear(dt, t); else bear.root.visible = false;
  updateCoins(dt, t);
  updatePowerups(dt, t);
  updateCamera(dt, t);
  updateChunks();
  updateRain(dt, camera.position.x, camera.position.z);
  updateFireflies(dt, t, P.z);
  updateFx(dt);
  updateLightning(dt);
  if (state === 'playing') updateHud();
  // ışıkları oyuncuyla taşı
  moonLight.position.set(P.x - 9, 22, P.z + 12);
  moonLight.target.position.set(P.x, 0, P.z - 4);
  if (state === 'menu') fillLight.position.set(P.x + 1.2, 2.2, P.z - 2.5); else fillLight.position.set(P.x, P.y + 2.8, P.z + 2.6);
  TEX.water.offset.x = t * 0.05; TEX.water.offset.y = t * 0.12;
  if (vignette) vignette.uniforms.uRed.value = state === 'playing' && B.chasing && B.dist < 8 ? 0.35 + Math.sin(t * 8) * 0.15 : 0;
  sound.update(state, G.speed, B.chasing && state === 'playing');
}
function render() { if (composer) composer.render(); else renderer.render(scene, camera); }

// ---------------------------------------------------------------------
//  Başlat
// ---------------------------------------------------------------------
async function boot() {
  await new Promise((r) => setTimeout(r, 30)); // yükleme ekranı çizilsin
  buildMaterials();
  buildBaseGeos();
  PU_TEX.magnet = emojiTexture('🧲', '#c2183c'); PU_TEX.jump = emojiTexture('👟', '#13a35e'); PU_TEX.x2 = emojiTexture('x2', '#7a2fd0');
  buildTemplates();
  for (let i = 0; i < NCH; i++) { const c = buildChunk(); chunks.push(c); scene.add(c); }
  player = buildPlayer();
  bear = buildBear();
  buildRain();
  buildFireflies();
  buildFx();
  buildCoins();
  setupComposer();
  onResize();
  resetWorld();
  soundLabel();
  updateMenuStats();
  // ilk kareyi derle (takılmaları azaltır)
  renderer.compile(scene, camera);
  state = 'menu';
  show('menu');
  last = performance.now();
  requestAnimationFrame(frame);
  window.__ok = { P, G, B, obs, coins, tick, render, act, start: startGame, get state() { return state; } };
}
boot().catch((err) => {
  console.error(err);
  $('loading').querySelector('p').textContent = 'Hata: ' + err.message;
});

// PWA
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
