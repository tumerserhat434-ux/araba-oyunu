// Yanan bina efekti: alev sprite'ları (Higgsfield alev dokusu, siyah zemin → ekleyici karışım), duman ve kıvılcım.
// createFire(size, opts) → { group, update(t, dt), dispose() }. size: binanın yaklaşık genişliği.
import * as THREE from 'three';

let flameTex = null, puffTex = null, emberTex = null;
const flames = () => {
  if (flameTex) return flameTex;
  flameTex = new THREE.TextureLoader().load('assets/ui/fx_flames.webp?v=2611201530');
  flameTex.colorSpace = THREE.SRGBColorSpace;
  return flameTex;
};
const canvasTex = (draw) => { const c = document.createElement('canvas'); c.width = c.height = 64; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const puff = () => puffTex || (puffTex = canvasTex((x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(0.5, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }));
const ember = () => emberTex || (emberTex = canvasTex((x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,200,120,.8)'); g.addColorStop(1, 'rgba(255,120,40,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }));

// dokudaki 4 alevden birini gösteren materyal (2x2 atlas)
function flameMat(i) {
  const t = flames().clone(); t.needsUpdate = true; t.repeat.set(0.5, 0.5); t.offset.set((i % 2) * 0.5, i < 2 ? 0.5 : 0);
  return new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
}

export function createFire(size = 10, opts = {}) {
  const group = new THREE.Group(), R = size * 0.42, H = size * (opts.h ?? 0.55);
  const nF = opts.count ?? 14, nS = opts.smoke ?? 10, nE = opts.embers ?? 12;
  const F = [], Sm = [], E = [];
  for (let i = 0; i < nF; i++) { const s = new THREE.Sprite(flameMat(i % 4)); s.renderOrder = 3; group.add(s); F.push({ s, life: Math.random(), max: 0.7 + Math.random() * 0.6, x: 0, z: 0, k: 0 }); }
  const smokeMat = new THREE.SpriteMaterial({ map: puff(), color: 0x2a2624, transparent: true, depthWrite: false, opacity: 0 });
  for (let i = 0; i < nS; i++) { const s = new THREE.Sprite(smokeMat.clone()); s.renderOrder = 2; group.add(s); Sm.push({ s, life: Math.random() * 2.6, max: 2.6, x: 0, z: 0, vx: 0, vz: 0 }); }
  const eMat = new THREE.SpriteMaterial({ map: ember(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  for (let i = 0; i < nE; i++) { const s = new THREE.Sprite(eMat.clone()); s.renderOrder = 4; group.add(s); E.push({ s, life: Math.random(), max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 }); }
  const light = opts.light ? new THREE.PointLight(0xff7a2a, 0, size * 2.4, 1.6) : null;
  if (light) { light.position.y = H * 0.6; group.add(light); }
  const spot = () => { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * R; return [Math.cos(a) * r, Math.sin(a) * r]; };
  let strength = 1;
  function update(t, dt) {
    dt = Math.min(dt, 0.05);
    for (const f of F) {
      f.life += dt / f.max;
      if (f.life >= 1) { f.life = 0; [f.x, f.z] = spot(); f.k = 0.7 + Math.random() * 0.6; f.max = 0.6 + Math.random() * 0.6; }
      const k = f.life, sz = size * 0.42 * f.k * (k < 0.25 ? 0.6 + k * 1.6 : 1 - (k - 0.25) * 0.75) * strength;
      f.s.position.set(f.x * (1 - k * 0.3), H * 0.15 + k * H * 0.9, f.z * (1 - k * 0.3));
      f.s.scale.set(sz * 0.8, sz, 1);
      f.s.material.opacity = (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85) * 0.95 * strength;
    }
    for (const q of Sm) {
      q.life += dt;
      if (q.life >= q.max) { q.life = 0; [q.x, q.z] = spot(); q.vx = (Math.random() - 0.5) * size * 0.08; q.vz = (Math.random() - 0.5) * size * 0.08; }
      const k = q.life / q.max;
      q.s.position.set(q.x + q.vx * q.life, H * 0.8 + k * size * 1.3, q.z + q.vz * q.life);
      q.s.scale.setScalar(size * (0.35 + k * 0.7));
      q.s.material.opacity = (k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8) * 0.55 * strength;
    }
    for (const e of E) {
      e.life += dt / e.max;
      if (e.life >= 1) { e.life = 0; e.max = 0.8 + Math.random() * 0.8; [e.x, e.z] = spot(); e.y = H * 0.4; e.vx = (Math.random() - 0.5) * size * 0.3; e.vz = (Math.random() - 0.5) * size * 0.3; e.vy = size * (0.5 + Math.random() * 0.5); }
      e.x += e.vx * dt; e.z += e.vz * dt; e.y += e.vy * dt; e.vy -= size * 0.2 * dt;
      e.s.position.set(e.x, e.y, e.z); e.s.scale.setScalar(size * 0.05); e.s.material.opacity = (1 - e.life) * strength;
    }
    if (light) light.intensity = (size * 1.6 + Math.sin(t * 17) * size * 0.3 + Math.sin(t * 7.3) * size * 0.25) * strength;
  }
  function dispose() { group.traverse((o) => { if (o.material) { o.material.map && o.material.map !== puffTex && o.material.map !== emberTex && o.material.map.dispose(); o.material.dispose(); } }); group.removeFromParent(); }
  return { group, update, dispose, setStrength: (v) => { strength = v; } };
}
