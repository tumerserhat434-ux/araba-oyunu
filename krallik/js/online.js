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
  try { const q = FS.query(FS.collection(db, 'players'), FS.orderBy('power', 'desc'), FS.limit(n)); const s = await FS.getDocs(q); return s.docs.map((d) => ({ uid: d.id, ...d.data() })); } catch (e) { lastErr = e.code || e.message; return []; }
}
// Güce yakın rakipler (son 14 günde aktif olanlar)
export async function rivals(power, n = 6) {
  if (!ready) return [];
  try {
    const lo = Math.round(power * 0.35), hi = Math.round(power * 2.2);
    const q = FS.query(FS.collection(db, 'players'), FS.where('power', '>=', lo), FS.where('power', '<=', hi), FS.orderBy('power', 'desc'), FS.limit(30));
    const s = await FS.getDocs(q), since = Date.now() - 14 * 86400000;
    return s.docs.map((d) => ({ uid: d.id, ...d.data() })).filter((p) => p.uid !== user.uid && (p.updated || 0) > since && !(p.shieldUntil > Date.now())).sort(() => Math.random() - 0.5).slice(0, n);
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
    return s.docs.map((d) => ({ uid: d.id, ...d.data() })).filter((p) => p.uid !== user.uid && (p.updated || 0) > since);
  } catch (e) { lastErr = e.code || e.message; return []; }
}
