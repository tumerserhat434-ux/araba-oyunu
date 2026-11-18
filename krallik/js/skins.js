// =====================================================================
//  DEMİR SANCAK — Belediye binası efektleri (teklif paketleriyle satılır)
//  Şehirde ve dünya haritasındaki şehirde görünür. createSkinFX(id, { R, H })
//  R: binanın yarıçapı, H: yüksekliği. Dönen grubun userData.update(t, dt) her karede çağrılır.
// =====================================================================
import * as THREE from 'three';
import * as A from './assets.js?v=2611181911';

export const SKINS = {
  fireworks: { name: 'Havai Fişek Şöleni', desc: 'Belediye binasının üstünde rengârenk havai fişekler patlar.', color: '#d070ff' },
  crown: { name: 'Altın Taç Aurası', desc: 'Dönen altın rün halkaları, yükselen altın tozları ve süzülen kraliyet tacı.', color: '#ffd060' },
  xmas: { name: 'Yılbaşı Şenliği', desc: 'Yanıp sönen yılbaşı ışıkları, süslü çam ağacı ve yağan kar.', color: '#ff5a5a' },
  aurora: { name: 'Kuzey Işıkları', desc: 'Binanın üstünde dalgalanan kuzey ışıkları ve süzülen buz kristalleri.', color: '#6affc8' },
  dragon: { name: 'Ejder Alevi', desc: 'Binayı saran ateş girdabı, alev sütunları ve uçuşan korlar.', color: '#ff6a2a' },
  shuttle: { name: 'Galaksi Mekiği', desc: 'Binanın etrafında dönen uzay mekiği, hologram halkaları ve yıldız tozu.', color: '#5ad8ff' },
};
export const SKIN_ORDER = ['shuttle', 'dragon', 'aurora', 'xmas', 'crown', 'fireworks'];

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

export function createSkinFX(id, { R = 6, H = 10 } = {}) {
  const g = new THREE.Group(); g.name = 'skinfx'; let tick = () => {};
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
    // yerde dönen altın rün halkaları, yükselen altın tozu, süzülen taç
    const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'); x.translate(256, 256);
    x.strokeStyle = '#ffd860'; x.shadowColor = '#ffb020'; x.shadowBlur = 16;
    for (const [r, w] of [[240, 6], [222, 2], [170, 4], [150, 2]]) { x.lineWidth = w; x.beginPath(); x.arc(0, 0, r, 0, 7); x.stroke(); }
    x.font = 'bold 30px serif'; x.fillStyle = '#ffe890'; const RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
    for (let i = 0; i < 24; i++) { x.save(); x.rotate(i / 24 * Math.PI * 2); x.fillText(RUNES[i], -10, -186); x.restore(); }
    for (let i = 0; i < 6; i++) { x.save(); x.rotate(i / 6 * Math.PI * 2); x.beginPath(); x.moveTo(0, -150); x.lineTo(130, 75); x.stroke(); x.restore(); }
    const rt = new THREE.CanvasTexture(c); rt.colorSpace = THREE.SRGBColorSpace;
    const rm = new THREE.MeshBasicMaterial({ map: rt, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(R * 3, R * 3).rotateX(-Math.PI / 2), rm); ring.position.y = 0.15; g.add(ring);
    const ring2 = new THREE.Mesh(new THREE.PlaneGeometry(R * 1.6, R * 1.6).rotateX(-Math.PI / 2), rm); ring2.position.y = H * 1.55; g.add(ring2);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xffc840, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.35, R * 0.9, H * 2.2, 24, 1, true), beamMat); beam.position.y = H * 1.1; g.add(beam);
    const ct = new THREE.TextureLoader().load('assets/ui/crown.webp'); ct.colorSpace = THREE.SRGBColorSpace;
    const crown = new THREE.Sprite(new THREE.SpriteMaterial({ map: ct, transparent: true, depthWrite: false })); crown.scale.setScalar(H * 0.55); g.add(crown);
    const halo = spr(0xffd060, H * 1.1, 0.7); g.add(halo);
    const N = 70, dust = points(N, 0xffd870, H * 0.12); g.add(dust); const dp = dust.geometry.attributes.position.array, dc = dust.geometry.attributes.color.array, seeds = [];
    for (let i = 0; i < N; i++) { seeds.push([rnd(0, 6.28), rnd(0.2, 1.3), rnd(0, 1)]); dc[i * 3] = 1; dc[i * 3 + 1] = rnd(0.7, 0.9); dc[i * 3 + 2] = 0.35; }
    const L = new THREE.PointLight(0xffc040, 30, R * 5, 1.6); L.position.y = H * 1.2; g.add(L);
    tick = (t) => {
      ring.rotation.y = t * 0.25; ring2.rotation.y = -t * 0.5; beamMat.opacity = 0.14 + Math.sin(t * 2) * 0.05;
      crown.position.y = H * 1.75 + Math.sin(t * 1.6) * H * 0.06; halo.position.copy(crown.position); halo.material.opacity = 0.5 + Math.sin(t * 3) * 0.2;
      for (let i = 0; i < N; i++) { const [a, r, o] = seeds[i], k = (t * 0.25 + o) % 1; dp[i * 3] = Math.cos(a + t * 0.3) * R * r; dp[i * 3 + 1] = k * H * 2; dp[i * 3 + 2] = Math.sin(a + t * 0.3) * R * r; }
      dust.geometry.attributes.position.needsUpdate = true; dust.material.opacity = 0.9;
    };
  } else if (id === 'xmas') {
    // spiral yılbaşı ışıkları (kayan renkler), süslü çam ağacı, tepede yıldız, yağan kar
    const N = 120, bulbGeo = new THREE.SphereGeometry(Math.max(0.12, R * 0.035), 8, 6);
    const bulbs = new THREE.InstancedMesh(bulbGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), N); const m4 = new THREE.Matrix4(), col = new THREE.Color();
    const PAL = [0xff3a3a, 0x3aff6a, 0xffd03a, 0x3a9aff, 0xff6ad0];
    for (let i = 0; i < N; i++) { const k = i / N, a = k * Math.PI * 2 * 5, r = R * (0.95 - k * 0.25); m4.makeTranslation(Math.cos(a) * r, 0.4 + k * H * 0.95, Math.sin(a) * r); bulbs.setMatrixAt(i, m4); bulbs.setColorAt(i, col.set(PAL[i % 5])); }
    g.add(bulbs);
    const glows = []; for (let i = 0; i < 12; i++) { const s = spr(PAL[i % 5], R * 0.45, 0.6); const k = i / 12, a = k * Math.PI * 2 * 5; s.position.set(Math.cos(a) * R * (0.95 - k * 0.25), 0.4 + k * H * 0.95, Math.sin(a) * R * (0.95 - k * 0.25)); g.add(s); glows.push(s); }
    const star = spr(0xffe060, H * 0.45, 1); star.position.y = H * 1.15; g.add(star);
    const SN = 160, snow = points(SN, 0xffffff, H * 0.09, false); g.add(snow); const sp = snow.geometry.attributes.position.array, sc = snow.geometry.attributes.color.array;
    for (let i = 0; i < SN; i++) { sp[i * 3] = rnd(-R * 2.5, R * 2.5); sp[i * 3 + 1] = rnd(0, H * 2.2); sp[i * 3 + 2] = rnd(-R * 2.5, R * 2.5); sc[i * 3] = sc[i * 3 + 1] = sc[i * 3 + 2] = 1; }
    const L = new THREE.PointLight(0xff8a60, 18, R * 4, 1.6); L.position.y = H * 0.6; g.add(L);
    const addTree = lateModel('fx_xmas', (m) => { fitModel(m, H * 0.75); m.position.set(R * 1.25, 0, R * 0.7); g.add(m); });
    tick = (t, dt) => {
      addTree();
      const sh = Math.floor(t * 6);
      for (let i = 0; i < N; i++) bulbs.setColorAt(i, col.set(PAL[(i + sh) % 5]).multiplyScalar((i + sh) % 7 === 0 ? 0.25 : 1));
      bulbs.instanceColor.needsUpdate = true;
      glows.forEach((s, i) => { s.material.color.set(PAL[(i * 10 + sh) % 5]); s.material.opacity = 0.35 + Math.sin(t * 5 + i) * 0.25; });
      star.material.opacity = 0.75 + Math.sin(t * 4) * 0.25; star.scale.setScalar(H * (0.4 + Math.sin(t * 4) * 0.05));
      for (let i = 0; i < SN; i++) { sp[i * 3 + 1] -= dt * H * 0.18; sp[i * 3] += Math.sin(t + i) * dt * 0.4; if (sp[i * 3 + 1] < 0) sp[i * 3 + 1] = H * 2.2; }
      snow.geometry.attributes.position.needsUpdate = true;
    };
  } else if (id === 'aurora') {
    // dalgalanan kuzey ışığı perdeleri (shader) + süzülen buz kristalleri
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { t: { value: 0 } },
      vertexShader: 'uniform float t; varying vec2 vUv; void main(){ vUv=uv; vec3 p=position; p.z+=sin(p.x*0.35+t*0.9)*1.6+sin(p.x*0.8-t*1.3)*0.6; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0); }',
      fragmentShader: 'uniform float t; varying vec2 vUv; void main(){ float band=sin(vUv.x*18.0+t*1.5)*0.5+0.5; float f=smoothstep(0.0,0.25,vUv.y)*(1.0-smoothstep(0.55,1.0,vUv.y)); vec3 c=mix(vec3(0.2,1.0,0.6),vec3(0.65,0.3,1.0),vUv.y+sin(t*0.3+vUv.x*3.0)*0.2); gl_FragColor=vec4(c,(0.18+band*0.3)*f); }',
    });
    const curtains = [];
    for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(R * 3.4, H * 0.9, 48, 1), mat); m.position.set(0, H * (1.5 + k * 0.22), (k - 1) * R * 0.7); m.rotation.y = (k - 1) * 0.5; g.add(m); curtains.push(m); }
    const crysMat = new THREE.MeshStandardMaterial({ color: 0xbff4ff, emissive: 0x3ac8ff, emissiveIntensity: 1.2, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.9 });
    const crys = []; for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(R * 0.16, 0), crysMat); m.scale.y = 1.8; g.add(m); crys.push(m); const s = spr(0x6ae8ff, R * 0.7, 0.5); m.add(s); }
    const SN = 60, dust = points(SN, 0xc8fff0, H * 0.1); g.add(dust); const dp = dust.geometry.attributes.position.array, dc = dust.geometry.attributes.color.array;
    for (let i = 0; i < SN; i++) { dc[i * 3] = 0.6; dc[i * 3 + 1] = 1; dc[i * 3 + 2] = 0.9; }
    const L = new THREE.PointLight(0x5affc0, 20, R * 5, 1.6); L.position.y = H * 1.3; g.add(L);
    tick = (t) => {
      mat.uniforms.t.value = t;
      crys.forEach((m, i) => { const a = i / 8 * Math.PI * 2 + t * 0.35; m.position.set(Math.cos(a) * R * 1.35, H * 0.6 + Math.sin(t * 1.4 + i) * H * 0.12, Math.sin(a) * R * 1.35); m.rotation.y = t * 1.5 + i; });
      for (let i = 0; i < SN; i++) { const a = i * 2.39 + t * 0.2, k = (t * 0.12 + i * 0.13) % 1; dp[i * 3] = Math.cos(a) * R * (0.6 + (i % 4) * 0.25); dp[i * 3 + 1] = H * (0.3 + k * 1.8); dp[i * 3 + 2] = Math.sin(a) * R * (0.6 + (i % 4) * 0.25); }
      dust.geometry.attributes.position.needsUpdate = true; L.intensity = 16 + Math.sin(t * 1.3) * 6;
    };
  } else if (id === 'dragon') {
    // ateş girdabı, köşelerde alev sütunları, yükselen korlar
    const N = 54, flames = [];
    for (let i = 0; i < N; i++) { const s = spr(i % 3 ? 0xff6a20 : 0xffc040, R * rnd(0.4, 0.75), 0.8); g.add(s); flames.push({ s, a: i / N * Math.PI * 2 * 3, o: i / N }); }
    const pillars = []; for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + Math.PI / 4, p = []; for (let j = 0; j < 5; j++) { const s = spr(j < 2 ? 0xffd060 : 0xff4a10, R * (0.55 - j * 0.07), 0.9); s.position.set(Math.cos(a) * R * 1.3, 0.4 + j * H * 0.14, Math.sin(a) * R * 1.3); g.add(s); p.push(s); } pillars.push(p); }
    const EN = 90, emb = points(EN, 0xffffff, H * 0.11); g.add(emb); const ep = emb.geometry.attributes.position.array, ec = emb.geometry.attributes.color.array, es = [];
    for (let i = 0; i < EN; i++) { es.push([rnd(0, 6.28), rnd(0.3, 1.5), rnd(0, 1)]); ec[i * 3] = 1; ec[i * 3 + 1] = rnd(0.3, 0.7); ec[i * 3 + 2] = 0.1; }
    const L = new THREE.PointLight(0xff5a20, 40, R * 5, 1.6); L.position.y = H * 0.5; g.add(L);
    tick = (t) => {
      for (const f of flames) { const k = (f.o + t * 0.18) % 1, a = f.a + t * 2.2; const r = R * (1.25 - k * 0.55); f.s.position.set(Math.cos(a) * r, 0.3 + k * H * 1.3, Math.sin(a) * r); f.s.material.opacity = Math.sin(k * Math.PI) * 0.85; f.s.scale.setScalar(R * (0.75 - k * 0.4)); }
      pillars.forEach((p, k) => p.forEach((s, j) => { const q = 0.8 + Math.sin(t * 12 + k * 3 + j) * 0.2; s.scale.setScalar(R * (0.55 - j * 0.07) * q); s.position.y = 0.4 + j * H * 0.14 * (0.9 + Math.sin(t * 6 + k) * 0.15); }));
      for (let i = 0; i < EN; i++) { const [a, r, o] = es[i], k = (t * 0.3 + o) % 1; ep[i * 3] = Math.cos(a + k * 2) * R * r; ep[i * 3 + 1] = k * H * 2.2; ep[i * 3 + 2] = Math.sin(a + k * 2) * R * r; }
      emb.geometry.attributes.position.needsUpdate = true; L.intensity = 32 + Math.sin(t * 17) * 8 + Math.sin(t * 7) * 6;
    };
  } else if (id === 'shuttle') {
    // binanın etrafında dönen uzay mekiği, motor alevi, hologram halkaları, yıldız tozu
    const pivot = new THREE.Group(); g.add(pivot);
    const ship = new THREE.Group(); pivot.add(ship);
    const trail = []; for (let i = 0; i < 14; i++) { const s = spr(i < 4 ? 0xffe0a0 : 0x5ac8ff, R * (0.5 - i * 0.025), 0.9 - i * 0.06); g.add(s); trail.push(s); }
    const flame = spr(0xffa040, R * 0.6, 1); ship.add(flame);
    const addShip = lateModel('fx_shuttle', (m) => { fitModel(m, H * 0.32); const b = new THREE.Box3().setFromObject(m), c = b.getCenter(new THREE.Vector3()); m.position.sub(c); ship.add(m); });
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x5ad8ff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const rings = [1.5, 1.15].map((k, i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(R * k, R * 0.03, 6, 64), ringMat); m.rotation.x = Math.PI / 2; m.position.y = H * (0.25 + i * 0.75); g.add(m); return m; });
    const pad = new THREE.Mesh(new THREE.RingGeometry(R * 1.2, R * 1.45, 48).rotateX(-Math.PI / 2), ringMat); pad.position.y = 0.12; g.add(pad);
    const SN = 80, stars = points(SN, 0xffffff, H * 0.1); g.add(stars); const sp = stars.geometry.attributes.position.array, sc = stars.geometry.attributes.color.array;
    for (let i = 0; i < SN; i++) { const a = rnd(0, 6.28), r = R * rnd(1, 2.2); sp[i * 3] = Math.cos(a) * r; sp[i * 3 + 1] = rnd(H * 0.3, H * 2.3); sp[i * 3 + 2] = Math.sin(a) * r; const c = new THREE.Color().setHSL(rnd(0.5, 0.7), 0.8, 0.75); sc[i * 3] = c.r; sc[i * 3 + 1] = c.g; sc[i * 3 + 2] = c.b; }
    const L = new THREE.PointLight(0x5ad8ff, 24, R * 5, 1.6); g.add(L);
    const hist = [];
    tick = (t) => {
      addShip();
      const a = t * 0.7, r = R * 1.8, y = H * 1.35 + Math.sin(t * 1.3) * H * 0.18;
      ship.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      ship.rotation.set(0, -a, 0.35); // teğete bak, hafif yatık
      flame.position.set(0, 0, 0); flame.material.opacity = 0.7 + Math.random() * 0.3;
      // motor izi: geçmiş konumlar
      const back = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(-H * 0.14);
      hist.unshift(ship.position.clone().add(back)); if (hist.length > 42) hist.pop();
      trail.forEach((s, i) => { const p = hist[Math.min(hist.length - 1, i * 3)]; if (p) s.position.copy(p); });
      L.position.copy(ship.position);
      rings[0].rotation.z = t * 0.6; rings[1].rotation.z = -t * 0.9; rings[1].position.y = H * (0.9 + Math.sin(t * 1.2) * 0.25);
      ringMat.opacity = 0.4 + Math.sin(t * 3) * 0.15;
      stars.rotation.y = t * 0.08; stars.material.opacity = 0.7 + Math.sin(t * 2) * 0.3;
    };
  }
  g.userData.update = tick;
  return g;
}
