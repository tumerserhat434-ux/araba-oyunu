// =====================================================================
//  DEMİR SANCAK — öğretici (danışman eşliğinde adım adım eğitim)
// =====================================================================
import * as G from './state.js?v=2611191518';

const STEPS = [
  { id: 'welcome', text: 'Hoş geldin Lordum! Ben <b>Nöbetçi Emre</b>, senin danışmanınım. Bu topraklar artık senin. Gel, krallığını birlikte büyütelim!', btn: 'Başlayalım' },
  { id: 'collect', text: 'Her şey kaynakla başlar. <b>Çiftliğin</b> üstündeki 🌾 simgesine dokunarak yiyecekleri topla.', plot: 'farm1', wait: 'collect', prep: () => { G.S.buildings.farm1.collectedAt = Date.now() / 1000 - 3600; } },
  { id: 'th', text: 'Güzel! Şimdi krallığın kalbine, <b>Belediye Binası</b>\'na dokun.', plot: 'townhall', wait: 'sheet:townhall' },
  { id: 'upgrade', text: 'Belediye Binası\'nın seviyesi, diğer binaların ulaşabileceği en yüksek seviyedir. <b>Yükselt</b> düğmesine bas!', sel: '[data-act=upgrade]', wait: 'upgrade', top: true },
  { id: 'speed', text: 'İnşaat biraz zaman alır. İlk hızlandırma benden hediye! <b>⚡ Hemen bitir</b>\'e bas.', sel: '[data-act=speed]', wait: 'speed', top: true, prep: () => { G.S.res.gold += 60; } },
  { id: 'barracks', text: 'Muhteşem! Şimdi ordumuzu büyütelim. <b>Kışla</b>\'ya dokun.', plot: 'barracks', wait: 'sheet:barracks' },
  { id: 'train', text: 'Bir asker türü seç, kaydırıcıyla miktarı ayarla ve <b>⚔ Eğit</b>\'e bas. Okçular piyadeye, süvariler okçulara, mızrakçılar süvarilere karşı güçlüdür.', sel: '[data-act=train]', wait: 'train', top: true },
  { id: 'summon', text: 'Kahramanlar ordunu çok güçlendirir. Alttaki <b>🔮 Çağır</b> düğmesine bas.', sel: 'nav [data-go=summon]', wait: 'summonOpen', prep: () => { G.S.freePullDay = ''; } },
  { id: 'free', text: 'Her gün bir <b>ücretsiz çağırma</b> hakkın var. Hadi kullan! 5★ kahraman çıkarsa çok şanslısın…', sel: '#sFree', wait: 'summoned', top: true },
  { id: 'closeSummon', text: 'Kahramanlarını <b>Karakter Deposu</b>\'nda geliştirip komutan yapabilirsin. Şimdi <b>Tamam</b> ve <b>✕</b> ile şehre dön.', wait: 'sceneClosed', top: true, ghost: true },
  { id: 'world', text: 'Fetih zamanı! <b>🗺️ Dünya</b> haritasını aç.', sel: 'nav [data-go=world]', wait: 'worldOpen' },
  { id: 'pick', text: 'İşaretlediğim zayıf krallığa dokun, ardından <b>⚔ Saldır</b>\'a bas.', sel: () => { const e = [...G.S.enemies].sort((a, b) => a.power - b.power)[0]; return e ? `[data-k="${e.id}"]` : '[data-k]'; }, wait: 'attackOpen', top: true, alt: '[data-m=toattack]' },
  { id: 'march', text: 'Askerlerini ve en fazla 5 komutanını seç, sonra <b>🚩 Yürüyüşe çık</b>!', sel: '[data-m=march]', wait: 'battle', top: true },
  { id: 'battle', text: '', wait: 'sceneClosed', hidden: true },
  { id: 'hospital', text: 'Savaşta yaralanan askerler <b>Hastane</b>\'de iyileşir; hastane yoksa ölürler! Hastane arsasına dokunup inşa et.', plot: 'hospital', wait: 'sheet:hospital' },
  { id: 'done', text: 'Tebrikler Lordum, artık hazırsın! 🎉 Ödülün: <b>🪙 300 altın</b>. Unutma: düşmanlar zaman zaman şehrine saldırır, kulelerini ve ordunu güçlü tut!', btn: 'Bitir', reward: true },
];

let C = null, idx = -1, box = null, hand = null, ring = null, raf = 0, portrait = '';
export const tutActive = () => idx >= 0;
export function initTutorial(ctx) {
  C = ctx;
  if (G.S.tut === 'done') return;
  idx = Math.max(0, STEPS.findIndex((s) => s.id === G.S.tut));
  build();
  C.getAvatar('emre').then((u) => { portrait = u; const im = box && box.querySelector('img'); if (im) im.src = u; });
  show();
}
function build() {
  const css = document.createElement('style');
  css.textContent = `
  .tut-box{position:fixed;left:10px;right:10px;z-index:70;display:flex;gap:10px;align-items:flex-start;padding:12px;border-radius:18px;
    background:linear-gradient(180deg,#4a3520,#22160a);border:2px solid #f3c24a;box-shadow:0 12px 40px rgba(0,0,0,.6);transition:top .3s,bottom .3s,opacity .25s;max-width:520px;margin:0 auto}
  .tut-box img{width:64px;height:84px;border-radius:12px;object-fit:cover;border:2px solid #b8801c;flex-shrink:0;background:#1a1008}
  .tut-box .tt{flex:1;font-size:14px;line-height:1.4;color:#f3e6c8}
  .tut-box .tn{font-family:Cinzel,serif;font-weight:900;color:#f3c24a;font-size:13px;margin-bottom:2px}
  .tut-box .tb{display:flex;gap:8px;margin-top:8px}
  .tut-box .tb button{border:0;border-radius:10px;padding:7px 12px;font-weight:900;font-size:13px;font-family:inherit}
  .tut-go{background:linear-gradient(180deg,#ffd96a,#e09a1a);color:#3a2000}
  .tut-skip{background:rgba(0,0,0,.35);color:#c8b48a}
  .tut-hand{position:fixed;z-index:69;font-size:40px;pointer-events:none;transform:translate(-30%,-10%);filter:drop-shadow(0 3px 4px #000);animation:tuth .9s ease-in-out infinite}
  @keyframes tuth{50%{margin-top:14px}}
  .tut-ring{position:fixed;z-index:68;pointer-events:none;width:70px;height:70px;margin:-35px 0 0 -35px;border-radius:50%;border:4px solid #ffd96a;box-shadow:0 0 20px #ffc84a,inset 0 0 20px #ffc84a88;animation:tutr 1.1s ease-out infinite}
  @keyframes tutr{0%{transform:scale(.6);opacity:1}100%{transform:scale(1.5);opacity:0}}`;
  document.head.appendChild(css);
  box = document.createElement('div'); box.className = 'tut-box';
  hand = document.createElement('div'); hand.className = 'tut-hand'; hand.textContent = '👆';
  ring = document.createElement('div'); ring.className = 'tut-ring';
  document.body.append(box, ring, hand);
}
function cur() { return STEPS[idx]; }
function show() {
  const s = cur();
  if (!s) return finish();
  G.S.tut = s.id; G.save();
  if (s.prep) { s.prep(); G.save(); }
  if (s.plot) C.focusPlot(s.plot);
  if (s.hidden) { box.style.display = 'none'; hand.style.display = ring.style.display = 'none'; return; }
  box.style.display = 'flex';
  box.innerHTML = `<img src="${portrait}" alt=""><div class="tt"><div class="tn">Nöbetçi Emre • Danışman</div>${s.text}
    <div class="tb">${s.btn ? `<button class="tut-go">${s.btn}</button>` : ''}<button class="tut-skip">${idx === STEPS.length - 1 ? '' : 'Öğreticiyi geç'}</button></div></div>`;
  const go = box.querySelector('.tut-go'); if (go) go.onclick = () => next();
  const sk = box.querySelector('.tut-skip'); if (sk && sk.textContent) sk.onclick = () => { if (confirm('Öğretici atlansın mı?')) finish(true); }; else if (sk) sk.remove();
  C.sfx('open');
  cancelAnimationFrame(raf); loop();
}
function next() {
  const s = cur();
  if (s && s.reward) { G.S.res.gold += 300; C.toast('🪙 +300 altın ödül!'); C.sfx('coin'); C.updateTop(); }
  idx++;
  if (idx >= STEPS.length) return finish();
  show();
}
function finish(skipped) {
  idx = -1; G.S.tut = 'done'; G.S.raid.at = Date.now() / 1000 + 300; G.save();
  cancelAnimationFrame(raf);
  box?.remove(); hand?.remove(); ring?.remove();
  if (skipped) C.toast('Öğretici atlandı');
}
export function tutEvent(ev) {
  const s = cur();
  if (!s || !s.wait) return;
  if (s.wait === ev) { setTimeout(next, 350); }
}
function targetPos(s) {
  if (s.plot) return C.plotScreen(s.plot);
  let sel = typeof s.sel === 'function' ? s.sel() : s.sel;
  if (s.alt && document.querySelector(s.alt)) sel = s.alt;
  if (!sel) return null;
  const el = document.querySelector(sel);
  if (!el || !el.offsetParent) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
function loop() {
  raf = requestAnimationFrame(loop);
  const s = cur(); if (!s || s.hidden) return;
  // baskınları öğretici sırasında ertele
  if (G.S.raid.at - Date.now() / 1000 < 120) G.S.raid.at = Date.now() / 1000 + 300;
  const p = targetPos(s);
  if (p && !s.ghost) {
    hand.style.display = ring.style.display = 'block';
    hand.style.left = p.x + 'px'; hand.style.top = p.y + 'px';
    ring.style.left = p.x + 'px'; ring.style.top = p.y + 'px';
  } else { hand.style.display = ring.style.display = 'none'; }
  const top = s.top || (p && p.y > innerHeight * 0.55);
  box.style.top = top ? 'max(70px, calc(env(safe-area-inset-top) + 60px))' : 'auto';
  box.style.bottom = top ? 'auto' : 'calc(env(safe-area-inset-bottom) + 84px)';
}
