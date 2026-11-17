// =====================================================================
//  DEMİR SANCAK — özel SVG simge seti (emoji yerine)
// =====================================================================
let uid = 0;
const G = (id, a, b, dir = 'v') => `<linearGradient id="${id}" x1="0" y1="0" x2="${dir === 'v' ? 0 : 1}" y2="${dir === 'v' ? 1 : 1}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const R = (id, a, b) => `<radialGradient id="${id}" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`;
const svg = (body, defs, s) => `<svg class="ico" width="${s}" height="${s}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs>${body}</svg>`;
const OUT = 'stroke="#2a1606" stroke-width="2.5" stroke-linejoin="round"';

const DEF = {
  food: (i) => [G(i + 'a', '#ffe58a', '#d89a1a'), `
    <g ${OUT}><path d="M32 58 L30 26 M32 58 L36 24 M32 58 L24 28 M32 58 L41 30" stroke="#a8742a" stroke-width="3" fill="none"/>
    ${[[30, 18, -8], [37, 16, 10], [23, 22, -22], [42, 22, 22]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="10" transform="rotate(${r} ${x} ${y})" fill="url(#${i}a)"/>`).join('')}
    <path d="M22 44 Q32 40 42 44 L40 48 Q32 45 24 48 Z" fill="#c8402a"/></g>`],
  wood: (i) => [G(i + 'a', '#c08048', '#7a4620') + R(i + 'b', '#f4d8a0', '#c89458'), `
    <g ${OUT}><rect x="8" y="30" width="44" height="14" rx="7" fill="url(#${i}a)"/><rect x="14" y="18" width="40" height="14" rx="7" fill="url(#${i}a)"/>
    <circle cx="52" cy="37" r="7" fill="url(#${i}b)"/><circle cx="52" cy="25" r="7" fill="url(#${i}b)" transform="translate(2 0)"/>
    <circle cx="52" cy="37" r="3" fill="none" stroke="#a0703a" stroke-width="1.5"/><path d="M8 37 L4 37" /></g>`],
  stone: (i) => [G(i + 'a', '#d8d8dc', '#7a7a88') + G(i + 'b', '#b8b8c0', '#5a5a68'), `
    <g ${OUT}><path d="M8 50 L14 30 L30 22 L44 28 L50 48 L38 56 L18 56 Z" fill="url(#${i}a)"/><path d="M34 54 L40 36 L52 32 L60 46 L54 56 Z" fill="url(#${i}b)"/>
    <path d="M16 34 L28 28" stroke="#fff" stroke-opacity=".7" stroke-width="2"/></g>`],
  gold: (i) => [R(i + 'a', '#fff3b0', '#e09a10') + G(i + 'b', '#ffe070', '#b87008'), `
    <g ${OUT}><circle cx="32" cy="34" r="24" fill="url(#${i}b)"/><circle cx="32" cy="34" r="18" fill="url(#${i}a)" stroke-width="2"/>
    <path d="M22 40 L24 28 L29 33 L32 25 L35 33 L40 28 L42 40 Z" fill="#c07a10" stroke="#7a4806" stroke-width="2"/><ellipse cx="25" cy="22" rx="6" ry="3" fill="#fff" opacity=".6" stroke="none"/></g>`],
  power: (i) => [G(i + 'a', '#f0f4ff', '#8a96b0') + G(i + 'b', '#ffd060', '#c07a10'), `
    <g ${OUT}><path d="M12 8 L40 40 L36 44 L8 12 Z" fill="url(#${i}a)"/><path d="M52 8 L24 40 L28 44 L56 12 Z" fill="url(#${i}a)"/>
    <rect x="30" y="40" width="16" height="6" rx="2" transform="rotate(45 38 43)" fill="url(#${i}b)"/><rect x="18" y="40" width="16" height="6" rx="2" transform="rotate(-45 26 43)" fill="url(#${i}b)"/>
    <circle cx="46" cy="52" r="4" fill="url(#${i}b)"/><circle cx="18" cy="52" r="4" fill="url(#${i}b)"/></g>`],
  troops: (i) => [G(i + 'a', '#7ab0ff', '#2a58c0') + G(i + 'b', '#ffe070', '#c88a10'), `
    <g ${OUT}><path d="M32 6 L54 14 L52 36 Q48 52 32 60 Q16 52 12 36 L10 14 Z" fill="url(#${i}a)"/><path d="M32 16 L36 28 L48 28 L38 36 L42 48 L32 41 L22 48 L26 36 L16 28 L28 28 Z" fill="url(#${i}b)" stroke-width="2"/></g>`],
  builder: (i) => [G(i + 'a', '#e8e8f0', '#7a7a8a') + G(i + 'b', '#c88850', '#7a4a20'), `
    <g ${OUT}><rect x="28" y="22" width="8" height="38" rx="3" transform="rotate(-35 32 40)" fill="url(#${i}b)"/><path d="M14 14 L40 6 L48 18 L22 26 Z" fill="url(#${i}a)"/></g>`],
  quest: (i) => [G(i + 'a', '#fff4d8', '#d8b878'), `
    <g ${OUT}><rect x="14" y="10" width="36" height="46" rx="4" fill="url(#${i}a)"/><rect x="10" y="6" width="44" height="9" rx="4.5" fill="#c89458"/><rect x="10" y="51" width="44" height="9" rx="4.5" fill="#c89458"/>
    <path d="M21 24 H43 M21 32 H43 M21 40 H35" stroke="#8a6a3a" stroke-width="3"/><circle cx="44" cy="44" r="7" fill="#d83a2a" stroke-width="2"/></g>`],
  events: (i) => [G(i + 'a', '#ff7a6a', '#c02a20') + G(i + 'b', '#ffffff', '#e8e0d0'), `
    <g ${OUT}><rect x="8" y="12" width="48" height="44" rx="6" fill="url(#${i}b)"/><path d="M8 18 Q8 12 14 12 H50 Q56 12 56 18 V26 H8 Z" fill="url(#${i}a)"/>
    <rect x="18" y="5" width="6" height="12" rx="3" fill="#7a7a8a"/><rect x="40" y="5" width="6" height="12" rx="3" fill="#7a7a8a"/>
    <path d="M32 31 L35 38 L42 38 L36 43 L38 50 L32 46 L26 50 L28 43 L22 38 L29 38 Z" fill="#ffc83a" stroke-width="2"/></g>`],
  offers: (i) => [G(i + 'a', '#ff6a8a', '#c0204a') + G(i + 'b', '#ffe070', '#d89010'), `
    <g ${OUT}><rect x="10" y="28" width="44" height="28" rx="3" fill="url(#${i}a)"/><rect x="6" y="20" width="52" height="10" rx="3" fill="url(#${i}a)"/>
    <rect x="28" y="20" width="8" height="36" fill="url(#${i}b)" stroke-width="2"/><path d="M32 20 Q20 4 14 12 Q12 20 32 20 Q44 4 50 12 Q52 20 32 20" fill="url(#${i}b)"/></g>`],
  rank: (i) => [G(i + 'a', '#fff0a0', '#d08a10'), `
    <g ${OUT}><path d="M18 8 H46 V22 Q46 38 32 40 Q18 38 18 22 Z" fill="url(#${i}a)"/><path d="M18 12 H8 Q8 26 20 28 M46 12 H56 Q56 26 44 28" fill="none" stroke-width="4" stroke="#c08010"/>
    <rect x="28" y="40" width="8" height="8" fill="url(#${i}a)"/><rect x="18" y="48" width="28" height="9" rx="2" fill="#7a4a20"/><path d="M28 16 L32 12 V32" stroke="#a06a10" stroke-width="3" fill="none"/></g>`],
  summon: (i) => [R(i + 'a', '#f0d8ff', '#7a2ad8') + G(i + 'b', '#ffd060', '#a86a10'), `
    <g ${OUT}><path d="M16 56 L20 46 H44 L48 56 Z" fill="url(#${i}b)"/><circle cx="32" cy="28" r="20" fill="url(#${i}a)"/>
    <path d="M24 20 Q30 14 38 18" stroke="#fff" stroke-width="3" fill="none" opacity=".8"/><circle cx="38" cy="32" r="3" fill="#fff" stroke="none" opacity=".7"/></g>`],
  heroes: (i) => [G(i + 'a', '#e8ecf4', '#7a8498') + G(i + 'b', '#ff5a4a', '#a81a10'), `
    <g ${OUT}><path d="M32 4 Q34 12 40 10 Q38 16 30 14 Z" fill="url(#${i}b)"/><path d="M12 34 Q12 12 32 12 Q52 12 52 34 V50 L42 56 V40 H22 V56 L12 50 Z" fill="url(#${i}a)"/>
    <rect x="22" y="30" width="20" height="4" fill="#1a1a20"/><path d="M32 34 V48" stroke-width="4"/></g>`],
  world: (i) => [G(i + 'a', '#f4e0b0', '#c8a060') + G(i + 'b', '#7ac0f0', '#3a80c0'), `
    <g ${OUT}><path d="M6 14 L22 8 L42 14 L58 8 V50 L42 56 L22 50 L6 56 Z" fill="url(#${i}a)"/><path d="M22 8 V50 M42 14 V56" stroke-width="2"/>
    <path d="M10 30 Q16 24 20 30 T30 34" stroke="#3a8a3a" stroke-width="3" fill="none"/><circle cx="48" cy="30" r="5" fill="#d83a2a" stroke-width="2"/><path d="M28 42 L36 40" stroke="#3a6ad0" stroke-width="3"/></g>`],
  shop: (i) => [G(i + 'a', '#c08048', '#6a3a14') + G(i + 'b', '#ffe070', '#c88a10'), `
    <g ${OUT}><path d="M8 28 H56 V54 Q56 58 52 58 H12 Q8 58 8 54 Z" fill="url(#${i}a)"/><path d="M8 28 Q8 10 32 10 Q56 10 56 28 Z" fill="url(#${i}a)"/>
    <rect x="6" y="26" width="52" height="6" fill="url(#${i}b)"/><rect x="26" y="30" width="12" height="12" rx="2" fill="url(#${i}b)"/><circle cx="32" cy="36" r="2" fill="#2a1606"/></g>`],
  reports: (i) => [G(i + 'a', '#fff8e8', '#d8c8a0'), `
    <g ${OUT}><rect x="6" y="14" width="52" height="38" rx="4" fill="url(#${i}a)"/><path d="M6 18 L32 36 L58 18" fill="none"/><circle cx="32" cy="36" r="7" fill="#c02a20" stroke-width="2"/></g>`],
  city: (i) => [G(i + 'a', '#e0d8c8', '#8a8070') + G(i + 'b', '#5a8aff', '#2a4aa0'), `
    <g ${OUT}><rect x="10" y="26" width="44" height="30" fill="url(#${i}a)"/><path d="M6 26 L14 12 L22 26 Z M42 26 L50 12 L58 26 Z M24 22 L32 4 L40 22 Z" fill="url(#${i}b)"/>
    <rect x="26" y="22" width="12" height="8" fill="url(#${i}a)"/><path d="M26 56 V44 Q32 36 38 44 V56 Z" fill="#5a3418"/><path d="M32 4 V-2" stroke="#d8302a" stroke-width="3"/></g>`],
  news: (i) => [G(i + 'a', '#ffd060', '#c07a10'), `
    <g ${OUT}><path d="M10 26 H22 L46 12 V52 L22 38 H10 Z" fill="url(#${i}a)"/><path d="M14 38 L18 52 H26 L22 38" fill="#c88a30"/><path d="M52 24 Q58 32 52 40" fill="none" stroke-width="3"/></g>`],
  plus: () => ['', `<circle cx="32" cy="32" r="26" fill="#3fb35c" stroke="#16521f" stroke-width="4"/><path d="M32 18 V46 M18 32 H46" stroke="#fff" stroke-width="8" stroke-linecap="round"/>`],
};
export function icon(name, size = 24) { const f = DEF[name]; if (!f) return ''; const id = 'i' + (++uid) + name; const [defs, body] = f(id); return svg(body, defs, size); }
