// =====================================================================
//  DEMİR SANCAK — rüzgârda dalgalanan 3D çimen (GPU instancing)
//  Her örnek 5 yapraklı bir çim tutamı; rüzgâr ve esinti dalgaları
//  vertex shader'da hesaplanır, uzaktan bakınca parlayan dalgalar görünür.
// =====================================================================
import * as THREE from 'three';

export const windU = { uTime: { value: 0 }, uWindDir: { value: new THREE.Vector2(0.8, 0.6).normalize() }, uStrength: { value: 1 } };

function clumpGeometry(blades = 5) {
  const pos = [], col = [], nrm = [];
  const base = new THREE.Color(0x4a7a2c), mid = new THREE.Color(0x78b444), tip = new THREE.Color(0xcfe88a);
  for (let b = 0; b < blades; b++) {
    const a = Math.random() * Math.PI * 2, r = Math.random() * 0.22;
    const ox = Math.cos(a) * r, oz = Math.sin(a) * r;
    const h = 0.38 + Math.random() * 0.42, w = 0.07 + Math.random() * 0.04;
    const yaw = Math.random() * Math.PI, lean = (Math.random() - 0.5) * 0.5;
    const cx = Math.cos(yaw), cz = Math.sin(yaw);
    const lx = Math.cos(a) * lean, lz = Math.sin(a) * lean;
    // 3 segmentli sivrilen yaprak: 7 köşe, 5 üçgen
    const seg = [[0, 1], [0.4, 0.75], [0.75, 0.45], [1, 0]];
    const pts = [];
    for (const [t, k] of seg) {
      const y = t * h, bendX = lx * t * t * h, bendZ = lz * t * t * h;
      const hw = (w / 2) * k;
      pts.push([ox + bendX - cx * hw, y, oz + bendZ - cz * hw, t], [ox + bendX + cx * hw, y, oz + bendZ + cz * hw, t]);
    }
    const tri = (i, j, k) => { for (const q of [i, j, k]) { const p = pts[q]; pos.push(p[0], p[1], p[2]); nrm.push(0, 1, 0); const c = p[3] < 0.5 ? base.clone().lerp(mid, p[3] * 2) : mid.clone().lerp(tip, (p[3] - 0.5) * 2); col.push(c.r, c.g, c.b); } };
    tri(0, 1, 2); tri(1, 3, 2); tri(2, 3, 4); tri(3, 5, 4); tri(4, 5, 6);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}
function flowerGeometry() {
  const pos = [], col = [], nrm = [];
  const cols = [new THREE.Color(0xf4f0e0), new THREE.Color(0xffd84a), new THREE.Color(0xe86aa8), new THREE.Color(0x8a7aff)];
  for (let f = 0; f < 3; f++) {
    const a = Math.random() * 6.28, r = Math.random() * 0.25, ox = Math.cos(a) * r, oz = Math.sin(a) * r, h = 0.35 + Math.random() * 0.3;
    const c = cols[Math.floor(Math.random() * cols.length)], stem = new THREE.Color(0x3a6a24);
    const add = (x, y, z, cc) => { pos.push(x, y, z); nrm.push(0, 1, 0); col.push(cc.r, cc.g, cc.b); };
    add(ox - 0.01, 0, oz, stem); add(ox + 0.01, 0, oz, stem); add(ox, h, oz, stem);
    for (let p = 0; p < 5; p++) { const pa = (p / 5) * 6.28, s = 0.06; add(ox, h, oz, c); add(ox + Math.cos(pa) * s, h + 0.01, oz + Math.sin(pa) * s, c); add(ox + Math.cos(pa + 1.26) * s, h + 0.01, oz + Math.sin(pa + 1.26) * s, c); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

function windMaterial() {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, windU);
    sh.vertexShader = 'uniform float uTime; uniform vec2 uWindDir; uniform float uStrength; varying float vGust;\n' + sh.vertexShader.replace('#include <project_vertex>', `
      vec4 mvPosition = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
      #endif
      vec2 wp = mvPosition.xz;
      float along = dot(wp, uWindDir);
      // büyük esinti dalgası + küçük titreşim
      float gust = sin(along * 0.11 - uTime * 1.35) * 0.5 + 0.5;
      gust = gust * gust * (0.6 + 0.4 * sin(dot(wp, vec2(-uWindDir.y, uWindDir.x)) * 0.07 + uTime * 0.4));
      float flutter = sin(uTime * 3.1 + wp.x * 1.7 + wp.y * 1.3) * 0.06 + sin(uTime * 5.3 + wp.y * 2.1) * 0.03;
      float hgt = max(transformed.y, 0.0);
      float bend = hgt * hgt * (0.18 + gust * 0.55 + flutter) * uStrength;
      mvPosition.xz += uWindDir * bend + vec2(-uWindDir.y, uWindDir.x) * flutter * hgt * 0.5;
      mvPosition.y -= bend * bend * 0.35;
      vGust = gust * min(hgt * 1.4, 1.0);
      mvPosition = modelViewMatrix * mvPosition;
      gl_Position = projectionMatrix * mvPosition;`);
    sh.fragmentShader = 'varying float vGust;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= 0.92 + vGust * 0.42;');
  };
  return m;
}

// avoid(x,z) true → oraya çim koyma. Parçalar (chunk) halinde, frustum culling çalışsın diye.
export function createGrass(scene, { radius = 74, avoid = () => false, density = 1.1, outerDensity = 0.5, innerR = 42, chunk = 14, mobile = false } = {}) {
  const geos = [clumpGeometry(5), clumpGeometry(5), clumpGeometry(4)];
  const fgeo = flowerGeometry();
  const mat = windMaterial();
  const k = mobile ? 0.6 : 1;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
  const group = new THREE.Group();
  let total = 0;
  for (let cx = -radius; cx < radius; cx += chunk) for (let cz = -radius; cz < radius; cz += chunk) {
    const lists = [[], [], []], flowers = [];
    const centerD = Math.hypot(cx + chunk / 2, cz + chunk / 2);
    if (centerD > radius + chunk) continue;
    const d = (centerD < innerR ? density : outerDensity) * k;
    const n = Math.round(chunk * chunk * d);
    for (let i = 0; i < n; i++) {
      const x = cx + Math.random() * chunk, z = cz + Math.random() * chunk;
      const rr = Math.hypot(x, z);
      if (rr > radius - 2 || avoid(x, z)) continue;
      const sc = 0.75 + Math.random() * 0.5 + (rr > innerR ? 0.3 : 0);
      e.set(0, Math.random() * 6.28, 0); q.setFromEuler(e);
      m4.compose(v.set(x, 0, z), q, s.set(sc, sc * (0.85 + Math.random() * 0.35), sc));
      (Math.random() < 0.025 ? flowers : lists[i % 3]).push(m4.clone());
    }
    const addIM = (geo, arr) => {
      if (!arr.length) return;
      const im = new THREE.InstancedMesh(geo, mat, arr.length);
      arr.forEach((M, i) => im.setMatrixAt(i, M));
      im.receiveShadow = true; im.castShadow = false;
      im.computeBoundingSphere();
      im.boundingSphere.radius += 1.5;
      group.add(im); total += arr.length;
    };
    lists.forEach((arr, i) => addIM(geos[i], arr));
    addIM(fgeo, flowers);
  }
  scene.add(group);
  return { group, total, update(t) { windU.uTime.value = t; } };
}
