// =====================================================================
//  DEMİR SANCAK — şehir zemini: taş yollar, meydan, bina zeminleri,
//  bahçeler. Tek büyük canvas'a boyanır, normal haritası ile kabartılır.
// =====================================================================
import * as THREE from 'three';

const rand = (a, b) => a + Math.random() * (b - a);
export const CITY_SZ = 116;

function normalFromHeight(hc, strength) {
  const w = hc.width, h = hc.height, src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - 1), y1 = Math.min(h - 1, y + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - 1), x1 = Math.min(w - 1, x + 1);
      const dx = (src[(y * w + x1) * 4] - src[(y * w + x0) * 4]) / 255 * strength;
      const dy = (src[(y1 * w + x) * 4] - src[(y0 * w + x) * 4]) / 255 * strength;
      const l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
      d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// roads: [[x,z],...] çoklu çizgiler; pads: [{x,z,s}] kare zeminler
export function paintCity({ roads, pads, plazaR = 10.5, wallR = 40, mobile = false }) {
  const S = mobile ? 1536 : 2048, SZ = CITY_SZ, k = S / SZ;
  const m = (v) => (v / SZ + 0.5) * S;
  const col = document.createElement('canvas'); col.width = col.height = S;
  const hgt = document.createElement('canvas'); hgt.width = hgt.height = S;
  const c = col.getContext('2d'), h = hgt.getContext('2d');
  h.fillStyle = '#404040'; h.fillRect(0, 0, S, S);
  // --- çayır tabanı (yumuşak kenarlı) ---
  const g = c.createRadialGradient(S / 2, S / 2, S * 0.36, S / 2, S / 2, S * 0.5);
  g.addColorStop(0, 'rgba(84,128,48,1)'); g.addColorStop(1, 'rgba(84,128,48,0)');
  c.fillStyle = g; c.fillRect(0, 0, S, S);
  c.save(); c.beginPath(); c.arc(S / 2, S / 2, S * 0.48, 0, 7); c.clip();
  for (let i = 0; i < 900; i++) { // büyük renk lekeleri
    const x = Math.random() * S, y = Math.random() * S, r = rand(10, 60) * k / 10;
    c.fillStyle = ['rgba(70,112,40,.35)', 'rgba(104,150,58,.3)', 'rgba(120,160,64,.25)', 'rgba(60,100,36,.3)'][i % 4];
    c.beginPath(); c.ellipse(x, y, r * 3, r * 2, rand(0, 3), 0, 7); c.fill();
  }
  for (let i = 0; i < 26000; i++) { c.fillStyle = ['#3f6a24', '#7aac4a', '#5a8a34', '#94c25a'][i % 4]; c.globalAlpha = rand(0.2, 0.6); c.fillRect(Math.random() * S, Math.random() * S, 1.5, rand(1.5, 3.5)); }
  c.globalAlpha = 1;
  c.restore();
  // --- sur altı toprak şeridi ---
  c.strokeStyle = 'rgba(120,96,64,.85)'; c.lineWidth = 4.2 * k; c.beginPath(); c.arc(S / 2, S / 2, wallR * k, 0, 7); c.stroke();
  // --- bahçeler / çiçek tarhları (rastgele boş yerlere) ---
  const free = (x, z) => {
    if (Math.hypot(x, z) < plazaR + 3 || Math.abs(Math.hypot(x, z) - wallR) < 4 || Math.hypot(x, z) > 48) return false;
    for (const p of pads) if (Math.abs(x - p.x) < p.s / 2 + 2.5 && Math.abs(z - p.z) < p.s / 2 + 2.5) return false;
    for (const L of roads) for (let i = 0; i < L.length - 1; i++) if (segDist(x, z, ...L[i], ...L[i + 1]) < 3.4) return false;
    return true;
  };
  const gardens = [];
  for (let t = 0; t < 400 && gardens.length < 18; t++) {
    const x = rand(-46, 46), z = rand(-46, 46);
    if (!free(x, z)) continue;
    gardens.push([x, z]);
    const w = rand(2, 3.6), d = rand(1.2, 2);
    c.save(); c.translate(m(x), m(z)); c.rotate(rand(0, 3));
    c.fillStyle = '#6a4a2c'; roundRect(c, -w * k / 2, -d * k / 2, w * k, d * k, 6); c.fill();
    c.strokeStyle = '#8a8070'; c.lineWidth = 0.25 * k; c.stroke();
    const fc = [['#e83a5a', '#ff8aa8'], ['#ffd040', '#fff090'], ['#8a5aff', '#c8a8ff'], ['#ffffff', '#f0f0d0']][Math.floor(Math.random() * 4)];
    for (let i = 0; i < 70; i++) { c.fillStyle = Math.random() < 0.35 ? '#3a7a2a' : fc[i % 2]; c.beginPath(); c.arc(rand(-w / 2 + 0.2, w / 2 - 0.2) * k, rand(-d / 2 + 0.2, d / 2 - 0.2) * k, rand(0.08, 0.16) * k, 0, 7); c.fill(); }
    c.restore();
  }
  // --- yollar: kenar taşları + parke taşı ---
  const stone = (x, y, r, shade, rot = 0, rx = 1) => {
    const v = shade;
    c.fillStyle = `rgb(${v + 8 + rand(-8, 8)},${v - 2 + rand(-6, 6)},${v - 16 + rand(-6, 6)})`;
    c.beginPath(); c.ellipse(x, y, r * rx, r, rot, 0, 7); c.fill();
    const hg = h.createRadialGradient(x, y, 0, x, y, r * Math.max(1, rx)); hg.addColorStop(0, '#fff'); hg.addColorStop(1, '#888');
    h.fillStyle = hg; h.beginPath(); h.ellipse(x, y, r * rx, r, rot, 0, 7); h.fill();
  };
  const W = 2.7;
  for (const L of roads) {
    // gölge/zemin şeridi
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = 'rgba(60,46,30,.9)'; c.lineWidth = (W + 0.7) * k; c.beginPath(); L.forEach(([x, z], i) => (i ? c.lineTo(m(x), m(z)) : c.moveTo(m(x), m(z)))); c.stroke();
    h.strokeStyle = '#202020'; h.lineCap = 'round'; h.lineJoin = 'round'; h.lineWidth = (W + 0.7) * k; h.beginPath(); L.forEach(([x, z], i) => (i ? h.lineTo(m(x), m(z)) : h.moveTo(m(x), m(z)))); h.stroke();
    for (let i = 0; i < L.length - 1; i++) {
      const [ax, az] = L[i], [bx, bz] = L[i + 1], len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len, nx = -uz, nz = ux;
      const ang = Math.atan2(uz, ux);
      for (let s = 0; s < len; s += 0.34) {
        for (let o = -W / 2 + 0.2; o <= W / 2 - 0.15; o += 0.33) {
          const edge = Math.abs(o) > W / 2 - 0.4;
          const x = ax + ux * (s + (Math.floor(o * 3) % 2) * 0.17) + nx * o + rand(-0.04, 0.04), z = az + uz * (s + (Math.floor(o * 3) % 2) * 0.17) + nz * o + rand(-0.04, 0.04);
          stone(m(x), m(z), (edge ? 0.19 : 0.15) * k, edge ? rand(92, 112) : rand(112, 148), ang, edge ? 1.35 : 1.1);
        }
      }
    }
  }
  // --- meydan: halka halka taş ---
  c.fillStyle = 'rgb(56,48,38)'; c.beginPath(); c.arc(m(0), m(0), (plazaR + 0.4) * k, 0, 7); c.fill();
  h.fillStyle = '#202020'; h.beginPath(); h.arc(m(0), m(0), (plazaR + 0.4) * k, 0, 7); h.fill();
  for (let r = 0.5; r < plazaR; r += 0.36) {
    const n = Math.max(6, Math.round((2 * Math.PI * r) / 0.36)), ring = Math.floor(r / 0.36);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring * 0.13;
      const band = ring % 7 === 3 ? rand(150, 168) : ring % 7 === 4 ? rand(90, 104) : rand(112, 145);
      stone(m(Math.cos(a) * r), m(Math.sin(a) * r), 0.16 * k, band, a + Math.PI / 2, 1.15);
    }
  }
  // --- bina zeminleri: büyük kesme taş plakalar ---
  for (const p of pads) {
    const s = p.s, x0 = p.x - s / 2, z0 = p.z - s / 2;
    c.fillStyle = 'rgba(40,32,24,.55)'; roundRect(c, m(x0) - 0.6 * k, m(z0) - 0.4 * k, (s + 1.2) * k, (s + 1.2) * k, 10); c.fill();
    c.fillStyle = 'rgb(58,50,40)'; c.fillRect(m(x0), m(z0), s * k, s * k);
    h.fillStyle = '#202020'; h.fillRect(m(x0), m(z0), s * k, s * k);
    const t = 0.95;
    for (let zz = 0; zz < s - 0.05; zz += t) {
      const off = (Math.round(zz / t) % 2) * t * 0.5;
      for (let xx = -off; xx < s - 0.05; xx += t) {
        const xa = Math.max(0, xx), xb = Math.min(s, xx + t), w = xb - xa;
        if (w < 0.15) continue;
        const v = rand(118, 152);
        c.fillStyle = `rgb(${v + 10},${v + 1},${v - 14})`;
        c.fillRect(m(x0 + xa) + 1.2, m(z0 + zz) + 1.2, w * k - 2.4, Math.min(t, s - zz) * k - 2.4);
        if (Math.random() < 0.25) { c.fillStyle = 'rgba(80,110,50,.25)'; c.fillRect(m(x0 + xa) + 2, m(z0 + zz) + 2, w * k * rand(0.2, 0.5), 3); }
        h.fillStyle = `rgb(${200 + rand(-20, 20)},${200},${200})`; h.fillRect(m(x0 + xa) + 1.2, m(z0 + zz) + 1.2, w * k - 2.4, Math.min(t, s - zz) * k - 2.4);
      }
    }
    // kenar bordürü
    c.strokeStyle = 'rgb(88,76,62)'; c.lineWidth = 0.32 * k; c.strokeRect(m(x0), m(z0), s * k, s * k);
  }
  // ince toz/kir lekeleri
  for (let i = 0; i < 6000; i++) { c.fillStyle = `rgba(${rand(40, 90)},${rand(32, 70)},${rand(20, 50)},${rand(0.05, 0.18)})`; c.fillRect(Math.random() * S, Math.random() * S, rand(1, 3), rand(1, 3)); }
  const map = new THREE.CanvasTexture(col); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  const nmap = new THREE.CanvasTexture(normalFromHeight(hgt, 3.5)); nmap.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({ map, normalMap: nmap, normalScale: new THREE.Vector2(1.2, 1.2), roughness: 0.9, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(SZ, SZ).rotateX(-Math.PI / 2), mat);
  mesh.position.y = 0.02; mesh.receiveShadow = true; mesh.renderOrder = 1;
  return { mesh, gardens };
}
export function segDist(px, pz, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz; const t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l)) : 0; return Math.hypot(px - ax - dx * t, pz - az - dz * t); }
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
