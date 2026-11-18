// =====================================================================
//  DEMİR SANCAK — çevrimiçi katman (Firebase: giriş, bulut kayıt,
//  dünya sıralaması, gerçek oyunculara saldırı ve gelen saldırılar)
//  Firebase yüklenemezse oyun çevrimdışı çalışmaya devam eder.
// =====================================================================
const FB_VER = '10.14.1';
const CDN = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
export const firebaseConfig = {
  apiKey: 'AIzaSyAYafhPqTzgrXvTKQNUBJPnJkbM8u6HfUk',
  authDomain: 'demir-sancak.firebaseapp.com',
  projectId: 'demir-sancak',
  storageBucket: 'demir-sancak.firebasestorage.app',
  messagingSenderId: '794832743490',
  appId: '1:794832743490:web:94e448a2341fcedd4211db',
};

let FA = null, FS = null, auth = null, db = null, user = null;
let ready = false, failed = false, lastErr = '';
const listeners = new Set();
export const online = {
  get ready() { return ready; }, get failed() { return failed; }, get user() { return user; }, get error() { return lastErr; },
  get uid() { return user?.uid || null; }, get isGoogle() { return !!user && !user.isAnonymous; },
  get name() { return user?.displayName || ''; },
};
export function onOnline(cb) { listeners.add(cb); return () => listeners.delete(cb); }
const emit = (ev, d) => listeners.forEach((cb) => { try { cb(ev, d); } catch (e) { console.warn(e); } });

let initP = null;
export function initOnline() {
  if (initP) return initP;
  initP = (async () => {
    try {
      const [appM, authM, fsM] = await Promise.all([import(CDN + 'firebase-app.js'), import(CDN + 'firebase-auth.js'), import(CDN + 'firebase-firestore.js')]);
      FA = authM; FS = fsM;
      const app = appM.initializeApp(firebaseConfig);
      auth = authM.getAuth(app);
      db = fsM.getFirestore(app);
      await new Promise((res) => {
        let first = true;
        authM.onAuthStateChanged(auth, async (u) => {
          user = u;
          if (!u) { try { await authM.signInAnonymously(auth); } catch (e) { lastErr = e.code || e.message; failed = true; emit('error', lastErr); res(); } return; }
          ready = true; emit('auth', u);
          if (first) { first = false; res(); }
        });
      });
      // Google yönlendirmesinden dönüş
      try { const r = await authM.getRedirectResult(auth); if (r?.user) emit('google', r.user); } catch (e) { handleLinkError(e); }
    } catch (e) { failed = true; lastErr = e.code || e.message || String(e); console.warn('Firebase yüklenemedi', e); emit('error', lastErr); }
    return ready;
  })();
  return initP;
}

// ---- Google hesabı: misafir ilerlemesini Google hesabına bağla / Google ile giriş ----
let pendingCred = null;
function handleLinkError(e) {
  if (e?.code === 'auth/credential-already-in-use' || e?.code === 'auth/email-already-in-use') { pendingCred = FA.GoogleAuthProvider.credentialFromError(e); emit('google-exists'); return; }
  lastErr = e?.code || e?.message; emit('error', lastErr);
}
export async function connectGoogle() {
  if (!ready) return false;
  const p = new FA.GoogleAuthProvider();
  try {
    if (user.isAnonymous) { const r = await FA.linkWithPopup(user, p); user = r.user; }
    else { const r = await FA.signInWithPopup(auth, p); user = r.user; }
    emit('google', user); return true;
  } catch (e) {
    if (e?.code === 'auth/popup-blocked' || e?.code === 'auth/operation-not-supported-in-this-environment') { try { await (user.isAnonymous ? FA.linkWithRedirect(user, p) : FA.signInWithRedirect(auth, p)); } catch (e2) { handleLinkError(e2); } return false; }
    handleLinkError(e); return false;
  }
}
// Bu Google hesabı başka bir kayıtta kullanılıyorsa: o hesaba geç (bu cihazdaki misafir kaydı bırakılır)
export async function switchToExistingGoogle() {
  if (!pendingCred) return false;
  try { const r = await FA.signInWithCredential(auth, pendingCred); user = r.user; pendingCred = null; emit('google', user); return true; } catch (e) { handleLinkError(e); return false; }
}
export async function signOutOnline() { if (!auth) return; await FA.signOut(auth); }

// ---- Bulut kayıt (saves/{uid}: yalnızca sahibi okur/yazar) ----
export async function loadCloud() {
  if (!ready) return null;
  try { const s = await FS.getDoc(FS.doc(db, 'saves', user.uid)); return s.exists() ? s.data() : null; } catch (e) { lastErr = e.code || e.message; return null; }
}
let saving = false;
export async function saveCloud(state, profile) {
  if (!ready || saving) return false;
  saving = true;
  try {
    const t = Date.now();
    await FS.setDoc(FS.doc(db, 'saves', user.uid), { data: JSON.stringify(state), updated: t, v: 1 });
    if (profile) await FS.setDoc(FS.doc(db, 'players', user.uid), { ...profile, updated: t }, { merge: true });
    emit('saved', t); return true;
  } catch (e) { lastErr = e.code || e.message; emit('error', lastErr); return false; } finally { saving = false; }
}

// ---- Dünya: herkese açık oyuncu profilleri (players/{uid}) ----
export async function topPlayers(n = 50) {
  if (!ready) return [];
  try { const q = FS.query(FS.collection(db, 'players'), FS.orderBy('power', 'desc'), FS.limit(n)); const s = await FS.getDocs(q); return s.docs.map((d) => ({ uid: d.id, ...d.data() })).filter((p) => !ghost(p)); } catch (e) { lastErr = e.code || e.message; return []; }
}
// Hiç ilerlememiş hesaplar (varsayılan isim, Belediye Sv.1, zafer yok) listelerde gösterilmez:
// yeni oyunculara başlangıç koruması olur ve terk edilmiş misafir/test hesapları haritayı kirletmez.
const ghost = (p) => (p.name || 'Krallığım') === 'Krallığım' && (p.th || 1) <= 1 && !p.wins;
// Güce yakın rakipler (son 14 günde aktif olanlar)
export async function rivals(power, n = 6) {
  if (!ready) return [];
  try {
    const lo = Math.round(power * 0.35), hi = Math.round(power * 2.2);
    const q = FS.query(FS.collection(db, 'players'), FS.where('power', '>=', lo), FS.where('power', '<=', hi), FS.orderBy('power', 'desc'), FS.limit(30));
    const s = await FS.getDocs(q), since = Date.now() - 14 * 86400000;
    return s.docs.map((d) => ({ uid: d.id, ...d.data() })).filter((p) => p.uid !== user.uid && !ghost(p) && (p.updated || 0) > since && !(p.shieldUntil > Date.now())).sort(() => Math.random() - 0.5).slice(0, n);
  } catch (e) { lastErr = e.code || e.message; return []; }
}
// Saldırı sonucu savunana iletilir (players/{uid}/inbox) — savunan oyunu açınca işlenir
export async function sendAttack(targetUid, report) {
  if (!ready) return false;
  try { await FS.addDoc(FS.collection(db, 'players', targetUid, 'inbox'), { ...report, from: user.uid, t: Date.now() }); return true; } catch (e) { lastErr = e.code || e.message; return false; }
}
export async function fetchInbox() {
  if (!ready) return [];
  try { const s = await FS.getDocs(FS.query(FS.collection(db, 'players', user.uid, 'inbox'), FS.orderBy('t', 'asc'), FS.limit(30))); return s.docs.map((d) => ({ id: d.id, ...d.data() })); } catch (e) { lastErr = e.code || e.message; return []; }
}
export async function clearInbox(ids) {
  if (!ready) return;
  await Promise.all(ids.map((id) => FS.deleteDoc(FS.doc(db, 'players', user.uid, 'inbox', id)).catch(() => {})));
}
// Bir sunucudaki bütün oyuncular (son 30 günde aktif). Eşitlik sorgusu → ek dizin gerekmez.
export async function serverPlayers(server, n = 200) {
  if (!ready) return [];
  try {
    const q = FS.query(FS.collection(db, 'players'), FS.where('server', '==', server), FS.limit(n));
    const s = await FS.getDocs(q), since = Date.now() - 30 * 86400000;
    return s.docs.map((d) => ({ uid: d.id, ...d.data() })).filter((p) => p.uid !== user.uid && !ghost(p) && (p.updated || 0) > since);
  } catch (e) { lastErr = e.code || e.message; return []; }
}
// Yeni oyuncu için sunucu seç: en yeni sunucu 500 oyuncuya ulaştıysa bir sonrakini aç
export const SERVER_CAP = 500;
export async function assignServer() {
  if (!ready) return 1;
  try {
    const qTop = FS.query(FS.collection(db, 'players'), FS.where('server', '<', 300), FS.orderBy('server', 'desc'), FS.limit(1));
    const top = await FS.getDocs(qTop);
    let n = top.empty ? 1 : Math.max(1, top.docs[0].data().server || 1);
    const cnt = await FS.getCountFromServer(FS.query(FS.collection(db, 'players'), FS.where('server', '==', n)));
    if (cnt.data().count >= SERVER_CAP) n += 1;
    return n;
  } catch (e) { lastErr = e.code || e.message; return 1; }
}

// ---- İttifaklar ----
// alliances/{id}: { name, tag, emblem, color, desc, open, server, leader, created, members: { uid: { name, power, th, hero, frame, role, joined } } }
// alliances/{id}/chat/{mid}: { uid, name, text, t, hero, frame }
export const ALLIANCE_MAX = 50;
const aRef = (id) => FS.doc(db, 'alliances', id);
const errOf = (e) => (e?.code === 'permission-denied' ? 'Sunucu izni yok (Firestore kuralları güncellenmeli)' : e?.code || e?.message || 'Hata');
export async function listAlliances(server, n = 60) {
  if (!ready) return [];
  try { const s = await FS.getDocs(FS.query(FS.collection(db, 'alliances'), FS.where('server', '==', server), FS.limit(n))); return s.docs.map((d) => ({ id: d.id, ...d.data() })); } catch (e) { lastErr = errOf(e); return []; }
}
export async function getAlliance(id) {
  if (!ready || !id) return null;
  try { const s = await FS.getDoc(aRef(id)); return s.exists() ? { id: s.id, ...s.data() } : null; } catch (e) { lastErr = errOf(e); return null; }
}
export async function createAlliance(data, me) {
  if (!ready) return { ok: false, why: 'Çevrimdışısın' };
  try {
    const dup = await FS.getDocs(FS.query(FS.collection(db, 'alliances'), FS.where('tag', '==', data.tag), FS.limit(1)));
    if (!dup.empty) return { ok: false, why: `[${data.tag}] etiketi kullanılıyor` };
    const ref = FS.doc(FS.collection(db, 'alliances'));
    await FS.setDoc(ref, { ...data, leader: user.uid, created: Date.now(), members: { [user.uid]: { ...me, role: 'leader', joined: Date.now() } } });
    return { ok: true, id: ref.id };
  } catch (e) { return { ok: false, why: errOf(e) }; }
}
export async function joinAlliance(id, me) {
  if (!ready) return { ok: false, why: 'Çevrimdışısın' };
  try {
    const a = await getAlliance(id); if (!a) return { ok: false, why: 'İttifak bulunamadı' };
    if (!a.open) return { ok: false, why: 'Bu ittifak kapalı' };
    if (Object.keys(a.members || {}).length >= ALLIANCE_MAX) return { ok: false, why: 'İttifak dolu' };
    await FS.updateDoc(aRef(id), { [`members.${user.uid}`]: { ...me, role: 'member', rank: 1, joined: Date.now() } });
    return { ok: true };
  } catch (e) { return { ok: false, why: errOf(e) }; }
}
// kendi üye bilgimi güncelle (güç, seviye, çerçeve)
export async function updateMember(id, me, role, joined, rank) {
  if (!ready || !id) return;
  try { await FS.updateDoc(aRef(id), { [`members.${user.uid}`]: { ...me, role, joined, rank: rank || 1 } }); } catch (e) { lastErr = errOf(e); }
}
export async function leaveAlliance(a) {
  if (!ready) return { ok: false, why: 'Çevrimdışısın' };
  try {
    const others = Object.entries(a.members || {}).filter(([u]) => u !== user.uid);
    if (a.leader === user.uid) {
      if (!others.length) { await FS.deleteDoc(aRef(a.id)); return { ok: true, deleted: true }; }
      // liderlik en yüksek rütbeliye (eşitse en güçlüye) geçer
      const [nu, nm] = others.sort((x, y) => (y[1].rank || 1) - (x[1].rank || 1) || (y[1].power || 0) - (x[1].power || 0))[0];
      await FS.updateDoc(aRef(a.id), { leader: nu, [`members.${nu}`]: { ...nm, role: 'leader', rank: 5 }, [`members.${user.uid}`]: FS.deleteField() });
    } else await FS.updateDoc(aRef(a.id), { [`members.${user.uid}`]: FS.deleteField() });
    return { ok: true };
  } catch (e) { return { ok: false, why: errOf(e) }; }
}
// Rütbe işlemleri: lastOp hedefi Firestore kurallarının yetki kontrolü için yazılır
export async function kickMember(id, uid) {
  try { await FS.updateDoc(aRef(id), { [`members.${uid}`]: FS.deleteField(), lastOp: { by: user.uid, target: uid, t: Date.now() } }); return { ok: true }; } catch (e) { return { ok: false, why: errOf(e) }; }
}
export async function setRank(id, uid, rank) {
  try { await FS.updateDoc(aRef(id), { [`members.${uid}.rank`]: rank, lastOp: { by: user.uid, target: uid, t: Date.now() } }); return { ok: true }; } catch (e) { return { ok: false, why: errOf(e) }; }
}
export async function editAlliance(id, fields) {
  try { await FS.updateDoc(aRef(id), fields); return { ok: true }; } catch (e) { return { ok: false, why: errOf(e) }; }
}
export async function sendChat(id, text, me) {
  if (!ready) return { ok: false, why: 'Çevrimdışısın' };
  try { await FS.addDoc(FS.collection(db, 'alliances', id, 'chat'), { uid: user.uid, name: me.name, hero: me.hero || null, frame: me.frame || null, text: String(text).slice(0, 300), t: Date.now() }); return { ok: true }; } catch (e) { return { ok: false, why: errOf(e) }; }
}
// sohbeti canlı dinle (son 50 mesaj); dönen fonksiyon dinlemeyi kapatır
export function watchChat(id, cb) {
  if (!ready || !id) return () => {};
  try { return FS.onSnapshot(FS.query(FS.collection(db, 'alliances', id, 'chat'), FS.orderBy('t', 'desc'), FS.limit(50)), (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() })).reverse()), (e) => { lastErr = errOf(e); cb(null, lastErr); }); } catch (e) { return () => {}; }
}

// ---- Ralliler (alliances/{aid}/rallies/{rid}) ----
// { leader, leaderName, giant{id,level,power,mapX,mapY}, lx, ly, created, endsAt(ms), status: open|done|cancelled, members{uid:{name,power,hero,frame}} }
export async function createRally(aid, data) {
  if (!ready) return { ok: false, why: 'Çevrimdışısın' };
  try { const ref = FS.doc(FS.collection(db, 'alliances', aid, 'rallies')); await FS.setDoc(ref, { ...data, leader: user.uid, status: 'open' }); return { ok: true, id: ref.id }; } catch (e) { return { ok: false, why: errOf(e) }; }
}
export async function joinRally(aid, rid, member) {
  if (!ready) return { ok: false, why: 'Çevrimdışısın' };
  try {
    const s = await FS.getDoc(FS.doc(db, 'alliances', aid, 'rallies', rid)); if (!s.exists()) return { ok: false, why: 'Ralli bulunamadı' };
    const r = s.data();
    if (r.status !== 'open' || Date.now() >= r.endsAt) return { ok: false, why: 'Ralli süresi doldu' };
    if (r.members?.[user.uid]) return { ok: false, why: 'Bu ralliye zaten katıldın' };
    if (Object.keys(r.members || {}).length >= 5) return { ok: false, why: 'Ralli dolu (5/5)' };
    await FS.updateDoc(FS.doc(db, 'alliances', aid, 'rallies', rid), { [`members.${user.uid}`]: member });
    return { ok: true, rally: { id: rid, ...r } };
  } catch (e) { return { ok: false, why: errOf(e) }; }
}
export async function getRally(aid, rid) {
  if (!ready) return null;
  try { const s = await FS.getDoc(FS.doc(db, 'alliances', aid, 'rallies', rid)); return s.exists() ? { id: s.id, ...s.data() } : null; } catch (e) { lastErr = errOf(e); return null; }
}
export async function setRallyStatus(aid, rid, status) { try { await FS.updateDoc(FS.doc(db, 'alliances', aid, 'rallies', rid), { status }); } catch (e) { lastErr = errOf(e); } }
export function watchRallies(aid, cb) {
  if (!ready || !aid) return () => {};
  try { return FS.onSnapshot(FS.query(FS.collection(db, 'alliances', aid, 'rallies'), FS.where('status', '==', 'open'), FS.limit(20)), (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))), (e) => { lastErr = errOf(e); cb(null, lastErr); }); } catch (e) { return () => {}; }
}

// ---- İttifak yardımı (alliances/{aid}/helps/{hid}) ----
// { uid, name, hero, frame, plot, bname, level (hedef seviye), per (yardım başına saniye), max (20), ends (ms), created, helpers{uid: ms} }
export async function requestHelp(aid, hid, data) {
  if (!ready) return { ok: false, why: 'Çevrimdışısın' };
  try { await FS.setDoc(FS.doc(db, 'alliances', aid, 'helps', hid), { ...data, uid: user.uid, helpers: {}, created: Date.now() }); return { ok: true }; } catch (e) { return { ok: false, why: errOf(e) }; }
}
export async function giveHelp(aid, hid) {
  if (!ready) return { ok: false, why: 'Çevrimdışısın' };
  try { await FS.updateDoc(FS.doc(db, 'alliances', aid, 'helps', hid), { [`helpers.${user.uid}`]: Date.now() }); return { ok: true }; } catch (e) { return { ok: false, why: errOf(e) }; }
}
export async function deleteHelp(aid, hid) { try { await FS.deleteDoc(FS.doc(db, 'alliances', aid, 'helps', hid)); } catch (e) { lastErr = errOf(e); } }
export function watchHelps(aid, cb) {
  if (!ready || !aid) return () => {};
  try { return FS.onSnapshot(FS.query(FS.collection(db, 'alliances', aid, 'helps'), FS.limit(100)), (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))), (e) => { lastErr = errOf(e); cb(null, lastErr); }); } catch (e) { return () => {}; }
}

// ---- Mısır piramitleri (servers/{s}/pyramids/{pid}) ----
// { owner: { aid, tag, name, color } | null, ownedAt (ms), hp, dmg: { aid: hasar }, names: { aid: { tag, name, color } }, lastHit (ms) }
export function watchPyramids(server, cb) {
  if (!ready) return () => {};
  try { return FS.onSnapshot(FS.collection(db, 'servers', String(server), 'pyramids'), (s) => { const o = {}; s.docs.forEach((d) => { o[d.id] = d.data(); }); cb(o); }, (e) => { lastErr = errOf(e); cb(null, lastErr); }); } catch (e) { return () => {}; }
}
// Hasarı işle (transaction): piramidin canı biterse en çok hasar veren ittifak sahibi olur, can yeniden dolar
export async function hitPyramid(server, pid, maxHp, ally, dmg, resetMs) {
  if (!ready) return { ok: false, why: 'Çevrimdışısın' };
  try {
    const ref = FS.doc(db, 'servers', String(server), 'pyramids', pid);
    return await FS.runTransaction(db, async (tx) => {
      const snap = await tx.get(ref), now = Date.now();
      let d = snap.exists() ? snap.data() : { owner: null, ownedAt: 0, hp: maxHp, dmg: {}, names: {}, lastHit: 0 };
      if (d.owner?.aid === ally.aid) return { ok: false, why: 'Bu piramit zaten ittifakının' };
      if (!d.lastHit || now - d.lastHit > resetMs) { d.hp = maxHp; d.dmg = {}; } // uzun süre vurulmadıysa savaş sıfırlanır
      d.dmg = { ...(d.dmg || {}) }; d.names = { ...(d.names || {}) };
      d.dmg[ally.aid] = (d.dmg[ally.aid] || 0) + dmg; d.names[ally.aid] = { tag: ally.tag, name: ally.name, color: ally.color ?? 1 };
      d.hp = (d.hp ?? maxHp) - dmg; d.lastHit = now;
      let captured = null;
      if (d.hp <= 0) {
        const [win] = Object.entries(d.dmg).sort((a, b) => b[1] - a[1])[0];
        captured = { aid: win, ...d.names[win] }; d.owner = captured; d.ownedAt = now; d.hp = maxHp; d.dmg = {}; d.lastHit = 0;
      }
      tx.set(ref, { owner: d.owner || null, ownedAt: d.ownedAt || 0, hp: d.hp, dmg: d.dmg, names: d.names, lastHit: d.lastHit });
      return { ok: true, hp: d.hp, captured, mine: d.dmg[ally.aid] || 0 };
    });
  } catch (e) { return { ok: false, why: errOf(e) }; }
}
