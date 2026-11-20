// =====================================================================
//  DEMİR SANCAK — prosedürel ses: orta çağ müziği, ortam, efektler
//  Lavta/arp tınısı Karplus-Strong algoritmasıyla üretilir.
// =====================================================================
const rand = (a, b) => a + Math.random() * (b - a);
let ctx = null, master, musicBus, sfxBus, ambBus, verb, noiseBuf;
let musicOn = localStorage.getItem('ds_music') !== '0', sfxOn = localStorage.getItem('ds_sound') !== '0';
let theme = 'city', nextNote = 0, step = 0, bar = 0, started = false, nextBird = 0;
const plucks = new Map();

export const audioState = () => ({ musicOn, sfxOn });
// ---- Dosya tabanlı sesler (Higgsfield ile üretildi) ----
const FILES = ['click', 'coin', 'build', 'built', 'train', 'horn', 'clash', 'win', 'lose', 'summon', 'reveal5', 'heal', 'open', 'arrow'];
const MUSIC = { city: 'music_city', battle: 'music_battle', summon: 'music_summon' };
const buf = {};
let fileMusic = null, musicSrc = null, musicGainNode = null, ambSrc = null;
async function loadBuf(name) { try { const r = await fetch('assets/audio/' + name + '.mp3?v=2611201420'); const a = await r.arrayBuffer(); buf[name] = await new Promise((res, rej) => ctx.decodeAudioData(a, res, rej)); } catch (e) { /* yok */ } }
async function loadFiles() {
  await Promise.all(FILES.map(loadBuf));
  await loadBuf(MUSIC.city); fileMusic = true; startMusicFile();
  await loadBuf('ambience'); startAmbience();
  await Promise.all([loadBuf(MUSIC.battle), loadBuf(MUSIC.summon)]);
}
function startAmbience() { if (!buf.ambience || ambSrc) return; ambSrc = ctx.createBufferSource(); ambSrc.buffer = buf.ambience; ambSrc.loop = true; const g = ctx.createGain(); g.gain.value = 0.35; ambSrc.connect(g).connect(ambBus); ambSrc.start(); }
function startMusicFile() {
  const b = buf[MUSIC[theme]] || buf[MUSIC.city]; if (!b) return;
  const t = ctx.currentTime;
  if (musicSrc) { const old = musicSrc, og = musicGainNode; og.gain.setTargetAtTime(0, t, 0.4); setTimeout(() => { try { old.stop(); } catch (e) {} }, 2000); }
  musicSrc = ctx.createBufferSource(); musicSrc.buffer = b; musicSrc.loop = true;
  musicGainNode = ctx.createGain(); musicGainNode.gain.setValueAtTime(0, t); musicGainNode.gain.setTargetAtTime(0.75, t, 0.6);
  musicSrc.connect(musicGainNode).connect(musicBus); musicSrc.start();
}
function playFile(name, vol = 1, rate = 1) { const b = buf[name]; if (!b) return false; const s2 = ctx.createBufferSource(); s2.buffer = b; s2.playbackRate.value = rate; const g = ctx.createGain(); g.gain.value = vol; s2.connect(g).connect(sfxBus); s2.start(); return true; }
export function setMusic(on) { musicOn = on; localStorage.setItem('ds_music', on ? '1' : '0'); if (musicBus) musicBus.gain.setTargetAtTime(on ? 0.55 : 0, ctx.currentTime, 0.3); }
export function setSfx(on) { sfxOn = on; localStorage.setItem('ds_sound', on ? '1' : '0'); if (sfxBus) { sfxBus.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.05); ambBus.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, 0.3); } }
export function setTheme(t) { if (theme !== t) { theme = t; step = 0; if (fileMusic && ctx) startMusicFile(); } }

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
  ctx = new C();
  master = ctx.createGain(); master.gain.value = 1;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
  master.connect(comp).connect(ctx.destination);
  // basit yankı (konvolüsyon)
  verb = ctx.createConvolver();
  const len = ctx.sampleRate * 2.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
  verb.buffer = ir;
  const verbGain = ctx.createGain(); verbGain.gain.value = 0.28; verb.connect(verbGain).connect(master);
  musicBus = ctx.createGain(); musicBus.gain.value = musicOn ? 0.55 : 0; musicBus.connect(master); musicBus.connect(verb);
  sfxBus = ctx.createGain(); sfxBus.gain.value = sfxOn ? 0.9 : 0; sfxBus.connect(master);
  ambBus = ctx.createGain(); ambBus.gain.value = sfxOn ? 0.5 : 0; ambBus.connect(master); ambBus.connect(verb);
  const nl = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, nl, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nl; i++) nd[i] = Math.random() * 2 - 1;
  // rüzgâr ortamı
  const wn = ctx.createBufferSource(); wn.buffer = noiseBuf; wn.loop = true;
  const wf = ctx.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 500; wf.Q.value = 0.6;
  const wg = ctx.createGain(); wg.gain.value = 0.05;
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.08; lg.gain.value = 260; lfo.connect(lg).connect(wf.frequency); lfo.start();
  const lfo2 = ctx.createOscillator(), lg2 = ctx.createGain(); lfo2.frequency.value = 0.11; lg2.gain.value = 0.03; lfo2.connect(lg2).connect(wg.gain); lfo2.start();
  wn.connect(wf).connect(wg).connect(ambBus); wn.start();
  started = true;
  nextNote = ctx.currentTime + 0.3;
  loadFiles();
}
document.addEventListener('pointerdown', () => initAudio(), { capture: true });

// Karplus-Strong telli çalgı örneği
function pluckBuffer(freq, bright = 0.5, dur = 1.8) {
  const key = freq.toFixed(1) + '_' + bright;
  if (plucks.has(key)) return plucks.get(key);
  const sr = ctx.sampleRate, n = Math.floor(sr * dur), N = Math.max(2, Math.round(sr / freq));
  const buf = ctx.createBuffer(1, n, sr), d = buf.getChannelData(0), ring = new Float32Array(N);
  for (let i = 0; i < N; i++) ring[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(i / N * Math.PI));
  let idx = 0, prev = 0;
  const decay = 0.996 - (1 - bright) * 0.004;
  for (let i = 0; i < n; i++) {
    const cur = ring[idx]; const nx = ring[(idx + 1) % N];
    const v = (cur * bright + nx * (1 - bright) * 0.5 + prev * (1 - bright) * 0.5) * decay;
    ring[idx] = v; prev = cur; d[i] = cur; idx = (idx + 1) % N;
  }
  plucks.set(key, buf);
  return buf;
}
const NOTE = (m) => 440 * Math.pow(2, (m - 69) / 12);
function pluck(midi, t, vol = 0.3, bright = 0.5, pan = 0) {
  const src = ctx.createBufferSource(); src.buffer = pluckBuffer(NOTE(midi), bright);
  const g = ctx.createGain(); g.gain.value = vol;
  const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (p) { p.pan.value = pan; src.connect(g).connect(p).connect(musicBus); } else src.connect(g).connect(musicBus);
  src.start(t); src.stop(t + 1.9);
}
function flute(midi, t, dur, vol = 0.07) {
  const o = ctx.createOscillator(), g = ctx.createGain(), v = ctx.createOscillator(), vg = ctx.createGain();
  o.type = 'sine'; o.frequency.value = NOTE(midi);
  v.frequency.value = 5.2; vg.gain.value = NOTE(midi) * 0.006; v.connect(vg).connect(o.frequency);
  const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = NOTE(midi) * 2; const g2 = ctx.createGain(); g2.gain.value = 0.15;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.08); g.gain.setValueAtTime(vol, t + dur - 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.2);
  o.connect(g); o2.connect(g2).connect(g); g.connect(musicBus);
  o.start(t); v.start(t); o2.start(t); o.stop(t + dur + 0.3); v.stop(t + dur + 0.3); o2.stop(t + dur + 0.3);
}
function drone(midi, t, dur, vol = 0.05) {
  for (const det of [-4, 4]) {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = NOTE(midi); o.detune.value = det;
    f.type = 'lowpass'; f.frequency.value = 500;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.6); g.gain.setValueAtTime(vol, t + dur - 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.4);
    o.connect(f).connect(g).connect(musicBus); o.start(t); o.stop(t + dur + 0.5);
  }
}
function drum(t, vol = 0.25, low = true) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(low ? 110 : 190, t); o.frequency.exponentialRampToValueAtTime(low ? 50 : 110, t + 0.18);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  o.connect(g).connect(musicBus); o.start(t); o.stop(t + 0.35);
  noise(t, 0.06, 'bandpass', 1800, vol * 0.25, musicBus);
}
function noise(t, dur, type, freq, vol, bus = sfxBus, q = 1, f1 = null) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q; if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(bus); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
}
function tone(t, f0, f1, dur, vol, type = 'sine', bus = sfxBus) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type;
  o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.05);
}

// --- Müzik: D Dorian, 8 ölçülük döngü ---
const CHORDS = [[50, 57, 62, 65, 69], [48, 55, 60, 64, 67], [46, 53, 58, 62, 65], [48, 55, 60, 64, 67], [50, 57, 62, 65, 69], [53, 60, 65, 69, 72], [55, 62, 67, 71, 74], [57, 64, 69, 73, 76]];
const MELODY = [[74, 2], [76, 1], [77, 1], [76, 2], [74, 2], [72, 2], [74, 1], [72, 1], [69, 4], [null, 2], [69, 1], [72, 1], [74, 2], [77, 2], [76, 3], [74, 1], [72, 2], [71, 2], [69, 4]];
let melIdx = 0, melWait = 0;
function scheduleMusic() {
  const bpm = theme === 'battle' ? 128 : theme === 'summon' ? 70 : 88;
  const s16 = 60 / bpm / 2; // 8'lik nota
  while (nextNote < ctx.currentTime + 0.25) {
    const t = nextNote, b = step % 8, chord = CHORDS[bar % 8];
    if (theme === 'city') {
      // lavta arpeji
      const pat = [0, 2, 3, 4, 3, 2, 1, 2];
      pluck(chord[pat[b]] + 12, t, b === 0 ? 0.28 : 0.18, 0.55, (b % 2 ? 0.3 : -0.3));
      if (b === 0) { pluck(chord[0], t, 0.32, 0.35, 0); if (bar % 2 === 0) drone(chord[0] - 12, t, s16 * 16, 0.035); }
      if (b === 0 || b === 5) drum(t, 0.07, true);
      // flüt ezgisi (her 2 döngüde bir girer)
      if (bar >= 8 && bar % 16 >= 8) {
        if (melWait <= 0) { const [m, d] = MELODY[melIdx % MELODY.length]; if (m) flute(m, t, d * s16 * 0.95); melWait = d; melIdx++; }
        melWait--;
      }
    } else if (theme === 'battle') {
      if (b % 2 === 0) drum(t, 0.3, true);
      if (b === 3 || b === 7) drum(t, 0.2, false);
      if (b === 0) { pluck(chord[0], t, 0.35, 0.3); drone(chord[0] - 12, t, s16 * 8, 0.05); }
      pluck(chord[(b * 2) % 5] + 12, t, 0.12, 0.7);
    } else if (theme === 'summon') {
      if (b === 0) { drone(chord[0], t, s16 * 8, 0.03); drone(chord[2], t, s16 * 8, 0.02); }
      if (b % 2 === 0) pluck(chord[(b / 2 + bar) % 5] + 24, t, 0.12, 0.8, Math.sin(step) * 0.6);
    }
    nextNote += s16; step++;
    if (step % 8 === 0) bar++;
  }
}
function ambience() {
  if (theme !== 'city') return;
  const now = ctx.currentTime;
  if (now > nextBird) {
    nextBird = now + rand(1.5, 5);
    const base = rand(2200, 4200), n = Math.floor(rand(2, 6));
    for (let i = 0; i < n; i++) { const t = now + i * rand(0.08, 0.14); tone(t, base * rand(0.9, 1.1), base * rand(1.1, 1.4), 0.07, 0.025, 'sine', ambBus); }
  }
}
export function updateAudio() { if (!started || ctx.state !== 'running') return; if (!fileMusic) scheduleMusic(); if (!ambSrc) ambience(); }

// --- Efektler ---
export function sfx(kind) {
  if (!ctx || !sfxOn) return;
  if (navigator.vibrate && (kind === 'click')) navigator.vibrate(6);
  const FILEMAP = { click: ['click', 0.5], open: ['open', 0.6], close: ['click', 0.35], coin: ['coin', 0.7], collect: ['coin', 0.8], build: ['build', 0.8], built: ['built', 0.8], train: ['train', 0.7], heal: ['heal', 0.8], clash: ['clash', 0.5], arrow: ['arrow', 0.5], horn: ['horn', 0.8], warn: ['horn', 0.7], win: ['win', 0.9], lose: ['lose', 0.9], summon: ['summon', 0.9], reveal: ['heal', 0.8], reveal5: ['reveal5', 1] };
  const fm = FILEMAP[kind];
  if (fm && playFile(fm[0], fm[1], kind === 'clash' ? 0.85 + Math.random() * 0.3 : 1)) return;
  const t = ctx.currentTime;
  switch (kind) {
    case 'click': tone(t, 900, 600, 0.05, 0.08, 'triangle'); noise(t, 0.03, 'highpass', 3000, 0.04); break;
    case 'open': tone(t, 500, 800, 0.1, 0.06, 'triangle'); noise(t, 0.12, 'bandpass', 1200, 0.05, sfxBus, 1, 3000); break;
    case 'close': tone(t, 700, 400, 0.08, 0.05, 'triangle'); break;
    case 'coin': for (let i = 0; i < 3; i++) { tone(t + i * 0.05, 1500 + i * 300, 1500 + i * 300, 0.12, 0.07, 'triangle'); } break;
    case 'collect': for (let i = 0; i < 4; i++) noise(t + i * 0.04, 0.06, 'bandpass', 2500 + i * 400, 0.06, sfxBus, 3); tone(t, 700, 1200, 0.15, 0.06); break;
    case 'build': for (let i = 0; i < 3; i++) { const tt = t + i * 0.18; noise(tt, 0.08, 'bandpass', 900, 0.25, sfxBus, 2); tone(tt, 220, 120, 0.08, 0.15, 'square'); } break;
    case 'built': [0, 4, 7, 12, 16].forEach((s, i) => { const tt = t + i * 0.09; pluckSfx(62 + s, tt); }); tone(t + 0.45, 587, 587, 0.5, 0.08, 'triangle'); break;
    case 'train': for (let i = 0; i < 2; i++) { const tt = t + i * 0.15; noise(tt, 0.15, 'highpass', 4000, 0.15); tone(tt, 1800, 900, 0.12, 0.05, 'square'); } break;
    case 'heal': [0, 5, 9, 12].forEach((s, i) => tone(t + i * 0.08, 523 * Math.pow(2, s / 12), 523 * Math.pow(2, s / 12), 0.3, 0.06)); break;
    case 'clash': noise(t, 0.12, 'highpass', 3500, 0.18); tone(t, rand(1600, 2400), 800, 0.1, 0.05, 'square'); break;
    case 'arrow': noise(t, 0.2, 'bandpass', 2500, 0.05, sfxBus, 4, 900); break;
    case 'horn': tone(t, 196, 196, 0.9, 0.12, 'sawtooth'); tone(t + 0.05, 294, 294, 0.85, 0.07, 'sawtooth'); tone(t, 98, 98, 0.9, 0.06, 'sine'); break;
    case 'win': [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => pluckSfx(60 + s, t + i * 0.12, 0.4)); tone(t + 0.4, 392, 392, 0.8, 0.08, 'sawtooth'); break;
    case 'lose': [0, -3, -7, -12].forEach((s, i) => pluckSfx(57 + s, t + i * 0.2, 0.35)); break;
    case 'summon': for (let i = 0; i < 10; i++) tone(t + i * 0.12, 300 + i * 90, 600 + i * 160, 0.4, 0.04); noise(t, 2.0, 'bandpass', 400, 0.08, sfxBus, 1, 4000); break;
    case 'reveal': [0, 7, 12].forEach((s, i) => pluckSfx(64 + s, t + i * 0.07)); break;
    case 'reveal5': [0, 4, 7, 11, 14, 19, 24].forEach((s, i) => pluckSfx(60 + s, t + i * 0.08, 0.45)); for (const s of [0, 4, 7]) tone(t + 0.5, 523 * Math.pow(2, s / 12), 523 * Math.pow(2, s / 12), 1.5, 0.05, 'triangle'); break;
    case 'error': tone(t, 220, 180, 0.15, 0.08, 'square'); break;
    case 'warn': for (let i = 0; i < 3; i++) tone(t + i * 0.25, 440, 440, 0.18, 0.08, 'square'); break;
    default: break;
  }
}
function pluckSfx(midi, t, vol = 0.3) {
  const src = ctx.createBufferSource(); src.buffer = pluckBuffer(NOTE(midi), 0.6);
  const g = ctx.createGain(); g.gain.value = vol; src.connect(g).connect(sfxBus); src.start(t); src.stop(t + 1.9);
}

// ---- Kahraman sesleri (assets/voices/<id>.mp3?v=2611201420) ----
let voiceSrc = null;
const voicePending = new Map();
export async function playVoice(id) {
  if (!ctx) initAudio(); if (!ctx || !sfxOn) return;
  const key = 'v_' + id;
  if (!buf[key]) {
    if (!voicePending.has(key)) voicePending.set(key, (async () => { try { const r = await fetch('assets/voices/' + id + '.mp3?v=2611201420'); if (!r.ok) return; const a = await r.arrayBuffer(); buf[key] = await new Promise((res, rej) => ctx.decodeAudioData(a, res, rej)); } catch (e) { /* yok */ } })());
    await voicePending.get(key);
    if (!buf[key]) return;
  }
  try { voiceSrc?.stop(); } catch (e) {}
  const s = ctx.createBufferSource(); s.buffer = buf[key];
  const g = ctx.createGain(); g.gain.value = 1.25; s.connect(g).connect(sfxBus); s.start(); voiceSrc = s;
  if (musicBus && musicOn) { const t = ctx.currentTime; musicBus.gain.setTargetAtTime(0.18, t, 0.08); musicBus.gain.setTargetAtTime(0.55, t + buf[key].duration, 0.4); }
}
