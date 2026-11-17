// =====================================================================
//  DEMİR SANCAK — 3D katman sahneleri: savaş, çağırma, kahraman görüntüleyici
// =====================================================================
import * as THREE from 'three';
import * as BLD from './buildings.js';
import { createSoldier, createHero, animateUnit } from './units.js';
import { TROOPS, HEROES, HERO_BY_ID, RARITY, SUMMON, heroBonus, heroLevelCost } from './data.js';
import * as G from './state.js';
import { setTheme } from './audio.js';

let C = null; // main.js bağlamı
let active = null; // { scene, camera, update(dt,t), close() }
const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => t * t * (3 - 2 * t);
const stars = (n) => '★'.repeat(n);
const ov = () => $('overlay');

export function initScenes(ctx) { C = ctx; }
export const sceneActive = () => !!active;
export function renderActive(dt, t) {
  if (!active) return false;
  active.update(dt, t);
  C.renderer.render(active.scene, active.camera);
  return true;
}
function open(obj, theme = 'city') {
  setTheme(theme);
  if (active) active.dispose?.();
  active = obj;
  ['top', 'side', 'nav', 'labels', 'rside', 'bottomHud'].forEach((id) => $(id).classList.add('hidden'));
  ov().classList.remove('hidden');
  addEventListener('resize', onResize);
  onResize();
}
function close() {
  if (!active) return;
  active.dispose?.();
  active = null;
  ov().classList.add('hidden'); ov().innerHTML = '';
  ['top', 'side', 'nav', 'labels', 'rside', 'bottomHud'].forEach((id) => $(id).classList.remove('hidden'));
  removeEventListener('resize', onResize);
  setTheme('city');
  C.onSceneClosed();
}
function onResize() { if (active) { active.camera.aspect = innerWidth / innerHeight; active.camera.updateProjectionMatrix(); } }

function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
let glowTex = null;
function glow() {
  if (!glowTex) glowTex = canvasTex(128, 128, (ctx) => { const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128); }, false);
  return glowTex;
}
function sprite(color, scale, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity }));
  s.scale.setScalar(scale); return s;
}
function disposeScene(scene) {
  scene.traverse((o) => { if (o.isSprite) o.material.dispose(); });
}

// =====================================================================
//  SAVAŞ
// =====================================================================
let grassTex = null;
export function openBattle(opts) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa8cfe6);
  scene.fog = new THREE.Fog(0xc0d8e6, 60, 160);
  scene.environment = C.makeEnv();
  scene.environmentIntensity = 0.7;
  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.5, 400);
  const sun = new THREE.DirectionalLight(0xfff0d6, 2.6); sun.position.set(20, 40, 18); sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 5, far: 120 }); sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005;
  scene.add(sun, new THREE.HemisphereLight(0xcfe6ff, 0x6a5a3a, 1.0));
  if (!grassTex) {
    grassTex = canvasTex(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#668f3e'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 6000; i++) { ctx.fillStyle = ['#4f7f30', '#7aac4a', '#5a8a34', '#8ab656', '#6a5a3a'][i % 5]; ctx.globalAlpha = rand(0.2, 0.8); ctx.fillRect(Math.random() * w, Math.random() * h, rand(1, 3), rand(1, 3)); }
      ctx.globalAlpha = 1;
    });
    grassTex.repeat.set(30, 30);
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }));
  ground.receiveShadow = true; scene.add(ground);
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * 6.28, r = rand(30, 70), t = BLD.createTree(Math.floor(Math.random() * 4));
    t.position.set(Math.cos(a) * r, 0, Math.sin(a) * r - 10); t.rotation.y = rand(0, 6); scene.add(t);
  }
  for (let i = 0; i < 14; i++) { const rk = BLD.createRock(rand(0.4, 1.2)); rk.position.set(rand(-26, 26), 0, rand(-14, 10)); if (Math.abs(rk.position.z) < 9 && Math.abs(rk.position.x) < 18) continue; scene.add(rk); }

  // tarafları belirle: oyuncu her zaman mavi
  const blueIsAtt = opts.mode === 'attack';
  const sides = {
    blue: { troops: blueIsAtt ? opts.attacker.troops : opts.defender.troops, sign: blueIsAtt ? -1 : 1, remain: blueIsAtt ? opts.result.aRemainRatio : opts.result.dRemainRatio },
    red: { troops: blueIsAtt ? opts.defender.troops : opts.attacker.troops, sign: blueIsAtt ? 1 : -1, remain: blueIsAtt ? opts.result.dRemainRatio : opts.result.aRemainRatio },
  };
  const defenderTeam = blueIsAtt ? 'red' : 'blue';
  const towerLvl = Math.round(opts.defender.tower || 0);
  const towers = [];
  if (towerLvl > 0) {
    for (const z of [-7, 7]) {
      const tw = BLD.createBuilding('archery', clamp(towerLvl, 1, 10)); tw.position.set(sides[defenderTeam].sign * 20, 0, z); tw.rotation.y = -sides[defenderTeam].sign * Math.PI / 2; scene.add(tw);
      towers.push({ obj: tw, top: new THREE.Vector3(tw.position.x, (tw.userData.topY || 8) + 1.5, z), cd: rand(0.5, 1.5) });
    }
  }
  if (!blueIsAtt) { // kendi surlarımız arkada
    const w = BLD.createWall(30, Math.max(1, G.thLevel())); w.position.set(24, 0, 0); w.rotation.y = Math.PI / 2; scene.add(w);
  }

  // birimler
  const teamRingGeo = new THREE.RingGeometry(0.42, 0.56, 24);
  const teamRingBlue = new THREE.MeshBasicMaterial({ color: 0x3a8aff, transparent: true, opacity: 0.85, depthWrite: false });
  const teamRingRed = new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.85, depthWrite: false });
  const units = [];
  const MAXU = 24;
  for (const team of ['blue', 'red']) {
    const s = sides[team], tot = G.totalTroops(s.troops) || 1;
    const N = clamp(Math.round(Math.sqrt(tot) * 1.6), 4, MAXU);
    const counts = {}; let used = 0;
    for (const t in s.troops) { counts[t] = s.troops[t] > 0 ? Math.max(1, Math.round(N * s.troops[t] / tot)) : 0; used += counts[t]; }
    const slots = { infantry: [], spearman: [], archer: [], cavalry: [] };
    let row = 0;
    for (const t of ['infantry', 'spearman', 'cavalry', 'archer']) {
      for (let i = 0; i < counts[t]; i++) {
        let x, z;
        const col = i % 6, r = Math.floor(i / 6);
        if (t === 'archer') { x = s.sign * (15 + r * 1.6); z = (col - 2.5) * 2.0; }
        else if (t === 'cavalry') { const side = i % 2 ? 1 : -1; x = s.sign * (11 + Math.floor(i / 2) % 2 * 2.5); z = side * (8 + Math.floor(i / 4) * 2.6); }
        else { x = s.sign * (9 + (row + r) * 1.6); z = (col - 2.5) * 1.9; }
        const o = createSoldier(t, team);
        const ring = new THREE.Mesh(teamRingGeo, team === 'blue' ? teamRingBlue : teamRingRed); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; ring.scale.setScalar(t === 'cavalry' ? 1.5 : 1); o.add(ring);
        o.position.set(x + rand(-0.3, 0.3), 0, z + rand(-0.3, 0.3));
        o.rotation.y = -s.sign * Math.PI / 2;
        scene.add(o);
        units.push({ obj: o, team, type: t, alive: true, state: 'idle', phase: rand(0, 5), target: null, cd: rand(0.3, 1.5), ranged: t === 'archer' });
      }
      if (t === 'infantry' && counts[t]) row += Math.ceil(counts[t] / 6);
    }
  }
  const N0 = { blue: units.filter((u) => u.team === 'blue').length, red: units.filter((u) => u.team === 'red').length };
  const T0 = { blue: G.totalTroops(sides.blue.troops), red: G.totalTroops(sides.red.troops) };

  // oklar
  const arrows = [];
  const arrowGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.9, 4).rotateX(Math.PI / 2);
  const arrowMat = new THREE.MeshStandardMaterial({ color: 0x5a4028 });
  const shoot = (from, toObj) => {
    const m = new THREE.Mesh(arrowGeo, arrowMat); scene.add(m);
    const to = toObj.position.clone(); to.y = 1.1;
    arrows.push({ m, from: from.clone(), to, t: 0, d: 0.7 + from.distanceTo(to) * 0.02 });
  };
  // toz/kıvılcım
  const sparks = [];
  for (let i = 0; i < 24; i++) { const s = sprite(0xffd890, 0.5, 0); scene.add(s); sparks.push({ s, life: 0 }); }
  const spark = (p) => { const f = sparks.find((q) => q.life <= 0); if (!f) return; f.s.position.copy(p); f.s.position.y = 1.2; f.life = 0.25; };

  // arayüz
  const win = opts.mode === 'attack' ? opts.result.win : !opts.result.win;
  ov().innerHTML = `<div class="ov-top"><div class="ov-title">${opts.mode === 'attack' ? '⚔ ' + opts.title : '🛡️ ' + opts.title + ' saldırıyor!'}</div><button class="btn gray" id="bSkip" style="padding:8px 12px;font-size:13px">Geç ⏭</button></div>
    <div class="ov-bottom" id="bHud">
      <div class="armybar blue"><span>🔵 <b id="bBlue">${T0.blue}</b></span><div class="hp"><span id="bBlueHp" style="width:100%"></span></div></div>
      <div class="armybar red"><span>🔴 <b id="bRed">${T0.red}</b></span><div class="hp"><span id="bRedHp" style="width:100%"></span></div></div>
    </div>`;
  let T = 0, done = false;
  const finish = () => {
    if (done) return; done = true;
    C.sfx(win ? 'win' : 'lose');
    const r = opts.report, tot = (o) => G.fmt(G.totalTroops(o || {}));
    const loot = r.loot || {};
    $('bHud').innerHTML = `<div class="modal-box" style="max-width:none;animation:pop .3s">
      <h2 class="cinzel" style="margin:0 0 6px;text-align:center;font-size:30px;color:${win ? 'var(--gold)' : '#ff7a6a'}">${win ? 'ZAFER!' : 'YENİLGİ'}</h2>
      <div class="stats">
        <div class="stat"><small>Kayıpların</small><b>${tot(r.aLoss)}</b><br><small>🤕 ${tot(r.wounded)} yaralı • 💀 ${tot(r.dead)} ölü</small></div>
        <div class="stat"><small>Düşman kaybı</small><b>${tot(r.dLoss)}</b></div>
      </div>
      ${r.kind === 'attack' && win ? `<div class="cost" style="justify-content:center">🌾 ${G.fmt(loot.food || 0)} 🪵 ${G.fmt(loot.wood || 0)} 🪨 ${G.fmt(loot.stone || 0)} 🪙 ${loot.gold || 0}</div>` : ''}
      ${r.kind === 'defense' && !win ? `<div class="why" style="text-align:center">Yağmalanan: 🌾 ${G.fmt(loot.food || 0)} 🪵 ${G.fmt(loot.wood || 0)} 🪨 ${G.fmt(loot.stone || 0)}</div>` : ''}
      ${G.totalTroops(r.wounded) ? '<p class="desc" style="text-align:center;margin:4px 0 8px">Yaralılar hastanede. İyileştirmeyi unutma!</p>' : ''}
      <button class="btn gold" style="width:100%" id="bBack">🏰 Şehre dön</button></div>`;
    $('bBack').onclick = close;
  };
  $('bSkip').onclick = () => { T = 11; };
  C.sfx('horn');

  const camAng = { a: 0 };
  const update = (dt, t) => {
    T += dt;
    camAng.a += dt * 0.05;
    const ca = Math.sin(camAng.a) * 0.3;
    if (innerWidth < innerHeight) {
      const bs = sides.blue.sign;
      camera.position.set(bs * (30 + Math.cos(ca) * 2), 19, Math.sin(ca) * 10 + 6);
      camera.lookAt(-bs * 2, 0, 0);
    } else {
      camera.position.set(Math.sin(ca) * 34, 17, Math.cos(ca) * 34);
      camera.lookAt(0, 1, 0);
    }
    const p = clamp((T - 2.6) / 7, 0, 1), ep = ease(p);
    // ölüm kontrolü
    for (const team of ['blue', 'red']) {
      const want = Math.round(N0[team] * lerp(1, sides[team].remain, ep));
      let alive = units.filter((u) => u.team === team && u.alive);
      while (alive.length > want && T > 2.6) {
        const engaged = alive.filter((u) => u.state === 'attack');
        const pool = engaged.length ? engaged : alive;
        const u = pool[Math.floor(Math.random() * pool.length)];
        u.alive = false; u.state = 'die';
        alive = alive.filter((v) => v !== u);
      }
      const shown = Math.round(lerp(T0[team], T0[team] * sides[team].remain, ep));
      const el = $(team === 'blue' ? 'bBlue' : 'bRed'); if (el) el.textContent = G.fmt(shown);
      const hp = $(team === 'blue' ? 'bBlueHp' : 'bRedHp'); if (hp) hp.style.width = (lerp(1, sides[team].remain, ep) * 100) + '%';
    }
    // birim davranışı
    for (const u of units) {
      if (u.alive && T > 1.2 && T < 10.5) {
        const foes = units.filter((v) => v.team !== u.team && v.alive);
        if (!foes.length) { u.state = 'idle'; }
        else {
          if (!u.target || !u.target.alive) {
            let best = null, bd = 1e9;
            for (const f of foes) { const d = f.obj.position.distanceToSquared(u.obj.position); if (d < bd) { bd = d; best = f; } }
            u.target = best;
          }
          const tp = u.target.obj.position, me = u.obj.position;
          const dx = tp.x - me.x, dz = tp.z - me.z, d = Math.hypot(dx, dz);
          u.obj.rotation.y = Math.atan2(dx, dz);
          if (u.ranged) {
            u.state = 'attack'; u.cd -= dt;
            if (u.cd <= 0 && d < 40) { u.cd = rand(1.0, 1.6); shoot(new THREE.Vector3(me.x, 1.5, me.z), u.target.obj); }
          } else if (d > (u.type === 'cavalry' ? 2.2 : 1.4)) {
            const sp = u.type === 'cavalry' ? 7 : 3.4;
            me.x += dx / d * sp * dt; me.z += dz / d * sp * dt;
            u.state = u.type === 'cavalry' || d > 6 ? 'run' : 'walk';
          } else {
            u.state = 'attack'; u.cd -= dt;
            if (u.cd <= 0) { u.cd = rand(0.6, 1.1); spark(tp.clone().lerp(me, 0.5)); if (Math.random() < 0.25) C.sfx('clash'); }
          }
        }
      } else if (u.alive && T >= 10.5) {
        const winnerTeam = win ? 'blue' : 'red';
        u.state = u.team === winnerTeam ? 'cheer' : 'idle';
      }
      animateUnit(u.obj, u.state, t + u.phase, dt);
    }
    // kuleler
    for (const tw of towers) {
      tw.obj.userData.update?.(t, dt);
      if (T < 1.2 || T > 10.5) continue;
      tw.cd -= dt;
      if (tw.cd <= 0) {
        tw.cd = rand(0.4, 0.9);
        const foes = units.filter((v) => v.team !== defenderTeam && v.alive);
        if (foes.length) shoot(tw.top, foes[Math.floor(Math.random() * foes.length)].obj);
      }
    }
    // oklar
    for (let i = arrows.length - 1; i >= 0; i--) {
      const a = arrows[i]; a.t += dt / a.d;
      if (a.t >= 1) { scene.remove(a.m); arrows.splice(i, 1); continue; }
      const pos = a.from.clone().lerp(a.to, a.t); pos.y += Math.sin(a.t * Math.PI) * (2 + a.from.distanceTo(a.to) * 0.12);
      const nxt = a.from.clone().lerp(a.to, Math.min(1, a.t + 0.02)); nxt.y += Math.sin(Math.min(1, a.t + 0.02) * Math.PI) * (2 + a.from.distanceTo(a.to) * 0.12);
      a.m.position.copy(pos); a.m.lookAt(nxt);
    }
    for (const f of sparks) { if (f.life > 0) { f.life -= dt; f.s.material.opacity = Math.max(0, f.life * 4); f.s.scale.setScalar(0.4 + (0.25 - f.life) * 4); } }
    if (T > 11.2) finish();
  };
  open({ scene, camera, update, dispose: () => disposeScene(scene) }, 'battle');
}

// =====================================================================
//  ÇAĞIRMA ATÖLYESİ
// =====================================================================
let summonCtx = null;
function buildSummonScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x120a20);
  scene.fog = new THREE.FogExp2(0x120a20, 0.035);
  scene.environment = C.makeEnv(0x4a2a8a, 0x2a1a40, 0x0a0614, false);
  scene.environmentIntensity = 1.0;
  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 200);
  camera.position.set(0, 2.2, 7.5); camera.lookAt(0, 1.3, 0);
  scene.add(new THREE.HemisphereLight(0x8a7aff, 0x1a1020, 0.8));
  const key = new THREE.SpotLight(0xfff0e0, 60, 20, 0.6, 0.6, 1.2); key.position.set(2.5, 7, 4); key.target.position.set(0, 1, 0); key.castShadow = true; scene.add(key, key.target);
  const rim = new THREE.PointLight(0xb06bff, 30, 12, 1.5); rim.position.set(0, 2.5, -2.5); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xf0e8ff, 1.4); fill.position.set(0, 2, 8); scene.add(fill);
  // zemin: rün dairesi
  const rune = canvasTex(512, 512, (ctx) => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
    for (const r of [240, 200, 120]) { ctx.beginPath(); ctx.arc(256, 256, r, 0, 7); ctx.stroke(); }
    ctx.font = 'bold 28px serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    const glyphs = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; ctx.save(); ctx.translate(256 + Math.cos(a) * 220, 256 + Math.sin(a) * 220); ctx.rotate(a + Math.PI / 2); ctx.fillText(glyphs[i], 0, 10); ctx.restore(); }
    ctx.beginPath(); for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI * 2 * 2; const x = 256 + Math.cos(a) * 190, y = 256 + Math.sin(a) * 190; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
  }, false);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1a1428, roughness: 0.6, metalness: 0.3 }));
  floor.receiveShadow = true; scene.add(floor);
  const runeMat = new THREE.MeshBasicMaterial({ map: rune, color: new THREE.Color(0.9, 0.5, 2.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const runeMesh = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 5.5).rotateX(-Math.PI / 2), runeMat); runeMesh.position.y = 0.02; scene.add(runeMesh);
  // kaide
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.35, 32), new THREE.MeshStandardMaterial({ color: 0x3a3048, roughness: 0.4, metalness: 0.6 }));
  ped.position.y = 0.175; ped.castShadow = ped.receiveShadow = true; scene.add(ped);
  const pedRim = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.04, 8, 48).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 1.4, 0.5) })); pedRim.position.y = 0.36; scene.add(pedRim);
  // portal halkası
  const portal = new THREE.Group(); portal.position.set(0, 2.2, -1.2); scene.add(portal);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x2a2038, metalness: 0.9, roughness: 0.3, emissive: 0x6a2aff, emissiveIntensity: 0.6 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.12, 12, 64), ringMat); portal.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.04, 8, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 0.8, 3) })); portal.add(ring2);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.68, 48), new THREE.MeshBasicMaterial({ map: glow(), color: new THREE.Color(0.6, 0.3, 1.4), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 })); portal.add(disc);
  // yüzen kristaller
  const crystals = [];
  const cg = new THREE.OctahedronGeometry(0.25, 0);
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ color: 0x8a6aff, emissive: 0x6a3aff, emissiveIntensity: 1.5, metalness: 0.2, roughness: 0.1 }));
    m.scale.set(1, 1.8, 1); scene.add(m); crystals.push({ m, a: (i / 8) * Math.PI * 2, r: 3 + (i % 2) * 0.6, y: 1 + (i % 3) * 0.7 });
  }
  // parçacıklar
  const PN = 300, pg = new THREE.BufferGeometry(), pp = new Float32Array(PN * 3);
  for (let i = 0; i < PN; i++) { pp[i * 3] = rand(-6, 6); pp[i * 3 + 1] = rand(0, 7); pp[i * 3 + 2] = rand(-6, 4); }
  pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const parts = new THREE.Points(pg, new THREE.PointsMaterial({ map: glow(), color: new THREE.Color(1.2, 0.8, 2.4), size: 0.12, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(parts);
  // ışık sütunu
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.3, 14, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 7; scene.add(beam);
  const flash = sprite(0xffffff, 0.1, 0); flash.position.set(0, 1.5, 0); scene.add(flash);
  const aura = sprite(0xffffff, 4, 0); aura.position.set(0, 1.2, -0.3); scene.add(aura);
  return { scene, camera, portal, ring, ring2, disc, crystals, parts, beam, flash, aura, runeMesh, rim, heroSlot: null, spin: 0 };
}
export function openSummon() {
  if (!summonCtx) summonCtx = buildSummonScene();
  const S = summonCtx;
  if (S.heroSlot) { S.scene.remove(S.heroSlot); S.heroSlot = null; }
  let phase = 'idle', pT = 0, queue = [], results = [], idx = 0;
  const ui = () => {
    const free = G.freePullAvailable();
    ov().innerHTML = `<div class="ov-top"><div class="ov-title">🔮 Çağırma Atölyesi</div><div class="row" style="align-items:center"><div class="res gold" id="sGold"><i>🪙</i><span>${G.fmt(G.S.res.gold)}</span><b>+</b></div><button class="x" id="sClose">✕</button></div></div>
      <div class="ov-bottom">
        <div style="text-align:center;font-weight:900;text-shadow:0 2px 4px #000;font-size:13px">5★ garantiye: <span style="color:var(--r5)">${SUMMON.pity5 - G.S.pity5}</span> çağırma • Her 10 çağırmada en az 1 adet 4★</div>
        <div style="text-align:center;font-size:12px;color:#d8c8f0;text-shadow:0 1px 3px #000"><span style="color:var(--r5)">5★ %0,6</span> • <span style="color:var(--r4)">4★ %5,4</span> • <span style="color:var(--r3)">3★ %26</span> • <span style="color:var(--r2)">2★ %68</span></div>
        ${free ? '<button class="btn" id="sFree">🎁 Günlük ücretsiz çağırma</button>' : ''}
        <div class="row"><button class="btn purple" id="s1">1x Çağır<br>🪙 ${SUMMON.cost1}</button><button class="btn gold" id="s10">10x Çağır<br>🪙 ${SUMMON.cost10}</button></div>
      </div>`;
    $('sClose').onclick = close;
    $('sGold').onclick = () => { close(); C.navigate('shop'); };
    $('s1').onclick = () => pull(1, false);
    $('s10').onclick = () => pull(10, false);
    if (free) $('sFree').onclick = () => pull(1, true);
  };
  const pull = (n, free) => {
    if (phase !== 'idle') return;
    const r = G.summon(n, free);
    if (!r.ok) { C.toast(r.why, true); if (r.needGold) setTimeout(() => { close(); C.navigate('shop'); }, 600); return; }
    results = r.results; queue = results.filter((x) => n === 1 || x.rarity >= 4).sort((a, b) => b.rarity - a.rarity); idx = 0;
    const best = Math.max(...results.map((x) => x.rarity));
    phase = 'charge'; pT = 0;
    S.bestColor = new THREE.Color(RARITY[best].color);
    S.best = best;
    if (S.heroSlot) { S.scene.remove(S.heroSlot); S.heroSlot = null; }
    ov().innerHTML = `<div class="ov-top"><div class="ov-title">🔮 Çağırılıyor…</div><button class="btn gray" id="sSkip" style="padding:8px 12px;font-size:13px">Geç ⏭</button></div>`;
    $('sSkip').onclick = () => { queue = []; showGrid(); };
    C.sfx('summon');
    C.updateTop();
    setTimeout(() => C.event?.('summoned'), 300);
  };
  const showHero = (r) => {
    const h = HERO_BY_ID[r.id];
    if (S.heroSlot) S.scene.remove(S.heroSlot);
    const m = createHero(h); m.position.set(0, 0.35, 0); m.rotation.y = 0;
    S.scene.add(m); S.heroSlot = m; S.heroState = 'cheer'; S.heroT = 0;
    S.aura.material.color.set(RARITY[r.rarity].color).multiplyScalar(1.6); S.aura.material.opacity = 0.9;
    C.sfx(r.rarity >= 4 ? 'reveal5' : 'reveal');
    ov().innerHTML = `<div class="reveal"><div class="rs" style="color:${RARITY[r.rarity].color}">${stars(r.rarity)}</div>
      <div class="rn" style="color:${RARITY[r.rarity].color}">${h.name}</div><div class="rt">${h.title} • ${RARITY[r.rarity].name}</div>
      ${r.isNew ? '<div class="new">YENİ!</div>' : `<div class="new" style="background:#5a3aa0">Kopya → yetenek gücü +1</div>`}</div>
      <div class="ov-bottom"><button class="btn gold" id="sNext">${idx < queue.length - 1 || results.length > 1 ? 'Devam ▶' : 'Tamam'}</button></div>`;
    $('sNext').onclick = () => { idx++; if (idx < queue.length) showHero(queue[idx]); else if (results.length > 1) showGrid(); else { phase = 'idle'; ui(); } };
  };
  const showGrid = () => {
    phase = 'grid';
    if (S.heroSlot) { S.scene.remove(S.heroSlot); S.heroSlot = null; }
    S.aura.material.opacity = 0; S.beam.material.opacity = 0;
    const cards = results.map((r, i) => { const h = HERO_BY_ID[r.id]; return `<div class="hcard" style="--rc:${RARITY[r.rarity].color};animation-delay:${i * 0.08}s"><div class="ph" data-portrait="${r.id}">⏳</div><span class="st">${stars(r.rarity)}</span>${r.isNew ? '<span class="lv" style="background:#c0302a">YENİ</span>' : ''}<div class="hn">${h.name}</div></div>`; }).join('');
    ov().innerHTML = `<div class="res10"><div class="hgrid">${cards}</div></div><div class="ov-bottom"><button class="btn gold" id="sOk">Tamam</button></div>`;
    C.fillPortraits(ov());
    $('sOk').onclick = () => { phase = 'idle'; ui(); };
  };
  ui();
  const update = (dt, t) => {
    pT += dt;
    const speed = phase === 'charge' ? 1 + pT * 8 : 1;
    S.spin += dt * speed;
    S.ring.rotation.z = S.spin * 0.6; S.ring2.rotation.z = -S.spin; S.runeMesh.rotation.y = S.spin * 0.2;
    S.disc.material.opacity = 0.6 + Math.sin(t * 2) * 0.15 + (phase === 'charge' ? pT * 0.3 : 0);
    S.crystals.forEach((c, i) => { const a = c.a + S.spin * 0.4; c.m.position.set(Math.cos(a) * c.r, c.y + Math.sin(t * 1.5 + i) * 0.25 + (phase === 'charge' ? pT * 0.5 : 0) + (S.heroSlot ? 2.4 : 0), Math.sin(a) * c.r - 1.5); c.m.rotation.y = t * 2; });
    const pa = S.parts.geometry.attributes.position.array;
    for (let i = 0; i < pa.length; i += 3) { pa[i + 1] += dt * (0.3 + (phase === 'charge' ? pT * 3 : 0)); if (pa[i + 1] > 7) pa[i + 1] = 0; }
    S.parts.geometry.attributes.position.needsUpdate = true;
    if (phase === 'charge') {
      if (pT > 1.0) { S.beam.material.color.copy(S.bestColor); S.beam.material.opacity = Math.min(0.7, (pT - 1) * 1.5); }
      S.rim.color.lerp(S.bestColor, dt * 2);
      if (pT > 2.0) {
        S.flash.material.color.copy(S.bestColor); S.flash.material.opacity = 1; S.flash.scale.setScalar(14);
        phase = 'reveal'; pT = 0;
        if (queue.length) showHero(queue[0]); else showGrid();
      }
    } else {
      S.beam.material.opacity = Math.max(0, S.beam.material.opacity - dt * 0.8);
      S.rim.color.lerp(new THREE.Color(0xb06bff), dt);
    }
    if (S.flash.material.opacity > 0) { S.flash.material.opacity = Math.max(0, S.flash.material.opacity - dt * 1.5); S.flash.scale.setScalar(14 + (1 - S.flash.material.opacity) * 6); }
    if (S.heroSlot) {
      S.heroT += dt;
      S.heroSlot.rotation.y = Math.sin(S.heroT * 0.5) * 0.5;
      animateUnit(S.heroSlot, S.heroT < 2 ? 'cheer' : 'idle', t, dt);
      S.aura.material.opacity = 0.6 + Math.sin(t * 3) * 0.2;
    } else S.aura.material.opacity = Math.max(0, S.aura.material.opacity - dt);
    const mounted = S.heroSlot && S.heroSlot.userData.mounted;
    const ty = mounted ? 1.5 : 1.15;
    const k = innerWidth < innerHeight ? Math.min(2.1, 0.85 / (innerWidth / innerHeight)) : 1;
    S.camera.position.set(Math.sin(t * 0.15) * 0.6, S.heroSlot ? 1.7 + (mounted ? 0.5 : 0) : 2.6, (S.heroSlot ? (mounted ? 6.5 : 4.6) : 8.5) * k);
    S.camera.lookAt(0, S.heroSlot ? ty - (k > 1 ? 0.25 : 0) : 1.9, 0);
  };
  open({ scene: S.scene, camera: S.camera, update }, 'summon');
}

// =====================================================================
//  KAHRAMAN GÖRÜNTÜLEYİCİ
// =====================================================================
let hallCtx = null;
function buildHall() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1208);
  scene.fog = new THREE.Fog(0x1a1208, 10, 30);
  scene.environment = C.makeEnv(0x8a6a40, 0x4a3420, 0x1a1008, true);
  scene.environmentIntensity = 0.9;
  const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xffe8c8, 0x2a1a0a, 0.7));
  const key = new THREE.SpotLight(0xfff0d8, 80, 20, 0.5, 0.5, 1.2); key.position.set(3, 7, 5); key.target.position.set(0, 1, 0); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xfff4e8, 1.6); fill.position.set(0, 2, 8); scene.add(fill);
  const rim = new THREE.SpotLight(0x9ab8ff, 50, 20, 0.6, 0.5, 1.2); rim.position.set(-3, 5, -4); rim.target.position.set(0, 1, 0); scene.add(rim, rim.target);
  const floorTex = canvasTex(512, 512, (ctx) => {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const v = rand(60, 90); ctx.fillStyle = `rgb(${v + 10},${v},${v - 12})`; ctx.fillRect(x * 64 + 1, y * 64 + 1, 62, 62); }
  });
  floorTex.repeat.set(6, 6);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(20, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.5, metalness: 0.1 }));
  floor.receiveShadow = true; scene.add(floor);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 0.3, 40), new THREE.MeshStandardMaterial({ color: 0x5a4a38, roughness: 0.35, metalness: 0.4 }));
  ped.position.y = 0.15; ped.receiveShadow = ped.castShadow = true; scene.add(ped);
  const trim = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.035, 8, 64).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xd8a83a, metalness: 1, roughness: 0.25 })); trim.position.y = 0.3; scene.add(trim);
  // sütunlar
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI + Math.PI, c = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 7, 16), new THREE.MeshStandardMaterial({ color: 0x8a7a64, roughness: 0.6 }));
    c.position.set(Math.cos(a) * 6, 3.5, Math.sin(a) * 4 - 2); c.castShadow = true; scene.add(c);
    const f = sprite(0xffa040, 1.2, 0.8); f.position.set(c.position.x * 0.92, 3.2, c.position.z + 0.5); scene.add(f);
    const pl = new THREE.PointLight(0xff9a40, 4, 6, 1.5); pl.position.copy(f.position); scene.add(pl);
  }
  const aura = sprite(0xffffff, 4, 0); aura.position.set(0, 1.2, -0.4); scene.add(aura);
  return { scene, camera, aura, model: null };
}
export function openHeroViewer(id) {
  if (!hallCtx) hallCtx = buildHall();
  const H = hallCtx;
  const list = HEROES.filter((h) => G.S.heroes[h.id]).concat(HEROES.filter((h) => !G.S.heroes[h.id]));
  let cur = list.findIndex((h) => h.id === id); if (cur < 0) cur = 0;
  let rot = 0, vel = 0, dragX = null, anim = 'idle', animT = 0;
  const setHero = () => {
    const h = list[cur];
    if (H.model) H.scene.remove(H.model);
    H.model = createHero(h); H.model.position.y = 0.3; H.scene.add(H.model);
    H.aura.material.color.set(RARITY[h.rarity].color).multiplyScalar(1.4);
    H.aura.material.opacity = h.rarity >= 4 ? 0.7 : 0.25;
    anim = 'cheer'; animT = 0;
    renderUI();
  };
  const renderUI = () => {
    const h = list[cur], o = G.S.heroes[h.id];
    const bonus = o ? heroBonus(h, o.level, o.copies) : heroBonus(h, 1, 0);
    const cost = o ? heroLevelCost(o.level) : null;
    const maxed = o && o.level >= G.heroMaxLevel();
    const roleTxt = { infantry: '🗡️ Piyade komutanı', archer: '🏹 Okçu komutanı', cavalry: '🐎 Süvari komutanı' }[h.role];
    ov().innerHTML = `<div class="ov-top"><button class="x" id="hPrev" style="margin:0">◀</button>
      <div style="text-align:center"><div class="rs" style="color:${RARITY[h.rarity].color};font-size:18px;text-shadow:0 0 12px currentColor">${stars(h.rarity)}</div>
      <div class="ov-title" style="color:${RARITY[h.rarity].color};font-size:19px">${h.name}</div><div style="font-weight:800;font-size:12px;color:#e8d6b0;text-shadow:0 1px 3px #000">${h.title} • ${roleTxt}</div></div>
      <div class="row"><button class="x" id="hNext" style="margin:0">▶</button><button class="x" id="hClose" style="margin:0">✕</button></div></div>
      <div class="ov-bottom"><div class="modal-box" style="max-width:none;padding:12px;animation:none">
        <div class="stats" style="grid-template-columns:repeat(3,1fr)">
          <div class="stat"><small>Seviye</small><b>${o ? o.level : '-'} <small style="display:inline">/ ${G.heroMaxLevel()}</small></b></div>
          <div class="stat"><small>Birlik bonusu</small><b>+${bonus.toFixed(0)}%</b></div>
          <div class="stat"><small>Kopya</small><b>${o ? o.copies : 0} / 5</b></div></div>
        <p class="desc" style="margin:0 0 10px">✨ <b>${h.skill}</b></p>
        ${o ? `<div class="row">
          <button class="btn" id="hLvl" ${maxed ? 'disabled' : ''}>${maxed ? 'Sınırda' : `⬆ Seviye • 🌾${G.fmt(cost.food)} 🪨${G.fmt(cost.stone)}`}</button>
          <button class="btn ${G.S.commander === h.id ? 'gray' : 'gold'}" id="hCmd">${G.S.commander === h.id ? '👑 Komutan' : '👑 Komutan yap'}</button></div>`
        : `<button class="btn purple" style="width:100%" id="hGo">🔒 Henüz sahip değilsin — Çağır</button>`}
      </div></div>`;
    $('hClose').onclick = close;
    $('hPrev').onclick = () => { cur = (cur - 1 + list.length) % list.length; setHero(); };
    $('hNext').onclick = () => { cur = (cur + 1) % list.length; setHero(); };
    if ($('hLvl')) $('hLvl').onclick = () => { const r = G.levelUpHero(h.id); if (!r.ok) C.toast(r.why, true); else { C.toast('⬆ Seviye atladı!'); C.sfx('reveal'); anim = 'cheer'; animT = 0; } renderUI(); };
    if ($('hCmd')) $('hCmd').onclick = () => { G.setCommander(h.id); C.toast('👑 Yeni komutan: ' + h.name); renderUI(); };
    if ($('hGo')) $('hGo').onclick = () => { close(); openSummon(); };
  };
  const cv = C.renderer.domElement;
  const pd = (e) => { dragX = e.clientX; };
  const pm = (e) => { if (dragX !== null) { vel = (e.clientX - dragX) * 0.01; rot += vel; dragX = e.clientX; } };
  const pu = () => { dragX = null; };
  cv.addEventListener('pointerdown', pd); addEventListener('pointermove', pm); addEventListener('pointerup', pu);
  setHero();
  const update = (dt, t) => {
    if (dragX === null) { rot += vel; vel *= Math.exp(-4 * dt); rot += dt * 0.15; }
    animT += dt;
    if (H.model) { H.model.rotation.y = rot; animateUnit(H.model, animT < 2.2 ? anim : 'idle', t, dt); }
    H.aura.material.opacity *= 1; H.aura.scale.setScalar(4 + Math.sin(t * 2) * 0.3);
    const mounted = H.model && H.model.userData.mounted;
    const ty = mounted ? 1.6 : 1.05;
    const portrait = innerHeight > innerWidth;
    H.camera.position.set(0, ty + 0.9, (mounted ? 9.5 : 7.4) * (portrait ? 1.2 : 1));
    H.camera.lookAt(0, ty - (portrait ? 0.15 : 0), 0);
  };
  open({ scene: H.scene, camera: H.camera, update, dispose: () => { cv.removeEventListener('pointerdown', pd); removeEventListener('pointermove', pm); removeEventListener('pointerup', pu); } });
}

// =====================================================================
//  PORTRELER (kahraman kartları için küçük görüntüler)
// =====================================================================
const portraitCache = {};
let pr = null;
function portraitRenderer() {
  if (pr) return pr;
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(240, 320, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  scene.environment = (() => { const pm = new THREE.PMREMGenerator(renderer); const es = new THREE.Scene(); es.add(new THREE.Mesh(new THREE.SphereGeometry(10), new THREE.MeshBasicMaterial({ color: 0x6a5a4a, side: THREE.BackSide }))); const l = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 6, 5) })); l.position.set(4, 5, 6); es.add(l); const t = pm.fromScene(es, 0.04).texture; pm.dispose(); return t; })();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a2a1a, 1.2));
  const key = new THREE.DirectionalLight(0xfff2e0, 2.6); key.position.set(2, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9ab8ff, 1.8); rim.position.set(-3, 3, -4); scene.add(rim);
  const camera = new THREE.PerspectiveCamera(30, 240 / 320, 0.1, 50);
  pr = { renderer, scene, camera, canvas };
  return pr;
}
export function getPortrait(id) {
  if (portraitCache[id]) return portraitCache[id];
  portraitCache[id] = new Promise((resolve) => {
    setTimeout(() => {
      const R = portraitRenderer(), h = HERO_BY_ID[id];
      const col = new THREE.Color(RARITY[h.rarity].color);
      R.scene.background = new THREE.Color(0x1a1008).lerp(col, 0.28);
      const m = createHero(h);
      m.rotation.y = 0.35;
      R.scene.add(m);
      animateUnit(m, 'idle', 0.5, 0.016);
      m.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(m);
      const top = box.max.y, mounted = m.userData.mounted;
      const focusY = top - (mounted ? 0.75 : 0.55);
      R.camera.position.set(0.5, focusY + 0.1, mounted ? 3.6 : 2.6);
      R.camera.lookAt(0, focusY - 0.05, 0);
      R.renderer.render(R.scene, R.camera);
      const url = R.canvas.toDataURL('image/jpeg', 0.85);
      R.scene.remove(m);
      resolve(url);
    }, 0);
  });
  return portraitCache[id];
}

// =====================================================================
//  BİNA PORTRELERİ (panel başlığı için)
// =====================================================================
const bPortraits = {};
export function getBuildingPortrait(key, level) {
  const id = key + ':' + level;
  if (bPortraits[id]) return bPortraits[id];
  bPortraits[id] = new Promise((resolve) => {
    setTimeout(() => {
      const R = portraitRenderer();
      R.renderer.setSize(220, 220, false);
      R.camera.aspect = 1; R.camera.updateProjectionMatrix();
      const bg = new THREE.Color(0x4a8ad0);
      R.scene.background = bg;
      const m = BLD.createBuilding(key, Math.max(1, level));
      m.userData.update?.(1.0, 0.016);
      R.scene.add(m);
      m.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(m), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
      const d = Math.max(sz.x, sz.y * 1.1, sz.z) * 1.65;
      R.camera.position.set(c.x + d * 0.62, c.y + d * 0.42, c.z + d * 0.72);
      R.camera.lookAt(c.x, c.y - sz.y * 0.05, c.z);
      R.renderer.render(R.scene, R.camera);
      const url = R.canvas.toDataURL('image/jpeg', 0.88);
      R.scene.remove(m);
      R.renderer.setSize(240, 320, false); R.camera.aspect = 240 / 320; R.camera.updateProjectionMatrix();
      resolve(url);
    }, 0);
  });
  return bPortraits[id];
}
