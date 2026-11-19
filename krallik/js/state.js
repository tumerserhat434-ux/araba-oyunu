// =====================================================================
//  DEMİR SANCAK — oyun durumu, kayıt, ekonomi, savaş ve çağırma mantığı
// =====================================================================
import { FY_TASKS, FY_DAYS, FY_BONUS, TROOP_LV_MAX, troopLvMul, troopLvCost, troopLvTime, troopLvReq, VIP, VIP_MAX, ALLIANCE_SHOP, starMul, nextStarCost, campCap, BUILDINGS, PLOTS, MAX_LEVEL, maxLevel, thRequirements, upgradeCost, upgradeTime as baseUpgradeTime, prodPerHour as baseProd, prodCap as baseCap, TROOPS, COUNTER, HEROES, HERO_BY_ID, RARITY, heroBonus, heroLevelCost, HERO_MAX_LEVEL, SUMMON, KINGDOM_NAMES, LORD_NAMES, RESEARCH, RESEARCH_MAX, researchCost, researchTime, QUESTS, DAILY, DAILY_CHEST, LOGIN_REWARDS, SPEEDUPS, DROP_QUEST, DROP_EVENT, DROP_CHEST, SPEED_SHOP, FRAMES, FRAME_BY_ID, OFFERS } from './data.js?v=2611191932';

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
  S.tlv ||= { infantry: 1, spearman: 1, archer: 1, cavalry: 1 }; S.tlvUp ??= null; // Talimhane
  for (const t in TROOPS) { S.troops[t] ??= 0; S.wounded[t] ??= 0; }
  for (const e of S.enemies) e.troops.tank ??= 0;
  // dünya haritası: sunucu, koordinat, seferler ve harita krallıkları
  if (S.server >= 300) S.server = null; // eski deneme numarası → yeniden atanır (sunucular 1'den başlar)
  if (S.mapX == null) { S.mapX = Math.round(rand(MAP_MID - 500, MAP_MID + 500)); S.mapY = Math.round(rand(MAP_MID - 500, MAP_MID + 500)); S.mapVer = MAP_VER; }
  if (S.mapVer !== MAP_VER) migrateMap();
  if (nearPyramid(S.mapX, S.mapY, 24) || nearThrone(S.mapX, S.mapY, 24)) { const sp = spotNear(S.mapX, S.mapY); if (sp) [S.mapX, S.mapY] = sp; }
  S.marches ||= [];
  S.scouts ||= []; S.scoutReports ||= [];
  S.items ||= {};
  if (S.pity5 >= 30) S.pity5 = 29;
  S.frames ||= {}; S.frame ||= 'bronze'; S.offers ||= {}; S.vip ||= 0; S.vipBoxAt ??= 0; if (S.energy == null || (S.energyAt == null && !S.energy)) S.energy = 200; S.energyAt ??= now(); for (let L = 1; L <= (S.vip || 0); L++) { if (VIP[L].skin) S.skins[VIP[L].skin] = true; if (VIP[L].frame) S.frames[VIP[L].frame] = true; }
  S.alliance ??= null;
  S.zombies ||= []; S.zombieMax ||= 0; S.zombieKills ||= 0; S.zombieNext ||= 0;
  S.mines ||= []; S.mineMax ||= { food: 0, wood: 0, stone: 0, gold: 0 }; S.mineNext ||= 0;
  S.giants ||= []; S.giantMax ||= 0; S.giantNext ||= 0;
  if (S.zombies.length > 14) { const keep = new Set(S.marches.map((m) => m.target)), nx = (S.zombieMax || 0) + 1; S.zombies = S.zombies.filter((z, i) => keep.has(z.id) || z.level === nx || i % 3 === 0).slice(0, 14); }
  if (S.mines.length > 16) S.mines = S.mines.filter((q, i) => q.busy || i % 3 !== 2).slice(0, 16);
  // Ordu kampı: eski kayıtlarda 1. kamp mevcut ordunu alacak seviyede başlar
  if (!S.buildings.camp1.level) { const have = armyTotal(); let L = 1; while (L < 30 && campCap(L) < have) L++; S.buildings.camp1.level = L; }
  ensureMapKingdoms();
  S.tankTraining ??= null;
  S.camp ||= { done: 0, tries: 0 };
  S.helpReq ||= {};
  S.skins ||= {}; S.skin ??= null; S.showcase ??= null; S.city ||= { hp: 100, fire: false }; S.pvpHits ||= {}; S.pvpShield = 0; for (const u in S.pvpHits) if (now() - (S.pvpHits[u].t || 0) > 86400) delete S.pvpHits[u]; // profil vitrini: seçilen 5 kahraman (null = en güçlü 5)
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
  // sefer (gidiş/dönüş): süre kısalınca birlik yolda ileri atlar (başlangıç da kayar, yolculuk süresi aynı kalır)
  if (target.startsWith('m:')) { const m = S.marches.find((q) => q.id === target.slice(2)); return m && m.kind !== 'rally' && (m.phase === 'go' || m.phase === 'back') && m.arrive > now() ? { get: () => m.arrive, set: (v) => { const d = m.arrive - v; m.start -= d; m.arrive = v; } } : null; }
  if (target.startsWith('b:')) { const b = S.buildings[target.slice(2)]; return b && b.busyUntil > now() ? { get: () => b.busyUntil, set: (v) => { b.busyUntil = v; } } : null; }
  if (target === 'tlv') { const u = S.tlvUp; return u && u.end > now() ? { get: () => u.end, set: (v) => { u.end = v; } } : null; }
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
export const frameOwned = (id) => !!FRAME_BY_ID[id] && (FRAME_BY_ID[id].free || !!S.frames[id] || (FRAME_BY_ID[id].vip && S.vip >= FRAME_BY_ID[id].vip));
export function setFrame(id) { if (!frameOwned(id)) return false; S.frame = id; save(); emit('frame'); return true; }
export function buyFrame(id) {
  const f = FRAME_BY_ID[id]; if (!f || f.free || S.frames[id]) return { ok: false, why: 'Zaten sende' };
  if (f.vip) return { ok: false, why: `VIP ${f.vip} ile açılır` };
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
    if (!S.heroes[h.id]) S.heroes[h.id] = { level: 1, copies: 0 }; else S.heroes[h.id].copies++;
    heroes.push(h.id);
  }
  for (const f of o.frames || []) S.frames[f] = true;
  if (o.skin) { S.skins[o.skin] = true; S.skin = o.skin; emit('skin', o.skin); }
  save(); emit('offer', o); return { ok: true, heroes };
}
// ---- Belediye efektleri (teklif paketleriyle açılır) ----
export function setSkin(id) { if (id && !S.skins[id]) return false; S.skin = id || null; save(); emit('skin', S.skin); return true; }
// ---- İttifak ----
export const ALLIANCE_COST = 300;
export const myMember = () => ({ name: String(S.name).slice(0, 24), power: cityPower(), th: thLevel(), hero: S.commander || null, frame: S.frame || 'bronze' });
// ---- İttifak dükkanı: haftalık sınır (hafta Pazartesi 00:00'da başlar, yerel saat) ----
export function weekStart(d = new Date()) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
const weekKey = () => { const w = weekStart(); return `${w.getFullYear()}-${w.getMonth()}-${w.getDate()}`; };
function alShopState() { const k = weekKey(); if (!S.alShop || S.alShop.week !== k) S.alShop = { week: k, bought: {} }; return S.alShop; }
export const alShopBought = (id) => alShopState().bought[id] || 0;
export function alShopLeft(id) { const p = ALLIANCE_SHOP.find((q) => q.id === id); return p ? Math.max(0, p.limit - alShopBought(id)) : 0; }
export const alShopResetIn = () => (weekStart().getTime() + 7 * 864e5 - Date.now()) / 1000;
export function buyAlShop(id, n = 1) {
  const p = ALLIANCE_SHOP.find((q) => q.id === id); if (!p) return { ok: false, why: 'Bulunamadı' };
  if (!S.alliance) return { ok: false, why: 'İttifak dükkanı yalnızca ittifak üyelerine açık' };
  n = Math.min(n, alShopLeft(id)); if (n <= 0) return { ok: false, why: 'Bu haftalık alım sınırı doldu' };
  if (S.res.gold < p.gold * n) return { ok: false, why: 'Yetersiz altın', needGold: true };
  S.res.gold -= p.gold * n; alShopState().bought[id] = alShopBought(id) + n;
  if (p.item) addItem(p.item, n); else for (const r in p.res) S.res[r] += p.res[r] * n;
  save(); emit('items'); return { ok: true, n };
}
// ---- İttifak yardımı: her yardım yükseltmeyi toplam sürenin %2,5'i kadar kısaltır (en az 1 dk), en fazla 20 yardım ----
export const HELP_MAX = 20;
export const helpPer = (dur) => Math.max(60, Math.round(dur * 0.025));
// yardım istenebilecek bina yükseltmesi: { plot, level (hedef), dur, per, hid }
export function helpable(plot) {
  const b = S.buildings[plot]; if (!b || !(b.busyUntil > now())) return null;
  const dur = Math.max(1, b.busyUntil - b.busyStart), level = b.level + 1;
  return { plot, level, dur, per: helpPer(dur), requested: S.helpReq[plot]?.level === level ? S.helpReq[plot] : null };
}
export function markHelp(plot, level, hid, per) { S.helpReq[plot] = { hid, level, per, applied: 0 }; save(); }
// yükseltme bitti/iptal olduysa istek geçersiz
export function helpStale(plot, level) { const b = S.buildings[plot]; return !b || b.level >= level || !(b.busyUntil > now()); }
// gelen yardımları uygula; kısaltılan saniyeyi döndürür
export function applyHelps(plot, level, n) {
  const r = S.helpReq[plot], b = S.buildings[plot];
  if (!r || r.level !== level || !b) return 0;
  const d = Math.min(n, HELP_MAX) - r.applied; if (d <= 0) return 0;
  const cut = Math.min(d * r.per, Math.max(0, b.busyUntil - now()));
  b.busyUntil -= cut; r.applied += d;
  tick(); save(); emit('helped', { plot, cut });
  return cut;
}
export function dropHelp(plot) { if (S.helpReq[plot]) { delete S.helpReq[plot]; save(); } }
export function setAlliance(a) { S.alliance = a ? { id: a.id, tag: a.tag, name: a.name, emblem: a.emblem, color: a.color } : null; save(); emit('alliance'); }
export function payAlliance() { if (S.res.gold < ALLIANCE_COST) return false; S.res.gold -= ALLIANCE_COST; save(); return true; }
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
  if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1).replace('.', ',') + 'Mr';
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
export function heroPower(id) { const h = HERO_BY_ID[id], o = S.heroes[id]; return o ? Math.round(heroBonus(h, o.level, o.copies, o.ups) * 10 + (h.atk + h.def) * o.level * starMul(o.ups)) : 0; }
// yıldız yükselt: kopya harcar
export function ascendHero(id) { const h = HERO_BY_ID[id], o = S.heroes[id]; if (!o) return { ok: false, why: 'Kahraman yok' }; const c = nextStarCost(h, o.ups); if (c == null) return { ok: false, why: 'En yüksek yıldızda' }; if (o.copies < c) return { ok: false, why: `${c} kopya gerekli (${o.copies})` }; o.copies -= c; o.ups = (o.ups || 0) + 1; save(); emit('heroes'); return { ok: true, ups: o.ups }; }
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
    if (isNew) S.heroes[h.id] = { level: 1, copies: 0 }; else S.heroes[h.id].copies++;
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
// ---- Talimhane ----
export const troopLv = (t) => S.tlv?.[t] || 1;
export const tMul = (t) => troopLvMul(troopLv(t));
export const troopStat = (t, k) => Math.round(TROOPS[t][k] * (TROOPS[t].building ? 1 : tMul(t)));
export function canTroopUp(t) {
  const L = troopLv(t) + 1;
  if (L > TROOP_LV_MAX) return { ok: false, why: 'En yüksek seviyede' };
  if (S.tlvUp) return { ok: false, why: 'Talimhanede zaten bir eğitim var' };
  if (maxLevelOf('drill') < troopLvReq(L)) return { ok: false, why: `Talimhane Sv.${troopLvReq(L)} gerekli` };
  if (!canAfford(troopLvCost(L))) return { ok: false, why: 'Yetersiz kaynak' };
  return { ok: true, L };
}
export function startTroopUp(t) {
  const c = canTroopUp(t); if (!c.ok) return c;
  pay(troopLvCost(c.L)); const st = now(); S.tlvUp = { t, to: c.L, start: st, end: st + troopLvTime(c.L) }; save(); emit('tlv'); return { ok: true };
}
function tickTroopUp() { const u = S.tlvUp; if (u && now() >= u.end) { S.tlv[u.t] = u.to; S.tlvUp = null; save(); emit('tlvDone', u); } }
export function cityPower() {
  let p = 0; for (const t in S.troops) { const d = TROOPS[t], m = d.building ? 1 : tMul(t); p += S.troops[t] * (d.atk + d.def + d.hp * 0.4) * m; }
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
export const MAP_SIZE = 2000, MAP_MID = MAP_SIZE / 2, MAP_VER = 2; // harita 1000→2000 büyütüldü (eski kayıtlar +500 kaydırılır)
export const THRONE = { x: MAP_MID, y: MAP_MID, r: 62 };
const nearThrone = (x, y, pad = 0) => Math.hypot(x - THRONE.x, y - THRONE.y) < THRONE.r + pad;
// ---- Mısır piramitleri: dıştan (Sv.1) içe (Sv.5, tahta yakın) halkalar halinde ----
// Sahiplik ittifaklarındır (sunucuda servers/{s}/pyramids). Sv.N'ye saldırmak için ittifak en az 2 gündür Sv.N-1 piramide sahip olmalı.
export const PYR_LEVELS = {
  1: { n: 10, power: 5e6, dist: 830, r: 22 },
  2: { n: 7, power: 13e6, dist: 650, r: 24 },
  3: { n: 5, power: 30e6, dist: 480, r: 26 },
  4: { n: 3, power: 65e6, dist: 330, r: 28 },
  5: { n: 3, power: 140e6, dist: 190, r: 31 },
};
export const PYR_HOLD = 2 * 86400; // bir üst seviyeye geçmek için sahiplik süresi (sn)
export const PYR_RESET = 3600; // 1 saat vurulmayan piramidin hasarı sıfırlanır
export const PYRAMIDS = (() => {
  const out = []; let sd = 7741; const r01 = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (const L of [1, 2, 3, 4, 5]) {
    const d = PYR_LEVELS[L], off = L * 0.83;
    for (let i = 0; i < d.n; i++) {
      const a = off + i / d.n * Math.PI * 2 + (r01() - 0.5) * 0.25, dist = d.dist + (r01() - 0.5) * 40;
      out.push({ id: `pyr${L}_${i + 1}`, pyr: true, level: L, name: `Piramit Sv.${L}`, lord: 'Kadim Firavun', th: L, power: d.power, r: d.r, mapX: Math.round(THRONE.x + Math.cos(a) * dist), mapY: Math.round(THRONE.y + Math.sin(a) * dist), troops: {}, tower: 0, res: {}, shieldUntil: 0 });
    }
  }
  return out;
})();
// Demir Taht: Sv.5 piramidi en az 5 gündür elinde tutan ittifak savaş açabilir (350M can)
export const THRONE_HOLD = 5 * 86400;
export const THRONE_TARGET = { id: 'throne', pyr: true, throne: true, level: 6, name: 'Demir Taht', lord: 'Taht Muhafızları', th: 30, power: 350e6, r: 62, mapX: THRONE.x, mapY: THRONE.y, troops: {}, tower: 0, res: {}, shieldUntil: 0 };
export const nearPyramid = (x, y, pad = 0) => PYRAMIDS.some((p) => Math.hypot(x - p.mapX, y - p.mapY) < p.r + pad);
export const spotFree = (x, y, r = 24) => x > 30 && x < MAP_SIZE - 30 && y > 30 && y < MAP_SIZE - 30 && !nearThrone(x, y, 12) && !nearPyramid(x, y, 14) && occupied().every(([a, b]) => Math.hypot(a - x, b - y) > r);
export const TELEPORT_COST = 200;
export function teleport(x, y) {
  if (S.marches.length) return { ok: false, why: 'Seferdeki ordular dönmeden ışınlanamazsın' };
  if (!spotFree(x, y)) return { ok: false, why: 'Bu nokta dolu' };
  if (S.res.gold < TELEPORT_COST) return { ok: false, why: 'Yetersiz altın', needGold: true };
  S.res.gold -= TELEPORT_COST; S.mapX = Math.round(x); S.mapY = Math.round(y);
  S.enemies.forEach((e) => { if (Math.hypot(e.mapX - S.mapX, e.mapY - S.mapY) < 24) placeOnMap(e, S.enemies.indexOf(e)); });
  S.zombies = S.zombies.filter((z) => Math.hypot(z.mapX - S.mapX, z.mapY - S.mapY) > 20); tickZombies(true); S.mines = S.mines.filter((q) => q.busy || Math.hypot(q.mapX - S.mapX, q.mapY - S.mapY) > 20); tickMines(true);
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
  for (let k = 0; k < 80; k++) { const a = Math.random() * Math.PI * 2, d = 140 + Math.random() * (560 + k * 4), x = THRONE.x + Math.cos(a) * d, y = THRONE.y + Math.sin(a) * d; if (spotFree(x, y, 40)) { S.mapX = Math.round(x); S.mapY = Math.round(y); break; } }
  S.enemies.forEach((e, i) => placeOnMap(e, i)); S.zombies = []; S.zombieNext = 0; S.mines = S.mines.filter((q) => q.busy); S.mineNext = 0; save();
}
// eski 1000'lik harita kaydını 2000'lik haritaya taşı (tahta göre konum korunur)
function migrateMap() {
  const d = (MAP_SIZE - 1000) / 2, mv = (o) => { if (!o) return; if (o.mapX != null) o.mapX += d; if (o.mapY != null) o.mapY += d; if (o.cx != null) o.cx += d; if (o.cy != null) o.cy += d; };
  if (S.mapX != null) { S.mapX += d; S.mapY += d; }
  [...(S.enemies || []), ...(S.zombies || []), ...(S.mines || []), ...(S.giants || [])].forEach(mv);
  for (const m of S.marches || []) { for (const k of ['tx', 'ty', 'lx', 'ly']) if (m[k] != null) m[k] += d; if (m.giant) mv(m.giant); if (m.snap) mv(m.snap); }
  S.mapVer = MAP_VER;
}
function placeOnMap(e, i) {
  for (let k = 0; k < 40; k++) {
    const ang = (i * 2.399) + rand(-0.4, 0.4), dist = 32 + Math.sqrt(i + 1) * 24 + rand(-8, 8);
    const x = Math.round(S.mapX + Math.cos(ang) * dist), y = Math.round(S.mapY + Math.sin(ang) * dist);
    if (!nearThrone(x, y, 14) && Math.hypot(S.mapX - x, S.mapY - y) > 27 && S.enemies.every((o) => o === e || o.mapX == null || Math.hypot(o.mapX - x, o.mapY - y) > 27)) { e.mapX = Math.max(20, Math.min(MAP_SIZE - 20, x)); e.mapY = Math.max(20, Math.min(MAP_SIZE - 20, y)); return; }
  }
  e.mapX = Math.max(30, Math.min(MAP_SIZE - 30, S.mapX + rand(-300, 300))); e.mapY = Math.max(30, Math.min(MAP_SIZE - 30, S.mapY + rand(-300, 300)));
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
        out[yt] += X[xt] * d.atk * (side.tl ? side.tl(xt) : 1) * bonusFor(side, xt) * COUNTER[xt][yt] * share * (side.atkMul || 1);
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
        const lm = side.tl ? side.tl(t) : 1;
        const k = dmg[t] * 0.11 / ((d.hp * 0.08 + d.def * 0.1 * defMul) * lm * (side.defMul || 1)) * rand(0.9, 1.1);
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
const myTl = (t) => (TROOPS[t]?.building ? 1 : tMul(t));
export function armyPowerMulti(troops, ids) {
  let p = 0; for (const t in troops) { const d = TROOPS[t]; p += troops[t] * (d.atk + d.def + d.hp * 0.4) * myTl(t); }
  return Math.round(p * (1 + combinedBonus(heroesOf(ids)) / 100));
}
function heroOf(id) { const h = id && HERO_BY_ID[id], o = id && S.heroes[id]; return h && o ? { bonus: heroBonus(h, o.level, o.copies, o.ups), role: h.role, id } : null; }
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
export const ONLINE = { enemies: [], foreign: [], top: [], topAt: 0, rivalsAt: 0, rallyGiants: [], pyr: {}, cities: {} };
// piramidin sunucudaki durumu (yoksa sahipsiz ve tam canlı)
export function pyrState(p) {
  const d = ONLINE.pyr[p.id] || {}, stale = !d.lastHit || Date.now() - d.lastHit > PYR_RESET * 1000;
  return { owner: d.owner || null, ownedAt: d.ownedAt || 0, hp: stale ? p.power : Math.max(0, d.hp ?? p.power), dmg: stale ? {} : d.dmg || {}, names: d.names || {}, lastHit: d.lastHit || 0 };
}
// taht kalkanı: hiçbir ittifak Sv.5 piramidi 5 gündür tutmuyorsa kalkan herkese karşı açık
export function throneShield() {
  const nowMs = Date.now();
  return !PYRAMIDS.some((q) => { if (q.level !== 5) return false; const st = pyrState(q); return st.owner && st.ownedAt && nowMs - st.ownedAt >= THRONE_HOLD * 1000; });
}
// ittifakımın bu piramide saldırma hakkı var mı?
export function pyrAccess(p) {
  if (!S.alliance) return { ok: false, why: 'Piramitler için bir ittifaka katılmalısın' };
  const st = pyrState(p);
  if (st.owner?.aid === S.alliance.id) return { ok: false, why: 'Bu piramit zaten ittifakının', own: true };
  if (p.level === 1) return { ok: true };
  if (p.throne) {
    const mine = PYRAMIDS.filter((q) => q.level === 5).map((q) => pyrState(q)).filter((q) => q.owner?.aid === S.alliance.id);
    if (!mine.length) return { ok: false, why: 'Demir Taht\'a yalnızca Sv.5 piramide sahip ittifak saldırabilir' };
    const wait = Math.min(...mine.map((q) => q.ownedAt)) + THRONE_HOLD * 1000 - Date.now();
    if (wait > 0) return { ok: false, why: `Taht kalkanı: Sv.5 piramit 5 gündür sizde olmalı • ${fmtTime(wait / 1000)} kaldı`, wait };
    return { ok: true };
  }
  const nowMs = Date.now(), held = PYRAMIDS.filter((q) => q.level === p.level - 1).map((q) => pyrState(q)).filter((q) => q.owner?.aid === S.alliance.id);
  if (!held.length) return { ok: false, why: `Önce ittifakın bir Sv.${p.level - 1} piramide sahip olmalı` };
  const best = Math.min(...held.map((q) => q.ownedAt)), wait = best + PYR_HOLD * 1000 - nowMs;
  if (wait > 0) return { ok: false, why: `Sv.${p.level - 1} piramit 2 gündür sizde olmalı • ${fmtTime(wait / 1000)} kaldı`, wait };
  return { ok: true };
}
export const findEnemy = (id) => S.enemies.find((q) => q.id === id) || PYRAMIDS.find((q) => q.id === id) || (id === 'throne' ? THRONE_TARGET : null) || (S.zombies || []).find((q) => q.id === id) || (S.mines || []).find((q) => q.id === id) || (S.giants || []).find((q) => q.id === id) || ONLINE.rallyGiants.find((q) => q.id === id) || ONLINE.enemies.find((q) => q.id === id) || ONLINE.foreign.find((q) => q.id === id);
// Başka sunucunun bilgisayar krallıkları (görüntülenirken üretilir, kalıcı değil)
export function foreignBots(server) {
  let seed = server * 9973; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const base = Math.max(3000, armyPower(S.troops) + towerPower() + 6000), out = [];
  for (let i = 0; i < 30; i++) {
    const e = { id: 'f' + server + '_' + i, name: KINGDOM_NAMES[(i * 5 + server) % KINGDOM_NAMES.length] + ' #' + server, lord: LORD_NAMES[(i * 3 + server) % LORD_NAMES.length], mapX: Math.round(80 + rnd() * (MAP_SIZE - 160)), mapY: Math.round(80 + rnd() * (MAP_SIZE - 160)), troops: {}, tower: 0, th: 1, res: {}, power: 0, shieldUntil: 0, foreign: server };
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
  if (e.alliance && S.alliance && e.alliance.id === S.alliance.id) return { ok: false, why: '🤝 Müttefikine saldıramazsın' };
  if (e.giant) return { ok: false, why: '🗿 Devler yalnızca ittifak rallisiyle kesilebilir' };
  if (isCity(e) && !e.foreign && enemyHp(e) <= 0) return { ok: false, why: '🔥 Bu şehir yıkıldı, sahibi onu başka yere taşıyacak' };
  if (e.pyr) { const a = pyrAccess(e); if (!a.ok) return { ok: false, why: '🔺 ' + a.why }; }
  if (e.zombie && !zombieUnlocked(e.level)) return { ok: false, why: `🧟 Önce Sv.${e.level - 1} zombiyi öldür` };
  if (e.mine && !mineUnlocked(e.type, e.level)) return { ok: false, why: `⛏ Önce Sv.${e.level - 1} ${MINE_TYPES[e.type].name} kazmalısın` };
  if (e.mine && e.busy && S.marches.some((m) => m.id === e.busy)) return { ok: false, why: 'Bu madende zaten birliğin var' };
  if (e.zombie && S.marches.some((m) => m.target === e.id)) return { ok: false, why: 'Bu zombiye zaten ordu gidiyor' };
  if (S.marches.length >= MAX_MARCHES) return { ok: false, why: `En fazla ${MAX_MARCHES} birlik aynı anda dışarıda olabilir (saldırı, zombi, kazım)` };
  const troops = {}; let n = 0;
  for (const t in TROOPS) { troops[t] = Math.max(0, Math.min(sent[t] || 0, S.troops[t] || 0)); n += troops[t]; }
  if (!n) return { ok: false, why: 'Asker seç' };
  { const ec = energyCostOf(e); if (ec) { const r = spendEnergy(ec); if (!r.ok) return r; } }
  heroIds = (heroIds || []).filter((id) => S.heroes[id] && !S.marches.some((m) => m.heroes.includes(id))).slice(0, MAX_COMMANDERS);
  for (const t in troops) S.troops[t] -= troops[t];
  const dur = marchTime(e, troops), t0 = now();
  const m = { id: 'm' + Math.random().toString(36).slice(2, 8), target: enemyId, tname: e.name, tx: e.mapX, ty: e.mapY, foreign: e.foreign || (e.server && e.server !== S.server ? e.server : 0), snap: e.real || e.foreign ? JSON.parse(JSON.stringify(e)) : null, troops, heroes: heroIds, start: t0, arrive: t0 + dur, dur, phase: 'go' };
  if (e.mine) { m.kind = 'gather'; m.mtype = e.type; m.mlevel = e.level; m.rate = gatherRate(e.type, e.level, troops, heroIds); m.hours = mineHours(e.level); e.busy = m.id; }
  S.marches.push(m); save(); emit('march', m);
  return { ok: true, march: m };
}
export function recallMarch(id) {
  const m = S.marches.find((q) => q.id === id); if (!m) return false;
  if (m.kind === 'rally') return false;
  if (m.phase === 'gather') { finishGather(m, now()); save(); return true; }
  if (m.phase === 'stay') return marchHome(id);
  if (m.phase !== 'go') return false;
  if (m.kind === 'gather') { const e = findEnemy(m.target); if (e && e.busy === m.id) e.busy = null; }
  const el = now() - m.start; m.phase = 'back'; m.survivors = m.troops; m.start = now(); m.arrive = now() + Math.max(3, el); save(); return true;
}
// Şehir/zombi savaşı: varışta ya da hedefte beklerken "Tekrar saldır" ile.
// Kazanıp asker kalırsa birlik hedefte bekler (5 dk); kaybederse ya da asker kalmazsa dumanlar içinde 2 kat hızlı döner.
const isCity = (e) => e && !e.zombie && !e.pyr && !e.mine && !e.giant;
function sendHome(m, t, defeated) {
  if (!m.survivors) m.survivors = m.troops;
  m.phase = 'back'; m.start = t; m.defeated = !!defeated;
  m.arrive = t + (defeated ? Math.max(3, Math.round(m.dur / 2)) : m.dur);
}
function marchFight(m, t) {
  const e = findEnemy(m.target);
  if (!e || (isCity(e) && enemyHp(e) <= 0)) { sendHome(m, t, false); m.blocked = true; save(); emit('marchBlocked', { m, razed: !!e }); return null; }
  const army = m.phase === 'stay' ? { ...m.survivors } : { ...m.troops };
  for (const k in army) S.troops[k] += army[k];
  const r = attackEnemy(m.target, { ...army }, m.heroes);
  if (!r) { for (const k in army) S.troops[k] -= army[k]; m.survivors = army; sendHome(m, t, false); save(); return null; }
  m.survivors = {}; for (const k in r.res.A) { m.survivors[k] = r.res.A[k]; S.troops[k] -= r.res.A[k]; }
  const left = totalTroops(m.survivors);
  m.result = { win: r.res.win }; m.fights = (m.fights || 0) + 1;
  sendHome(m, t, !r.res.win || left === 0); // saldırıdan sonra hemen döner; dönerken "Tekrar saldır" ile geri gelebilir
  save(); emit('marchArrived', { m, r });
  return r;
}
// dönen birlik (asker kaldıysa, yenilmediyse, hedef şehir hâlâ ayaktaysa) yolun ortasından geri dönüp tekrar saldırır
export function canReattack(m) {
  if (!m || m.kind === 'gather' || m.kind === 'rally' || m.defeated || m.blocked) return false;
  if (m.phase === 'stay') return true;
  if (m.phase !== 'back' || !totalTroops(m.survivors || {})) return false;
  const e = findEnemy(m.target); return !!e && isCity(e) && enemyHp(e) > 0;
}
export function reattack(id) {
  const m = S.marches.find((q) => q.id === id); if (!canReattack(m)) return { ok: false, why: 'Bu birlik tekrar saldıramaz' };
  { const r = spendEnergy(energyCostOf(findEnemy(m.target)) || ENERGY_COST.attack); if (!r.ok) return r; }
  const t = now();
  if (m.phase === 'stay') { const r = marchFight(m, t); return r ? { ok: true, r } : { ok: false, why: 'Saldırı yapılamadı' }; }
  const k = Math.max(0, Math.min(1, (t - m.start) / Math.max(1, m.arrive - m.start)));
  m.troops = { ...m.survivors }; m.survivors = null; m.phase = 'go'; m.start = t - (1 - k) * m.dur; m.arrive = t + Math.max(1, k * m.dur);
  save(); emit('march', m); return { ok: true, turned: true };
}
export function marchHome(id) { const m = S.marches.find((q) => q.id === id); if (!m || m.phase !== 'stay') return false; sendHome(m, now(), false); save(); emit('marchStayEnd', m); return true; }
function tickMarches() {
  const t = now();
  for (const m of [...S.marches]) {
    if (m.kind === 'rally') { tickRally(m, t); continue; }
    if (m.kind === 'gather') {
      if (m.phase === 'go' && t >= m.arrive) { const e = findEnemy(m.target); if (!e) { m.phase = 'back'; m.survivors = m.troops; m.start = t; m.arrive = t + m.dur; m.loot = {}; continue; } m.phase = 'gather'; m.gStart = m.arrive; m.gEnd = m.arrive + m.hours * 3600; save(); emit('gatherStart', m); }
      if (m.phase === 'gather' && t >= m.gEnd) finishGather(m, m.gEnd);
      if (m.phase === 'back' && t >= m.arrive) { for (const k in m.troops) S.troops[k] += m.troops[k]; gainRes(m.loot || {}); S.marches = S.marches.filter((q) => q !== m); save(); emit('gatherHome', m); }
      continue;
    }
    if (m.phase === 'go' && t >= m.arrive) {
      if (m.snap && !findEnemy(m.target)) (m.snap.foreign ? ONLINE.foreign : ONLINE.enemies).push(m.snap);
      const e = findEnemy(m.target);
      if (e && e.pyr) { // piramide vuruş: hasar = ordu gücü, asker kaybı %6 (yaralı), sonuç sunucuda işlenir
        const dmg = Math.round(armyPowerMulti(m.troops, m.heroes) * (1 + rb('blade')) * (1 + rallyAtkBonus()));
        const loss = {}; for (const k in m.troops) { loss[k] = Math.floor(m.troops[k] * 0.06); }
        const split = applyLosses(loss); m.survivors = {}; for (const k in m.troops) m.survivors[k] = m.troops[k] - loss[k];
        m.phase = 'back'; m.start = t; m.arrive = t + m.dur; m.result = { pyr: true, dmg };
        const rep = { t, kind: 'pyramid', enemy: e.name, level: e.level, pid: e.id, dmg, aLoss: loss, wounded: split.wounded, dead: split.dead, win: null };
        S.reports.unshift(rep); S.reports = S.reports.slice(0, 30); save();
        emit('pyrHit', { pid: e.id, level: e.level, dmg, rep }); continue;
      }
      marchFight(m, t);
    } else if (m.phase === 'stay') {
      const e = findEnemy(m.target);
      if (t >= m.stayUntil || !e || enemyHp(e) <= 0) { sendHome(m, t, false); save(); emit('marchStayEnd', m); }
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
  count('scouts'); S.scouts.push(sc); save(); emit('scout', sc);
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
export const troopsAway = () => { const o = {}; for (const m of S.marches) { const tr = (m.phase === 'back' || m.phase === 'stay') && m.kind !== 'gather' && m.kind !== 'rally' ? m.survivors || {} : m.troops; for (const k in tr) o[k] = (o[k] || 0) + tr[k]; } return o; };
export function importSave(json) { localStorage.setItem(SAVE_KEY, json); }
export function exportSave() { save(); return JSON.parse(JSON.stringify(S)); }
// Diğer oyuncuların göreceği herkese açık profil (savunma bilgisi dahil)
// ---- Şehir canı ve yangın ----
// Her şehrin canı %100. Kazanılan saldırı canı yağmaya göre %25–50 düşürür (yağmalanacak bir şey kalmadıysa %25).
// Saldırıya uğrayan şehir yanar; yangın söndürülünce can CITY_REGEN saniyede dolar. %0'da şehir uzağa taşınır (yine yanar).
// o = { hp, fire, regenAt, hpAt } (hpAt: söndürüldüğü andaki can)
export const CITY_REGEN = 150, BOT_FIRE = 600;
export function cityHpOf(o) {
  if (!o || o.hp == null) return 100;
  if (o.fire) return o.hp;
  if (o.regenAt) return Math.min(100, (o.hpAt ?? o.hp) + (now() - o.regenAt) / CITY_REGEN * 100);
  return o.hp;
}
const settleCity = (o) => { if (o && !o.fire && o.regenAt && cityHpOf(o) >= 100) { o.hp = 100; o.regenAt = 0; o.hpAt = null; } };
export const myCityHp = () => { settleCity(S.city); return cityHpOf(S.city); };
export const myCityBurning = () => !!S.city.fire;
export function extinguish() {
  if (!S.city.fire) return false;
  S.city.fire = false; S.city.hpAt = S.city.hp; S.city.regenAt = now(); save(); emit('fire', S.city); return true;
}
// hasar: yağmalanan kaynak taşıma kapasitesine oranla %25 → %50
export function cityDamage(lootTot, cap) { return Math.round(25 + 25 * Math.max(0, Math.min(1, lootTot / Math.max(1, cap)))); }
// haritada uzak, boş bir yer (yıkılan şehrin taşındığı)
function farSpot(fx, fy) {
  for (let k = 0; k < 120; k++) { const x = 80 + Math.random() * (MAP_SIZE - 160), y = 80 + Math.random() * (MAP_SIZE - 160); if (Math.hypot(x - fx, y - fy) > 450 - k * 2 && spotFree(x, y, 30)) return [Math.round(x), Math.round(y)]; }
  return [Math.round(Math.max(60, Math.min(MAP_SIZE - 60, fx + 400))), Math.round(fy)];
}
// başka şehrin can durumu (bot: yerel; gerçek oyuncu: profilindeki can + bu cihazın son vuruşları)
export function enemyCity(e) {
  if (!e) return null;
  if (e.real) { const h = S.pvpHits[e.uid], c = e.city, ct = c ? (c.t || (e.updated || 0) / 1000) : 0; return h && h.t >= ct ? h : c || null; }
  return e.city || null;
}
export const enemyHp = (e) => cityHpOf(enemyCity(e));
// bot şehirlerin yangını bir süre sonra kendiliğinden söner, can dolar
function tickBotFires() { const t = now(); for (const e of S.enemies) { const c = e.city; if (!c) continue; if (c.fire && t - (c.fireAt || 0) > BOT_FIRE) { c.fire = false; c.hpAt = c.hp; c.regenAt = t; } settleCity(c); } }
// Profil vitrini: oyuncunun seçtiği (ya da en güçlü) 5 kahraman
export const SHOWCASE_N = 5;
export function showcaseIds() {
  const own = (id) => !!S.heroes[id] && !!HERO_BY_ID[id];
  const picked = (S.showcase || []).filter(own).slice(0, SHOWCASE_N);
  if (S.showcase && picked.length) return picked;
  return Object.keys(S.heroes).filter(own).sort((a, b) => heroPower(b) - heroPower(a)).slice(0, SHOWCASE_N);
}
// sıralama: en güçlü 5 kahramanın toplam gücü
export const heroPow5 = () => Object.keys(S.heroes).filter((id) => HERO_BY_ID[id]).map(heroPower).sort((a, b) => b - a).slice(0, 5).reduce((a, b) => a + b, 0);
export function setShowcase(ids) { S.showcase = ids && ids.length ? ids.filter((id) => S.heroes[id]).slice(0, SHOWCASE_N) : null; save(); emit('profile'); }
// Rozetler (profilde ve herkese açık profilde aynı liste)
export const BADGES = [
  { k: 'win1', n: 'İlk Zafer', i: 'ic_trophy' }, { k: 'pull10', n: 'Çağırıcı', i: 'ic_summon' }, { k: 'th5', n: 'Kale Lordu', i: 'nav_city' }, { k: 'harvest', n: 'Hasat Ustası', i: 'res_food' },
  { k: 'win10', n: 'Fatih', i: 'nav_heroes' }, { k: 'gold', n: 'Hazine', i: 'nav_shop' }, { k: 'kills', n: 'Kâşif', i: 'nav_world' }, { k: 'legend', n: 'Efsane', i: 'ic_gift' },
];
export function myBadges() {
  const ok = { win1: S.stats.wins >= 1, pull10: S.totalPulls >= 10, th5: thLevel() >= 5, harvest: (S.counters?.collects || 0) >= 20, win10: S.stats.wins >= 10, gold: S.res.gold >= 2000, kills: S.stats.kills >= 500, legend: Object.keys(S.heroes).some((x) => HERO_BY_ID[x]?.rarity === 5) };
  return BADGES.filter((b) => ok[b.k]).map((b) => b.k);
}
export function publicProfile() {
  const protect = 0.3 + maxLevelOf('warehouse') * 0.02, h = heroOf(S.commander);
  const lootable = {}; for (const r of ['food', 'wood', 'stone']) lootable[r] = Math.floor(S.res[r] * (1 - Math.min(0.8, protect)) * 0.5);
  return { name: String(S.name).slice(0, 24), power: cityPower(), th: thLevel(), troops: { ...S.troops }, towerPow: towerPower(), hero: h ? { bonus: Math.round(h.bonus), role: h.role, id: h.id } : null, lootable, vip: S.vip || 0, shieldUntil: 0, cityHp: Math.round(myCityHp()), fire: !!S.city.fire, wins: S.stats.wins, server: S.server || 1, mapX: S.mapX, mapY: S.mapY, frame: S.frame || 'bronze', skin: S.skin || null, mapVer: MAP_VER, alliance: S.alliance ? { id: S.alliance.id, tag: S.alliance.tag, name: String(S.alliance.name || '').slice(0, 24) } : null,
    cmd: S.commander || null, showcase: showcaseIds().map((id) => ({ id, lv: S.heroes[id].level || 1, ups: S.heroes[id].ups || 0 })),
    stats: { wins: S.stats.wins || 0, losses: S.stats.losses || 0, kills: S.stats.kills || 0, pulls: S.totalPulls || 0 }, badges: myBadges(),
    heroPow5: heroPow5(), camp: S.camp?.done || 0 };
}
// Gerçek oyuncuyu haritadaki düşman biçimine çevir
export function rivalToEnemy(p) {
  let hsh = 0; for (const ch of p.uid) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0;
  const ang = (hsh % 360) * Math.PI / 180, dist = 0.25 + ((hsh >> 9) % 60) / 100;
  const sh = p.mapVer === MAP_VER || p.mapX == null ? 0 : (MAP_SIZE - 1000) / 2; // eski 1000'lik haritadaki kayıt
  return { alliance: p.alliance || null, frame: p.frame || null, skin: p.skin || null, mapX: p.mapX != null ? p.mapX + sh : (S.mapX + Math.cos(ang) * 200 * dist), mapY: p.mapY != null ? p.mapY + sh : (S.mapY + Math.sin(ang) * 200 * dist), server: p.server || 1, id: 'p:' + p.uid, uid: p.uid, real: true, name: p.name || 'Oyuncu', lord: '🌐 Gerçek oyuncu', x: 0.5 + Math.cos(ang) * dist * 0.45, y: 0.5 + Math.sin(ang) * dist * 0.45,
    troops: { infantry: 0, spearman: 0, archer: 0, cavalry: 0, tank: 0, ...(p.troops || {}) }, tower: (p.towerPow || 0) / 120, th: p.th || 1, hero: p.hero || null,
    res: { food: (p.lootable?.food || 0) / 0.6, wood: (p.lootable?.wood || 0) / 0.6, stone: (p.lootable?.stone || 0) / 0.6, gold: 0 }, power: p.power || 0, shieldUntil: 0, updated: p.updated || 0,
    city: p.cityHp != null ? { hp: p.cityHp, fire: !!p.fire, t: (p.updated || 0) / 1000 } : null, ...cityDocOver(p) };
}
function cityDocOver(p) {
  const d = ONLINE.cities[p.uid]; if (!d || !(d.t * 1000 > (p.updated || 0))) return {};
  const o = { city: { hp: d.hp, fire: !!d.fire, fireAt: d.fireAt || 0, regenAt: d.regenAt || 0, hpAt: d.hpAt ?? null, t: d.t } };
  if (d.moved && d.x != null) { o.mapX = d.x; o.mapY = d.y; }
  return o;
}
// Kendi şehrimin sunucu kaydı: saldırgan şehri yıktıysa yeni konuma taşı, can/yangını eşitle
export function applyCityDoc(d) {
  let moved = null;
  if (d && d.t >= (S.city.t || 0) - 1) {
    if (d.moved && d.x != null && (d.x !== S.mapX || d.y !== S.mapY) && d.t > (S.city.movedT || 0)) { moved = { x: d.x, y: d.y }; S.city.movedT = d.t; }
    Object.assign(S.city, { hp: d.hp, fire: !!d.fire, fireAt: d.fireAt || 0, regenAt: d.regenAt || 0, hpAt: d.hpAt ?? null, t: d.t });
  }
  // yedek: kayıt yoksa ya da konum yazılamadıysa (kurallar yayınlanmadıysa) şehri ben taşırım
  if (!moved && S.city.pendingMove && S.city.hp <= 0) { const [x, y] = farSpot(S.mapX, S.mapY); moved = { x, y, local: true }; S.city.movedT = now(); }
  if (moved) { S.city.pendingMove = false; S.mapX = moved.x; S.mapY = moved.y; S.enemies.forEach((e, i) => placeOnMap(e, i)); S.zombies = []; S.zombieNext = 0; save(); emit('teleport'); emit('fire', S.city); }
  return moved;
}
// sunucuya yazılacak şehir kaydı (sahibi yazar: söndürme, taşınma)
export const myCityDoc = () => ({ hp: Math.round(myCityHp() * 10) / 10, fire: !!S.city.fire, fireAt: S.city.fireAt || 0, regenAt: S.city.regenAt || 0, hpAt: S.city.hpAt ?? null, t: now(), x: S.mapX, y: S.mapY, moved: false });
// Başka bir oyuncunun saldırısı (gelen kutusu) bu şehre uygulanır
export function applyIncoming(r) {
  const loss = {}; for (const t in TROOPS) loss[t] = Math.min(S.troops[t] || 0, Math.max(0, Math.round(r.dLoss?.[t] || 0)));
  for (const t in loss) S.troops[t] -= loss[t];
  const split = applyLosses(loss);
  const lost = {};
  let moved = null;
  if (r.win) {
    // depo koruması: kaynakların korunan kısmı asla yağmalanmaz (sıfıra inmez)
    const keep = Math.min(0.8, 0.3 + maxLevelOf('warehouse') * 0.02);
    for (const k of ['food', 'wood', 'stone']) { const floor = Math.floor(S.res[k] * keep); lost[k] = Math.max(0, Math.min(S.res[k] - floor, Math.round(r.loot?.[k] || 0))); S.res[k] -= lost[k]; }
    S.stats.losses++;
    // şehir canı düşer ve yanar; %0'da uzağa taşınır
    const hp = Math.max(0, myCityHp() - Math.max(0, r.dmg || 25)), at = Math.floor((r.t || Date.now()) / 1000);
    S.city = { ...S.city, hp, fire: true, fireAt: at, regenAt: 0, hpAt: null, t: at, pendingMove: hp <= 0 };
    if (hp <= 0) moved = true;
    emit('fire', S.city);
  } else { S.stats.wins++; }
  const rep = { t: Math.floor((r.t || Date.now()) / 1000), kind: 'defense', pvp: true, win: !r.win, enemy: r.name || 'Bir oyuncu', lord: '🌐 Gerçek oyuncu', sent: r.sent || {}, aLoss: loss, dLoss: r.aLoss || {}, wounded: split.wounded, dead: split.dead, loot: lost, hero: S.commander, dmg: r.win ? (r.dmg || 25) : 0, cityHp: Math.round(myCityHp()), moved };
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
  const res = simulateBattle({ tl: myTl, troops: sent, heroes: heroesOf(heroIds), atkMul: (1 + rb('blade')) * (1 + rallyAtkBonus()), defMul: (1 + rb('armor')) * (1 + forgeDefBonus()) }, { troops: e.troops, hero: e.hero || null, tower: e.tower * 120 });
  const split = applyLosses(res.aLoss);
  for (const t in res.A) S.troops[t] += res.A[t];
  let loot = {}, items = null;
  if (e.zombie) {
    if (res.win) { loot = zombieLoot(e.level); items = zombieItems(e.level); gainRes(loot); for (const it of items) addItem(it.id, it.n); S.zombieMax = Math.max(S.zombieMax, e.level); S.zombieKills++; count('zombies'); S.stats.wins++; count('wins'); S.zombies = S.zombies.filter((z) => z !== e); ensureNextZombie(); }
    else { S.stats.losses++; for (const t in e.troops) e.troops[t] = res.D[t]; e.power = armyPower(e.troops); }
    S.stats.kills += totalTroops(res.dLoss); count('kills', totalTroops(res.dLoss));
    if (res.win) for (const id of heroIds) if (S.heroes[id].level < heroMaxLevel() && Math.random() < 0.5) S.heroes[id].level++;
    const rep = { t: now(), kind: 'attack', zombie: e.level, win: res.win, enemy: e.name, lord: e.lord, sent, aLoss: res.aLoss, dLoss: res.dLoss, wounded: split.wounded, dead: split.dead, loot, items, hero: heroId, heroes: heroIds };
    S.reports.unshift(rep); S.reports = S.reports.slice(0, 30);
    save(); emit('battle', rep);
    return { rep, res, enemy: e, sent };
  }
  let dmg = 0, razed = null, cap = 0, cityDoc = null;
  if (res.win) {
    cap = Object.entries(res.A).reduce((s, [t, n]) => s + n * TROOPS[t].load, 0) * (1 + rb('logis')) * (1 + rallyLoadBonus());
    for (const r of ['food', 'wood', 'stone']) { const take = Math.min(Math.floor(e.res[r] * 0.6), Math.floor(cap / 3)); loot[r] = take; e.res[r] -= take; }
    loot.gold = e.res.gold; e.res.gold = 0;
    addRes(loot);
    S.stats.wins++; count('wins');
    // şehir canı: yağmaya göre %25–50 düşer, şehir yanar; %0'da uzağa taşınır
    dmg = cityDamage((loot.food || 0) + (loot.wood || 0) + (loot.stone || 0), cap);
    const before = enemyHp(e), hp = Math.max(0, before - dmg);
    const c = { hp, fire: true, fireAt: now(), t: now() };
    if (e.real) { if (hp <= 0) { const [x, y] = farSpot(e.mapX, e.mapY); c.x = x; c.y = y; c.moved = true; e.mapX = x; e.mapY = y; } S.pvpHits[e.uid] = c; cityDoc = { hp: c.hp, fire: true, fireAt: c.fireAt, regenAt: 0, hpAt: null, t: c.t, ...(c.moved ? { x: c.x, y: c.y, moved: true } : {}) }; }
    else { e.city = c; if (hp <= 0) { const [x, y] = farSpot(e.mapX, e.mapY); e.mapX = x; e.mapY = y; razed = { x, y }; e.res = { food: 0, wood: 0, stone: 0, gold: 0 }; } }
    if (e.real && hp <= 0) razed = { x: e.mapX, y: e.mapY };
  } else S.stats.losses++;
  for (const t in e.troops) e.troops[t] = res.D[t];
  e.power = armyPower(e.troops) + e.tower * 260;
  S.stats.kills += totalTroops(res.dLoss); count('kills', totalTroops(res.dLoss));
  // kahraman deneyimi
  if (res.win) for (const id of heroIds) if (S.heroes[id].level < heroMaxLevel() && Math.random() < 0.5) S.heroes[id].level++;
  const rep = { t: now(), kind: 'attack', win: res.win, enemy: e.name, lord: e.lord, sent, aLoss: res.aLoss, dLoss: res.dLoss, wounded: split.wounded, dead: split.dead, loot, hero: heroId, heroes: heroIds, pvp: !!e.real, uid: e.uid, dmg, cityHp: Math.round(enemyHp(e)), razed };
  S.reports.unshift(rep); S.reports = S.reports.slice(0, 30);
  save(); emit('battle', rep);
  return { rep, res, enemy: e, sent, dmg, razed, cityDoc };
}

// ---- Zombiler: 1–100. seviye, sırayla açılır, haritada sürekli yenilenir ----
// Gereken güç: Sv.1 10 bin, Sv.2 45 bin, Sv.3 75 bin, Sv.4 100 bin, sonra her seviye ×1,103 (Sv.20 ≈ 480 bin, Sv.50 ≈ 9 milyon, Sv.100 ≈ 1,2 milyar)
export const ZOMBIE_MAX_LEVEL = 100;
export function zombiePower(L) { return L <= 1 ? 10000 : L === 2 ? 45000 : L === 3 ? 75000 : Math.round(100000 * Math.pow(1.1028, L - 4)); }
export const zombieUnlocked = (L) => L <= (S.zombieMax || 0) + 1;
// Ödül: 10–50 bin kaynak (seviyeyle artar), her zaman 1 dk hızlandırma, bazen 5 dk
export function zombieLoot(L) { const k = 1 + (L - 1) * 0.15, o = {}; for (const r of ['food', 'wood', 'stone']) o[r] = Math.round(rand(10000, 50000) * k * (r === 'stone' ? 0.6 : 1) / 100) * 100; return o; }
export function zombieItems(L) { const out = [{ id: 's1m', n: 1 + Math.floor(L / 20) }]; if (Math.random() < 0.3 + Math.min(0.4, L * 0.004)) out.push({ id: 's5m', n: 1 + Math.floor(L / 40) }); return out; }
export const zombieLootRange = (L) => { const k = 1 + (L - 1) * 0.15; return [Math.round(10000 * k), Math.round(50000 * k)]; };
const ZOMBIE_COUNT = 14;
function makeZombie(L, near) {
  const n = Math.max(20, Math.round(zombiePower(L) / 36.8));
  const z = { id: 'z' + Math.random().toString(36).slice(2, 8), zombie: true, level: L, name: `Zombi Sv.${L}`, lord: 'Ölüler Ordusu', th: L, tower: 0, hero: null, res: {}, shieldUntil: 0, troops: { infantry: n, spearman: 0, archer: 0, cavalry: 0, tank: 0 } };
  z.power = armyPower(z.troops);
  for (let k = 0; k < 40; k++) {
    const a = rand(0, Math.PI * 2), d = near ? rand(70, 200) : rand(120, 450), x = (S.mapX ?? MAP_MID) + Math.cos(a) * d, y = (S.mapY ?? MAP_MID) + Math.sin(a) * d;
    if (x < 30 || x > MAP_SIZE - 30 || y < 30 || y > MAP_SIZE - 30 || nearThrone(x, y, 16) || nearPyramid(x, y, 10)) continue;
    if (occupied().concat([[S.mapX, S.mapY]]).every(([px, py]) => Math.hypot(px - x, py - y) > 30) && S.zombies.concat(S.mines || []).every((q) => Math.hypot(q.mapX - x, q.mapY - y) > 40)) { z.mapX = Math.round(x); z.mapY = Math.round(y); return z; }
  }
  return null;
}
// eksik zombileri tamamla: yarısı oyuncunun sıradaki seviyelerine yakın, yarısı 1–100 karışık
function spawnZombies(n) {
  for (let i = 0; i < n; i++) {
    const m = S.zombieMax || 0, nearLv = i % 3 === 0;
    const L = nearLv ? Math.max(1, Math.min(ZOMBIE_MAX_LEVEL, m + randi(-2, 2) + (i % 4 === 0 ? 1 : 0))) : randi(1, ZOMBIE_MAX_LEVEL);
    const z = makeZombie(L, nearLv); if (z) S.zombies.push(z);
  }
  // sıradaki seviye her zaman haritada (yakında) olsun
  const next = Math.min(ZOMBIE_MAX_LEVEL, (S.zombieMax || 0) + 1);
  if (!S.zombies.some((z) => z.level === next)) { const z = makeZombie(next, true); if (z) S.zombies.push(z); }
}
// 10–20 dakikada bir yenilenir; ilk açılışta harita doldurulur
export function tickZombies(force) {
  if (S.mapX == null) return;
  const t = now();
  if (!S.zombies.length || force) { spawnZombies(ZOMBIE_COUNT - S.zombies.length); S.zombieNext = t + rand(600, 1200); emit('zombies'); return; }
  if (t >= S.zombieNext) { spawnZombies(Math.max(1, ZOMBIE_COUNT - S.zombies.length)); S.zombieNext = t + rand(600, 1200); emit('zombies'); }
  ensureNextZombie();
}
// sıradaki seviye her zaman haritada olsun
function ensureNextZombie() { const next = Math.min(ZOMBIE_MAX_LEVEL, (S.zombieMax || 0) + 1); if (!S.zombies.some((z) => z.level === next)) { const z = makeZombie(next, true); if (z) { S.zombies.push(z); emit('zombies'); } } }
// Haritada ara: seçilen seviyedeki en yakın zombi; yoksa oyuncunun yakınında hemen oluştur
export function findZombie(L) {
  L = Math.max(1, Math.min(ZOMBIE_MAX_LEVEL, Math.round(L)));
  if (!zombieUnlocked(L)) return { ok: false, why: `🔒 Önce Sv.${L - 1} zombiyi öldür` };
  const d = (z) => Math.hypot(z.mapX - S.mapX, z.mapY - S.mapY);
  let z = S.zombies.filter((q) => q.level === L).sort((a, b) => d(a) - d(b))[0], created = false;
  if (!z) { z = makeZombie(L, true); if (!z) return { ok: false, why: 'Yakında boş yer bulunamadı' }; S.zombies.push(z); created = true; save(); emit('zombies'); }
  return { ok: true, zombie: z, created };
}
export const zombieRespawnIn = () => Math.max(0, (S.zombieNext || 0) - now());

// ---- Madenler: buğday, kereste, taş, altın — Sv.1–10, sırayla açılır ----
export const MAX_MARCHES = 3;
export const MINE_TYPES = {
  food: { name: 'Buğday Tarlası', icon: '🌾', base: 4000, top: 20000 },
  wood: { name: 'Kereste Ormanı', icon: '🪵', base: 4000, top: 20000 },
  stone: { name: 'Taş Ocağı', icon: '🪨', base: 2400, top: 12000 },
  gold: { name: 'Altın Madeni', icon: '🪙', base: 10, top: 40 },
};
export const MINE_MAX_LEVEL = 10;
// saatlik taban verim (Sv.1 → Sv.10 geometrik), kazım süresi (Sv.1 3 sa, her seviye +30 dk), tam verim için gereken güç
export const mineRate = (type, L) => Math.round(MINE_TYPES[type].base * Math.pow(MINE_TYPES[type].top / MINE_TYPES[type].base, (L - 1) / 9));
export const mineHours = (L) => 3 + (L - 1) * 0.5;
export const mineRefPower = (L) => Math.round(6000 * Math.pow(1.75, L - 1));
export const mineUnlocked = (type, L) => L <= (S.mineMax?.[type] || 0) + 1;
// gönderilen gücün tam verim gücüne oranı (en az %25) × komutan bonusu (en fazla +%50)
// ---- Enerji: en fazla 200, 5 dk'da 1 dolar (200'de durur). Saldırı/ralli 10, zombi 5. Ödüller 200'ü aşabilir. ----
export const ENERGY_MAX = 200, ENERGY_REGEN = 300, ENERGY_COST = { attack: 10, rally: 10, zombie: 5 };
export function energyNow() {
  const t = now();
  if (S.energy >= ENERGY_MAX) { S.energyAt = t; return S.energy; }
  const g = Math.floor((t - (S.energyAt || t)) / ENERGY_REGEN);
  if (g > 0) { S.energy = Math.min(ENERGY_MAX, S.energy + g); S.energyAt = S.energy >= ENERGY_MAX ? t : S.energyAt + g * ENERGY_REGEN; }
  return S.energy;
}
export const energyNextIn = () => (energyNow() >= ENERGY_MAX ? 0 : Math.max(0, ENERGY_REGEN - (now() - S.energyAt)));
export const energyFullIn = () => { const e = energyNow(); return e >= ENERGY_MAX ? 0 : energyNextIn() + (ENERGY_MAX - e - 1) * ENERGY_REGEN; };
export function spendEnergy(n) {
  if (energyNow() < n) return { ok: false, why: `⚡ ${n} enerji gerekli (sende ${S.energy}). Enerji 5 dakikada 1 dolar` };
  const full = S.energy >= ENERGY_MAX; S.energy -= n; if (full) S.energyAt = now(); count('energy', n); emit('energy'); return { ok: true };
}
export const addEnergy = (n) => { energyNow(); S.energy += n; emit('energy'); };
export function energyCostOf(e) { if (!e || e.mine || e.giant) return 0; return e.zombie ? ENERGY_COST.zombie : ENERGY_COST.attack; }
// ---- Fetih Yolu etkinliği ----
// S.fy = { start, bases: { gün: sayaç kopyası }, claimed: { görevNo: 1 }, bonus: { gün: 1 } }. Gün açıldığında sayaçlar kopyalanır,
// o günün görev ilerlemesi = sayaç − kopya. 7 gün sonra yeni sezon başlar.
export function fyState() {
  const t = now();
  if (!S.fy || t - S.fy.start >= 7 * 86400) { const d0 = new Date(); d0.setHours(0, 0, 0, 0); S.fy = { start: d0.getTime() / 1000, bases: {}, claimed: {}, bonus: {} }; }
  const day = Math.min(6, Math.floor((t - S.fy.start) / 86400));
  for (let d = 0; d <= day; d++) if (!S.fy.bases[d]) S.fy.bases[d] = { ...S.counters };
  return { day, endsIn: S.fy.start + 7 * 86400 - t, nextIn: S.fy.start + (day + 1) * 86400 - t };
}
export const fyProg = (q) => { const b = S.fy?.bases?.[q.day]; return b ? Math.max(0, (S.counters[q.stat] || 0) - (b[q.stat] || 0)) : 0; };
export const fyDone = (q) => fyProg(q) >= q.n;
export const fyDayTasks = (d) => FY_TASKS.filter((q) => q.day === d);
export const fyDayClaimed = (d) => fyDayTasks(d).filter((q) => S.fy?.claimed[q.i]).length;
export function giveReward(r) {
  for (const k of ['food', 'wood', 'stone']) if (r[k]) S.res[k] += r[k];
  if (r.gold) S.res.gold += r.gold;
  if (r.energy) addEnergy(r.energy);
  for (const [id, n] of Object.entries(r.items || {})) addItem(id, n);
}
export function claimFy(i) {
  const { day } = fyState(), q = FY_TASKS[i];
  if (!q || q.day > day) return { ok: false, why: 'Bu gün henüz açılmadı' };
  if (S.fy.claimed[i]) return { ok: false, why: 'Zaten alındı' };
  if (!fyDone(q)) return { ok: false, why: 'Görev henüz tamamlanmadı' };
  S.fy.claimed[i] = 1; giveReward(q.reward); save(); emit('fy'); return { ok: true, reward: q.reward };
}
export function claimFyBonus(d) {
  const { day } = fyState();
  if (d > day || S.fy.bonus[d]) return { ok: false, why: 'Alınamaz' };
  if (fyDayClaimed(d) < FY_DAYS[d]) return { ok: false, why: 'Önce günün tüm görevlerini tamamla' };
  S.fy.bonus[d] = 1; giveReward(FY_BONUS[d]); save(); emit('fy'); return { ok: true, reward: FY_BONUS[d] };
}
export function fyClaimable() { if (!S.fy) return 0; const { day } = fyState(); let n = 0; for (const q of FY_TASKS) if (q.day <= day && !S.fy.claimed[q.i] && fyDone(q)) n++; for (let d = 0; d <= day; d++) if (!S.fy.bonus[d] && fyDayClaimed(d) >= FY_DAYS[d]) n++; return n; }
// ---- VIP ----
export const vipMine = () => (S.vip ? VIP[S.vip].mine : 0);
export const vipBoxReady = () => S.vip > 0 && now() >= (S.vipBoxAt || 0);
export const vipBoxIn = () => Math.max(0, (S.vipBoxAt || 0) - now());
export function buyVip() {
  if (S.vip >= VIP_MAX) return { ok: false, why: 'En yüksek VIP seviyesindesin' };
  const L = S.vip + 1, d = VIP[L];
  if (S.res.gold < d.cost) return { ok: false, why: `${d.cost} altın gerekli`, needGold: true };
  S.res.gold -= d.cost; S.vip = L;
  if (d.skin) S.skins[d.skin] = true;
  if (d.frame) S.frames[d.frame] = true;
  if (L === 1 || !S.vipBoxAt) S.vipBoxAt = 0; // ilk kutu hemen
  save(); emit('vip', L); return { ok: true, level: L };
}
export function claimVipBox() {
  if (!vipBoxReady()) return { ok: false, why: 'Kutu henüz hazır değil' };
  const d = VIP[S.vip], b = d.box;
  for (const [id, n] of Object.entries(b.items || {})) addItem(id, n);
  addEnergy(b.energy || 0);
  if (b.gold) S.res.gold += b.gold;
  S.vipBoxAt = now() + d.every * 86400; save(); emit('vip', S.vip); return { ok: true, box: b };
}
export function gatherRate(type, L, troops, heroIds) {
  const pw = armyPowerMulti(troops, heroIds), f = Math.max(0.25, Math.min(1, pw / mineRefPower(L)));
  const hb = 1 + Math.min(0.5, combinedBonus(heroesOf(heroIds)) / 200);
  return Math.max(1, Math.round(mineRate(type, L) * f * hb * (1 + vipMine() / 100)));
}
function finishGather(m, at) { count('gathers');
  const hrs = Math.max(0, Math.min(m.hours, (at - m.gStart) / 3600)), amount = Math.floor(m.rate * hrs);
  m.loot = { [m.mtype]: amount };
  if (hrs > 0) S.mineMax[m.mtype] = Math.max(S.mineMax[m.mtype] || 0, m.mlevel);
  S.mines = S.mines.filter((q) => q.id !== m.target); // maden tükendi
  ensureNextMine(m.mtype);
  const t = now(); m.phase = 'back'; m.start = t; m.arrive = t + m.dur;
  S.reports.unshift({ t, kind: 'gather', win: true, enemy: `${MINE_TYPES[m.mtype].name} Sv.${m.mlevel}`, loot: m.loot, hrs }); S.reports = S.reports.slice(0, 30);
  emit('gatherDone', m);
}
const MINE_MIX = ['food', 'wood', 'stone', 'food', 'wood', 'stone', 'gold'];
function makeMine(type, L, near) {
  const m = { id: 'n' + Math.random().toString(36).slice(2, 8), mine: true, type, level: L, name: `${MINE_TYPES[type].name} Sv.${L}`, lord: 'Kaynak noktası', th: L, power: 0, troops: {}, tower: 0, res: {}, shieldUntil: 0, busy: null };
  for (let k = 0; k < 40; k++) {
    const a = rand(0, Math.PI * 2), d = near ? rand(35, 170) : rand(60, 420), x = (S.mapX ?? MAP_MID) + Math.cos(a) * d, y = (S.mapY ?? MAP_MID) + Math.sin(a) * d;
    if (x < 30 || x > MAP_SIZE - 30 || y < 30 || y > MAP_SIZE - 30 || nearThrone(x, y, 16) || nearPyramid(x, y, 10)) continue;
    if (occupied().concat([[S.mapX, S.mapY]]).every(([px, py]) => Math.hypot(px - x, py - y) > 28) && S.zombies.concat(S.mines).every((q) => Math.hypot(q.mapX - x, q.mapY - y) > 18)) { m.mapX = Math.round(x); m.mapY = Math.round(y); return m; }
  }
  return null;
}
function ensureNextMine(type) { const next = Math.min(MINE_MAX_LEVEL, (S.mineMax[type] || 0) + 1); if (!S.mines.some((q) => q.type === type && q.level === next && !q.busy)) { const m = makeMine(type, next, true); if (m) { S.mines.push(m); emit('mines'); } } }
const MINE_COUNT = 16;
export function tickMines(force) {
  if (S.mapX == null) return;
  const t = now();
  if (force || !S.mines.length || t >= (S.mineNext || 0)) {
    for (let i = S.mines.length; i < MINE_COUNT; i++) {
      const type = MINE_MIX[i % MINE_MIX.length], mx = S.mineMax[type] || 0, near = i % 2 === 0;
      const L = near ? Math.max(1, Math.min(MINE_MAX_LEVEL, mx + randi(-1, 1))) : randi(1, MINE_MAX_LEVEL);
      const m = makeMine(type, L, near); if (m) S.mines.push(m);
    }
    S.mineNext = t + rand(600, 1200); emit('mines');
  }
  for (const type in MINE_TYPES) ensureNextMine(type);
}
// Haritada ara: seçilen türde ve seviyede en yakın boş maden; yoksa yakında oluştur
export function findMine(type, L) {
  L = Math.max(1, Math.min(MINE_MAX_LEVEL, Math.round(L)));
  if (!mineUnlocked(type, L)) return { ok: false, why: `🔒 Önce Sv.${L - 1} ${MINE_TYPES[type].name} kazmalısın` };
  const d = (q) => Math.hypot(q.mapX - S.mapX, q.mapY - S.mapY);
  let m = S.mines.filter((q) => q.type === type && q.level === L && !q.busy).sort((a, b) => d(a) - d(b))[0], created = false;
  if (!m) { m = makeMine(type, L, true); if (!m) return { ok: false, why: 'Yakında boş yer bulunamadı' }; S.mines.push(m); created = true; save(); emit('mines'); }
  return { ok: true, mine: m, created };
}

// ---- Devler (1–78): haritada dolaşır, yalnızca ittifak rallisiyle (en fazla 5 kişi) kesilir ----
export const GIANT_MAX_LEVEL = 78, RALLY_MAX = 5, RALLY_WAIT = 180, RALLY_MUSTER = 30;
export function giantPower(L) { return L <= 1 ? 150000 : L === 2 ? 500000 : L === 3 ? 800000 : Math.round(800000 * Math.pow(1.12, L - 3)); }
export const giantUnlocked = (L) => L <= (S.giantMax || 0) + 1;
// eşit ödül: kaynak (altın yok) + hızlandırmalar; seviyeyle ölçülü artar
export function giantRewards(L) {
  const k = 1 + (L - 1) * 0.12, res = { food: Math.round(15000 * k / 100) * 100, wood: Math.round(15000 * k / 100) * 100, stone: Math.round(9000 * k / 100) * 100 };
  const items = [{ id: 's1m', n: 2 + Math.floor((L - 1) / 3) }];
  const n5 = L >= 30 ? 3 + Math.floor((L - 30) / 12) : L % 3 === 0 ? 2 + Math.floor(L / 12) : 0; if (n5) items.push({ id: 's5m', n: n5 });
  if (L >= 40) items.push({ id: 's15m', n: 1 + Math.floor((L - 40) / 15) });
  if (L >= 60 && L % 5 === 0) items.push({ id: 's1h', n: 1 });
  return { res, items };
}
// hareket: her dev kendi merkezinin çevresinde, zamana bağlı (belirlenimci) bir rotada yürür
export function giantPos(g, t = now()) {
  if (g.frozen) return [g.mapX, g.mapY];
  const ph = t * g.spd + g.ph, r = g.r;
  const x = g.cx + Math.cos(ph) * r + Math.cos(ph * 2.3 + 1) * r * 0.25, y = g.cy + Math.sin(ph * 0.8) * r * 0.9 + Math.sin(ph * 1.7) * r * 0.2;
  return [Math.max(30, Math.min(MAP_SIZE - 30, x)), Math.max(30, Math.min(MAP_SIZE - 30, y))];
}
function makeGiant(L, near) {
  for (let k = 0; k < 40; k++) {
    const a = rand(0, Math.PI * 2), d = near ? rand(90, 220) : rand(150, 460), x = (S.mapX ?? MAP_MID) + Math.cos(a) * d, y = (S.mapY ?? MAP_MID) + Math.sin(a) * d;
    if (x < 70 || x > MAP_SIZE - 70 || y < 70 || y > MAP_SIZE - 70 || nearThrone(x, y, 50) || nearPyramid(x, y, 30)) continue;
    if (Math.hypot(S.mapX - x, S.mapY - y) < 80 || S.giants.some((q) => Math.hypot(q.cx - x, q.cy - y) < 70)) continue;
    const g = { id: 'g' + Math.random().toString(36).slice(2, 8), giant: true, level: L, name: `Dev Sv.${L}`, lord: 'Dağların Devi', th: L, power: giantPower(L), troops: {}, tower: 0, res: {}, shieldUntil: 0, cx: Math.round(x), cy: Math.round(y), r: rand(18, 34), spd: rand(0.004, 0.008) * (Math.random() < 0.5 ? -1 : 1), ph: rand(0, 6.28) };
    [g.mapX, g.mapY] = giantPos(g); return g;
  }
  return null;
}
function ensureNextGiant() { const next = Math.min(GIANT_MAX_LEVEL, (S.giantMax || 0) + 1); if (!S.giants.some((q) => q.level === next)) { const g = makeGiant(next, true); if (g) { S.giants.push(g); emit('giants'); } } }
export function tickGiants(force) {
  if (S.mapX == null) return;
  const t = now();
  for (const g of S.giants) [g.mapX, g.mapY] = giantPos(g, t);
  if (force || !S.giants.length || t >= (S.giantNext || 0)) {
    for (let i = S.giants.length; i < 6; i++) { const mx = S.giantMax || 0, near = i % 2 === 0; const g = makeGiant(near ? Math.max(1, Math.min(GIANT_MAX_LEVEL, mx + randi(-1, 1))) : randi(1, GIANT_MAX_LEVEL), near); if (g) S.giants.push(g); }
    S.giantNext = t + rand(900, 1500); emit('giants');
  }
  ensureNextGiant();
}
export function findGiant(L) {
  L = Math.max(1, Math.min(GIANT_MAX_LEVEL, Math.round(L)));
  if (!giantUnlocked(L)) return { ok: false, why: `🔒 Önce Sv.${L - 1} devi kesmelisiniz` };
  let g = S.giants.filter((q) => q.level === L && !q.frozen).sort((a, b) => Math.hypot(a.mapX - S.mapX, a.mapY - S.mapY) - Math.hypot(b.mapX - S.mapX, b.mapY - S.mapY))[0], created = false;
  if (!g) { g = makeGiant(L, true); if (!g) return { ok: false, why: 'Yakında boş yer bulunamadı' }; S.giants.push(g); created = true; save(); emit('giants'); }
  return { ok: true, giant: g, created };
}
// ralli seferi: wait (şehirde) → muster (son 30 sn lider şehrine) → go (deve) → back
const rallyMarchTime = (from, to) => Math.round(Math.min(150, Math.max(10, 8 + Math.hypot(to[0] - from[0], to[1] - from[1]) * 0.18)));
export function startRallyMarch(r, troops, heroIds) {
  if (S.marches.length >= MAX_MARCHES) return { ok: false, why: `En fazla ${MAX_MARCHES} birlik aynı anda dışarıda olabilir` };
  const tr = {}; let n = 0;
  for (const t in TROOPS) { tr[t] = Math.max(0, Math.min(troops[t] || 0, S.troops[t] || 0)); n += tr[t]; }
  if (!n) return { ok: false, why: 'Asker seç' };
  heroIds = (heroIds || []).filter((id) => S.heroes[id] && !S.marches.some((m) => (m.heroes || []).includes(id))).slice(0, MAX_COMMANDERS);
  for (const t in tr) S.troops[t] -= tr[t];
  const power = armyPowerMulti(tr, heroIds);
  const m = { id: 'r' + Math.random().toString(36).slice(2, 8), kind: 'rally', rid: r.rid, aid: r.aid, leader: r.leader, tname: `Dev Sv.${r.giant.level}`, giant: r.giant, tx: r.giant.mapX, ty: r.giant.mapY, lx: r.lx, ly: r.ly, endsAt: r.endsAt, troops: tr, heroes: heroIds, power, phase: 'wait', start: now(), arrive: r.endsAt };
  S.marches.push(m); save(); emit('march', m);
  return { ok: true, march: m, power, troops: tr };
}
function tickRally(m, t) {
  if (m.phase === 'wait' && t >= m.endsAt - RALLY_MUSTER) { m.phase = 'muster'; m.start = m.endsAt - RALLY_MUSTER; m.arrive = m.endsAt; emit('rallyMuster', m); }
  if (m.phase === 'muster' && t >= m.endsAt) {
    if (!m.final) { m.needFinal = true; return; } // katılımcı listesi sunucudan bekleniyor
    if (m.final.length < (m.giant.pyr ? 1 : 2)) { // kimse katılmadı → iptal (piramit rallisi tek başına da yürür)
      for (const k in m.troops) S.troops[k] += m.troops[k];
      S.marches = S.marches.filter((q) => q !== m); unfreezeGiant(m); save(); emit('rallyCancel', m); return;
    }
    const d = rallyMarchTime([m.lx, m.ly], [m.tx, m.ty]); m.phase = 'go'; m.start = t; m.arrive = t + d; m.dur = d; save(); emit('rallyGo', m);
  }
  if (m.phase === 'go' && t >= m.arrive && m.giant.pyr) { // piramit rallisi: toplam güç kadar hasar, lider sunucuya işler
    const total = m.final.reduce((a, q) => a + (q.power || 0), 0), loss = {};
    for (const k in m.troops) { loss[k] = Math.floor(m.troops[k] * 0.08); m.troops[k] -= loss[k]; }
    const split = applyLosses(loss);
    m.result = { pyr: true, total, members: m.final.length };
    const rep = { t, kind: 'pyramid', rally: true, enemy: `Piramit Sv.${m.giant.level}`, level: m.giant.level, pid: m.giant.id, dmg: total, members: m.final.map((q) => q.name), aLoss: loss, wounded: split.wounded, dead: split.dead, win: null };
    S.reports.unshift(rep); S.reports = S.reports.slice(0, 30);
    const d = rallyMarchTime([m.tx, m.ty], [S.mapX, S.mapY]); m.phase = 'back'; m.start = t; m.arrive = t + d; save();
    emit('pyrRally', { m, pid: m.giant.id, level: m.giant.level, dmg: total, rep });
    return;
  }
  if (m.phase === 'go' && t >= m.arrive) {
    const total = m.final.reduce((a, q) => a + (q.power || 0), 0), need = m.giant.power, win = total >= need;
    const frac = win ? Math.max(0.04, Math.min(0.35, 0.3 * need / total)) : 0.35, loss = {};
    for (const k in m.troops) { loss[k] = Math.floor(m.troops[k] * frac); m.troops[k] -= loss[k]; }
    const split = applyLosses(loss); let rew = null;
    if (win) { rew = giantRewards(m.giant.level); gainRes(rew.res); for (const it of rew.items) addItem(it.id, it.n); S.giantMax = Math.max(S.giantMax || 0, m.giant.level); S.stats.wins++; count('wins'); S.giants = S.giants.filter((g) => g.id !== m.giant.id); ensureNextGiant(); }
    else { S.stats.losses++; unfreezeGiant(m); }
    m.result = { win, total, need, members: m.final.length, rew };
    const rep = { t, kind: 'rally', win, enemy: `Dev Sv.${m.giant.level}`, members: m.final.map((q) => q.name), total, need, aLoss: loss, wounded: split.wounded, dead: split.dead, loot: rew ? rew.res : {}, items: rew ? rew.items : null };
    S.reports.unshift(rep); S.reports = S.reports.slice(0, 30);
    const d = rallyMarchTime([m.tx, m.ty], [S.mapX, S.mapY]); m.phase = 'back'; m.start = t; m.arrive = t + d; save(); emit('rallyDone', m);
  }
  if (m.phase === 'back' && t >= m.arrive) { for (const k in m.troops) S.troops[k] += m.troops[k]; S.marches = S.marches.filter((q) => q !== m); save(); emit('marchHome', m); }
}
function unfreezeGiant(m) { const g = S.giants.find((q) => q.id === m.giant.id); if (g) g.frozen = false; }
export function freezeGiant(id) { const g = S.giants.find((q) => q.id === id); if (g) { [g.mapX, g.mapY] = giantPos(g); g.frozen = true; save(); } return g; }

// Düşman baskını (şehre saldırı)
export function resolveRaid() {
  const strength = Math.max(1500, (armyPower(S.troops) + towerPower()) * rand(0.45, 1.25));
  const name = KINGDOM_NAMES[randi(0, KINGDOM_NAMES.length - 1)];
  const attacker = makeEnemy(name, LORD_NAMES[randi(0, LORD_NAMES.length - 1)], strength, 0);
  const home = { ...S.troops };
  const res = simulateBattle({ troops: attacker.troops, hero: null }, { tl: myTl, troops: home, hero: heroOf(S.commander), tower: towerPower(), atkMul: 1 + rb('blade'), defMul: (1 + rb('armor')) * (1 + forgeDefBonus()) });
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
  tickBotFires(); tickTroopUp();
  if (S.scouts?.length) tickScouts();
  if (S.mapX != null && (!S.zombies?.length || now() >= (S.zombieNext || 0))) tickZombies();
  if (S.mapX != null && (!S.mines?.length || now() >= (S.mineNext || 0))) tickMines();
  if (S.mapX != null && (!S.giants?.length || now() >= (S.giantNext || 0))) tickGiants();
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
