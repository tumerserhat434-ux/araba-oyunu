// =====================================================================
//  DEMİR SANCAK — Fetih Görevleri ekranı (bölüm haritası + görev kartı)
// =====================================================================
import * as G from './state.js?v=2611182113';
import { HERO_BY_ID, RARITY } from './data.js?v=2611182113';
import * as CP from './campaign.js?v=2611182113';
import { rewardsHtml } from './scenes.js?v=2611182113';

let C = null, viewCh = 1, sel = 0, busy = false;
const $ = (id) => document.getElementById(id);
const root = () => $('camp');
const UNIT_IMG = { infantry: 'u_infantry', spearman: 'u_spearman', archer: 'u_archer', cavalry: 'u_cavalry', tank: 'b_tank' };
const themeNo = (ch) => (ch - 1) % CP.THEMES.length + 1;

// 15 durak: alttan başlayıp kıvrılarak yukarıdaki patron kalesine çıkan yol (x %, y %)
const NODE_POS = [[20, 94], [50, 90.5], [80, 85], [68, 76.5], [38, 73], [15, 65], [32, 57], [62, 55], [85, 47.5], [64, 39], [34, 37], [14, 29], [36, 21.5], [68, 19.5], [50, 7.5]];
function pathD(pts) { // yumuşak eğri (Catmull-Rom → Bezier)
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export function initCampaign(ctx) {
  C = ctx;
  root().addEventListener('click', onClick);
}
export function openCampaign() {
  CP.ensureCamp();
  viewCh = CP.chapterOf(CP.campIdx()); sel = CP.campIdx();
  root().classList.remove('hidden'); root().classList.add('in');
  ['top', 'side', 'nav', 'labels', 'rside', 'bottomHud'].forEach((id) => $(id).classList.add('hidden'));
  C.sfx('open'); render();
}
function closeCampaign() {
  root().classList.add('hidden'); root().innerHTML = '';
  ['top', 'side', 'nav', 'labels', 'rside', 'bottomHud'].forEach((id) => $(id).classList.remove('hidden'));
  C.updateTop();
}

function nodeHtml(idx, i) {
  const cur = CP.campIdx(), done = idx < cur, isCur = idx === cur, locked = idx > cur;
  const boss = CP.isBoss(idx), elite = CP.isElite(idx), [x, y] = NODE_POS[i];
  const cls = ['cp-node', done ? 'done' : isCur ? 'cur' : 'lock', boss ? 'boss' : elite ? 'elite' : '', idx === sel ? 'sel' : ''].join(' ');
  const face = boss || elite ? `<img class="cp-face" src="${CP.enemyAvatar(idx)}" alt="">` : `<i class="cp-num">${CP.stageOf(idx)}</i>`;
  return `<button class="${cls}" style="left:${x}%;top:${y}%" data-stage="${idx}">
    <span class="cp-disc">${face}${done ? '<em class="cp-ok">✓</em>' : ''}${locked ? '<em class="cp-lock">🔒</em>' : ''}</span>
    ${boss ? '<img class="cp-crown" src="assets/ui/crown.webp" alt="">' : ''}
    ${isCur ? '<img class="cp-pin" src="assets/ui/ic_campaign.webp" alt="">' : ''}
    <b class="cp-lbl">${CP.stageLabel(idx)}</b></button>`;
}

function cardHtml(idx) {
  const cur = CP.campIdx(), done = idx < cur, locked = idx > cur;
  const P = CP.stagePower(idx), mine = CP.myPower(), ch = CP.chance(idx);
  const army = CP.stageArmy(idx), rew = CP.stageRewards(idx);
  const pct = Math.min(100, mine / (mine + P) * 100);
  const armyHtml = Object.entries(army).filter(([, n]) => n > 0).map(([t, n]) => `<span class="cp-u"><img src="assets/ui/${UNIT_IMG[t]}.webp" alt=""><b>${G.fmt(n)}</b></span>`).join('');
  const heroes = CP.campHeroes().map((id) => `<img class="cp-h" style="--rc:${RARITY[HERO_BY_ID[id].rarity].color}" src="assets/heroes/${id}_a.webp" alt="">`).join('');
  const tag = CP.isBoss(idx) ? '<em class="cp-tag boss">BÖLÜM PATRONU</em>' : CP.isElite(idx) ? '<em class="cp-tag elite">SEÇKİN KOMUTAN</em>' : '';
  let btn;
  if (done) btn = '<button class="cp-go done" disabled>✓ Tamamlandı</button>';
  else if (locked) btn = '<button class="cp-go lock" disabled>🔒 Önceki görevi tamamla</button>';
  else btn = `<button class="cp-go" data-act="fight"><i>⚔</i><span>Saldır</span></button>`;
  return `<div class="cp-card">
    <div class="cp-ch">
      <img class="cp-eava" src="${CP.enemyAvatar(idx)}" alt="">
      <div class="cp-et">${tag}<b>${CP.stageLabel(idx)} • ${CP.stageName(idx)}</b><small>Komutan: ${CP.enemyLord(idx)}</small></div>
    </div>
    <div class="cp-vs">
      <div class="cp-side me"><small>Senin gücün</small><b>⚔ ${G.fmt(mine)}</b></div>
      <div class="cp-side foe"><small>Düşman gücü</small><b>⚔ ${G.fmt(P)}</b></div>
    </div>
    <div class="cp-bar"><span style="width:${pct}%"></span><i></i></div>
    ${done ? '' : `<div class="cp-chance ${ch.cls}">${ch.cls === 'ok' ? '✔' : ch.cls === 'risk' ? '⚠' : '✖'} ${ch.txt}${ch.cls === 'risk' ? ` • %${Math.round(ch.p * 100)} şans` : ''}${ch.cls === 'no' ? ` • ${G.fmt(P - mine)} güç eksik` : ''}</div>`}
    <div class="cp-row"><span class="cp-rl">Düşman ordusu</span><div class="cp-army">${armyHtml}</div></div>
    <div class="cp-row"><span class="cp-rl">Komutanların</span><div class="cp-heroes">${heroes}<small>${G.fmt(G.totalTroops())} asker</small></div></div>
    <div class="cp-row"><span class="cp-rl">${done ? 'Alınan ödül' : 'İlk zafer ödülü'}</span><div class="cp-rws ${done ? 'got' : ''}">${rewardsHtml(rew)}</div></div>
    ${btn}
    ${!done && !locked && ch.cls === 'no' ? '<div class="cp-tips"><button data-act="train">⚔ Asker eğit</button><button data-act="heroes">🛡️ Kahramanlar</button></div>' : ''}
  </div>`;
}

function render(anim, keepScroll = null) {
  const cur = CP.campIdx(), curCh = CP.chapterOf(cur), th = CP.themeOf(viewCh), k = themeNo(viewCh);
  const base = (viewCh - 1) * CP.STAGES;
  const doneN = Math.max(0, Math.min(CP.STAGES, cur - base));
  if (sel < base || sel >= base + CP.STAGES) sel = Math.min(Math.max(cur, base), base + CP.STAGES - 1);
  const pts = NODE_POS, dAll = pathD(pts), dDone = doneN > 0 ? pathD(pts.slice(0, Math.min(CP.STAGES, doneN + 1))) : '';
  root().style.setProperty('--tc', th.color);
  root().innerHTML = `
    <div class="cp-bg" style="background-image:url(assets/ui/cm_${k}.webp)"></div>
    <div class="cp-scroll" id="cpScroll">
      <div class="cp-board ${anim ? 'zoom' : ''}" style="background-image:url(assets/ui/cm_${k}.webp)">
        <svg class="cp-path" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="${dAll}" class="p-all"/>${dDone ? `<path d="${dDone}" class="p-done"/>` : ''}
        </svg>
        ${pts.map((_, i) => nodeHtml(base + i, i)).join('')}
      </div>
    </div>
    <div class="cp-shade"></div>
    <header class="cp-head">
      <button class="cp-back" data-act="close">‹</button>
      <button class="cp-arr" data-act="prev" ${viewCh <= 1 ? 'disabled' : ''}>◀</button>
      <div class="cp-title"><small>BÖLÜM ${viewCh}</small><b>${th.name}</b><span>${th.sub}</span></div>
      <button class="cp-arr" data-act="next" ${viewCh >= curCh ? 'disabled' : ''}>${viewCh >= curCh ? '🔒' : '▶'}</button>
      <div class="cp-prog"><b>${doneN}/${CP.STAGES}</b><div class="cp-pbar"><i style="width:${doneN / CP.STAGES * 100}%"></i></div></div>
    </header>
    ${cardHtml(sel)}`;
  // kart yüksekliği kadar alt boşluk; seçili durağı görünür alana kaydır
  const sc = $('cpScroll'), card = root().querySelector('.cp-card');
  sc.style.paddingBottom = (card.offsetHeight + 12) + 'px';
  const node = sc.querySelector(`[data-stage="${sel}"]`);
  if (keepScroll != null) sc.scrollTop = keepScroll;
  else if (node) sc.scrollTop = node.offsetParent.offsetTop + node.offsetTop - (sc.clientHeight - card.offsetHeight) * 0.5;
}

function chapterDoneHtml(ch) {
  const th = CP.themeOf(ch), nx = CP.themeOf(ch + 1), k = themeNo(ch), kn = themeNo(ch + 1);
  return `<div class="cp-pop"><div class="cp-popbox">
    <div class="cp-rays"></div>
    <img class="cp-pboss" src="assets/ui/boss_${k}.webp" alt="">
    <h2 class="cinzel">BÖLÜM ${ch} TAMAMLANDI!</h2>
    <p>${th.lords[2]} yenildi, ${th.name} artık senin.</p>
    <div class="cp-next" style="background-image:url(assets/ui/cm_${kn}.webp)"><div><small>Yeni bölüm açıldı</small><b>Bölüm ${ch + 1}: ${nx.name}</b><span>${nx.sub}</span></div></div>
    <button class="btn gold" style="width:100%" data-act="nextch">🚩 Bölüm ${ch + 1}'e geç</button>
  </div></div>`;
}

function fight() {
  if (busy) return; busy = true;
  if (!G.totalTroops()) { busy = false; C.toast('Ordunda hiç asker yok! Önce asker eğit.', true); return; }
  const r = CP.fightStage(), ch = CP.chapterOf(r.idx), th = CP.themeOf(ch), k = themeNo(ch);
  root().classList.add('hidden');
  C.openBattle({
    mode: 'attack', result: r.result,
    attacker: { troops: r.troops, hero: r.heroes[0] }, defender: { troops: r.enemy, tower: 0 },
    report: r.report, title: CP.enemyLord(r.idx), enemyAva: CP.enemyAvatar(r.idx),
    plaque: `Görev ${CP.stageLabel(r.idx)} • ${CP.stageName(r.idx)}`,
    powers: { blue: r.mine, red: r.P },
    theme: { ...th, bg: `assets/ui/cb_${k}.webp` },
    onClose: () => {
      busy = false;
      ['top', 'side', 'nav', 'labels', 'rside', 'bottomHud'].forEach((id) => $(id).classList.add('hidden'));
      root().classList.remove('hidden');
      sel = CP.campIdx();
      if (!r.chapterDone) viewCh = CP.chapterOf(sel);
      render();
      if (r.chapterDone) { root().insertAdjacentHTML('beforeend', chapterDoneHtml(ch)); C.sfx('win'); }
    },
  });
}

function onClick(e) {
  const st = e.target.closest('[data-stage]');
  if (st) { sel = +st.dataset.stage; C.sfx('click'); render(false, $('cpScroll')?.scrollTop ?? null); return; }
  const a = e.target.closest('[data-act]'); if (!a) return;
  const act = a.dataset.act;
  if (act === 'close') { C.sfx('click'); closeCampaign(); }
  if (act === 'fight') fight();
  if (act === 'prev' && viewCh > 1) { viewCh--; sel = (viewCh - 1) * CP.STAGES; C.sfx('click'); render(true); }
  if (act === 'next' && viewCh < CP.chapterOf(CP.campIdx())) { viewCh++; sel = Math.min(CP.campIdx(), viewCh * CP.STAGES - 1); C.sfx('click'); render(true); }
  if (act === 'nextch') { viewCh = CP.chapterOf(CP.campIdx()); sel = CP.campIdx(); C.sfx('horn'); render(true); }
  if (act === 'train') { closeCampaign(); C.navigate('city'); setTimeout(() => document.querySelector('[data-go="city"]') && window.__ds?.openBuilding?.('barracks'), 50); }
  if (act === 'heroes') { closeCampaign(); C.navigate('heroes'); }
}
