// =====================================================================
//  DEMİR SANCAK — oyun verileri (binalar, askerler, kahramanlar, mağaza)
// =====================================================================

export const RES = {
  food: { name: 'Yiyecek', icon: '🌾' },
  wood: { name: 'Odun', icon: '🪵' },
  stone: { name: 'Taş', icon: '🪨' },
  gold: { name: 'Altın', icon: '🪙' },
};

// Bina türleri
export const BUILDINGS = {
  townhall: { name: 'Belediye Binası', icon: '🏰', desc: 'Krallığının kalbi. Seviyesi diğer binaların en yüksek seviyesini belirler.', base: { food: 300, wood: 300, stone: 150 }, time: 12, reqTH: 0 },
  barracks: { name: 'Kışla', icon: '⚔️', desc: 'Asker eğitilir. Seviye arttıkça eğitim hızlanır, parti büyür ve askerler güçlenir.', base: { food: 150, wood: 200, stone: 60 }, time: 8, reqTH: 1 },
  archery: { name: 'Okçu Kulesi', icon: '🏹', desc: 'Şehri saldırılara karşı korur. Savunmada düşmana ok yağdırır.', base: { food: 80, wood: 220, stone: 160 }, time: 10, reqTH: 2 },
  hospital: { name: 'Hastane', icon: '💚', desc: 'Savaşta yaralanan askerler buraya gelir ve iyileştirilir. Kapasite dolarsa yaralılar ölür.', base: { food: 200, wood: 180, stone: 80 }, time: 9, reqTH: 2 },
  potion: { name: 'İksir Deposu', icon: '🧪', desc: 'Şifa iksiri üretir ve saklar. Her iksir yaralı askerleri anında iyileştirir.', base: { food: 160, wood: 120, stone: 140 }, time: 10, reqTH: 3 },
  heroes: { name: 'Karakter Deposu', icon: '🛡️', desc: 'Kahramanların burada yaşar. Seviyesi, kahramanların ulaşabileceği en yüksek seviyeyi belirler.', base: { food: 180, wood: 160, stone: 120 }, time: 10, reqTH: 1 },
  summon: { name: 'Çağırma Atölyesi', icon: '🔮', desc: 'Altınla kahraman çağır. 5 yıldızlı efsanevi kahramanlar çok nadir çıkar!', base: { food: 120, wood: 160, stone: 160 }, time: 10, reqTH: 1 },
  farm: { name: 'Çiftlik', icon: '🌾', desc: 'Yiyecek üretir.', base: { food: 40, wood: 90, stone: 0 }, time: 5, reqTH: 1, prod: 'food', rate: 900 },
  lumber: { name: 'Kereste Atölyesi', icon: '🪵', desc: 'Odun üretir.', base: { food: 90, wood: 40, stone: 0 }, time: 5, reqTH: 1, prod: 'wood', rate: 800 },
  quarry: { name: 'Taş Ocağı', icon: '🪨', desc: 'Taş üretir.', base: { food: 90, wood: 90, stone: 0 }, time: 6, reqTH: 2, prod: 'stone', rate: 500 },
  warehouse: { name: 'Ambar', icon: '📦', desc: 'Kaynak depolama sınırını artırır ve yağmada kaynaklarının bir kısmını korur.', base: { food: 120, wood: 150, stone: 80 }, time: 8, reqTH: 2 },
};
export const MAX_LEVEL = 10;

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
  { id: 'farm1', key: 'farm', x: -28, z: -6 },
  { id: 'farm2', key: 'farm', x: -28, z: 12 },
  { id: 'lumber1', key: 'lumber', x: 28, z: -6 },
  { id: 'lumber2', key: 'lumber', x: 28, z: 12 },
  { id: 'quarry1', key: 'quarry', x: -26, z: -22 },
  { id: 'quarry2', key: 'quarry', x: 26, z: -22 },
];

export function upgradeCost(key, toLevel) {
  const b = BUILDINGS[key], k = Math.pow(1.72, toLevel - 1), out = {};
  for (const r in b.base) if (b.base[r]) out[r] = Math.round(b.base[r] * k / 10) * 10;
  return out;
}
export function upgradeTime(key, toLevel) { return Math.round(BUILDINGS[key].time * Math.pow(1.6, toLevel - 1)); }
export function prodPerHour(key, level) { const b = BUILDINGS[key]; return b.prod ? Math.round(b.rate * level * Math.pow(1.12, level - 1)) : 0; }
export function prodCap(key, level) { return prodPerHour(key, level) * 3; }

// Askerler — taş/kağıt/makas: okçu > piyade & mızrakçı, süvari > okçu, mızrakçı > süvari, piyade dengeli
export const TROOPS = {
  infantry: { name: 'Kılıç Piyadesi', short: 'Piyade', icon: '🗡️', atk: 11, def: 13, hp: 32, load: 12, cost: { food: 30, wood: 20, stone: 5 }, time: 1.2, desc: 'Dengeli ön saf askeri. Zırhlı ve dayanıklı.' },
  spearman: { name: 'Mızrakçı', short: 'Mızrakçı', icon: '🔱', atk: 10, def: 15, hp: 30, load: 10, cost: { food: 30, wood: 30, stone: 0 }, time: 1.2, desc: 'Uzun mızrağıyla süvarilere karşı çok güçlü.' },
  archer: { name: 'Okçu', short: 'Okçu', icon: '🏹', atk: 14, def: 8, hp: 24, load: 8, cost: { food: 25, wood: 35, stone: 0 }, time: 1.4, desc: 'Uzaktan yüksek hasar. Piyadelere karşı etkili.' },
  cavalry: { name: 'Şövalye Süvari', short: 'Süvari', icon: '🐎', atk: 16, def: 12, hp: 40, load: 18, cost: { food: 60, wood: 30, stone: 20 }, time: 2.2, reqBarracks: 3, desc: 'Hızlı ve yıkıcı. Okçuları ezer.' },
};
export const COUNTER = {
  infantry: { infantry: 1, spearman: 1.05, archer: 1, cavalry: 1.05 },
  spearman: { infantry: 0.95, spearman: 1, archer: 1, cavalry: 1.5 },
  archer: { infantry: 1.3, spearman: 1.3, archer: 1, cavalry: 0.75 },
  cavalry: { infantry: 1.05, spearman: 0.7, archer: 1.5, cavalry: 1 },
};

// Kahramanlar — tamamen özgün karakterler
export const RARITY = {
  2: { name: 'Sıradan', color: '#9fb4c2', rate: 0.68 },
  3: { name: 'Nadir', color: '#4aa8ff', rate: 0.26 },
  4: { name: 'Destansı', color: '#b06bff', rate: 0.054 },
  5: { name: 'Efsanevi', color: '#ffc84a', rate: 0.006 },
};
export const HEROES = [
  // 5★
  { id: 'tugrul', name: 'Demirpençe Tuğrul', title: 'Bozkırın Fırtınası', rarity: 5, role: 'cavalry', atk: 28, def: 18, skill: 'Yıldırım Hücum: Süvarilerin saldırısı +35%, ilk turda çifte hasar.', look: { primary: '#1d1a2e', secondary: '#c9a227', metal: 'gold', helmet: 'winged', hair: '#1a1410', beard: true, female: false, weapon: 'lance' } },
  { id: 'elara', name: 'Gölgeok Elara', title: 'Ay Ormanının Gözü', rarity: 5, role: 'archer', atk: 30, def: 14, skill: 'Gümüş Yağmur: Okçu hasarı +40%, düşman okçularını susturur.', look: { primary: '#2a4a3a', secondary: '#e8e0c8', metal: 'gold', helmet: 'hood', hair: '#d8c08a', beard: false, female: true, weapon: 'bow' } },
  { id: 'baran', name: 'Altınkalkan Baran', title: 'Yıkılmaz Sur', rarity: 5, role: 'infantry', atk: 22, def: 30, skill: 'Tanrısal Kalkan: Tüm birliklerin savunması +30%, yaralı oranı azalır.', look: { primary: '#5a1414', secondary: '#f0c040', metal: 'gold', helmet: 'crown', hair: '#3a2416', beard: true, female: false, weapon: 'hammer' } },
  // 4★
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
export function heroBonus(h, level, copies) {
  const base = { 2: 5, 3: 12, 4: 22, 5: 35 }[h.rarity];
  return base + level * (h.rarity * 0.35) + (copies || 0) * h.rarity * 0.8;
}
export function heroLevelCost(level) { return { food: Math.round(200 * Math.pow(1.35, level)), stone: Math.round(60 * Math.pow(1.35, level)) }; }

// Çağırma
export const SUMMON = { cost1: 100, cost10: 900, pity5: 150, pity4: 10 };

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
