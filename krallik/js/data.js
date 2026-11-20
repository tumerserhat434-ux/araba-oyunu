// =====================================================================
//  DEMİR SANCAK — oyun verileri (binalar, askerler, kahramanlar, mağaza)
// =====================================================================

import { LANG as _LG } from './i18n.js?v=2611201555';
const LOC = _LG === 'en' ? 'en-US' : 'tr-TR';
export const RES = {
  food: { name: 'Yiyecek', icon: '🌾' },
  wood: { name: 'Odun', icon: '🪵' },
  stone: { name: 'Taş', icon: '🪨' },
  gold: { name: 'Altın', icon: '🪙' },
};

// Bina türleri
export const BUILDINGS = {
  townhall: { name: 'Belediye Binası', icon: '🏰', desc: 'Krallığının kalbi. Seviyesi diğer binaların en yüksek seviyesini belirler.', base: { food: 300, wood: 300, stone: 150 }, time: 12, reqTH: 0, max: 40 },
  barracks: { name: 'Kışla', icon: '⚔️', desc: 'Asker eğitilir. Seviye arttıkça eğitim hızlanır, parti büyür ve askerler güçlenir.', base: { food: 150, wood: 200, stone: 60 }, time: 8, reqTH: 1, max: 30 },
  archery: { name: 'Okçu Kulesi', icon: '🏹', desc: 'Şehri saldırılara karşı korur. Savunmada düşmana ok yağdırır.', base: { food: 80, wood: 220, stone: 160 }, time: 10, reqTH: 2, max: 30 },
  hospital: { name: 'Hastane', icon: '💚', desc: 'Savaşta yaralanan askerler buraya gelir ve iyileştirilir. Kapasite dolarsa yaralılar ölür.', base: { food: 200, wood: 180, stone: 80 }, time: 9, reqTH: 2, max: 25 },
  potion: { name: 'İksir Deposu', icon: '🧪', desc: 'Şifa iksiri üretir ve saklar. Her iksir yaralı askerleri anında iyileştirir.', base: { food: 160, wood: 120, stone: 140 }, time: 10, reqTH: 3, max: 20 },
  heroes: { name: 'Karakter Deposu', icon: '🛡️', desc: 'Kahramanların burada yaşar. Her seviyesi kahraman seviye sınırını 15 artırır (Sv.10 = 150).', base: { food: 180, wood: 160, stone: 120 }, time: 10, reqTH: 1, max: 10 },
  summon: { name: 'Çağırma Atölyesi', icon: '🔮', desc: 'Altınla kahraman çağır. 5 yıldızlı efsanevi kahramanlar çok nadir çıkar!', base: { food: 120, wood: 160, stone: 160 }, time: 10, reqTH: 1, max: 10 },
  farm: { name: 'Çiftlik', icon: '🌾', desc: 'Yiyecek üretir.', base: { food: 40, wood: 90, stone: 0 }, time: 5, reqTH: 1, prod: 'food', rate: 900, max: 30 },
  lumber: { name: 'Kereste Atölyesi', icon: '🪵', desc: 'Odun üretir.', base: { food: 90, wood: 40, stone: 0 }, time: 5, reqTH: 1, prod: 'wood', rate: 800, max: 30 },
  quarry: { name: 'Taş Ocağı', icon: '🪨', desc: 'Taş üretir.', base: { food: 90, wood: 90, stone: 0 }, time: 6, reqTH: 2, prod: 'stone', rate: 500, max: 30 },
  academy: { name: 'Akademi', icon: '📚', desc: 'Araştırma yapılır. Araştırmalar üretimi, eğitimi, savaş gücünü ve hastaneyi kalıcı olarak güçlendirir.', base: { food: 300, wood: 300, stone: 200 }, time: 12, reqTH: 3, max: 25 },
  drill: { name: 'Talimhane', icon: '🎯', img: 'b_drill', desc: 'Askerler burada talim eder. Piyade, mızrakçı, okçu ve süvarinin seviyesini yükseltir; her seviye hasarı, savunmayı ve canı artırır. Talimhane seviyesi, askerlerin çıkabileceği en yüksek seviyeyi belirler.', base: { food: 500, wood: 450, stone: 350 }, time: 13, reqTH: 4, max: 20 },
  forge: { name: 'Demirhane', icon: '⚒️', img: 'b_forge', desc: 'Silah ve zırh döver. Her seviye tüm birliklerin savunmasını artırır ve tank üretimini hızlandırır.', base: { food: 160, wood: 220, stone: 260 }, time: 11, reqTH: 2, max: 25 },
  rally: { name: 'Toplanma Kampı', icon: '⛺', img: 'b_rally', desc: 'Ordular seferden önce burada toplanır. Her seviye saldırı gücünü ve ganimet taşıma kapasitesini artırır.', base: { food: 260, wood: 240, stone: 120 }, time: 11, reqTH: 2, max: 25 },
  tankyard: { name: 'Tank Atölyesi', icon: '⚙️', img: 'b_tankyard', desc: 'Demir tanklar burada üretilir. Seviye arttıkça bir seferde daha çok tank üretilir ve üretim hızlanır.', base: { food: 400, wood: 480, stone: 520 }, time: 16, reqTH: 3, reqB: { forge: 1 }, max: 25 },
  camp: { name: 'Ordu Kampı', icon: '🏕️', img: 'b_camp', desc: 'Kışlada ve Tank Atölyesi\'nde eğitilen birlikler burada konaklar. Her seviye kamp kapasitesini artırır; kamplar doluysa yeni birlik eğitilemez.', base: { food: 220, wood: 280, stone: 140 }, time: 9, reqTH: 1, max: 30 },
  warehouse: { name: 'Ambar', icon: '📦', desc: 'Kaynak depolama sınırını artırır ve yağmada kaynaklarının bir kısmını korur.', base: { food: 120, wood: 150, stone: 80 }, time: 8, reqTH: 2, max: 30 },
};
export const MAX_LEVEL = 40; // Belediye Binası en yüksek seviyesi
export const maxLevel = (key) => BUILDINGS[key].max || 10;
// Belediye Binası gereksinimleri: her seviye için 2 (Sv.15+ için 3) bina belirli seviyede olmalı
const TH_CYCLE = ['barracks', 'warehouse', 'archery', 'academy', 'hospital', 'farm', 'forge', 'lumber', 'rally', 'quarry', 'tankyard', 'potion', 'camp'];
export function thRequirements(toLevel) {
  if (toLevel < 3) return toLevel === 2 ? [['farm', 1]] : [];
  const out = [], n = TH_CYCLE.length;
  const need = toLevel >= 15 ? 3 : 2;
  for (let i = 0; out.length < need && i < n * 2; i++) {
    const key = TH_CYCLE[(toLevel * 7 + i * 5) % n], B = BUILDINGS[key];
    if (out.some((r) => r[0] === key) || B.reqTH > toLevel - 1 || (B.reqB && toLevel < 6)) continue;
    out.push([key, Math.min(maxLevel(key), toLevel - 1)]);
  }
  return out;
}

// Şehir yerleşimi (sabit arsalar) — x,z dünya koordinatı
export const PLOTS = [
  { id: 'townhall', key: 'townhall', x: 0, z: 0 },
  { id: 'barracks', key: 'barracks', x: -17, z: 2 },
  { id: 'summon', key: 'summon', x: 0, z: 17 },
  { id: 'heroes', key: 'heroes', x: -15, z: 15 },
  { id: 'hospital', key: 'hospital', x: 16, z: 3 },
  { id: 'potion', key: 'potion', x: 14, z: 15 },
  { id: 'archery1', key: 'archery', x: -13, z: -13 },
  { id: 'archery2', key: 'archery', x: 13, z: -13 },
  { id: 'warehouse', key: 'warehouse', x: 0, z: -15 },
  { id: 'academy', key: 'academy', x: 16, z: 28 },
  { id: 'farm1', key: 'farm', x: -28, z: -6 },
  { id: 'farm2', key: 'farm', x: -28, z: 12 },
  { id: 'lumber1', key: 'lumber', x: 28, z: -6 },
  { id: 'lumber2', key: 'lumber', x: 28, z: 12 },
  { id: 'quarry1', key: 'quarry', x: -26, z: -22 },
  { id: 'quarry2', key: 'quarry', x: 26, z: -22 },
  { id: 'tankyard', key: 'tankyard', x: -14, z: 28 },
  { id: 'rally', key: 'rally', x: -12, z: -30 },
  { id: 'forge', key: 'forge', x: 12, z: -30 },
  { id: 'drill', key: 'drill', x: 27, z: 25 },
  // Ordu kampları: 4 arsa, Belediye seviyesiyle açılır
  { id: 'camp1', key: 'camp', x: -23, z: 21, reqTH: 1 },
  { id: 'camp2', key: 'camp', x: 22, z: 18.5, reqTH: 5 },
  { id: 'camp3', key: 'camp', x: 0, z: 29.5, reqTH: 10 },
  { id: 'camp4', key: 'camp', x: 0, z: -30, reqTH: 15 },
];
// Ordu kampı kapasitesi: Sv.1 1.500 → Sv.10 ~21 bin → Sv.20 ~400 bin → Sv.30 ~7,3 milyon asker
// 4 kamp Sv.30 ≈ 29 milyon asker ≈ 1 milyar birlik gücü
export const campCap = (L) => (L > 0 ? Math.round(1500 * Math.pow(1.34, L - 1) / 100) * 100 : 0);

// Maliyet: Sv.10'a kadar ×1.6, sonra çok daha dik artar (Sv.40 ≈ taban × 10.000)
export function upgradeCost(key, toLevel) {
  const b = BUILDINGS[key], k = Math.pow(1.6, Math.min(toLevel, 10) - 1) * (toLevel > 10 ? Math.pow(toLevel / 10, 3.6) : 1), out = {};
  for (const r in b.base) if (b.base[r]) out[r] = Math.round(b.base[r] * k / 10) * 10;
  return out;
}
// Süre (Belediye için): Sv.12 ≈ 37 dk, Sv.13 = 1 sa, Sv.14 = 2,5 sa, Sv.15 = 7 sa, sonra her seviye ×1,25
// (Sv.20 ≈ 21 sa, Sv.25 ≈ 2,7 gün, Sv.30 ≈ 8 gün, Sv.40 ≈ 2,5 ay). Diğer binalar kendi taban sürelerine göre oranlanır.
export function thSeconds(L) {
  if (L <= 12) return 12 * 1.5 * Math.pow(1.55, L - 1);
  if (L === 13) return 3600;
  if (L === 14) return 9000;
  return 25200 * Math.pow(1.25, L - 15);
}
export function upgradeTime(key, toLevel) { return Math.round(thSeconds(toLevel) * BUILDINGS[key].time / 12); }
export function prodPerHour(key, level) { const b = BUILDINGS[key]; return b.prod ? Math.round(b.rate * level * Math.pow(1.08, level - 1)) : 0; }
export function prodCap(key, level) { return prodPerHour(key, level) * 3; }

// Askerler — taş/kağıt/makas: okçu > piyade & mızrakçı, süvari > okçu, mızrakçı > süvari, piyade dengeli
export const TROOPS = {
  infantry: { name: 'Kılıç Piyadesi', short: 'Piyade', icon: '🗡️', atk: 11, def: 13, hp: 32, load: 12, cost: { food: 40, wood: 26, stone: 7 }, time: 4, desc: 'Dengeli ön saf askeri. Zırhlı ve dayanıklı.' },
  spearman: { name: 'Mızrakçı', short: 'Mızrakçı', icon: '🔱', atk: 10, def: 15, hp: 30, load: 10, cost: { food: 40, wood: 40, stone: 0 }, time: 4, desc: 'Uzun mızrağıyla süvarilere karşı çok güçlü.' },
  archer: { name: 'Okçu', short: 'Okçu', icon: '🏹', atk: 14, def: 8, hp: 24, load: 8, cost: { food: 33, wood: 46, stone: 0 }, time: 4.75, desc: 'Uzaktan yüksek hasar. Piyadelere karşı etkili.' },
  cavalry: { name: 'Şövalye Süvari', short: 'Süvari', icon: '🐎', atk: 16, def: 12, hp: 40, load: 18, cost: { food: 78, wood: 40, stone: 26 }, time: 7.5, reqBarracks: 3, desc: 'Hızlı ve yıkıcı. Okçuları ezer.' },
  tank: { name: 'Demir Tank', short: 'Tank', icon: '<img class="ti-img" src="assets/ui/b_tank.webp?v=2611201555" alt="">', atk: 70, def: 60, hp: 180, load: 40, cost: { food: 220, wood: 180, stone: 260 }, time: 36, building: 'tankyard', desc: 'Buharla çalışan zırhlı savaş makinesi. Topuyla piyade, mızrakçı ve okçuları ezer; çok dayanıklıdır.' },
};
// ---- Talimhane: asker seviyeleri (1–10) ----
// Her seviye hasar/savunma/can +%12 (Sv.10 ≈ ×2,08: 11 hasar → 23). Bedel yüksek, süre kısa.
export const TROOP_LV_MAX = 10;
export const troopLvMul = (L) => 1 + 0.12 * ((L || 1) - 1);
export const troopLvCost = (L) => { const k = Math.round(60000 * Math.pow(1.85, L - 2) / 1000) * 1000; return { food: k, wood: Math.round(k * 0.85 / 1000) * 1000, stone: Math.round(k * 0.5 / 1000) * 1000 }; }; // L: hedef seviye (2..10)
export const troopLvTime = (L) => Math.round(20 * L * L); // sn: Sv.2 80 sn … Sv.10 ≈ 33 dk
export const troopLvReq = (L) => L * 2 - 2; // Sv.L için gereken Talimhane seviyesi (Sv.2 → 2, Sv.10 → 18)
// ---- Etkinlik: Fetih Yolu — 7 gün, 100 görev (günde 14–15), her görevin ödülü, her günün tamamlama sandığı ----
const FY_T = [
  ['collects', 'Kaynakları {n} kez topla', 'res_food', [3, 5, 8, 10, 12, 15, 20]],
  ['trained', '{n} asker eğit', 'ic_troops', [100, 200, 400, 600, 800, 1000, 1500]],
  ['upgrades', '{n} bina yükselt', 'nav_city', [1, 1, 2, 2, 3, 3, 4]],
  ['wins', '{n} savaş kazan', 'ic_trophy', [1, 2, 3, 4, 5, 6, 8]],
  ['zombies', '{n} zombi öldür', 'nav_world', [1, 2, 3, 4, 5, 6, 8]],
  ['energy', '{n} enerji harca', 'ic_energy', [10, 20, 30, 40, 50, 60, 80]],
  ['speedups', '{n} hızlandırma kullan', 'sp_t1', [2, 3, 5, 8, 10, 12, 15]],
  ['gathers', '{n} kez madenden kaynak getir', 'res_stone', [1, 1, 2, 2, 3, 3, 4]],
  ['scouts', '{n} kez helikopterle gözetle', 'nav_world', [1, 1, 2, 2, 3, 3, 4]],
  ['kills', '{n} düşman askeri öldür', 'nav_heroes', [200, 500, 1000, 2000, 3000, 5000, 8000]],
  ['summons', '{n} kahraman çağır', 'ic_summon', [1, 2, 3, 4, 5, 6, 8]],
  ['heals', '{n} kez yaralı iyileştir', 'ic_gift', [1, 1, 2, 2, 3, 3, 4]],
  ['researched', '{n} araştırma tamamla', 'nav_quest', [1, 1, 1, 2, 2, 2, 3]],
  ['tanks', '{n} tank üret', 'b_tank', [5, 10, 20, 30, 40, 50, 80]],
  ['collects', 'Kaynakları {n} kez daha topla', 'res_wood', [0, 0, 0, 0, 0, 25, 30]],
];
const FY_R = [{ energy: 5 }, { items: { s1m: 1 } }, { food: 20000 }, { items: { s1m: 2 } }, { wood: 20000 }, { energy: 5 }, { stone: 20000 }, { items: { s5m: 1 } }, { gold: 10 }, { energy: 8 }, { food: 30000 }, { items: { s1m: 3 } }, { wood: 30000 }, { gold: 15 }];
export const FY_DAYS = [14, 14, 14, 14, 14, 15, 15];
export const FY_TASKS = (() => { const out = []; FY_DAYS.forEach((cnt, d) => { for (let i = 0; i < cnt; i++) { const [stat, txt, icon, ns] = FY_T[i]; const n = ns[d]; out.push({ i: out.length, day: d, stat, n, icon, text: txt.replace('{n}', n.toLocaleString(LOC)), reward: FY_R[out.length % FY_R.length] }); } }); return out; })();
export const FY_BONUS = [{ energy: 20 }, { items: { s5m: 4 } }, { gold: 50 }, { energy: 30, items: { s15m: 2 } }, { gold: 50, items: { s1h: 1 } }, { energy: 40, items: { s5m: 6 } }, { gold: 100, energy: 50, items: { s1h: 2 } }];
export const COUNTER = {
  infantry: { infantry: 1, spearman: 1.05, archer: 1, cavalry: 1.05, tank: 0.8 },
  spearman: { infantry: 0.95, spearman: 1, archer: 1, cavalry: 1.5, tank: 0.9 },
  archer: { infantry: 1.3, spearman: 1.3, archer: 1, cavalry: 0.75, tank: 0.55 },
  cavalry: { infantry: 1.05, spearman: 0.7, archer: 1.5, cavalry: 1, tank: 0.75 },
  tank: { infantry: 1.35, spearman: 1.35, archer: 1.5, cavalry: 1.2, tank: 1 },
};

// Kahramanlar — tamamen özgün karakterler
export const RARITY = {
  2: { name: 'Sıradan', color: '#9fb4c2', rate: 0.35 },
  3: { name: 'Nadir', color: '#4aa8ff', rate: 0.35 },
  4: { name: 'Destansı', color: '#b06bff', rate: 0.21 },
  5: { name: 'Efsanevi', color: '#ffc84a', rate: 0.09 },
};
export const HEROES = [
  // 5★
  { id: 'tugrul', name: 'Demirpençe Tuğrul', title: 'Bozkırın Fırtınası', rarity: 5, role: 'cavalry', atk: 28, def: 18, skill: 'Yıldırım Hücum: Süvarilerin saldırısı +35%, ilk turda çifte hasar.', look: { primary: '#1d1a2e', secondary: '#c9a227', metal: 'gold', helmet: 'winged', hair: '#1a1410', beard: true, female: false, weapon: 'lance' } },
  { id: 'elara', name: 'Gölgeok Elara', title: 'Ay Ormanının Gözü', rarity: 5, role: 'archer', atk: 30, def: 14, skill: 'Gümüş Yağmur: Okçu hasarı +40%, düşman okçularını susturur.', look: { primary: '#2a4a3a', secondary: '#e8e0c8', metal: 'gold', helmet: 'hood', hair: '#d8c08a', beard: false, female: true, weapon: 'bow' } },
  { id: 'baran', name: 'Altınkalkan Baran', title: 'Yıkılmaz Sur', rarity: 5, role: 'infantry', atk: 22, def: 30, skill: 'Tanrısal Kalkan: Tüm birliklerin savunması +30%, yaralı oranı azalır.', look: { primary: '#5a1414', secondary: '#f0c040', metal: 'gold', helmet: 'crown', hair: '#3a2416', beard: true, female: false, weapon: 'hammer' } },
  { id: 'kerem', name: 'Aslanyürek Kerem', title: 'Kralın Kılıcı', rarity: 5, role: 'infantry', atk: 26, def: 28, skill: 'Aslan Kükremesi: Tüm birliklerin saldırısı ve savunması +25%.', look: { primary: '#8a1a1a', secondary: '#f0c040', metal: 'gold', helmet: 'none', hair: '#5a3418', beard: true, female: false, weapon: 'sword' } },
  { id: 'selin', name: 'Yıldızok Selin', title: 'Gece Avcısı', rarity: 5, role: 'archer', atk: 32, def: 13, skill: 'Yıldız Yağmuru: Okçu hasarı +45%, ilk turda düşmanı sersemletir.', look: { primary: '#1a2a6a', secondary: '#c8d8f0', metal: 'steel', helmet: 'hood', hair: '#e8e8f0', beard: false, female: true, weapon: 'bow' } },
  { id: 'bora', name: 'Fırtınabey Bora', title: 'Şimşek Süvarisi', rarity: 5, role: 'cavalry', atk: 30, def: 17, skill: 'Şimşek Hücumu: Süvari saldırısı +40%, okçulara çifte hasar.', look: { primary: '#1a3a7a', secondary: '#60e0ff', metal: 'steel', helmet: 'winged', hair: '#101010', beard: true, female: false, weapon: 'lance' } },
  { id: 'nilufer', name: 'Şafak Kraliçesi Nilüfer', title: 'Güneşin Mızrağı', rarity: 5, role: 'infantry', atk: 24, def: 27, skill: 'Şafak Işığı: Mızrakçılar +35% hasar, tüm birlik savunması +15%.', look: { primary: '#d87a5a', secondary: '#f0d070', metal: 'gold', helmet: 'crown', hair: '#8a3a1a', beard: false, female: true, weapon: 'spear' } },
  { id: 'doruk', name: 'Demirusta Doruk', title: 'Tankların Babası', rarity: 5, role: 'tank', atk: 31, def: 24, skill: 'Buhar Topu: Tank hasarı +45%, tank savunması +20%.', look: { primary: '#3a3028', secondary: '#c89030', metal: 'bronze', helmet: 'none', hair: '#b03a10', beard: true, female: false, weapon: 'hammer' } },
  // 4★
  { id: 'tolga', name: 'Kalkanbaş Tolga', title: 'Dağ Kalkanı', rarity: 4, role: 'infantry', atk: 16, def: 25, skill: 'Dağ Duvarı: Piyade savunması +30%.', look: { primary: '#2a5a2a', secondary: '#c89a40', metal: 'bronze', helmet: 'none', hair: '#a0a0a0', beard: true, female: false, weapon: 'hammer' } },
  { id: 'ece', name: 'Zehirok Ece', title: 'Bataklık Gölgesi', rarity: 4, role: 'archer', atk: 24, def: 10, skill: 'Zehirli Ok: Okçu hasarı +26%.', look: { primary: '#1a3a1a', secondary: '#8a3a9a', metal: 'dark', helmet: 'none', hair: '#101010', beard: false, female: true, weapon: 'bow' } },
  { id: 'arda', name: 'Çarkçı Arda', title: 'Genç Pilot', rarity: 4, role: 'tank', atk: 21, def: 16, skill: 'Çark Ustası: Tank hasarı +25%.', look: { primary: '#6a4a2a', secondary: '#3a5a9a', metal: 'bronze', helmet: 'none', hair: '#e0c060', beard: false, female: false, weapon: 'hammer' } },
  { id: 'kaan', name: 'Fırtına Atlısı Kaan', title: 'Rüzgârın Oğlu', rarity: 4, role: 'cavalry', atk: 22, def: 14, skill: 'Kanat Baskını: Süvari saldırısı +22%.', look: { primary: '#123a6a', secondary: '#b8c4d0', metal: 'steel', helmet: 'great', hair: '#2a1a10', beard: false, female: false, weapon: 'lance' } },
  { id: 'lara', name: 'Kurt Avcısı Lara', title: 'Kuzeyin Nişancısı', rarity: 4, role: 'archer', atk: 23, def: 11, skill: 'Kurt Oku: Okçu hasarı +25%.', look: { primary: '#4a3a2a', secondary: '#8aa070', metal: 'bronze', helmet: 'hood', hair: '#8a3a1a', beard: false, female: true, weapon: 'bow' } },
  { id: 'oguz', name: 'Taşyürek Oğuz', title: 'Dağların Bekçisi', rarity: 4, role: 'infantry', atk: 18, def: 22, skill: 'Kaya Duruşu: Piyade savunması +25%.', look: { primary: '#3a3a40', secondary: '#a0a0a8', metal: 'dark', helmet: 'nasal', hair: '#1a1a1a', beard: true, female: false, weapon: 'axe' } },
  { id: 'aybike', name: 'Kızıl Mızrak Aybike', title: 'Sınır Muhafızı', rarity: 4, role: 'infantry', atk: 20, def: 18, skill: 'Mızrak Duvarı: Mızrakçılar süvarilere +30% hasar.', look: { primary: '#7a1a1a', secondary: '#e0c080', metal: 'steel', helmet: 'nasal', hair: '#2a1208', beard: false, female: true, weapon: 'spear' } },
  // 3★
  { id: 'emre', name: 'Nöbetçi Emre', title: 'Sur Muhafızı', rarity: 3, role: 'infantry', atk: 14, def: 16, skill: 'Nöbet: Piyade savunması +12%.', look: { primary: '#2f5f9a', secondary: '#d0d4d8', metal: 'steel', helmet: 'nasal', hair: '#3a2a1a', beard: true, female: false, weapon: 'sword' } },
  { id: 'defne', name: 'Keskingöz Defne', title: 'Orman Gözcüsü', rarity: 3, role: 'archer', atk: 16, def: 10, skill: 'Nişan: Okçu hasarı +12%.', look: { primary: '#3a5a2a', secondary: '#a08a60', metal: 'bronze', helmet: 'hood', hair: '#5a3018', beard: false, female: true, weapon: 'bow' } },
  { id: 'burak', name: 'Akıncı Burak', title: 'Hızlı Akıncı', rarity: 3, role: 'cavalry', atk: 16, def: 12, skill: 'Akın: Süvari saldırısı +12%.', look: { primary: '#6a4a1a', secondary: '#c0b090', metal: 'steel', helmet: 'nasal', hair: '#1a1008', beard: true, female: false, weapon: 'sword' } },
  { id: 'mert', name: 'Kalkancı Mert', title: 'Ön Saf', rarity: 3, role: 'infantry', atk: 12, def: 18, skill: 'Kalkan Duvarı: Tüm birlik savunması +8%.', look: { primary: '#5a5a2a', secondary: '#c0b080', metal: 'steel', helmet: 'great', hair: '#4a3020', beard: false, female: false, weapon: 'sword' } },
  // 2★
  { id: 'ali', name: 'Er Ali', title: 'Acemi Er', rarity: 2, role: 'infantry', atk: 9, def: 10, skill: 'Cesaret: Piyade saldırısı +5%.', look: { primary: '#6a5a4a', secondary: '#9a8a70', metal: 'steel', helmet: 'nasal', hair: '#2a1a10', beard: false, female: false, weapon: 'sword' } },
  { id: 'zeynep', name: 'Çırak Okçu Zeynep', title: 'Köy Okçusu', rarity: 2, role: 'archer', atk: 10, def: 7, skill: 'Hızlı Atış: Okçu hasarı +5%.', look: { primary: '#4a6a3a', secondary: '#8a7a5a', metal: 'bronze', helmet: 'none', hair: '#2a1408', beard: false, female: true, weapon: 'bow' } },
  { id: 'cem', name: 'Seyis Cem', title: 'Ahır Ustası', rarity: 2, role: 'cavalry', atk: 10, def: 9, skill: 'Binicilik: Süvari saldırısı +5%.', look: { primary: '#5a4030', secondary: '#a09070', metal: 'steel', helmet: 'none', hair: '#4a2a14', beard: true, female: false, weapon: 'spear' } },
  { id: 'hasan', name: 'Milis Hasan', title: 'Köy Milisi', rarity: 2, role: 'infantry', atk: 8, def: 11, skill: 'Direniş: Piyade savunması +5%.', look: { primary: '#4a4a4a', secondary: '#8a8a7a', metal: 'dark', helmet: 'nasal', hair: '#1a1a1a', beard: true, female: false, weapon: 'axe' } },
];
export const HERO_BY_ID = Object.fromEntries(HEROES.map((h) => [h.id, h]));
// Kahraman birlik bonusu (yüzde) — nadirlik + seviye + kopya
export function heroBonus(h, level, copies, ups = 0) {
  const base = { 2: 5, 3: 12, 4: 22, 5: 35 }[h.rarity];
  return (base + level * (h.rarity * 0.16) + Math.min(5, copies || 0) * h.rarity * 0.8) * starMul(ups);
}
// ---- Yıldız yükseltme: kopyalarla yıldız artar; 5★'tan sonra Yüce yıldızlar (en fazla 5) ----
// her yükseltme saldırı, savunma ve birlik bonusunu +%15 artırır
export const starMul = (ups) => 1 + (ups || 0) * 0.15;
export const STAR_PATH = { 5: [10, 15, 20, 25, 30], 4: [25, 30, 35, 40, 45, 50], 3: [50, 60, 70, 80, 90, 100, 110], 2: [60, 75, 90, 100, 110, 120, 130, 140] };
export const heroStars = (h, ups = 0) => { const t = h.rarity + (ups || 0); return { gold: Math.min(5, t), asc: Math.max(0, t - 5) }; };
export const nextStarCost = (h, ups = 0) => STAR_PATH[h.rarity][ups || 0] ?? null;
export const HERO_MAX_LEVEL = 150;
// Kahraman saldırısı: her seviyede %4 artar
export function heroAtk(h, level, ups = 0) { return Math.round(h.atk * (1 + (Math.max(1, level) - 1) * 0.04) * starMul(ups)); }
export function heroDef(h, level, ups = 0) { return Math.round(h.def * (1 + (Math.max(1, level) - 1) * 0.035) * starMul(ups)); }
// Yükseltme maliyeti seviyeyle birlikte artar (Sv.1 ≈ 330 buğday, Sv.149 ≈ 100 bin buğday)
export function heroLevelCost(level) { const f = Math.round(220 * (1 + level * 0.45) * (1 + level / 25) / 10) * 10; return { food: f, stone: Math.round(f * 0.35 / 10) * 10 }; }

// Çağırma
export const SUMMON = { cost1: 100, cost10: 900, pity5: 30, pity4: 10 };

// Altın mağazası (demo — gerçek ödeme yok)
export const SHOP = [
  { id: 'g1', gold: 300, bonus: 0, price: '₺29,99', tag: '' },
  { id: 'g2', gold: 1000, bonus: 100, price: '₺89,99', tag: 'Popüler' },
  { id: 'g3', gold: 2800, bonus: 400, price: '₺229,99', tag: '' },
  { id: 'g4', gold: 6500, bonus: 1500, price: '₺499,99', tag: 'En iyi değer' },
];
export const RES_PACKS = [
  { id: 'r1', res: { food: 5000 }, gold: 60 },
  { id: 'r2', res: { wood: 5000 }, gold: 60 },
  { id: 'r3', res: { stone: 3000 }, gold: 60 },
  { id: 'r4', res: { food: 20000, wood: 20000, stone: 10000 }, gold: 400 },
];

// Düşman krallık isimleri (simüle oyuncular)
export const KINGDOM_NAMES = ['Kuzey Kurtları', 'Altın Vadi', 'Demir Kale', 'Kızıl Şafak', 'Gümüş Nehir', 'Kara Orman', 'Fırtına Burnu', 'Kartal Yuvası', 'Ejder Tepesi', 'Ay Işığı', 'Taş Liman', 'Sisli Dağlar', 'Bozkır Atlıları', 'Kehribar Ova', 'Buzul Sınırı', 'Yeşil Çayır'];
export const LORD_NAMES = ['Lord Kerem', 'Leydi Aslı', 'Lord Tolga', 'Kraliçe Nehir', 'Lord Batu', 'Leydi Ilgın', 'Lord Arda', 'Kral Oktay', 'Leydi Mira', 'Lord Kuzey', 'Lord Doruk', 'Leydi Ece', 'Lord Atlas', 'Leydi Su', 'Lord Yağız', 'Kral Alp'];

// ---------------------------------------------------------------------
//  Akademi araştırmaları
// ---------------------------------------------------------------------
export const RESEARCH = {
  agri: { name: 'Tarım', icon: '🌾', desc: 'Tüm kaynak üretimi', per: 6, unit: '%', base: { food: 400, wood: 300 }, time: 20 },
  mason: { name: 'Taş İşçiliği', icon: '🧱', desc: 'İnşaat süresi azalır', per: 5, unit: '%', base: { wood: 400, stone: 300 }, time: 25 },
  drill: { name: 'Talim', icon: '🎯', desc: 'Asker eğitim hızı', per: 8, unit: '%', base: { food: 500, wood: 300 }, time: 25 },
  blade: { name: 'Demircilik', icon: '⚔️', desc: 'Birliklerin saldırısı', per: 4, unit: '%', base: { food: 300, stone: 500 }, time: 35 },
  armor: { name: 'Zırhçılık', icon: '🛡️', desc: 'Birliklerin savunması', per: 4, unit: '%', base: { wood: 300, stone: 500 }, time: 35 },
  medic: { name: 'Hekimlik', icon: '💚', desc: 'Hastane kapasitesi', per: 15, unit: '%', base: { food: 600, wood: 200 }, time: 30 },
  logis: { name: 'Lojistik', icon: '🐂', desc: 'Ganimet taşıma kapasitesi', per: 10, unit: '%', base: { food: 400, wood: 400 }, time: 30 },
};
export const RESEARCH_MAX = 5;
export function researchCost(key, toLevel) { const b = RESEARCH[key].base, o = {}; for (const r in b) o[r] = Math.round(b[r] * Math.pow(2.1, toLevel - 1) / 10) * 10; return o; }
export function researchTime(key, toLevel) { return Math.round(RESEARCH[key].time * Math.pow(1.8, toLevel - 1)); }

// ---------------------------------------------------------------------
//  Görevler
// ---------------------------------------------------------------------
// t: koşul türü — th(level), bld(plotKey, level), stat(name, n), hero(rarity), res(key, level)
const LEGACY_QUESTS = [
  { id: 'q1', text: 'Belediye Binası\'nı Sv.2 yap', t: ['bld', 'townhall', 2], reward: { food: 1000, wood: 1000 } },
  { id: 'q2', text: '100 asker eğit', t: ['stat', 'trained', 100], reward: { food: 1500, gold: 30 } },
  { id: 'q3', text: 'Hastane inşa et', t: ['bld', 'hospital', 1], reward: { wood: 1500, stone: 500 } },
  { id: 'q4', text: 'İlk savaşını kazan', t: ['stat', 'wins', 1], reward: { gold: 50, stone: 800 } },
  { id: 'q5', text: 'Kaynakları 10 kez topla', t: ['stat', 'collects', 10], reward: { food: 2000, wood: 2000 } },
  { id: 'q6', text: 'Belediye Binası\'nı Sv.3 yap', t: ['bld', 'townhall', 3], reward: { gold: 80, stone: 1500 } },
  { id: 'q7', text: 'Akademi inşa et', t: ['bld', 'academy', 1], reward: { food: 2500, wood: 2500 } },
  { id: 'q8', text: 'Bir araştırma tamamla', t: ['stat', 'researched', 1], reward: { gold: 60 } },
  { id: 'qf1', text: 'Demirhane inşa et', t: ['bld', 'forge', 1], reward: { wood: 2000, stone: 2000 } },
  { id: 'qr1', text: 'Toplanma Kampı inşa et', t: ['bld', 'rally', 1], reward: { food: 2500, gold: 50 } },
  { id: 'q9', text: 'Toplam 10 kahraman çağır', t: ['stat', 'summons', 10], reward: { gold: 100 } },
  { id: 'q10', text: 'Kışla\'yı Sv.3 yap (süvari açılır)', t: ['bld', 'barracks', 3], reward: { food: 3000, stone: 1500 } },
  { id: 'qt1', text: 'Tank Atölyesi inşa et', t: ['bld', 'tankyard', 1], reward: { stone: 4000, gold: 80 } },
  { id: 'qt2', text: '5 Demir Tank üret', t: ['stat', 'tanks', 5], reward: { gold: 120, stone: 3000 } },
  { id: 'q11', text: '5 savaş kazan', t: ['stat', 'wins', 5], reward: { gold: 120 } },
  { id: 'q12', text: 'Belediye Binası\'nı Sv.5 yap', t: ['bld', 'townhall', 5], reward: { gold: 150, food: 5000, wood: 5000 } },
  { id: 'q13', text: '4★ veya daha iyi bir kahraman edin', t: ['hero', 4], reward: { gold: 150 } },
  { id: 'q14', text: '1000 asker eğit', t: ['stat', 'trained', 1000], reward: { gold: 150, food: 8000 } },
  { id: 'q15', text: 'Okçu Kulesi\'ni Sv.5 yap', t: ['bld', 'archery', 5], reward: { stone: 8000, gold: 100 } },
  { id: 'q16', text: 'Belediye Binası\'nı Sv.7 yap', t: ['bld', 'townhall', 7], reward: { gold: 250 } },
  { id: 'q17', text: '20 savaş kazan', t: ['stat', 'wins', 20], reward: { gold: 300 } },
  { id: 'q18', text: 'Bir araştırmayı Sv.5 yap', t: ['res', 'any', 5], reward: { gold: 300 } },
  { id: 'q19', text: 'Belediye Binası\'nı Sv.10 yap', t: ['bld', 'townhall', 10], reward: { gold: 1000 } },
  { id: 'q20', text: 'Kışla\'yı Sv.15 yap', t: ['bld', 'barracks', 15], reward: { gold: 400, food: 50000 } },
  { id: 'q21', text: 'Belediye Binası\'nı Sv.15 yap', t: ['bld', 'townhall', 15], reward: { gold: 1200, stone: 60000 } },
  { id: 'q22', text: 'Belediye Binası\'nı Sv.20 yap', t: ['bld', 'townhall', 20], reward: { gold: 2000 } },
  { id: 'q23', text: 'Ambar\'ı Sv.25 yap', t: ['bld', 'warehouse', 25], reward: { gold: 2000 } },
  { id: 'q24', text: 'Belediye Binası\'nı Sv.30 yap', t: ['bld', 'townhall', 30], reward: { gold: 3500 } },
  { id: 'q25', text: 'Belediye Binası\'nı Sv.40 yap (Efsanevi Kale)', t: ['bld', 'townhall', 40], reward: { gold: 10000 } },
];
// Eski 29 görev (kimlikleri korunur, kayıtlar bozulmasın) + üretilen görevler = 1000 ana görev.
// Üretilen görevler zorluk sırasına göre (rank 0–1000) eski görevlerle harmanlanır.
// t: ['cnt', sayaç, n] → görev listede göründüğü andan itibaren sayılır (S.qBase).
const LEGACY_RANK = { q1: 0, q2: 1, q3: 2, q4: 3, q5: 5, q6: 6, q7: 8, q8: 10, qf1: 12, qr1: 14, q9: 16, q10: 18, qt1: 20, qt2: 22, q11: 24, q12: 75, q13: 90, q14: 110, q15: 120, q16: 125, q17: 160, q18: 190, q19: 200, q20: 340, q21: 325, q22: 450, q23: 590, q24: 700, q25: 950 };
const LEGACY_TH = [2, 3, 5, 7, 10, 15, 20, 30, 40];
export const QUEST_TOTAL = 1000;
const nice = (v) => { if (v < 10) return Math.max(1, Math.round(v)); const p = Math.pow(10, Math.floor(Math.log10(v)) - 1); const st = [10, 15, 20, 25, 30, 40, 50, 60, 75, 80, 100]; const m = v / p; return st.reduce((a, b) => (Math.abs(b - m) < Math.abs(a - m) ? b : a)) * p; };
const CNT = [ // [sayaç, metin, başlangıç, bitiş (rank 1000'de)]
  ['zombies', '{n} zombi öldür', 2, 60], ['trained', '{n} asker eğit', 100, 30000], ['wins', '{n} savaş kazan', 1, 40], ['giants', '{n} dev kes', 1, 10],
  ['rallies', '{n} kez deve ralli yap', 1, 8], ['collects', 'Kaynakları {n} kez topla', 5, 60], ['gathers', 'Madenlerden {n} kez kaynak topla', 1, 15], ['summons', '{n} kahraman çağır', 1, 40],
  ['upgrades', '{n} bina yükselt', 1, 15], ['heals', '{n} kez yaralı asker iyileştir', 1, 15], ['tanks', '{n} Demir Tank üret', 3, 400], ['speedups', '{n} hızlandırma kullan', 3, 150],
  ['energy', '{n} enerji harca', 20, 600], ['kills', '{n} düşman askeri yen', 200, 60000], ['scouts', '{n} kez gözetleme yap', 1, 10],
];
const QB = ['barracks', 'archery', 'hospital', 'potion', 'farm', 'lumber', 'quarry', 'academy', 'drill', 'forge', 'rally', 'tankyard', 'camp', 'warehouse', 'heroes', 'summon'];
const BNAME = { barracks: 'Kışla\'yı', archery: 'Okçu Kulesi\'ni', hospital: 'Hastane\'yi', potion: 'İksir Deposu\'nu', farm: 'Çiftliği', lumber: 'Kereste Atölyesi\'ni', quarry: 'Taş Ocağı\'nı', academy: 'Akademi\'yi', drill: 'Talimhane\'yi', forge: 'Demirhane\'yi', rally: 'Toplanma Kampı\'nı', tankyard: 'Tank Atölyesi\'ni', camp: 'Ordu Kampı\'nı', warehouse: 'Ambar\'ı', heroes: 'Karakter Deposu\'nu', summon: 'Çağırma Atölyesi\'ni', townhall: 'Belediye Binası\'nı' };
export const QUESTS = (() => {
  let sd = 20261120; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647); const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const legacy = LEGACY_QUESTS.map((q) => ({ ...q, rank: LEGACY_RANK[q.id] ?? 0 }));
  const nGen = QUEST_TOTAL - legacy.length, gen = [];
  const thAt = (r) => Math.min(40, 2 + Math.floor(r / 25));
  const thDone = new Set(LEGACY_TH); let lastCnt = -1, bi = 0;
  for (let i = 0; i < nGen; i++) {
    const r = (i + 0.5) * QUEST_TOTAL / nGen, th = thAt(r);
    let q;
    if (!thDone.has(th)) { thDone.add(th); q = { t: ['bld', 'townhall', th], text: `Belediye Binası'nı Sv.${th} yap` }; }
    else if (i % 4 === 2) { // bina
      let key, lv, tries = 0;
      do { key = QB[(bi++ * 7 + ri(0, 3)) % QB.length]; lv = Math.min(maxLevel(key), th - ri(0, 2)); } while (lv < 2 && tries++ < 10);
      lv = Math.max(2, lv); q = { t: ['bld', key, lv], text: `${BNAME[key]} Sv.${lv} yap` };
    } else {
      let c; do c = ri(0, CNT.length - 1); while (c === lastCnt); lastCnt = c;
      const [k, txt, a, b] = CNT[c], f = r / QUEST_TOTAL, n = nice(a * Math.pow(b / a, f) * (0.85 + rnd() * 0.3));
      q = { t: ['cnt', k, n], text: txt.replace('{n}', n.toLocaleString(LOC)) };
    }
    q.rank = r; gen.push(q);
  }
  const all = legacy.concat(gen).sort((a, b) => a.rank - b.rank);
  // ödüller (yalnızca üretilen görevler): her görevde bir ödül; 3–5 görevde 1dk, 15–20'de 5dk ya da 15 altın, ~100'de 1 saat, 150–200'de 1 gün hızlandırma. 3 günlük yok.
  let nx1 = ri(3, 5), nx5 = ri(15, 20), nxH = ri(90, 110), nxD = ri(150, 200), gi = 0;
  all.forEach((q, idx) => {
    q.no = idx + 1;
    if (q.id) return; gi++; q.id = 'g' + gi;
    const no = q.no;
    if (no >= nxD) { q.reward = { items: { s24h: 1 } }; nxD = no + ri(150, 200); }
    else if (no >= nxH) { q.reward = { items: { s1h: 1 } }; nxH = no + ri(90, 110); }
    else if (no >= nx5) { q.reward = rnd() < 0.5 ? { items: { s5m: 1 } } : { gold: 15 }; nx5 = no + ri(15, 20); }
    else if (no >= nx1) { q.reward = { items: { s1m: 1 } }; nx1 = no + ri(3, 5); }
    else { const x = rnd(); q.reward = x < 0.3 ? { energy: 5 } : { [['food', 'wood', 'stone'][Math.floor(rnd() * 3)]]: 5000 }; }
  });
  return all;
})();
export const DAILY = [
  { id: 'd1', text: 'Kaynakları 5 kez topla', stat: 'collects', n: 5, reward: { gold: 15 } },
  { id: 'd2', text: '100 asker eğit', stat: 'trained', n: 100, reward: { gold: 20 } },
  { id: 'd3', text: '1 bina yükselt', stat: 'upgrades', n: 1, reward: { gold: 15 } },
  { id: 'd4', text: '2 savaş kazan', stat: 'wins', n: 2, reward: { gold: 30 } },
  { id: 'd5', text: '1 kahraman çağır', stat: 'summons', n: 1, reward: { gold: 15 } },
  { id: 'd6', text: 'Yaralı asker iyileştir', stat: 'heals', n: 1, reward: { gold: 15 } },
];
// ---- Hızlandırma eşyaları: her zamanlayıcıda (inşaat, eğitim, tank, araştırma, iyileştirme) kullanılır ----
// tier → simge rengi: 1 yeşil, 2 mavi, 3 mor, 4 altın, 5 efsanevi kırmızı
export const SPEEDUPS = {
  s1m: { sec: 60, short: '1dk', name: '1 Dakika Hızlandırma', tier: 1 },
  s5m: { sec: 300, short: '5dk', name: '5 Dakika Hızlandırma', tier: 1 },
  s15m: { sec: 900, short: '15dk', name: '15 Dakika Hızlandırma', tier: 2 },
  s1h: { sec: 3600, short: '1sa', name: '1 Saat Hızlandırma', tier: 2 },
  s3h: { sec: 10800, short: '3sa', name: '3 Saat Hızlandırma', tier: 3 },
  s5h: { sec: 18000, short: '5sa', name: '5 Saat Hızlandırma', tier: 3 },
  s12h: { sec: 43200, short: '12sa', name: '12 Saat Hızlandırma', tier: 4 },
  s24h: { sec: 86400, short: '24sa', name: '24 Saat Hızlandırma', tier: 4 },
  s2d: { sec: 172800, short: '2gün', name: '2 Gün Hızlandırma', tier: 5 },
  s3d: { sec: 259200, short: '3gün', name: '3 Gün Hızlandırma', tier: 5 },
};
export const SPEED_ORDER = Object.keys(SPEEDUPS);
export const SPEED_TIER = { 1: 'Sıradan', 2: 'Nadir', 3: 'Destansı', 4: 'Efsanevi', 5: 'Mitik' };
// Düşme tabloları: [eşya, ağırlık(%), adet aralığı]
// Ana görev: %80 1–5 dk, 1 saat nadir
export const DROP_QUEST = [['s1m', 45, [1, 3]], ['s5m', 35, [1, 2]], ['s15m', 13, [1, 1]], ['s1h', 6, [1, 1]], ['s3h', 1, [1, 1]]];
// Etkinlik (günlük görevler): büyük hızlandırmalar burada, ama nadir
export const DROP_EVENT = [['s1m', 30, [2, 4]], ['s5m', 30, [1, 3]], ['s15m', 18, [1, 2]], ['s1h', 12, [1, 1]], ['s3h', 5, [1, 1]], ['s5h', 3, [1, 1]], ['s12h', 1.5, [1, 1]], ['s24h', 0.5, [1, 1]]];
// Günlük etkinlik sandığı: 2 çekiliş, büyük ödül şansı biraz daha yüksek
export const DROP_CHEST = [['s5m', 30, [2, 3]], ['s15m', 25, [1, 2]], ['s1h', 22, [1, 2]], ['s3h', 11, [1, 1]], ['s5h', 7, [1, 1]], ['s12h', 3.5, [1, 1]], ['s24h', 1.5, [1, 1]]];
// Market: altınla, bilerek pahalı (doğrudan altınla bitirmekten ~%25–40 pahalı)
export const SPEED_SHOP = [
  { id: 's1h', gold: 400 }, { id: 's5h', gold: 760 }, { id: 's24h', gold: 2100, tag: 'Popüler' }, { id: 's2d', gold: 3900 }, { id: 's3d', gold: 5600, tag: 'Kraliyet' },
];
// ---- İttifak dükkanı: market fiyatının yarısı, haftalık alım sınırı (her Pazartesi yenilenir) ----
// base = normal market fiyatı (1 dk/5 dk markette yok: 1 saat = 400 altın oranından), gold = ittifak fiyatı
export const ALLIANCE_SHOP = [
  { id: 'as_s1m', item: 's1m', base: 10, gold: 5, limit: 30 },
  { id: 'as_s5m', item: 's5m', base: 40, gold: 20, limit: 10 },
  { id: 'as_s24h', item: 's24h', base: 2100, gold: 1050, limit: 2 },
  { id: 'as_s3d', item: 's3d', base: 5600, gold: 2800, limit: 1 },
  { id: 'as_food', res: { food: 20000 }, base: 240, gold: 120, limit: 20 },
  { id: 'as_wood', res: { wood: 20000 }, base: 240, gold: 120, limit: 20 },
  { id: 'as_stone', res: { stone: 20000 }, base: 400, gold: 200, limit: 20 },
];
// ---- Avatar çerçeveleri (görünüm) ----
export const FRAMES = [
  { id: 'wood', name: 'Sarmaşıklı Ahşap', free: true },
  { id: 'bronze', name: 'Bronz Kalkan', free: true },
  { id: 'silver', name: 'Gümüş Kılıçlar', free: true },
  { id: 'iron', name: 'Dövme Demir', free: true },
  { id: 'emerald', name: 'Zümrüt Yaprak', free: true },
  { id: 'sapphire', name: 'Kraliyet Safiri', free: true },
  { id: 'laurel', name: 'Altın Defne Tacı', gold: 1800, tier: 4 },
  { id: 'crystal', name: 'Buz Kristali', gold: 2600, tier: 4 },
  { id: 'phoenix', name: 'Anka Ateşi', gold: 3800, tier: 5 },
  { id: 'shadow', name: 'Gölge Lordu', gold: 5200, tier: 5 },
  { id: 'dragon', name: 'Ejder Kral', gold: 7500, tier: 5, pro: true },
  { id: 'vip8', name: 'VIP İmparator', vip: 8, tier: 5, pro: true },
];
export const FRAME_BY_ID = Object.fromEntries(FRAMES.map((f) => [f.id, f]));
// ---- VIP: 1→8 sırayla altınla açılır, kalıcıdır. Ödül kutusu her `every` günde bir toplanır. ----
// mine: maden verimi bonusu (%), box: { items: {hızlandırma: adet}, energy, gold }
export const VIP = [
  null,
  { cost: 700, mine: 6, every: 2, box: { items: { s1m: 10 }, energy: 100 } },
  { cost: 1400, mine: 9, every: 2, box: { items: { s1m: 20 }, energy: 120, gold: 25 } },
  { cost: 3500, mine: 15, every: 2, box: { items: { s5m: 10 }, energy: 150 } },
  { cost: 5000, mine: 18, every: 2, box: { items: { s5m: 15, s15m: 3 }, energy: 150, gold: 50 } },
  { cost: 7000, mine: 22, every: 2, box: { items: { s15m: 10 }, energy: 170, gold: 80 } },
  { cost: 10000, mine: 26, every: 2, box: { items: { s1h: 3, s15m: 5 }, energy: 170, gold: 120 } },
  { cost: 14000, mine: 30, every: 3, box: { items: { s1h: 5 }, energy: 170 }, skin: 'vip7' },
  { cost: 20000, mine: 35, every: 2, box: { items: { s3d: 1 }, energy: 200 }, skin: 'vip8', frame: 'vip8' },
];
export const VIP_MAX = 8;
// ---- Teklif paketleri (demo: gerçek ödeme alınmaz) ----
// içerik: gold, res {food,wood,stone}, items {sXX: adet}, hero5 (rastgele 5★ kahraman), frames [id]
export const OFFERS = [
  // Belediye efekti paketleri: efekt + altın + kaynak + hızlandırma
  { id: 'sk_shuttle', skin: 'shuttle', name: 'Galaksi Üssü Paketi', price: '₺1.999,99', limit: 1, tag: 'Efsanevi', tier: 5, gold: 16000, res: { food: 2500000, wood: 2500000, stone: 1200000 }, items: { s3d: 5, s24h: 8, s1h: 40 } },
  { id: 'sk_dragon', skin: 'dragon', name: 'Ejder Kalesi Paketi', price: '₺1.499,99', limit: 1, tier: 5, gold: 12000, res: { food: 1600000, wood: 1600000, stone: 800000 }, items: { s3d: 3, s24h: 5, s1h: 30 } },
  { id: 'sk_aurora', skin: 'aurora', name: 'Buz Sarayı Paketi', price: '₺1.249,99', limit: 1, tier: 5, gold: 9000, res: { food: 1200000, wood: 1200000, stone: 600000 }, items: { s3d: 2, s24h: 4, s1h: 20 } },
  { id: 'sk_xmas', skin: 'xmas', name: 'Yılbaşı Şatosu Paketi', price: '₺999,99', limit: 1, tag: 'Yılbaşı Özel', tier: 5, gold: 7000, res: { food: 800000, wood: 800000, stone: 400000 }, items: { s3d: 1, s24h: 3, s1h: 20 } },
  { id: 'sk_crown', skin: 'crown', name: 'Altın Taç Sarayı Paketi', price: '₺749,99', limit: 1, tier: 5, gold: 5000, res: { food: 500000, wood: 500000, stone: 250000 }, items: { s24h: 3, s1h: 15, s5m: 30 } },
  { id: 'sk_fireworks', skin: 'fireworks', name: 'Havai Fişek Paketi', price: '₺499,99', limit: 1, tier: 5, gold: 3000, res: { food: 300000, wood: 300000, stone: 150000 }, items: { s24h: 2, s1h: 10, s5m: 30 } },
  { id: 'o1', name: 'Başlangıç Paketi', price: '₺49,99', limit: 1, tag: 'Bir kez', tier: 2, gold: 500, res: { food: 20000, wood: 20000, stone: 10000 }, items: { s5m: 10, s1m: 20 } },
  { id: 'o2', name: 'Hızlandırma Sandığı', price: '₺99,99', limit: 3, tier: 3, gold: 300, items: { s1h: 5, s5m: 30, s1m: 50 } },
  { id: 'o3', name: 'Savaş Lordu', price: '₺149,99', limit: 2, tier: 3, gold: 1000, res: { food: 100000, wood: 100000, stone: 50000 }, items: { s5h: 2, s24h: 1 } },
  { id: 'o4', name: 'Kahraman Paketi', price: '₺249,99', limit: 1, tag: 'Popüler', tier: 4, gold: 1500, hero5: 1, items: { s24h: 1, s1h: 5 } },
  { id: 'o5', name: 'Kraliyet Hazinesi', price: '₺349,99', limit: 1, tier: 4, gold: 3000, items: { s24h: 2, s2d: 1, s15m: 20 }, frames: ['laurel'] },
  { id: 'o6', name: 'Efsane Paketi', price: '₺499,99', limit: 1, tag: 'En iyi değer', tier: 5, gold: 2000, hero5: 1, items: { s3d: 2, s1m: 100 }, frames: ['dragon'] },
  { id: 'o7', name: 'İmparator Paketi', price: '₺999,99', limit: 1, tag: 'Kraliyet', tier: 5, gold: 10000, hero5: 2, res: { food: 1000000, wood: 1000000, stone: 500000 }, items: { s3d: 5, s24h: 10, s1h: 30 }, frames: ['phoenix', 'shadow'] },
];
export const DAILY_CHEST = { need: 4, reward: { gold: 100, food: 3000, wood: 3000 } };
export const LOGIN_REWARDS = [
  { food: 2000, wood: 2000 }, { gold: 50 }, { stone: 2000, food: 2000 }, { gold: 100 }, { food: 5000, wood: 5000, stone: 2000 }, { gold: 150 }, { gold: 300 },
];
// ---- Çanta: görev ve etkinlik ödülleri (kaynak, altın, enerji) kalıplara bölünüp çantaya düşer; oyuncu istediği kadarını kullanır ----
// Dünya haritasından gelenler (savaş ganimeti, maden, zombi, dev) doğrudan depoya gider.
export const BAG_DENOM = {
  food: [1000000, 500000, 100000, 50000, 10000, 5000, 1000, 500, 100],
  wood: [1000000, 500000, 100000, 50000, 10000, 5000, 1000, 500, 100],
  stone: [1000000, 500000, 100000, 50000, 10000, 5000, 1000, 500, 100],
  gold: [1000, 500, 100, 50, 10, 5, 1],
  energy: [100, 50, 20, 10, 5, 1],
};
export const BAG_NAMES = { food: 'Buğday', wood: 'Kereste', stone: 'Taş', gold: 'Altın', energy: 'Enerji' };
