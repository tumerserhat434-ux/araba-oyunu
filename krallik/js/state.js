// =====================================================================
//  DEMİR SANCAK — oyun durumu, kayıt, ekonomi, savaş ve çağırma mantığı
// =====================================================================
import { BUILDINGS, PLOTS, MAX_LEVEL, upgradeCost, upgradeTime as baseUpgradeTime, prodPerHour as baseProd, prodCap as baseCap, TROOPS, COUNTER, HEROES, HERO_BY_ID, RARITY, heroBonus, heroLevelCost, HERO_MAX_LEVEL, SUMMON, KINGDOM_NAMES, LORD_NAMES, RESEARCH, RESEARCH_MAX, researchCost, researchTime, QUESTS, DAILY, DAILY_CHEST, LOGIN_REWARDS } from './data.js';

const SAVE_KEY = 'demirsancak_v1';
const now = () => Date.now() / 1000;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));

export let S = null;
// araştırma etkisi (oran)
export const rb = (k) => ((S && S.research && S.research.levels[k]) || 0) * RESEARCH[k].per / 100;
export const prodPerHour = (key, level) => Math.round(baseProd(key, level) * (1 + rb('agri')));
export const prodCap = (key, level) => prodPerHour(key, level) * 3;
export const upgradeTime = (key, level) => Math.max(3, Math.round(baseUpgradeTime(key, level) * (1 - rb('mason'))));
const listeners = new Set();
export function onChange(fn) { listeners.add(fn); }
export function emit(ev, data) { for (const f of listeners) f(ev, data); }

function freshState() {
  const t = now();
  const buildings = {};
  for (const p of PLOTS) buildings[p.id] = { level: 0, busyUntil: 0, busyStart: 0, collectedAt: t };
  for (const id of ['townhall', 'barracks', 'farm1', 'lumber1', 'heroes', 'summon']) buildings[id].level = 1;
  return {
    v: 1, created: t, lastSeen: t,
    name: 'Krallığım',
    res: { food: 6000, wood: 6000, stone: 3000, gold: 1200 },
    buildings,
    troops: { infantry: 120, spearman: 60, archer: 80, cavalry: 0, tank: 0 },
    wounded: { infantry: 0, spearman: 0, archer: 0, cavalry: 0, tank: 0 },
    training: null, // { type, n, start, end }
    healing: null,  // { counts, start, end }
    potions: 2, potionAt: t,
    heroes: { emre: { level: 1, copies: 0 } },
    commander: 'emre',
    pity5: 0, pity4: 0, totalPulls: 0, freePullDay: '',
    enemies: genEnemies(8500),
    reports: [],
    raid: { at: t + 240, warned: false },
    stats: { wins: 0, losses: 0, kills: 0 },
  };
}

export function load() {
  try { const raw = localStorage.getItem(SAVE_KEY); if (raw) S = JSON.parse(raw); } catch (e) { S = null; }
  if (!S || S.v !== 1) S = freshState();
  // eksik alanları tamamla (eski kayıtlar için)
  for (const p of PLOTS) if (!S.buildings[p.id]) S.buildings[p.id] = { level: 0, busyUntil: 0, busyStart: 0, collectedAt: now() };
  S.counters ||= { trained: 0, collects: 0, upgrades: 0, wins: S.stats?.wins || 0, summons: S.totalPulls || 0, heals: 0, researched: 0 };
  S.qClaimed ||= {};
  S.daily ||= { day: '', c: {}, claimed: {}, chest: false };
  S.login ||= { last: '', streak: 0 };
  S.research ||= { levels: {}, cur: null };
  for (const t in TROOPS) { S.troops[t] ??= 0; S.wounded[t] ??= 0; }
  for (const e of S.enemies) e.troops.tank ??= 0;
  S.tankTraining ??= null;
  dailyReset();
  catchUp();
  save();
  return S;
}
export function dailyReset() { const d = todayKey(); if (S.daily.day !== d) S.daily = { day: d, c: {}, claimed: {}, chest: false }; }
export function count(name, n = 1) { S.counters[name] = (S.counters[name] || 0) + n; dailyReset(); S.daily.c[name] = (S.daily.c[name] || 0) + n; emit('quests'); }
export function questProgress(q) {
  const [t, a, b] = q.t;
  if (t === 'bld') return [Math.min(b, maxLevelOf(a)), b];
  if (t === 'stat') return [Math.min(b, S.counters[a] || 0), b];
  if (t === 'hero') return [Object.keys(S.heroes).some((id) => HERO_BY_ID[id].rarity >= a) ? 1 : 0, 1];
  if (t === 'res') return [Math.min(b, Math.max(0, ...Object.values(S.research.levels))), b];
  return [0, 1];
}
export const questDone = (q) => { const [x, y] = questProgress(q); return x >= y; };
export function activeQuests() { return QUESTS.filter((q) => !S.qClaimed[q.id]).slice(0, 4); }
export function claimQuest(id) { const q = QUESTS.find((x) => x.id === id); if (!q || S.qClaimed[id] || !questDone(q)) return null; S.qClaimed[id] = true; gainRes(q.reward); save(); emit('quests'); return q.reward; }
export const dailyProg = (d) => Math.min(d.n, S.daily.c[d.stat] || 0);
export function claimDaily(id) { dailyReset(); const d = DAILY.find((x) => x.id === id); if (!d || S.daily.claimed[id] || dailyProg(d) < d.n) return null; S.daily.claimed[id] = true; gainRes(d.reward); save(); emit('quests'); return d.reward; }
export const dailyClaimedCount = () => Object.keys(S.daily.claimed).length;
export function claimChest() { if (S.daily.chest || dailyClaimedCount() < DAILY_CHEST.need) return null; S.daily.chest = true; gainRes(DAILY_CHEST.reward); save(); emit('quests'); return DAILY_CHEST.reward; }
export function claimableCount() {
  let n = activeQuests().filter(questDone).length;
  n += DAILY.filter((d) => !S.daily.claimed[d.id] && dailyProg(d) >= d.n).length;
  if (!S.daily.chest && dailyClaimedCount() >= DAILY_CHEST.need) n++;
  return n;
}
// günlük giriş
export function loginPending() { return S.login.last !== todayKey(); }
export function claimLogin() {
  if (!loginPending()) return null;
  const y = new Date(Date.now() - 86400000), yk = `${y.getFullYear()}-${y.getMonth()}-${y.getDate()}`;
  S.login.streak = S.login.last === yk ? S.login.streak + 1 : 1;
  S.login.last = todayKey();
  const r = LOGIN_REWARDS[(S.login.streak - 1) % 7];
  gainRes(r); save(); emit('res');
  return { reward: r, day: ((S.login.streak - 1) % 7) + 1 };
}
// araştırma
export const academyLevel = () => maxLevelOf('academy');
export function canResearch(k) {
  const L = (S.research.levels[k] || 0) + 1;
  if (!academyLevel()) return { ok: false, why: 'Önce Akademi inşa et' };
  if (S.research.cur) return { ok: false, why: 'Başka bir araştırma sürüyor' };
  if (L > RESEARCH_MAX) return { ok: false, why: 'En yüksek seviye' };
  if (L > Math.ceil(academyLevel() / 2)) return { ok: false, why: `Akademi Sv.${L * 2 - 1} gerekli` };
  const cost = researchCost(k, L);
  if (!canAfford(cost)) return { ok: false, why: 'Yetersiz kaynak', cost };
  return { ok: true, cost, time: researchTime(k, L) * (1 - academyLevel() * 0.03) };
}
export function startResearch(k) { const c = canResearch(k); if (!c.ok) return c; pay(c.cost); S.research.cur = { key: k, start: now(), end: now() + c.time }; save(); emit('research'); return c; }
export function speedResearch() { const c = S.research.cur; if (!c) return false; const g = gemCostForTime(c.end - now()); if (S.res.gold < g) return false; S.res.gold -= g; c.end = now(); tick(); save(); return true; }
export function save() { try { S.lastSeen = now(); localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* yok say */ } }
export function resetGame() { localStorage.removeItem(SAVE_KEY); S = freshState(); save(); emit('reset'); }

// ---------------------------------------------------------------------
//  Yardımcılar
// ---------------------------------------------------------------------
export const lvl = (id) => S.buildings[id]?.level || 0;
export const thLevel = () => lvl('townhall');
export function maxLevelOf(key) { let m = 0; for (const p of PLOTS) if (p.key === key) m = Math.max(m, lvl(p.id)); return m; }
export function canAfford(cost) { for (const r in cost) if ((S.res[r] || 0) < cost[r]) return false; return true; }
export function pay(cost) { for (const r in cost) S.res[r] -= cost[r]; }
export function storageCap() { return 20000 + maxLevelOf('warehouse') * 25000 + thLevel() * 10000; }
export function addRes(obj) {
  const cap = storageCap();
  for (const r in obj) {
    if (r === 'gold') S.res.gold += obj[r];
    else S.res[r] = Math.min(Math.max(cap, S.res[r]), S.res[r] + obj[r]);
  }
}
export function gainRes(obj) { for (const r in obj) S.res[r] = (S.res[r] || 0) + obj[r]; }
export function fmt(n) {
  n = Math.floor(n);
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace('.', ',') + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace('.', ',') + 'B';
  return n.toLocaleString('tr-TR');
}
export function fmtTime(s) {
  s = Math.max(0, Math.ceil(s));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  if (h) return `${h}s ${m}dk`;
  if (m) return `${m}dk ${x}sn`;
  return `${x}sn`;
}
export const totalTroops = (t = S.troops) => Object.values(t).reduce((a, b) => a + b, 0);
export const gemCostForTime = (sec) => Math.max(1, Math.ceil(sec / 12));

// ---------------------------------------------------------------------
//  Binalar
// ---------------------------------------------------------------------
export const builders = () => 2;
export function busyBuilders() { const t = now(); return PLOTS.filter((p) => S.buildings[p.id].busyUntil > t).length; }
export function canUpgrade(id) {
  const p = PLOTS.find((q) => q.id === id), b = S.buildings[id], key = p.key, to = b.level + 1;
  if (b.busyUntil > now()) return { ok: false, why: 'İnşaat sürüyor' };
  if (to > MAX_LEVEL) return { ok: false, why: 'En yüksek seviye' };
  if (key !== 'townhall' && to > thLevel()) return { ok: false, why: `Belediye Binası Sv.${to} gerekli` };
  if (key !== 'townhall' && b.level === 0 && BUILDINGS[key].reqTH > thLevel()) return { ok: false, why: `Belediye Binası Sv.${BUILDINGS[key].reqTH} gerekli` };
  if (b.level === 0 && BUILDINGS[key].reqB) for (const rk in BUILDINGS[key].reqB) if (maxLevelOf(rk) < BUILDINGS[key].reqB[rk]) return { ok: false, why: `${BUILDINGS[rk].name} Sv.${BUILDINGS[key].reqB[rk]} gerekli` };
  if (busyBuilders() >= builders()) return { ok: false, why: 'Tüm inşaatçılar meşgul' };
  const cost = upgradeCost(key, to);
  if (!canAfford(cost)) return { ok: false, why: 'Yetersiz kaynak', cost };
  return { ok: true, cost, time: upgradeTime(key, to) };
}
export function startUpgrade(id) {
  const c = canUpgrade(id); if (!c.ok) return c;
  pay(c.cost);
  const b = S.buildings[id];
  b.busyStart = now(); b.busyUntil = now() + c.time;
  count('upgrades');
  save(); emit('building', id);
  return c;
}
export function speedUp(id) {
  const b = S.buildings[id], left = b.busyUntil - now();
  if (left <= 0) return false;
  const g = gemCostForTime(left);
  if (S.res.gold < g) return false;
  S.res.gold -= g; b.busyUntil = now();
  tick(); save();
  return true;
}
export function collect(id) {
  const p = PLOTS.find((q) => q.id === id), b = S.buildings[id], def = BUILDINGS[p.key];
  if (!def.prod || b.level === 0) return 0;
  const amt = pending(id);
  if (amt < 1) return 0;
  addRes({ [def.prod]: amt });
  b.collectedAt = now();
  count('collects');
  save(); emit('res');
  return amt;
}
export function pending(id) {
  const p = PLOTS.find((q) => q.id === id), b = S.buildings[id], def = BUILDINGS[p.key];
  if (!def.prod || b.level === 0 || b.busyUntil > now()) return 0;
  return Math.min(prodCap(p.key, b.level), (now() - b.collectedAt) / 3600 * prodPerHour(p.key, b.level));
}

// ---------------------------------------------------------------------
//  Askerler ve hastane
// ---------------------------------------------------------------------
export const barracksLevel = () => maxLevelOf('barracks');
export const trainBatchMax = () => 40 + barracksLevel() * 30;
export const trainSpeed = () => (1 + barracksLevel() * 0.12) * (1 + rb('drill'));
export const hospitalCap = () => Math.round(maxLevelOf('hospital') * 180 * (1 + rb('medic')));
export const potionCap = () => (maxLevelOf('potion') ? 3 + maxLevelOf('potion') * 2 : 0);
export const potionInterval = () => 150 / Math.max(1, maxLevelOf('potion'));
export const totalWounded = () => totalTroops(S.wounded);
export function troopUnlocked(type) { if (TROOPS[type].building) return maxLevelOf(TROOPS[type].building) >= 1; const r = TROOPS[type].reqBarracks || 1; return barracksLevel() >= r; }
// Tank Atölyesi / Demirhane / Toplanma Kampı
export const tankyardLevel = () => maxLevelOf('tankyard');
export const forgeLevel = () => maxLevelOf('forge');
export const rallyLevel = () => maxLevelOf('rally');
export const tankBatchMax = () => 2 + tankyardLevel() * 2;
export const tankSpeed = () => (1 + tankyardLevel() * 0.1) * (1 + forgeLevel() * 0.08);
export const forgeDefBonus = () => forgeLevel() * 0.025;
export const rallyAtkBonus = () => rallyLevel() * 0.03;
export const rallyLoadBonus = () => rallyLevel() * 0.08;
export function startTankTraining(n) {
  if (S.tankTraining) return { ok: false, why: 'Atölye zaten üretimde' };
  if (!troopUnlocked('tank')) return { ok: false, why: 'Önce Tank Atölyesi inşa et' };
  n = Math.max(1, Math.min(n, tankBatchMax()));
  const cost = trainCost('tank', n);
  if (!canAfford(cost)) return { ok: false, why: 'Yetersiz kaynak' };
  pay(cost);
  const dur = TROOPS.tank.time * n / tankSpeed();
  S.tankTraining = { type: 'tank', n, start: now(), end: now() + dur };
  count('trained', n); count('tanks', n);
  save(); emit('training');
  return { ok: true };
}
export function speedTankTraining() {
  if (!S.tankTraining) return false;
  const g = gemCostForTime(S.tankTraining.end - now());
  if (S.res.gold < g) return false;
  S.res.gold -= g; S.tankTraining.end = now(); tick(); save(); return true;
}
export function trainCost(type, n) { const c = TROOPS[type].cost, o = {}; for (const r in c) o[r] = c[r] * n; return o; }
export function startTraining(type, n) {
  if (S.training) return { ok: false, why: 'Kışla zaten eğitimde' };
  if (TROOPS[type].building) return { ok: false, why: 'Bu birlik başka binada üretilir' };
  if (!troopUnlocked(type)) return { ok: false, why: `Kışla Sv.${TROOPS[type].reqBarracks} gerekli` };
  n = Math.min(n, trainBatchMax());
  const cost = trainCost(type, n);
  if (!canAfford(cost)) return { ok: false, why: 'Yetersiz kaynak' };
  pay(cost);
  const dur = TROOPS[type].time * n / trainSpeed();
  S.training = { type, n, start: now(), end: now() + dur };
  count('trained', n);
  save(); emit('training');
  return { ok: true };
}
export function speedTraining() {
  if (!S.training) return false;
  const g = gemCostForTime(S.training.end - now());
  if (S.res.gold < g) return false;
  S.res.gold -= g; S.training.end = now(); tick(); save(); return true;
}
export function healCost(counts) { const o = { food: 0, wood: 0, stone: 0 }; for (const t in counts) for (const r in TROOPS[t].cost) o[r] += Math.ceil(TROOPS[t].cost[r] * counts[t] * 0.4); return o; }
export function startHealing() {
  if (S.healing) return { ok: false, why: 'İyileştirme sürüyor' };
  const counts = { ...S.wounded }, n = totalTroops(counts);
  if (!n) return { ok: false, why: 'Yaralı asker yok' };
  const cost = healCost(counts);
  if (!canAfford(cost)) return { ok: false, why: 'Yetersiz kaynak' };
  pay(cost);
  for (const t in S.wounded) S.wounded[t] = 0;
  S.healing = { counts, start: now(), end: now() + n * 0.35 / (1 + maxLevelOf('hospital') * 0.1) };
  count('heals');
  save(); emit('healing');
  return { ok: true };
}
export function usePotion() {
  if (S.potions <= 0) return { ok: false, why: 'İksir yok' };
  let left = 40 + maxLevelOf('potion') * 10, healed = 0;
  for (const t in S.wounded) { const k = Math.min(left, S.wounded[t]); S.wounded[t] -= k; S.troops[t] += k; left -= k; healed += k; }
  if (S.healing) { // iyileşen askerleri hızlandır
    S.healing.end -= (40 + maxLevelOf('potion') * 10) * 0.35;
  }
  if (!healed && !S.healing) return { ok: false, why: 'Yaralı asker yok' };
  S.potions--;
  count('heals');
  tick(); save(); emit('troops');
  return { ok: true, healed };
}

// ---------------------------------------------------------------------
//  Kahramanlar ve çağırma
// ---------------------------------------------------------------------
export const heroMaxLevel = () => Math.min(HERO_MAX_LEVEL, Math.max(1, maxLevelOf('heroes')) * 15);
export function heroPower(id) { const h = HERO_BY_ID[id], o = S.heroes[id]; return o ? Math.round(heroBonus(h, o.level, o.copies) * 10 + (h.atk + h.def) * o.level) : 0; }
export function levelUpHero(id) {
  const o = S.heroes[id]; if (!o) return { ok: false };
  if (o.level >= heroMaxLevel()) return { ok: false, why: 'Karakter Deposu seviyesini yükselt' };
  const cost = heroLevelCost(o.level);
  if (!canAfford(cost)) return { ok: false, why: 'Yetersiz kaynak' };
  pay(cost); o.level++; save(); emit('heroes');
  return { ok: true };
}
export function setCommander(id) { if (S.heroes[id]) { S.commander = id; save(); emit('heroes'); } }
function rollRarity() {
  S.pity5++; S.pity4++;
  if (S.pity5 >= SUMMON.pity5) { S.pity5 = 0; S.pity4 = 0; return 5; }
  const r = Math.random();
  let rar;
  if (r < RARITY[5].rate) rar = 5;
  else if (r < RARITY[5].rate + RARITY[4].rate) rar = 4;
  else if (r < RARITY[5].rate + RARITY[4].rate + RARITY[3].rate) rar = 3;
  else rar = 2;
  if (rar < 4 && S.pity4 >= SUMMON.pity4) rar = 4;
  if (rar === 5) { S.pity5 = 0; S.pity4 = 0; } else if (rar === 4) S.pity4 = 0;
  return rar;
}
export function todayKey() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }
export const freePullAvailable = () => S.freePullDay !== todayKey();
export function summon(count, free = false) {
  if (free) { if (!freePullAvailable() || count !== 1) return { ok: false, why: 'Ücretsiz çağırma kullanıldı' }; S.freePullDay = todayKey(); }
  else {
    const cost = count === 10 ? SUMMON.cost10 : SUMMON.cost1 * count;
    if (S.res.gold < cost) return { ok: false, why: 'Yetersiz altın', needGold: true };
    S.res.gold -= cost;
  }
  const out = [];
  for (let i = 0; i < count; i++) {
    let rar = rollRarity();
    if (count === 10 && i === 9 && out.every((o) => o.rarity < 3) && rar < 3) rar = 3;
    const pool = HEROES.filter((h) => h.rarity === rar);
    const h = pool[Math.floor(Math.random() * pool.length)];
    const isNew = !S.heroes[h.id];
    if (isNew) S.heroes[h.id] = { level: 1, copies: 0 }; else S.heroes[h.id].copies = Math.min(5, S.heroes[h.id].copies + 1);
    out.push({ id: h.id, rarity: rar, isNew });
  }
  S.totalPulls += count;
  globalThis.__dsCount?.('summons', count);
  save(); emit('heroes');
  return { ok: true, results: out };
}

// ---------------------------------------------------------------------
//  Güç ve savaş
// ---------------------------------------------------------------------
export function armyPower(troops, heroId, heroLvl = 1, copies = 0) {
  let p = 0;
  for (const t in troops) { const d = TROOPS[t]; p += troops[t] * (d.atk + d.def + d.hp * 0.4); }
  const h = heroId && HERO_BY_ID[heroId];
  if (h) p *= 1 + heroBonus(h, heroLvl, copies) / 100;
  return Math.round(p);
}
export function cityPower() {
  let p = armyPower(S.troops);
  for (const pl of PLOTS) p += lvl(pl.id) * lvl(pl.id) * 120;
  for (const id in S.heroes) p += heroPower(id);
  return Math.round(p);
}
export function towerPower() { let p = 0; for (const pl of PLOTS) if (pl.key === 'archery') p += lvl(pl.id) * 260; return p; }

function genEnemies(basePower) {
  const list = [];
  const names = [...KINGDOM_NAMES].sort(() => Math.random() - 0.5), lords = [...LORD_NAMES].sort(() => Math.random() - 0.5);
  for (let i = 0; i < 10; i++) list.push(makeEnemy(names[i], lords[i], basePower * rand(0.35, 1.8), i));
  return list.sort((a, b) => a.power - b.power);
}
function makeEnemy(name, lord, power, i) {
  const ang = (i / 10) * Math.PI * 2 + rand(-0.2, 0.2), dist = rand(0.35, 0.95);
  const e = { id: 'e' + Math.random().toString(36).slice(2, 8), name, lord, x: 0.5 + Math.cos(ang) * dist * 0.45, y: 0.5 + Math.sin(ang) * dist * 0.45, troops: {}, tower: 0, th: 1, res: {}, power: 0, shieldUntil: 0 };
  regenEnemy(e, power);
  return e;
}
function regenEnemy(e, power) {
  const per = 34; // yaklaşık güç/asker
  const n = Math.max(30, Math.round(power / per));
  const mix = [rand(0.2, 0.5), rand(0.1, 0.3), rand(0.15, 0.35), rand(0, 0.25)], sum = mix.reduce((a, b) => a + b, 0);
  ['infantry', 'spearman', 'archer', 'cavalry'].forEach((t, k) => { e.troops[t] = Math.round(n * mix[k] / sum); });
  e.troops.tank = power > 9000 ? Math.round(n * rand(0.005, 0.03)) : 0;
  e.tower = Math.max(0, Math.round(power / 4000));
  e.th = Math.min(10, 1 + Math.floor(power / 3500));
  e.res = { food: Math.round(power * rand(1.5, 3)), wood: Math.round(power * rand(1.5, 3)), stone: Math.round(power * rand(0.6, 1.4)), gold: randi(5, 25) + Math.round(power / 2500) };
  e.power = armyPower(e.troops) + e.tower * 260;
}
export function refreshEnemies() {
  const base = Math.max(2500, armyPower(S.troops) + towerPower());
  for (const e of S.enemies) if (e.shieldUntil < now() && e.power < base * 0.25) regenEnemy(e, base * rand(0.5, 1.6));
}

// Lanchester tarzı tur tabanlı savaş
export function simulateBattle(att, def) {
  // att/def: { troops:{}, hero:{bonus, role}, tower }
  const A = { ...att.troops }, D = { ...def.troops };
  const A0 = { ...A }, D0 = { ...D };
  const heroList = (side) => side.heroes || (side.hero ? [side.hero] : []);
  const bonusFor = (side, type) => combinedBonus(heroList(side), type) / 100 + 1;
  const mainBonus = (side) => Math.max(0, ...heroList(side).map((h) => h.bonus));
  const rounds = [];
  const dmgOf = (X, side, Y) => {
    const ytot = totalTroops(Y) || 1, out = {};
    for (const yt in Y) out[yt] = 0;
    for (const xt in X) {
      if (!X[xt]) continue;
      const d = TROOPS[xt];
      for (const yt in Y) {
        if (!Y[yt]) continue;
        const share = Y[yt] / ytot;
        out[yt] += X[xt] * d.atk * bonusFor(side, xt) * COUNTER[xt][yt] * share * (side.atkMul || 1);
      }
    }
    return out;
  };
  for (let r = 0; r < 12; r++) {
    const ta = totalTroops(A), td = totalTroops(D);
    if (ta < Math.max(1, totalTroops(A0) * 0.08) || td < Math.max(1, totalTroops(D0) * 0.08)) break;
    const da = dmgOf(A, att, D), dd = dmgOf(D, def, A);
    if (def.tower) { const atot = ta || 1; for (const t in A) dd[t] = (dd[t] || 0) + def.tower * 2.2 * (A[t] / atot); }
    const kill = (Y, dmg, side) => {
      for (const t in Y) {
        const d = TROOPS[t];
        const defMul = 1 + mainBonus(side) / 100 * 0.5;
        const k = dmg[t] * 0.11 / ((d.hp * 0.08 + d.def * 0.1 * defMul) * (side.defMul || 1)) * rand(0.9, 1.1);
        Y[t] = Math.max(0, Y[t] - Math.round(Math.min(Y[t], k)));
      }
    };
    kill(D, da, def); kill(A, dd, att);
    rounds.push({ a: totalTroops(A), d: totalTroops(D) });
  }
  const aLoss = {}, dLoss = {};
  for (const t in A0) aLoss[t] = A0[t] - A[t];
  for (const t in D0) dLoss[t] = D0[t] - D[t];
  const aRemainRatio = totalTroops(A) / Math.max(1, totalTroops(A0)), dRemainRatio = totalTroops(D) / Math.max(1, totalTroops(D0));
  const win = aRemainRatio > dRemainRatio;
  return { win, A, D, aLoss, dLoss, rounds, aRemainRatio, dRemainRatio };
}
// Birden çok komutan: en güçlüsü tam, diğerleri azalan oranda katkı verir
const CMD_W = [1, 0.5, 0.35, 0.25, 0.2];
export const MAX_COMMANDERS = 5;
export function combinedBonus(heroes, type) {
  const c = heroes.map((h) => h.bonus * (!type || h.role === type || (h.role === 'infantry' && type === 'spearman') ? 1 : 0.4)).sort((a, b) => b - a);
  return c.slice(0, MAX_COMMANDERS).reduce((s, v, i) => s + v * CMD_W[i], 0);
}
export function heroesOf(ids) { return (ids || []).map(heroOf).filter(Boolean); }
export function armyPowerMulti(troops, ids) {
  let p = 0; for (const t in troops) { const d = TROOPS[t]; p += troops[t] * (d.atk + d.def + d.hp * 0.4); }
  return Math.round(p * (1 + combinedBonus(heroesOf(ids)) / 100));
}
function heroOf(id) { const h = id && HERO_BY_ID[id], o = id && S.heroes[id]; return h && o ? { bonus: heroBonus(h, o.level, o.copies), role: h.role, id } : null; }
// Kayıpları yaralı/ölü olarak ayır (hastane kapasitesi)
function applyLosses(loss) {
  let free = Math.max(0, hospitalCap() - totalWounded() - (S.healing ? totalTroops(S.healing.counts) : 0));
  const wounded = {}, dead = {};
  for (const t in loss) {
    const w = Math.min(free, Math.floor(loss[t] * 0.75));
    wounded[t] = w; dead[t] = loss[t] - w; free -= w;
    S.wounded[t] += w;
  }
  return { wounded, dead };
}
export function attackEnemy(enemyId, sent, heroIds) {
  if (!Array.isArray(heroIds)) heroIds = heroIds ? [heroIds] : [];
  heroIds = heroIds.filter((id) => S.heroes[id]).slice(0, MAX_COMMANDERS);
  const heroId = heroIds[0];
  const e = S.enemies.find((q) => q.id === enemyId);
  if (!e) return null;
  for (const t in sent) { sent[t] = Math.min(sent[t], S.troops[t]); }
  if (!totalTroops(sent)) return null;
  for (const t in sent) S.troops[t] -= sent[t];
  const res = simulateBattle({ troops: sent, heroes: heroesOf(heroIds), atkMul: (1 + rb('blade')) * (1 + rallyAtkBonus()), defMul: (1 + rb('armor')) * (1 + forgeDefBonus()) }, { troops: e.troops, hero: null, tower: e.tower * 120 });
  const split = applyLosses(res.aLoss);
  for (const t in res.A) S.troops[t] += res.A[t];
  let loot = {};
  if (res.win) {
    let cap = Object.entries(res.A).reduce((s, [t, n]) => s + n * TROOPS[t].load, 0) * (1 + rb('logis')) * (1 + rallyLoadBonus());
    for (const r of ['food', 'wood', 'stone']) { const take = Math.min(Math.floor(e.res[r] * 0.6), Math.floor(cap / 3)); loot[r] = take; e.res[r] -= take; }
    loot.gold = e.res.gold; e.res.gold = 0;
    addRes(loot);
    S.stats.wins++; count('wins');
    e.shieldUntil = now() + 90;
  } else S.stats.losses++;
  for (const t in e.troops) e.troops[t] = res.D[t];
  e.power = armyPower(e.troops) + e.tower * 260;
  S.stats.kills += totalTroops(res.dLoss);
  // kahraman deneyimi
  if (res.win) for (const id of heroIds) if (S.heroes[id].level < heroMaxLevel() && Math.random() < 0.5) S.heroes[id].level++;
  const rep = { t: now(), kind: 'attack', win: res.win, enemy: e.name, lord: e.lord, sent, aLoss: res.aLoss, dLoss: res.dLoss, wounded: split.wounded, dead: split.dead, loot, hero: heroId, heroes: heroIds };
  S.reports.unshift(rep); S.reports = S.reports.slice(0, 30);
  save(); emit('battle', rep);
  return { rep, res, enemy: e, sent };
}

// Düşman baskını (şehre saldırı)
export function resolveRaid() {
  const strength = Math.max(1500, (armyPower(S.troops) + towerPower()) * rand(0.45, 1.25));
  const name = KINGDOM_NAMES[randi(0, KINGDOM_NAMES.length - 1)];
  const attacker = makeEnemy(name, LORD_NAMES[randi(0, LORD_NAMES.length - 1)], strength, 0);
  const home = { ...S.troops };
  const res = simulateBattle({ troops: attacker.troops, hero: null }, { troops: home, hero: heroOf(S.commander), tower: towerPower(), atkMul: 1 + rb('blade'), defMul: (1 + rb('armor')) * (1 + forgeDefBonus()) });
  const defWin = !res.win;
  const split = applyLosses(res.dLoss);
  for (const t in S.troops) S.troops[t] = res.D[t];
  let lost = {};
  if (!defWin) {
    const protect = 0.3 + maxLevelOf('warehouse') * 0.05;
    for (const r of ['food', 'wood', 'stone']) { lost[r] = Math.floor(S.res[r] * (1 - protect) * 0.25); S.res[r] -= lost[r]; }
  }
  if (defWin) { S.stats.wins++; count('wins'); } else S.stats.losses++;
  const rep = { t: now(), kind: 'defense', win: defWin, enemy: attacker.name, lord: attacker.lord, sent: attacker.troops, aLoss: res.dLoss, dLoss: res.aLoss, wounded: split.wounded, dead: split.dead, loot: lost, hero: S.commander };
  S.reports.unshift(rep); S.reports = S.reports.slice(0, 30);
  S.raid = { at: now() + rand(300, 540), warned: false };
  save(); emit('battle', rep);
  return { rep, res, attacker, home };
}

// ---------------------------------------------------------------------
//  Zaman ilerlemesi
// ---------------------------------------------------------------------
export function tick() {
  const t = now();
  for (const p of PLOTS) {
    const b = S.buildings[p.id];
    if (b.busyUntil && b.busyUntil <= t) {
      b.busyUntil = 0; b.level++; b.collectedAt = t;
      emit('built', p.id);
    }
  }
  if (S.training && S.training.end <= t) {
    S.troops[S.training.type] += S.training.n;
    emit('trained', S.training); S.training = null;
  }
  if (S.tankTraining && S.tankTraining.end <= t) {
    S.troops.tank += S.tankTraining.n;
    emit('trained', S.tankTraining); S.tankTraining = null;
  }
  if (S.healing && S.healing.end <= t) {
    for (const k in S.healing.counts) S.troops[k] += S.healing.counts[k];
    emit('healed', S.healing); S.healing = null;
  }
  if (S.research && S.research.cur && S.research.cur.end <= t) {
    const k = S.research.cur.key; S.research.levels[k] = (S.research.levels[k] || 0) + 1; S.research.cur = null;
    count('researched'); emit('researched', k);
  }
  const cap = potionCap();
  if (cap) {
    const iv = potionInterval();
    while (S.potionAt + iv <= t) { if (S.potions < cap) S.potions++; S.potionAt += iv; }
  } else S.potionAt = t;
}
function catchUp() { tick(); refreshEnemies(); if (S.raid.at < now()) S.raid = { at: now() + 120, warned: false }; }

globalThis.__dsCount = (n, k) => count(n, k);
