// =====================================================================
//  DEMİR SANCAK — 3D model yükleyici (KayKit, CC0 lisanslı)
//  Binalar/dekor: KayKit Medieval Hexagon Pack, karakterler: KayKit Adventurers
// =====================================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const KK = 'assets/kk/', CH = 'assets/chars/';
const B = (n) => 'building_' + n + '_blue';
export const MODEL_LIST = [
  ...['castle', 'barracks', 'archeryrange', 'tower_A', 'tower_B', 'tower_catapult', 'church', 'tavern', 'market', 'blacksmith', 'windmill', 'lumbermill', 'mine', 'home_A', 'home_B', 'well'].map(B),
  'wall_straight', 'wall_straight_gate', 'wall_corner_A_outside', 'building_scaffolding', 'building_stage_A', 'building_stage_B', 'building_stage_C', 'building_grain', 'fence_wood_straight', 'fence_stone_straight', 'building_dirt',
  'trees_A_large', 'trees_A_medium', 'trees_A_small', 'trees_B_large', 'trees_B_medium', 'tree_single_A', 'tree_single_B', 'rock_single_A', 'rock_single_B', 'rock_single_C', 'rock_single_D',
  'hills_A_trees', 'hills_B_trees', 'mountain_A_grass_trees', 'mountain_B_grass_trees', 'mountain_C_grass_trees', 'cloud_big', 'cloud_small',
  'barrel', 'crate_A_big', 'crate_A_small', 'crate_B_big', 'crate_long_A', 'crate_open', 'flag_blue', 'flag_red', 'sack', 'tent', 'weaponrack', 'target', 'wheelbarrow', 'resource_lumber', 'resource_stone', 'bucket_water', 'bucket_arrows', 'pallet', 'ladder',
];
export const CHAR_LIST = ['Knight', 'Barbarian', 'Rogue', 'Rogue_Hooded', 'Mage'];
// Higgsfield ile özel tasarlanan binalar (assets/hf/<anahtar>.glb)
export const HF_LIST = ['townhall', 'barracks', 'archery', 'hospital', 'potion', 'heroes', 'summon', 'farm', 'lumber', 'quarry', 'warehouse', 'academy', 'tankyard', 'rally', 'forge', 'camp'];
const hf = new Map(), hfSizes = new Map();
export const PART_LIST = ['p_sails', 'p_wheel', 'p_saw', 'p_fountain', 'p_crystal', 'p_armillary', 'p_cart', 'u_tank', 'p_portal'];
const CENTERED = new Set(['p_sails', 'p_wheel', 'p_saw', 'p_crystal']);
export const hasHF = (k) => hf.has(k);
// Gelişmiş seviye modelleri gerektiğinde yüklenir (açılışı yavaşlatmasın)
let hfLoader = null, onHF = null;
const hfLazy = new Map();
export function setOnHFLoaded(cb) { onHF = cb; }
export function ensureHF(k) {
  if (hf.has(k) || hfLazy.has(k) || !hfLoader) return;
  hfLazy.set(k, hfLoader.loadAsync('assets/hf/' + k + '.glb').then((g) => {
    const root = g.scene; prep(root);
    root.traverse((o) => { if (o.isMesh && o.material) { o.material.roughness = 0.8; o.material.metalness = 0; if (o.material.map) { o.material.emissiveMap = o.material.map; o.material.emissive = new THREE.Color(0x40384a); } } });
    const pivot = new THREE.Group(); pivot.add(root); root.rotation.y = -Math.PI / 2; root.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(root), c = b.getCenter(new THREE.Vector3());
    root.position.set(-c.x, -b.min.y, -c.z); pivot.updateMatrixWorld(true);
    hfSizes.set(k, new THREE.Box3().setFromObject(pivot).getSize(new THREE.Vector3()));
    hf.set(k, pivot); onHF?.(k);
  }).catch(() => {}));
}
export function hfModel(k) { const m = hf.get(k); return m ? m.clone(true) : null; }
export const hfSize = (k) => hfSizes.get(k);

const models = new Map(), chars = new Map();
export const ready = { models: false, chars: false };
export const hasModel = (n) => models.has(n);
export const hasChar = (n) => chars.has(n);

function prep(root) {
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true; o.receiveShadow = true;
      if (o.material) { o.material.roughness = Math.min(o.material.roughness ?? 1, 0.85); o.material.metalness = 0; }
    }
  });
}
export async function loadAll(onProgress = () => {}) {
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const total = MODEL_LIST.length + CHAR_LIST.length + HF_LIST.length;
  let done = 0;
  const tick = () => onProgress(++done / total);
  const jobs = MODEL_LIST.map((n) => loader.loadAsync(KK + n + '.gltf').then((g) => { prep(g.scene); models.set(n, g.scene); tick(); }).catch((e) => { console.warn('model yüklenemedi', n, e); tick(); }));
  const cjobs = CHAR_LIST.map((n) => loader.loadAsync(CH + n + '.glb').then((g) => { prep(g.scene); chars.set(n, { scene: g.scene, clips: g.animations }); tick(); }).catch((e) => { console.warn('karakter yüklenemedi', n, e); tick(); }));
  const hjobs = HF_LIST.map((k) => loader.loadAsync('assets/hf/' + k + '.glb').then((g) => {
    const root = g.scene; prep(root);
    root.traverse((o) => { if (o.isMesh && o.material) { o.material.roughness = 0.8; o.material.metalness = 0; if (o.material.map) { o.material.emissiveMap = o.material.map; o.material.emissive = new THREE.Color(0x40384a); } } });
    const pivot = new THREE.Group(); pivot.add(root);
    root.rotation.y = -Math.PI / 2;
    root.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(root), c = b.getCenter(new THREE.Vector3());
    root.position.set(-c.x, -b.min.y, -c.z);
    pivot.updateMatrixWorld(true);
    hfSizes.set(k, new THREE.Box3().setFromObject(pivot).getSize(new THREE.Vector3()));
    hf.set(k, pivot); tick();
  }).catch(() => tick()));
  const pjobs = PART_LIST.map((k) => loader.loadAsync('assets/hf/' + k + '.glb').then((g) => {
    const root = g.scene; prep(root);
    root.traverse((o) => { if (o.isMesh && o.material) { o.material.roughness = 0.6; o.material.metalness = 0; } });
    const pivot = new THREE.Group(); pivot.add(root); root.rotation.y = -Math.PI / 2; root.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(root), c = b.getCenter(new THREE.Vector3());
    root.position.set(-c.x, CENTERED.has(k) ? -c.y : -b.min.y, -c.z); pivot.updateMatrixWorld(true);
    hfSizes.set(k, new THREE.Box3().setFromObject(pivot).getSize(new THREE.Vector3()));
    hf.set(k, pivot);
  }).catch(() => {}));
  await Promise.all(jobs); ready.models = models.size > 0;
  hfLoader = loader;
  await Promise.all(hjobs); await Promise.all(pjobs);
  await Promise.all(cjobs); ready.chars = chars.size > 0;
}
// Statik model kopyası (geometri ve malzemeler paylaşılır)
export function model(n) { const m = models.get(n); return m ? m.clone(true) : null; }
// Renk tonlu kopya (malzemeler klonlanır)
const tintCache = new Map();
export function tinted(n, color) {
  const m = model(n); if (!m) return null;
  m.traverse((o) => {
    if (!o.isMesh) return;
    const k = o.material.uuid + color;
    if (!tintCache.has(k)) { const mm = o.material.clone(); mm.color.multiply(new THREE.Color(color)); tintCache.set(k, mm); }
    o.material = tintCache.get(k);
  });
  return m;
}
export function modelSize(n) { const m = models.get(n); if (!m) return null; return new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3()); }
// Animasyonlu karakter kopyası
export function character(n) {
  const c = chars.get(n); if (!c) return null;
  const scene = SkeletonUtils.clone(c.scene);
  return { scene, clips: c.clips };
}

// ---- Higgsfield kahramanları (animasyonlu, isteğe bağlı yüklenir) ----
const h3 = new Map(), h3p = new Map();
let h3loader = null;
export function loadHero3d(id) {
  if (!h3p.has(id)) {
    h3loader = h3loader || (() => { const l = new GLTFLoader(); l.setMeshoptDecoder(MeshoptDecoder); return l; })();
    h3p.set(id, h3loader.loadAsync('assets/heroes3d/' + id + '.glb').then((g) => {
      const root = g.scene;
      root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; if (o.material) { o.material.roughness = 0.65; o.material.metalness = 0; if (o.material.map) { o.material.map.anisotropy = 8; o.material.map.needsUpdate = true; } } } });
      root.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(root), sz = b.getSize(new THREE.Vector3());
      h3.set(id, { scene: root, clips: g.animations, h: sz.y, minY: b.min.y });
      return true;
    }).catch(() => false));
  }
  return h3p.get(id);
}
export function hero3d(id, height = 1.9) {
  const d = h3.get(id); if (!d) return null;
  const scene = SkeletonUtils.clone(d.scene);
  const k = height / d.h;
  const holder = new THREE.Group();
  scene.scale.setScalar(k); scene.position.y = -d.minY * k; scene.rotation.y = -Math.PI / 2;
  holder.add(scene);
  return { scene: holder, inner: scene, clips: d.clips };
}
