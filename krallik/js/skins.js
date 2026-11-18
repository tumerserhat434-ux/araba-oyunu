// =====================================================================
//  DEMİR SANCAK — Belediye binası efektleri (teklif paketleriyle satılır)
//  Şehirde ve dünya haritasındaki şehirde görünür. createSkinFX(id, { R, H })
//  R: binanın yarıçapı, H: yüksekliği. Dönen grubun userData.update(t, dt) her karede çağrılır.
// =====================================================================
import * as THREE from 'three';
import * as A from './assets.js?v=2611181948';

export const SKINS = {
  fireworks: { name: 'Havai Fişek Şöleni', desc: 'Belediye binasının üstünde rengârenk havai fişekler patlar.', color: '#d070ff' },
  crown: { name: 'Altın Taç Sarayı', desc: 'Belediye binan altın kubbeli, dev taçlı bir saraya dönüşür; dönen rün halkaları ve süzülen taç.', color: '#ffd060', model: 'th_crown', pulse: 0.1 },
  xmas: { name: 'Yılbaşı Şatosu', desc: 'Belediye binan karlı, şeker kamışı sütunlu bir yılbaşı şatosuna dönüşür; yanıp sönen ışıklar ve yağan kar.', color: '#ff5a5a', model: 'th_xmas', pulse: 0.14 },
  aurora: { name: 'Buz Sarayı', desc: 'Belediye binan parıldayan bir buz sarayına dönüşür; üstünde kuzey ışıkları, etrafında buz kristalleri.', color: '#6affc8', model: 'th_aurora' },
  dragon: { name: 'Ejder Kalesi', desc: 'Belediye binan ejderhanın sarıldığı volkanik bir kaleye dönüşür; ateş girdabı ve uçuşan korlar.', color: '#ff6a2a', model: 'th_dragon', pulse: 0.12 },
  shuttle: { name: 'Galaksi Üssü', desc: 'Belediye binan fırlatma kuleli bir uzay üssüne dönüşür; etrafında dönen mekik ve hologram halkaları.', color: '#5ad8ff', model: 'th_shuttle' },
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
//  Kodla kurulan, hareketli ejderha: başı izleyen boğumlu gövde, çırpan
//  zarlı kanatlar, açılan çene, parlayan gözler. S = gövde boyu.
// ---------------------------------------------------------------------
function makeDragon(S) {
  const group = new THREE.Group();
  const mBody = new THREE.MeshStandardMaterial({ color: 0xb01a1a, roughness: 0.45, metalness: 0.2, emissive: 0x2a0303 });
  const mBelly = new THREE.MeshStandardMaterial({ color: 0xe8a848, roughness: 0.6 });
  const mWing = new THREE.MeshStandardMaterial({ color: 0xb8222a, roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide, emissive: 0x4a0608, transparent: true, opacity: 0.93 });
  const mBone = new THREE.MeshStandardMaterial({ color: 0x3a0606, roughness: 0.5 });
  const mHorn = new THREE.MeshStandardMaterial({ color: 0xf2e6c8, roughness: 0.4 });
  const mEye = new THREE.MeshBasicMaterial({ color: 0xfff060 });
  const sph = new THREE.SphereGeometry(1, 14, 10), cone = new THREE.ConeGeometry(1, 1, 6), cyl = new THREE.CylinderGeometry(1, 1, 1, 6);
  // gövde boğumları (boyun → göğüs → kuyruk)
  const N = 18, segs = [], prof = (i) => (i < 3 ? 0.55 + i * 0.13 : i < 7 ? 1 : Math.max(0.12, 1 - (i - 6) / (N - 6) * 0.95));
  for (let i = 0; i < N; i++) {
    const r = S * 0.075 * prof(i), seg = new THREE.Group();
    const m = new THREE.Mesh(sph, mBody); m.scale.set(r, r * 0.9, r * 1.7); seg.add(m);
    const b = new THREE.Mesh(sph, mBelly); b.scale.set(r * 0.75, r * 0.6, r * 1.5); b.position.y = -r * 0.38; seg.add(b);
    if (i > 1) { const sp = new THREE.Mesh(cone, mHorn); sp.scale.set(r * 0.28, r * 0.8, r * 0.28); sp.position.y = r * 0.95; sp.rotation.x = -0.5; seg.add(sp); }
    seg.userData.r = r; group.add(seg); segs.push(seg);
  }
  // kuyruk ucu: ok başı
  const tip = new THREE.Mesh(cone, mBody); tip.scale.set(S * 0.05, S * 0.12, S * 0.015); tip.rotation.x = Math.PI / 2; segs[N - 1].add(tip); tip.position.z = -S * 0.06;
  // baş
  const head = new THREE.Group(); group.add(head);
  const skull = new THREE.Mesh(sph, mBody); skull.scale.set(S * 0.07, S * 0.06, S * 0.08); head.add(skull);
  const snout = new THREE.Mesh(sph, mBody); snout.scale.set(S * 0.045, S * 0.035, S * 0.09); snout.position.set(0, S * 0.005, S * 0.1); head.add(snout);
  const jaw = new THREE.Group(); jaw.position.set(0, -S * 0.025, S * 0.03); head.add(jaw);
  const jm = new THREE.Mesh(sph, mBelly); jm.scale.set(S * 0.038, S * 0.018, S * 0.085); jm.position.z = S * 0.07; jaw.add(jm);
  for (const sx of [-1, 1]) {
    const hn = new THREE.Mesh(cone, mHorn); hn.scale.set(S * 0.02, S * 0.13, S * 0.02); hn.position.set(sx * S * 0.04, S * 0.06, -S * 0.04); hn.rotation.set(-1.1, 0, sx * 0.35); head.add(hn);
    const e = new THREE.Mesh(sph, mEye); e.scale.setScalar(S * 0.013); e.position.set(sx * S * 0.042, S * 0.025, S * 0.05); head.add(e);
    const eg = spr(0xffd040, S * 0.07, 0.8); eg.position.copy(e.position); head.add(eg);
  }
  // kanatlar: omuzdan yelpaze biçiminde zar + kemikler
  const wings = [];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group(); group.add(pivot);
    const arm = new THREE.Group(); pivot.add(arm);
    const W = S * 0.85;
    const P = [[0, 0, 0.06], [sx * 0.42, 0.1, 0.02], [sx * 0.95, 0.06, -0.12], [sx * 0.72, 0.02, -0.22], [sx * 0.8, 0.0, -0.42], [sx * 0.52, 0.0, -0.4], [sx * 0.5, -0.02, -0.62], [sx * 0.25, 0, -0.42], [0, 0, -0.3]].map(([x, y, z]) => new THREE.Vector3(x * W, y * W, z * W));
    const pos = []; for (let i = 1; i < P.length - 1; i++) pos.push(...P[0].toArray(), ...P[i].toArray(), ...P[i + 1].toArray());
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals();
    const mem = new THREE.Mesh(geo, mWing); mem.castShadow = true; arm.add(mem);
    const bone = (a, b, th) => { const m = new THREE.Mesh(cyl, mBone), d = b.clone().sub(a); m.scale.set(th, d.length(), th); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); arm.add(m); };
    bone(P[0], P[1], S * 0.014); for (const k of [2, 4, 6]) bone(P[1], P[k], S * 0.008);
    wings.push({ pivot, sx });
  }
  const tmpQ = new THREE.Quaternion(), tmpM = new THREE.Matrix4(), up = new THREE.Vector3(0, 1, 0);
  const D = { group, phase: 0, mouthLocal: new THREE.Vector3(0, -S * 0.01, S * 0.2) };
  const sample = (trail, dist) => { let acc = 0; for (let i = 1; i < trail.length; i++) { const d = trail[i].distanceTo(trail[i - 1]); if (acc + d >= dist) return trail[i - 1].clone().lerp(trail[i], (dist - acc) / d); acc += d; } return trail[trail.length - 1].clone(); };
  const look = (obj, from, to, roll = 0) => { tmpM.lookAt(to, from, up); obj.quaternion.setFromRotationMatrix(tmpM); if (roll) obj.quaternion.multiply(tmpQ.setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll)); };
  D.pose = ({ head: hp, fwd, trail, bank, fold, jaw: jw, t }) => {
    // baş: hafif sallanır, ateşte geriye kalkar
    head.position.copy(hp);
    const tgt = hp.clone().add(fwd.clone().add(new THREE.Vector3(0, -0.15 + jw * 0.25 + Math.sin(t * 2.3) * 0.05, 0)));
    look(head, tgt, hp, -bank * 0.5); head.rotateY(Math.PI);
    jaw.rotation.x = 0.1 + jw * 0.75;
    // gövde: başın izinden, her boğum bir öncekine bakar; yılan gibi yana dalgalanır
    let prev = hp.clone().addScaledVector(fwd, -S * 0.07);
    for (let i = 0; i < N; i++) {
      const p = sample(trail, S * (0.09 + i * 0.052));
      const side = new THREE.Vector3().crossVectors(fwd, up).normalize();
      p.addScaledVector(side, Math.sin(t * 3 - i * 0.55) * S * 0.012 * (i / N));
      segs[i].position.copy(p); look(segs[i], prev, p, -bank * (1 - i / N)); segs[i].rotateY(Math.PI);
      prev = p;
    }
    // kanatlar göğüste (3. boğum), çırpma + katlanma
    const chest = segs[3];
    const f = Math.sin(D.phase), flap = (0.15 + 0.85 * fold) * f * 0.95, foldA = (1 - fold) * 1.25;
    for (const w of wings) {
      w.pivot.position.copy(chest.position).add(new THREE.Vector3(0, chest.userData.r * 0.5, 0).applyQuaternion(chest.quaternion));
      w.pivot.quaternion.copy(chest.quaternion);
      w.pivot.children[0].rotation.set(0, w.sx * foldA * 0.6, w.sx * (flap + foldA));
    }
  };
  D.mouth = () => { group.updateWorldMatrix(true, true); const w = head.localToWorld(D.mouthLocal.clone()); return group.parent ? group.parent.worldToLocal(w) : w; };
  return D;
}
export function createSkinFX(id, { R = 6, H = 10, base = null } = {}) {
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
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xffc840, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.35, R * 0.9, H * 2.2, 24, 1, true), beamMat); beam.position.y = H * 1.1; g.add(beam);
    const ct = new THREE.TextureLoader().load('assets/ui/crown.webp'); ct.colorSpace = THREE.SRGBColorSpace;
    const crown = new THREE.Sprite(new THREE.SpriteMaterial({ map: ct, transparent: true, depthWrite: false })); crown.scale.setScalar(H * 0.55);
    const halo = spr(0xffd060, H * 1.1, 0.7); g.add(halo);
    const N = 70, dust = points(N, 0xffd870, H * 0.12); g.add(dust); const dp = dust.geometry.attributes.position.array, dc = dust.geometry.attributes.color.array, seeds = [];
    for (let i = 0; i < N; i++) { seeds.push([rnd(0, 6.28), rnd(0.2, 1.3), rnd(0, 1)]); dc[i * 3] = 1; dc[i * 3 + 1] = rnd(0.7, 0.9); dc[i * 3 + 2] = 0.35; }
    const L = new THREE.PointLight(0xffc040, 12, R * 5, 1.6); L.position.y = H * 1.2; g.add(L);
    tick = (t) => {
      ring.rotation.y = t * 0.25; ring2.rotation.y = -t * 0.5; beamMat.opacity = 0.09 + Math.sin(t * 2) * 0.04;
      crown.position.y = H * 1.75 + Math.sin(t * 1.6) * H * 0.06; halo.position.set(0, H * 1.3, 0); halo.material.opacity = 0.5 + Math.sin(t * 3) * 0.2;
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
    const star = spr(0xffe060, H * 0.45, 1); star.position.y = H * 1.32; g.add(star);
    const SN = 160, snow = points(SN, 0xffffff, H * 0.09, false); g.add(snow); const sp = snow.geometry.attributes.position.array, sc = snow.geometry.attributes.color.array;
    for (let i = 0; i < SN; i++) { sp[i * 3] = rnd(-R * 2.5, R * 2.5); sp[i * 3 + 1] = rnd(0, H * 2.2); sp[i * 3 + 2] = rnd(-R * 2.5, R * 2.5); sc[i * 3] = sc[i * 3 + 1] = sc[i * 3 + 2] = 1; }
    const L = new THREE.PointLight(0xff8a60, 18, R * 4, 1.6); L.position.y = H * 0.6; g.add(L);
    tick = (t, dt) => {
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
    // Canlı ejderha: binanın tepesinde durur → kanat çırparak havalanır → binanın etrafında
    // süzülerek döner ve ateş püskürtür → geri konar. Gövde yılan gibi başı izler.
    const top = H * 1.32, S = H * 0.95; // kostüm tepesi, ejderha boyu
    const D = makeDragon(S); g.add(D.group);
    // ateş nefesi: sprite havuzu
    const fire = [], FN = 90;
    for (let i = 0; i < FN; i++) { const s = spr(0xffa030, S * 0.2, 0); g.add(s); fire.push({ s, life: 0, v: new THREE.Vector3() }); }
    const sparks = points(60, 0xffffff, H * 0.12); g.add(sparks); const spA = sparks.geometry.attributes.position.array, spC = sparks.geometry.attributes.color.array, spV = new Float32Array(180), spL = new Float32Array(60);
    for (let i = 0; i < 60; i++) { spC[i * 3] = 1; spC[i * 3 + 1] = 0.6; spC[i * 3 + 2] = 0.15; spA[i * 3 + 1] = -999; }
    const mouthL = new THREE.PointLight(0xff7a20, 0, S * 2.5, 1.6); g.add(mouthL);
    const EN = 50, emb = points(EN, 0xffffff, H * 0.1); g.add(emb); const ep = emb.geometry.attributes.position.array, ec = emb.geometry.attributes.color.array, es = [];
    for (let i = 0; i < EN; i++) { es.push([rnd(0, 6.28), rnd(0.4, 1.3), rnd(0, 1)]); ec[i * 3] = 1; ec[i * 3 + 1] = rnd(0.3, 0.7); ec[i * 3 + 2] = 0.1; }
    const L = new THREE.PointLight(0xff5a20, 10, R * 4, 1.6); L.position.y = H * 0.5; g.add(L);
    // uçuş durumu
    const CYC = 24, st = { a: Math.random() * 6.28, w: 0, prev: new THREE.Vector3(), fwd: new THREE.Vector3(1, 0, 0), trail: [], bank: 0 };
    const ss = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
    const breathes = [[4.2, 1.0, 'up'], [8.5, 1.5, 'in'], [12.5, 1.5, 'in'], [16.5, 1.6, 'in']];
    let fireAcc = 0;
    const head0 = new THREE.Vector3(0, top, 0);
    for (let i = 0; i < 40; i++) st.trail.push(new THREE.Vector3(-i * S * 0.03, top - i * S * 0.012, 0)); // başlangıçta gövde çatıya uzanır
    tick = (t, dt) => {
      dt = Math.min(dt, 0.05);
      const c = t % CYC;
      // faz zarfları: 0-3 tünek, 3-6 kalkış, 6-19 uçuş, 19-23 iniş, 23-24 tünek
      const up = ss((c - 3) / 3), down = ss((c - 19) / 4), air = up * (1 - down), orbit = ss((c - 6) / 1.5) * (1 - ss((c - 18) / 1.5));
      const wT = 0.62 * air; st.w += (wT - st.w) * Math.min(1, dt * 2); st.a += st.w * dt;
      const r = R * (0.12 + 1.45 * air + 0.2 * orbit * Math.sin(t * 0.7));
      const h = top * (1 - 0.25 * orbit) + (H * 0.12 + H * 0.12 * orbit * Math.sin(t * 0.9)) * air + Math.sin(t * 6) * S * 0.015 * air;
      const pos = new THREE.Vector3(Math.cos(st.a) * r, h, Math.sin(st.a) * r);
      const mv = pos.clone().sub(st.prev);
      if (mv.lengthSq() > 1e-6) { const nf = mv.clone().normalize(); st.fwd.lerp(nf, Math.min(1, dt * 6)).normalize(); }
      st.prev.copy(pos);
      if (!st.trail.length || st.trail[0].distanceTo(pos) > S * 0.012) { st.trail.unshift(pos.clone()); if (st.trail.length > 140) st.trail.pop(); }
      // yatış: dönüş yönüne doğru
      st.bank += ((air > 0.3 ? 0.45 : 0) - st.bank) * Math.min(1, dt * 2);
      // kanat: tünekte katlı, kalkışta hızlı, uçuşta orta, süzülürken yavaş
      const flapSpd = 3 + 7 * up * (1 - orbit) + 4 * orbit + 6 * down * (1 - ss((c - 22.5) / 0.5)), glide = orbit * (Math.sin(t * 0.5) > 0.6 ? 1 : 0);
      D.phase += dt * flapSpd * (1 - glide * 0.85);
      const fold = ss((c - 2.6) / 0.6) * (1 - ss((c - 22.4) / 0.6)); // 1: kanatlar açık, 0: katlı
      // ateş
      let breath = 0, mode = 'in';
      for (const [bt, bd, m] of breathes) if (c >= bt && c < bt + bd) { breath = Math.sin((c - bt) / bd * Math.PI); mode = m; }
      D.pose({ head: pos, fwd: st.fwd, trail: st.trail, bank: st.bank * air, fold, jaw: breath, t });
      const mouth = D.mouth();
      mouthL.position.copy(mouth); mouthL.intensity = breath * 40 + (breath ? Math.random() * 10 : 0);
      if (breath > 0.05) {
        fireAcc += dt * 110;
        // hedef: binanın tepesi (içe) ya da gökyüzü (kükreme)
        const aim = mode === 'up' ? st.fwd.clone().add(new THREE.Vector3(0, 1.4, 0)).normalize() : new THREE.Vector3(0, top * 0.7, 0).sub(mouth).normalize().lerp(st.fwd, 0.25).normalize();
        while (fireAcc > 1) { fireAcc--; const f = fire.find((q) => q.life <= 0); if (!f) break; f.life = f.max = rnd(0.5, 0.8); f.hot = Math.random(); f.s.position.copy(mouth); f.v.copy(aim).multiplyScalar(S * rnd(1.4, 2.0)).add(new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(S * 0.22)); }
      }
      for (const f of fire) {
        if (f.life <= 0) { f.s.material.opacity = 0; continue; }
        f.life -= dt; const k = 1 - f.life / f.max;
        f.s.position.addScaledVector(f.v, dt); f.v.multiplyScalar(0.97); f.v.y += S * 0.25 * dt;
        f.s.material.color.setHSL(Math.max(0, 0.11 - k * 0.12 - f.hot * 0.02), 1, 0.55 - k * 0.3); f.s.material.opacity = Math.sin(Math.min(1, k * 1.25) * Math.PI) * (0.55 - k * 0.2);
        f.s.scale.setScalar(S * (0.06 + k * 0.32) * (0.8 + f.hot * 0.4));
        // binaya çarpan alevden kıvılcım
        if (mode === 'in' && f.s.position.y < top * 0.95 && f.s.position.length() < R * 1.4 && Math.random() < 0.3) {
          for (let j = 0; j < 60; j++) if (spL[j] <= 0) { spL[j] = 0.6; spA[j * 3] = f.s.position.x; spA[j * 3 + 1] = f.s.position.y; spA[j * 3 + 2] = f.s.position.z; spV[j * 3] = rnd(-1, 1) * S * 0.6; spV[j * 3 + 1] = rnd(0.2, 1.2) * S * 0.6; spV[j * 3 + 2] = rnd(-1, 1) * S * 0.6; break; }
          f.life = 0;
        }
      }
      for (let j = 0; j < 60; j++) { if (spL[j] > 0) { spL[j] -= dt; spV[j * 3 + 1] -= S * 1.2 * dt; spA[j * 3] += spV[j * 3] * dt; spA[j * 3 + 1] += spV[j * 3 + 1] * dt; spA[j * 3 + 2] += spV[j * 3 + 2] * dt; if (spL[j] <= 0) spA[j * 3 + 1] = -999; } }
      sparks.geometry.attributes.position.needsUpdate = true;
      for (let i = 0; i < EN; i++) { const [a, rr, o] = es[i], k = (t * 0.25 + o) % 1; ep[i * 3] = Math.cos(a + k * 2) * R * rr; ep[i * 3 + 1] = k * H * 1.6; ep[i * 3 + 2] = Math.sin(a + k * 2) * R * rr; }
      emb.geometry.attributes.position.needsUpdate = true; L.intensity = 8 + Math.sin(t * 17) * 2 + breath * 6;
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
  g.userData.update = (t, dt) => { costumeTick(t, dt); tick(t, dt); };
  return g;
}
