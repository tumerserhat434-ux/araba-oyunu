// =====================================================================
//  DEMİR SANCAK — oyun durumu, kayıt, ekonomi, savaş ve çağırma mantığı
// =====================================================================
import { campCap, BUILDINGS, PLOTS, MAX_LEVEL, maxLevel, thRequirements, upgradeCost, upgradeTime as baseUpgradeTime, prodPerHour as baseProd, prodCap as baseCap, TROOPS, COUNTER, HEROES, HERO_BY_ID, RARITY, heroBonus, heroLevelCost, HERO_MAX_LEVEL, SUMMON, KINGDOM_NAMES, LORD_NAMES, RESEARCH, RESEARCH_MAX, researchCost, researchTime, QUESTS, DAILY, DAILY_CHEST, LOGIN_REWARDS, SPEEDUPS, DROP_QUEST, DROP_EVENT, DROP_CHEST, SPEED_SHOP, FRAMES, FRAME_BY_ID, OFFERS } from './data.js';

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
  for (const id of ['townhall', 'barracks', 'farm1', 'lumber1', 'heroes', 'summon', 'camp1']) buildings[id].level = 1;
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
  // dünya haritası: sunucu, koordinat, seferler ve harita krallıkları
  if (S.server >= 300) S.server = null; // eski deneme numarası → yeniden atanır (sunucular 1'den başlar)
  if (S.mapX == null) { S.mapX = Math.round(rand(220, 780)); S.mapY = Math.round(rand(220, 780)); }
  S.marches ||= [];
  S.scouts ||= []; S.scoutReports ||= [];
  S.items ||= {};
  S.frames ||= {}; S.frame ||= 'bronze'; S.offers ||= {};
  // Ordu kampı: eski kayıtlarda 1. kamp mevcut ordunu alacak seviyede başlar
  if (!S.buildings.camp1.level) { const have = armyTotal(); let L = 1; while (L < 30 && campCap(L) < have) L++; S.buildings.camp1.level = L; }
  ensureMapKingdoms();
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
// ---- Hızlandırma eşyaları ----
export function addItem(id, n = 1) { S.items[id] = (S.items[id] || 0) + n; }
export function rollDrop(table) {
  const tot = table.reduce((a, r) => a + r[1], 0); let x = Math.random() * tot;
  for (const [id, w, [lo, hi]] of table) { x -= w; if (x <= 0) { const n = lo + Math.floor(Math.random() * (hi - lo + 1)); addItem(id, n); return { id, n }; } }
  const [id] = table[0]; addItem(id, 1); return { id, n: 1 };
}
// Hızlandırılabilir zamanlayıcılar: 'b:<arsa>', 'train', 'tank', 'research', 'heal'
function timerRef(target) {
  if (target.startsWith('b:')) { const b = S.buildings[target.slice(2)]; return b && b.busyUntil > now() ? { get: () => b.busyUntil, set: (v) => { b.busyUntil = v; } } : null; }
  const o = target === 'train' ? S.training : target === 'tank' ? S.tankTraining : target === 'research' ? S.research.cur : target === 'heal' ? S.healing : null;
  return o && o.end > now() ? { get: () => o.end, set: (v) => { o.end = v; } } : null;
}
export const timerLeft = (target) => { const r = timerRef(target); return r ? Math.max(0, r.get() - now()) : 0; };
export function useSpeedup(target, id, count = 1) {
  const r = timerRef(target), it = SPEEDUPS[id]; if (!r || !it) return { ok: false, why: 'Hızlandırılacak bir şey yok' };
  const have = S.items[id] || 0; count = Math.min(count, have, Math.ceil(timerLeft(target) / it.sec)); if (count <= 0) return { ok: false, why: 'Bu hızlandırmadan yok' };
  S.items[id] = have - count; r.set(r.get() - it.sec * count); count && (S.counters.speedups = (S.counters.speedups || 0) + count);
  tick(); save(); emit('speedup', { target, id, count }); return { ok: true, count, done: !timerRef(target) };
}
// Kalan süreyi en az israfla bitirecek eşya önerisi (büyükten küçüğe)
export function bestSpeedups(target) {
  let left = timerLeft(target); const plan = [];
  const ids = Object.keys(SPEEDUPS).filter((k) => S.items[k] > 0).sort((a, b) => SPEEDUPS[b].sec - SPEEDUPS[a].sec);
  for (const k of ids) { if (left <= 0) break; const n = Math.min(S.items[k], Math.floor(left / SPEEDUPS[k].sec)); if (n > 0) { plan.push([k, n]); left -= n * SPEEDUPS[k].sec; } }
  if (left > 0) { const k = ids.slice().reverse().find((q) => S.items[q] > (plan.find((p) => p[0] === q)?.[1] || 0)); if (k) { const p = plan.find((q) => q[0] === k); if (p) p[1]++; else plan.push([k, 1]); } }
  // gereksiz kalanları çıkar: küçükten büyüğe, toplam yine yetiyorsa eşyayı plandan düş (büyük eşya geldiyse küçükler harcanmasın)
  const need = timerLeft(target); let tot = plan.reduce((a, [k, n]) => a + SPEEDUPS[k].sec * n, 0);
  for (const p of plan.slice().sort((x, y) => SPEEDUPS[x[0]].sec - SPEEDUPS[y[0]].sec)) while (p[1] > 0 && tot - SPEEDUPS[p[0]].sec >= need) { p[1]--; tot -= SPEEDUPS[p[0]].sec; }
  return plan.filter((p) => p[1] > 0).sort((x, y) => SPEEDUPS[y[0]].sec - SPEEDUPS[x[0]].sec);
}
export function useBest(target) { let used = 0; for (const [k, n] of bestSpeedups(target)) { const r = useSpeedup(target, k, n); if (r.ok) used += r.count; } return used; }
export function buySpeedup(id) {
  const p = SPEED_SHOP.find((q) => q.id === id); if (!p) return { ok: false, why: 'Bulunamadı' };
  if (S.res.gold < p.gold) return { ok: false, why: 'Yetersiz altın', needGold: true };
  S.res.gold -= p.gold; addItem(id, 1); save(); emit('items'); return { ok: true };
}
// ---- Avatar çerçeveleri ----
export const frameOwned = (id) => !!FRAME_BY_ID[id] && (FRAME_BY_ID[id].free || !!S.frames[id]);
export function setFrame(id) { if (!frameOwned(id)) return false; S.frame = id; save(); emit('frame'); return true; }
export function buyFrame(id) {
  const f = FRAME_BY_ID[id]; if (!f || f.free || S.frames[id]) return { ok: false, why: 'Zaten sende' };
  if (S.res.gold < f.gold) return { ok: false, why: 'Yetersiz altın', needGold: true };
  S.res.gold -= f.gold; S.frames[id] = true; S.frame = id; save(); emit('frame'); return { ok: true };
}
// ---- Teklif paketleri (demo mağaza: ödeme alınmaz) ----
export const offerLeft = (o) => o.limit - (S.offers[o.id] || 0);
export function buyOffer(id) {
  const o = OFFERS.find((q) => q.id === id); if (!o || offerLeft(o) <= 0) return { ok: false, why: 'Bu paketi alma hakkın bitti' };
  S.offers[o.id] = (S.offers[o.id] || 0) + 1;
  if (o.gold) S.res.gold += o.gold;
  if (o.res) gainRes(o.res);
  for (const k in o.items || {}) addItem(k, o.items[k]);
  const heroes = [];
  for (let i = 0; i < (o.hero5 || 0); i++) {
    const pool = HEROES.filter((h) => h.rarity === 5), fresh = pool.filter((h) => !S.heroes[h.id] && !heroes.includes(h.id)), h = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length || pool.length))];
    if (!S.heroes[h.id]) S.heroes[h.id] = { level: 1, copies: 0 }; else S.heroes[h.id].copies = Math.min(5, S.heroes[h.id].copies + 1);
    heroes.push(h.id);
  }
  for (const f of o.frames || []) S.frames[f] = true;
  save(); emit('offer', o); return { ok: true, heroes };
}
export function claimQuest(id) { const q = QUESTS.find((x) => x.id === id); if (!q || S.qClaimed[id] || !questDone(q)) return null; S.qClaimed[id] = true; gainRes(q.reward); const items = [rollDrop(DROP_QUEST)]; save(); emit('quests'); return { ...q.reward, _items: items }; }
export const dailyProg = (d) => Math.min(d.n, S.daily.c[d.stat] || 0);
export function claimDaily(id) { dailyReset(); const d = DAILY.find((x) => x.id === id); if (!d || S.daily.claimed[id] || dailyProg(d) < d.n) return null; S.daily.claimed[id] = true; gainRes(d.reward); const items = [rollDrop(DROP_EVENT)]; save(); emit('quests'); return { ...d.reward, _items: items }; }
export const dailyClaimedCount = () => Object.keys(S.daily.claimed).length;
export function claimChest() { if (S.daily.chest || dailyClaimedCount() < DAILY_CHEST.need) return null; S.daily.chest = true; gainRes(DAILY_CHEST.reward); const items = [rollDrop(DROP_CHEST), rollDrop(DROP_CHEST)]; save(); emit('quests'); return { ...DAILY_CHEST.reward, _items: items }; }
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
export function storageCap() { const w = maxLevelOf('warehouse'), t = thLevel(); return 20000 + w * 25000 + w * w * 3500 + t * 10000 + t * t * 1200; }
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
// 1 saate kadar 12 sn = 1 altın; daha uzun sürelerde dakika başına 1 altın (uzun inşaatları hızlandırmak cazip kalsın)
export const gemCostForTime = (sec) => Math.max(1, sec <= 3600 ? Math.ceil(sec / 12) : Math.ceil(300 + (sec - 3600) / 60));

// ---------------------------------------------------------------------
//  Binalar
// ---------------------------------------------------------------------
export const builders = () => 2;
export function busyBuilders() { const t = now(); return PLOTS.filter((p) => S.buildings[p.id].busyUntil > t).length; }
export function canUpgrade(id) {
  const p = PLOTS.find((q) => q.id === id), b = S.buildings[id], key = p.key, to = b.level + 1;
  if (b.busyUntil > now()) return { ok: false, why: 'İnşaat sürüyor' };
  if (to > maxLevel(key)) return { ok: false, why: 'En yüksek seviye' };
  if (key === 'townhall') for (const [rk, rl] of thRequirements(to)) if (maxLevelOf(rk) < rl) return { ok: false, why: `Önce ${BUILDINGS[rk].name} Sv.${rl} olmalı`, req: rk };
  if (key !== 'townhall' && to > thLevel()) return { ok: false, why: `Belediye Binası Sv.${to} gerekli` };
  if (b.level === 0 && p.reqTH > thLevel()) return { ok: false, why: `Belediye Binası Sv.${p.reqTH} gerekli` };
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
// ---- Ordu kampı kapasitesi ----
// şehirdeki + seferdeki + eğitimdeki birlikler (yaralılar hastanede, sayılmaz)
export function armyTotal() {
  let n = totalTroops(S.troops) + totalTroops(troopsAway());
  if (S.training) n += S.training.n; if (S.tankTraining) n += S.tankTraining.n;
  return n;
}
export const armyCap = () => PLOTS.filter((p) => p.key === 'camp').reduce((s, p) => s + campCap(S.buildings[p.id]?.level || 0), 0);
export const campRoom = () => Math.max(0, armyCap() - armyTotal());
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
  if (campRoom() <= 0) return { ok: false, why: '🏕️ Ordu kampları dolu! Kampları yükselt.' };
  n = Math.max(1, Math.min(n, tankBatchMax(), campRoom()));
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
  n = Math.min(n, trainBatchMax(), campRoom());
  if (n <= 0) return { ok: false, why: '🏕️ Ordu kampları dolu! Kampları yükselt.' };
  const cost = trainCost(type, n);
  if (!canAfford(cost)) return { ok: false, why: 'Yetersiz kaynak' };
  pay(cost);
  const dur = TROOPS[type].time * n / trainSpeed();
  S.training = { type, n, start: now(), end: now() + dur };
  count('trained', n);
  save(); emit('training');
  return { ok: true };
}
export function speedHealing() { const h = S.healing; if (!h) return false; const g = gemCostForTime(h.end - now()); if (S.res.gold < g) return false; S.res.gold -= g; h.end = now(); tick(); save(); return true; }
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

// Haritada oyuncunun çevresine yayılmış bilgisayar krallıkları (36 adet)
const MAP_BOTS = 3, ROMAN = ['', ' II', ' III', ' IV'];
function ensureMapKingdoms() {
  const base = Math.max(2500, armyPower(S.troops) + towerPower() + 6000);
  while (S.enemies.length < MAP_BOTS) { const i = S.enemies.length; S.enemies.push(makeEnemy(KINGDOM_NAMES[i % KINGDOM_NAMES.length] + ROMAN[Math.floor(i / KINGDOM_NAMES.length)], LORD_NAMES[(i * 7) % LORD_NAMES.length], base * rand(0.3, 1.9), i)); }
  if (S.enemies.length > MAP_BOTS) S.enemies = S.enemies.filter((e) => e.mapX != null).sort((a, b) => Math.hypot(a.mapX - S.mapX, a.mapY - S.mapY) - Math.hypot(b.mapX - S.mapX, b.mapY - S.mapY)).concat(S.enemies.filter((e) => e.mapX == null)).slice(0, MAP_BOTS);
  if (S.mapX != null && nearThrone(S.mapX, S.mapY, 12)) { const a = Math.atan2(S.mapY - THRONE.y, S.mapX - THRONE.x) || 0.7; S.mapX = Math.round(THRONE.x + Math.cos(a) * (THRONE.r + 40)); S.mapY = Math.round(THRONE.y + Math.sin(a) * (THRONE.r + 40)); }
  S.enemies.forEach((e, i) => { if (e.mapX == null || nearThrone(e.mapX, e.mapY, 12)) { e.mapX = null; placeOnMap(e, i); } });
}
// Haritadaki dolu yerler (şehirler) — ışınlama ve yeni oyuncu yerleşimi için
function occupied() { return S.enemies.concat(ONLINE.enemies.filter((e) => (e.server || 1) === (S.server || 1))).map((e) => [e.mapX, e.mapY]); }
// Haritanın ortasındaki Demir Taht kalesi: çevresine şehir kurulamaz
export const THRONE = { x: 500, y: 500, r: 62 };
const nearThrone = (x, y, pad = 0) => Math.hypot(x - THRONE.x, y - THRONE.y) < THRONE.r + pad;
export const spotFree = (x, y, r = 24) => x > 30 && x < 970 && y > 30 && y < 970 && !nearThrone(x, y, 12) && occupied().every(([a, b]) => Math.hypot(a - x, b - y) > r);
export const TELEPORT_COST = 200;
export function teleport(x, y) {
  if (S.marches.length) return { ok: false, why: 'Seferdeki ordular dönmeden ışınlanamazsın' };
  if (!spotFree(x, y)) return { ok: false, why: 'Bu nokta dolu' };
  if (S.res.gold < TELEPORT_COST) return { ok: false, why: 'Yetersiz altın', needGold: true };
  S.res.gold -= TELEPORT_COST; S.mapX = Math.round(x); S.mapY = Math.round(y);
  S.enemies.forEach((e) => { if (Math.hypot(e.mapX - S.mapX, e.mapY - S.mapY) < 24) placeOnMap(e, S.enemies.indexOf(e)); });
  save(); emit('teleport'); return { ok: true };
}
// Hedefin yakınında boş yer bul
export function spotNear(x, y) {
  for (let r = 26; r < 90; r += 8) for (let a = 0; a < 12; a++) { const ang = a / 12 * Math.PI * 2 + r; const px = x + Math.cos(ang) * r, py = y + Math.sin(ang) * r; if (spotFree(px, py)) return [Math.round(px), Math.round(py)]; }
  return null;
}
// Yeni sunucuya yerleş: rastgele boş bir yer
export function placeOnServer(server) {
  S.server = server;
  for (let k = 0; k < 80; k++) { const a = Math.random() * Math.PI * 2, d = 110 + Math.random() * (220 + k * 2), x = THRONE.x + Math.cos(a) * d, y = THRONE.y + Math.sin(a) * d; if (spotFree(x, y, 40)) { S.mapX = Math.round(x); S.mapY = Math.round(y); break; } }
  S.enemies.forEach((e, i) => placeOnMap(e, i)); save();
}
function placeOnMap(e, i) {
  for (let k = 0; k < 40; k++) {
    const ang = (i * 2.399) + rand(-0.4, 0.4), dist = 32 + Math.sqrt(i + 1) * 24 + rand(-8, 8);
    const x = Math.round(S.mapX + Math.cos(ang) * dist), y = Math.round(S.mapY + Math.sin(ang) * dist);
    if (!nearThrone(x, y, 14) && Math.hypot(S.mapX - x, S.mapY - y) > 27 && S.enemies.every((o) => o === e || o.mapX == null || Math.hypot(o.mapX - x, o.mapY - y) > 27)) { e.mapX = Math.max(20, Math.min(980, x)); e.mapY = Math.max(20, Math.min(980, y)); return; }
  }
  e.mapX = Math.max(30, Math.min(970, S.mapX + rand(-300, 300))); e.mapY = Math.max(30, Math.min(970, S.mapY + rand(-300, 300)));
  pushOutOfThrone(e);
}
function pushOutOfThrone(e) { if (!nearThrone(e.mapX, e.mapY, 12)) return; const a = Math.atan2(e.mapY - THRONE.y, e.mapX - THRONE.x) || 1; e.mapX = Math.round(THRONE.x + Math.cos(a) * (THRONE.r + 30)); e.mapY = Math.round(THRONE.y + Math.sin(a) * (THRONE.r + 30)); }
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
// ---- Çevrimiçi: gerçek oyuncular ----
export const ONLINE = { enemies: [], foreign: [], top: [], topAt: 0, rivalsAt: 0 };
export const findEnemy = (id) => S.enemies.find((q) => q.id === id) || ONLINE.enemies.find((q) => q.id === id) || ONLINE.foreign.find((q) => q.id === id);
// Başka sunucunun bilgisayar krallıkları (görüntülenirken üretilir, kalıcı değil)
export function foreignBots(server) {
  let seed = server * 9973; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const base = Math.max(3000, armyPower(S.troops) + towerPower() + 6000), out = [];
  for (let i = 0; i < 30; i++) {
    const e = { id: 'f' + server + '_' + i, name: KINGDOM_NAMES[(i * 5 + server) % KINGDOM_NAMES.length] + ' #' + server, lord: LORD_NAMES[(i * 3 + server) % LORD_NAMES.length], mapX: Math.round(80 + rnd() * 840), mapY: Math.round(80 + rnd() * 840), troops: {}, tower: 0, th: 1, res: {}, power: 0, shieldUntil: 0, foreign: server };
    pushOutOfThrone(e); regenEnemy(e, base * (0.4 + rnd() * 1.6)); out.push(e);
  }
  return out;
}
// ---- Seferler: ordu haritada yürür, varınca savaşır, sonra geri döner ----
export const mapDist = (e) => (e.foreign || (e.server && e.server !== (S.server || 1)) ? 900 : Math.hypot((e.mapX ?? S.mapX) - S.mapX, (e.mapY ?? S.mapY) - S.mapY));
export function marchTime(e, troops) {
  const slow = troops && (troops.tank > 0) ? 1.25 : troops && troops.infantry + troops.spearman + troops.archer === 0 && troops.cavalry > 0 ? 0.7 : 1;
  return Math.round(Math.min(240, Math.max(10, 8 + mapDist(e) * 0.22)) * slow);
}
export function startMarch(enemyId, sent, heroIds) {
  const e = findEnemy(enemyId); if (!e) return { ok: false, why: 'Hedef bulunamadı' };
  if (S.marches.length >= 3) return { ok: false, why: 'En fazla 3 sefer aynı anda' };
  const troops = {}; let n = 0;
  for (const t in TROOPS) { troops[t] = Math.max(0, Math.min(sent[t] || 0, S.troops[t] || 0)); n += troops[t]; }
  if (!n) return { ok: false, why: 'Asker seç' };
  heroIds = (heroIds || []).filter((id) => S.heroes[id] && !S.marches.some((m) => m.heroes.includes(id))).slice(0, MAX_COMMANDERS);
  for (const t in troops) S.troops[t] -= troops[t];
  const dur = marchTime(e, troops), t0 = now();
  const m = { id: 'm' + Math.random().toString(36).slice(2, 8), target: enemyId, tname: e.name, tx: e.mapX, ty: e.mapY, foreign: e.foreign || (e.server && e.server !== S.server ? e.server : 0), snap: e.real || e.foreign ? JSON.parse(JSON.stringify(e)) : null, troops, heroes: heroIds, start: t0, arrive: t0 + dur, dur, phase: 'go' };
  S.marches.push(m); save(); emit('march', m);
  return { ok: true, march: m };
}
export function recallMarch(id) {
  const m = S.marches.find((q) => q.id === id); if (!m || m.phase !== 'go') return false;
  const el = now() - m.start; m.phase = 'back'; m.survivors = m.troops; m.start = now(); m.arrive = now() + Math.max(3, el); save(); return true;
}
function tickMarches() {
  const t = now();
  for (const m of [...S.marches]) {
    if (m.phase === 'go' && t >= m.arrive) {
      if (m.snap && !findEnemy(m.target)) (m.snap.foreign ? ONLINE.foreign : ONLINE.enemies).push(m.snap);
      const e = findEnemy(m.target);
      if (!e || e.shieldUntil > t) { m.phase = 'back'; m.survivors = m.troops; m.start = t; m.arrive = t + m.dur; m.blocked = true; emit('marchBlocked', m); continue; }
      for (const k in m.troops) S.troops[k] += m.troops[k];
      const r = attackEnemy(m.target, { ...m.troops }, m.heroes);
      if (!r) { m.phase = 'back'; m.survivors = m.troops; m.start = t; m.arrive = t + m.dur; continue; }
      m.survivors = {}; for (const k in r.res.A) { m.survivors[k] = r.res.A[k]; S.troops[k] -= r.res.A[k]; }
      m.phase = 'back'; m.start = t; m.arrive = t + m.dur; m.result = { win: r.res.win };
      emit('marchArrived', { m, r });
    } else if (m.phase === 'back' && t >= m.arrive) {
      for (const k in (m.survivors || {})) S.troops[k] += m.survivors[k];
      S.marches = S.marches.filter((q) => q !== m); save(); emit('marchHome', m);
    }
  }
}
// ---- Gözetleme: helikopter hedefe uçar, keşif yapar, geri döner ----
// Ordudan çok daha hızlı: her yön 5–45 sn (ordu 10–240 sn)
export const SCOUT_COST = { food: 300 };
export const MAX_SCOUTS = 2;
export const scoutTime = (e) => Math.round(Math.min(45, Math.max(5, 4 + mapDist(e) * 0.05)));
export function startScout(enemyId) {
  const e = findEnemy(enemyId); if (!e) return { ok: false, why: 'Hedef bulunamadı' };
  if (S.scouts.length >= MAX_SCOUTS) return { ok: false, why: `En fazla ${MAX_SCOUTS} gözetleme aynı anda` };
  if (S.scouts.some((q) => q.target === enemyId)) return { ok: false, why: 'Bu şehre zaten helikopter gidiyor' };
  if (e.shieldUntil > now()) return { ok: false, why: '🛡️ Kalkanlı şehir gözetlenemez' };
  if (!canAfford(SCOUT_COST)) return { ok: false, why: 'Yetersiz yiyecek (🌾 ' + SCOUT_COST.food + ')' };
  pay(SCOUT_COST);
  const dur = scoutTime(e), t0 = now();
  const sc = { id: 's' + Math.random().toString(36).slice(2, 8), target: enemyId, tname: e.name, tx: e.mapX, ty: e.mapY, foreign: e.foreign || (e.server && e.server !== S.server ? e.server : 0), snap: e.real || e.foreign ? JSON.parse(JSON.stringify(e)) : null, start: t0, arrive: t0 + dur, dur, phase: 'go' };
  S.scouts.push(sc); save(); emit('scout', sc);
  return { ok: true, scout: sc };
}
// Hedefin o anki durumunun fotoğrafı (rapor)
function scoutSnapshot(e) {
  const loot = {}; for (const r of ['food', 'wood', 'stone']) loot[r] = Math.max(0, Math.floor((e.res?.[r] || 0) * 0.6)); loot.gold = Math.max(0, Math.floor(e.res?.gold || 0));
  const h = e.hero ? { id: e.hero.id || null, bonus: Math.round(e.hero.bonus || 0), role: e.hero.role || null } : null;
  return { t: now(), kind: 'scout', win: true, target: e.id, enemy: e.name, lord: e.lord, real: !!e.real, th: e.th || 1, power: Math.round(e.power || 0), troops: { ...e.troops }, tower: Math.round((e.tower || 0) * 120), hero: h, loot, mapX: Math.round(e.mapX), mapY: Math.round(e.mapY) };
}
function tickScouts() {
  const t = now();
  for (const sc of [...S.scouts]) {
    if (sc.phase === 'go' && t >= sc.arrive) {
      if (sc.snap && !findEnemy(sc.target)) (sc.snap.foreign ? ONLINE.foreign : ONLINE.enemies).push(sc.snap);
      const e = findEnemy(sc.target);
      sc.report = e && !(e.shieldUntil > t) ? scoutSnapshot(e) : { t, kind: 'scout', failed: true, target: sc.target, enemy: sc.tname, why: e ? 'Hedef kalkan açtı' : 'Hedef bulunamadı' };
      sc.phase = 'back'; sc.start = t; sc.arrive = t + sc.dur; sc.snap = null; save(); emit('scoutArrived', sc);
    } else if (sc.phase === 'back' && t >= sc.arrive) {
      S.scouts = S.scouts.filter((q) => q !== sc);
      if (sc.report) { S.scoutReports.unshift(sc.report); S.scoutReports = S.scoutReports.slice(0, 20); S.reports.unshift(sc.report); S.reports = S.reports.slice(0, 30); }
      save(); emit('scoutHome', sc);
    }
  }
}
export const lastScout = (enemyId) => S.scoutReports.find((r) => r.target === enemyId && !r.failed);
export const troopsAway = () => { const o = {}; for (const m of S.marches) for (const k in (m.phase === 'go' ? m.troops : m.survivors || {})) o[k] = (o[k] || 0) + (m.phase === 'go' ? m.troops : m.survivors)[k]; return o; };
export function importSave(json) { localStorage.setItem(SAVE_KEY, json); }
export function exportSave() { save(); return JSON.parse(JSON.stringify(S)); }
// Diğer oyuncuların göreceği herkese açık profil (savunma bilgisi dahil)
export function publicProfile() {
  const protect = 0.3 + maxLevelOf('warehouse') * 0.02, h = heroOf(S.commander);
  const lootable = {}; for (const r of ['food', 'wood', 'stone']) lootable[r] = Math.floor(S.res[r] * (1 - Math.min(0.8, protect)) * 0.5);
  return { name: String(S.name).slice(0, 24), power: cityPower(), th: thLevel(), troops: { ...S.troops }, towerPow: towerPower(), hero: h ? { bonus: Math.round(h.bonus), role: h.role, id: h.id } : null, lootable, shieldUntil: S.pvpShield || 0, wins: S.stats.wins, server: S.server || 1, mapX: S.mapX, mapY: S.mapY };
}
// Gerçek oyuncuyu haritadaki düşman biçimine çevir
export function rivalToEnemy(p) {
  let hsh = 0; for (const ch of p.uid) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0;
  const ang = (hsh % 360) * Math.PI / 180, dist = 0.25 + ((hsh >> 9) % 60) / 100;
  return { mapX: p.mapX ?? (S.mapX + Math.cos(ang) * 200 * dist), mapY: p.mapY ?? (S.mapY + Math.sin(ang) * 200 * dist), server: p.server || 1, id: 'p:' + p.uid, uid: p.uid, real: true, name: p.name || 'Oyuncu', lord: '🌐 Gerçek oyuncu', x: 0.5 + Math.cos(ang) * dist * 0.45, y: 0.5 + Math.sin(ang) * dist * 0.45,
    troops: { infantry: 0, spearman: 0, archer: 0, cavalry: 0, tank: 0, ...(p.troops || {}) }, tower: (p.towerPow || 0) / 120, th: p.th || 1, hero: p.hero || null,
    res: { food: (p.lootable?.food || 0) / 0.6, wood: (p.lootable?.wood || 0) / 0.6, stone: (p.lootable?.stone || 0) / 0.6, gold: 0 }, power: p.power || 0, shieldUntil: (S.pvpCooldown?.[p.uid] || 0) };
}
// Başka bir oyuncunun saldırısı (gelen kutusu) bu şehre uygulanır
export function applyIncoming(r) {
  const loss = {}; for (const t in TROOPS) loss[t] = Math.min(S.troops[t] || 0, Math.max(0, Math.round(r.dLoss?.[t] || 0)));
  for (const t in loss) S.troops[t] -= loss[t];
  const split = applyLosses(loss);
  const lost = {};
  if (r.win) { for (const k of ['food', 'wood', 'stone']) { lost[k] = Math.min(S.res[k], Math.max(0, Math.round(r.loot?.[k] || 0))); S.res[k] -= lost[k]; } S.pvpShield = Date.now() + 30 * 60000; S.stats.losses++; } else { S.stats.wins++; }
  const rep = { t: Math.floor((r.t || Date.now()) / 1000), kind: 'defense', pvp: true, win: !r.win, enemy: r.name || 'Bir oyuncu', lord: '🌐 Gerçek oyuncu', sent: r.sent || {}, aLoss: loss, dLoss: r.aLoss || {}, wounded: split.wounded, dead: split.dead, loot: lost, hero: S.commander };
  S.reports.unshift(rep); S.reports = S.reports.slice(0, 30); save(); emit('battle-silent', rep);
  return rep;
}
export function attackEnemy(enemyId, sent, heroIds) {
  if (!Array.isArray(heroIds)) heroIds = heroIds ? [heroIds] : [];
  heroIds = heroIds.filter((id) => S.heroes[id]).slice(0, MAX_COMMANDERS);
  const heroId = heroIds[0];
  const e = findEnemy(enemyId);
  if (!e) return null;
  for (const t in sent) { sent[t] = Math.min(sent[t], S.troops[t]); }
  if (!totalTroops(sent)) return null;
  for (const t in sent) S.troops[t] -= sent[t];
  const res = simulateBattle({ troops: sent, heroes: heroesOf(heroIds), atkMul: (1 + rb('blade')) * (1 + rallyAtkBonus()), defMul: (1 + rb('armor')) * (1 + forgeDefBonus()) }, { troops: e.troops, hero: e.hero || null, tower: e.tower * 120 });
  const split = applyLosses(res.aLoss);
  for (const t in res.A) S.troops[t] += res.A[t];
  let loot = {};
  if (res.win) {
    let cap = Object.entries(res.A).reduce((s, [t, n]) => s + n * TROOPS[t].load, 0) * (1 + rb('logis')) * (1 + rallyLoadBonus());
    for (const r of ['food', 'wood', 'stone']) { const take = Math.min(Math.floor(e.res[r] * 0.6), Math.floor(cap / 3)); loot[r] = take; e.res[r] -= take; }
    loot.gold = e.res.gold; e.res.gold = 0;
    addRes(loot);
    S.stats.wins++; count('wins');
    e.shieldUntil = now() + (e.real ? 900 : 90);
    if (e.real) { S.pvpCooldown ||= {}; S.pvpCooldown[e.uid] = now() + 900; }
  } else S.stats.losses++;
  for (const t in e.troops) e.troops[t] = res.D[t];
  e.power = armyPower(e.troops) + e.tower * 260;
  S.stats.kills += totalTroops(res.dLoss);
  // kahraman deneyimi
  if (res.win) for (const id of heroIds) if (S.heroes[id].level < heroMaxLevel() && Math.random() < 0.5) S.heroes[id].level++;
  const rep = { t: now(), kind: 'attack', win: res.win, enemy: e.name, lord: e.lord, sent, aLoss: res.aLoss, dLoss: res.dLoss, wounded: split.wounded, dead: split.dead, loot, hero: heroId, heroes: heroIds, pvp: !!e.real, uid: e.uid };
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
  if (S.marches?.length) tickMarches();
  if (S.scouts?.length) tickScouts();
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
