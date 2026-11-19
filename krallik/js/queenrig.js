// Buz Kraliçesi için kodla kurulan iskelet.
// fx_queen.glb?v=2611191911'deki otomatik iskelet modele yanlış bağlanmış (bir kol bacak kemiklerine, diğer kol
// ve eteğin bir kısmı el kemiklerine bağlı), bu yüzden hazır animasyon modeli parçalıyordu.
// Burada modelin gerçek şekline göre yeni kemikler (gövde, baş, iki kolda omuz/dirsek/bilek) kurulur
// ve her nokta yeniden ağırlıklandırılır: etek ve pelerin gövdeye sabit, kollar ve baş hareketli.
// Koordinatlar modelin kendi (bağlama) uzayında: +y yukarı, +x ön, kollar ±z yönünde.
import * as THREE from 'three';

const J = {
  hips: [0, 1.0, 0], spine: [0, 1.2, 0], head: [0.02, 1.4, 0],
  sh: [0.0, 1.33, 0.165], el: [0.05, 1.06, 0.29], wr: [0.16, 0.9, 0.41], tip: [0.2, 0.83, 0.48],
};
const V = (a, s = 1) => new THREE.Vector3(a[0], a[1], a[2] * s);
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// nokta p'nin a-b doğru parçasına uzaklığı ve parçadaki konumu (0..1)
function seg(p, a, b) { const ab = b.clone().sub(a), t = Math.min(1, Math.max(0, p.clone().sub(a).dot(ab) / ab.lengthSq())); return [p.distanceTo(a.clone().addScaledVector(ab, t)), t]; }

let weightCache = null; // aynı geometri için ağırlıklar bir kez hesaplanır
function computeWeights(pos) {
  const n = pos.count, idx = new Uint16Array(n * 4), wt = new Float32Array(n * 4), p = new THREE.Vector3();
  // kemik sırası: 0 hips, 1 spine, 2 head, 3 L-omuz, 4 L-dirsek, 5 L-bilek, 6 R-omuz, 7 R-dirsek, 8 R-bilek
  const arms = [1, -1].map((s) => ({ s, S: V(J.sh, s), E: V(J.el, s), W: V(J.wr, s), T: V(J.tip, s), b: s > 0 ? 3 : 6 }));
  for (let i = 0; i < n; i++) {
    p.fromBufferAttribute(pos, i);
    const w = new Map(); const add = (b, v) => { if (v > 1e-4) w.set(b, (w.get(b) || 0) + v); };
    // gövde: kalça → omurga (geniş geçiş, pelerin yırtılmasın) → baş
    const kSpine = sstep(1.02, 1.28, p.y), kHead = sstep(1.37, 1.47, p.y);
    let body = 1;
    // kol: üç parçaya yakınlık, yumuşak düşüş (iç yarıçap tam kol, dış yarıçapta sıfır)
    for (const A of arms) {
      if (p.z * A.s < 0.1) continue;
      const [d1, t1] = seg(p, A.S, A.E), [d2, t2] = seg(p, A.E, A.W), [d3] = seg(p, A.W, A.T);
      const d = Math.min(d1, d2, d3), az = p.z * A.s;
      let k = 1 - sstep(0.06, 0.1, d);
      if (d3 <= d2 && d3 <= d1) k = Math.max(k, 1 - sstep(0.09, 0.13, d3)); // el ve parmaklar daha geniş
      if (az > 0.36 && p.y > 0.64 && p.x > 0.06) k = 1; // kolun dış ucu tamamen el/bilek (sarkan parmak uçları)
      k *= sstep(0.11, 0.2, az); // omuz başında gövdeyle karışır
      if (k <= 0) continue;
      body -= k;
      if (d3 <= d2 && d3 <= d1) add(A.b + 2, k);
      else if (d2 <= d1) { const e = 1 - sstep(0, 0.2, t2); add(A.b + 1, k * (1 - e * 0.5)); add(A.b, k * e * 0.5); }
      else { const e = sstep(0.8, 1, t1); add(A.b, k * (1 - e * 0.5)); add(A.b + 1, k * e * 0.5); }
    }
    body = Math.max(0, body);
    add(0, body * (1 - kSpine)); add(1, body * kSpine * (1 - kHead)); add(2, body * kSpine * kHead);
    const top = [...w.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4), sum = top.reduce((s, e) => s + e[1], 0) || 1;
    top.forEach(([b, v], k) => { idx[i * 4 + k] = b; wt[i * 4 + k] = v / sum; });
    if (!top.length) { idx[i * 4] = 0; wt[i * 4] = 1; }
  }
  return { idx, wt };
}

// root: hero3d() ile klonlanmış kraliçe sahnesi. Döner: hareket için kemikler.
export function rigQueen(root) {
  let mesh = null; root.traverse((o) => { if (o.isSkinnedMesh && !mesh) mesh = o; });
  if (!mesh) return null;
  mesh.geometry = mesh.geometry.clone();
  const pos = mesh.geometry.attributes.position;
  if (!weightCache || weightCache.n !== pos.count) weightCache = { n: pos.count, ...computeWeights(pos) };
  mesh.geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(weightCache.idx, 4));
  mesh.geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weightCache.wt, 4));
  // Eski iskeletin dinlenme dönüşümü C: model uzayındaki bir noktayı dünyaya taşır (iskelet kökü 0,01 ölçekli).
  // Yeni kemikler C uzayında kurulur ve C ile bağlanır; dinlenmede model aynen eski yerinde/boyunda kalır.
  root.updateMatrixWorld(true);
  const old = mesh.skeleton, C = old.bones[0].matrixWorld.clone().multiply(old.boneInverses[0]).multiply(mesh.bindMatrix);
  const space = new THREE.Group(); mesh.add(space);
  new THREE.Matrix4().copy(mesh.matrixWorld).invert().multiply(C).decompose(space.position, space.quaternion, space.scale);
  const mk = (parent, at, from) => { const b = new THREE.Bone(); b.position.copy(at).sub(from); parent.add(b); return b; };
  const O = new THREE.Vector3();
  const hips = mk(space, V(J.hips), O), spine = mk(hips, V(J.spine), V(J.hips)), head = mk(spine, V(J.head), V(J.spine));
  const arm = (s) => { const sh = mk(spine, V(J.sh, s), V(J.spine)), el = mk(sh, V(J.el, s), V(J.sh, s)), wr = mk(el, V(J.wr, s), V(J.el, s)); return { sh, el, wr }; };
  const L = arm(1), R = arm(-1);
  const bones = [hips, spine, head, L.sh, L.el, L.wr, R.sh, R.el, R.wr];
  root.updateMatrixWorld(true);
  const sk = new THREE.Skeleton(bones);
  mesh.bind(sk, C);
  return { hips, spine, head, L, R };
}

// Poz: idle 0..1 salınım evresi (t), cast 0..1 büyü gücü. Açılar radyan.
const _q = new THREE.Quaternion(), _e = new THREE.Euler();
function setRot(b, x, y, z) { b.quaternion.setFromEuler(_e.set(x, y, z)); }
export function poseQueen(r, t, cast) {
  if (!r) return;
  const sway = Math.sin(t * 1.3), sway2 = Math.sin(t * 1.3 + 1.2);
  for (const [A, s] of [[r.L, 1], [r.R, -1]]) {
    const ph = s > 0 ? sway : sway2;
    // kol yana ve yukarı açılır (x ekseni), büyüde öne uzanır (y ekseni)
    const up = 0.12 + ph * 0.05 + cast * 0.85, fwd = cast * 0.35;
    setRot(A.sh, -s * up, -s * fwd, 0);
    setRot(A.el, -s * (0.1 + cast * 0.25 + ph * 0.04), 0, 0);
    setRot(A.wr, -s * (cast * 0.3 + Math.sin(t * 2.4 + s) * 0.08), 0, s * cast * 0.2);
  }
  setRot(r.head, 0, Math.sin(t * 0.5) * 0.12, -cast * 0.12 + Math.sin(t * 0.9) * 0.03);
  setRot(r.spine, 0, 0, -cast * 0.05);
}
