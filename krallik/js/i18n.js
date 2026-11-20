// =====================================================================
//  DEMİR SANCAK — dil desteği (Türkçe / English)
//  Oyun metinleri Türkçe yazılı; İngilizce seçilince ekrana gelen her metin
//  (yazı düğümleri, placeholder/title) sözlükten çevrilir:
//   1) birebir eşleşme  2) sayılar # yapılarak eşleşme  3) {0} yer tutuculu kalıplar
//   4) bulunamazsa metin içindeki bilinen ifadeler tek tek çevrilir.
// =====================================================================
import EN from './i18n_en.js?v=2611201555';

export const LANG = (() => { try { return localStorage.getItem('ds_lang') === 'en' ? 'en' : 'tr'; } catch (e) { return 'tr'; } })();
export function setLang(l) { try { localStorage.setItem('ds_lang', l); } catch (e) { /* özel pencere */ } location.reload(); }

const exact = new Map(), numMap = new Map(), tpls = [];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const NUM = /\d+(?:[.,]\d+)*/g;
for (const [k0, v] of Object.entries(EN)) {
  const k = k0.replace(/\s+/g, ' ').trim();
  if (!k || k === v) continue;
  if (/\{\d+\}/.test(k)) {
    const parts = k.split(/\{(\d+)\}/); // [lit, idx, lit, idx, lit]
    let re = '^', lit = '', order = [];
    for (let i = 0; i < parts.length; i++) {
      if (i % 2) { re += '(.+?)'; order.push(+parts[i]); } else { re += esc(parts[i]); if (parts[i].length > lit.length) lit = parts[i]; }
    }
    if (lit.replace(/[\s•:,.\-–()]/g, '').length < 2) continue; // tamamen yer tutucu: anlamsız
    tpls.push({ re: new RegExp(re + '$', 's'), lit, order, v, w: k.replace(/\{\d+\}/g, '').length });
  } else {
    exact.set(k, v);
    if (/\d|\{n\}/.test(k)) {
      const nk = k.replace(/\{n\}/g, '#').replace(NUM, '#'), nv = v.replace(/\{n\}/g, '#').replace(NUM, '#');
      if ((nk.match(/#/g) || []).length === (nv.match(/#/g) || []).length) numMap.set(nk, nv);
    }
  }
}
tpls.sort((a, b) => b.w - a.w);
// metin içi ifade çevirisi: uzun ifadeler önce, harf sınırlarına dikkat
const phrases = [...exact.keys()].filter((k) => k.length >= 3 && /\p{L}/u.test(k) && !/\d/.test(k)).sort((a, b) => b.length - a.length);
const PHRASE_RE = phrases.length ? new RegExp('(?<![\\p{L}\\p{N}])(?:' + phrases.map(esc).join('|') + ')(?![\\p{L}\\p{N}])', 'gu') : null;

function tx(t, depth = 0) {
  const e = exact.get(t); if (e !== undefined) return e;
  if (/\d/.test(t)) {
    const nums = []; const nt = t.replace(NUM, (x) => { nums.push(x); return '#'; });
    const nv = numMap.get(nt); if (nv !== undefined) { let i = 0; return nv.replace(/#/g, () => nums[i++] ?? ''); }
  }
  // sonu/başı sayı olan kalıplar: "Şu an Sv.1" → "Şu an Sv." + "1"
  const tm = /^(.*?\D)(\s*\d[\d.,]*%?)$/.exec(t);
  if (tm && exact.has(tm[1].trimEnd())) return exact.get(tm[1].trimEnd()) + tm[1].slice(tm[1].trimEnd().length) + tm[2];
  const hm = /^([\d.,]+%?\s*)(\D.*)$/.exec(t);
  if (hm && exact.has(hm[2])) return hm[1] + exact.get(hm[2]);
  if (depth < 3) for (const tp of tpls) {
    if (!t.includes(tp.lit)) continue;
    const m = tp.re.exec(t); if (!m) continue;
    const vals = {}; tp.order.forEach((idx, j) => { vals[idx] = m[j + 1]; });
    return tp.v.replace(/\{(\d+)\}/g, (_, i) => { const x = vals[i]; if (x == null) return ''; const lead = x.match(/^\s*/)[0], trail = x.match(/\s*$/)[0], core = x.trim(); return lead + (core ? tx(core, depth + 1) : '') + trail; });
  }
  if (depth === 0 && /[çğıöşüÇĞİÖŞÜ]/.test(t)) (window.__i18nMiss ||= new Set()).add(t); // test: sözlükte olmayanlar
  let r = PHRASE_RE ? t.replace(PHRASE_RE, (w) => exact.get(w) ?? w) : t;
  // rakama bitişik süre kısaltmaları: 3gün → 3d, 5sa → 5h, 2dk → 2m, 9sn → 9s
  r = r.replace(/(\d)\s?gün\b/g, '$1d').replace(/(\d)sa\b/g, '$1h').replace(/(\d)\s?dk\b/g, '$1m').replace(/(\d)\s?sn\b/g, '$1s').replace(/\bSv\.(?=\s?\d)/g, 'Lv.');
  return r;
}
const cache = new Map();
export function tr(s) {
  if (LANG !== 'en' || !s || typeof s !== 'string') return s;
  const c = cache.get(s); if (c !== undefined) return c;
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s), core = m[2].replace(/\s+/g, ' ');
  const r = core && /\p{L}/u.test(core) ? m[1] + tx(core) + m[3] : s;
  if (cache.size > 6000) cache.clear();
  cache.set(s, r); cache.set(r, r);
  return r;
}

// ---- DOM: yazı düğümlerini ve bazı öznitelikleri çevir ----
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE']);
function fixText(n) { const p = n.parentNode; if (!p || SKIP.has(p.nodeName) || p.isContentEditable) return; const v = n.nodeValue, r = tr(v); if (r !== v) n.nodeValue = r; }
function fixAttrs(el) { for (const a of ['placeholder', 'title', 'aria-label']) { const v = el.getAttribute && el.getAttribute(a); if (v) { const r = tr(v); if (r !== v) el.setAttribute(a, r); } } }
function walk(root) {
  if (root.nodeType === 3) return fixText(root);
  if (root.nodeType !== 1 || SKIP.has(root.nodeName)) return;
  fixAttrs(root);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = w.nextNode(); n; n = w.nextNode()) { if (n.nodeType === 3) fixText(n); else fixAttrs(n); }
}
if (LANG === 'en') {
  document.documentElement.lang = 'en';
  document.title = tr(document.title);
  const start = () => {
    walk(document.body);
    new MutationObserver((ms) => {
      for (const m of ms) {
        if (m.type === 'characterData') fixText(m.target);
        else if (m.type === 'attributes') fixAttrs(m.target);
        else for (const a of m.addedNodes) walk(a);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title', 'aria-label'] });
  };
  if (document.body) start(); else addEventListener('DOMContentLoaded', start);
}
