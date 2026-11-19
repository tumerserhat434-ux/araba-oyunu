// =====================================================================
//  DEMİR SANCAK — Fetih Görevleri (bölüm 1-1 … 1-15, sonra 2-1 …)
//  Görev savaşlarında asker ölmez; güç yeterse zafer.
// =====================================================================
import { S, armyPowerMulti, heroPower, gainRes, addItem, bagAdd, save, emit, count } from './state.js?v=2611200205';
import { TROOPS } from './data.js?v=2611200205';

export const STAGES = 15;
const UNIT_POW = (t) => { const d = TROOPS[t]; return d.atk + d.def + d.hp * 0.4; };

// Her bölümün kendi diyarı (6. bölümden sonra diyarlar daha güçlü düşmanlarla yeniden döner)
export const THEMES = [
  {
    key: 'vadi', name: 'Yanan Vadi', sub: 'Haydutlar köyleri yakıyor', color: '#e8a040',
    mix: { infantry: 0.4, spearman: 0.2, archer: 0.3, cavalry: 0.1, tank: 0 },
    names: ['Haydut Gözcüleri', 'Yağmacı Çetesi', 'Yanık Çiftlik', 'Değirmen Baskını', 'Kızıl Pala', 'Orman Pususu', 'Köprü Muhafızları', 'Kaçakçı Kampı', 'Kule Yağmacıları', 'Kara Bıçak', 'Çetelerin Birliği', 'Duman Tepesi', 'Haydut Surları', 'Kale Kapısı', 'Haydut Kralı Bargan'],
    lords: ['Kızıl Pala', 'Kara Bıçak', 'Haydut Kralı Bargan'],
    sun: 0xffd0a0, sky: 0xffc890, ground: 0x6a5a30,
    grass: ['#6a8a34', '#5a7a2a', '#7a9a40', '#4a6a24', '#8a8a3a'], dirt: ['#8a6a3a', '#a07a48', '#6a4a2a', '#b08a58', '#5a4024'],
    fx: 'smoke', trees: true,
  },
  {
    key: 'col', name: 'Kızıl Çöl', sub: 'Çöl akıncıları kaleleri kuşattı', color: '#ff7a3a',
    mix: { infantry: 0.25, spearman: 0.15, archer: 0.25, cavalry: 0.35, tank: 0 },
    names: ['Kum Akıncıları', 'Vaha Yağmacıları', 'Kervan Pususu', 'Kanyon Nöbeti', 'Altın Pala', 'Kayıp Harabeler', 'Kum Fırtınası', 'Akrep Vadisi', 'Çöl Mancınıkları', 'Kızıl Kum', 'Serap Kalesi', 'Güneş Tapınağı', 'Kuşatma Hattı', 'Taht Kapısı', 'Çöl Sultanı Zerhan'],
    lords: ['Altın Pala', 'Kızıl Kum', 'Çöl Sultanı Zerhan'],
    sun: 0xffb070, sky: 0xffa060, ground: 0x8a5a2a,
    grass: ['#c88a4a', '#d89a58', '#b87a3a', '#e0a868', '#a86a30'], dirt: ['#c08048', '#d89860', '#a86a38', '#e8b070', '#8a5a2a'],
    fx: 'dust', trees: false,
  },
  {
    key: 'buz', name: 'Buzul Geçidi', sub: 'Kuzey akıncıları dağları tuttu', color: '#7ad0ff',
    mix: { infantry: 0.3, spearman: 0.35, archer: 0.2, cavalry: 0.15, tank: 0 },
    names: ['Kar Gözcüleri', 'Donmuş Göl', 'Kurt Sürüsü Akıncıları', 'Çam Ormanı Pususu', 'Ak Kurt', 'Buz Mağarası', 'Yanan Gözetleme Kulesi', 'Dağ Geçidi', 'Kuzey Kampı', 'Demir Diş', 'Çığ Tepesi', 'Buz Köprüsü', 'Ayaz Surları', 'Kristal Kapı', 'Buz Kralı Ayaz'],
    lords: ['Ak Kurt', 'Demir Diş', 'Buz Kralı Ayaz'],
    sun: 0xd8ecff, sky: 0xbfe0ff, ground: 0x4a5a6a,
    grass: ['#e8f0f8', '#d0dce8', '#f4f8ff', '#b8c8d8', '#c8d8e8'], dirt: ['#a8b4c0', '#c8d4de', '#8a96a2', '#e0e8f0', '#6a7682'],
    fx: 'snow', trees: true,
  },
  {
    key: 'ates', name: 'Ateş Diyarı', sub: 'Volkan savaş beyi uyandı', color: '#ff5a2a',
    mix: { infantry: 0.3, spearman: 0.15, archer: 0.2, cavalry: 0.2, tank: 0.15 },
    names: ['Kül Gözcüleri', 'Lav Nehri', 'Kor Tarikatı', 'Duman Krateri', 'Kor Maske', 'Obsidyen Ocak', 'Yanık Harabeler', 'Alev Kulesi', 'Magma Madeni', 'Kara Alev', 'Kül Fırtınası', 'Volkan Eteği', 'Obsidyen Surlar', 'Ateş Kapısı', 'Volkan Beyi Kargor'],
    lords: ['Kor Maske', 'Kara Alev', 'Volkan Beyi Kargor'],
    sun: 0xff9a60, sky: 0xff7040, ground: 0x3a2018,
    grass: ['#3a3030', '#2a2224', '#4a3a36', '#5a3a2a', '#24201e'], dirt: ['#4a3a34', '#5a4438', '#2e2624', '#6a4a36', '#8a3a1a'],
    fx: 'embers', trees: false,
  },
  {
    key: 'golge', name: 'Gölge Bataklığı', sub: 'Lanetli kraliçe ölüleri kaldırdı', color: '#b07aff',
    mix: { infantry: 0.3, spearman: 0.2, archer: 0.3, cavalry: 0.1, tank: 0.1 },
    names: ['Sis Gözcüleri', 'Çürük Kütükler', 'Kemik Tarlası', 'Zehirli Göl', 'Yosunlu Şövalye', 'Lanetli Harabeler', 'Mor Kristaller', 'Ölü Orman', 'Hayalet Köprü', 'Kara Sis', 'Mezar Tepesi', 'Batık Tapınak', 'Gölge Surları', 'Lanet Kapısı', 'Gölge Kraliçesi Morvena'],
    lords: ['Yosunlu Şövalye', 'Kara Sis', 'Gölge Kraliçesi Morvena'],
    sun: 0xc8a0ff, sky: 0x9a70d8, ground: 0x2a3a24,
    grass: ['#3a4a2a', '#2a3a22', '#4a5a34', '#34402a', '#28321e'], dirt: ['#3a3226', '#4a3e2e', '#2a2420', '#54463a', '#3a2e3a'],
    fx: 'fog', trees: false,
  },
];

// Görev sırası: 0 = 1-1, 14 = 1-15, 15 = 2-1 …
export const campIdx = () => S.camp?.done || 0;
export const chapterOf = (idx) => Math.floor(idx / STAGES) + 1;
export const stageOf = (idx) => (idx % STAGES) + 1;
export const themeOf = (ch) => THEMES[(ch - 1) % THEMES.length];
export const isBoss = (idx) => stageOf(idx) === STAGES;
export const isElite = (idx) => stageOf(idx) % 5 === 0 && !isBoss(idx);
export const stageLabel = (idx) => `${chapterOf(idx)}-${stageOf(idx)}`;
export const stageName = (idx) => themeOf(chapterOf(idx)).names[stageOf(idx) - 1];

// Düşman gücü: 1-1 = 10 bin, 1-2 = 20 bin, sonra her görev %20 daha güçlü.
// (1-15 ≈ 214 bin, 2-15 ≈ 3,3 milyon, 3-15 ≈ 51 milyon …)
export function stagePower(idx) {
  if (idx <= 0) return 10000;
  return Math.round(20000 * Math.pow(1.2, idx - 1) / 100) * 100;
}

// Belirlenimci küçük rastgele (aynı görev her açılışta aynı orduyu gösterir)
function seeded(n) { let s = (n * 2654435761) % 2147483647 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

export function stageArmy(idx) {
  const P = stagePower(idx), th = themeOf(chapterOf(idx)), rnd = seeded(idx + 7);
  const mix = {}; let sum = 0;
  for (const t in th.mix) { let w = th.mix[t] * (0.8 + rnd() * 0.4); if (t === 'tank' && chapterOf(idx) >= 2 && !w) w = 0.04 + Math.min(0.12, idx * 0.002); if (t === 'tank' && idx < 6) w = 0; mix[t] = w; sum += w; }
  const troops = {};
  for (const t in mix) troops[t] = Math.round(P * (mix[t] / sum) / UNIT_POW(t));
  return troops;
}
export function enemyAvatar(idx) {
  const k = (chapterOf(idx) - 1) % THEMES.length + 1;
  return `assets/ui/${isBoss(idx) ? 'boss' : 'cap'}_${k}.webp?v=2611200205`;
}
export function enemyLord(idx) { const th = themeOf(chapterOf(idx)), s = stageOf(idx); return th.lords[s <= 5 ? 0 : s <= 10 ? 1 : 2]; }

// Bizim taraf: evdeki tüm askerler + en güçlü 5 komutan
export function campHeroes() {
  return Object.keys(S.heroes).sort((a, b) => heroPower(b) - heroPower(a)).slice(0, 5);
}
export const myTroops = () => ({ ...S.troops });
export const myPower = () => armyPowerMulti(S.troops, campHeroes());

// Kazanma şansı: güç ≥ düşman → kesin zafer; %90–100 arası riskli; altı yenilgi
export function chance(idx) {
  const q = myPower() / stagePower(idx);
  if (q >= 1) return { q, p: 1, txt: 'Zafer kesin', cls: 'ok' };
  if (q >= 0.9) return { q, p: (q - 0.9) * 5, txt: 'Riskli', cls: 'risk' };
  return { q, p: 0, txt: 'Güç yetersiz', cls: 'no' };
}

export function stageRewards(idx) {
  const ch = chapterOf(idx), r100 = (v) => Math.round(v / 100) * 100;
  const mul = isBoss(idx) ? 2 : isElite(idx) ? 1.5 : 1;
  // her görevde kaynak ödülü (altın yok). Düşman gücüne değil görev sırasına bağlı,
  // yavaş artar: 1-1 = 8 bin, her görev +2 bin (seçkin ×1,5, patron ×2)
  const base = 8000 + idx * 2000;
  const res = { food: r100(base * mul), wood: r100(base * mul), stone: r100(base * 0.5 * mul) };
  // 5 dk hızlandırma: her 3. görevde, seçkin komutanlarda ve patronda (bölüm ilerledikçe artar)
  const s = stageOf(idx), items = [];
  const n5 = isBoss(idx) ? 3 + ch : isElite(idx) ? 2 + (ch - 1) : s % 3 === 0 ? 1 + Math.floor((ch - 1) / 2) : 0;
  if (n5) items.push({ id: 's5m', n: n5 });
  return { res, items };
}

// Saldırı: asker ölmez, kaynak harcanmaz. İlk zaferde ödül verilir ve sıradaki görev açılır.
export function fightStage() {
  const idx = campIdx(), P = stagePower(idx), mine = myPower(), ch = chance(idx);
  const win = ch.p >= 1 || (ch.p > 0 && Math.random() < ch.p);
  const q = mine / P;
  // savaş animasyonu için kalan oranlar (güç farkı büyüdükçe daha ezici)
  const aR = win ? Math.min(0.92, Math.max(0.3, 0.3 + (q - 1) * 0.7)) : Math.max(0.03, Math.min(0.2, 0.2 - (1 / q - 1) * 0.3));
  const dR = win ? Math.max(0.02, Math.min(0.2, 0.2 - (q - 1) * 0.3)) : Math.min(0.92, Math.max(0.3, 0.3 + (1 / q - 1) * 0.7));
  const enemy = stageArmy(idx), troops = myTroops(), heroes = campHeroes();
  const dLoss = {}; for (const t in enemy) dLoss[t] = Math.round(enemy[t] * (1 - dR));
  let rew = null, chapterDone = false;
  if (win) {
    rew = stageRewards(idx);
    bagAdd(rew.res); for (const it of rew.items) addItem(it.id, it.n);
    S.camp.done = idx + 1; chapterDone = isBoss(idx);
    S.stats.wins++; count('wins');
  }
  S.camp.tries = (S.camp.tries || 0) + 1;
  save(); emit('campaign', { idx, win });
  return { idx, win, P, mine, enemy, troops, heroes, rew, chapterDone, result: { win, aRemainRatio: aR, dRemainRatio: dR }, report: { kind: 'campaign', win, enemy: stageName(idx), aLoss: {}, dLoss, wounded: {}, dead: {}, loot: rew ? rew.res : {}, items: rew ? rew.items : null } };
}

export function ensureCamp() { S.camp ||= { done: 0, tries: 0 }; }
